/**
 * SoleActionContract.test.ts
 *
 * A builder with exactly one action and no groups (see `soleActionOf`)
 * publishes no discriminator: its input schema declares the action's own
 * required fields, its description is the tool's own, and every call routes
 * to that action whatever discriminator value the caller sends.
 * Builders with 2+ actions, or with groups, keep the discriminator.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { GroupedToolBuilder } from '../../src/core/builder/GroupedToolBuilder.js';
import { initMCPFusion } from '../../src/core/initMCPFusion.js';
import { success } from '../../src/core/response.js';

type Props = Record<string, { description?: string }>;

function soleBuilder(toon = false) {
    const calls: Record<string, unknown>[] = [];
    let b = new GroupedToolBuilder<void>('invoices').description('Look up an invoice');
    if (toon) b = b.toonDescription();
    b = b.action({
        name: 'get',
        schema: z.object({
            invoice_id: z.string().describe('Invoice id'),
            currency: z.string().optional().describe('Display currency'),
        }),
        handler: async (_ctx, args) => {
            calls.push(args as Record<string, unknown>);
            return success(`invoice ${(args as { invoice_id: string }).invoice_id}`);
        },
    });
    return { builder: b, calls };
}

describe('Sole action: published schema', () => {
    it('has no discriminator and declares the action required fields in `required`', () => {
        const def = soleBuilder().builder.buildToolDefinition();
        const props = def.inputSchema.properties as Props;

        expect(props).not.toHaveProperty('action');
        expect(Object.keys(props).sort()).toEqual(['currency', 'invoice_id']);
        expect(def.inputSchema.required).toEqual(['invoice_id']);
    });

    it('carries no per-action annotations on field descriptions', () => {
        const def = soleBuilder().builder.buildToolDefinition();
        const props = def.inputSchema.properties as Props;

        expect(props['invoice_id']!.description).toBe('Invoice id');
        expect(props['currency']!.description).toBe('Display currency');
        for (const field of Object.values(props)) {
            expect(field.description ?? '').not.toMatch(/Required for|For:|always required/);
        }
    });

    it('promotes required commonSchema fields too, without annotations', () => {
        const def = new GroupedToolBuilder<void>('scoped')
            .commonSchema(z.object({ tenant: z.string().describe('Tenant') }))
            .action({ name: 'run', schema: z.object({ n: z.number() }), handler: async () => success('ok') })
            .buildToolDefinition();
        const props = def.inputSchema.properties as Props;

        expect([...(def.inputSchema.required ?? [])].sort()).toEqual(['n', 'tenant']);
        expect(props['tenant']!.description).toBe('Tenant');
    });

    it('applies to a standalone fluent tool (internal key "default" never leaks)', () => {
        const f = initMCPFusion<void>();
        const tool = f.query('weather')
            .describe('Current weather')
            .withString('city', 'City name')
            .handle(async () => success('sunny'));
        const def = tool.buildToolDefinition();

        expect(def.inputSchema.properties).not.toHaveProperty('action');
        expect(def.inputSchema.required).toEqual(['city']);
        expect(JSON.stringify(def)).not.toContain('"default"');
        expect(def.description).not.toContain('Select operation');
    });
});

describe('Sole action: description', () => {
    it('markdown: is just the tool description, with no "Select operation" line', () => {
        const def = soleBuilder().builder.buildToolDefinition();
        expect(def.description).toBe('Look up an invoice');
        expect(def.description).not.toContain('Select operation');
    });

    it('falls back to the tool name when no description is set', () => {
        const def = new GroupedToolBuilder<void>('pinger')
            .action({ name: 'ping', handler: async () => success('pong') })
            .buildToolDefinition();
        expect(def.description).toBe('pinger');
    });

    it('toon mode: same description and same schema as markdown mode (parity)', () => {
        const md = soleBuilder(false).builder.buildToolDefinition();
        const toon = soleBuilder(true).builder.buildToolDefinition();

        expect(toon.description).toBe('Look up an invoice');
        expect(toon.description).not.toContain('Select operation');
        expect(toon.description).toBe(md.description);
        expect(toon.inputSchema).toEqual(md.inputSchema);
    });
});

describe('Sole action: execution routing', () => {
    it('runs the handler when no discriminator is sent', async () => {
        const { builder, calls } = soleBuilder();
        const r = await builder.execute(undefined, { invoice_id: 'A1' });
        expect(r.isError).toBeUndefined();
        expect(r.content[0]!.text).toBe('invoice A1');
        expect(calls).toHaveLength(1);
    });

    it('runs the handler for a legacy caller that still sends the action key', async () => {
        const { builder, calls } = soleBuilder();
        const r = await builder.execute(undefined, { action: 'get', invoice_id: 'A2' });
        expect(r.isError).toBeUndefined();
        expect(r.content[0]!.text).toBe('invoice A2');
        expect(calls).toHaveLength(1);
    });

    it('runs the handler for a legacy fluent caller that sends action:"default"', async () => {
        const f = initMCPFusion<void>();
        const tool = f.query('weather')
            .withString('city', 'City name')
            .handle(async (input) => success(`sunny in ${input.city}`));
        tool.buildToolDefinition();

        const r = await tool.execute(undefined, { action: 'default', city: 'Lisbon' });
        expect(r.isError).toBeUndefined();
        expect(r.content[0]!.text).toBe('sunny in Lisbon');
    });

    it('runs the handler when an unknown action string is sent', async () => {
        const { builder, calls } = soleBuilder();
        const r = await builder.execute(undefined, { action: 'does_not_exist', invoice_id: 'A3' });
        expect(r.isError).toBeUndefined();
        expect(r.content[0]!.text).toBe('invoice A3');
        expect(calls).toHaveLength(1);
    });

    it('a schemaless action receives the RESOLVED action, never the raw value sent', async () => {
        let seen: unknown;
        const b = new GroupedToolBuilder<void>('ping')
            .action({ name: 'run', handler: async (_ctx, args) => { seen = (args as { action?: unknown }).action; return success('ok') } });
        const r = await b.execute(undefined, { action: 'does_not_exist' });
        expect(r.isError).toBeUndefined();
        expect(seen).toBe('run');
    });

    it('still rejects a truly undeclared key under strict validation', async () => {
        const { builder, calls } = soleBuilder();
        const r = await builder.execute(undefined, { invoice_id: 'A4', malicious_field: 'x' });
        expect(r.isError).toBe(true);
        expect(r.content[0]!.text).toContain('malicious_field');
        expect(calls).toHaveLength(0);
    });

    it('still rejects a missing required field', async () => {
        const { builder, calls } = soleBuilder();
        const r = await builder.execute(undefined, {});
        expect(r.isError).toBe(true);
        expect(r.content[0]!.text).toContain('invoice_id');
        expect(calls).toHaveLength(0);
    });
});

describe('Unchanged: builders that still publish a discriminator', () => {
    it('a 2-action builder keeps the discriminator and errors when it is missing', async () => {
        const b = new GroupedToolBuilder<void>('two')
            .action({ name: 'a', handler: async () => success('a') })
            .action({ name: 'b', handler: async () => success('b') });
        const def = b.buildToolDefinition();

        expect(def.inputSchema.properties).toHaveProperty('action');
        expect(def.inputSchema.required).toContain('action');
        expect(def.description).toContain('Select operation');

        const r = await b.execute(undefined, {});
        expect(r.isError).toBe(true);
        expect(r.content[0]!.text).toContain('MISSING_DISCRIMINATOR');
    });

    it('a grouped builder with one action keeps the discriminator', async () => {
        const b = new GroupedToolBuilder<void>('platform')
            .group('core', 'Core operations', g => g
                .action({ name: 'ping', handler: async () => success('pong') }));
        const def = b.buildToolDefinition();
        const props = def.inputSchema.properties as Record<string, { enum?: string[] }>;

        expect(props['action']!.enum).toEqual(['core.ping']);
        expect(def.inputSchema.required).toContain('action');

        const missing = await b.execute(undefined, {});
        expect(missing.isError).toBe(true);
        expect(missing.content[0]!.text).toContain('MISSING_DISCRIMINATOR');

        const ok = await b.execute(undefined, { action: 'core.ping' });
        expect(ok.isError).toBeUndefined();
        expect(ok.content[0]!.text).toBe('pong');
    });
});
