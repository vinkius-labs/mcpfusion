/**
 * Bug #95 — scaffold() skips generic auth.ts when vector is 'oauth'
 *
 * Verifies that the oauth middleware auth.ts is written only once,
 * and the generic RBAC auth.ts is NOT written for oauth vector.
 *
 * @module
 */
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scaffold } from '../../src/cli/scaffold.js';
import type { ProjectConfig } from '../../src/cli/types.js';

let tmpBase: string;

beforeEach(() => {
    tmpBase = join(tmpdir(), `mcpfusion-scaffold-oauth-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpBase, { recursive: true });
});

afterEach(() => {
    try { rmSync(tmpBase, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe('Bug #95 — scaffold auth.ts deduplication for oauth vector', () => {
    it('writes auth.ts exactly once for oauth vector', () => {
        const targetDir = join(tmpBase, 'oauth-project');
        const config: ProjectConfig = {
            name: 'test-oauth',
            transport: 'stdio',
            vector: 'oauth',
            testing: false,
        };

        const written = scaffold(targetDir, config);
        const authPaths = written.filter(p => p === 'src/middleware/auth.ts');

        // Should appear exactly once (from oauth-specific push, not generic RBAC)
        expect(authPaths).toHaveLength(1);
    });

    it('auth.ts content is oauth-specific, not generic RBAC', () => {
        const targetDir = join(tmpBase, 'oauth-content');
        const config: ProjectConfig = {
            name: 'test-oauth-content',
            transport: 'stdio',
            vector: 'oauth',
            testing: false,
        };

        scaffold(targetDir, config);
        const authContent = readFileSync(join(targetDir, 'src/middleware/auth.ts'), 'utf-8');

        // OAuth middleware should reference oauth/token concepts
        expect(authContent.toLowerCase()).toMatch(/oauth|token|bearer/);
    });

    it('vanilla vector still gets generic auth.ts', () => {
        const targetDir = join(tmpBase, 'vanilla-project');
        const config: ProjectConfig = {
            name: 'test-vanilla',
            transport: 'stdio',
            vector: 'vanilla',
            testing: false,
        };

        const written = scaffold(targetDir, config);
        const authPaths = written.filter(p => p === 'src/middleware/auth.ts');
        expect(authPaths).toHaveLength(1);
    });
});
