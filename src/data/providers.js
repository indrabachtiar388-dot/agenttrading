const DEV = import.meta.env.DEV;
const BIRDEYE_ENDPOINT = DEV ? 'http://localhost:3001/api/birdeye' : '/api/birdeye';
const JUPITER_ENDPOINT = DEV ? 'http://localhost:3001/api/jupiter' : '/api/jupiter';
const PUMPFUN_ENDPOINT = DEV ? 'http://localhost:3001/api/pumpfun' : '/api/pumpfun';
const HERMES_ENDPOINT = DEV ? 'http://localhost:3001/api/hermes' : '/api/hermes';
const HTTP_TIMEOUT_MS = 9000;

// Cache SOL/USD dari Pyth Hermes — dipakai sebagai acuan konversi & cross-validate.
let hermesSolCache = { price: 0, expiresAt: 0 };
const HERMES_SOL_TTL_MS = 4000;

let tokenRegistryPromise = null;
const priceCache = new Map();
const PRICE_CACHE_TTL_MS = 4000;

export async function fetchBirdeyeOverview(ca) {
  if (!ca) return null;
  try {
    const data = await fetchJson(`${BIRDEYE_ENDPOINT}?ca=${encodeURIComponent(ca)}`);
    if (!data?.ok) return null;
    return data;
  } catch {
    return null;
  }
}

export async function fetchJupiterPrice(addresses = []) {
  const cleaned = [...new Set(addresses.map((address) => String(address || '').trim()).filter(Boolean))];
  if (!cleaned.length) return {};

  const now = Date.now();
  const result = {};
  const missing = [];

  for (const address of cleaned) {
    const cached = priceCache.get(address);
    if (cached && cached.expiresAt > now) {
      result[address] = cached.entry;
    } else {
      missing.push(address);
    }
  }

  if (missing.length) {
    try {
      const data = await fetchJson(`${JUPITER_ENDPOINT}?action=price&ids=${missing.join(',')}`);
      if (data?.prices) {
        for (const [address, entry] of Object.entries(data.prices)) {
          priceCache.set(address, { entry, expiresAt: now + PRICE_CACHE_TTL_MS });
          result[address] = entry;
        }
      }
    } catch {
      // ignore — caller akan handle absence
    }
  }

  return result;
}

export async function fetchJupiterTokenRegistry() {
  if (!tokenRegistryPromise) {
    tokenRegistryPromise = fetchJson(`${JUPITER_ENDPOINT}?action=tokens`)
      .then((data) => data?.byAddress || {})
      .catch(() => ({}));
  }
  return tokenRegistryPromise;
}

export async function isJupiterRegistered(ca) {
  if (!ca) return false;
  const registry = await fetchJupiterTokenRegistry();
  return Boolean(registry[ca]);
}

export async function fetchPumpFunDiscovery({ limit = 30, sort = 'created_timestamp', order = 'DESC', includeNsfw = false } = {}) {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      sort,
      order,
      nsfw: String(includeNsfw)
    });
    const data = await fetchJson(`${PUMPFUN_ENDPOINT}?${params.toString()}`);
    if (!data?.ok) return [];
    return Array.isArray(data.tokens) ? data.tokens : [];
  } catch {
    return [];
  }
}

export function pumpFunToFeedToken(coin) {
  if (!coin?.ca) return null;
  const mcSol = Number(coin.marketCapSol || 0);
  const mcUsd = Number(coin.usdMarketCap || 0);

  return {
    id: coin.ca,
    ca: coin.ca,
    name: coin.name || 'Pump.fun Token',
    ticker: coin.symbol || coin.ca.slice(0, 4).toUpperCase(),
    phase: coin.completed ? 'soon' : 'new',
    source: 'Pump.fun frontend feed',
    age: formatAgeSeconds(coin.ageSeconds),
    ageMinutes: coin.ageSeconds != null ? Math.floor(coin.ageSeconds / 60) : null,
    pairAddress: null,
    pairCreatedAt: coin.createdAt || null,
    curve: coin.bondingCurveProgress ?? 0,
    buySell: '0/0',
    devTx: coin.creator || null,
    sniperWallets: null,
    lpStatus: coin.completed ? 'Migrated dari bonding' : 'Bonding curve',
    marketCap: mcUsd ? mcUsd : (mcSol ? `${mcSol.toFixed(mcSol >= 10 ? 1 : 2)} SOL` : 'bonding'),
    volume5m: 'bonding',
    priceUsd: 0,
    liquidityUsd: 0,
    priceChange: { m5: 0, h1: 0, h6: 0, h24: 0 },
    url: coin.url,
    websites: coin.website ? [{ label: 'Website', url: coin.website }] : [],
    socials: [
      coin.twitter ? { type: 'twitter', url: coin.twitter } : null,
      coin.telegram ? { type: 'telegram', url: coin.telegram } : null
    ].filter(Boolean),
    flags: {
      mintRevoked: null,
      freezeActive: null,
      lpBurned: false,
      devSoldPct: null,
      top10Pct: null,
      commonFunderWallets: null,
      firstMinuteHoldingPct: null,
      cabalSync: coin.bondingCurveProgress > 60 ? 42 : 28,
      reportedVolume: 0,
      feeCollected: null,
      globalFees: null,
      dexPaidTiming: 'none',
      activeBoosts: 0,
      pumpFromLowPct: 0,
      candleConfirmation: 36,
      volumeLiquidityRatio: 0,
      txns5m: 0,
      buys5m: 0,
      sells5m: 0,
      bondingCurveProgress: coin.bondingCurveProgress ?? 0,
      pumpFunReplies: coin.replies || 0
    },
    provider: 'Pump.fun frontend API',
    providerConfidence: 'medium',
    feedInsight: coin.completed
      ? 'Token udah selesai bonding dan migrate. Verifikasi LP Raydium sebelum entry.'
      : `Bonding ${coin.bondingCurveProgress || 0}%. Cek dev, replies, dan top buyer awal sebelum entry.`
  };
}

