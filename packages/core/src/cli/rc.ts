/**
 * .MCPFusionrc management — local cloud config, .env loading.
 * @module
 */
import { resolve } from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { RemoteConfig } from './types.js';
import { ansi } from './constants.js';

// ─── Constants ───────────────────────────────────────────────────

export const mcpfusionrc = '.MCPFusionrc';

// ─── Environment ─────────────────────────────────────────────────

/** Load .env file from cwd into process.env (won't overwrite existing). */
export function loadEnv(cwd: string): void {
    try {
        const content = readFileSync(resolve(cwd, '.env'), 'utf-8');
        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eq = trimmed.indexOf('=');
            if (eq === -1) continue;
            const key = trimmed.slice(0, eq).trim();
            let val = trimmed.slice(eq + 1).trim();
            // Strip matching quote pairs only (e.g. 'value' or "value", not 'bar")
            const quoteMatch = val.match(/^(["'])(.*?)\1$/);
            if (quoteMatch) {
                val = quoteMatch[2] ?? '';
            } else {
                // Strip inline comments only for unquoted values
                val = val.replace(/\s+#.*$/, '');
            }
            if (!process.env[key]) process.env[key] = val;
        }
    } catch { /* No .env file — env vars may be set directly (CI/CD) */ }
}

// ─── .gitignore ──────────────────────────────────────────────────

/**
 * Previously auto-added .MCPFusionrc to .gitignore.
 * Removed: .MCPFusionrc must persist in the repo for deploy workflows.
 */
 export function ensureGitignore(_cwd: string): void {
    // no-op — kept for backward compatibility
}

// ─── Read / Write ────────────────────────────────────────────────

/** Read .MCPFusionrc from project root. */
export function readMCPFusionrc(cwd: string): Partial<RemoteConfig> {
    const rcPath = resolve(cwd, mcpfusionrc);
    if (!existsSync(rcPath)) return {};
    try {
        return JSON.parse(readFileSync(rcPath, 'utf-8'));
    } catch {
        return {};
    }
}

/** Write .MCPFusionrc. */
export function writeMCPFusionrc(cwd: string, config: Partial<RemoteConfig>): void {
    const existing = readMCPFusionrc(cwd);
    const merged = { ...existing, ...config };
    // Strip explicitly-undefined keys (e.g. token: undefined from --clear)
    for (const key of Object.keys(merged) as Array<keyof typeof merged>) {
        if (merged[key] === undefined) delete merged[key];
    }
    writeFileSync(resolve(cwd, mcpfusionrc), JSON.stringify(merged, null, 2) + '\n');
}
