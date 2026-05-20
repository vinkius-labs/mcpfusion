/**
 * Bug #78 Regression: FluentToolBuilder inline .use() must not allow prototype pollution
 *
 * BUG: The inline middleware `wrappedNext` used `Object.assign(ctx, enrichedCtx)`
 * which directly merges ALL keys from the enriched context into the shared
 * context object. If `enrichedCtx` contains `__proto__`, `constructor`, or
 * `prototype`, it pollutes the Object prototype chain.
 *
 * FIX: Iterate `Object.keys()` and skip dangerous keys (`__proto__`,
 * `constructor`, `prototype`).
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { initMCPFusion } from '../../src/core/initMCPFusion.js';

interface TestCtx { userId: string }
const ctx: TestCtx = { userId: 'u-1' };

describe('Bug #78: FluentToolBuilder .use() prototype pollution guard', () => {

    it('merges safe enriched context properties', async () => {
        const f = initMCPFusion<TestCtx>();

        const tool = f.action('safe.enrich')
            .describe('Test safe enrichment')
            .use(async ({ ctx, next }) => {
                return next({ ...ctx, tenantId: 'tenant-1' } as any);
            })
            .handle(async (_input, ctx: any) => {
                return { userId: ctx.userId, tenantId: ctx.tenantId };
            });

        const result = await tool.execute(ctx, { action: 'enrich' });
        expect(result.isError).toBeUndefined();
        const text = result.content[0].type === 'text' ? (result.content[0] as { text: string }).text : '';
        const data = JSON.parse(text);
        expect(data.tenantId).toBe('tenant-1');
        expect(data.userId).toBe('u-1');
    });

    it('blocks __proto__ key from enriched context', async () => {
        const f = initMCPFusion<TestCtx>();

        // Construct a payload that would attempt prototype pollution
        const malicious = JSON.parse('{"__proto__": {"polluted": true}, "safe": "ok"}');

        const tool = f.action('proto.attack')
            .describe('Test proto pollution guard')
            .use(async ({ ctx, next }) => {
                return next({ ...ctx, ...malicious } as any);
            })
            .handle(async (_input, ctx: any) => {
                return {
                    safe: ctx.safe,
                    // This should NOT be polluted
                    polluted: ({} as any).polluted,
                };
            });

        const result = await tool.execute(ctx, { action: 'attack' });
        const text = result.content[0].type === 'text' ? (result.content[0] as { text: string }).text : '';
        const data = JSON.parse(text);
        expect(data.safe).toBe('ok');
        // Object.prototype should NOT have been polluted
        expect(data.polluted).toBeUndefined();
    });

    it('blocks constructor key from enriched context', async () => {
        const f = initMCPFusion<TestCtx>();

        const tool = f.action('ctor.attack')
            .describe('Test constructor pollution guard')
            .use(async ({ ctx, next }) => {
                return next({ ...ctx, constructor: 'hacked' } as any);
            })
            .handle(async (_input, ctx: any) => {
                // constructor should still be the original Object constructor
                return { isObject: typeof ctx.constructor === 'function' };
            });

        const result = await tool.execute(ctx, { action: 'attack' });
        const text = result.content[0].type === 'text' ? (result.content[0] as { text: string }).text : '';
        const data = JSON.parse(text);
        expect(data.isObject).toBe(true);
    });
});
