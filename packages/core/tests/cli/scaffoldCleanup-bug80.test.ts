/**
 * Bug #80 — scaffold() cleanup on partial failure
 *
 * Verifies that when scaffold() fails mid-write (e.g. a path conflict),
 * it cleans up the partially-written project directory and re-throws
 * the original error.
 *
 * Strategy: Instead of spying on ESM fs exports (not configurable in
 * ESM modules), we provoke real filesystem errors by placing a FILE
 * where scaffold expects a DIRECTORY, causing mkdirSync to fail.
 *
 * @module
 */
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { scaffold } from '../../src/cli/scaffold.js';
import type { ProjectConfig } from '../../src/cli/types.js';

const config: ProjectConfig = {
    name: 'test-scaffold-cleanup',
    transport: 'stdio',
    vector: 'vanilla',
    testing: false,
};

let tmpBase: string;

beforeEach(() => {
    tmpBase = join(tmpdir(), `mcpfusion-scaffold-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpBase, { recursive: true });
});

afterEach(() => {
    try { rmSync(tmpBase, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe('Bug #80 — scaffold() partial-failure cleanup', () => {
    it('should create all files on success', () => {
        const targetDir = join(tmpBase, 'success');
        const written = scaffold(targetDir, config);
        expect(written.length).toBeGreaterThan(0);
        for (const rel of written) {
            expect(existsSync(join(targetDir, rel))).toBe(true);
        }
    });

    it('should clean up target directory when scaffold encounters a write error', () => {
        const targetDir = join(tmpBase, 'blocked');
        // Pre-create the target dir and place a FILE where scaffold expects
        // a directory — this will cause mkdirSync to fail when it tries
        // to create a subdirectory under it (e.g. src/mcpfusion.ts needs src/ dir)
        mkdirSync(targetDir, { recursive: true });
        writeFileSync(join(targetDir, 'src'), 'blocker', 'utf-8');

        expect(() => scaffold(targetDir, config)).toThrow();

        // The targetDir should have been cleaned up by scaffold's catch
        expect(existsSync(targetDir)).toBe(false);
    });

    it('should re-throw the original filesystem error', () => {
        const targetDir = join(tmpBase, 'rethrow');
        mkdirSync(targetDir, { recursive: true });
        writeFileSync(join(targetDir, 'src'), 'blocker', 'utf-8');

        try {
            scaffold(targetDir, config);
            expect.unreachable('scaffold should have thrown');
        } catch (err: unknown) {
            expect(err).toBeInstanceOf(Error);
            expect((err as Error).message).toBeTruthy();
        }
    });

    it('should contain try/catch + rmSync cleanup in source', () => {
        // Static analysis: verify the scaffold module imports rmSync
        // and wraps the write loop in try/catch
        const source = readFileSync(
            resolve(__dirname, '../../src/cli/scaffold.ts'),
            'utf-8',
        );
        expect(source).toContain('rmSync');
        expect(source).toContain('try {');
        expect(source).toMatch(/catch\s*\(/);
        expect(source).toContain('recursive: true, force: true');
    });
});
