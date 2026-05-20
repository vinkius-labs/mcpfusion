/**
 * Bug #102 — autoDiscover walkDir sorts entries by name
 *
 * Verifies that files discovered by walkDir are returned in
 * deterministic alphabetical order, regardless of filesystem order.
 *
 * @module
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { autoDiscover } from '../../src/server/autoDiscover.js';

describe('Bug #102 — autoDiscover deterministic order', () => {
    let tempDir: string;

    beforeEach(async () => {
        tempDir = join(tmpdir(), `mcpfusion-order-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        await fs.mkdir(tempDir, { recursive: true });
    });

    afterEach(async () => {
        try { await fs.rm(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
    });

    it('returns files sorted alphabetically by name', async () => {
        // Create files in deliberately non-alphabetical order
        const names = ['zebra.tool.js', 'alpha.tool.js', 'middle.tool.js', 'beta.tool.js'];
        for (const name of names) {
            await fs.writeFile(
                join(tempDir, name),
                `export const tool = { getName() { return '${name}'; } };`,
            );
        }

        const registry = { register: () => {} };
        const files = await autoDiscover(registry, tempDir);

        // files should be sorted
        const sorted = [...files].sort((a, b) => a.localeCompare(b));
        expect(files).toEqual(sorted);
    });

    it('returns files in same order across multiple calls', async () => {
        const names = ['c-tool.js', 'a-tool.js', 'b-tool.js'];
        for (const name of names) {
            await fs.writeFile(
                join(tempDir, name),
                `export const tool = { getName() { return '${name}'; } };`,
            );
        }

        const registry = { register: () => {} };
        const files1 = await autoDiscover(registry, tempDir);
        const files2 = await autoDiscover(registry, tempDir);

        expect(files1).toEqual(files2);
    });
});
