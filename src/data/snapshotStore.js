const MAX_SNAPSHOTS = 12;
const MAX_TOKENS = 400;
const SNAPSHOT_FIELDS = [
  'liquidityUsd',
  'priceUsd',
  'marketCap',
  'flags.txns5m',
  'flags.buys5m',
  'flags.sells5m',
  'flags.reportedVolume',
  'priceChange.m5',
  'priceChange.h1'
];

const store = new Map();

export function pushSnapshot(ca, token) {
  if (!ca || !token) return;
  const snapshot = buildSnapshot(token);
  const list = store.get(ca) || [];
  const last = list[list.length - 1];
  if (last && snapshotEquivalent(last, snapshot)) {
    last._ts = snapshot._ts;
    return;
  }
  list.push(snapshot);
  if (list.length > MAX_SNAPSHOTS) list.shift();
  store.set(ca, list);
  if (store.size > MAX_TOKENS) prune();
}

export function getSnapshots(ca) {
  return store.get(ca) || [];
}

export function getVelocity(ca) {
  const list = store.get(ca);
  if (!list || list.length < 2) return null;

  const latest = list[list.length - 1];
  const previous = list[list.length - 2];
  const oldest = list[0];

  const elapsedRecent = Math.max(1, (latest._ts - previous._ts) / 1000);
  const elapsedTotal = Math.max(1, (latest._ts - oldest._ts) / 1000);

  return {
    snapshots: list.length,
    elapsedSeconds: elapsedTotal,
    liquidityDelta: latest.liquidityUsd - previous.liquidityUsd,
    liquidityRatePerMin: ((latest.liquidityUsd - oldest.liquidityUsd) / Math.max(1, elapsedTotal / 60)),
    volume5mDelta: latest.volume5m - previous.volume5m,
    volume5mTrend: trend(list.map((item) => item.volume5m)),
    priceM5Delta: latest.priceChange.m5 - previous.priceChange.m5,
    priceTrend: trend(list.map((item) => item.priceChange.m5)),
    txnsDelta: latest.txns5m - previous.txns5m,
    txnsTrend: trend(list.map((item) => item.txns5m)),
    buyRatio: computeBuyRatio(latest),
    buyRatioTrend: trend(list.map(computeBuyRatio)),
    priceVelocityPctPerMin: (oldest.priceUsd > 0 || latest.priceUsd > 0)
      ? ((latest.priceUsd - oldest.priceUsd) / Math.max(0.0000001, oldest.priceUsd || latest.priceUsd)) * 100 / Math.max(1, elapsedTotal / 60)
      : null,
    age: elapsedTotal,
    recentAge: elapsedRecent
  };
}

export function getPeak(ca, field) {
  const list = store.get(ca);
  if (!list || !list.length) return null;
  let peak = -Infinity;
  for (const snapshot of list) {
    const value = readField(snapshot, field);
    if (Number.isFinite(value) && value > peak) peak = value;
  }
  return peak === -Infinity ? null : peak;
}

export function getValley(ca, field) {
  const list = store.get(ca);
  if (!list || !list.length) return null;
  let valley = Infinity;
  for (const snapshot of list) {
    const value = readField(snapshot, field);
    if (Number.isFinite(value) && value < valley) valley = value;
  }
  return valley === Infinity ? null : valley;
}

export function getFirst(ca) {
  const list = store.get(ca);
  return list?.[0] || null;
}

export function getLatest(ca) {
  const list = store.get(ca);
  return list?.[list.length - 1] || null;
}

export function clear(ca) {
  if (ca) store.delete(ca);
  else store.clear();
}

export function size() {
  return store.size;
}

function prune() {
  const entries = Array.from(store.entries())
    .map(([ca, list]) => [ca, list[list.length - 1]?._ts || 0])
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_TOKENS);
  const keep = new Set(entries.map(([ca]) => ca));
  for (const ca of store.keys()) {
    if (!keep.has(ca)) store.delete(ca);
  }
}

function buildSnapshot(token) {
  const flags = token.flags || {};
  const priceChange = token.priceChange || {};
  return {
    _ts: Date.now(),
    liquidityUsd: Number(token.liquidityUsd || 0),
    priceUsd: Number(token.priceUsd || 0),
    marketCap: typeof token.marketCap === 'number' ? token.marketCap : Number(flags.marketCapNum || 0),
    txns5m: Number(flags.txns5m || 0),
    buys5m: Number(flags.buys5m || 0),
    sells5m: Number(flags.sells5m || 0),
    volume5m: Number(flags.reportedVolume || 0),
    priceChange: {
      m5: Number(priceChange.m5 || 0),
      h1: Number(priceChange.h1 || 0)
    }
  };
}

function snapshotEquivalent(a, b) {
  if (!a || !b) return false;
  return a.liquidityUsd === b.liquidityUsd
    && a.priceUsd === b.priceUsd
    && a.marketCap === b.marketCap
    && a.txns5m === b.txns5m
    && a.buys5m === b.buys5m
    && a.sells5m === b.sells5m
    && a.volume5m === b.volume5m
    && a.priceChange.m5 === b.priceChange.m5
    && a.priceChange.h1 === b.priceChange.h1;
}

function trend(values = []) {
  if (values.length < 2) return 0;
  let up = 0;
  let down = 0;
  for (let i = 1; i < values.length; i += 1) {
    if (values[i] > values[i - 1]) up += 1;
    else if (values[i] < values[i - 1]) down += 1;
  }
  if (up + down === 0) return 0;
  return (up - down) / (up + down);
}

function computeBuyRatio(snapshot) {
  const total = snapshot.buys5m + snapshot.sells5m;
  if (!total) return 0.5;
  return snapshot.buys5m / total;
}

function readField(snapshot, field) {
  if (!field) return null;
  const parts = field.split('.');
  let current = snapshot;
  for (const part of parts) {
    if (current == null) return null;
    current = current[part];
  }
  return Number(current);
}

export const SNAPSHOT_FIELDS_LIST = SNAPSHOT_FIELDS;
