import { describe, it, expect } from 'vitest';
import { parseArgs } from '../../src/cli/args.js';

describe('Bug #96 — flag-value args guard against consuming flags', () => {
    it('throws when --server is followed by another flag', () => {
        expect(() => parseArgs(['node', 'mcpfusion', 'dev', '--server', '--dir', './src']))
            .toThrow(/missing value/i);
    });

    it('throws when --name is followed by another flag', () => {
        expect(() => parseArgs(['node', 'mcpfusion', 'create', '--name', '--transport']))
            .toThrow(/missing value/i);
    });

    it('throws when --cwd is followed by another flag', () => {
        expect(() => parseArgs(['node', 'mcpfusion', 'dev', '--cwd', '--check']))
            .toThrow(/missing value/i);
    });

    it('throws when --transport is followed by another flag', () => {
        expect(() => parseArgs(['node', 'mcpfusion', 'create', '--transport', '--vector']))
            .toThrow(/missing value/i);
    });

    it('throws when --vector is followed by another flag', () => {
        expect(() => parseArgs(['node', 'mcpfusion', 'create', '--vector', '--testing']))
            .toThrow(/missing value/i);
    });

    it('throws when --dir is followed by another flag', () => {
        expect(() => parseArgs(['node', 'mcpfusion', 'dev', '--dir', '--server']))
            .toThrow(/missing value/i);
    });

    it('throws when --token is followed by another flag', () => {
        expect(() => parseArgs(['node', 'mcpfusion', 'deploy', '--token', '--server-id']))
            .toThrow(/missing value/i);
    });

    it('throws when --server-id is followed by another flag', () => {
        expect(() => parseArgs(['node', 'mcpfusion', 'deploy', '--server-id', '--token']))
            .toThrow(/missing value/i);
    });

    it('throws when flag is at end of argv (missing value)', () => {
        expect(() => parseArgs(['node', 'mcpfusion', 'dev', '--server']))
            .toThrow(/missing value/i);
    });

    it('accepts valid flag-value pairs as before', () => {
        const result = parseArgs(['node', 'mcpfusion', 'dev', '--server', './src/server.ts', '--dir', './src']);
        expect(result.server).toBe('./src/server.ts');
        expect(result.dir).toBe('./src');
    });

    it('accepts shorthand flags with values', () => {
        const result = parseArgs(['node', 'mcpfusion', 'dev', '-s', './server.ts', '-d', './dist']);
        expect(result.server).toBe('./server.ts');
        expect(result.dir).toBe('./dist');
    });
});
