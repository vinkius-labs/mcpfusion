/**
 * Auto-Discovery — Scan Directory for SKILL.md Files
 *
 * Recursively walks a directory looking for SKILL.md files,
 * parses them, and registers them in a SkillRegistry.
 *
 * Follows the same pattern as `@mcpfusion/core`'s `autoDiscover()`.
 *
 * @module
 */

import { promises as fs } from 'node:fs';
import { join, resolve, basename, relative } from 'node:path';

import { type Skill } from '../domain/Skill.js';
import { parseSkillMd } from '../parser/SkillParser.js';
import { type SkillRegistry } from '../registry/SkillRegistry.js';

// ── Types ────────────────────────────────────────────────

/**
 * Options for `autoDiscoverSkills()`.
 */
export interface AutoDiscoverSkillsOptions {
    /**
     * Whether to scan subdirectories recursively.
     * @default true
     */
    readonly recursive?: boolean | undefined;

    /**
     * Callback for errors during parsing (file-level).
     * Defaults to `console.error`.
     */
    readonly onError?: ((skillPath: string, error: unknown) => void) | undefined;

    /**
     * If true, throw on the first parsing error instead of skipping.
     * @default false
     */
    readonly strict?: boolean | undefined;
}

// ── Internal ─────────────────────────────────────────────

const SKILL_FILENAME = 'SKILL.md';

/**
 * Collect all auxiliary files in a skill directory (scripts/, references/, assets/, etc.)
 * Returns relative paths from the skill directory root.
 *
 * @internal
 */
async function collectSkillFiles(skillDir: string): Promise<string[]> {
    const files: string[] = [];

    async function walk(dir: string): Promise<void> {
        let entries: import('node:fs').Dirent[];
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        } catch {
            return;
        }

        for (const entry of entries) {
            const fullPath = join(dir, entry.name);

            if (entry.isDirectory()) {
                await walk(fullPath);
            } else if (entry.isFile() && entry.name !== SKILL_FILENAME) {
                files.push(relative(skillDir, fullPath).replace(/\\/g, '/'));
            }
        }
    }

    await walk(skillDir);
    return files;
}

/**
 * Find all SKILL.md files within a directory.
 *
 * Supports two layouts:
 * 1. `dir/skill-name/SKILL.md` (directory per skill)
 * 2. `dir/SKILL.md` (single skill in the root)
 *
 * @internal
 */
async function findSkillFiles(dir: string, recursive: boolean): Promise<{ skillPath: string; dirName: string }[]> {
    const results: { skillPath: string; dirName: string }[] = [];
    const absDir = resolve(dir);

    // Check root level
    const rootSkill = join(absDir, SKILL_FILENAME);
    try {
        const stat = await fs.stat(rootSkill);
        if (stat.isFile()) {
            results.push({ skillPath: absDir, dirName: basename(absDir) });
        }
    } catch {
        // No SKILL.md at root
    }

    // Scan subdirectories
    let entries: import('node:fs').Dirent[];
    try {
        entries = await fs.readdir(absDir, { withFileTypes: true });
    } catch {
        return results;
    }

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const subDir = join(absDir, entry.name);
        const skillFile = join(subDir, SKILL_FILENAME);

        try {
            const stat = await fs.stat(skillFile);
            if (stat.isFile()) {
                results.push({ skillPath: subDir, dirName: entry.name });
            } else if (recursive) {
                const nested = await findSkillFiles(subDir, true);
                results.push(...nested);
            }
        } catch {
            if (recursive) {
                const nested = await findSkillFiles(subDir, true);
                results.push(...nested);
            }
        }
    }

    return results;
}

// ── Public API ───────────────────────────────────────────

/**
 * Scan a directory and auto-register all discovered skills.
 *
 * @param registry - SkillRegistry to register discovered skills into
 * @param dir - Root directory to scan for SKILL.md files
 * @param options - Discovery options
 * @returns Array of discovered skill IDs
 *
 * @example
 * ```typescript
 * const skills = new SkillRegistry();
 * const ids = await autoDiscoverSkills(skills, './skills');
 * console.log(`Discovered ${ids.length} skills`);
 * ```
 */
export async function autoDiscoverSkills(
    registry: SkillRegistry,
    dir: string,
    options: AutoDiscoverSkillsOptions = {},
): Promise<string[]> {
    const recursive = options.recursive !== false;
    const onError = options.onError ?? defaultErrorHandler;
    const strict = options.strict === true;

    const skillDirs = await findSkillFiles(dir, recursive);
    const discovered: string[] = [];
    const parsed: Skill[] = [];
    const dirNames: string[] = [];

    for (const { skillPath, dirName } of skillDirs) {
        try {
            const content = await fs.readFile(join(skillPath, SKILL_FILENAME), 'utf-8');
            const files = await collectSkillFiles(skillPath);
            const skill = parseSkillMd(content, skillPath, files);
            parsed.push(skill);
            dirNames.push(dirName);
            discovered.push(skill.id);
        } catch (err) {
            if (strict) throw err;
            onError(skillPath, err);
        }
    }

    if (parsed.length > 0) {
        registry.registerAll(parsed, dirNames);
    }

    return discovered;
}

// ── Default Handlers ─────────────────────────────────────

function defaultErrorHandler(skillPath: string, error: unknown): void {
    const msg = error instanceof Error ? error.message : String(error);
    // Avoid leaking full server paths — show only the directory name
    const safePath = skillPath.split(/[\\/]/).pop() ?? skillPath;
    console.error(`[mcpfusion/skills] Failed to parse ${safePath}: ${msg}`);
}
