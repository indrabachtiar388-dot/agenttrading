/**
 * LiveTradingPanel.jsx — Live Trading Control Panel
 *
 * Panel untuk mengatur dan monitor live trading
 */

import { useState } from 'react';
import { Zap, Settings, AlertTriangle, CheckCircle, DollarSign, TrendingUp, Shield } from 'lucide-react';
import { useLiveTrading } from '../hooks/useLiveTrading';

export default function LiveTradingPanel() {
  const {
    settings,
    updateSettings,
    stats,
    activeTrades,
    isEnabled,
    isReady
  } = useLiveTrading();

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleToggleLiveTrading = () => {
    if (!isEnabled) {
      // Show warning before enabling
      const confirm = window.confirm(
        '⚠️ PERINGATAN: Live trading akan mengeksekusi transaksi on-chain dengan dana real.\n\n' +
        'Pastikan Anda memahami risiko:\n' +
        '- Dana bisa hilang karena volatilitas\n' +
        '- Slippage bisa terjadi\n' +
        '- Gas fees akan dikenakan\n\n' +
        'Lanjutkan?'
      );

      if (!confirm) return;
    }

    updateSettings({ enabled: !isEnabled });
  };

  const handleToggleAutoExecute = () => {
    updateSettings({ autoExecute: !settings.autoExecute });
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h3>Live Trading Control</h3>
          <p className="panel-subtitle">
            Eksekusi trade otomatis on-chain dengan wallet Anda
          </p>
        </div>
        <div className="live-dot" style={{ color: isEnabled ? 'var(--green)' : 'var(--muted)' }}>
          <span style={{
            background: isEnabled ? 'var(--green)' : 'var(--muted)',
            animation: isEnabled ? 'pulse-dot 1.4s ease-out infinite' : 'none'
          }} />
          {isEnabled ? 'Live Trading Aktif' : 'Live Trading Off'}
        </div>
      </div>

      {/* Warning Banner */}
      {!isReady && (
        <div className="warning-box" style={{ marginBottom: 20 }}>
          <AlertTriangle size={20} />
          <div>
            <strong>Wallet Tidak Siap</strong>
            <p>
              Wallet Anda tidak mendukung transaction signing atau belum terkoneksi.
              Gunakan wallet yang support signing (Import Private Key atau Generate Wallet).
            </p>
          </div>
        </div>
      )}

      {/* Main Toggle */}
      <div className="agent-control">
        <div className="toggle-row">
          <button
            type="button"
            className={`toggle ${isEnabled ? 'on' : ''}`}
            onClick={handleToggleLiveTrading}
            disabled={!isReady}
            aria-label="Toggle live trading"
          />
          <div>
            <strong style={{ fontSize: 15 }}>Enable Live Trading</strong>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              Aktifkan untuk mengeksekusi trade real on-chain. Dana Anda akan digunakan untuk trading.
            </div>
          </div>
        </div>

        {isEnabled && (
          <div className="toggle-row" style={{ marginTop: 16 }}>
            <button
              type="button"
              className={`toggle ${settings.autoExecute ? 'on' : ''}`}
              onClick={handleToggleAutoExecute}
              aria-label="Toggle auto execute"
            />
            <div>
              <strong style={{ fontSize: 15 }}>Auto-Execute Signals</strong>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                Otomatis buy saat signal grade A+/A muncul
                {settings.confirmBeforeTrade && ' (dengan konfirmasi)'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      {isEnabled && (
        <div className="live-stats" style={{ marginTop: 20 }}>
          <div className="stat-item">
            <TrendingUp size={16} />
            <div>
              <span>Active Positions</span>
              <strong>{stats.active}</strong>
            </div>
          </div>
          <div className="stat-item">
            <CheckCircle size={16} />
            <div>
              <span>Win Rate</span>
              <strong>{stats.total ? stats.winRate.toFixed(1) : '0'}%</strong>
            </div>
          </div>
          <div className="stat-item">
            <DollarSign size={16} />
            <div>
              <span>Total Volume</span>
              <strong>{stats.totalVolume.toFixed(2)} SOL</strong>
            </div>
          </div>
        </div>
      )}

      {/* Settings */}
      {isEnabled && (
        <div style={{ marginTop: 20 }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: 13, padding: '10px 16px', width: '100%' }}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Settings size={14} />
            {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
          </button>

          {showAdvanced && (
            <div className="advanced-settings" style={{ marginTop: 16 }}>
              <div className="setting-item">
                <label>Risk Per Trade (%)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  step="0.5"
                  value={settings.riskPercentage}
                  onChange={(e) => updateSettings({ riskPercentage: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--panel-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text)',
                    fontSize: 14
                  }}
                />
                <small style={{ color: 'var(--muted)', fontSize: 11 }}>
                  Persentase balance untuk setiap trade (1-10%)
                </small>
              </div>

              <div className="setting-item" style={{ marginTop: 16 }}>
                <label>Max Positions</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={settings.maxPositions}
                  onChange={(e) => updateSettings({ maxPositions: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--panel-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text)',
                    fontSize: 14
                  }}
                />
                <small style={{ color: 'var(--muted)', fontSize: 11 }}>
                  Maximum posisi aktif bersamaan (1-20)
                </small>
              </div>

              <div className="setting-item" style={{ marginTop: 16 }}>
                <label>Min Confidence (%)</label>
                <input
                  type="number"
                  min="50"
                  max="95"
                  step="5"
                  value={settings.minConfidence}
                  onChange={(e) => updateSettings({ minConfidence: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--panel-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text)',
                    fontSize: 14
                  }}
                />
                <small style={{ color: 'var(--muted)', fontSize: 11 }}>
                  Minimum confidence score untuk auto-execute (50-95%)
                </small>
              </div>

              <div className="setting-item" style={{ marginTop: 16 }}>
                <label>Slippage Tolerance (%)</label>
                <input
                  type="number"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={settings.slippageBps / 100}
                  onChange={(e) => updateSettings({ slippageBps: Number(e.target.value) * 100 })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--panel-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text)',
                    fontSize: 14
                  }}
                />
                <small style={{ color: 'var(--muted)', fontSize: 11 }}>
                  Maximum slippage yang diizinkan (0.1-5%)
                </small>
              </div>

              <div className="setting-item" style={{ marginTop: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={settings.confirmBeforeTrade}
                    onChange={(e) => updateSettings({ confirmBeforeTrade: e.target.checked })}
                  />
                  <span>Confirm Before Trade</span>
                </label>
                <small style={{ color: 'var(--muted)', fontSize: 11, display: 'block', marginTop: 4 }}>
                  Minta konfirmasi sebelum eksekusi trade (recommended)
                </small>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <div className="security-notice" style={{ marginTop: 20, background: 'var(--amber-soft)', borderColor: 'var(--amber)' }}>
        <Shield size={14} style={{ color: 'var(--amber)' }} />
        <p style={{ color: 'var(--text)' }}>
          <strong>PENTING:</strong> Live trading menggunakan dana real. Pastikan Anda memahami risiko.
          Mulai dengan amount kecil untuk testing. Cryptocurrency trading memiliki risiko tinggi.
        </p>
      </div>
    </div>
  );
}
