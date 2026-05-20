/**
 * Tracing — OpenTelemetry-Compatible Tracing Abstraction
 *
 * Defines minimal interfaces that are structurally compatible with
 * OpenTelemetry's `Tracer` and `Span`, allowing direct pass-through
 * without adapter or `@opentelemetry/*` dependency.
 *
 * Design decisions:
 * - **Structural subtyping**: `MCPFusionTracer` is a subset of OTel's `Tracer`,
 *   so `trace.getTracer('mcpfusion')` can be passed directly.
 * - **Strict attribute types**: `MCPFusionAttributeValue` matches OTel's
 *   `SpanAttributeValue` to avoid TypeScript contravariance errors.
 * - **Optional `addEvent`**: Not all tracer implementations support events.
 *   The pipeline uses `span.addEvent?.()` (optional chaining).
 *
 * @example
 * ```typescript
 * import { trace } from '@opentelemetry/api';
 *
 * // Direct OTel pass-through — no adapter needed
 * registry.attachToServer(server, {
 *     contextFactory: createContext,
 *     tracing: trace.getTracer('mcpfusion'),
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Custom tracer (e.g. for testing)
 * const spans: Array<{ name: string; attributes: Map<string, MCPFusionAttributeValue> }> = [];
 *
 * const testTracer: MCPFusionTracer = {
 *     startSpan(name, options) {
 *         const attrs = new Map<string, MCPFusionAttributeValue>(
 *             Object.entries(options?.attributes ?? {}),
 *         );
 *         const span: MCPFusionSpan = {
 *             setAttribute(k, v) { attrs.set(k, v); },
 *             setStatus() {},
 *             addEvent() {},
 *             end() { spans.push({ name, attributes: attrs }); },
 *             recordException() {},
 *         };
 *         return span;
 *     },
 * };
 * ```
 *
 * @module
 */

// ============================================================================
// Constants
// ============================================================================

/**
 * Span status codes matching OpenTelemetry's `SpanStatusCode` enum.
 *
 * - `UNSET` (0) — Default. Used for validation errors (AI mistakes),
 *   unknown actions, and other non-system failures that should NOT
 *   trigger infrastructure alerts.
 * - `OK` (1) — Successful execution.
 * - `ERROR` (2) — System failure. Only used when the handler throws
 *   an unhandled exception. This WILL trigger alerts in OTel backends.
 *
 * @see {@link https://opentelemetry.io/docs/specs/otel/trace/api/#set-status | OTel Spec: Set Status}
 */
export const SpanStatusCode = { UNSET: 0, OK: 1, ERROR: 2 } as const;

// ============================================================================
// Types
// ============================================================================

/**
 * Strict attribute value type — matches OpenTelemetry's `SpanAttributeValue`.
 *
 * Using `unknown` here would cause TypeScript contravariance errors
 * when assigning an OTel `Tracer` to `MCPFusionTracer` in strict mode.
 *
 * @see {@link https://opentelemetry.io/docs/specs/otel/common/#attribute | OTel Spec: Attributes}
 */
export type MCPFusionAttributeValue =
    | string
    | number
    | boolean
    | ReadonlyArray<string>
    | ReadonlyArray<number>
    | ReadonlyArray<boolean>;

/**
 * Minimal span interface — structural subtype of OTel's `Span`.
 *
 * All methods match OTel's signatures so that an OTel `Span` satisfies
 * this interface without any adapter.
 *
 * @see {@link https://opentelemetry.io/docs/specs/otel/trace/api/#span | OTel Spec: Span}
 */
export interface MCPFusionSpan {
    /**
     * Set a single attribute on this span.
     * @param key - Attribute key (use `mcp.*` namespace for MCP Fusion attributes)
     * @param value - Primitive or array of primitives
     */
    setAttribute(key: string, value: MCPFusionAttributeValue): void;

    /**
     * Set the span's status.
     *
     * Use `SpanStatusCode.UNSET` for AI/validation errors.
     * Use `SpanStatusCode.ERROR` only for system failures (handler exceptions).
     *
     * @param status - Object with `code` and optional `message`
     */
    setStatus(status: { code: number; message?: string }): void;

    /**
     * Add a timestamped event to this span.
     *
     * Optional — not all tracer implementations support events.
     * The pipeline uses `span.addEvent?.()` (optional chaining).
     *
     * @param name - Event name (e.g. `'mcp.route'`, `'mcp.validate'`)
     * @param attributes - Optional event attributes
     */
    addEvent?(name: string, attributes?: Record<string, MCPFusionAttributeValue>): void;

    /**
     * End this span. Must be called exactly once.
     * The pipeline calls this in a `finally` block to prevent span leaks.
     */
    end(): void;

    /**
     * Record an exception as a span event.
     * Called before `setStatus(ERROR)` when a handler throws.
     *
     * @param exception - The caught error or string message
     */
    recordException(exception: Error | string): void;
}

/**
 * Minimal tracer interface — structural subtype of OTel's `Tracer`.
 *
 * OTel's `Tracer.startSpan()` accepts `(name, options?, context?)`.
 * Our interface matches the first two parameters, so an OTel `Tracer`
 * can be assigned to `MCPFusionTracer` without any adapter.
 *
 * **Context propagation limitation:** Since we don't use OTel's
 * `Context` API (which would require a runtime dependency),
 * auto-instrumented downstream calls (Prisma, HTTP client, Redis)
 * inside tool handlers will NOT appear as children of the MCP span.
 * They will be siblings in the trace. This is an intentional trade-off
 * for zero dependencies.
 *
 * @see {@link https://opentelemetry.io/docs/specs/otel/trace/api/#tracer | OTel Spec: Tracer}
 */
export interface MCPFusionTracer {
    /**
     * Create and start a new span.
     *
     * @param name - Span name (e.g. `'mcp.tool.projects'`)
     * @param options - Optional span creation options
     * @returns A started span that MUST be ended via `span.end()`
     */
    startSpan(name: string, options?: {
        attributes?: Record<string, MCPFusionAttributeValue>;
    }): MCPFusionSpan;
}
