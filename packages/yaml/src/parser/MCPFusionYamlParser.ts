/**
 * MCPFusionYamlParser — YAML String → Typed Spec
 *
 * The core parser for `mcpfusion.yaml` manifests. Converts a raw YAML
 * string into a validated {@link MCPFusionYamlSpec} object.
 *
 * @example
 * ```typescript
 * import { parseMCPFusionYaml } from '@mcpfusion/yaml';
 *
 * const spec = parseMCPFusionYaml(fs.readFileSync('mcpfusion.yaml', 'utf-8'));
 * console.log(spec.server.name);     // "my-server"
 * console.log(spec.tools?.length);   // 5
 * ```
 *
 * @module
 */
import { parse as parseYaml } from 'yaml';
import type { MCPFusionYamlSpec } from '../schema/MCPFusionYamlSpec.js';
import { validateYamlSchema } from './SchemaValidator.js';
import { validateCrossRefs } from './CrossRefValidator.js';

/** Parsing error with structured details. */
export class MCPFusionYamlError extends Error {
    constructor(
        message: string,
        public readonly path?: string,
        public readonly details?: readonly string[],
    ) {
        super(message);
        this.name = 'MCPFusionYamlError';
    }
}

/**
 * Parse a raw YAML string into a validated {@link MCPFusionYamlSpec}.
 *
 * @param yamlString - The raw `mcpfusion.yaml` content
 * @returns Typed and validated spec
 * @throws {@link MCPFusionYamlError} on parse or validation errors
 */
export function parseMCPFusionYaml(yamlString: string): MCPFusionYamlSpec {
    // ── 1. Parse YAML text → raw object ─────────────────
    let raw: unknown;
    try {
        raw = parseYaml(yamlString);
    } catch (err) {
        throw new MCPFusionYamlError(
            `YAML syntax error: ${err instanceof Error ? err.message : String(err)}`,
        );
    }

    if (raw === null || raw === undefined || typeof raw !== 'object') {
        throw new MCPFusionYamlError('mcpfusion.yaml must be a YAML object (not null, array, or scalar)');
    }

    // ── 2. Schema validation → typed spec ───────────────
    const spec = validateYamlSchema(raw as Record<string, unknown>);

    // ── 3. Cross-reference validation ───────────────────
    validateCrossRefs(spec);

    return spec;
}
