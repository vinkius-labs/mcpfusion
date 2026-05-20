/**
 * @mcpfusion/api-key — API Key Validation for MCP Servers
 *
 * Timing-safe API key validation with SHA-256 hashing,
 * async validators, and MCP Fusion middleware integration.
 * Zero external dependencies — uses native Node.js crypto.
 *
 * @example
 * ```ts
 * import { ApiKeyManager, requireApiKey, createApiKeyTool } from '@mcpfusion/api-key';
 *
 * // Middleware
 * const projects = createTool('projects')
 *     .use(requireApiKey({ keys: ['sk_live_abc123'] }))
 *     .action({ name: 'list', handler: async () => success([]) });
 *
 * // Standalone
 * const manager = new ApiKeyManager({ keys: ['sk_live_abc123'] });
 * const result = await manager.validate('sk_live_abc123');
 * ```
 *
 * @module @mcpfusion/api-key
 * @author Vinkius Labs
 * @license Apache-2.0
 */

export { ApiKeyManager } from './ApiKeyManager.js';
export type {
    ApiKeyManagerConfig,
    ApiKeyValidationResult,
} from './ApiKeyManager.js';

export { createApiKeyTool } from './createApiKeyTool.js';
export type { ApiKeyToolConfig } from './createApiKeyTool.js';

export { requireApiKey } from './middleware.js';
export type { RequireApiKeyOptions } from './middleware.js';
