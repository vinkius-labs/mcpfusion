/**
 * Shared npm-registry utilities — fetch latest versions, scan installed packages.
 *
 * Used by `mcpfusion version`, `mcpfusion update`, and `mcpfusion doctor`.
 * @module
 */
import { resolve, join } from 'node:path';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

// ─── Constants ───────────────────────────────────────────────────

/** Scope prefix for MCP Fusion packages. */
export const MCPFUSION_SCOPE = '@mcpfusion';

/** npm registry URL for fetching latest versions. */
const NPM_REGISTRY = 'https://registry.npmjs.org';

// ─── Types ───────────────────────────────────────────────────────

export interface PackageVersion {
    name: string;
    current: string;
    latest?: string | undefined;
}

// ─── Local Scanning ──────────────────────────────────────────────

/**
 * Read `@mcpfusion/*` dependencies from the project's `package.json`.
 *
 * Returns a deduplicated list of package names found across
 * `dependencies`, `devDependencies`, and `peerDependencies`.
 */
export function scanDeclaredFusionPackages(cwd: string): string[] {
    const pkgPath = resolve(cwd, 'package.json');
    if (!existsSync(pkgPath)) return [];
    try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        const names = new Set<string>();
        for (const section of ['dependencies', 'devDependencies', 'peerDependencies']) {
            const deps: Record<string, string> | undefined = pkg[section];
            if (!deps) continue;
            for (const name of Object.keys(deps)) {
                if (name.startsWith(`${MCPFUSION_SCOPE}/`)) names.add(name);
            }
        }
        return [...names].sort();
    } catch { return []; }
}

/**
 * Read the installed version from `node_modules/<pkg>/package.json`.
 * Returns `undefined` if the package is not installed.
 */
export function getInstalledVersion(cwd: string, pkgName: string): string | undefined {
    const pkgJsonPath = join(cwd, 'node_modules', ...pkgName.split('/'), 'package.json');
    try {
        const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
        return pkg.version as string;
    } catch { return undefined; }
}

/**
 * Scan `node_modules/@mcpfusion/` to discover all installed MCP Fusion packages.
 *
 * Combines packages declared in `package.json` with those physically
 * present in `node_modules` for a complete view.
 */
export function scanInstalledFusionPackages(cwd: string): PackageVersion[] {
    const declared = scanDeclaredFusionPackages(cwd);
    const found = new Set<string>(declared);

    // Also discover transitive installs not in package.json
    const scopeDir = join(cwd, 'node_modules', MCPFUSION_SCOPE);
    try {
        for (const entry of readdirSync(scopeDir, { withFileTypes: true })) {
            if (entry.isDirectory()) found.add(`${MCPFUSION_SCOPE}/${entry.name}`);
        }
    } catch { /* no @mcpfusion scope installed */ }

    const results: PackageVersion[] = [];
    for (const name of [...found].sort()) {
        const current = getInstalledVersion(cwd, name);
        if (current) results.push({ name, current });
    }
    return results;
}

// ─── npm Registry ────────────────────────────────────────────────

/**
 * Fetch the latest published version of a package from npm.
 *
 * Uses the abbreviated metadata endpoint for speed (~100ms per call).
 * Returns `undefined` on network/parse failure.
 */
export async function fetchLatestVersion(pkgName: string): Promise<string | undefined> {
    try {
        const url = `${NPM_REGISTRY}/${pkgName}/latest`;
        const res = await fetch(url, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(5_000),
        });
        if (!res.ok) return undefined;
        const data = await res.json() as { version?: string };
        return data.version;
    } catch { return undefined; }
}

/**
 * Enrich a list of installed packages with their latest npm versions.
 *
 * All fetches run in parallel for speed.
 */
export async function enrichWithLatest(packages: PackageVersion[]): Promise<PackageVersion[]> {
    const results = await Promise.all(
        packages.map(async (pkg): Promise<PackageVersion> => {
            const latest = await fetchLatestVersion(pkg.name);
            return { name: pkg.name, current: pkg.current, latest };
        }),
    );
    return results;
}
