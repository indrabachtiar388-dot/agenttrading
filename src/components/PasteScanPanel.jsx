import { useState } from 'react';
import {
  Search, ShieldCheck, ShieldAlert, ShieldX, Copy, Check, LineChart,
  CheckCircle2, AlertTriangle, XCircle, Circle, Sparkles
} from 'lucide-react';
import { scanDeep, formatUsd, shortAddr } from '../data/autoTrader';

const VERDICT_UI = {
  SAFE: { color: 'var(--green)', Icon: ShieldCheck, bg: 'rgba(22,163,74,0.10)', border: 'rgba(22,163,74,0.30)' },
  CAUTION: { color: 'var(--amber)', Icon: ShieldAlert, bg: 'rgba(217,119,6,0.10)', border: 'rgba(217,119,6,0.30)' },
  RUG: { color: 'var(--red)', Icon: ShieldX, bg: 'rgba(220,38,38,0.10)', border: 'rgba(220,38,38,0.30)' },
};

const PHASE_LABEL = { new: 'New / Bonding', graduating: 'Graduating Soon', migrated: 'Migrated' };

function CheckIcon({ status }) {
  if (status === 'pass') return <CheckCircle2 size={15} className="text-green" />;
  if (status === 'warn') return <AlertTriangle size={15} className="text-amber" />;
  if (status === 'fail') return <XCircle size={15} className="text-red" />;
  return <Circle size={15} className="text-muted" />;
}

const isCa = (v) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(v || '').trim());

