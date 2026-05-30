const STORAGE_KEY = 'sia-rug-blacklist-v1';
const DEFAULT_TTL_DAYS = 7;
const MAX_ENTRIES = 500;

let memoryCache = null;

function load() {
  if (memoryCache) return memoryCache;
  if (typeof window === 'undefined' || !window.localStorage) {
    memoryCache = {};
    return memoryCache;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    memoryCache = raw ? JSON.parse(raw) : {};
  } catch {
    memoryCache = {};
  }
  return memoryCache;
}

function persist() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache));
  } catch {
    // localStorage penuh atau diblok — ignore, blacklist in-memory aja
  }
}

export function addToBlacklist(ca, { reason = 'rugged', level = 'high', ttlDays = DEFAULT_TTL_DAYS } = {}) {
  if (!ca) return null;
  const data = load();
  const now = Date.now();
  const existing = data[ca];
  const expiresAt = now + ttlDays * 24 * 60 * 60 * 1000;

  data[ca] = {
    ca,
    reason: existing?.reason ? mergeReasons(existing.reason, reason) : reason,
    level: priorityLevel(existing?.level, level),
    addedAt: existing?.addedAt || now,
    expiresAt: Math.max(existing?.expiresAt || 0, expiresAt),
    hits: (existing?.hits || 0) + 1
  };

  if (Object.keys(data).length > MAX_ENTRIES) {
    const entries = Object.entries(data)
      .sort((a, b) => (b[1].addedAt || 0) - (a[1].addedAt || 0))
      .slice(0, MAX_ENTRIES);
    memoryCache = Object.fromEntries(entries);
  }
  persist();
  return data[ca];
}

export function isBlacklisted(ca) {
  if (!ca) return false;
  const data = load();
  const entry = data[ca];
  if (!entry) return false;
  if (entry.expiresAt && entry.expiresAt < Date.now()) {
    delete data[ca];
    persist();
    return false;
  }
  return true;
}

export function getBlacklistEntry(ca) {
  if (!ca) return null;
  if (!isBlacklisted(ca)) return null;
  return load()[ca] || null;
}

export function listBlacklist() {
  const data = load();
  prune();
  return Object.values(data).sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
}

export function removeFromBlacklist(ca) {
  if (!ca) return;
  const data = load();
  if (data[ca]) {
    delete data[ca];
    persist();
  }
}

export function prune() {
  const data = load();
  const now = Date.now();
  let removed = 0;
  for (const ca of Object.keys(data)) {
    if (data[ca].expiresAt && data[ca].expiresAt < now) {
      delete data[ca];
      removed += 1;
    }
  }
  if (removed) persist();
  return removed;
}

function priorityLevel(current, next) {
  const order = ['low', 'medium', 'high', 'critical'];
  const a = order.indexOf(current);
  const b = order.indexOf(next);
  return order[Math.max(a, b)] || next || current || 'high';
}

function mergeReasons(existing, incoming) {
  if (!incoming) return existing;
  if (!existing) return incoming;
  if (existing.includes(incoming)) return existing;
  return `${existing}; ${incoming}`;
}
