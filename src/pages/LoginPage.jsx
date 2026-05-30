import { useState } from 'react';
import { ArrowLeft, Mail, Lock, Wallet } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';

export default function LoginPage({ onBack }) {
  const { login, connectWallet } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Email dan password wajib diisi.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const ok = login(email.trim(), password);
      if (!ok) setError('Login gagal. Coba lagi.');
      setLoading(false);
    }, 600);
  };

  const handleWallet = () => {
    setLoading(true);
    setTimeout(() => {
      connectWallet();
      setLoading(false);
    }, 800);
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <button type="button" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 13, fontWeight: 700, marginBottom: 18 }}>
          <ArrowLeft size={16} /> Kembali
        </button>

        <div className="brand">
          <div className="brand-mark">AI</div>
          <div>
            <strong style={{ display: 'block', fontSize: '1.05rem' }}>MemeAgent</strong>
            <small style={{ color: 'var(--muted)', fontSize: 12 }}>Auto Trading Solana</small>
          </div>
        </div>

        <h2>Masuk ke Dasbor</h2>
        <p className="sub">Login untuk mengakses agent trading dan sinyal live.</p>

        <form onSubmit={handleSubmit}>
          <div className="login-field">
            <label>Email</label>
            <input
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="login-field">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            <Mail size={16} />
            {loading ? 'Memuat...' : 'Masuk'}
          </button>
        </form>

        <div className="login-divider">atau</div>

        <button type="button" className="wallet-btn" onClick={handleWallet} disabled={loading}>
          <Wallet size={18} />
          {loading ? 'Menghubungkan...' : 'Hubungkan Wallet'}
        </button>

        {error && <div className="login-error">{error}</div>}

        <p style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
          Belum punya akun? Langsung login saja — kami akan buatkan otomatis.
        </p>
      </div>
    </div>
  );
}