/**
 * Ambil harga SOL/USD dari Pyth Hermes (via backend /api/hermes/sol).
 * Hemat: cache 4 dtk. Degrade aman → kembalikan 0 kalau backend mati.
 */
export async function fetchHermesSol() {
  const now = Date.now();
  if (hermesSolCache.price > 0 && hermesSolCache.expiresAt > now) {
    return hermesSolCache.price;
  }
  try {
    // Backend shape: { prices: { [feedId]: { price, conf, expo, publishTime } }, feedId }.
    // Harga Pyth mentah perlu diskalakan: price * 10^expo.
    const data = await fetchJson(`${HERMES_ENDPOINT}/sol`);
    const entry = data?.prices?.[data?.feedId] || Object.values(data?.prices || {})[0] || null;
    const price = entry ? scalePythPrice(entry) : 0;
    if (price > 0) {
      hermesSolCache = { price, expiresAt: now + HERMES_SOL_TTL_MS };
      return price;
    }
  } catch {
    // backend Hermes belum aktif — acuan SOL tidak tersedia, abaikan.
  }
  return hermesSolCache.price || 0;
}

/** Skalakan harga Pyth mentah ({price, expo}) jadi nilai desimal USD. */
function scalePythPrice(entry) {
  const raw = Number(entry?.price);
  const expo = Number(entry?.expo);
  if (!Number.isFinite(raw) || !Number.isFinite(expo)) return 0;
  return raw * Math.pow(10, expo);
}

/**
 * Ambil harga beberapa Pyth price feed sekaligus (via backend /api/hermes).
 * @returns {Promise<Object>} { [id]: { price (terskalakan), conf, expo, publishTime } }
 */
export async function fetchHermesPrice(ids = []) {
  const cleaned = [...new Set(ids.map((id) => String(id || '').trim()).filter(Boolean))];
  if (!cleaned.length) return {};
  try {
    const data = await fetchJson(`${HERMES_ENDPOINT}?ids=${cleaned.join(',')}`);
    const raw = data?.prices || {};
    const out = {};
    for (const [id, entry] of Object.entries(raw)) {
      out[id] = { ...entry, price: scalePythPrice(entry) };
    }
    return out;
  } catch {
    return {};
  }
}

export function crossValidatePrice(prices) {
  const sources = Object.entries(prices)
    .map(([provider, value]) => ({ provider, price: Number(value) }))
    .filter((item) => Number.isFinite(item.price) && item.price > 0);

  if (sources.length < 2) {
    return { sources, discrepancyPct: 0, suspicious: false, providers: sources.length };
  }

  const values = sources.map((item) => item.price).sort((a, b) => a - b);
  const median = values[Math.floor(values.length / 2)];
  const maxDeviation = Math.max(...values.map((value) => Math.abs(value - median) / median));
  const discrepancyPct = Math.round(maxDeviation * 1000) / 10;

  return {
    sources,
    median,
    discrepancyPct,
    suspicious: discrepancyPct > 10,
    providers: sources.length
  };
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal, headers: { accept: 'application/json', ...(options.headers || {}) } });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function formatAgeSeconds(seconds) {
  const num = Number(seconds || 0);
  if (!Number.isFinite(num) || num <= 0) return 'live';
  if (num < 60) return `${num}dtk`;
  if (num < 3600) return `${Math.floor(num / 60)}m`;
  if (num < 86400) return `${Math.floor(num / 3600)}j`;
  return `${Math.floor(num / 86400)}h`;
}
