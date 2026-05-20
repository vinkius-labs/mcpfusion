/** Client Bounded Context — Barrel Export */
export { createMCPFusionClient, MCPFusionClientError } from './MCPFusionClient.js';
export type {
    MCPFusionClient,
    MCPFusionTransport,
    RouterMap,
    FluentProxy,
    ClientMiddleware,
    MCPFusionClientOptions,
} from './MCPFusionClient.js';
export { createTypedRegistry } from './createTypedRegistry.js';
export type { InferRouter, TypedToolRegistry } from './InferRouter.js';
