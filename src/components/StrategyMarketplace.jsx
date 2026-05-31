/**
 * StrategyMarketplace.jsx — Marketplace Strategi Trading
 *
 * Fitur:
 * - Jelajah strategi yang dibagikan (built-in + komunitas)
 * - Share strategi custom (publish)
 * - Import strategi dari JSON orang lain
 * - Rating & review (1-5 bintang + komentar)
 * - Statistik performa per strategi (win rate, avg PnL, trades, drawdown)
 */

import { useMemo, useState } from 'react';
import {
  Store, Star, Upload, Download, Plus, X, TrendingUp, Activity, AlertTriangle, Copy,
} from 'lucide-react';
import {
  getStrategies,
  shareStrategy,
  importStrategy,
  exportStrategy,
  addReview,
} from '../data/strategyStore';

const SORTS = [
  { key: 'rating', label: 'Rating' },
  { key: 'winrate', label: 'Win Rate' },
  { key: 'pnl', label: 'Avg PnL' },
  { key: 'popular', label: 'Populer' },
  { key: 'newest', label: 'Terbaru' },
];

export default function StrategyMarketplace({ currentUser = 'anon' }) {
  const [sort, setSort] = useState('rating');
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [toast, setToast] = useState('');

  const strategies = useMemo(
    () => getStrategies({ sort }),
    [sort, refresh]
  );

  const bump = () => setRefresh((v) => v + 1);
  const notify = (m) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  return (
    <div className="panel strategy-marketplace">
      <div className="panel-header">
        <div>
          <h3><Store size={18} style={{ verticalAlign: '-3px', marginRight: 6 }} />Marketplace Strategi</h3>
          <p className="panel-subtitle">
            Bagikan, impor, dan nilai strategi trading dari komunitas MemeAgent.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn-secondary" style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => setShowImport(true)}>
            <Upload size={14} /> Impor
          </button>
          <button type="button" className="btn-primary" style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => setShowShare(true)}>
            <Plus size={14} /> Bagikan Strategi
          </button>
        </div>
      </div>

      <div className="filter-chips" style={{ marginBottom: 14 }}>
        {SORTS.map(({ key, label }) => (
          <button key={key} type="button" className={`chip ${sort === key ? 'active' : ''}`} onClick={() => setSort(key)}>
            {label}
          </button>
        ))}
      </div>

      <div className="strategy-grid">
        {strategies.map((s) => (
          <StrategyCard key={s.id} strategy={s} onOpen={() => setSelected(s.id)} />
        ))}
      </div>

      {selected && (
        <StrategyDetailModal
          strategyId={selected}
          currentUser={currentUser}
          onClose={() => setSelected(null)}
          onReview={(payload) => {
            addReview(selected, payload);
            bump();
            notify('Review ditambahkan');
          }}
          onExport={() => {
            const json = exportStrategy(selected);
            copyToClipboard(json);
            notify('JSON strategi disalin ke clipboard');
          }}
        />
      )}

      {showShare && (
        <ShareStrategyModal
          currentUser={currentUser}
          onClose={() => setShowShare(false)}
          onSubmit={(data) => {
            try {
              shareStrategy(data);
              bump();
              setShowShare(false);
              notify('Strategi berhasil dibagikan');
            } catch (err) {
              notify('Gagal: ' + err.message);
            }
          }}
        />
      )}

      {showImport && (
        <ImportStrategyModal
          onClose={() => setShowImport(false)}
          onSubmit={(json) => {
            try {
              importStrategy(json);
              bump();
              setShowImport(false);
              notify('Strategi berhasil diimpor');
            } catch (err) {
              notify('Gagal impor: ' + err.message);
            }
          }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function StrategyCard({ strategy, onOpen }) {
  const st = strategy.stats || {};
  return (
    <button type="button" className="strategy-card" onClick={onOpen}>
      <div className="sc-top">
        <strong>{strategy.name}</strong>
        {strategy.builtin && <span className="badge badge-builtin">Resmi</span>}
      </div>
      <div className="sc-author">oleh {strategy.author}</div>
      <p className="sc-desc">{strategy.description}</p>
      <div className="sc-stats">
        <span title="Win rate"><Activity size={12} /> {Math.round(st.winRate || 0)}%</span>
        <span title="Avg PnL" className={(st.avgPnl || 0) >= 0 ? 'text-green' : 'text-red'}>
          <TrendingUp size={12} /> {(st.avgPnl || 0) >= 0 ? '+' : ''}{Math.round(st.avgPnl || 0)}%
        </span>
        <span title="Jumlah trade">{st.trades || 0} trades</span>
      </div>
      <div className="sc-rating">
        <Stars value={strategy.avgRating} />
        <span className="sc-rating-num">
          {strategy.avgRating || '—'} ({strategy.reviewCount})
        </span>
      </div>
    </button>
  );
}

function StrategyDetailModal({ strategyId, currentUser, onClose, onReview, onExport }) {
  const strategy = useMemo(() => getStrategies().find((s) => s.id === strategyId), [strategyId]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  if (!strategy) return null;
  const st = strategy.stats || {};

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card strategy-detail" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>{strategy.name}</h3>
            <small>oleh {strategy.author}</small>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <p className="sd-desc">{strategy.description}</p>

        <div className="sd-stat-grid">
          <div><span>Win Rate</span><strong>{Math.round(st.winRate || 0)}%</strong></div>
          <div><span>Avg PnL</span><strong className={(st.avgPnl || 0) >= 0 ? 'text-green' : 'text-red'}>{(st.avgPnl || 0) >= 0 ? '+' : ''}{Math.round(st.avgPnl || 0)}%</strong></div>
          <div><span>Trades</span><strong>{st.trades || 0}</strong></div>
          <div><span>Max DD</span><strong className="text-red">{Math.round(st.maxDrawdown || 0)}%</strong></div>
        </div>

        <div className="sd-section">
          <h4>Parameter</h4>
          <pre className="sd-params">{JSON.stringify(strategy.params, null, 2)}</pre>
          <button type="button" className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={onExport}>
            <Copy size={13} /> Salin JSON (untuk dibagikan)
          </button>
        </div>

        <div className="sd-section">
          <h4>Ulasan ({strategy.reviewCount})</h4>
          <div className="sd-reviews">
            {(strategy.reviews || []).slice().reverse().slice(0, 8).map((r, i) => (
              <div key={i} className="sd-review">
                <div className="sd-review-head">
                  <span className="lb-avatar">{(r.user[0] || '?').toUpperCase()}</span>
                  <strong>{r.user}</strong>
                  <Stars value={r.rating} small />
                </div>
                {r.comment && <p>{r.comment}</p>}
              </div>
            ))}
            {!strategy.reviewCount && <div className="empty-state" style={{ padding: 16 }}>Belum ada ulasan.</div>}
          </div>
        </div>

        <div className="sd-section sd-add-review">
          <h4>Tulis Ulasan</h4>
          <div className="sd-review-input">
            <StarPicker value={rating} onChange={setRating} />
            <input
              type="text"
              placeholder="Komentar (opsional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={280}
            />
            <button
              type="button"
              className="btn-primary"
              style={{ fontSize: 13, padding: '8px 14px' }}
              onClick={() => { onReview({ user: currentUser, rating, comment }); setComment(''); }}
            >
              Kirim
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShareStrategyModal({ currentUser, onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    minGrade: 'A',
    minConfidence: 75,
    slPct: 15,
    tpTiers: '1.2, 1.5, 2.5',
    trailing: true,
    winRate: '',
    avgPnl: '',
    trades: '',
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.name.trim()) return;
    const tpTiers = form.tpTiers
      .split(',')
      .map((x) => parseFloat(x.trim()))
      .filter((x) => Number.isFinite(x));
    onSubmit({
      name: form.name.trim(),
      author: currentUser,
      description: form.description.trim(),
      params: {
        minGrade: form.minGrade,
        minConfidence: Number(form.minConfidence) || 0,
        slPct: Number(form.slPct) || 0,
        tpTiers: tpTiers.length ? tpTiers : [1.5],
        trailing: !!form.trailing,
      },
      stats: {
        winRate: Number(form.winRate) || 0,
        avgPnl: Number(form.avgPnl) || 0,
        trades: Number(form.trades) || 0,
      },
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Bagikan Strategi</h3>
          <button type="button" className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="form-grid">
          <label>Nama Strategi
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="mis. Aggressive Runner" />
          </label>
          <label>Deskripsi
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} placeholder="Cara kerja singkat..." />
          </label>
          <div className="form-row">
            <label>Min Grade
              <select value={form.minGrade} onChange={(e) => set('minGrade', e.target.value)}>
                <option>A+</option><option>A</option><option>B</option>
              </select>
            </label>
            <label>Min Confidence (%)
              <input type="number" value={form.minConfidence} onChange={(e) => set('minConfidence', e.target.value)} />
            </label>
            <label>SL (%)
              <input type="number" value={form.slPct} onChange={(e) => set('slPct', e.target.value)} />
            </label>
          </div>
          <label>TP Tiers (pisah koma)
            <input type="text" value={form.tpTiers} onChange={(e) => set('tpTiers', e.target.value)} placeholder="1.2, 1.5, 2.5" />
          </label>
          <label className="form-check">
            <input type="checkbox" checked={form.trailing} onChange={(e) => set('trailing', e.target.checked)} />
            Trailing stop aktif
          </label>
          <div className="form-row">
            <label>Win Rate (%)
              <input type="number" value={form.winRate} onChange={(e) => set('winRate', e.target.value)} placeholder="opsional" />
            </label>
            <label>Avg PnL (%)
              <input type="number" value={form.avgPnl} onChange={(e) => set('avgPnl', e.target.value)} placeholder="opsional" />
            </label>
            <label>Trades
              <input type="number" value={form.trades} onChange={(e) => set('trades', e.target.value)} placeholder="opsional" />
            </label>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
          <button type="button" className="btn-primary" onClick={submit} disabled={!form.name.trim()}>Publish</button>
        </div>
      </div>
    </div>
  );
}

function ImportStrategyModal({ onClose, onSubmit }) {
  const [json, setJson] = useState('');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Impor Strategi</h3>
          <button type="button" className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <p className="panel-subtitle" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <AlertTriangle size={14} /> Tempel JSON strategi yang dibagikan orang lain.
        </p>
        <textarea
          className="import-textarea"
          rows={10}
          value={json}
          onChange={(e) => setJson(e.target.value)}
          placeholder='{"name":"...","params":{...}}'
        />
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
          <button type="button" className="btn-primary" onClick={() => onSubmit(json)} disabled={!json.trim()}>
            <Download size={14} /> Impor
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Bintang rating
// ----------------------------------------------------------------------------
function Stars({ value = 0, small = false }) {
  const size = small ? 12 : 14;
  return (
    <span className="stars" aria-label={`${value} dari 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= Math.round(value) ? 'star-filled' : 'star-empty'}
          fill={i <= Math.round(value) ? 'currentColor' : 'none'}
        />
      ))}
    </span>
  );
}

function StarPicker({ value, onChange }) {
  return (
    <span className="star-picker">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" onClick={() => onChange(i)} aria-label={`${i} bintang`}>
          <Star size={20} className={i <= value ? 'star-filled' : 'star-empty'} fill={i <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
    </span>
  );
}

function copyToClipboard(text) {
  try {
    if (navigator.clipboard) navigator.clipboard.writeText(text);
  } catch { /* ignore */ }
}
