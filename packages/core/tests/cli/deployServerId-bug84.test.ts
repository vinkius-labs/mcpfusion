/**
 * Bug #84 — Deploy serverId path traversal
 *
 * Verifies that the deploy command validates serverId to
 * prevent path-traversal attacks via .MCPFusionrc configuration.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const deploySource = readFileSync(
    resolve(__dirname, '../../src/cli/commands/deploy.ts'),
    'utf-8',
);

describe('Bug #84 — serverId path traversal prevention', () => {
    it('should validate serverId format before building URL', () => {
        // Must contain a regex or validation check for serverId
        expect(deploySource).toMatch(/SAFE_ID|serverId.*test|test.*serverId|encodeURIComponent/);
    });

    it('should reject serverId with path traversal characters', () => {
        // The validation should catch ../ and other traversal patterns
        expect(deploySource).toContain('invalid server ID');
    });

    it('should use encodeURIComponent in the URL construction', () => {
        expect(deploySource).toContain('encodeURIComponent(serverId)');
    });

    it('should accept valid alphanumeric/dash/underscore IDs', () => {
        // The SAFE_ID regex should allow normal IDs
        const safeIdMatch = deploySource.match(/SAFE_ID\s*=\s*(\/[^/]+\/[a-z]*)/);
        expect(safeIdMatch).toBeTruthy();
        const regex = new RegExp(safeIdMatch![1].slice(1, -1));
        expect(regex.test('my-server-123')).toBe(true);
        expect(regex.test('abc_def')).toBe(true);
        expect(regex.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should reject dangerous serverId values', () => {
        const safeIdMatch = deploySource.match(/SAFE_ID\s*=\s*(\/[^/]+\/[a-z]*)/);
        expect(safeIdMatch).toBeTruthy();
        const regex = new RegExp(safeIdMatch![1].slice(1, -1));
        expect(regex.test('../../admin/nuke')).toBe(false);
        expect(regex.test('../etc/passwd')).toBe(false);
        expect(regex.test('foo/bar')).toBe(false);
        expect(regex.test('server%20id')).toBe(false);
        expect(regex.test('')).toBe(false);
    });
});
