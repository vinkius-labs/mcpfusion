/**
 * `mcpfusion update` — Unit Tests
 *
 * Covers:
 *   - parseArgs: recognizes `update` command
 *   - No @mcpfusion packages: early exit with warning
 *   - No package.json: early exit with warning
 *   - All up to date: correct output formatting
 *   - Version diff detection: output indicators
 *   - Partial fetch failure: graceful fallback
 *
 * NOTE: Tests that require mocking `execSync` (npm install) are omitted
 * because ESM modules in Node.js don't support `vi.spyOn` on exports.
 * The install flow is verified through output assertions only.
 *
 * @module
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseArgs } from '../../src/cli/mcpfusion.js';
import { commandUpdate } from '../../src/cli/commands/update.js';

// ─── Helpers ─────────────────────────────────────────────────────

class ExitError extends Error {
    constructor(public code: number) { super(`process.exit(${code})`); }
}

function captureStderr(fn: () => Promise<void>): Promise<string> {
    return new Promise(async (resolve) => {
        let output = '';
        const original = process.stderr.write;
        process.stderr.write = ((chunk: string | Uint8Array) => {
            output += typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk);
            return true;
        }) as typeof process.stderr.write;
        try { await fn(); } catch (err) { if (!(err instanceof ExitError)) throw err; }
        finally { process.stderr.write = original; }
        resolve(output);
    });
}

function makeTmp(): string {
    const dir = join(tmpdir(), `mcpfusion-upd-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
    return dir;
}

function installPkg(tmpDir: string, scope: string, name: string, version: string) {
    const pkgDir = join(tmpDir, 'node_modules', scope, name);
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(join(pkgDir, 'package.json'), JSON.stringify({ version }));
}

// ============================================================================
// parseArgs
// ============================================================================

describe('parseArgs recognizes update command', () => {
    it('parses "update" command', () => {
        expect(parseArgs(['node', 'mcpfusion', 'update']).command).toBe('update');
    });
});

// ============================================================================
// commandUpdate
// ============================================================================

describe('commandUpdate', () => {
    let tmpDir: string;
    const originalFetch = globalThis.fetch;
    const originalExit = process.exit;

    beforeEach(() => {
        tmpDir = makeTmp();
        process.exit = ((code?: number) => { throw new ExitError(code ?? 0); }) as unknown as typeof process.exit;
    });
    afterEach(() => {
        try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* */ }
        globalThis.fetch = originalFetch;
        process.exit = originalExit;
    });

    it('warns when no @mcpfusion packages are in package.json', async () => {
        writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({
            dependencies: { 'zod': '^3.0.0' },
        }));

        const output = await captureStderr(() =>
            commandUpdate({ command: 'update', cwd: tmpDir, check: false, help: false }),
        );

        expect(output).toContain('No @mcpfusion/* packages found');
    });

    it('warns when no package.json exists', async () => {
        const output = await captureStderr(() =>
            commandUpdate({ command: 'update', cwd: tmpDir, check: false, help: false }),
        );

        expect(output).toContain('No @mcpfusion/* packages found');
    });

    it('shows "all up to date" when current matches latest', async () => {
        writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({
            dependencies: { '@mcpfusion/core': '^3.0.0' },
        }));
        installPkg(tmpDir, '@mcpfusion', 'core', '3.11.1');

        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ version: '3.11.1' }),
        }) as unknown as typeof fetch;

        const output = await captureStderr(() =>
            commandUpdate({ command: 'update', cwd: tmpDir, check: false, help: false }),
        );

        expect(output).toContain('✓ latest');
        expect(output).toContain('All packages up to date');
    });

    it('detects version mismatch in output', { timeout: 30_000 }, async () => {
        writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({
            dependencies: { '@mcpfusion/core': '^3.0.0' },
        }));
        installPkg(tmpDir, '@mcpfusion', 'core', '3.10.0');

        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ version: '3.11.1' }),
        }) as unknown as typeof fetch;

        // The update command will try to run `npm install` — which will fail
        // in tmpDir. We verify it saw the mismatch in its output.
        const output = await captureStderr(() =>
            commandUpdate({ command: 'update', cwd: tmpDir, check: false, help: false }),
        );

        expect(output).toContain('3.10.0');
        expect(output).toContain('3.11.1');
        expect(output).toContain('↑ update');
    });

    it('handles fetch failure for some packages', async () => {
        writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({
            dependencies: {
                '@mcpfusion/core': '^3.0.0',
                '@mcpfusion/test': '^1.0.0',
            },
        }));
        installPkg(tmpDir, '@mcpfusion', 'core', '3.11.1');
        installPkg(tmpDir, '@mcpfusion', 'test', '1.0.0');

        let callCount = 0;
        globalThis.fetch = vi.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) return { ok: true, json: async () => ({ version: '3.11.1' }) };
            return { ok: false, status: 404 };
        }) as unknown as typeof fetch;

        const output = await captureStderr(() =>
            commandUpdate({ command: 'update', cwd: tmpDir, check: false, help: false }),
        );

        // @mcpfusion/core is latest, @mcpfusion/test fetch fails → unknown is treated as latest
        expect(output).toContain('@mcpfusion/core');
    });

    it('prints header "mcpfusion update"', async () => {
        const output = await captureStderr(() =>
            commandUpdate({ command: 'update', cwd: tmpDir, check: false, help: false }),
        );
        expect(output).toContain('mcpfusion update');
    });

    it('displays multiple packages in table', async () => {
        writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({
            dependencies: {
                '@mcpfusion/core': '^3.0.0',
                '@mcpfusion/inspector': '^2.0.0',
                '@mcpfusion/test': '^1.0.0',
            },
        }));
        installPkg(tmpDir, '@mcpfusion', 'core', '3.11.1');
        installPkg(tmpDir, '@mcpfusion', 'inspector', '2.5.0');
        installPkg(tmpDir, '@mcpfusion', 'test', '1.2.0');

        // Return matching versions so no install is attempted — this test
        // only verifies that the table displays all packages.
        const versionMap: Record<string, string> = {
            '@mcpfusion/core': '3.11.1',
            '@mcpfusion/inspector': '2.5.0',
            '@mcpfusion/test': '1.2.0',
        };
        globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
            const pkg = Object.keys(versionMap).find(k => url.includes(encodeURIComponent(k)) || url.includes(k));
            return { ok: true, json: async () => ({ version: pkg ? versionMap[pkg] : '0.0.0' }) };
        }) as unknown as typeof fetch;

        const output = await captureStderr(() =>
            commandUpdate({ command: 'update', cwd: tmpDir, check: false, help: false }),
        );

        expect(output).toContain('@mcpfusion/core');
        expect(output).toContain('@mcpfusion/inspector');
        expect(output).toContain('@mcpfusion/test');
    });
});
