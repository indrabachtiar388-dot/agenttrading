/**
 * TradingStyleSelector.jsx — Pemilih Gaya Trading
 *
 * User memilih gaya: Konservatif / Seimbang / Agresif (Hyper).
 * Setiap gaya mengatur maksimum posisi, grade yang dikejar, dan kecepatan rotasi.
 * Saat satu posisi close, slot langsung diisi momentum terbaru sesuai gaya.
 */

import { Shield, Scale, Flame, Check, Layers } from 'lucide-react';
import { TRADING_STYLES } from '../data/tradingStyle';

const ICON_MAP = { Shield, Scale, Flame };

export default function TradingStyleSelector({ activeStyleId, onSelect, slotsUsed = 0 }) {
  const styles = Object.values(TRADING_STYLES);

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h3>Gaya Trading</h3>
          <p className="panel-subtitle">
            Pilih ritme agent. Gaya menentukan jumlah posisi aktif, grade yang dikejar,
            dan seberapa cepat slot kosong diisi momentum terbaru.
          </p>
        </div>
      </div>

      <div className="style-grid">
        {styles.map((style) => {
          const Icon = ICON_MAP[style.icon] || Scale;
          const isActive = activeStyleId === style.id;

          return (
            <button
              key={style.id}
              type="button"
              className={`style-card ${isActive ? 'active' : ''}`}
              onClick={() => onSelect(style.id)}
              style={{ '--style-accent': style.accent }}
            >
              <div className="style-card-head">
                <div className="style-icon" style={{ color: style.accent, background: `${style.accent}14` }}>
                  <Icon size={20} />
                </div>
                {isActive && (
                  <span className="style-active-badge">
                    <Check size={12} /> Aktif
                  </span>
                )}
              </div>

              <div className="style-card-body">
                <strong>{style.label}</strong>
                <span className="style-tagline">{style.tagline}</span>
                <p className="style-desc">{style.description}</p>
              </div>

              <div className="style-specs">
                <div className="style-spec">
                  <Layers size={13} />
                  <span>Maks {style.maxPositions} posisi</span>
                </div>
                <div className="style-spec">
                  <span className="spec-dot" style={{ background: style.accent }} />
                  <span>Grade {style.allowedGrades.join('/')}</span>
                </div>
                <div className="style-spec">
                  <span className="spec-label">Min konfidensi</span>
                  <span className="spec-value">{style.minConfidence}%</span>
                </div>
                <div className="style-spec">
                  <span className="spec-label">Rotasi</span>
                  <span className="spec-value">{formatCooldown(style.rotationCooldownMs)}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {activeStyleId && (
        <div className="style-active-note">
          <strong>{TRADING_STYLES[activeStyleId]?.label}:</strong>{' '}
          {slotsUsed}/{TRADING_STYLES[activeStyleId]?.maxPositions} slot terisi.
          {slotsUsed < TRADING_STYLES[activeStyleId]?.maxPositions
            ? ' Slot kosong akan diisi sinyal terfresh pada scan berikutnya.'
            : ' Semua slot penuh — menunggu satu posisi close untuk rotasi.'}
        </div>
      )}
    </div>
  );
}

function formatCooldown(ms) {
  const min = ms / 60000;
  if (min < 1) return `${Math.round(ms / 1000)} dtk`;
  return `${Math.round(min)} mnt`;
}
