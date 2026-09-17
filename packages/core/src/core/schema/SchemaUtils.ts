/**
 * SchemaUtils — Shared Schema Inspection & Validation Utilities
 *
 * Extracted helpers for inspecting Zod schema metadata and
 * asserting JSON Schema field compatibility across actions.
 *
 * Used by: SchemaGenerator, DescriptionGenerator, ToonDescriptionGenerator.
 *
 * Pure-function module: no state, no side effects.
 */
import { type ZodObject, type ZodRawShape, type ZodTypeAny } from 'zod';
import { type InternalAction } from '../types.js';

// ── Zod Type Guards ──────────────────────────────────────

/**
 * Check if a value is a Zod schema (has `_def` property).
 *
 * Used by `defineTool` and `definePrompt` to distinguish
 * Zod schemas from JSON descriptor objects.
 */
export function isZodSchema(value: unknown): value is ZodObject<ZodRawShape> {
    return (
        typeof value === 'object' &&
        value !== null &&
        '_def' in value &&
        typeof (value as { _def: unknown })._def === 'object'
    );
}

// ── Schema Inspection ────────────────────────────────────

/**
 * Get the list of required field names for an action.
 *
 * Inspects both the action's own schema and the tool-level `commonSchema`,
 * respecting per-action `omitCommonFields`. This mirrors the merged schema
 * that `buildValidationSchema()` compiles and enforces at runtime, so the
 * "Requires:" hint shown to the LLM can never under-report a field that
 * validation will reject.
 *
 * @param action - The action to inspect
 * @param commonSchema - Optional tool-level schema shared by all actions
 * @returns Deduplicated required field names (common first, then per-action)
 */
export function getActionRequiredFields<TContext>(
    action: InternalAction<TContext>,
    commonSchema?: ZodObject<ZodRawShape>,
): string[] {
    const required: string[] = [];
    const omitted = new Set(action.omitCommonFields ?? []);

    // Common fields first (respecting omitCommon) — they lead "Requires:"
    if (commonSchema) {
        for (const [key, fieldSchema] of Object.entries(commonSchema.shape)) {
            if (omitted.has(key)) continue;
            if (!(fieldSchema as ZodTypeAny).isOptional()) {
                required.push(key);
            }
        }
    }

    if (action.schema) {
        for (const [key, fieldSchema] of Object.entries(action.schema.shape)) {
            if (!(fieldSchema as ZodTypeAny).isOptional()) {
                required.push(key);
            }
        }
    }

    // Deduplicate preserving insertion order (guards against a field
    // appearing in both common and per-action shapes).
    return [...new Set(required)];
}

// ── Schema Compatibility ─────────────────────────────────

/**
 * Normalize JSON Schema type for compatibility comparison.
 * "integer" is treated as compatible with "number" (integer IS-A number).
 */
const normalizeType = (t: string | undefined): string | undefined =>
    t === 'integer' ? 'number' : t;

/** Build a consistently-formatted conflict error. */
function conflictError(field: string, actionKey: string, detail: string): Error {
    return new Error(
        `Schema conflict for field "${field}" in action "${actionKey}": ` +
        `${detail}. All actions sharing a field name must use the same type.`
    );
}

/**
 * Assert that an incoming JSON Schema field is compatible with an existing one,
 * and optionally merge enum value sets when they differ.
 *
 * Check hierarchy (fail-fast):
 *   1. Base type — e.g. "string" vs "boolean", "number" vs "array"
 *   2. Enum presence — enum vs non-enum of same base type
 *   3. Enum values — enum with different value sets → MERGE (union)
 *
 * @returns The merged property if enums were merged, or undefined if no merge needed.
 * @throws Error with actionable message when base types or enum presence conflict.
 */
