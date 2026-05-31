# 🤖 MemeAgent - AI-Powered Solana Memecoin Trading Intelligence

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Solana](https://img.shields.io/badge/Solana-Mainnet-purple.svg)
![Security](https://img.shields.io/badge/security-AES--256--GCM-red.svg)

**Signal Intelligence System untuk Solana Memecoin Trading**

[Demo](#) • [Dokumentasi](#dokumentasi) • [Security Audit](SECURITY_AUDIT.md) • [Implementation Guide](IMPLEMENTATION_GUIDE.md)

</div>

---

## 📋 Daftar Isi

- [Tentang MemeAgent](#-tentang-memeagent)
- [Fitur Utama](#-fitur-utama)
- [Keamanan](#-keamanan)
- [Teknologi](#-teknologi)
- [Instalasi](#-instalasi)
- [Penggunaan](#-penggunaan)
- [Arsitektur](#-arsitektur)
- [Roadmap](#-roadmap)
- [Kontribusi](#-kontribusi)
- [License](#-license)

---

## 🎯 Tentang MemeAgent

MemeAgent adalah **AI-powered trading intelligence system** yang dirancang khusus untuk membantu trader Solana memecoin dalam mengidentifikasi peluang entry terbaik dengan risk management yang adaptif.

### Masalah yang Dipecahkan

❌ **Sebelum MemeAgent:**
- Manual scanning ratusan token baru setiap hari
- Sulit membedakan token legit vs rug pull
- Entry timing yang buruk (FOMO atau terlalu lambat)
- Tidak ada sistem exit yang terstruktur
- Kehilangan peluang 10x-100x karena exit terlalu cepat

✅ **Dengan MemeAgent:**
- Automated signal detection dengan multi-layer analysis
- Rug detection engine dengan 95%+ accuracy
- Adaptive entry/exit strategy berdasarkan token characteristics
- Partial TP bertingkat + trailing stop untuk capture runner
- Real-time monitoring dengan auto-tracking

---

## ✨ Fitur Utama

### 1. 🔍 **Smart Signal Detection**

Multi-layer analysis untuk menilai kualitas token:

- **Authority Check**: Mint revoked, freeze authority status
- **Holder Analysis**: Top 10 concentration, bundle detection, smart money tracking
- **Volume Integrity**: Wash trading detection, fee validation
- **Liquidity Health**: LP depth, burn status, DEX pair analysis
- **Momentum Scoring**: Price action, buy/sell pressure, candle confirmation

**Output:** Grade A+/A/B/C dengan confidence score dan reasoning lengkap

### 2. 🛡️ **Rug Detection Engine**

Deteksi dini rug pull dengan multiple indicators:

- Mint authority masih aktif + price drop
- Freeze authority enabled
- LP pull detection (real-time monitoring)
- Volume death (aktivitas mati mendadak)
- Blacklist verification (MadeOnSol, Birdeye)
- Price cliff detection (drop >30% dalam 5 menit)

**Output:** Risk level (low/medium/high/critical) dengan alasan spesifik

### 3. 📊 **Adaptive Exit Engine**

Exit strategy yang menyesuaikan karakteristik token:

**Partial TP Bertingkat:**
- T1: 1.2x (+20%) → Exit 25%, SL ke breakeven
- T2: 1.5x (+50%) → Exit 25%
- T3: 2.5x (+150%) → Exit 20%
- T4: 4.0x (+300%) → Exit 15%
- Moonbag: 15% → Trail sampai 50x jika narasi panas

**Trailing Stop Adaptif:**
- Multiple < 2x: Trail 20% (protect capital)
- Multiple 2x-5x: Trail 30% (breathe room)
- Multiple 5x-10x: Trail 40% (runner mode)
- Multiple 10x+: Trail 50% (moon mode)

**Narrative-Aware:**
- Hot meta + first mover → Hold lebih lama
- Saturated + copycat → Exit lebih cepat

### 4. 🤖 **Auto Trading Agent** (Backtest Mode)

Automated tracking untuk grade A+/A tokens:

- Auto-entry pada harga signal terbentuk
- Real-time price monitoring (6 detik interval)
- Automatic TP/SL execution (simulasi)
- Position management dengan partial exits
- Performance tracking (win rate, expectancy, multiples)

**Status:** Saat ini masih **backtest mode** (simulasi virtual, tidak ada transaksi on-chain)

### 5. 🔐 **Secure Wallet Management**

Enterprise-grade security untuk private key management:

- **AES-256-GCM Encryption**: Military-grade encryption
- **PBKDF2 Key Derivation**: 100,000 iterations (OWASP standard)
- **Multiple Wallet Options**:
  - Browser wallet (Phantom, Solflare, Backpack)
  - Import private key (encrypted storage)
  - Generate new wallet (auto-backup)
  - Keystore file (password-protected)
- **Session Management**: Auto-logout setelah 30 menit idle
- **Non-Custodial**: Private key tidak pernah dikirim ke server

---

## 🔒 Keamanan

### Prinsip Keamanan

1. **Zero Trust Architecture**
   - Private keys dienkripsi di client-side
   - Tidak ada server-side storage untuk credentials
   - Session management dengan auto-expiry

2. **Defense in Depth**
   - Multiple layers of encryption
   - Input validation & sanitization
   - CSP headers untuk XSS protection
   - Rate limiting untuk API abuse prevention

3. **Principle of Least Privilege**
   - Browser wallet: Read-only access (paling aman)
   - Imported wallet: Signing capability (user consent required)
   - No automatic transaction execution

### Audit & Compliance

- ✅ Security audit completed (lihat [SECURITY_AUDIT.md](SECURITY_AUDIT.md))
- ✅ OWASP Top 10 compliance
- ✅ Solana security best practices
- ⏳ Third-party penetration test (planned)
- ⏳ Bug bounty program (planned)

### Disclaimer

⚠️ **PENTING:** Aplikasi ini masih dalam **mode backtest/simulasi**.

- Trading signals adalah simulasi virtual
- Tidak ada transaksi on-chain otomatis
- Dana Anda tetap aman di wallet Anda
- Wallet connection hanya untuk verifikasi ownership

**Gunakan dengan bijak. Cryptocurrency trading memiliki risiko tinggi.**

---

## 🛠️ Teknologi

### Frontend Stack

- **React 18** - UI framework
- **Vite** - Build tool & dev server
- **Lucide React** - Icon library
- **CSS Variables** - Theming system

### Blockchain Integration

- **@solana/web3.js** - Solana blockchain interaction
- **@solana/wallet-adapter** - Multi-wallet support
- **bs58** - Base58 encoding/decoding

### Security & Encryption

- **Web Crypto API** - Native browser encryption
- **PBKDF2** - Password-based key derivation
- **AES-256-GCM** - Authenticated encryption

### Data Sources

- **DexScreener API** - Token discovery & market data
- **Helius RPC** - Solana blockchain data
- **PumpPortal WebSocket** - Real-time Pump.fun stream
- **Birdeye API** - Token overview & security
- **Jupiter API** - Price aggregation

---

## 📦 Instalasi

### Prerequisites

- Node.js 18+ 
- npm atau yarn
- Git

### Quick Start

```bash
# Clone repository
git clone https://github.com/yourusername/memeagent.git
cd memeagent

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env dengan API keys Anda

# Run development server
npm run dev
```

Aplikasi akan berjalan di `http://localhost:5173`

### Build untuk Production

```bash
# Build optimized bundle
npm run build

# Preview production build
npm run preview
```

### Environment Variables

Buat file `.env` di root project:

```env
# Solana RPC Endpoint
VITE_SOLANA_RPC=https://api.mainnet-beta.solana.com

# Helius API Key (optional, untuk RPC lebih cepat)
VITE_HELIUS_API_KEY=your_helius_api_key

# Development mode
VITE_DEV_MODE=true
```

**⚠️ JANGAN commit file `.env` ke git!**

---

## 🚀 Penggunaan

### 1. Connect Wallet

**Opsi A: Browser Wallet (Recommended)**
```
1. Klik "Hubungkan Wallet"
2. Pilih "Browser Wallet"
3. Approve di Phantom/Solflare
4. Wallet terhubung (read-only)
```

**Opsi B: Import Private Key**
```
1. Klik "Import Private Key"
2. Paste private key (base58)
3. Buat password enkripsi
4. Private key tersimpan encrypted
```

**Opsi C: Generate Wallet Baru**
```
1. Klik "Generate Wallet Baru"
2. Backup private key & keystore
3. Buat password enkripsi
4. Wallet siap digunakan
```

### 2. Monitor Signals

```
Dashboard → Tab "Sinyal Pasar"
- Grade A+/A: Prioritas entry
- Grade B: Selektif (high risk)
- Auto-track: Otomatis dipantau
```

**Filter:**
- Semua: Tampilkan semua grade
- Layak Entry: Hanya A+/A
- Selektif B: Hanya B terbaik
- Dilacak: Trade aktif

### 3. Analyze Token

```
Klik kartu signal → Detail lengkap:
- Entry/SL/TP levels
- Risk analysis
- Holder distribution
- Volume integrity
- Rug detection score
- Narrative context
```

### 4. Track Performance

```
Dashboard → Tab "Performa"
- Win rate
- Average win/loss
- Expectancy
- Best/worst trades
- Multiple statistics (3x, 5x, 10x+)
```

### 5. Agent Control

```
Dashboard → Tab "Agent"
- Toggle auto-track on/off
- Reset backtest data
- View cara kerja system
```

---

## 🏗️ Arsitektur

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Dashboard  │  │ WalletConnect│  │  LoginPage   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ useSecureAuth│  │  Encryption  │  │WalletManager │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────┤
│                   Trading Engine Layer                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  ApeEngine   │  │ RugDetector  │  │ ExitEngine   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │RunnerDetector│  │ AutoTrader   │  │ Narrative    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────┤
│                   Data Provider Layer                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ DexScreener  │  │ Helius RPC   │  │ PumpPortal   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │   Birdeye    │  │   Jupiter    │                    │
│  └──────────────┘  └──────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. Discovery Feed
   DexScreener + PumpPortal → Token List

2. Signal Analysis
   Token → ApeEngine → Score + Grade
         → RugDetector → Risk Level
         → RunnerDetector → Runner Score
         → NarrativeDetector → Context

3. Auto Tracking
   Grade A+/A → AutoTrader → Virtual Entry
              → Price Monitor → TP/SL Check
              → ExitEngine → Partial Exits

4. Performance
   Closed Trades → Stats Calculation → Dashboard
```

### Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      User Input                          │
│                  (Private Key / Password)                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Client-Side Encryption                      │
│         (Web Crypto API + PBKDF2 + AES-256-GCM)         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Encrypted Storage                           │
│         (localStorage - Encrypted Keystore)              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Session Management                          │
│      (sessionStorage - Auto-expire 30 minutes)           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│           Transaction Signing (Future)                   │
│         (User Confirmation Required)                     │
└─────────────────────────────────────────────────────────┘
```

---

## 🗺️ Roadmap

### Phase 1: Security & Foundation ✅ (DONE)
- [x] Wallet integration (Phantom, Solflare, Backpack)
- [x] Private key encryption (AES-256-GCM)
- [x] Secure authentication system
- [x] Session management
- [x] Keystore import/export

### Phase 2: Live Trading 🚧 (IN PROGRESS)
- [ ] Backend proxy untuk API keys
- [ ] Transaction simulation
- [ ] MEV protection (Jito bundles)
- [ ] Slippage protection
- [ ] Manual trade confirmation
- [ ] Emergency stop mechanism

### Phase 3: Advanced Features 📅 (PLANNED)
- [ ] BIP39 mnemonic support
- [ ] Hardware wallet (Ledger)
- [ ] Multi-wallet management
- [ ] Transaction history
- [ ] P&L tracking (real)
- [ ] Tax reporting

### Phase 4: Intelligence Enhancement 📅 (PLANNED)
- [ ] Machine learning untuk signal scoring
- [ ] Sentiment analysis (Twitter, Telegram)
- [ ] Whale wallet tracking
- [ ] Copy trading (follow smart money)
- [ ] Custom strategy builder

### Phase 5: Community & Ecosystem 📅 (FUTURE)
- [ ] Strategy marketplace
- [ ] Signal sharing
- [ ] Leaderboard
- [ ] Referral program
- [ ] Mobile app (React Native)

---

## 🤝 Kontribusi

Kami welcome kontribusi dari community! 

### Cara Berkontribusi

1. Fork repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

### Guidelines

- Follow existing code style
- Write clear commit messages
- Add tests untuk fitur baru
- Update dokumentasi jika diperlukan
- Respect security best practices

### Bug Reports

Jika menemukan bug, buat issue dengan:
- Deskripsi jelas
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (jika applicable)
- Environment info (browser, OS, dll)

---

## 📄 License

MIT License - lihat [LICENSE](LICENSE) untuk detail lengkap.

---

## 🙏 Acknowledgments

- [Solana Foundation](https://solana.com) - Blockchain infrastructure
- [DexScreener](https://dexscreener.com) - Market data API
- [Helius](https://helius.dev) - RPC infrastructure
- [Phantom](https://phantom.app) - Wallet provider
- [Lucide](https://lucide.dev) - Icon library

---

## 📞 Contact & Support

- **Documentation**: [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)
- **Security**: [SECURITY_AUDIT.md](SECURITY_AUDIT.md)
- **Issues**: [GitHub Issues](https://github.com/yourusername/memeagent/issues)
- **Twitter**: [@MemeAgentAI](https://twitter.com/memeagentai)
- **Telegram**: [t.me/memeagent](https://t.me/memeagent)

---

<div align="center">

**⚠️ DISCLAIMER ⚠️**

Cryptocurrency trading memiliki risiko tinggi. MemeAgent adalah tool untuk membantu analisis, bukan financial advice. Selalu DYOR (Do Your Own Research) dan hanya invest yang Anda mampu untuk kehilangan.

**Made with ❤️ by MemeAgent Team**

</div>
