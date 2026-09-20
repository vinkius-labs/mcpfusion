/**
 * Tracing — OpenTelemetry-Compatible Tracing Abstraction
 *
 * Defines minimal interfaces that are structurally compatible with
 * OpenTelemetry's `Tracer` and `Span`, allowing direct pass-through
 * without adapter or `@opentelemetry/*` dependency.
 *
 * Design decisions:
 * - **OTel-shaped, host-adapted**: `MCPFusionTracer` mirrors OTel's `Tracer`
 *   signature so a host can wrap a real OTel tracer in a thin adapter. A raw
 *   OTel `Tracer` is NOT assignable to it directly (see the note on
 *   {@link MCPFusionTracer}); that boundary is what keeps this package free of
 *   any `@opentelemetry/*` dependency.
 * - **Strict, immutable attribute types**: `MCPFusionAttributeValue` uses
 *   immutable arrays (`ReadonlyArray<...>`) — safer for this pipeline than
 *   OTel's mutable, nullable `SpanAttributeValue`, and one reason the host
 *   adapter casts at the OTel boundary.
 * - **Optional `addEvent`**: Not all tracer implementations support events.
 *   The pipeline uses `span.addEvent?.()` (optional chaining).
 *
 * @example
 * ```typescript
 * import { trace, type SpanOptions, type Context } from '@opentelemetry/api';
 *
 * // Wrap a real OTel tracer. OTel's `Tracer` is NOT assignable to
 * // `MCPFusionTracer` directly (attribute-array variance, plus the OTel
 * // `Context` vs `MCPFusionSpanContext` split), so the adapter maps both —
 * // and forwards `context.raw` verbatim when the host already holds an OTel
 * // `Context` (e.g. one stashed during W3C extraction).
 * const otel = trace.getTracer('mcpfusion');
 * registry.attachToServer(server, {
 *     contextFactory: createContext,
 *     tracing: {
 *         startSpan: (name, options, context) =>
 *             otel.startSpan(name, options as SpanOptions, context?.raw as Context | undefined),
 *     },
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
 * A parent span context carried across a process boundary.
 *
 * Framework-defined and zero-dependency. The host builds one from an incoming
 * W3C `traceparent` / `tracestate` / `baggage` pair (HTTP headers, or MCP
 * `_meta`) via {@link extractW3CContext} and passes it to
 * {@link MCPFusionTracer.startSpan} as the third argument so the MCP tool
 * span parents to the caller's trace instead of minting a new root.
 *
 * The value is **structurally opaque**: the framework never inspects it — it
 * only forwards it to the supplied tracer. A real OpenTelemetry tracer is
 * wrapped by the host, which maps `traceId` / `spanId` / `raw` onto OTel's
 * `SpanContext` + `Context`. This keeps `@mcpfusion/core` free of any
 * `@opentelemetry/*` dependency while remaining interop-compatible.
 *
 * @see {@link MCPFusionTracer.startSpan}
 * @see {@link extractW3CContext}
 */
export interface MCPFusionSpanContext {
    /** W3C trace ID — 32 lowercase hex characters (16 bytes). */
    readonly traceId: string;
    /** W3C span ID — 16 lowercase hex characters (8 bytes). */
    readonly spanId: string;
    /** W3C trace-flags byte; `0x01` = sampled. `undefined` when unknown. */
    readonly flags?: number;
    /** `true` when extracted from another process (remote parent). */
    readonly remote?: boolean;
    /** Raw W3C `tracestate` list (vendor key/value pairs), if present. */
    readonly traceState?: string;
    /** Raw W3C `baggage` list, if present. */
    readonly baggage?: string;
    /**
     * Opaque host tracer context (e.g. an OTel `Context`). Forwarded verbatim
     * to `startSpan`'s third argument; the framework does not read it.
     */
    readonly raw?: unknown;
}

