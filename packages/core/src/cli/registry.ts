/**
 * Registry resolution — load and resolve ToolRegistry from server entrypoint.
 * @module
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { PromptBuilderLike } from '../introspection/CapabilityLockfile.js';
import type { ToolBuilder } from '../core/types.js';

// ─── Types ───────────────────────────────────────────────────────

/** @internal exported for testing */
export interface RegistryLike {
    getBuilders(): Iterable<ToolBuilder<unknown>>;
}

/** @internal exported for testing */
export interface PromptRegistryLike {
    getBuilders?(): Iterable<PromptBuilderLike>;
}

// ─── Resolution ──────────────────────────────────────────────────

/**
 * Attempt to load and resolve a tool registry from a server entrypoint.
 *
 * Supports common export patterns:
 * - `export const registry = new ToolRegistry()`
 * - `export default { registry }`
 * - `export const fusion = initMCPFusion()`
 *
 * @internal exported for testing
 */
export async function resolveRegistry(serverPath: string): Promise<{ registry: RegistryLike; name: string; promptRegistry?: PromptRegistryLike }> {
    const absolutePath = resolve(serverPath);
    const fileUrl = pathToFileURL(absolutePath).href;

    // Register tsx loader so dynamic import() can handle .ts files
    if (absolutePath.endsWith('.ts')) {
        try {
            const { createRequire } = await import('node:module');
            const userRequire = createRequire(absolutePath);
            const tsxApiPath = userRequire.resolve('tsx/esm/api');
            const { register } = await import(pathToFileURL(tsxApiPath).href) as { register: () => void };
            register();
        } catch {
            // tsx not available — fall through
        }
    }

     
    const mod = await import(fileUrl);

    /** Extract prompt registry from a module-like object */
    function extractPrompts(obj: Record<string, unknown>): PromptRegistryLike | undefined {
        for (const key of ['promptRegistry', 'prompts', 'promptsRegistry']) {
            const candidate = obj[key];
            if (candidate != null && typeof candidate === 'object') {
                return candidate as PromptRegistryLike;
            }
        }
        return undefined;
    }

    // Strategy 1: Named `registry` export (ToolRegistry pattern)
    if (mod.registry != null && typeof mod.registry.getBuilders === 'function') {
        const pr = extractPrompts(mod as Record<string, unknown>);
        return {
            registry: mod.registry as RegistryLike,
            name: mod.serverName ?? 'mcpfusion-server',
            ...(pr ? { promptRegistry: pr } : {}),
        };
    }

    // Strategy 2: Named `@mcpfusion/core` export (initMCPFusion pattern)
    if (mod.mcpfusion != null && mod.mcpfusion.registry != null && typeof mod.mcpfusion.registry.getBuilders === 'function') {
        const pr = extractPrompts(mod.mcpfusion as Record<string, unknown>);
        return {
            registry: mod.mcpfusion.registry as RegistryLike,
            name: mod.mcpfusion.name ?? 'mcpfusion-server',
            ...(pr ? { promptRegistry: pr } : {}),
        };
    }

    // Strategy 3: Default export with registry
    if (mod.default != null) {
         
        const def = mod.default;
        if (def.registry != null && typeof def.registry.getBuilders === 'function') {
            const pr = extractPrompts(def as Record<string, unknown>);
            return {
                registry: def.registry as RegistryLike,
                name: (def.serverName as string | undefined) ?? 'mcpfusion-server',
                ...(pr ? { promptRegistry: pr } : {}),
            };
        }
        if (typeof def.getBuilders === 'function') {
            return { registry: def as RegistryLike, name: 'mcpfusion-server' };
        }
    }

    throw new Error(
        `Could not resolve a ToolRegistry from "${serverPath}".\n` +
        `Expected one of:\n` +
        `  export const registry = new ToolRegistry()  // named 'registry' with getBuilders()\n` +
        `  export const fusion = initMCPFusion()           // named 'fusion' with .registry\n` +
        `  export default { registry }                  // default export with .registry`,
    );
}
