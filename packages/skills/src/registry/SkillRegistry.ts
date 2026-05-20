/**
 * SkillRegistry — Centralized Skill Storage & Retrieval
 *
 * The single place where all parsed skills are registered and where
 * incoming MCP tool calls (search, load, read_file) are routed.
 *
 * Modeled after MCP Fusion's ToolRegistry pattern.
 *
 * @module
 */

import { promises as fs } from 'node:fs';
import { join, extname, resolve, sep } from 'node:path';

import { type Skill, type SkillMetadata, type SkillSearchResult, type SkillFileContent } from '../domain/Skill.js';
import { type SkillSearchEngine, FullTextSearchEngine } from '../search/SkillSearchEngine.js';
import { validateSkill, formatValidationIssues, type ValidationResult } from '../parser/SkillValidator.js';

// ── MIME Helpers ─────────────────────────────────────────

const TEXT_EXTENSIONS = new Set([
    '.md', '.txt', '.yaml', '.yml', '.json', '.toml',
    '.js', '.ts', '.py', '.sh', '.bash', '.zsh',
    '.css', '.html', '.xml', '.svg', '.sql', '.csv',
    '.env', '.cfg', '.ini', '.conf', '.log',
    '.rs', '.go', '.java', '.rb', '.php', '.c', '.h',
    '.cpp', '.hpp', '.cs', '.swift', '.kt',
]);

const MIME_MAP: Record<string, string> = {
    '.md': 'text/markdown',
    '.txt': 'text/plain',
    '.yaml': 'text/yaml',
    '.yml': 'text/yaml',
    '.json': 'application/json',
    '.toml': 'application/toml',
    '.js': 'text/javascript',
    '.ts': 'text/typescript',
    '.py': 'text/x-python',
    '.sh': 'text/x-shellscript',
    '.html': 'text/html',
    '.xml': 'text/xml',
    '.svg': 'image/svg+xml',
    '.css': 'text/css',
    '.sql': 'text/x-sql',
    '.csv': 'text/csv',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
};

function isTextFile(filePath: string): boolean {
    return TEXT_EXTENSIONS.has(extname(filePath).toLowerCase());
}