/**
 * Minimal tracer interface — OTel-shaped, host-adapted.
 *
 * The signature mirrors OTel's `Tracer.startSpan(name, options?, context?)` so a
 * host can wrap a real OTel tracer in a thin adapter. A raw OTel `Tracer` is NOT
 * assignable to this interface directly: OTel's `SpanAttributes` uses mutable,
 * nullable arrays while this package's {@link MCPFusionAttributeValue} uses
 * immutable ones, and OTel's `context` is an OTel `Context`, not a
 * {@link MCPFusionSpanContext}. Hosts wrap, they don't assign — that is what
 * keeps `@mcpfusion/core` free of any `@opentelemetry/*` dependency.
 *
 * **Remote-parent propagation:** The optional `context` argument carries an
 * extracted W3C {@link MCPFusionSpanContext} so the tool span can parent to
 * the caller's trace (distributed correlation). When omitted, the span is a
 * fresh root.
 *
 * **Context propagation limitation:** Since we don't use OTel's `Context`
 * API (which would require a runtime dependency), auto-instrumented
 * *downstream* calls (Prisma, HTTP client, Redis) inside tool handlers will
 * NOT appear as children of the MCP span — they will be siblings. This is an
 * intentional trade-off for zero dependencies; the *incoming* parent is still
 * honored via the `context` argument.
 *
 * @see {@link https://opentelemetry.io/docs/specs/otel/trace/api/#tracer | OTel Spec: Tracer}
 */
export interface MCPFusionTracer {
    /**
     * Create and start a new span.
     *
     * @param name - Span name (e.g. `'mcp.tool.projects'`)
     * @param options - Optional span creation options
     * @param context - Optional parent {@link MCPFusionSpanContext}
     *   (e.g. an extracted W3C remote parent). Omit to start a new root.
     * @returns A started span that MUST be ended via `span.end()`
     */
    startSpan(name: string, options?: {
        attributes?: Record<string, MCPFusionAttributeValue>;
    }, context?: MCPFusionSpanContext): MCPFusionSpan;
}

// ============================================================================
// W3C Trace Context — helpers (zero-dependency)
// ============================================================================

/** W3C trace-flags byte value for "sampled". */
export const W3CFlagSampled = 0x01;

/** Lowercase-hex pattern for a 16-byte (32-char) W3C trace ID. */
const TRACE_ID_RE = /^[0-9a-f]{32}$/;
/** Lowercase-hex pattern for an 8-byte (16-char) W3C span ID. */
const SPAN_ID_RE = /^[0-9a-f]{16}$/;
/** W3C `tracestate` hard limit in characters. */
const TRACESTATE_MAX = 512;
/** W3C `baggage` hard limit in bytes. */
const BAGGAGE_MAX = 8192;

function isNonZeroHex(id: string): boolean {
    // Reject the "all zeros" sentinel — a zero trace/span ID is invalid in W3C.
    return !/^0+$/.test(id);
}

/**
 * Mint a fresh W3C trace ID (32 lowercase hex, non-zero).
 * Uses `crypto.randomUUID()` — no external dependencies.
 */
export function newTraceId(): string {
    return globalThis.crypto.randomUUID().replace(/-/g, '');
}

/**
 * Mint a fresh W3C span ID (16 lowercase hex, non-zero).
 * Uses `crypto.randomUUID()` — no external dependencies.
 */
export function newSpanId(): string {
    return globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

/**
 * Generate a W3C Trace Context `traceparent` header value.
 *
 * Format: `00-{32 hex trace-id}-{16 hex span-id}-{00|01}`.
 * The trailing byte is `01` when `sampled` is `true`, `00` otherwise.
 */
export function generateTraceparent(sampled = true): string {
    return `00-${newTraceId()}-${newSpanId()}-${sampled ? '01' : '00'}`;
}

/**
 * Parse and validate a W3C `traceparent` header value.
 *
 * Strict conformance: the version byte must be `00`, the trace ID must be 32
 * non-zero lowercase hex, the span ID must be 16 non-zero lowercase hex, and
 * the flags byte must be two hex digits. Any deviation returns `undefined`
 * (a malformed value is treated as "no trace context", never a fabricated
 * parent).
 *
 * @param value - The raw `traceparent` string, or `undefined`
 * @returns The parsed `{ traceId, spanId, flags }`, or `undefined`
 */
export function parseTraceparent(
    value: string | undefined,
): Pick<MCPFusionSpanContext, 'traceId' | 'spanId' | 'flags'> | undefined {
    if (typeof value !== 'string') return undefined;
    const parts = value.trim().split('-');
    // Exactly `version-traceid-spanid-flags`.
    if (parts.length !== 4) return undefined;
    // `parts` is `string[]`; under `noUncheckedIndexedAccess` a plain destructure
    // yields `string | undefined`. We just proved the length is 4, so cast to a
    // fixed tuple and each element is a guaranteed `string`.
    const [version, traceId, spanId, flagsRaw] = parts as [string, string, string, string];
    if (version !== '00') return undefined;
    if (!TRACE_ID_RE.test(traceId) || !isNonZeroHex(traceId)) return undefined;
    if (!SPAN_ID_RE.test(spanId) || !isNonZeroHex(spanId)) return undefined;
    if (!/^[0-9a-f]{2}$/.test(flagsRaw)) return undefined;
    return {
        traceId,
        spanId,
        flags: parseInt(flagsRaw, 16),
    };
}

/**
 * Normalize a W3C `tracestate` list for pass-through.
 *
 * The framework does not interpret vendor keys — it carries the list
 * verbatim so downstream tracers can. Returns `undefined` when the value is
 * empty or exceeds the 512-char W3C limit.
 */
export function parseTracestate(value: string | undefined): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (trimmed.length === 0) return undefined;
    if (trimmed.length > TRACESTATE_MAX) return undefined;
    return trimmed;
}

