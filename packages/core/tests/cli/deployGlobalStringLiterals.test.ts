/**
 * Deploy edge shim — string-aware `global` → `globalThis` rewrite.
 *
 * The previous naive /\bglobal\b/g replace over the bundle text corrupted
 * string literals containing the bare word: coinpaprika-mcp's route literal
 * '/global' became '/globalThis' and 404'd in production, and tool copy like
 * "global cryptocurrency market" became "globalThis cryptocurrency market".
 *
 * These tests pin the string-aware scanner: live code is rewritten, strings,
 * template text, regex literals and comments keep their exact parsed content.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { replaceBareGlobal } from '../../src/cli/commands/deploy.js';

describe('replaceBareGlobal — code zones', () => {
    it('rewrites the bare identifier in live code', () => {
        expect(replaceBareGlobal('typeof global.crypto')).toBe('typeof globalThis.crypto');
        expect(replaceBareGlobal('if(global===undefined)global={}')).toBe(
            'if(globalThis===undefined)globalThis={}',
        );
        expect(replaceBareGlobal('var x=global["crypto"]')).toBe('var x=globalThis["crypto"]');
    });

    it('never matches longer identifiers', () => {
        const src = 'globalThis;globalMarket;global_market;getGlobalMarket;globalMiddleware;globally;';
        expect(replaceBareGlobal(src)).toBe(src);
    });

    it('still rewrites `global` inside ${ } interpolations (brace counting)', () => {
        expect(replaceBareGlobal('`${global.crypto}`')).toBe('`${globalThis.crypto}`');
        expect(replaceBareGlobal('`a${global.b}c${global.d}e`')).toBe(
            '`a${globalThis.b}c${globalThis.d}e`',
        );
    });
});

describe('replaceBareGlobal — string literals', () => {
    it('escapes the bare word inside strings without changing parsed content', () => {
        const out = replaceBareGlobal('fetch(BASE+"/global")');
        expect(out).toBe('fetch(BASE+"/globa\\u006C")');
        // the escaped raw text parses back to the exact original string value
        expect(eval('"/globa\\u006C"')).toBe('/global');
    });

    it('escapes the word inside template text, not inside interpolations', () => {
        const out = replaceBareGlobal('`total global market: ${global.cap}`');
        expect(out).toBe('`total globa\\u006C market: ${globalThis.cap}`');
        expect(eval('`total globa\\u006C market`')).toBe('total global market');
    });

    it('escapes inside nested templates within interpolations', () => {
        const out = replaceBareGlobal('`a${`global`}b${global.c}d`');
        expect(out).toBe('`a${`globa\\u006C`}b${globalThis.c}d`');
    });

    it('leaves globalThis and pre-escaped spellings in strings untouched', () => {
        const src = '"globalThis";"\\u0067lobal";"globalMarket";"global_market";';
        expect(replaceBareGlobal(src)).toBe(src);
    });

    it('handles escaped quotes and backslashes inside strings', () => {
        const out = replaceBareGlobal('"a\\"global"');
        expect(eval('"a\\"globa\\u006C"')).toBe('a"global');
        const bs = replaceBareGlobal('"c:\\\\global"');
        expect(eval('"c:\\\\globa\\u006C"')).toBe('c:\\global');
    });
});

describe('replaceBareGlobal — comments and regex literals', () => {
    it('leaves comments verbatim', () => {
        const src = '// global market note\nconst g = 1; /* global */';
        expect(replaceBareGlobal(src)).toBe(src);
    });

    it('escapes the word inside regex literals, preserving semantics', () => {
        const out = replaceBareGlobal('const re=/global/g;');
        expect(out).toBe('const re=/globa\\u006C/g;');
        expect(eval('/globa\\u006C/g').test('global')).toBe(true);
    });

    it('treats / after a keyword as regex start, after a value as division', () => {
        expect(replaceBareGlobal('return /global/.test(x)')).toBe('return /globa\\u006C/.test(x)');
        // b / c / d — division chain: the identifier `global` after `d` is live code
        expect(replaceBareGlobal('a=b/c/d/global/g')).toBe('a=b/c/d/globalThis/g');
    });
});
