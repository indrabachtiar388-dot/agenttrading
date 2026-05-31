/**
 * TradeConfirmationModal.jsx — Trade Confirmation Dialog
 *
 * Modal untuk konfirmasi trade sebelum eksekusi
 */

import { AlertTriangle, TrendingUp, DollarSign, Target, Shield } from 'lucide-react';

export default function TradeConfirmationModal({ trade, onConfirm, onCancel }) {
  if (!trade) return null;

  const { signal, amountSol } = trade;

  const estimatedTokens = amountSol / signal.priceUsd;
  const potentialProfit = (signal.tp - signal.entry) / signal.entry * 100;
  const potentialLoss = (signal.entry - signal.sl) / signal.entry * 100;

  return (
    <div className="wallet-connect-modal">
      <div className="wallet-connect-card" style={{ maxWidth: 480 }}>
        <h2>Konfirmasi Trade</h2>
        <p className="subtitle">Review detail trade sebelum eksekusi on-chain</p>

        {/* Token Info */}
        <div className="trade-info-box">
          <div className="trade-info-header">
            <div>
              <strong style={{ fontSize: 18 }}>{signal.ticker}</strong>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>
                {signal.name}
              </p>
            </div>
            <div className={`badge grade-${signal.grade.toLowerCase()}`}>
              {signal.grade}
            </div>
          </div>

          <div className="trade-info-grid">
            <div className="info-row">
              <span>Entry Price</span>
              <strong>${signal.priceUsd.toFixed(8)}</strong>
            </div>
            <div className="info-row">
              <span>Amount</span>
              <strong>{amountSol.toFixed(4)} SOL</strong>
            </div>
            <div className="info-row">
              <span>Est. Tokens</span>
              <strong>{estimatedTokens.toFixed(2)}</strong>
            </div>
          </div>
        </div>

        {/* Risk/Reward */}
        <div className="risk-reward-box">
          <div className="rr-item">
            <Target size={16} style={{ color: 'var(--green)' }} />
            <div>
              <span>Take Profit</span>
              <strong style={{ color: 'var(--green)' }}>
                +{potentialProfit.toFixed(1)}%
              </strong>
            </div>
          </div>
          <div className="rr-item">
            <Shield size={16} style={{ color: 'var(--red)' }} />
            <div>
              <span>Stop Loss</span>
              <strong style={{ color: 'var(--red)' }}>
                -{potentialLoss.toFixed(1)}%
              </strong>
            </div>
          </div>
          <div className="rr-item">
            <TrendingUp size={16} style={{ color: 'var(--cyan)' }} />
            <div>
              <span>Risk:Reward</span>
              <strong>1:{signal.rr?.toFixed(1) || '2.0'}</strong>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="warning-box">
          <AlertTriangle size={18} />
          <div>
            <strong>Konfirmasi Eksekusi</strong>
            <p>
              Trade ini akan dieksekusi on-chain. Dana {amountSol.toFixed(4)} SOL akan digunakan.
              Pastikan Anda memahami risiko sebelum melanjutkan.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="button-group" style={{ marginTop: 24 }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            style={{ flex: 1 }}
          >
            Batal
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={onConfirm}
            style={{ flex: 1 }}
          >
            <DollarSign size={16} />
            Konfirmasi Trade
          </button>
        </div>

        {/* Info */}
        <div className="security-notice" style={{ marginTop: 16 }}>
          <Shield size={12} />
          <p style={{ fontSize: 11 }}>
            Transaksi akan memerlukan approval di wallet Anda. Gas fees akan dikenakan.
          </p>
        </div>
      </div>
    </div>
  );
}
