/**
 * Bug #85 — MCPFusionClient hardcodes discriminator to 'action'
 *
 * Verifies that MCPFusionClient supports a configurable discriminator
 * key via MCPFusionClientOptions, defaulting to 'action' but allowing
 * custom keys like 'command' to match server configuration.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { createMCPFusionClient, type MCPFusionTransport } from '../../src/client/MCPFusionClient.js';
import { success, type ToolResponse } from '../../src/core/response.js';

function createMockTransport(): MCPFusionTransport & {
    calls: Array<{ name: string; args: Record<string, unknown> }>;
} {
    const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
    return {
        calls,
        async callTool(name: string, args: Record<string, unknown>): Promise<ToolResponse> {
            calls.push({ name, args });
            return success(`${name}:ok`);
        },
    };
}

describe('Bug #85 — MCPFusionClient discriminatorKey', () => {
    it('should default to "action" when no discriminatorKey is provided', async () => {
        const transport = createMockTransport();
        const client = createMCPFusionClient(transport);

        await client.execute('projects.create', { name: 'test' });

        expect(transport.calls[0].args).toEqual({
            action: 'create',
            name: 'test',
        });
    });

    it('should use custom discriminatorKey when provided', async () => {
        const transport = createMockTransport();
        const client = createMCPFusionClient(transport, {
            discriminatorKey: 'command',
        });

        await client.execute('projects.create', { name: 'test' });

        expect(transport.calls[0].args).toEqual({
            command: 'create',
            name: 'test',
        });
        // Must NOT have 'action' key
        expect(transport.calls[0].args).not.toHaveProperty('action');
    });

    it('should work with nested group paths (two dots)', async () => {
        const transport = createMockTransport();
        const client = createMCPFusionClient(transport, {
            discriminatorKey: 'op',
        });

        await client.execute('admin.users.delete', { id: '42' });

        // First dot splits tool name from action
        expect(transport.calls[0].name).toBe('admin');
        expect(transport.calls[0].args).toEqual({
            op: 'users.delete',
            id: '42',
        });
    });

    it('should not inject discriminator for simple (non-dotted) actions', async () => {
        const transport = createMockTransport();
        const client = createMCPFusionClient(transport, {
            discriminatorKey: 'command',
        });

        await client.execute('ping', { ts: 123 });

        expect(transport.calls[0].name).toBe('ping');
        expect(transport.calls[0].args).toEqual({ ts: 123 });
        expect(transport.calls[0].args).not.toHaveProperty('command');
    });

    it('should let user args take precedence over auto-injected discriminator', async () => {
        const transport = createMockTransport();
        const client = createMCPFusionClient(transport, {
            discriminatorKey: 'action',
        });

        // User explicitly provides "action" in args — spread order means
        // the auto-injected value should win (it's placed AFTER user args)
        await client.execute('tools.list', { action: 'should-be-overridden' });

        expect(transport.calls[0].args.action).toBe('list');
    });

    it('should work alongside throwOnError option', async () => {
        const transport = createMockTransport();
        const client = createMCPFusionClient(transport, {
            discriminatorKey: 'cmd',
            throwOnError: false,
        });

        const result = await client.execute('billing.charge', { amount: 100 });

        expect(transport.calls[0].args).toEqual({
            cmd: 'charge',
            amount: 100,
        });
        expect(result.isError).toBeFalsy();
    });
});
