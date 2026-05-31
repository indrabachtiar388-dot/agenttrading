/**
 * SecureLoginPage.jsx — Secure Login Page dengan Wallet Integration
 *
 * Menggantikan LoginPage.jsx yang lama dengan sistem yang aman
 */

import { useState } from 'react';
import { ArrowLeft, Shield, Lock, Zap, TrendingUp } from 'lucide-react';
import { useAuth } from '../hooks/useSecureAuth';
import WalletConnect from '../components/WalletConnect';

export default function SecureLoginPage({ onBack }) {
  const { connectWallet } = useAuth();
  const [showWalletConnect, setShowWalletConnect] = useState(false);
  const [error, setError] = useState('');

  const handleWalletConnect = async (walletData) => {
    setError('');

    try {
      const success = await connectWallet(walletData);
      if (!success) {
        setError('Gagal menghubungkan wallet. Coba lagi.');
      }
      // onBack akan dipanggil otomatis oleh App.jsx saat user terdeteksi
    } catch (err) {
      setError('Error: ' + err.message);
    }
  };

  if (showWalletConnect) {
    return (
      <WalletConnect
        onConnect={handleWalletConnect}
        onCancel={() => setShowWalletConnect(false)}
      />
    );
  }

  return (
    <div className="login-shell">
      <div className="login-hero">
        <button
          type="button"
          onClick={onBack}
          className="back-button"
        >
          <ArrowLeft size={16} /> Kembali
        </button>

        <div className="brand-large">
          <div className="brand-mark-large">AI</div>
          <div>
            <h1>MemeAgent</h1>
            <p className="tagline">Signal Intelligence untuk Solana Memecoin</p>
          </div>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <TrendingUp size={24} />
            </div>
            <h3>Smart Signal Detection</h3>
            <p>AI-powered analysis untuk deteksi peluang entry terbaik dengan risk management adaptif</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Shield size={24} />
            </div>
            <h3>Rug Detection Engine</h3>
            <p>Multi-layer protection: authority check, holder analysis, volume integrity, dan blacklist verification</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Zap size={24} />
            </div>
            <h3>Auto Trading Agent</h3>
            <p>Partial TP bertingkat + trailing stop adaptif untuk capture 5x-50x runner tanpa exit prematur</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Lock size={24} />
            </div>
            <h3>Encrypted & Secure</h3>
            <p>Private key dienkripsi AES-256-GCM, tidak pernah dikirim ke server, full control di tangan Anda</p>
          </div>
        </div>

        <div className="cta-section">
          <button
            className="btn-primary btn-large"
            onClick={() => setShowWalletConnect(true)}
          >
            <Shield size={20} />
            Hubungkan Wallet Aman
          </button>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="security-badges">
            <div className="badge">
              <Lock size={14} />
              <span>AES-256 Encryption</span>
            </div>
            <div className="badge">
              <Shield size={14} />
              <span>Non-Custodial</span>
            </div>
            <div className="badge">
              <Zap size={14} />
              <span>Open Source</span>
            </div>
          </div>
        </div>

        <div className="disclaimer">
          <h4>⚠️ Mode Backtest</h4>
          <p>
            Saat ini aplikasi masih dalam <strong>mode backtest/simulasi</strong>.
            Trading signals dan entry/exit adalah simulasi virtual untuk evaluasi strategi.
            Tidak ada transaksi on-chain yang dieksekusi secara otomatis.
          </p>
          <p>
            Wallet connection digunakan untuk verifikasi ownership dan persiapan fitur live trading di masa depan.
            <strong>Dana Anda tetap aman</strong> dan tidak akan disentuh tanpa konfirmasi eksplisit dari Anda.
          </p>
        </div>
      </div>
    </div>
  );
}
