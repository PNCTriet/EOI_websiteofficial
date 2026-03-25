type RateState = { windowStart: number; count: number };

// Simple in-memory rate limit (works well for single-instance / dev; for multi-instance
// you should move to a shared store such as Upstash Redis or DB-backed counters).
const getMap = (): Map<string, RateState> => {
  const g = globalThis as unknown as { __rateLimitMap?: Map<string, RateState> };
  if (!g.__rateLimitMap) g.__rateLimitMap = new Map<string, RateState>();
  return g.__rateLimitMap;
};

export function makeRateLimit(options: {
  windowMs: number;
  max: number;
}) {
  const { windowMs, max } = options;
  return (key: string): { allowed: boolean; retryAfterSeconds: number } => {
    const now = Date.now();
    const map = getMap();
    const cur = map.get(key);
    if (!cur) {
      map.set(key, { windowStart: now, count: 1 });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    const elapsed = now - cur.windowStart;
    if (elapsed > windowMs) {
      map.set(key, { windowStart: now, count: 1 });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (cur.count >= max) {
      const retryAfterSeconds = Math.ceil((windowMs - elapsed) / 1000);
      return { allowed: false, retryAfterSeconds };
    }

    cur.count += 1;
    map.set(key, cur);
    return { allowed: true, retryAfterSeconds: 0 };
  };
}

