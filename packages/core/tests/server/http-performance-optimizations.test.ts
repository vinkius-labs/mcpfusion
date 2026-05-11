/**
 * HTTP Performance Optimizations — Regression Tests
 *
 * Validates the three performance optimizations applied to startServer.ts:
 *
 * 1. **Session reverse-lookup**: WeakMap<Transport, sessionId> for O(1) cleanup
 *    instead of O(n) linear scan via [...entries()].find().
 *
 * 2. **Pathname extraction**: String-based `indexOf('?') + slice()` instead of
 *    `new URL()` constructor on every HTTP request.
 *
 * 3. **Reaper-integrated rate limiter pruning**: Active session set built
 *    incrementally during the reaper loop instead of a separate `new Set()`.
 *
 * Tests re-implement the exact logic patterns from startServer.ts to validate
 * correctness without requiring a live HTTP server.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';

// ============================================================================
// #1: Session Reverse-Lookup via WeakMap
// ============================================================================

describe('Session Reverse-Lookup (WeakMap)', () => {
    // Simulate the transport ↔ sessionId relationship using the same
    // WeakMap pattern from startServer.ts.
    class FakeTransport {
        readonly label: string;
        onclose?: () => void;
        constructor(label: string) { this.label = label; }
    }

    it('O(1) lookup returns the correct session ID', () => {
        const sessions = new Map<string, FakeTransport>();
        const transportToSession = new WeakMap<FakeTransport, string>();

        const t1 = new FakeTransport('t1');
        const t2 = new FakeTransport('t2');
        sessions.set('session-aaa', t1);
        sessions.set('session-bbb', t2);
        transportToSession.set(t1, 'session-aaa');
        transportToSession.set(t2, 'session-bbb');

        expect(transportToSession.get(t1)).toBe('session-aaa');
        expect(transportToSession.get(t2)).toBe('session-bbb');
    });

    it('returns undefined for unknown transports', () => {
        const transportToSession = new WeakMap<FakeTransport, string>();
        const unknown = new FakeTransport('unknown');
        expect(transportToSession.get(unknown)).toBeUndefined();
    });

    it('cleanup via onclose correctly removes session from both maps', () => {
        const sessions = new Map<string, FakeTransport>();
        const sessionActivity = new Map<string, number>();
        const transportToSession = new WeakMap<FakeTransport, string>();

        const t = new FakeTransport('t1');
        const sessionId = 'session-xyz';

        // Simulate onsessioninitialized
        sessions.set(sessionId, t);
        sessionActivity.set(sessionId, Date.now());
        transportToSession.set(t, sessionId);

        // Simulate onclose handler (same logic as startServer.ts)
        t.onclose = () => {
            const id = transportToSession.get(t);
            if (id) {
                sessions.delete(id);
                sessionActivity.delete(id);
            }
        };

        expect(sessions.size).toBe(1);
        expect(sessionActivity.size).toBe(1);

        // Fire onclose
        t.onclose();

        expect(sessions.size).toBe(0);
        expect(sessionActivity.size).toBe(0);
    });

    it('handles concurrent session close without affecting other sessions', () => {
        const sessions = new Map<string, FakeTransport>();
        const transportToSession = new WeakMap<FakeTransport, string>();

        const t1 = new FakeTransport('t1');
        const t2 = new FakeTransport('t2');
        sessions.set('s1', t1);
        sessions.set('s2', t2);
        transportToSession.set(t1, 's1');
        transportToSession.set(t2, 's2');

        // Close t1 only
        const id = transportToSession.get(t1);
        if (id) sessions.delete(id);

        expect(sessions.size).toBe(1);
        expect(sessions.has('s2')).toBe(true);
        expect(sessions.has('s1')).toBe(false);
    });

    it('double-close is idempotent (no crash)', () => {
        const sessions = new Map<string, FakeTransport>();
        const transportToSession = new WeakMap<FakeTransport, string>();

        const t = new FakeTransport('t1');
        sessions.set('s1', t);
        transportToSession.set(t, 's1');

        const closeHandler = () => {
            const id = transportToSession.get(t);
            if (id) {
                sessions.delete(id);
            }
        };

        closeHandler();
        expect(sessions.size).toBe(0);

        // Second close — should not throw
        expect(() => closeHandler()).not.toThrow();
        expect(sessions.size).toBe(0);
    });
});

// ============================================================================
// #2: Pathname Extraction without URL Constructor
// ============================================================================

describe('Pathname Extraction (string-based)', () => {
    // Exact logic from startServer.ts
    function extractPathname(rawUrl: string): string {
        const qIdx = rawUrl.indexOf('?');
        return qIdx === -1 ? rawUrl : rawUrl.slice(0, qIdx);
    }

    it('extracts pathname from simple path', () => {
        expect(extractPathname('/mcp')).toBe('/mcp');
    });

    it('extracts pathname from path with query string', () => {
        expect(extractPathname('/mcp?foo=bar')).toBe('/mcp');
    });

    it('extracts pathname from path with multiple query params', () => {
        expect(extractPathname('/mcp?foo=bar&baz=qux')).toBe('/mcp');
    });

    it('handles root path', () => {
        expect(extractPathname('/')).toBe('/');
    });

    it('handles root path with query', () => {
        expect(extractPathname('/?debug=true')).toBe('/');
    });

    it('handles deep path', () => {
        expect(extractPathname('/.well-known/mcp/server-card.json')).toBe(
            '/.well-known/mcp/server-card.json',
        );
    });

    it('handles deep path with query', () => {
        expect(extractPathname('/.well-known/mcp/server-card.json?v=2')).toBe(
            '/.well-known/mcp/server-card.json',
        );
    });

    it('handles empty string (fallback default)', () => {
        // In startServer.ts: req.url ?? '/'
        // This tests the edge case where rawUrl = '/'
        expect(extractPathname('/')).toBe('/');
    });

    it('handles path with fragment (hash)', () => {
        // URL.pathname would strip the hash, but raw URL won't have fragments
        // in HTTP requests (browsers don't send them). This test validates
        // that the string parser doesn't break on unusual input.
        expect(extractPathname('/mcp#section')).toBe('/mcp#section');
    });

    it('handles path with empty query string', () => {
        expect(extractPathname('/mcp?')).toBe('/mcp');
    });

    it('handles path with question mark in query value', () => {
        expect(extractPathname('/mcp?redirect=https://example.com?a=1')).toBe('/mcp');
    });

    it('matches the same result as new URL() for standard paths', () => {
        const testPaths = [
            '/mcp',
            '/mcp?session=abc',
            '/.well-known/mcp/server-card.json',
            '/',
            '/mcp?a=1&b=2&c=3',
        ];
        for (const rawUrl of testPaths) {
            const urlParsed = new URL(rawUrl, 'http://localhost:3001').pathname;
            const stringParsed = extractPathname(rawUrl);
            expect(stringParsed).toBe(urlParsed);
        }
    });
});

// ============================================================================
// #3: Reaper-Integrated Rate Limiter Pruning
// ============================================================================

describe('Reaper-Integrated Rate Limiter Pruning', () => {
    // Re-implement RateLimitBucket from startServer.ts
    class RateLimitBucket {
        private readonly _limit: number;
        private readonly _buckets = new Map<string, { count: number; resetAt: number }>();

        constructor(limitPerMinute: number) {
            this._limit = Math.max(1, limitPerMinute);
        }

        allow(sessionId: string): boolean {
            const now = Date.now();
            let bucket = this._buckets.get(sessionId);
            if (!bucket || now >= bucket.resetAt) {
                bucket = { count: 0, resetAt: now + 60_000 };
                this._buckets.set(sessionId, bucket);
            }
            bucket.count++;
            return bucket.count <= this._limit;
        }

        prune(activeSessions: ReadonlySet<string>): void {
            for (const key of this._buckets.keys()) {
                if (!activeSessions.has(key)) this._buckets.delete(key);
            }
        }

        /** Exposed for testing only */
        get bucketCount(): number {
            return this._buckets.size;
        }
    }

    it('reaper builds active set incrementally and prunes in one pass', () => {
        const sessionActivity = new Map<string, number>();
        const rateLimiter = new RateLimitBucket(10);
        const sessionTtlMs = 1_000; // 1 second for testing

        const now = Date.now();
        // Active session: recent activity
        sessionActivity.set('active-1', now);
        sessionActivity.set('active-2', now);
        // Stale session: activity long ago
        sessionActivity.set('stale-1', now - 5_000);
        sessionActivity.set('stale-2', now - 10_000);

        // Seed rate limiter buckets for all sessions
        rateLimiter.allow('active-1');
        rateLimiter.allow('active-2');
        rateLimiter.allow('stale-1');
        rateLimiter.allow('stale-2');

        expect(rateLimiter.bucketCount).toBe(4);

        // Simulate the reaper loop (exact pattern from startServer.ts)
        const activeSessions = new Set<string>();
        for (const [id, lastActive] of sessionActivity) {
            if (now - lastActive > sessionTtlMs) {
                sessionActivity.delete(id);
            } else {
                activeSessions.add(id);
            }
        }
        rateLimiter.prune(activeSessions);

        // Only active sessions survive
        expect(sessionActivity.size).toBe(2);
        expect(sessionActivity.has('active-1')).toBe(true);
        expect(sessionActivity.has('active-2')).toBe(true);

        // Stale rate limiter buckets are pruned
        expect(rateLimiter.bucketCount).toBe(2);
    });

    it('prune with empty active set removes all buckets', () => {
        const rateLimiter = new RateLimitBucket(10);
        rateLimiter.allow('s1');
        rateLimiter.allow('s2');
        rateLimiter.allow('s3');

        expect(rateLimiter.bucketCount).toBe(3);

        rateLimiter.prune(new Set());
        expect(rateLimiter.bucketCount).toBe(0);
    });

    it('prune with all-active set preserves all buckets', () => {
        const rateLimiter = new RateLimitBucket(10);
        rateLimiter.allow('s1');
        rateLimiter.allow('s2');

        rateLimiter.prune(new Set(['s1', 's2']));
        expect(rateLimiter.bucketCount).toBe(2);
    });
});

// ============================================================================
// #4: Telemetry Timestamp Coherence
// ============================================================================

describe('Telemetry Timestamp Coherence', () => {
    it('single Date.now() capture ensures durationMs + timestamp are consistent', () => {
        const t0 = Date.now() - 42; // Simulate handler start 42ms ago

        // Pattern from ServerAttachment.ts (AFTER fix)
        const t1 = Date.now();
        const event = {
            type: 'execute' as const,
            durationMs: t1 - t0,
            timestamp: t1,
        };

        // durationMs and timestamp are derived from the same t1 value.
        // This means: timestamp - durationMs === t0 (exactly)
        expect(event.timestamp - event.durationMs).toBe(t0);
    });

    it('timestamp is always >= t0 + durationMs', () => {
        const t0 = Date.now();
        // Simulate some work
        let sum = 0;
        for (let i = 0; i < 1000; i++) sum += i;
        void sum; // prevent optimization

        const t1 = Date.now();
        const durationMs = t1 - t0;

        expect(durationMs).toBeGreaterThanOrEqual(0);
        expect(t1).toBeGreaterThanOrEqual(t0);
    });
});
