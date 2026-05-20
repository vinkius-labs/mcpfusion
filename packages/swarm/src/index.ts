/**
 * @mcpfusion/swarm — Federated Handoff Protocol
 *
 * Multi-agent orchestration for MCP mcpfusion Servers.
 * Implements the SwarmGateway B2BUA pattern for secure, efficient
 * agent handoffs with zero-trust delegation and distributed tracing.
 *
 * @example Gateway setup
 * ```typescript
 * import { SwarmGateway } from '@mcpfusion/swarm';
 * import { f } from '@mcpfusion/core';
 *
 * const gateway = new SwarmGateway({
 *     registry: { finance: 'http://finance-agent:8081' },
 *     delegationSecret: process.env.MCPFUSION_DELEGATION_SECRET!,
 * });
 *
 * export const triage = f.tool('system.triage')
 *     .withEnum('domain', ['finance', 'devops'])
 *     .withString('context', 'What the user needs.')
 *     .handle(async (input) => f.handoff(`mcp://${input.domain}-agent`, {
 *         carryOverState: { intent: input.context },
 *         reason: `Triage → ${input.domain}`,
 *     }));
 * ```
 *
 * @example Upstream micro-server
 * ```typescript
 * import { requireGatewayClearance } from '@mcpfusion/core';
 *
 * export const refund = f.tool('finance.refund')
 *     .use(requireGatewayClearance(process.env.MCPFUSION_DELEGATION_SECRET!))
 *     .withString('invoiceId', 'Invoice ID')
 *     .handle(async (input, ctx) => success(await stripe.refund(input.invoiceId)));
 * ```
 *
 * @module
 */

// ── Gateway ──────────────────────────────────────────────
export { SwarmGateway } from './SwarmGateway.js';
export type { SwarmGatewayConfig } from './SwarmGateway.js';

// ── Client (upstream connection) ─────────────────────────
export { UpstreamMcpClient } from './UpstreamMcpClient.js';
export type { UpstreamMcpClientConfig, ProgressForwarder, ProgressNotification } from './UpstreamMcpClient.js';

// ── Utilities ────────────────────────────────────────────
export { NamespaceRewriter, NamespaceError } from './NamespaceRewriter.js';
export { injectReturnTripTool, formatSafeReturn } from './ReturnTripInjector.js';

// ── FHP primitives (re-exported from @mcpfusion/core) ────────
// Provided here for convenience — teams importing from @mcpfusion/swarm
// get the full FHP API surface without a separate @mcpfusion/core import.
// The canonical source is always @mcpfusion/core.
export {
    handoff, isHandoffResponse,
    mintDelegationToken, verifyDelegationToken, HandoffAuthError,
    InMemoryHandoffStateStore,
    requireGatewayClearance,
} from '@mcpfusion/core';
export type {
    HandoffPayload, HandoffResponse, HandoffStateStore,
    DelegationClaims,
    GatewayClearanceContext,
} from '@mcpfusion/core';
