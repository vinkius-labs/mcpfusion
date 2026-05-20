/**
 * PostProcessorAsync.test.ts — Async Presenter Dispatch via PostProcessor
 *
 * Validates that `postProcessResult()` correctly detects Presenters with
 * async callbacks and dispatches through `makeAsync()` instead of `make()`.
 *
 * Covers:
 * - asyncUiBlocks, asyncRules, asyncSuggestActions presence detection
 * - Zero-overhead sync path when no async callbacks are configured
 * - Combined sync + async enrichment in a single response
 * - HandoffResponse pass-through at priority 0
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createPresenter, ui } from '../../src/presenter/index.js';
import { postProcessResult } from '../../src/presenter/PostProcessor.js';
import { success } from '../../src/core/response.js';

const invoiceSchema = z.object({
    id: z.string(),
    amount: z.number(),
});

// ── Async Presenter dispatch ────────────────────────────

describe('postProcessResult() — async Presenter dispatch', () => {
    it('should include asyncUiBlocks in the response', async () => {
        const presenter = createPresenter('Invoice')
            .schema(invoiceSchema)
            .asyncUiBlocks(async (inv) => [
                ui.markdown(`Revenue chart for ${inv.id}`),
            ]);

        const result = await postProcessResult(
            { id: 'INV-1', amount: 5000 },
            presenter,
        );

        const texts = result.content.map(c => c.text);
        expect(texts.some(t => t.includes('Revenue chart for INV-1'))).toBe(true);
    });

    it('should include asyncRules in the response', async () => {
        const presenter = createPresenter('Invoice')
            .schema(invoiceSchema)
            .asyncRules(async (inv) => [`High-value invoice: ${inv.id}`]);

        const result = await postProcessResult(
            { id: 'INV-2', amount: 99000 },
            presenter,
        );

        const texts = result.content.map(c => c.text);
        expect(texts.some(t => t.includes('High-value invoice: INV-2'))).toBe(true);
    });

    it('should include asyncSuggestActions in the response', async () => {
        const presenter = createPresenter('Invoice')
            .schema(invoiceSchema)
            .asyncSuggestActions(async () => [
                { tool: 'billing.pay', reason: 'Offer payment option' },
            ]);

        const result = await postProcessResult(
            { id: 'INV-3', amount: 100 },
            presenter,
        );

        const texts = result.content.map(c => c.text);
        expect(texts.some(t => t.includes('billing.pay'))).toBe(true);
    });

    it('should use sync make() when no async callbacks exist (zero overhead)', async () => {
        const presenter = createPresenter('Invoice')
            .schema(invoiceSchema)
            .systemRules(['Format amounts in cents']);

        expect(presenter.hasAsyncCallbacks()).toBe(false);

        const result = await postProcessResult(
            { id: 'INV-4', amount: 200 },
            presenter,
        );

        const texts = result.content.map(c => c.text);
        expect(texts.some(t => t.includes('Format amounts in cents'))).toBe(true);
    });

    it('should combine sync rules + sync UI + async UI in a single response', async () => {
        const presenter = createPresenter('Invoice')
            .schema(invoiceSchema)
            .systemRules(['Amounts in cents'])
            .uiBlocks((inv: { id: string }) => [ui.summary(`Sync: ${inv.id}`)])
            .asyncUiBlocks(async (inv) => [ui.markdown(`Async: ${inv.id}`)]);

        const result = await postProcessResult(
            { id: 'INV-5', amount: 300 },
            presenter,
        );

        const texts = result.content.map(c => c.text).join('\n');
        expect(texts).toContain('Amounts in cents');
        expect(texts).toContain('Sync: INV-5');
        expect(texts).toContain('Async: INV-5');
    });
});

// ── HandoffResponse pass-through ────────────────────────

describe('postProcessResult() — HandoffResponse priority 0', () => {
    it('should pass-through ToolResponse unchanged (priority 1 preserved)', async () => {
        const toolResponse = success('direct');
        const result = await postProcessResult(toolResponse, undefined);
        expect(result).toBe(toolResponse);
    });
});

// ── Pipeline single-pass validation ─────────────────────

describe('makeAsync() — single-pass validation', () => {
    it('should run Zod transform exactly once per item', async () => {
        let callCount = 0;
        const trackingSchema = invoiceSchema.transform((data) => {
            callCount++;
            return data;
        });

        const presenter = createPresenter('SinglePass')
            .schema(trackingSchema)
            .asyncUiBlocks(async () => [ui.summary('async block')]);

        await presenter.makeAsync({ id: 'INV-1', amount: 100 });

        // Single item validated once
        expect(callCount).toBe(1);
    });

    it('should run Zod transform once per array item', async () => {
        let callCount = 0;
        const trackingSchema = invoiceSchema.transform((data) => {
            callCount++;
            return data;
        });

        const presenter = createPresenter('ArraySinglePass')
            .schema(trackingSchema)
            .asyncCollectionUiBlocks(async (items) => [
                ui.summary(`${items.length} items`),
            ]);

        await presenter.makeAsync([
            { id: 'A', amount: 10 },
            { id: 'B', amount: 20 },
            { id: 'C', amount: 30 },
        ]);

        // 3 items × 1 validation = 3
        expect(callCount).toBe(3);
    });

    it('should produce deterministic results with non-idempotent transforms', async () => {
        let seq = 0;
        const schema = invoiceSchema.transform((data) => ({
            ...data,
            _seq: ++seq,
        }));

        const receivedSeq: number[] = [];
        const presenter = createPresenter('Deterministic')
            .schema(schema)
            .asyncUiBlocks(async (inv) => {
                receivedSeq.push((inv as { _seq: number })._seq);
                return [];
            });

        seq = 0;
        await presenter.makeAsync({ id: 'INV-1', amount: 100 });

        // Transform runs once → _seq=1. Async receives same value.
        expect(receivedSeq).toEqual([1]);
        expect(seq).toBe(1);
    });

    it('should pass truncated data to async callbacks', async () => {
        const receivedIds: string[] = [];

        const presenter = createPresenter('Truncated')
            .schema(invoiceSchema)
            .agentLimit(2, (n) => ui.summary(`${n} hidden`))
            .asyncCollectionUiBlocks(async (items: Array<{ id: string }>) => {
                receivedIds.push(...items.map(i => i.id));
                return [];
            });

        await presenter.makeAsync([
            { id: 'A', amount: 1 },
            { id: 'B', amount: 2 },
            { id: 'C', amount: 3 },
            { id: 'D', amount: 4 },
        ]);

        // Only the truncated 2 items reach the async callback
        expect(receivedIds).toEqual(['A', 'B']);
    });
});