/** Minimal shape of a JSON Schema node for field compatibility checking */
interface JsonSchemaNode {
    readonly type?: string;
    readonly enum?: readonly unknown[];
    readonly anyOf?: readonly JsonSchemaNode[];
    readonly oneOf?: readonly JsonSchemaNode[];
    readonly allOf?: readonly JsonSchemaNode[];
    [key: string]: unknown;
}

/**
 * Extract the effective base type from a JSON Schema node.
 *
 * Zod v4 represents `.nullable()` as `anyOf: [{type: "string"}, {type: "null"}]`
 * instead of v3's `type: ["string", "null"]`. To keep collision detection
 * working, we unwrap `anyOf`/`oneOf` and return the first non-null member's
 * type. Returns `undefined` if no concrete type is found.
 */
function effectiveType(node: JsonSchemaNode): string | undefined {
    if (node.type !== undefined) return node.type;

    const combinator = node.anyOf ?? node.oneOf ?? node.allOf;
    if (Array.isArray(combinator)) {
        for (const member of combinator) {
            if (member.type !== undefined && member.type !== 'null') {
                return member.type;
            }
        }
    }
    return undefined;
}

/**
 * Check whether a node represents a nullable type (allows null).
 * In zod v4 this is `anyOf: [..., {type: "null"}]`; in v3 it was
 * `type: ["string", "null"]`.
 */
function isNullableType(node: JsonSchemaNode): boolean {
    if (Array.isArray(node.type)) {
        return node.type.includes('null');
    }
    const combinator = node.anyOf ?? node.oneOf;
    if (Array.isArray(combinator)) {
        return combinator.some(m => m.type === 'null');
    }
    return false;
}

export function assertFieldCompatibility(
    existing: object,
    incoming: object,
    field: string,
    actionKey: string,
): object | undefined {
    const ex: JsonSchemaNode = existing as JsonSchemaNode;
    const inc: JsonSchemaNode = incoming as JsonSchemaNode;

    const exType = effectiveType(ex);
    const incType = effectiveType(inc);
    const exEnum = ex.enum;
    const incEnum = inc.enum;

    // 1. Base type mismatch (with integer ≈ number normalization)
    if (
        exType !== undefined && incType !== undefined &&
        normalizeType(exType) !== normalizeType(incType)
    ) {
        throw conflictError(field, actionKey,
            `type "${incType}" conflicts with previously declared type "${exType}"`);
    }

    // 1b. Nullable vs non-nullable of the same base type is a conflict.
    //     zod v4: nullable → anyOf:[{type:"string"},{type:"null"}]
    //     zod v3: nullable → type:["string","null"]
    //     A non-nullable field (type:"string") vs a nullable one (anyOf:...)
    //     have the same effective base type but different nullability —
    //     that's a collision because callers can't rely on a consistent
    //     nullability contract across actions.
    if (
        exType !== undefined && incType !== undefined &&
        normalizeType(exType) === normalizeType(incType) &&
        isNullableType(ex) !== isNullableType(inc)
    ) {
        throw conflictError(field, actionKey,
            `nullability conflict — one declaration is nullable and the other is not`);
    }

    // 2. Enum presence mismatch → WIDEN to non-enum (drop constraint)
    //    Plain string is a superset of enum-constrained string.
    //    Essential for OpenAPI imports where the same field name has enum
    //    in one endpoint and plain string in another.
    const exHasEnum = exEnum !== undefined;
    const incHasEnum = incEnum !== undefined;
    if (exHasEnum !== incHasEnum) {
        // Return the non-enum version (superset)
        const nonEnum = exHasEnum ? inc : ex;
        return { ...nonEnum };
    }

    // 3. Enum value-set mismatch → MERGE (union) instead of throwing
    if (
        exHasEnum && incHasEnum &&
        JSON.stringify(exEnum) !== JSON.stringify(incEnum)
    ) {
        const merged = new Set([...(exEnum as unknown[]), ...(incEnum as unknown[])]);
        return { ...ex, enum: [...merged] };
    }

    return undefined;
}
