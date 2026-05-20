/**
 * PostProcessor — MVA Response Post-Processing
 *
 * Extracted from the ExecutionPipeline to uphold SRP.
 * Transforms raw handler return values into valid MCP ToolResponse
 * objects according to the MVA priority hierarchy.
 *
 * @internal
 * @module
 */
import { type ToolResponse, success as successResponse, TOOL_RESPONSE_BRAND, isHandoffResponse } from '../core/response.js';
import { isResponseBuilder, type ResponseBuilder } from './ResponseBuilder.js';
import { type Presenter } from './Presenter.js';
import { type TelemetrySink } from '../observability/TelemetryEvent.js';
import { emitPresenterTelemetry } from './TelemetryCollector.js';

// ── Telemetry Context ────────────────────────────────────

/**
 * Optional telemetry context for Presenter event emission.
 * Keeps the fast path (no telemetry) at zero overhead.
 * @internal
 */
export interface PostProcessTelemetry {
    readonly sink: TelemetrySink;
    readonly tool: string;
    readonly action: string;
}

/**
 * Post-process a handler's return value through the MVA priority hierarchy.
 *
 * Priority:
 * 0. **HandoffResponse** → pass-through untouched (FHP tunnel activation)
 * 1. **ToolResponse** → use directly (backward compatibility)
 * 2. **ResponseBuilder** → call `.build()` (auto-build)
 * 3. **Raw data + async Presenter** → pipe through `Presenter.makeAsync()` (PromptFirewall, async UI blocks)
 * 4. **Raw data + sync Presenter** → pipe through `Presenter.make(data).build()`
 * 5. **Raw data without Presenter** → wrap via canonical `success()` helper
 *
 * @param result - The handler's return value
 * @param presenter - The action's Presenter (from `returns` field), if any
 * @param ctx - Optional request context
 * @param selectFields - Optional `_select` field names for context window optimization
 * @param telemetry - Optional telemetry context for Presenter events
 * @returns A valid MCP ToolResponse
 *
 * @internal
 */
export async function postProcessResult(
    result: unknown,
    presenter: Presenter<unknown> | undefined,
    ctx?: unknown,
    selectFields?: string[],
    telemetry?: PostProcessTelemetry,
): Promise<ToolResponse> {
    // Priority 0: HandoffResponse → pass-through untouched.
    // HandoffResponse carries the TOOL_RESPONSE_BRAND but lacks a `content`
    // array. Must be intercepted before isToolResponse() to prevent
    // downstream content-block access from crashing.
    if (isHandoffResponse(result)) {
        return result as unknown as ToolResponse;
    }

    // Priority 1: Already a ToolResponse (has content array)
    if (isToolResponse(result)) {
        return result;
    }

    // Priority 2: ResponseBuilder instance → auto-call .build()
    if (isResponseBuilder(result)) {
        return (result as ResponseBuilder).build();
    }

    // Priority 3/4: Raw data + Presenter → pipe through MVA
    if (presenter) {
        // Pre-serialize for telemetry (skip if no sink)
        const rawJson = telemetry ? JSON.stringify(result) : '';
        const rawRows = Array.isArray(result) ? result.length : 1;

        // Async-aware Presenter dispatch: Presenters with async callbacks
        // (asyncUiBlocks, asyncRules, asyncSuggestActions, PromptFirewall)
        // require `makeAsync()` to execute the full enrichment pipeline.
        // Sync Presenters use `make()` for zero-overhead passthrough.
        const response = presenter.hasAsyncCallbacks()
            ? (await presenter.makeAsync(result, ctx, selectFields)).build()
            : presenter.make(result, ctx, selectFields).build();

        // Delegate all telemetry emission to TelemetryCollector
        if (telemetry) {
            emitPresenterTelemetry({
                sink: telemetry.sink,
                tool: telemetry.tool,
                action: telemetry.action,
                response,
                presenter,
                rawJson,
                rawRows,
                selectFields,
            });
        }

        return response;
    }

    // Priority 5: Raw data without Presenter → canonical success() helper
    return successResponse(
        typeof result === 'string' || typeof result === 'object'
            ? (result as string | object)
            : String(result),
    );
}

// ── Type Guard ───────────────────────────────────────────

/**
 * Check if a value is a valid MCP ToolResponse.
 *
 * Uses the `TOOL_RESPONSE_BRAND` symbol stamped by all framework
 * response helpers (`success()`, `error()`, `toolError()`, etc.).
 *
 * The previous shape-based heuristic (`content` array + `type` field)
 * was removed because domain objects that coincidentally match the
 * ToolResponse shape would be detected as ToolResponses and passed
 * through, bypassing Presenter processing — a silent data loss bug.
 *
 * This aligns with the brand-based detection already established in
 * `BuildPipeline.ts` (FluentToolBuilder's `wrappedHandler`).
 *
 * @internal
 */
export function isToolResponse(value: unknown): value is ToolResponse {
    return (
        typeof value === 'object' &&
        value !== null &&
        TOOL_RESPONSE_BRAND in value
    );
}
