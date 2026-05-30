import {
  Radar,
  TrendingUp,
  ShieldCheck,
  BookOpen,
  LineChart,
  Lock,
  Activity,
  Gauge,
  Layers
} from 'lucide-react';

const FEATURES = [
  {
    icon: Radar,
    title: 'Pemindai Sinyal Otomatis',
    text: 'Engine memantau token memecoin Solana real-time dan hanya memunculkan setup yang lolos filter — bukan semua pair. Fokus ke yang terbaik.'
  },
  {
    icon: TrendingUp,
    title: 'Grade & Level Jelas',
    text: 'Tiap sinyal diberi grade (A+, A, atau High Risk) lengkap dengan harga Entry, Stop Loss, dan Take Profit yang dihitung relatif per token.'
  },
  {
    icon: BookOpen,
    title: 'Penjelasan Lengkap',
    text: 'Bukan sekadar angka. Setiap sinyal punya narasi: kenapa entry, integritas volume, distribusi holder, deteksi rug, sampai prinsip analisa.'
  },
  {
    icon: Gauge,
    title: 'Backtest Berjalan',
    text: 'Sinyal terbaik di-entry virtual otomatis lalu dilacak hingga menyentuh TP atau SL. Lihat win rate, ekspektansi, dan kurva ekuitas secara live.'
  },
  {
    icon: ShieldCheck,
    title: 'Deteksi Risiko',
    text: 'Authority contract, bundle/cabal, wash trading, dan penarikan likuiditas dipindai otomatis untuk menyaring jebakan sebelum masuk daftar.'
  },
  {
    icon: LineChart,
    title: 'Salin CA & Chart',
    text: 'Setiap sinyal bisa langsung disalin contract address-nya atau dibuka chartnya untuk verifikasi mandiri dalam satu klik.'
  }
];

const STEPS = [
  { no: '01', title: 'Pindai', text: 'Engine menarik data on-chain & pasar, menilai struktur, momentum, dan risiko tiap token.' },
  { no: '02', title: 'Saring', text: 'Hanya grade A+/A dan sebagian kecil High Risk terbaik yang lolos jadi sinyal.' },
  { no: '03', title: 'Lacak', text: 'Sinyal di-entry virtual dan dipantau real-time sampai TP atau SL tersentuh.' },
  { no: '04', title: 'Pelajari', text: 'Baca narasi lengkap tiap sinyal dan ukur performa lewat statistik backtest.' }
];

export default function LandingPage({ onLogin }) {
  return (
    <div className="landing-shell">
      <header className="landing-header">
        <div className="landing-brand">
          <div className="landing-brand-mark">AI</div>
          <div className="landing-brand-text">
            <strong>MemeAgent</strong>
            <small>Sinyal & Backtest Solana</small>
          </div>
        </div>
        <span className="landing-status">Engine Online</span>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="landing-eyebrow">Solana Memecoin Signal Engine</span>
          <h1>
            Sinyal Memecoin yang <span>Bisa Kamu Pahami</span>.
          </h1>
          <p>
            Engine memindai pasar memecoin Solana, menyaring setup terbaik, dan
            menjelaskan alasannya — entry, stop loss, take profit, hingga analisa
            risiko. Semua dilacak otomatis dalam mode backtest.
          </p>

          <div className="landing-cta">
            <button type="button" className="btn-primary" onClick={onLogin}>
              <Lock size={18} />
              Masuk ke Dasbor
            </button>
            <button type="button" className="btn-secondary" onClick={() => document.getElementById('fitur')?.scrollIntoView({ behavior: 'smooth' })}>
              Lihat Cara Kerja
            </button>
          </div>
          <p className="landing-cta-note">
            <strong>Mode backtest — bukan eksekusi on-chain.</strong> Sinyal & PnL adalah
            simulasi dari data live untuk riset. Bukan saran finansial, selalu DYOR.
          </p>
        </div>

        <div className="panel landing-preview">
          <div className="panel-header">
            <h3 style={{ margin: 0 }}>Contoh Sinyal</h3>
            <div className="live-dot"><span />Live</div>
          </div>
          <div className="lp-signal">
            <div className="lp-signal-head">
              <div>
                <strong>$WIF</strong>
                <span>dogwifhat</span>
              </div>
              <span className="badge" style={{ background: 'rgba(34,197,94,0.18)', color: 'var(--green)', border: '1px solid rgba(34,197,94,0.4)' }}>A+</span>
            </div>
            <div className="lp-signal-levels">
              <div><span>Entry</span><strong>$0.0024</strong></div>
              <div><span>SL</span><strong className="text-red">-8%</strong></div>
              <div><span>TP</span><strong className="text-green">+28%</strong></div>
              <div><span>PnL</span><strong className="text-green">+14.2%</strong></div>
            </div>
            <p className="lp-signal-note">
              "Setup kuat — momentum M5 positif, buy pressure dominan, integritas
              volume sehat, authority aman."
            </p>
          </div>
          <div className="scan-mini">
            <div className="spinner" />
            Engine memindai token baru...
          </div>
        </div>
      </section>

      <section id="fitur">
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-header">
            <h3 style={{ margin: 0 }}>Cara Kerja</h3>
          </div>
          <div className="landing-steps">
            {STEPS.map((s) => (
              <div className="landing-step" key={s.no}>
                <span className="landing-step-no">{s.no}</span>
                <strong>{s.title}</strong>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="landing-features">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <article className="feature-card" key={title}>
              <div className="feature-icon">
                <Icon size={20} />
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ textAlign: 'center', padding: '24px 0' }}>
        <h2 style={{ margin: '0 0 10px', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}>
          Sinyal yang Transparan
        </h2>
        <p style={{ color: 'var(--muted)', maxWidth: 540, margin: '0 auto 22px' }}>
          Tanpa kotak hitam. Setiap keputusan engine bisa dibaca alasannya, lengkap
          dengan metrik dan deteksi risikonya. Kamu yang menilai, engine yang memindai.
        </p>
        <button type="button" className="btn-primary" onClick={onLogin}>
          <Activity size={18} />
          Mulai Pantau Sinyal
        </button>
      </section>

      <footer className="landing-footer">
        <span>MemeAgent · Sinyal & Backtest Solana</span>
        <span>Data dan sinyal bukan saran finansial. Selalu pahami risiko trading.</span>
      </footer>
    </div>
  );
}
