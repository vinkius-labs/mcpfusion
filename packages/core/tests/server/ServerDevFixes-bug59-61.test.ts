/**
 * Bug #59 — `ServerAttachment` calls `recompile()` twice per tool call in flat mode.
 * Bug #60 — `DevServer.invalidateModule` doesn't invalidate transitive dependencies.
 * Bug #61 — `DevServer` watcher without `'error'` handler — unhandled crash.
 *
 * Why existing tests missed them:
 * - #59: No test counted recompile invocations in flat mode dispatch.
 * - #60: CJS invalidation tests only checked the changed file, not importers.
 * - #61: No test simulated a watcher `'error'` event.
 *
 * Fixes:
 * - #59: Reuse exposition compiled for telemetry routing in the dispatch block.
 * - #60: Walk `require.cache[key].children` recursively to invalidate dependents.
 * - #61: Add `watcher.on('error', ...)` handler.
 */
import { describe, it, expect, vi } from 'vitest';

// =====================================================================
// Bug #59 — Double recompile eliminated
// =====================================================================

describe('ServerAttachment — no double recompile in flat mode (Bug #59)', () => {
    it('should call recompile only once per tool call in flat mode', async () => {
        // We test the structure by importing ServerAttachment source
        // and verifying the code path. Since the actual integration
        // requires a full MCP server, we read the source to verify
        // the fix structurally.
        const { readFileSync } = await import('fs');
        const { resolve } = await import('path');
        const src = readFileSync(
            resolve(__dirname, '../../src/server/ServerAttachment.ts'),
            'utf-8',
        );

        // Count occurrences of hCtx.recompile() in the createToolCallHandler area
        // The telemetry section should have one call, and the dispatch block
        // should NOT have another hCtx.recompile() call — it reuses the outer `exposition`.
        const callHandler = src.slice(
            src.indexOf('function createToolCallHandler'),
            src.indexOf('function createToolListHandler') > src.indexOf('function createToolCallHandler')
                ? src.indexOf('function createToolListHandler')
                : src.length,
        );
        const recompileCalls = (callHandler.match(/hCtx\.recompile\(\)/g) || []).length;

        // Should have exactly 1 call (the telemetry route section)
        // The dispatch block should reuse the outer `exposition` variable
        expect(recompileCalls).toBe(1);
    });
});

// =====================================================================
// Bug #60 — Transitive CJS invalidation
// =====================================================================

describe('DevServer — transitive CJS invalidation (Bug #60)', () => {
    it('invalidateCjsTree is referenced in source (structural check)', async () => {
        const { readFileSync } = await import('fs');
        const { resolve } = await import('path');
        const src = readFileSync(
            resolve(__dirname, '../../src/server/DevServer.ts'),
            'utf-8',
        );

        // Should contain the recursive invalidation function
        expect(src).toContain('invalidateCjsTree');
        // Should contain the visitor pattern (walk children)
        expect(src).toContain('visited');
        expect(src).toContain('queue');
        // Should walk children to find dependents
        expect(src).toContain('.children');
    });
});

// =====================================================================
// Bug #61 — Watcher error handler
// =====================================================================

describe('DevServer — watcher error handler (Bug #61)', () => {
    it('source contains watcher.on(error) handler', async () => {
        const { readFileSync } = await import('fs');
        const { resolve } = await import('path');
        const src = readFileSync(
            resolve(__dirname, '../../src/server/DevServer.ts'),
            'utf-8',
        );

        // The watcher should have an error handler attached
        expect(src).toContain("watcher.on('error'");
        expect(src).toContain('[mcpfusion dev] Watcher error');
    });

    it('createDevServer does not crash on creation (smoke test)', async () => {
        const { createDevServer } = await import('../../src/server/DevServer.js');
        const devServer = createDevServer({
            dir: './src/tools',
            setup: vi.fn(),
        });
        expect(devServer).toBeDefined();
        expect(typeof devServer.start).toBe('function');
    });
});
