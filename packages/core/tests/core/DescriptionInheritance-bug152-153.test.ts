/**
 * Bug 152 — Inherited builder description echoed once per action
 * Bug 153 — "Requires:" hint ignores commonSchema required fields
 *
 * Both bugs corrupt the tool description the LLM receives under the
 * `grouped` exposition strategy:
 *
 * - **Bug 152**: when a builder has `.description()` but its actions don't,
 *   the summary is inherited into `action.description` (correct — the flat
 *   exposition needs it) and then echoed once per action in the Workflow /
 *   TOON block (incorrect — the summary already leads Layer 1, so it is
 *   repeated 1 + N times for no information gain).
 *
 * - **Bug 153**: `getActionRequiredFields()` only inspected the per-action
 *   schema, never `commonSchema`. A required `workspace_id` declared in
 *   `commonSchema` appeared in `inputSchema.required` but never in the
 *   "Requires:" hint — so the LLM was told a field was optional that
 *   validation would reject, causing a needless self-healing bounce.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createTool, GroupedToolBuilder } from '../../src/core/builder/index.js';
import { generateDescription } from '../../src/core/schema/DescriptionGenerator.js';
import { generateToonDescription } from '../../src/core/schema/ToonDescriptionGenerator.js';
import { getActionRequiredFields } from '../../src/core/schema/SchemaUtils.js';
import { compileExposition } from '../../src/exposition/index.js';
import { success, type ToolResponse } from '../../src/core/response.js';
import type { InternalAction } from '../../src/core/types.js';

const noop = async (): Promise<ToolResponse> => success('ok');

// ── Bug 152: description echo ────────────────────────────

describe('Bug 152 — inherited description must not echo per action', () => {

    describe('markdown descriptions (grouped exposition)', () => {
        it('does not repeat the tool summary once per action', () => {
            const tool = createTool('projects')
                .description('Manage workspace projects')
                .action({ name: 'list', readOnly: true, handler: noop })
                .action({ name: 'create', schema: z.object({ name: z.string() }), handler: noop })
                .action({ name: 'delete', destructive: true, schema: z.object({ id: z.string() }), handler: noop })
                .buildToolDefinition();

            // Layer 1 keeps the summary...
            expect(tool.description).toContain('Manage workspace projects. Select operation');

            // ...Layer 2 must not echo it once per action
            const occurrences = tool.description.split('Manage workspace projects').length - 1;
            expect(occurrences).toBe(1);

            // Workflow lines carry only the action-specific facts
            expect(tool.description).toContain("- 'create': Requires: name");
            expect(tool.description).toContain("- 'delete': Requires: id [DESTRUCTIVE]");
            expect(tool.description).not.toContain('Manage workspace projects. Requires');
        });

        it('keeps action-specific descriptions intact (no false suppression)', () => {
            const tool = createTool('projects')
                .description('Manage workspace projects')
                .action({ name: 'list', description: 'List all projects', readOnly: true, handler: noop })
                .action({ name: 'archive', description: 'Archive a project', schema: z.object({ id: z.string() }), handler: noop })
                .buildToolDefinition();

            expect(tool.description).toContain("- 'list': List all projects");
            expect(tool.description).toContain("- 'archive': Archive a project. Requires: id");
        });

        it('applies the same suppression inside hierarchical groups', () => {
            const tool = createTool('platform')
                .description('Central platform API')
                .group('users', 'User management', g => g
                    .query('list', noop)
                    .mutation('ban', noop))
                .group('billing', g => g.action('refund', noop))
                .buildToolDefinition();

            // Builder summary leads Layer 1 once, and is inherited by every
            // grouped action — none of them should echo it.
            const occurrences = tool.description.split('Central platform API').length - 1;
            expect(occurrences).toBe(1);
        });

        it('emits a bare "Requires:" line when the action has no description', () => {
            // Direct unit test of the generator, bypassing builder inheritance,
            // to pin the line format itself. Two actions are required — the
            // Workflow block is suppressed for single-action tools.
            const actions: InternalAction<void>[] = [
                { key: 'create', actionName: 'create', schema: z.object({ title: z.string() }), handler: noop },
                { key: 'publish', actionName: 'publish', schema: z.object({ slug: z.string() }), handler: noop },
            ];
            const desc = generateDescription(actions, 'notes', 'Note taking', false, 'action');
            expect(desc).toContain("- 'create': Requires: title");
            expect(desc).not.toContain('Note taking. Requires');
        });
    });

    describe('TOON descriptions', () => {
        it('leaves the desc column empty for inherited descriptions', () => {
            const tool = createTool('projects')
                .description('Manage workspace projects')
                .toonDescription()
                .action({ name: 'list', readOnly: true, handler: noop })
                .action({ name: 'create', schema: z.object({ name: z.string() }), handler: noop })
                .buildToolDefinition();

            const occurrences = tool.description.split('Manage workspace projects').length - 1;
            expect(occurrences).toBe(1); // Layer 1 only
        });

        it('keeps action-specific descriptions in the desc column', () => {
            const tool = createTool('projects')
                .description('Manage workspace projects')
                .toonDescription()
                .action({ name: 'list', description: 'List all projects', readOnly: true, handler: noop })
                .action({ name: 'create', description: 'Create a project', schema: z.object({ name: z.string() }), handler: noop })
                .buildToolDefinition();

            expect(tool.description).toContain('List all projects');
            expect(tool.description).toContain('Create a project');
        });

        it('does not echo the summary inside hierarchical groups', () => {
            const tool = createTool('platform')
                .description('Central platform API')
                .toonDescription()
                .group('users', 'User management', g => g.query('list', noop))
                .group('billing', g => g.action('refund', noop))
                .buildToolDefinition();

            const occurrences = tool.description.split('Central platform API').length - 1;
            expect(occurrences).toBe(1);
        });
    });

    describe('flat exposition is unchanged', () => {
        it('still inherits the builder description for atomic tools', () => {
            // The inheritance exists to serve flat exposition: an atomic tool
            // with no action description must fall back to the builder summary
            // rather than the bare "tool → action" default.
            const builder = createTool('projects')
                .description('Manage workspace projects')
                .action({ name: 'list', readOnly: true, handler: noop })
                .action({ name: 'create', schema: z.object({ name: z.string() }), handler: noop });

            builder.buildToolDefinition();
            const result = compileExposition([builder], 'flat', '_');

            const listTool = result.tools.find(t => t.name === 'projects_list');
            expect(listTool).toBeDefined();
            expect(listTool!.description).toContain('Manage workspace projects');
            expect(listTool!.description).toContain('[READ-ONLY]');

            // No Workflow block exists in flat mode — nothing to echo.
            expect(listTool!.description).not.toContain('Workflow:');
        });
    });
});

// ── Bug 153: commonSchema required fields ────────────────

describe('Bug 153 — "Requires:" must include commonSchema fields', () => {

    it('getActionRequiredFields reads the common schema', () => {
        const common = z.object({ workspace_id: z.string() });
        const action: InternalAction<void> = {
            key: 'create',
            actionName: 'create',
            schema: z.object({ name: z.string() }),
            handler: noop,
        };

        expect(getActionRequiredFields(action)).toEqual(['name']);
        expect(getActionRequiredFields(action, common)).toEqual(['workspace_id', 'name']);
    });

    it('respects omitCommonFields when collecting common requirements', () => {
        const common = z.object({ workspace_id: z.string(), tenant_id: z.string() });
        const action: InternalAction<void> = {
            key: 'me',
            actionName: 'me',
            omitCommonFields: ['workspace_id'],
            schema: z.object({}),
            handler: noop,
        };

        expect(getActionRequiredFields(action, common)).toEqual(['tenant_id']);
    });

    it('skips optional common fields', () => {
        const common = z.object({
            workspace_id: z.string(),
            locale: z.string().optional(),
        });
        const action: InternalAction<void> = {
            key: 'list',
            actionName: 'list',
            handler: noop,
        };

        expect(getActionRequiredFields(action, common)).toEqual(['workspace_id']);
    });

    it('markdown Workflow lists common required fields', () => {
        const tool = createTool('projects')
            .description('Manage workspace projects')
            .commonSchema(z.object({ workspace_id: z.string().describe('Workspace identifier') }))
            .action({ name: 'list', readOnly: true, handler: noop })
            .action({ name: 'create', schema: z.object({ name: z.string() }), handler: noop })
            .buildToolDefinition();

        // The schema marks workspace_id as required...
        expect(tool.inputSchema.required).toContain('workspace_id');
        // ...so the hint must say so, in every action that needs it.
        expect(tool.description).toContain("- 'create': Requires: workspace_id, name");
        expect(tool.description).toContain("- 'list': Requires: workspace_id");
    });

    it('TOON required column lists common required fields', () => {
        const tool = createTool('projects')
            .description('Manage workspace projects')
            .toonDescription()
            .commonSchema(z.object({ workspace_id: z.string() }))
            .action({ name: 'list', readOnly: true, handler: noop })
            .action({ name: 'create', schema: z.object({ name: z.string() }), handler: noop })
            .buildToolDefinition();

        expect(tool.inputSchema.required).toContain('workspace_id');
        expect(tool.description).toContain('workspace_id');
    });

    it('omits common fields excluded via omitCommon', () => {
        const tool = createTool('platform')
            .description('Platform API')
            .commonSchema(z.object({ workspace_id: z.string() }))
            .group('profile', 'User profile', g => g
                .omitCommon('workspace_id')
                .query('me', noop))
            .group('billing', g => g.mutation('refund', noop))
            .buildToolDefinition();

        // The profile.me action derives workspace_id from context and requires
        // nothing else, so it carries no requirements — while billing.refund,
        // which does use the common field, still advertises it.
        expect(tool.description).not.toMatch(/'profile\.me'[^]*workspace_id/);
        expect(tool.description).toContain("- 'billing.refund': Requires: workspace_id");
    });

    it('getActionMetadata reports common required fields', () => {
        // Introspection feeds lockfiles, governance, and dashboards — an
        // under-reported required field silently corrupts all of them.
        const builder = createTool('projects')
            .commonSchema(z.object({ workspace_id: z.string() }))
            .action({ name: 'create', schema: z.object({ name: z.string() }), handler: noop });

        const meta = builder.getActionMetadata();
        expect(meta).toHaveLength(1);
        expect(meta[0].requiredFields).toEqual(['workspace_id', 'name']);
    });
});

// ── Regression guards ────────────────────────────────────

describe('Regression — description invariants', () => {
    it('an action identical to its own action description still renders', () => {
        // Edge case: an action whose description is literally the same string
        // as the tool summary. Suppression is by value — this is the intended
        // trade-off (the text is a summary, not action-specific documentation).
        const tool = createTool('echo')
            .description('Echo service')
            .action({ name: 'say', description: 'Echo service', schema: z.object({ msg: z.string() }), handler: noop })
            .action({ name: 'shout', handler: noop })
            .buildToolDefinition();

        expect(tool.description).toContain("Actions: say, shout");
        expect(tool.description).toContain("- 'say': Requires: msg");
    });

    it('a single-action flat tool emits no Workflow block', () => {
        const tool = createTool('ping')
            .description('Health check')
            .action({ name: 'ping', handler: noop })
            .buildToolDefinition();

        expect(tool.description).not.toContain('Workflow:');
    });

    it('builders without a description do not synthesize echoes', () => {
        const tool = createTool('projects')
            .action({ name: 'list', readOnly: true, handler: noop })
            .action({ name: 'create', schema: z.object({ name: z.string() }), handler: noop })
            .buildToolDefinition();

        // No builder description → Layer 1 falls back to the name only.
        expect(tool.description).toContain('projects. Select operation');
        expect(tool.description).toContain("- 'create': Requires: name");
    });
});
