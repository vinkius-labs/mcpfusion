/**
 * Bug #98 — .env parser: inline comments and mismatched quote stripping
 *
 * Verifies:
 * 1. Inline comments are stripped from unquoted values
 * 2. Only matching quote pairs are stripped
 * 3. Mismatched quotes are preserved as-is
 * 4. Quoted values with inline # are preserved (# inside quotes)
 *
 * @module
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadEnv } from '../../src/cli/rc.js';

let tmpBase: string;
const savedEnv: Record<string, string | undefined> = {};
const keysToClean: string[] = [];

beforeEach(() => {
    tmpBase = join(tmpdir(), `mcpfusion-env-parse-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpBase, { recursive: true });
});

afterEach(() => {
    // Restore env vars
    for (const key of keysToClean) {
        if (savedEnv[key] === undefined) delete process.env[key];
        else process.env[key] = savedEnv[key];
    }
    keysToClean.length = 0;
    try { rmSync(tmpBase, { recursive: true, force: true }); } catch { /* ignore */ }
});

function trackKey(key: string): void {
    if (!keysToClean.includes(key)) {
        savedEnv[key] = process.env[key];
        keysToClean.push(key);
        delete process.env[key];
    }
}

describe('Bug #98 — .env inline comments and quote pair matching', () => {
    it('strips inline comments from unquoted values', () => {
        trackKey('INLINE_TEST');
        writeFileSync(join(tmpBase, '.env'), 'INLINE_TEST=hello # this is a comment\n');
        loadEnv(tmpBase);
        expect(process.env['INLINE_TEST']).toBe('hello');
    });

    it('preserves # inside matching double quotes', () => {
        trackKey('HASH_QUOTED');
        writeFileSync(join(tmpBase, '.env'), 'HASH_QUOTED="value # not a comment"\n');
        loadEnv(tmpBase);
        expect(process.env['HASH_QUOTED']).toBe('value # not a comment');
    });

    it('preserves # inside matching single quotes', () => {
        trackKey('HASH_SINGLE');
        writeFileSync(join(tmpBase, '.env'), "HASH_SINGLE='value # not a comment'\n");
        loadEnv(tmpBase);
        expect(process.env['HASH_SINGLE']).toBe('value # not a comment');
    });

    it('does NOT strip mismatched quotes (single open, double close)', () => {
        trackKey('MISMATCH1');
        writeFileSync(join(tmpBase, '.env'), `MISMATCH1='bar"\n`);
        loadEnv(tmpBase);
        // Mismatched quotes should be preserved — not stripped independently
        expect(process.env['MISMATCH1']).toBe(`'bar"`);
    });

    it('preserves apostrophes within unquoted values', () => {
        trackKey('APOSTROPHE');
        writeFileSync(join(tmpBase, '.env'), "APOSTROPHE=it's\n");
        loadEnv(tmpBase);
        // Old bug would strip trailing apostrophe, producing "it"
        expect(process.env['APOSTROPHE']).toBe("it's");
    });

    it('strips matching double quote pairs correctly', () => {
        trackKey('DOUBLE_Q');
        writeFileSync(join(tmpBase, '.env'), 'DOUBLE_Q="hello world"\n');
        loadEnv(tmpBase);
        expect(process.env['DOUBLE_Q']).toBe('hello world');
    });

    it('strips matching single quote pairs correctly', () => {
        trackKey('SINGLE_Q');
        writeFileSync(join(tmpBase, '.env'), "SINGLE_Q='hello world'\n");
        loadEnv(tmpBase);
        expect(process.env['SINGLE_Q']).toBe('hello world');
    });

    it('full-line comments are still skipped', () => {
        trackKey('AFTER_COMMENT');
        writeFileSync(join(tmpBase, '.env'), '# this is a comment\nAFTER_COMMENT=value\n');
        loadEnv(tmpBase);
        expect(process.env['AFTER_COMMENT']).toBe('value');
    });
});
