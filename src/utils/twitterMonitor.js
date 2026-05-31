/**
 * twitterMonitor.js — Twitter/X Social Intelligence untuk MemeAgent
 *
 * Memantau aktivitas sosial token memecoin Solana di Twitter/X:
 * - Trending token detection (cashtag $TICKER)
 * - Sentiment analysis per token (bullish/bearish/neutral)
 * - KOL (Key Opinion Leader) tracking
 * - Tweet volume spike detection
 *
 * Arsitektur:
 * - Berjalan di browser (Vite). Tidak memakai SDK Node yang butuh server.
 * - Memakai endpoint backend opsional (VITE_TWITTER_PROXY) yang membungkus
 *   Twitter API v2 recent search. Jika tidak ada, otomatis fallback ke
 *   simulator deterministik agar UI/agent tetap berfungsi tanpa kredensial.
 *
 * Untuk produksi: set VITE_TWITTER_PROXY ke URL backend Anda yang memanggil
 * Twitter API v2 (Bearer token disimpan di server, JANGAN di browser).
 */

const TWITTER_PROXY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TWITTER_PROXY) || '';

// ----------------------------------------------------------------------------
// Sentiment lexicon — ringan, khusus crypto/memecoin
// ----------------------------------------------------------------------------
const POSITIVE_TERMS = {
  moon: 3, mooning: 3, pump: 2, pumping: 2, bullish: 3, bull: 2, gem: 2,
  ape: 1, aping: 1, send: 1, sending: 1, sendit: 2, lfg: 2, gm: 1,
  buy: 1, buying: 1, hold: 1, hodl: 2, hodling: 2, diamond: 2, hands: 1,
  green: 1, breakout: 2, runner: 2, '100x': 4, '10x': 3, '1000x': 5,
  early: 1, alpha: 2, undervalued: 2, accumulate: 2, accumulating: 2,
  based: 1, wagmi: 2, profit: 2, gains: 2, winner: 2, fire: 1, rocket: 2,
};

const NEGATIVE_TERMS = {
  rug: -4, rugged: -4, rugpull: -5, scam: -4, scammer: -4, dump: -3,
  dumping: -3, dumped: -3, bearish: -3, bear: -2, dead: -3, ded: -3,
  rekt: -3, ngmi: -3, sell: -1, selling: -2, sold: -1, exit: -1,
  honeypot: -5, fake: -2, fud: -1, fudding: -1, crash: -3, crashing: -3,
  bleeding: -2, red: -1, loss: -2, losses: -2, trap: -3,
  liquidated: -3, avoid: -2, careful: -1, warning: -2, jeet: -2, jeets: -2,
};

// ----------------------------------------------------------------------------
// KOL registry — daftar Key Opinion Leader yang diberi bobot pengaruh.
// Bobot dipakai untuk menimbang sentiment & deteksi spike.
// ----------------------------------------------------------------------------
const DEFAULT_KOLS = [
  { handle: 'ansemtrades', weight: 5, label: 'Ansem' },
  { handle: 'CryptoKaleo', weight: 4, label: 'Kaleo' },
  { handle: 'inversebrah', weight: 4, label: 'inversebrah' },
  { handle: 'notthreadguy', weight: 3, label: 'threadguy' },
  { handle: 'IcedKnife', weight: 3, label: 'IcedKnife' },
  { handle: 'mooncat2878', weight: 3, label: 'mooncat' },
  { handle: 'blknoiz06', weight: 4, label: 'Ansem alt' },
  { handle: 'gainzy222', weight: 3, label: 'Gainzy' },
];

let kolRegistry = [...DEFAULT_KOLS];

/** Tambah / ganti daftar KOL yang dipantau. */
export function setKolRegistry(list) {
  if (Array.isArray(list) && list.length) {
    kolRegistry = list.map((k) =>
      typeof k === 'string'
        ? { handle: k.replace(/^@/, ''), weight: 3, label: k.replace(/^@/, '') }
        : { weight: 3, label: k.handle, ...k, handle: String(k.handle || '').replace(/^@/, '') }
    );
  }
  return kolRegistry;
}

