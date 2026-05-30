import { formatUsd, shortAddr } from '../data/autoTrader';

const STATUS_LABEL = {
  WIN: { text: 'WIN', cls: 'text-green' },
  LOSS: { text: 'LOSS', cls: 'text-red' },
  ACTIVE: { text: 'AKTIF', cls: 'text-cyan' }
};

export default function BacktestHistory({ trades, onSelect }) {
  const active = trades.filter((t) => t.status === 'ACTIVE');
  const closed = trades.filter((t) => t.status === 'WIN' || t.status === 'LOSS');

  const Row = ({ t }) => {
    const st = STATUS_LABEL[t.status] || { text: t.status, cls: '' };
    return (
      <tr key={t.id} onClick={() => onSelect?.(t)} style={{ cursor: onSelect ? 'pointer' : 'default' }}>
        <td>
          <strong>${t.ticker}</strong>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{shortAddr(t.ca)}</div>
        </td>
        <td><span className={`badge badge-${t.grade === 'A+' || t.grade === 'A' ? 'buy' : 'hold'}`}>{t.grade}</span></td>
        <td>{formatUsd(t.entry)}</td>
        <td>{t.closePrice ? formatUsd(t.closePrice) : formatUsd(t.lastPrice)}</td>
        <td className={(t.pnlPct || 0) >= 0 ? 'text-green' : 'text-red'}>
          {(t.pnlPct || 0) >= 0 ? '+' : ''}{(t.pnlPct || 0).toFixed(2)}%
        </td>
        <td><span className={`${st.cls}`} style={{ fontWeight: 800 }}>{st.text}</span></td>
      </tr>
    );
  };

  if (!trades.length) {
    return <div className="empty-state">Belum ada trade backtest. Sinyal A+/A akan otomatis dilacak.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {active.length > 0 && (
        <div className="panel">
          <div className="panel-header">
            <h3>Trade Aktif</h3>
            <div className="live-dot"><span />Live</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="signal-table">
              <thead><tr><th>Token</th><th>Grade</th><th>Entry</th><th>Harga</th><th>PnL</th><th>Status</th></tr></thead>
              <tbody>{active.map((t) => <Row key={t.id} t={t} />)}</tbody>
            </table>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-header"><h3>Riwayat Selesai</h3></div>
        {closed.length === 0 ? (
          <div className="empty-state">Belum ada trade yang menyentuh TP/SL.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="signal-table">
              <thead><tr><th>Token</th><th>Grade</th><th>Entry</th><th>Close</th><th>PnL</th><th>Hasil</th></tr></thead>
              <tbody>{closed.slice(0, 50).map((t) => <Row key={t.id} t={t} />)}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
