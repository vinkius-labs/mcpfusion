/**
 * Regression tests for BUGS-v4 medium-severity bugs #109, #110, #111.
 *
 * Bug #109 — Multi-dot tool names crash in FluentToolBuilder
 * Bug #110 — ContextDerivation missing constructor/prototype guard
 * Bug #111 — prependSystem/appendSystem uses wrong role
 */
import { describe, it, expect } from 'vitest';
import { initMCPFusion } from '../../src/core/initMCPFusion.js';
import { success } from '../../src/core/response.js';
import { defineMiddleware } from '../../src/core/middleware/ContextDerivation.js';
import { definePrompt, PromptMessage } from '../../src/prompt/index.js';
import { PromptRegistry } from '../../src/prompt/PromptRegistry.js';

// ── Bug #109 — Multi-dot tool names ─────────────────────

describe('Bug #109 — Multi-dot tool names crash with clear error', () => {
    it('should throw on triple-dot name like "admin.users.list"', () => {
        const f = initMCPFusion<Record<string, unknown>>();
        expect(() =>
            f.query('admin.users.list').handle(async () => success('ok')),
        ).toThrow(/too many dot-separated segments/i);
    });

    it('should throw on double-dot name like "a.b.c.d"', () => {
        const f = initMCPFusion<Record<string, unknown>>();
        expect(() =>
            f.mutation('a.b.c.d').handle(async () => success('ok')),
        ).toThrow(/too many dot-separated segments/i);
    });

    it('should accept single-dot name like "users.list"', () => {
        const f = initMCPFusion<Record<string, unknown>>();
        const tool = f.query('users.list').handle(async () => success('ok'));
        expect(tool.getName()).toBe('users');
        expect(tool.getActionNames()).toContain('list');
    });

    it('should accept no-dot name like "ping"', () => {
        const f = initMCPFusion<Record<string, unknown>>();
        const tool = f.query('ping').handle(async () => success('ok'));
        expect(tool.getName()).toBe('ping');
    });

    it('error message should include the offending tool name', () => {
        const f = initMCPFusion<Record<string, unknown>>();
        expect(() =>
            f.query('x.y.z').handle(async () => success('ok')),
        ).toThrow(/x\.y\.z/);
    });
});

// ── Bug #110 — ContextDerivation constructor/prototype guard ──

describe('Bug #110 — ContextDerivation blocks constructor and prototype keys', () => {
    it('should block "constructor" key from being merged into context', async () => {
        const mw = defineMiddleware(async () => {
            return { constructor: 'evil', safe: 'ok' } as Record<string, unknown>;
        });
        const fn = mw.toMiddlewareFn();
        const ctx = {} as Record<string, unknown>;
        await fn(ctx as any, {}, async () => {
            expect(ctx['safe']).toBe('ok');
            // constructor should remain untouched (Object constructor)
            expect(ctx.constructor).toBe(Object);
            return success('ok');
        });
    });

    it('should block "prototype" key from being merged into context', async () => {
        const mw = defineMiddleware(async () => {
            return { prototype: { polluted: true }, safe: 'ok' } as Record<string, unknown>;
        });
        const fn = mw.toMiddlewareFn();
        const ctx = {} as Record<string, unknown>;
        await fn(ctx as any, {}, async () => {
            expect(ctx['safe']).toBe('ok');
            expect(ctx['prototype']).toBeUndefined();
            return success('ok');
        });
    });

    it('should still block "__proto__" key (pre-existing guard)', async () => {
        const mw = defineMiddleware(async () => {
            return { __proto__: { polluted: true }, safe: 'ok' } as Record<string, unknown>;
        });
        const fn = mw.toMiddlewareFn();
        const ctx = {} as Record<string, unknown>;
        await fn(ctx as any, {}, async () => {
            expect(ctx['safe']).toBe('ok');
            expect(Object.getPrototypeOf(ctx)).toBe(Object.prototype);
            return success('ok');
        });
    });

    it('should allow normal keys through', async () => {
        const mw = defineMiddleware(async () => {
            return { userId: 42, tenant: 'acme' };
        });
        const fn = mw.toMiddlewareFn();
        const ctx = {} as Record<string, unknown>;
        await fn(ctx as any, {}, async () => {
            expect(ctx['userId']).toBe(42);
            expect(ctx['tenant']).toBe('acme');
            return success('ok');
        });
    });
});

// ── Bug #111 — prependSystem/appendSystem role ──────────

describe('Bug #111 — prependSystem and appendSystem use "user" role', () => {
    interface Ctx { user: string }
    const ctx = (): Ctx => ({ user: 'tester' });

    const testPrompt = definePrompt<Ctx>('role-test-111', {
        description: 'Role test prompt for #111',
        handler: async () => ({
            messages: [PromptMessage.user('hello')],
        }),
    });

    it('prependSystem should emit role "user", not "assistant"', async () => {
        const registry = new PromptRegistry<Ctx>();
        registry.register(testPrompt);
        registry.useInterceptor(async (_ctx, builder) => {
            builder.prependSystem('system preamble');
        });
        const result = await registry.routeGet(ctx(), 'role-test-111', {});
        expect(result.messages[0].role).toBe('user');
        expect((result.messages[0].content as { text: string }).text).toBe('system preamble');
    });

    it('appendSystem should emit role "user", not "assistant"', async () => {
        const registry = new PromptRegistry<Ctx>();
        registry.register(testPrompt);
        registry.useInterceptor(async (_ctx, builder) => {
            builder.appendSystem('system footer');
        });
        const result = await registry.routeGet(ctx(), 'role-test-111', {});
        const last = result.messages[result.messages.length - 1];
        expect(last.role).toBe('user');
        expect((last.content as { text: string }).text).toBe('system footer');
    });

    it('prependUser should still use role "user"', async () => {
        const registry = new PromptRegistry<Ctx>();
        registry.register(testPrompt);
        registry.useInterceptor(async (_ctx, builder) => {
            builder.prependUser('user preamble');
        });
        const result = await registry.routeGet(ctx(), 'role-test-111', {});
        expect(result.messages[0].role).toBe('user');
    });

    it('appendAssistant should still use role "assistant"', async () => {
        const registry = new PromptRegistry<Ctx>();
        registry.register(testPrompt);
        registry.useInterceptor(async (_ctx, builder) => {
            builder.appendAssistant('assistant reply');
        });
        const result = await registry.routeGet(ctx(), 'role-test-111', {});
        const last = result.messages[result.messages.length - 1];
        expect(last.role).toBe('assistant');
    });
});