export default function PasteScanPanel() {
  const [ca, setCa] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const runScan = async () => {
    const target = ca.trim();
    if (!isCa(target)) { setError('Contract address Solana tidak valid.'); return; }
    setError('');
    setScanning(true);
    setResult(null);
    try {
      const res = await scanDeep(target);
      if (!res) { setError('Tidak ada data live untuk token ini.'); return; }
      setResult(res);
    } catch (e) {
      setError('Gagal scan: ' + (e?.message || 'cek koneksi/provider.'));
    } finally {
      setScanning(false);
    }
  };

  const copyCa = async () => {
    try {
      await navigator.clipboard.writeText(result?.ca || ca);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch { /* ignore */ }
  };

  const v = result?.verdict ? VERDICT_UI[result.verdict.key] : null;
  const report = result?.scan?.report;
  const alpha = result?.scan?.alpha;
  const flags = result?.flags || {};

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h3>Paste Scan — Cek Token Aman / Rug</h3>
          <p className="panel-subtitle">Tempel contract address apa pun (pump.fun / migrated). Engine cek authority, holder, likuiditas, fase, dan meta dalam satu klik.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <input
          type="text"
          value={ca}
          onChange={(e) => setCa(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') runScan(); }}
          placeholder="Contoh: 7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr"
          spellCheck={false}
          style={{ flex: '1 1 320px', padding: '11px 14px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--bg-secondary)', color: 'var(--soft)', fontFamily: 'monospace', fontSize: 13 }}
        />
        <button type="button" className="btn-power on" style={{ padding: '11px 18px' }} onClick={runScan} disabled={scanning}>
          <Search size={16} /> {scanning ? 'Memindai…' : 'Scan'}
        </button>
      </div>

      {error && <div className="empty-state" style={{ color: 'var(--red)' }}>{error}</div>}

      {scanning && !result && (
        <div className="signal-card skeleton" style={{ height: 120 }} />
      )}

      {result && v && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Verdict banner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 12, background: v.bg, border: `1px solid ${v.border}` }}>
            <v.Icon size={34} style={{ color: v.color, flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 18 }}>${result.ticker}</strong>
                <span style={{ color: 'var(--muted)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis' }}>{result.name}</span>
              </div>
              <strong style={{ color: v.color, fontSize: 15 }}>{result.verdict.label}</strong>
              <span style={{ color: 'var(--muted)', fontSize: 13 }}> — risiko utama: {result.verdict.primaryRisk}</span>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Skor / Keyakinan</div>
              <strong style={{ fontSize: 17 }}>{report?.score ?? '—'}<span style={{ color: 'var(--muted)', fontWeight: 400 }}> / {report?.confidence ?? '—'}%</span></strong>
            </div>
          </div>

          {/* Alpha & meta pills */}
          <div className="sd-pills">
            <span className="sd-pill" style={{ color: 'var(--blue)' }}>Fase: {PHASE_LABEL[result.phase?.key] || result.phase?.label || '—'}</span>
            {result.phase?.key !== 'migrated' && result.phase?.bondingProgress != null && (
              <span className="sd-pill">Bonding {Math.round(result.phase.bondingProgress)}%</span>
            )}
            <span className="sd-pill"><Sparkles size={12} /> Alpha {result.alphaScore}/100</span>
            <span className="sd-pill">Meta: {result.meta?.label}{result.meta?.aiLabeled ? ' (AI)' : ''}</span>
            <span className="sd-pill">Rug level: {result.verdict.rugLevel}</span>
            {result.solUsd > 0 && <span className="sd-pill">SOL ${result.solUsd.toFixed(2)}</span>}
          </div>

          {/* Quick on-chain facts */}
          <div className="sd-levelgrid">
            <div className="sd-levelbox"><span>Harga</span><strong>{formatUsd(result.priceUsd)}</strong></div>
            <div className="sd-levelbox"><span>Likuiditas</span><strong>{formatUsd(result.liquidityUsd)}</strong></div>
            <div className="sd-levelbox"><span>Mint</span><strong className={flags.mintRevoked === true ? 'text-green' : flags.mintRevoked === false ? 'text-red' : 'text-muted'}>{flags.mintRevoked == null ? '—' : flags.mintRevoked ? 'Revoked' : 'Terbuka'}</strong></div>
            <div className="sd-levelbox"><span>Freeze</span><strong className={flags.freezeActive === false ? 'text-green' : flags.freezeActive === true ? 'text-red' : 'text-muted'}>{flags.freezeActive == null ? '—' : flags.freezeActive ? 'Aktif' : 'Nonaktif'}</strong></div>
            <div className="sd-levelbox"><span>Top 10</span><strong className={flags.top10Pct == null ? 'text-muted' : flags.top10Pct > 55 ? 'text-red' : 'text-green'}>{flags.top10Pct == null ? '—' : `${Number(flags.top10Pct).toFixed(1)}%`}</strong></div>
            <div className="sd-levelbox"><span>Bundle proxy</span><strong className={flags.commonFunderWallets == null ? 'text-muted' : flags.commonFunderWallets >= 5 ? 'text-red' : 'text-green'}>{flags.commonFunderWallets == null ? '—' : flags.commonFunderWallets}</strong></div>
          </div>

          {/* CA + chart */}
          <div className="sd-ca-row">
            <code title={result.ca}>{shortAddr(result.ca)}</code>
            <button type="button" className="icon-btn" onClick={copyCa} title="Salin CA">
              {copied ? <Check size={14} className="text-green" /> : <Copy size={14} />}
            </button>
            <a className="icon-btn chart" href={result.url || `https://dexscreener.com/solana/${result.ca}`} target="_blank" rel="noopener noreferrer">
              <LineChart size={14} /> Chart
            </a>
          </div>

          {/* Checks */}
          {report?.checks?.length > 0 && (
            <div className="sd-checks">
              {report.checks.map((c, i) => (
                <div className="sd-check" key={i}>
                  <CheckIcon status={c.status} />
                  <div><strong>{c.label}</strong><span>{c.detail}</span></div>
                </div>
              ))}
            </div>
          )}

          <p className="sd-disclaimer">
            Verdict otomatis dari data live (DexScreener / Solana RPC / Birdeye / Jupiter / Pyth). Tetap DYOR sebelum entry.
          </p>
        </div>
      )}
    </div>
  );
}
