/**
 * ThrownResponseRecovery.test.ts
 *
 * runChain's catch block must recover already-classified responses that a
 * handler (or middleware) chose to *throw* instead of return — e.g.
 * `throw toolError('NOT_FOUND', ...)` or `throw error('Unauthorized')`.
 *
 * Regression guard for the fix that mirrors postProcessResult()'s priority
 * ordering: HandoffResponse → ResponseBuilder → ToolResponse → generic
 * INTERNAL_ERROR. Before the fix, the catch block only recognised a plain
 * ToolResponse, so:
 *   - a thrown HandoffResponse (branded but without a `content` array) would
 *     slip through `isToolResponse()` and later crash the serializer, and
 *   - a thrown ResponseBuilder was flattened into INTERNAL_ERROR, discarding
 *     its composed content blocks.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { error, toolError, handoff, success } from '../../src/core/response.js';
import { runChain, type ExecutionContext } from '../../src/core/execution/ExecutionPipeline.js';
import { compileMiddlewareChains } from '../../src/core/execution/MiddlewareCompiler.js';
import { type InternalAction } from '../../src/core/types.js';
import { response } from '../../src/presenter/ResponseBuilder.js';

// ============================================================================
// Helpers
// ============================================================================

type Ctx = { tenant: string };

function makeExecCtx(
    actions: InternalAction<Ctx>[],
    toolName = 'orders',
    discriminator = 'action',
): ExecutionContext<Ctx> {
    return {
        actionMap: new Map(actions.map(a => [a.key, a])),
        compiledChain: compileMiddlewareChains(actions, []),
        validationSchemaCache: new Map(),
        actionKeysString: actions.map(a => a.key).join(', '),
        discriminator,
        toolName,
    };
}

function makeAction(
    key: string,
    handler: InternalAction<Ctx>['handler'],
    extra: Partial<InternalAction<Ctx>> = {},
): InternalAction<Ctx> {
    return {
        key,
        groupName: undefined,
        groupDescription: undefined,
        actionName: key,
        description: undefined,
        compactDescription: undefined,
        schema: z.object({}),
        destructive: false,
        idempotent: false,
        readOnly: true,
        middlewares: undefined,
        omitCommonFields: undefined,
        returns: undefined,
        handler,
        ...extra,
    };
}

function resolve(action: InternalAction<Ctx>, discriminatorValue = action.key) {
    return { action, discriminatorValue };
}

const ctx: Ctx = { tenant: 'acme' };

// ============================================================================
// Tests: thrown classified responses are recovered intact
// ============================================================================

describe('ThrownResponseRecovery: thrown toolError(...)', () => {
    it('preserves the error code, message and suggestion of a thrown toolError', async () => {
        const action = makeAction('refund', async () => {
            throw toolError('NOT_FOUND', {
                message: 'Order 42 does not exist',
                suggestion: 'List orders first to find a valid id.',
                severity: 'error',
            });
        });
        const execCtx = makeExecCtx([action]);

        const out = await runChain(execCtx, resolve(action), ctx, { action: 'refund' });

        expect(out.isError).toBe(true);
        expect(out.content).toHaveLength(1);
        const text = (out.content[0] as { text: string }).text;
        expect(text).toContain('NOT_FOUND');
        expect(text).toContain('Order 42 does not exist');
        expect(text).toContain('List orders first to find a valid id.');
        // Must NOT be re-wrapped as INTERNAL_ERROR
        expect(text).not.toContain('INTERNAL_ERROR');
    });

    it('preserves warning semantics: severity=warning stays non-fatal (isError false)', async () => {
        // toolError() deliberately leaves isError false for warnings so the
        // response flows the success path while still carrying guidance.
        // Recovery must not flatten that nuance into a hard error.
        const action = makeAction('sync', async () => {
            throw toolError('RATE_LIMITED', {
                message: 'Approaching quota ceiling',
                severity: 'warning',
            });
        });
        const execCtx = makeExecCtx([action]);

        const out = await runChain(execCtx, resolve(action), ctx, { action: 'sync' });

        expect(out.isError).toBe(false);
        const text = (out.content[0] as { text: string }).text;
        expect(text).toContain('RATE_LIMITED');
        expect(text).toContain('severity="warning"');
        expect(text).not.toContain('INTERNAL_ERROR');
    });

    it('recovers a thrown error() response (plain ToolResponse path)', async () => {
        const action = makeAction('close', async () => {
            throw error('Unauthorized: token expired');
        });
        const execCtx = makeExecCtx([action]);

        const out = await runChain(execCtx, resolve(action), ctx, { action: 'close' });

        expect(out.isError).toBe(true);
        const text = (out.content[0] as { text: string }).text;
        expect(text).toContain('Unauthorized: token expired');
        expect(text).not.toContain('INTERNAL_ERROR');
    });
});

describe('ThrownResponseRecovery: thrown HandoffResponse', () => {
    it('returns the handoff payload untouched instead of crashing on the missing content array', async () => {
        const action = makeAction('triage', async () => {
            throw handoff('mcp://finance-agent', {
                reason: 'Triage → finance',
                carryOverState: { intent: 'invoice' },
            });
        });
        const execCtx = makeExecCtx([action]);

        const out = await runChain(execCtx, resolve(action), ctx, { action: 'triage' });

        // A HandoffResponse carries the brand but no `content`. The pipeline
        // must hand it back verbatim so ServerAttachment can route it to the
        // SwarmGateway — it must never reach the generic ToolResponse path.
        expect(out).toMatchObject({
            isHandoff: true,
            payload: { target: 'mcp://finance-agent', reason: 'Triage → finance' },
        });
    });
});

describe('ThrownResponseRecovery: thrown ResponseBuilder', () => {
    it('calls .build() on a thrown ResponseBuilder, preserving composed blocks', async () => {
        const action = makeAction('report', async () => {
            throw response({ total: 100 })
                .llmHint('Amounts are in cents.')
                .systemRules(['Use $ for currency']);
        });
        const execCtx = makeExecCtx([action]);

        const out = await runChain(execCtx, resolve(action), ctx, { action: 'report' });

        expect(out.isError).toBeFalsy();
        const texts = out.content.map(c => (c as { text?: string }).text ?? '');
        const joined = texts.join('\n');
        expect(joined).toContain('100');
        expect(joined).toContain('Amounts are in cents.');
        expect(joined).toContain('Use $ for currency');
    });
});

describe('ThrownResponseRecovery: genuinely unexpected errors', () => {
    it('wraps a plain Error as INTERNAL_ERROR with non-retryable guidance', async () => {
        const action = makeAction('boom', async () => {
            throw new Error('connection reset');
        });
        const execCtx = makeExecCtx([action]);

        const out = await runChain(execCtx, resolve(action), ctx, { action: 'boom' });

        expect(out.isError).toBe(true);
        const text = (out.content[0] as { text: string }).text;
        expect(text).toContain('INTERNAL_ERROR');
        expect(text).toContain('connection reset');
        // The tool/action origin must be included for triage
        expect(text).toContain('[orders/boom]');
        // Guidance must NOT blindly prescribe a retry
        expect(text.toLowerCase()).not.toMatch(/please retry|retry the request/i);
    });

    it('includes the discriminator value, not the raw action key, in the message', async () => {
        const action = makeAction('billing.refund', async () => {
            throw new Error('down');
        });
        const execCtx = makeExecCtx([action], 'billing', 'action');

        const out = await runChain(
            execCtx,
            resolve(action, 'billing.refund'),
            ctx,
            { action: 'billing.refund' },
        );

        const text = (out.content[0] as { text: string }).text;
        expect(text).toContain('[billing/billing.refund]');
    });

    it('handles non-Error throwables (string, undefined) without throwing itself', async () => {
        const execCtx = makeExecCtx([
            makeAction('str', async () => { throw 'bare string'; }),
            makeAction('undef', async () => { throw undefined; }),
        ]);

        const out1 = await runChain(execCtx, resolve(execCtx.actionMap.get('str')!), ctx, {});
        expect(out1.isError).toBe(true);
        expect((out1.content[0] as { text: string }).text).toContain('INTERNAL_ERROR');

        const out2 = await runChain(execCtx, resolve(execCtx.actionMap.get('undef')!), ctx, {});
        expect(out2.isError).toBe(true);
        expect((out2.content[0] as { text: string }).text).toContain('INTERNAL_ERROR');
    });
});

describe('ThrownResponseRecovery: rethrow path is unchanged', () => {
    it('propagates the original exception when rethrow=true, including classified responses', async () => {
        const classified = toolError('NOT_FOUND', { message: 'gone' });
        const action = makeAction('get', async () => { throw classified; });
        const execCtx = makeExecCtx([action]);

        await expect(
            runChain(execCtx, resolve(action), ctx, { action: 'get' }, undefined, true),
        ).rejects.toBe(classified);
    });

    it('propagates a plain Error when rethrow=true (traced path classifies it as a span error)', async () => {
        const boom = new Error('unhandled');
        const action = makeAction('get', async () => { throw boom; });
        const execCtx = makeExecCtx([action]);

        await expect(
            runChain(execCtx, resolve(action), ctx, { action: 'get' }, undefined, true),
        ).rejects.toBe(boom);
    });
});

describe('ThrownResponseRecovery: priority ordering matches postProcessResult', () => {
    it('checks handoff before the plain ToolResponse brand (handoff lacks content)', async () => {
        // handoff() brands the object with TOOL_RESPONSE_BRAND, so a naive
        // isToolResponse()-only check would forward it to content-block code.
        const h = handoff('mcp://x');
        // Sanity: the brand really is present — this is why ordering matters.
        expect((h as unknown as Record<symbol, unknown>)[Symbol.for('mcpfusion.ToolResponse')]).toBe(true);

        const action = makeAction('go', async () => { throw h; });
        const execCtx = makeExecCtx([action]);

        const out = await runChain(execCtx, resolve(action), ctx, { action: 'go' });
        expect(out).toBe(h);
    });
});

describe('ThrownResponseRecovery: thrown success responses', () => {
    it('recovers a thrown success() payload verbatim', async () => {
        const payload = success('done');
        const action = makeAction('run', async () => { throw payload; });
        const execCtx = makeExecCtx([action]);

        const out = await runChain(execCtx, resolve(action), ctx, { action: 'run' });
        expect(out).toBe(payload);
        expect((out.content[0] as { text: string }).text).toContain('done');
    });
});
