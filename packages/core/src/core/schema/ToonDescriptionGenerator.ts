/**
 * ToonDescriptionGenerator — Token-Optimized Description Strategy
 *
 * Generates descriptions using TOON (Token-Oriented Object Notation) format,
 * achieving ~30-50% token reduction compared to the default markdown descriptions.
 *
 * Uses `@toon-format/toon` encode() to serialize action metadata as compact
 * pipe-delimited tabular data inside the description string.
 *
 * Pure-function module: no state, no side effects.
 */
import { encode } from '@toon-format/toon';
import { type ZodObject, type ZodRawShape } from 'zod';
import { type InternalAction } from '../types.js';
import { getActionRequiredFields } from './SchemaUtils.js';

// ── Public API ───────────────────────────────────────────

export function generateToonDescription<TContext>(
    actions: readonly InternalAction<TContext>[],
    name: string,
    description: string | undefined,
    hasGroup: boolean,
    discriminator = 'action',
    commonSchema?: ZodObject<ZodRawShape>,
): string {
    const lines: string[] = [];

    // Layer 1: Tool summary + dispatch instruction (always human-readable)
    lines.push(`${description || name}. Select operation via the \`${discriminator}\` parameter.`);

    // Layer 2: Action metadata in TOON tabular format.
    // Emitted for grouped tools (a grouping is inherently multi-operation) and
    // for flat tools with 2+ actions. A flat tool with a single action has
    // nothing to dispatch between, so the per-action table is redundant and is
    // omitted — parity with the markdown DescriptionGenerator's Workflow rule.
    if (hasGroup || actions.length >= 2) {
        lines.push('');
        lines.push(
            hasGroup
                ? encodeGroupedActions(actions, description, commonSchema)
                : encodeFlatActions(actions, description, commonSchema),
        );
    }

    return lines.join('\n');
}

// ── Internal helpers ─────────────────────────────────────

interface ActionRow {
    action: string;
    desc: string;
    required: string;
    destructive?: boolean;
}

function encodeFlatActions<TContext>(
    actions: readonly InternalAction<TContext>[],
    toolDescription: string | undefined,
    commonSchema?: ZodObject<ZodRawShape>,
): string {
    const rows = actions.map(a => buildActionRow(a.key, a, toolDescription, commonSchema));
    return encode(rows, { delimiter: '|' });
}

function encodeGroupedActions<TContext>(
    actions: readonly InternalAction<TContext>[],
    toolDescription: string | undefined,
    commonSchema?: ZodObject<ZodRawShape>,
): string {
    // Group actions by their groupName
    const groups = new Map<string, InternalAction<TContext>[]>();
    for (const action of actions) {
        const key = action.groupName || '_ungrouped';
        let list = groups.get(key);
        if (!list) {
            list = [];
            groups.set(key, list);
        }
        list.push(action);
    }

    // Build a structure that TOON can encode efficiently
    const groupData: Record<string, ActionRow[]> = {};
    for (const [groupName, groupActions] of groups) {
        groupData[groupName] = groupActions.map(a =>
            buildActionRow(a.actionName, a, toolDescription, commonSchema),
        );
    }

    return encode(groupData, { delimiter: '|' });
}

function buildActionRow<TContext>(
    key: string,
    action: InternalAction<TContext>,
    toolDescription: string | undefined,
    commonSchema?: ZodObject<ZodRawShape>,
): ActionRow {
    // An inherited builder description is not action-specific documentation —
    // it already leads Layer 1. Emitting it here would repeat the tool summary
    // once per row, inflating tokens with no new information for the LLM.
    const hasOwnDescription = !!action.description && action.description !== toolDescription;

    const required = getActionRequiredFields(action, commonSchema);
    const row: ActionRow = {
        action: key,
        desc: hasOwnDescription ? action.description! : '',
        required: required.join(','),
    };

    if (action.destructive) {
        row.destructive = true;
    }

    return row;
}