function getMimeType(filePath: string): string {
    return MIME_MAP[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

// ── Options ──────────────────────────────────────────────

/**
 * Options for SkillRegistry behavior.
 */
export interface SkillRegistryOptions {
    /**
     * Validate skills against agentskills.io spec on registration.
     * @default true
     */
    readonly validate?: boolean | undefined;

    /**
     * Maximum search results to return.
     * @default 10
     */
    readonly searchLimit?: number | undefined;

    /**
     * Maximum file size (in bytes) for `readFile`.
     * Prevents OOM from serving very large files.
     * @default 10_485_760 (10 MB)
     */
    readonly maxFileSize?: number | undefined;

    /**
     * Custom search engine implementation.
     * Defaults to FullTextSearchEngine (MiniSearch).
     */
    readonly searchEngine?: SkillSearchEngine | undefined;

    /**
     * Callback for validation warnings/errors during registration.
     * Defaults to `console.warn`.
     */
    readonly onValidation?: ((skillId: string, result: ValidationResult) => void) | undefined;
}

// ── Registry ─────────────────────────────────────────────

/**
 * Centralized registry for Agent Skills.
 *
 * Manages skill registration, validation, indexing, search, and file serving.
 *
 * @example
 * ```typescript
 * const skills = new SkillRegistry();
 * skills.register(parsedSkill);
 * const results = skills.search('deploy kubernetes');
 * const full = skills.load('k8s-deploy');
 * ```
 */
export class SkillRegistry {
    private readonly _skills = new Map<string, Skill>();
    private readonly _searchEngine: SkillSearchEngine;
    private readonly _validate: boolean;
    private readonly _searchLimit: number;
    private readonly _maxFileSize: number;
    private readonly _onValidation: (skillId: string, result: ValidationResult) => void;

    public constructor(options: SkillRegistryOptions = {}) {
        this._searchEngine = options.searchEngine ?? new FullTextSearchEngine();
        this._validate = options.validate !== false;
        this._searchLimit = options.searchLimit ?? 10;
        this._maxFileSize = options.maxFileSize ?? 10_485_760; // 10 MB
        this._onValidation = options.onValidation ?? defaultValidationHandler;
    }

    /**
     * Register a single parsed skill.
     *
     * For bulk registration, prefer `registerAll()` which rebuilds the search
     * index once instead of after every insertion.
     *
     * @param skill - A fully parsed Skill object
     * @param dirName - Directory name for spec validation
     * @throws If skill ID is duplicate or validation fails
     */
    public register(skill: Skill, dirName?: string): void {
        if (this._skills.has(skill.id)) {
            throw new Error(`Skill "${skill.id}" is already registered`);
        }

        // Validate against spec
        if (this._validate) {
            const result = validateSkill(skill.frontmatter, dirName);
            if (result.issues.length > 0) {
                this._onValidation(skill.id, result);
            }
            if (!result.valid) {
                throw new Error(`Skill "${skill.id}" failed validation: ${result.issues.filter(i => i.severity === 'error').map(i => i.message).join('; ')}`);
            }
        }

        this._skills.set(skill.id, skill);
        this._rebuildIndex();
    }

    /**
     * Register multiple skills atomically.
     *
     * All skills are validated first. Only if ALL pass validation are they
     * added to the registry. Index is rebuilt once at the end.
     *
     * @throws If any skill fails validation — no skills are registered
     */
    public registerAll(skills: readonly Skill[], dirNames?: readonly string[]): void {
        // Phase 1: Validate ALL skills before committing any
        for (let i = 0; i < skills.length; i++) {
            const skill = skills[i]!;
            const dirName = dirNames?.[i];

            if (this._skills.has(skill.id)) {
                throw new Error(`Skill "${skill.id}" is already registered`);
            }

            // Check for duplicates within the batch itself
            for (let j = 0; j < i; j++) {
                if (skills[j]!.id === skill.id) {
                    throw new Error(`Skill "${skill.id}" appears multiple times in batch`);
                }
            }

            if (this._validate) {
                const result = validateSkill(skill.frontmatter, dirName);
                if (result.issues.length > 0) {
                    this._onValidation(skill.id, result);
                }
                if (!result.valid) {
                    throw new Error(`Skill "${skill.id}" failed validation: ${result.issues.filter(i => i.severity === 'error').map(i => i.message).join('; ')}`);
                }
            }
        }

        // Phase 2: Commit all (validation already passed)
        for (const skill of skills) {
            this._skills.set(skill.id, skill);
        }
        this._rebuildIndex();
    }

    /**
     * Search skills by natural language query.
     * Returns metadata only (progressive disclosure Layer 1).
     */
    public search(query: string, limit?: number): { skills: SkillSearchResult[]; total: number } {
        const results = this._searchEngine.search(query, limit ?? this._searchLimit);
        return { skills: results, total: this._skills.size };
    }

    /**
     * Load a skill's full instructions (progressive disclosure Layer 2).
     *
     * @param skillId - Skill identifier
     * @returns Full skill details or null if not found
     */
    public load(skillId: string): Skill | null {
        return this._skills.get(skillId) ?? null;
    }

    /**
     * Read a file inside a skill directory (progressive disclosure Layer 3).
     *
     * @param skillId - Skill identifier
     * @param filePath - Relative path inside the skill directory
     * @returns File content with encoding and MIME type
     */
    public async readFile(skillId: string, filePath: string): Promise<SkillFileContent> {
        // Validate non-empty inputs early
        if (!skillId) {
            throw new Error('skill_id is required');
        }
        if (!filePath) {
            throw new Error('file_path is required');
        }

        const skill = this._skills.get(skillId);
        if (!skill) {
            throw new Error(`Skill "${skillId}" not found`);
        }

        // Security: normalize and resolve to prevent path traversal
        const normalized = filePath.replace(/\\/g, '/');
        if (normalized.includes('..') || normalized.startsWith('/')) {
            throw new Error(`Invalid file path: "${filePath}" — path traversal not allowed`);
        }

        // Block direct SKILL.md access (case-insensitive) — use load_skill instead
        const baseName = normalized.split('/').pop() ?? '';
        if (baseName.toLowerCase() === 'skill.md') {
            throw new Error('Access SKILL.md content via skills.load instead of skills.read_file');
        }

        const fullPath = resolve(join(skill.path, normalized));
        const skillRoot = resolve(skill.path);

        // Double-check: resolved path MUST be inside the skill directory
        if (!fullPath.startsWith(skillRoot + sep) && fullPath !== skillRoot) {
            throw new Error(`Invalid file path: "${filePath}" — escapes skill directory`);
        }

        // Security: resolve the real path (follows symlinks) and verify it stays inside
        const realPath = await fs.realpath(fullPath);
        if (!realPath.startsWith(skillRoot + sep) && realPath !== skillRoot) {
            throw new Error(`Invalid file path: "${filePath}" — escapes skill directory`);
        }

        const stat = await fs.stat(realPath);

        if (!stat.isFile()) {
            throw new Error(`"${filePath}" is not a file`);
        }

        // Guard against serving oversized files (prevents OOM)
        if (stat.size > this._maxFileSize) {
            throw new Error(`File "${filePath}" exceeds maximum size limit (${Math.round(this._maxFileSize / 1024 / 1024)} MB)`);
        }

        const isText = isTextFile(realPath);

        if (isText) {
            const content = await fs.readFile(realPath, 'utf-8');
            return {
                content,
                path: normalized,
                size: stat.size,
                encoding: 'utf-8',
                mimeType: getMimeType(realPath),
            };
        }

        // Binary → base64
        const buffer = await fs.readFile(realPath);
        return {
            content: buffer.toString('base64'),
            path: normalized,
            size: stat.size,
            encoding: 'base64',
            mimeType: getMimeType(realPath),
        };
    }

    /** Check if a skill is registered. */
    public has(skillId: string): boolean {
        return this._skills.has(skillId);
    }

    /** Number of registered skills. */
    public get size(): number {
        return this._skills.size;
    }

    /** Get all registered skill metadata (for listing). */
    public listAll(): SkillMetadata[] {
        return this._searchEngine.listAll();
    }

    /** Remove all registered skills and clear the index. */
    public clear(): void {
        this._skills.clear();
        this._rebuildIndex();
    }

    // ── Internal ─────────────────────────────────────────

    private _rebuildIndex(): void {
        const metadata: SkillMetadata[] = [];
        for (const skill of this._skills.values()) {
            metadata.push({
                id: skill.id,
                name: skill.name,
                description: skill.description,
            });
        }
        this._searchEngine.index(metadata);
    }
}

// ── Default Handlers ─────────────────────────────────────

function defaultValidationHandler(skillId: string, result: ValidationResult): void {
    const lines = formatValidationIssues(skillId, result);
    for (const line of lines) {
        console.warn(`[mcpfusion/skills] ${line}`);
    }
}
