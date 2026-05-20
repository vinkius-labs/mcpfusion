/**
 * `mcpfusion version` — display CLI version and installed @mcpfusion/* packages.
 * @module
 */
import type { CliArgs } from '../args.js';
import { ansi, MCPFUSION_VERSION } from '../constants.js';
import { scanInstalledFusionPackages } from '../npm-registry.js';

export async function commandVersion(args: CliArgs): Promise<void> {
    const cwd = args.cwd;

    // ── Runtime info ──
    const nodeVersion = process.version;

    process.stderr.write('\n');
    process.stderr.write(`  ${ansi.bold('MCP Fusion CLI')}         ${ansi.cyan(MCPFUSION_VERSION)}\n`);
    process.stderr.write(`  ${ansi.bold('Node.js')}          ${nodeVersion}\n`);
    process.stderr.write(`  ${ansi.bold('OS')}               ${process.platform}-${process.arch}\n`);

    // ── Installed packages ──
    const packages = scanInstalledFusionPackages(cwd);

    if (packages.length > 0) {
        process.stderr.write(`\n  ${ansi.dim('Installed Packages:')}\n`);
        const maxName = Math.max(...packages.map(p => p.name.length));
        for (const pkg of packages) {
            const padded = pkg.name.padEnd(maxName + 2);
            process.stderr.write(`  ${ansi.dim(padded)} ${pkg.current}\n`);
        }
    }

    process.stderr.write('\n');
}
