/**
 * strategyStore.js — Penyimpanan strategi trading yang dibagikan
 *
 * Mengelola marketplace strategi:
 * - Daftar strategi (built-in + buatan user)
 * - Share (publish) strategi baru
 * - Import strategi dari JSON / orang lain
 * - Rating & review
 * - Statistik performa per strategi
 *
 * Disimpan di localStorage; di produksi getStrategies() bisa memanggil backend.
 */

const KEY = 'ma_strategies_v1';

/**
 * Bentuk strategi:
 * {
 *   id, name, author, description,
 *   params: { ... },          // konfigurasi entry/exit/risk
 *   stats: { winRate, avgPnl, trades, maxDrawdown },
 *   reviews: [{ user, rating, comment, ts }],
 *   createdAt, builtin
 * }
 */

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  const seeded = seedStrategies();
  save(seeded);
  return seeded;
}

function save(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch { /* ignore */ }
}

/** Ambil semua strategi, opsional di-sort. */
export function getStrategies({ sort = 'rating' } = {}) {
  const list = load().map(withDerived);
  const sorters = {
    rating: (a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount,
    winrate: (a, b) => (b.stats?.winRate || 0) - (a.stats?.winRate || 0),
    pnl: (a, b) => (b.stats?.avgPnl || 0) - (a.stats?.avgPnl || 0),
    newest: (a, b) => b.createdAt - a.createdAt,
    popular: (a, b) => b.reviewCount - a.reviewCount,
  };
  return list.sort(sorters[sort] || sorters.rating);
}

export function getStrategy(id) {
  return load().map(withDerived).find((s) => s.id === id) || null;
}

/** Publish strategi baru ke marketplace. */
export function shareStrategy({ name, author, description, params, stats }) {
  if (!name || !params) throw new Error('Strategi butuh name dan params');
  const list = load();
  const strategy = {
    id: 'strat_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: String(name).slice(0, 80),
    author: author || 'anon',
    description: description || '',
    params,
    stats: normalizeStats(stats),
    reviews: [],
    createdAt: Date.now(),
    builtin: false,
  };
  list.push(strategy);
  save(list);
  return withDerived(strategy);
}

/**
 * Import strategi dari objek/JSON string buatan orang lain.
 * Validasi minimal & sanitasi.
 */
export function importStrategy(input) {
  let obj = input;
  if (typeof input === 'string') {
    try {
      obj = JSON.parse(input);
    } catch {
      throw new Error('JSON tidak valid');
    }
  }
  if (!obj || typeof obj !== 'object' || !obj.name || !obj.params) {
    throw new Error('Format strategi tidak valid (butuh name & params)');
  }
  return shareStrategy({
    name: obj.name,
    author: obj.author || 'imported',
    description: obj.description || '',
    params: obj.params,
    stats: obj.stats,
  });
}

/** Export strategi ke JSON string yang bisa dibagikan. */
export function exportStrategy(id) {
  const s = getStrategy(id);
  if (!s) throw new Error('Strategi tidak ditemukan');
  const { name, author, description, params, stats } = s;
  return JSON.stringify({ name, author, description, params, stats }, null, 2);
}

/** Tambah rating & review. rating 1..5. */
export function addReview(id, { user, rating, comment }) {
  const list = load();
  const s = list.find((x) => x.id === id);
  if (!s) throw new Error('Strategi tidak ditemukan');
  const r = Math.max(1, Math.min(5, Math.round(Number(rating) || 0)));
  s.reviews = s.reviews || [];
  s.reviews.push({
    user: user || 'anon',
    rating: r,
    comment: String(comment || '').slice(0, 280),
    ts: Date.now(),
  });
  save(list);
  return withDerived(s);
}

export function deleteStrategy(id) {
  const list = load().filter((s) => s.id !== id || s.builtin);
  save(list);
}

export function resetStrategies() {
  save(seedStrategies());
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
function withDerived(s) {
  const reviews = s.reviews || [];
  const reviewCount = reviews.length;
  const avgRating = reviewCount
    ? Math.round((reviews.reduce((a, r) => a + r.rating, 0) / reviewCount) * 10) / 10
    : 0;
  return { ...s, reviewCount, avgRating };
}

function normalizeStats(stats = {}) {
  return {
    winRate: clampNum(stats.winRate, 0, 100, 0),
    avgPnl: num(stats.avgPnl, 0),
    trades: num(stats.trades, 0),
    maxDrawdown: clampNum(stats.maxDrawdown, 0, 100, 0),
  };
}

function num(v, d) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}
function clampNum(v, min, max, d) {
  const n = num(v, d);
  return Math.max(min, Math.min(max, n));
}

// ----------------------------------------------------------------------------
// Seed strategi built-in
// ----------------------------------------------------------------------------
function seedStrategies() {
  const now = Date.now();
  return [
    {
      id: 'builtin_momentum',
      name: 'Momentum Runner',
      author: 'MemeAgent',
      description:
        'Entry pada grade A+/A dengan momentum kuat & volume integrity tinggi. Exit tier-based (1.2x→4x) + trailing longgar untuk menangkap runner.',
      params: {
        minGrade: 'A',
        minConfidence: 75,
        slPct: 18,
        tpTiers: [1.2, 1.5, 2.5, 4],
        trailing: true,
        moonbag: 0.1,
      },
      stats: { winRate: 52, avgPnl: 34, trades: 240, maxDrawdown: 22 },
      reviews: [
        { user: 'degenmax', rating: 5, comment: 'Runner terbaik, sabar nahan moonbag.', ts: now - 86400000 },
        { user: 'apeKing', rating: 4, comment: 'Solid tapi butuh modal lebih buat DCA.', ts: now - 43200000 },
      ],
      createdAt: now - 30 * 86400000,
      builtin: true,
    },
    {
      id: 'builtin_scalp',
      name: 'Quick Scalp',
      author: 'MemeAgent',
      description:
        'Profit-taking cepat di 1.3x dengan SL ketat. Cocok untuk pasar choppy & menekan drawdown.',
      params: {
        minGrade: 'A',
        minConfidence: 70,
        slPct: 10,
        tpTiers: [1.3],
        trailing: false,
        moonbag: 0,
      },
      stats: { winRate: 64, avgPnl: 12, trades: 410, maxDrawdown: 11 },
      reviews: [
        { user: 'fastfingers', rating: 5, comment: 'Win rate tinggi, low stress.', ts: now - 7200000 },
      ],
      createdAt: now - 20 * 86400000,
      builtin: true,
    },
    {
      id: 'builtin_safe',
      name: 'Conservative A+',
      author: 'MemeAgent',
      description:
        'Hanya entry grade A+ dengan confidence >85% & rug score rendah. Volume kecil tapi win rate tinggi.',
      params: {
        minGrade: 'A+',
        minConfidence: 85,
        slPct: 14,
        tpTiers: [1.5, 2.5],
        trailing: true,
        moonbag: 0.05,
      },
      stats: { winRate: 58, avgPnl: 26, trades: 120, maxDrawdown: 15 },
      reviews: [],
      createdAt: now - 10 * 86400000,
      builtin: true,
    },
  ];
}
