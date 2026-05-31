/**
 * Leaderboard.jsx — Papan Peringkat Trader MemeAgent
 *
 * Menampilkan top trader berdasarkan:
 * - Profit (total PnL)
 * - Win rate
 * - Volume (total SOL diperdagangkan)
 *
 * Fitur:
 * - Anonymous mode (sembunyikan wallet address / nama)
 * - Sorting & periode (all-time / 7d / 24h)
 * - Highlight peringkat user saat ini
 *
 * Sumber data:
 * - Default memakai leaderboardStore (localStorage) agar berfungsi standalone.
 * - Bisa di-override via prop `entries` (mis. dari backend/leaderboard API).
 */

import { useMemo, useState } from 'react';
import { Trophy, TrendingUp, Percent, BarChart3, EyeOff, Crown, Medal } from 'lucide-react';
import { getLeaderboard } from '../data/leaderboardStore';

const METRICS = [
  { key: 'profit', label: 'Profit', icon: TrendingUp, suffix: ' SOL', field: 'profitSol' },
  { key: 'winrate', label: 'Win Rate', icon: Percent, suffix: '%', field: 'winRate' },
  { key: 'volume', label: 'Volume', icon: BarChart3, suffix: ' SOL', field: 'volumeSol' },
];

const PERIODS = [
  { key: 'all', label: 'All-Time' },
  { key: '7d', label: '7 Hari' },
  { key: '24h', label: '24 Jam' },
];

export default function Leaderboard({ entries, currentUserId, defaultAnonymous = false }) {
  const [metric, setMetric] = useState('profit');
  const [period, setPeriod] = useState('all');
  const [anonymous, setAnonymous] = useState(defaultAnonymous);

  const data = useMemo(
    () => entries || getLeaderboard({ period }),
    [entries, period]
  );

  const activeMetric = METRICS.find((m) => m.key === metric);

  const ranked = useMemo(() => {
    const field = activeMetric.field;
    return [...data]
      .filter((e) => Number.isFinite(e[field]))
      .sort((a, b) => b[field] - a[field])
      .map((e, i) => ({ ...e, rank: i + 1 }));
  }, [data, activeMetric]);

  const userRow = ranked.find((e) => e.id === currentUserId);

  return (
    <div className="panel leaderboard-panel">
      <div className="panel-header">
        <div>
          <h3><Trophy size={18} style={{ verticalAlign: '-3px', marginRight: 6 }} />Papan Peringkat</h3>
          <p className="panel-subtitle">
            Top trader MemeAgent berdasarkan {activeMetric.label.toLowerCase()}.
          </p>
        </div>
        <button
          type="button"
          className={`btn-secondary ${anonymous ? 'active' : ''}`}
          style={{ padding: '8px 14px', fontSize: 13 }}
          onClick={() => setAnonymous((v) => !v)}
          title="Sembunyikan identitas trader"
        >
          <EyeOff size={14} /> {anonymous ? 'Mode Anonim: ON' : 'Mode Anonim'}
        </button>
      </div>

      <div className="lb-controls">
        <div className="filter-chips">
          {METRICS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              className={`chip ${metric === key ? 'active' : ''}`}
              onClick={() => setMetric(key)}
            >
              <Icon size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />
              {label}
            </button>
          ))}
        </div>
        <div className="filter-chips">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`chip ${period === key ? 'active' : ''}`}
              onClick={() => setPeriod(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {ranked.length === 0 ? (
        <div className="empty-state">
          Belum ada data peringkat. Mulai trading untuk masuk papan peringkat.
        </div>
      ) : (
        <div className="lb-table">
          <div className="lb-row lb-head">
            <span className="lb-rank">#</span>
            <span className="lb-name">Trader</span>
            <span className="lb-metric">Profit</span>
            <span className="lb-metric">Win%</span>
            <span className="lb-metric">Volume</span>
            <span className="lb-metric">Trades</span>
          </div>
          {ranked.slice(0, 50).map((e) => (
            <LeaderRow
              key={e.id}
              entry={e}
              anonymous={anonymous}
              isUser={e.id === currentUserId}
              highlightField={activeMetric.field}
            />
          ))}
        </div>
      )}

      {userRow && userRow.rank > 50 && (
        <div className="lb-table" style={{ marginTop: 8 }}>
          <LeaderRow entry={userRow} anonymous={false} isUser highlightField={activeMetric.field} />
        </div>
      )}
    </div>
  );
}

function LeaderRow({ entry, anonymous, isUser, highlightField }) {
  const rankBadge =
    entry.rank === 1 ? <Crown size={15} className="text-amber" /> :
    entry.rank <= 3 ? <Medal size={15} className="text-cyan" /> :
    <span className="lb-rank-num">{entry.rank}</span>;

  const name = anonymous && !isUser
    ? `Anon #${entry.rank}`
    : (entry.name || shortId(entry.id));

  return (
    <div className={`lb-row ${isUser ? 'lb-me' : ''} ${entry.rank <= 3 ? 'lb-top' : ''}`}>
      <span className="lb-rank">{rankBadge}</span>
      <span className="lb-name">
        <span className="lb-avatar">{(name[0] || '?').toUpperCase()}</span>
        {name}
        {isUser && <span className="lb-you">Anda</span>}
      </span>
      <span className={`lb-metric ${highlightField === 'profitSol' ? 'lb-active' : ''} ${(entry.profitSol ?? 0) >= 0 ? 'text-green' : 'text-red'}`}>
        {(entry.profitSol ?? 0) >= 0 ? '+' : ''}{fmt(entry.profitSol)}
      </span>
      <span className={`lb-metric ${highlightField === 'winRate' ? 'lb-active' : ''}`}>
        {entry.winRate != null ? `${Math.round(entry.winRate)}%` : '—'}
      </span>
      <span className={`lb-metric ${highlightField === 'volumeSol' ? 'lb-active' : ''}`}>
        {fmt(entry.volumeSol)}
      </span>
      <span className="lb-metric">{entry.trades ?? '—'}</span>
    </div>
  );
}

function fmt(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  const num = Number(n);
  if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toFixed(Math.abs(num) < 10 ? 2 : 1);
}

function shortId(id) {
  if (!id) return 'Trader';
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}
