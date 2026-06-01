// cache.js — tiny TTL Map cache. Single process, in-memory, good enough for proxy hot paths.

const store = new Map();

// Get a cached value if it has not expired, else undefined.
export function cacheGet(key) {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  return hit.value;
}

// Store a value with a TTL in milliseconds.
export function cacheSet(key, value, ttlMs) {
  store.set(key, { value, expiresAt: Date.now() + Math.max(0, ttlMs) });
  return value;
}

// Memoize an async producer behind the cache. Returns cached value or runs producer once.
// Failed producers are NOT cached so the next call can retry.
export async function cached(key, ttlMs, producer) {
  const hit = cacheGet(key);
  if (hit !== undefined) return hit;
  const value = await producer();
  if (value !== undefined && value !== null) cacheSet(key, value, ttlMs);
  return value;
}
