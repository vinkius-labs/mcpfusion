/**
 * npm-registry — Unit Tests
 *
 * Covers:
 *   - scanDeclaredFusionPackages: happy path, empty, no file, corrupt JSON, mixed deps
 *   - getInstalledVersion: installed, missing, corrupt package.json
 *   - scanInstalledFusionPackages: combines declared + node_modules discovery
 *   - fetchLatestVersion: mock fetch success, 404, timeout, bad JSON
 *   - enrichWithLatest: parallel enrichment, partial failures
 *
 * @module
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
    scanDeclaredFusionPackages,
    getInstalledVersion,
    scanInstalledFusionPackages,
    fetchLatestVersion,
    enrichWithLatest,
    MCPFUSION_SCOPE,
} from '../../src/cli/npm-registry.js';

// ─── Helpers ─────────────────────────────────────────────────────

function makeTmp(): string {
    const dir = join(tmpdir(), `mcpfusion-npm-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
    return dir;
}

// ============================================================================
// scanDeclaredFusionPackages
// ============================================================================

describe('scanDeclaredFusionPackages', () => {
    let tmpDir: string;
    beforeEach(() => { tmpDir = makeTmp(); });
    afterEach(() => { try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* */ } });

    it('extracts @mcpfusion/* from dependencies only', () => {
        writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({
            dependencies: { '@mcpfusion/core': '^3.8.0', 'zod': '^3.0.0' },
        }));
        const result = scanDeclaredFusionPackages(tmpDir);
        expect(result).toEqual(['@mcpfusion/core']);
    });

    it('extracts from devDependencies and peerDependencies', () => {
        writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({
            devDependencies: { '@mcpfusion/test': '^1.0.0' },
            peerDependencies: { '@mcpfusion/inspector': '>=2.0.0' },
        }));
        const result = scanDeclaredFusionPackages(tmpDir);
        expect(result).toEqual(['@mcpfusion/inspector', '@mcpfusion/test']);
    });

    it('deduplicates across dependency sections', () => {
        writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({
            dependencies: { '@mcpfusion/core': '^3.0.0' },
            devDependencies: { '@mcpfusion/core': '^3.0.0' },
            peerDependencies: { '@mcpfusion/core': '>=3.0.0' },
        }));
        const result = scanDeclaredFusionPackages(tmpDir);
        expect(result).toEqual(['@mcpfusion/core']);
    });

    it('returns sorted results', () => {
        writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({
            dependencies: {
                '@mcpfusion/z-last': '^1.0.0',
                '@mcpfusion/a-first': '^1.0.0',
                '@mcpfusion/m-middle': '^1.0.0',
            },
        }));
        const result = scanDeclaredFusionPackages(tmpDir);
        expect(result).toEqual(['@mcpfusion/a-first', '@mcpfusion/m-middle', '@mcpfusion/z-last']);
    });

    it('returns empty when no package.json exists', () => {
        expect(scanDeclaredFusionPackages(tmpDir)).toEqual([]);
    });

    it('returns empty when package.json is corrupt', () => {
        writeFileSync(join(tmpDir, 'package.json'), 'not-json{{');
        expect(scanDeclaredFusionPackages(tmpDir)).toEqual([]);
    });

    it('returns empty when no @mcpfusion packages in deps', () => {
        writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({
            dependencies: { 'express': '^4.0.0', 'zod': '^3.0.0' },
        }));
        expect(scanDeclaredFusionPackages(tmpDir)).toEqual([]);
    });

    it('handles package.json with no dependency sections', () => {
        writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({
            name: 'my-project',
            version: '1.0.0',
        }));
        expect(scanDeclaredFusionPackages(tmpDir)).toEqual([]);
    });

    it('ignores non-@mcpfusion scoped packages', () => {
        writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({
            dependencies: {
                '@mcpfusion/core': '^3.0.0',
                '@modelcontextprotocol/sdk': '^1.0.0',
                '@types/node': '^20.0.0',
                'mcpfusion-plugin': '^1.0.0',  // no scope — should be excluded
            },
        }));
        const result = scanDeclaredFusionPackages(tmpDir);
        expect(result).toEqual(['@mcpfusion/core']);
    });
});

// ============================================================================
// getInstalledVersion
// ============================================================================

describe('getInstalledVersion', () => {
    let tmpDir: string;
    beforeEach(() => { tmpDir = makeTmp(); });
    afterEach(() => { try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* */ } });

    it('reads version from installed package', () => {
        const pkgDir = join(tmpDir, 'node_modules', '@mcpfusion', 'core');
        mkdirSync(pkgDir, { recursive: true });
        writeFileSync(join(pkgDir, 'package.json'), JSON.stringify({ version: '3.11.1' }));

        expect(getInstalledVersion(tmpDir, '@mcpfusion/core')).toBe('3.11.1');
    });

    it('returns undefined when package is not installed', () => {
        expect(getInstalledVersion(tmpDir, '@mcpfusion/nonexistent')).toBeUndefined();
    });

    it('returns undefined when package.json is corrupt', () => {
        const pkgDir = join(tmpDir, 'node_modules', '@mcpfusion', 'broken');
        mkdirSync(pkgDir, { recursive: true });
        writeFileSync(join(pkgDir, 'package.json'), '{{{invalid');

        expect(getInstalledVersion(tmpDir, '@mcpfusion/broken')).toBeUndefined();
    });

    it('handles non-scoped package paths', () => {
        const pkgDir = join(tmpDir, 'node_modules', 'zod');
        mkdirSync(pkgDir, { recursive: true });
        writeFileSync(join(pkgDir, 'package.json'), JSON.stringify({ version: '3.22.4' }));

        expect(getInstalledVersion(tmpDir, 'zod')).toBe('3.22.4');
    });
});

