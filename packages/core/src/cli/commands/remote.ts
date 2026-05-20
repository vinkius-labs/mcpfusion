/**
 * `mcpfusion remote` — manage .MCPFusionrc cloud configuration.
 * @module
 */
import { resolve } from 'node:path';
import type { CliArgs } from '../args.js';
import { ansi, VINKIUS_CLOUD_URL } from '../constants.js';
import { mcpfusionrc, readMCPFusionrc, writeMCPFusionrc } from '../rc.js';

export function commandRemote(args: CliArgs): void {
    const cwd = args.cwd;

    // mcpfusion remote <url> [--server-id <id>] [--token <tok>] — set one or more at once
    // mcpfusion remote --server-id <id>        — uses default Vinkius Cloud URL
    if (args.remoteUrl || args.serverId || args.token) {
        const explicitRemote = args.remoteUrl;

        writeMCPFusionrc(cwd, {
            ...(explicitRemote ? { remote: explicitRemote } : {}),
            ...(args.serverId ? { serverId: args.serverId } : {}),
            ...(args.token ? { token: args.token } : {}),
        });

        const displayRemote = explicitRemote ?? readMCPFusionrc(cwd).remote ?? VINKIUS_CLOUD_URL;
        process.stderr.write(`  ${ansi.green('✓')} Remote set to ${ansi.cyan(displayRemote)}${displayRemote === VINKIUS_CLOUD_URL ? ansi.dim(' (default)') : ''}\n`);
        if (args.serverId) {
            process.stderr.write(`  ${ansi.green('✓')} Server ID set to ${ansi.cyan(args.serverId)}\n`);
        }
        if (args.token) {
            process.stderr.write(`  ${ansi.green('✓')} Token saved to .MCPFusionrc\n`);
        }
        return;
    }

    // mcpfusion remote — print current config
    const config = readMCPFusionrc(cwd);
    if (!config.remote && !config.serverId) {
        process.stderr.write(`  ${ansi.yellow('⚠')} No remote configured.\n\n`);
        process.stderr.write(`  ${ansi.dim('Quick setup:')}\n`);
        process.stderr.write(`    ${ansi.cyan('$')} mcpfusion remote --server-id <uuid>\n\n`);
        return;
    }

    process.stderr.write(`\n  ${ansi.bold('Remote Configuration')}\n\n`);
    process.stderr.write(`  ${ansi.dim('API:')}       ${config.remote ?? ansi.yellow('not set')}\n`);
    process.stderr.write(`  ${ansi.dim('Server:')}    ${config.serverId ?? ansi.yellow('not set')}\n`);
    process.stderr.write(`  ${ansi.dim('Token:')}     ${config.token ? ansi.green('configured') : ansi.yellow('not set')}\n`);
    process.stderr.write(`  ${ansi.dim('Config:')}    ${resolve(cwd, mcpfusionrc)}\n\n`);
}
