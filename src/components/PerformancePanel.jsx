import { Trophy, RotateCcw } from 'lucide-react';

function StatBox({ label, value, tone, sub }) {
  const cls = tone === 'up' ? 'text-green' : tone === 'down' ? 'text-red' : tone === 'cyan' ? 'text-cyan' : '';
  return (
    <div className="perf-stat">
      <span>{label}</span>
      <strong className={cls}>{value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  );
}

/* Kurva ekuitas: PnL% kumulatif dari trade selesai (urut waktu tutup). */
function EquityCurve({ trades }) {
  const closed = trades
    .filter((t) => t.status === 'WIN' || t.status === 'LOSS')
    .sort((a, b) => (a.closedAt || 0) - (b.closedAt || 0));

  if (closed.length < 2) {
    return <div className="perf-curve empty">Kurva ekuitas muncul setelah minimal 2 trade selesai.</div>;
  }

  let cum = 0;
  const points = closed.map((t) => (cum += (t.pnlPct || 0)));
  const min = Math.min(0, ...points);
  const max = Math.max(0, ...points);
  const range = max - min || 1;
  const W = 100;
  const H = 36;
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * W;
    const y = H - ((p - min) / range) * H;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const zeroY = H - ((0 - min) / range) * H;
  const last = points[points.length - 1];
  const color = last >= 0 ? 'var(--green)' : 'var(--red)';

  return (
    <div className="perf-curve">
      <div className="perf-curve-head">
        <span>Kurva Ekuitas (PnL% kumulatif)</span>
        <strong className={last >= 0 ? 'text-green' : 'text-red'}>{last >= 0 ? '+' : ''}{last.toFixed(1)}%</strong>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="perf-curve-svg">
        <line x1="0" y1={zeroY} x2={W} y2={zeroY} stroke="var(--line)" strokeWidth="0.5" strokeDasharray="2 2" />
        <polyline points={coords.join(' ')} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

export default function PerformancePanel({ stats, trades = [], onReset }) {
  const fmt = (n, plus = false) => `${plus && n > 0 ? '+' : ''}${(n || 0).toFixed(1)}%`;

  return (
    <div className="panel">
      <div className="panel-header">
        <h3><Trophy size={16} style={{ verticalAlign: '-3px', marginRight: 6, color: 'var(--amber)' }} /> Performa Backtest</h3>
        {onReset && (
          <button type="button" className="btn-secondary" style={{ padding: '8px 14px', fontSize: 13 }} onClick={onReset}>
            <RotateCcw size={14} /> Reset
          </button>
        )}
      </div>

      {stats.total === 0 && stats.active === 0 ? (
        <div className="empty-state">Belum ada trade backtest. Sinyal terbaik akan otomatis dilacak begitu muncul.</div>
      ) : (
        <>
          <div className="perf-grid">
            <StatBox label="Win Rate" value={`${stats.winRate.toFixed(0)}%`} tone={stats.winRate >= 50 ? 'up' : 'down'} sub={`${stats.wins}W / ${stats.losses}L`} />
            <StatBox label="Trade Selesai" value={stats.total} sub={`${stats.active} dilacak`} />
            <StatBox label="Rata-rata Profit" value={fmt(stats.avgWinPct, true)} tone="up" />
            <StatBox label="Rata-rata Loss" value={fmt(stats.avgLossPct)} tone="down" />
            <StatBox label="Ekspektansi / Trade" value={fmt(stats.expectancy, true)} tone={stats.expectancy >= 0 ? 'up' : 'down'} />
            <StatBox label="Total PnL" value={fmt(stats.totalPnlPct, true)} tone={stats.totalPnlPct >= 0 ? 'up' : 'down'} />
            <StatBox label="Trade Terbaik" value={fmt(stats.bestPct, true)} tone="up" />
            <StatBox label="Trade Terburuk" value={fmt(stats.worstPct)} tone="down" />
          </div>

          <EquityCurve trades={trades} />

          <div className="perf-bar">
            <div className="perf-bar-fill" style={{ width: `${Math.min(100, stats.winRate)}%` }} />
            <span>{stats.wins} menang · {stats.losses} kalah dari {stats.total} trade selesai</span>
          </div>

          <p className="perf-note">
            Ekspektansi = rata-rata hasil per trade (memperhitungkan win rate). Positif berarti
            strategi sinyal ini menguntungkan dalam simulasi. Mode backtest, bukan eksekusi nyata.
          </p>
        </>
      )}
    </div>
  );
}