// ============================================================================
// scanInstalledFusionPackages
// ============================================================================

describe('scanInstalledFusionPackages', () => {
    let tmpDir: string;
    beforeEach(() => { tmpDir = makeTmp(); });
    afterEach(() => { try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* */ } });

    it('combines declared + node_modules discovery', () => {
        // Declare @mcpfusion/core in package.json
        writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({
            dependencies: { '@mcpfusion/core': '^3.0.0' },
        }));

        // Install @mcpfusion/core and @mcpfusion/test (transitive, not in package.json)
        for (const pkg of ['core', 'test']) {
            const dir = join(tmpDir, 'node_modules', '@mcpfusion', pkg);
            mkdirSync(dir, { recursive: true });
            writeFileSync(join(dir, 'package.json'), JSON.stringify({ version: '3.11.1' }));
        }

        const result = scanInstalledFusionPackages(tmpDir);
        expect(result).toHaveLength(2);
        expect(result.map(p => p.name)).toEqual(['@mcpfusion/core', '@mcpfusion/test']);
        expect(result.every(p => p.current === '3.11.1')).toBe(true);
    });

    it('returns empty when no @mcpfusion scope in node_modules', () => {
        writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({}));
        expect(scanInstalledFusionPackages(tmpDir)).toEqual([]);
    });

    it('excludes declared but not installed packages', () => {
        writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({
            dependencies: { '@mcpfusion/core': '^3.0.0' },
        }));
        // No node_modules — package is declared but not installed
        const result = scanInstalledFusionPackages(tmpDir);
        expect(result).toEqual([]); // not installed → filtered out
    });

    it('handles missing node_modules/@mcpfusion directory gracefully', () => {
        writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({}));
        mkdirSync(join(tmpDir, 'node_modules'), { recursive: true });
        // @mcpfusion folder doesn't exist
        expect(scanInstalledFusionPackages(tmpDir)).toEqual([]);
    });
});

// ============================================================================
// fetchLatestVersion
// ============================================================================

describe('fetchLatestVersion', () => {
    const originalFetch = globalThis.fetch;
    afterEach(() => { globalThis.fetch = originalFetch; });

    it('returns version on successful response', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ version: '4.0.0' }),
        }) as unknown as typeof fetch;

        const result = await fetchLatestVersion('@mcpfusion/core');
        expect(result).toBe('4.0.0');
    });

    it('returns undefined on 404', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
        }) as unknown as typeof fetch;

        const result = await fetchLatestVersion('@mcpfusion/nonexistent');
        expect(result).toBeUndefined();
    });

    it('returns undefined on network error', async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(
            new Error('ENOTFOUND'),
        ) as unknown as typeof fetch;

        const result = await fetchLatestVersion('@mcpfusion/core');
        expect(result).toBeUndefined();
    });

    it('returns undefined on malformed JSON response', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({}), // no version field
        }) as unknown as typeof fetch;

        const result = await fetchLatestVersion('@mcpfusion/core');
        expect(result).toBeUndefined();
    });

    it('returns undefined on fetch abort (timeout)', async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(
            new DOMException('The operation was aborted', 'AbortError'),
        ) as unknown as typeof fetch;

        const result = await fetchLatestVersion('@mcpfusion/core');
        expect(result).toBeUndefined();
    });
});

// ============================================================================
// enrichWithLatest
// ============================================================================

describe('enrichWithLatest', () => {
    const originalFetch = globalThis.fetch;
    afterEach(() => { globalThis.fetch = originalFetch; });

    it('enriches all packages with their latest versions', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ version: '5.0.0' }),
        }) as unknown as typeof fetch;

        const packages = [
            { name: '@mcpfusion/core', current: '3.11.1' },
            { name: '@mcpfusion/test', current: '3.11.1' },
        ];

        const result = await enrichWithLatest(packages);
        expect(result).toHaveLength(2);
        expect(result[0]!.latest).toBe('5.0.0');
        expect(result[1]!.latest).toBe('5.0.0');
    });

    it('handles partial failures gracefully', async () => {
        let callCount = 0;
        globalThis.fetch = vi.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) return { ok: true, json: async () => ({ version: '5.0.0' }) };
            throw new Error('ENOTFOUND');
        }) as unknown as typeof fetch;

        const packages = [
            { name: '@mcpfusion/core', current: '3.11.1' },
            { name: '@mcpfusion/failing', current: '1.0.0' },
        ];

        const result = await enrichWithLatest(packages);
        expect(result[0]!.latest).toBe('5.0.0');
        expect(result[1]!.latest).toBeUndefined();
    });

    it('returns empty array for empty input', async () => {
        const result = await enrichWithLatest([]);
        expect(result).toEqual([]);
    });
});

// ============================================================================
// Constants
// ============================================================================

describe('npm-registry constants', () => {
    it('MCPFUSION_SCOPE is correct', () => {
        expect(MCPFUSION_SCOPE).toBe('@mcpfusion');
    });
});
