/**
 * Observability — Barrel Export
 *
 * Public API for debug observers and OpenTelemetry-compatible tracing.
 */

// ── Debug Observer ───────────────────────────────────────
export { createDebugObserver } from './DebugObserver.js';
export type {
    DebugEvent, DebugObserverFn,
    RouteEvent, ValidateEvent, MiddlewareEvent, ExecuteEvent, ErrorEvent,
    GovernanceEvent, GovernanceOperation,
} from './DebugObserver.js';

// ── Tracing (OpenTelemetry-compatible) ───────────────────
export {
    SpanStatusCode,
    W3CFlagSampled,
    newTraceId,
    newSpanId,
    generateTraceparent,
    parseTraceparent,
    parseTracestate,
    parseBaggage,
    extractW3CContext,
    readMcpTraceContext,
} from './Tracing.js';
export type {
    MCPFusionSpan, MCPFusionTracer, MCPFusionAttributeValue,
    MCPFusionSpanContext, W3CContextInput,
} from './Tracing.js';

// ── Telemetry (Shadow Socket Out-of-Band Transport) ──────
export { createTelemetryBus, getTelemetryPath, discoverSockets } from './TelemetryBus.js';
export type { TelemetryBusConfig, TelemetryBusInstance } from './TelemetryBus.js';
export type {
    TelemetryEvent, TelemetrySink,
    DlpRedactEvent, PresenterSliceEvent, PresenterRulesEvent,
    SandboxExecEvent, FsmTransitionEvent,
    TopologyEvent, TopologyTool, HeartbeatEvent,
} from './TelemetryEvent.js';