export function getKolRegistry() {
  return [...kolRegistry];
}

function kolWeight(handle) {
  if (!handle) return 0;
  const h = handle.replace(/^@/, '').toLowerCase();
  const found = kolRegistry.find((k) => k.handle.toLowerCase() === h);
  return found ? found.weight : 0;
}

// ----------------------------------------------------------------------------
// Sentiment analysis
// ----------------------------------------------------------------------------

/**
 * Analisa sentiment satu teks tweet.
 * @returns {{ score:number, magnitude:number, label:'bullish'|'bearish'|'neutral', hits:string[] }}
 */
export function analyzeText(text) {
  if (!text) return { score: 0, magnitude: 0, label: 'neutral', hits: [] };
  const tokens = String(text)
    .toLowerCase()
    .replace(/[^a-z0-9$#\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  let score = 0;
  let magnitude = 0;
  const hits = [];

  for (const t of tokens) {
    if (POSITIVE_TERMS[t] != null) {
      score += POSITIVE_TERMS[t];
      magnitude += Math.abs(POSITIVE_TERMS[t]);
      hits.push(t);
    } else if (NEGATIVE_TERMS[t] != null) {
      score += NEGATIVE_TERMS[t];
      magnitude += Math.abs(NEGATIVE_TERMS[t]);
      hits.push(t);
    }
  }

  // Normalisasi -1..1 menggunakan tanh agar tidak meledak pada tweet panjang
  const norm = Math.tanh(score / 5);
  const label = norm > 0.15 ? 'bullish' : norm < -0.15 ? 'bearish' : 'neutral';
  return { score: norm, magnitude, label, hits };
}

/**
 * Agregasi sentiment dari kumpulan tweet, dibobot engagement & KOL.
 * @param {Array} tweets - { text, authorHandle, likes, retweets, ... }
 */
export function aggregateSentiment(tweets = []) {
  if (!tweets.length) {
    return { score: 0, label: 'neutral', bullish: 0, bearish: 0, neutral: 0, sampleSize: 0 };
  }

  let weightedSum = 0;
  let totalWeight = 0;
  let bullish = 0;
  let bearish = 0;
  let neutral = 0;

  for (const tw of tweets) {
    const a = analyzeText(tw.text);
    const engagement = 1 + Math.log10(1 + (tw.likes || 0) + 2 * (tw.retweets || 0));
    const kol = 1 + kolWeight(tw.authorHandle) * 0.5;
    const weight = engagement * kol;

    weightedSum += a.score * weight;
    totalWeight += weight;

    if (a.label === 'bullish') bullish++;
    else if (a.label === 'bearish') bearish++;
    else neutral++;
  }

  const score = totalWeight ? weightedSum / totalWeight : 0;
  const label = score > 0.15 ? 'bullish' : score < -0.15 ? 'bearish' : 'neutral';

  return {
    score: Number(score.toFixed(3)),
    label,
    bullish,
    bearish,
    neutral,
    sampleSize: tweets.length,
  };
}

// ----------------------------------------------------------------------------
// Volume spike detection
// ----------------------------------------------------------------------------

// Riwayat volume tweet per token: { [key]: number[] }
const volumeHistory = new Map();
const HISTORY_LEN = 12;

/**
 * Catat volume tweet terbaru & deteksi spike vs baseline.
 * Spike = current >> rata-rata baseline (z-score / rasio).
 * @returns {{ spike:boolean, ratio:number, zScore:number, baseline:number, current:number }}
 */
export function detectVolumeSpike(key, currentVolume) {
  const hist = volumeHistory.get(key) || [];
  const baseline = hist.length ? hist.reduce((a, b) => a + b, 0) / hist.length : 0;

  const mean = baseline;
  const variance = hist.length
    ? hist.reduce((a, b) => a + (b - mean) ** 2, 0) / hist.length
    : 0;
  const std = Math.sqrt(variance) || 1;
  const zScore = (currentVolume - mean) / std;
  const ratio = baseline > 0 ? currentVolume / baseline : currentVolume > 0 ? Infinity : 0;

  // simpan riwayat
  hist.push(currentVolume);
  while (hist.length > HISTORY_LEN) hist.shift();
  volumeHistory.set(key, hist);

  const spike =
    hist.length >= 3 &&
    currentVolume >= 5 &&
    (ratio >= 2.5 || zScore >= 2.0);

  return {
    spike,
    ratio: Number.isFinite(ratio) ? Number(ratio.toFixed(2)) : 99,
    zScore: Number(zScore.toFixed(2)),
    baseline: Number(baseline.toFixed(1)),
    current: currentVolume,
  };
}

export function resetVolumeHistory() {
  volumeHistory.clear();
}

// ----------------------------------------------------------------------------
// Data fetching — proxy backend atau simulator fallback
// ----------------------------------------------------------------------------

/**
 * Ambil tweet terbaru untuk sebuah query (mis. cashtag "$BONK").
 * Memakai backend proxy bila tersedia; jika tidak, simulator deterministik.
 */
export async function searchTweets(query, { limit = 30 } = {}) {
  if (TWITTER_PROXY) {
    try {
      const url = `${TWITTER_PROXY.replace(/\/$/, '')}/search?q=${encodeURIComponent(
        query
      )}&limit=${limit}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return (data.tweets || data.data || []).map(normalizeTweet);
      }
    } catch (err) {
      console.warn('[twitterMonitor] proxy gagal, fallback simulator:', err.message);
    }
  }
  return simulateTweets(query, limit);
}

function normalizeTweet(raw) {
  return {
    id: raw.id || raw.id_str || cryptoRandomId(),
    text: raw.text || raw.full_text || '',
    authorHandle: (raw.authorHandle || raw.username || raw.user?.screen_name || '').replace(/^@/, ''),
    likes: raw.likes ?? raw.public_metrics?.like_count ?? raw.favorite_count ?? 0,
    retweets: raw.retweets ?? raw.public_metrics?.retweet_count ?? raw.retweet_count ?? 0,
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
  };
}

// Simulator deterministik berbasis hash query — agar konsisten antar render
function simulateTweets(query, limit) {
  const seed = hashStr(query + new Date().getMinutes());
  const rnd = mulberry32(seed);
  const ticker = (query.match(/\$([A-Za-z0-9]+)/) || [])[1] || 'TOKEN';
  const count = 5 + Math.floor(rnd() * limit);

  const phrasesBull = [
    `$${ticker} about to moon, loading up now 🚀`,
    `$${ticker} chart looking bullish af, this is the runner`,
    `aping $${ticker}, low mcap gem, easy 10x`,
    `$${ticker} holders are diamond hands, lfg`,
    `$${ticker} breakout confirmed, send it`,
  ];
  const phrasesBear = [
    `$${ticker} looking like a rug, careful`,
    `$${ticker} dumping hard, jeets selling`,
    `avoid $${ticker}, smells like honeypot`,
    `$${ticker} bleeding red, ngmi`,
  ];
  const phrasesNeutral = [
    `watching $${ticker} closely`,
    `$${ticker} volume picking up, no position yet`,
    `anyone in $${ticker}?`,
  ];

  const tweets = [];
  for (let i = 0; i < count; i++) {
    const roll = rnd();
    let text;
    if (roll < 0.55) text = phrasesBull[Math.floor(rnd() * phrasesBull.length)];
    else if (roll < 0.8) text = phrasesNeutral[Math.floor(rnd() * phrasesNeutral.length)];
    else text = phrasesBear[Math.floor(rnd() * phrasesBear.length)];

    const isKol = rnd() < 0.15;
    const author = isKol
      ? kolRegistry[Math.floor(rnd() * kolRegistry.length)].handle
      : `trader_${Math.floor(rnd() * 99999)}`;

    tweets.push({
      id: cryptoRandomId(),
      text,
      authorHandle: author,
      likes: Math.floor(rnd() * (isKol ? 5000 : 200)),
      retweets: Math.floor(rnd() * (isKol ? 1200 : 40)),
      createdAt: new Date(Date.now() - Math.floor(rnd() * 3600_000)).toISOString(),
    });
  }
  return tweets;
}

// ----------------------------------------------------------------------------
// High-level API
// ----------------------------------------------------------------------------

/**
 * Analisa sosial lengkap untuk satu token.
 * @param {{ ticker:string, ca?:string }} token
 * @returns {Promise<object>} ringkasan sosial: sentiment, volume spike, KOL hits
 */
export async function analyzeTokenSocial(token) {
  const ticker = token.ticker || token.symbol || '';
  if (!ticker) {
    return { ticker, available: false, reason: 'ticker kosong' };
  }

  const tweets = await searchTweets(`$${ticker}`, { limit: 40 });
  const sentiment = aggregateSentiment(tweets);
  const spike = detectVolumeSpike(`tw:${ticker.toLowerCase()}`, tweets.length);

  const kolMentions = tweets
    .filter((t) => kolWeight(t.authorHandle) > 0)
    .map((t) => ({
      handle: t.authorHandle,
      weight: kolWeight(t.authorHandle),
      sentiment: analyzeText(t.text).label,
      text: t.text,
      likes: t.likes,
      retweets: t.retweets,
    }))
    .sort((a, b) => b.weight - a.weight);

  // Skor sosial gabungan 0..100 untuk dipakai agent
  const socialScore = computeSocialScore({ sentiment, spike, kolMentions });

  return {
    ticker,
    ca: token.ca,
    available: true,
    tweetCount: tweets.length,
    sentiment,
    volumeSpike: spike,
    kolMentions,
    kolCount: kolMentions.length,
    socialScore,
    topTweets: tweets
      .slice()
      .sort((a, b) => b.likes + 2 * b.retweets - (a.likes + 2 * a.retweets))
      .slice(0, 5),
    updatedAt: Date.now(),
  };
}

function computeSocialScore({ sentiment, spike, kolMentions }) {
  let score = 50; // netral
  score += sentiment.score * 30; // -30..+30
  if (spike.spike) score += Math.min(20, spike.ratio * 4);
  score += Math.min(20, kolMentions.reduce((a, k) => a + k.weight, 0) * 2);
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Scan beberapa token sekaligus & kembalikan yang trending (spike / sentiment kuat).
 * @param {Array} tokens - [{ ticker, ca }]
 */
export async function scanTrending(tokens = [], { minScore = 60 } = {}) {
  const results = await Promise.all(tokens.map((t) => analyzeTokenSocial(t)));
  return results
    .filter((r) => r.available)
    .map((r) => ({
      ...r,
      trending: r.volumeSpike.spike || r.socialScore >= minScore || r.kolCount > 0,
    }))
    .sort((a, b) => b.socialScore - a.socialScore);
}

// ----------------------------------------------------------------------------
// Polling monitor — callback saat ada trending baru
// ----------------------------------------------------------------------------

let monitorTimer = null;

/**
 * Mulai polling otomatis. onTrending dipanggil dengan token yang trending.
 * @returns {() => void} fungsi stop
 */
export function startMonitor(getTokens, onTrending, { intervalMs = 60000, minScore = 60 } = {}) {
  stopMonitor();
  const tick = async () => {
    try {
      const tokens = typeof getTokens === 'function' ? await getTokens() : getTokens;
      if (!tokens?.length) return;
      const trending = await scanTrending(tokens, { minScore });
      const hot = trending.filter((t) => t.trending);
      if (hot.length && typeof onTrending === 'function') onTrending(hot);
    } catch (err) {
      console.warn('[twitterMonitor] monitor tick error:', err.message);
    }
  };
  tick();
  monitorTimer = setInterval(tick, intervalMs);
  return stopMonitor;
}

export function stopMonitor() {
  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }
}

// ----------------------------------------------------------------------------
// Utils
// ----------------------------------------------------------------------------
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cryptoRandomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'tw_' + Math.random().toString(36).slice(2);
}

export default {
  analyzeText,
  aggregateSentiment,
  detectVolumeSpike,
  resetVolumeHistory,
  searchTweets,
  analyzeTokenSocial,
  scanTrending,
  startMonitor,
  stopMonitor,
  setKolRegistry,
  getKolRegistry,
};
