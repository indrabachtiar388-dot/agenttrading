/**
 * leaderboardStore.js — Penyimpanan & agregasi data papan peringkat
 *
 * Menyimpan entri trader di localStorage dan menyediakan agregasi per periode.
 * Setiap entri: { id, name, profitSol, winRate, volumeSol, trades, updatedAt, history:[] }
 *
 * Di produksi, fungsi getLeaderboard() bisa diganti memanggil backend API.
 * Untuk demo standalone, kita seed dengan beberapa trader sintetis + entri user.
 */

const KEY = 'ma_leaderboard_v1';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  const seeded = seedData();
  save(seeded);
  return seeded;
}

function save(entries) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch { /* ignore */ }
}

/**
 * Ambil leaderboard untuk periode tertentu.
 * @param {{ period?: 'all'|'7d'|'24h' }} opts
 */
export function getLeaderboard({ period = 'all' } = {}) {
  const entries = load();
  if (period === 'all') return entries;

  const cutoff = period === '24h' ? 24 * 3600_000 : 7 * 24 * 3600_000;
  const since = Date.now() - cutoff;

  // Agregasi ulang dari history bila tersedia
  return entries.map((e) => {
    if (!Array.isArray(e.history) || !e.history.length) return e;
    const recent = e.history.filter((h) => h.ts >= since);
    if (!recent.length) {
      return { ...e, profitSol: 0, volumeSol: 0, trades: 0, winRate: 0 };
    }
    const wins = recent.filter((h) => h.pnlSol > 0).length;
    return {
      ...e,
      profitSol: round(recent.reduce((a, h) => a + h.pnlSol, 0)),
      volumeSol: round(recent.reduce((a, h) => a + Math.abs(h.volumeSol || 0), 0)),
      trades: recent.length,
      winRate: round((wins / recent.length) * 100),
    };
  });
}

/**
 * Catat hasil trade untuk seorang trader → update peringkat.
 * @param {string} id - id trader (mis. publicKey)
 * @param {{ pnlSol:number, volumeSol:number, name?:string }} trade
 */
export function recordTrade(id, trade) {
  const entries = load();
  let entry = entries.find((e) => e.id === id);
  if (!entry) {
    entry = {
      id,
      name: trade.name || null,
      profitSol: 0,
      volumeSol: 0,
      trades: 0,
      winRate: 0,
      history: [],
      updatedAt: Date.now(),
    };
    entries.push(entry);
  }

  entry.history = entry.history || [];
  entry.history.push({
    ts: Date.now(),
    pnlSol: Number(trade.pnlSol) || 0,
    volumeSol: Number(trade.volumeSol) || 0,
  });
  // batasi riwayat
  if (entry.history.length > 500) entry.history = entry.history.slice(-500);

  const wins = entry.history.filter((h) => h.pnlSol > 0).length;
  entry.profitSol = round(entry.history.reduce((a, h) => a + h.pnlSol, 0));
  entry.volumeSol = round(entry.history.reduce((a, h) => a + Math.abs(h.volumeSol), 0));
  entry.trades = entry.history.length;
  entry.winRate = round((wins / entry.history.length) * 100);
  entry.updatedAt = Date.now();

  save(entries);
  return entry;
}

/** Set / update nama tampilan trader. */
export function setTraderName(id, name) {
  const entries = load();
  const entry = entries.find((e) => e.id === id);
  if (entry) {
    entry.name = name;
    save(entries);
  }
}

export function resetLeaderboard() {
  save(seedData());
}

// ----------------------------------------------------------------------------
// Seed data sintetis — agar UI tidak kosong saat pertama dibuka
// ----------------------------------------------------------------------------
function seedData() {
  const names = [
    'solwhale', 'degenmax', 'apeKing', 'moonfarmer', 'jeetbuster',
    'rugproof', 'alphahunter', 'sniperX', 'diamondhodl', 'pumpwizard',
    'memelord', 'chainsage', 'fastfingers', 'liquidape', 'tendies',
  ];
  const now = Date.now();
  return names.map((name, i) => {
    const seed = hash(name + i);
    const rnd = mulberry32(seed);
    const tradeCount = 20 + Math.floor(rnd() * 180);
    const history = [];
    let profit = 0;
    let volume = 0;
    let wins = 0;
    for (let t = 0; t < tradeCount; t++) {
      const win = rnd() < 0.45 + i * 0.01; // trader teratas sedikit lebih baik
      const vol = round(0.1 + rnd() * 5);
      const pnl = win ? round(vol * (0.2 + rnd() * 2)) : round(-vol * (0.1 + rnd() * 0.8));
      if (win) wins++;
      profit += pnl;
      volume += vol;
      history.push({ ts: now - Math.floor(rnd() * 14 * 24 * 3600_000), pnlSol: pnl, volumeSol: vol });
    }
    history.sort((a, b) => a.ts - b.ts);
    return {
      id: `seed_${name}`,
      name,
      profitSol: round(profit),
      volumeSol: round(volume),
      trades: tradeCount,
      winRate: round((wins / tradeCount) * 100),
      history,
      updatedAt: now,
    };
  });
}

function round(n) {
  return Math.round(Number(n) * 100) / 100;
}

function hash(s) {
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
