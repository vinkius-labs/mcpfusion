/**
 * Bug #74 Regression: isCLI detection must handle Windows shims
 *
 * BUG: The guard checked `process.argv[1]?.endsWith('mcpfusion')` or
 * `endsWith('mcpfusion.js')`, missing Windows-specific extensions like
 * `.cmd`, `.ps1`, `.cjs`, `.mjs`, `.exe` created by npm/pnpm/yarn.
 * On Windows via npx, `argv[1]` is typically `…\node_modules\.bin\mcpfusion.cmd`
 * or `mcpfusion.ps1`. The guard silently failed — `main()` was never called,
 * producing zero output.
 *
 * FIX: Extract basename, strip any extension, compare against `'mcpfusion'`.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';

// Replicate the fixed detection logic to test it in isolation
// (importing mcpfusion.ts directly would trigger the CLI guard)
function detectCLI(argv1: string | undefined): boolean {
    if (!argv1) return false;
    const base = argv1.replace(/\\/g, '/').split('/').pop() ?? '';
    const name = base.replace(/\.[a-z0-9]+$/i, '');
    return name === 'mcpfusion';
}

describe('Bug #74: isCLI detection for Windows shims', () => {

    it('detects bare "mcpfusion" (POSIX)', () => {
        expect(detectCLI('/usr/local/bi./mcpfusion')).toBe(true);
    });

    it('detects mcpfusion.js', () => {
        expect(detectCLI('/project/node_modules/.bi./mcpfusion.js')).toBe(true);
    });

    it('detects mcpfusion.cmd (Windows npm)', () => {
        expect(detectCLI('C:\\Users\\dev\\node_modules\\.bin\\mcpfusion.cmd')).toBe(true);
    });

    it('detects mcpfusion.ps1 (Windows PowerShell)', () => {
        expect(detectCLI('C:\\Users\\dev\\node_modules\\.bin\\mcpfusion.ps1')).toBe(true);
    });

    it('detects mcpfusion.cjs (pnpm)', () => {
        expect(detectCLI('/home/user/.pnp./mcpfusion.cjs')).toBe(true);
    });

    it('detects mcpfusion.mjs (ESM shim)', () => {
        expect(detectCLI('/usr/local/bi./mcpfusion.mjs')).toBe(true);
    });

    it('detects mcpfusion.exe (Windows compiled)', () => {
        expect(detectCLI('C:\\Program Files\\mcpfusion.exe')).toBe(true);
    });

    it('rejects unrelated binary', () => {
        expect(detectCLI('/usr/local/bin/node')).toBe(false);
    });

    it('rejects undefined argv[1]', () => {
        expect(detectCLI(undefined)).toBe(false);
    });

    it('rejects names containing "mcpfusion" as substring', () => {
        expect(detectCLI('/usr/local/bi./mcpfusion-extra')).toBe(false);
        expect(detectCLI('/usr/local/bin/myfusion')).toBe(false);
    });
});