/**
 * Normalize a W3C `baggage` list for pass-through.
 *
 * Enforces the 8192-byte W3C limit; values over the cap are dropped rather
 * than propagated (an oversized baggage list is non-conformant).
 */
export function parseBaggage(value: string | undefined): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (trimmed.length === 0) return undefined;
    if (new TextEncoder().encode(trimmed).length > BAGGAGE_MAX) return undefined;
    return trimmed;
}

/**
 * W3C context input — a headers-like or MCP-`_meta`-like object carrying the
 * Trace Context and Baggage keys. Case-insensitive lookups are the host's
 * responsibility; this helper reads the conventional lowercase keys.
 */
export interface W3CContextInput {
    readonly traceparent?: string;
    readonly tracestate?: string;
    readonly baggage?: string;
}

/**
 * Extract a {@link MCPFusionSpanContext} from an incoming W3C context
 * (HTTP headers, or MCP `params._meta`).
 *
 * This is the single entry point a host uses to correlate an MCP tool span
 * into the *caller's* distributed trace. A valid `traceparent` is required
 * for a parent to be returned; `tracestate` and `baggage` are attached when
 * present. When `traceparent` is absent or malformed, the result is
 * `undefined` — callers must treat that as "no trace context received"
 * (never fabricate a parent).
 *
 * @param input - An object with optional `traceparent`/`tracestate`/`baggage`
 * @returns The extracted remote context, or `undefined`
 *
 * @example
 * ```typescript
 * // In an MCP server's per-request contextFactory:
 * const ctx = {
 *     ...baseContext,
 *     mcpTraceContext: extractW3CContext(request.headers),
 * };
 * ```
 */
export function extractW3CContext(input: W3CContextInput | undefined): MCPFusionSpanContext | undefined {
    if (!input) return undefined;
    const parsed = parseTraceparent(input.traceparent);
    if (!parsed) return undefined;
    const traceState = parseTracestate(input.tracestate);
    const baggage = parseBaggage(input.baggage);
    return {
        ...parsed,
        remote: true,
        ...(traceState !== undefined ? { traceState } : {}),
        ...(baggage !== undefined ? { baggage } : {}),
    };
}

/**
 * Read the conventional per-request parent span context (`mcpTraceContext`)
 * from a context object, tolerating the missing-context guard proxy that
 * `attachToServer()` substitutes when no `contextFactory` is provided.
 *
 * That proxy throws on ANY property access; on a real context, reading the
 * optional `mcpTraceContext` key is harmless. We catch the guard's throw and
 * return `undefined` ("no parent context → the span is a fresh root") instead
 * of propagating it, so enabling tracing alone never forces a
 * `contextFactory` to exist.
 *
 * @param ctx - The per-request context (or `null`/`undefined` / the guard proxy)
 * @returns The extracted parent context, or `undefined`
 */
export function readMcpTraceContext(ctx: unknown): MCPFusionSpanContext | undefined {
    if (ctx == null || typeof ctx !== 'object') return undefined;
    try {
        return (ctx as { mcpTraceContext?: MCPFusionSpanContext }).mcpTraceContext;
    } catch {
        // The missing-context guard proxy (ServerAttachment._missingContextProxy)
        // throws on any `get`. Absence of a trace context is not an error.
        return undefined;
    }
}
