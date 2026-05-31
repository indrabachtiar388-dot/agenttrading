# 🚀 IMPLEMENTASI GUIDE - MEMEAGENT SECURE

## 📦 Instalasi Dependencies

Jalankan command berikut untuk install semua dependencies yang diperlukan:

```bash
npm install
```

Dependencies baru yang ditambahkan:
- `@solana/web3.js` - Solana blockchain interaction
- `@solana/wallet-adapter-*` - Wallet integration (Phantom, Solflare, dll)
- `bs58` - Base58 encoding/decoding untuk private keys

---

## 🔧 Setup Environment Variables

Buat file `.env` di root project:

```env
# Solana RPC Endpoint (PENTING: Jangan expose API key di client!)
VITE_SOLANA_RPC=https://api.mainnet-beta.solana.com

# Helius API Key (Opsional, untuk RPC yang lebih cepat)
# JANGAN commit file .env ke git!
VITE_HELIUS_API_KEY=your_helius_api_key_here

# Mode Development
VITE_DEV_MODE=true
```

**PENTING:** Tambahkan `.env` ke `.gitignore`:

```bash
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

---

## 📁 Struktur File Baru

```
src/
├── utils/
│   ├── encryption.js          ✅ BARU - Client-side encryption utilities
│   └── walletManager.js        ✅ BARU - Wallet management dengan enkripsi
├── hooks/
│   ├── useAuth.jsx             ❌ LAMA - Diganti dengan useSecureAuth
│   └── useSecureAuth.jsx       ✅ BARU - Secure authentication hook
├── components/
│   └── WalletConnect.jsx       ✅ BARU - Wallet connection UI
├── pages/
│   ├── LoginPage.jsx           ❌ LAMA - Diganti dengan SecureLoginPage
│   └── SecureLoginPage.jsx     ✅ BARU - Secure login page
└── styles/
    ├── main.css                ✅ UPDATE - Dark mode theme
    └── wallet.css              ✅ BARU - Wallet component styles
```

---

## 🔄 Migrasi dari Sistem Lama

### Step 1: Update main.jsx

Edit `src/main.jsx`:

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './hooks/useSecureAuth.jsx'; // ✅ Ganti import
import './styles/main.css';
import './styles/wallet.css'; // ✅ Tambahkan

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
```

### Step 2: Update App.jsx

Edit `src/App.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useSecureAuth.jsx'; // ✅ Ganti import
import LandingPage from './pages/LandingPage.jsx';
import SecureLoginPage from './pages/SecureLoginPage.jsx'; // ✅ Ganti import
import Dashboard from './pages/Dashboard.jsx';

export default function App() {
  const { user, loading } = useAuth();
  const [route, setRoute] = useState('landing');

  useEffect(() => {
    if (!loading) {
      setRoute(user ? 'dashboard' : 'landing');
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-orb" />
        Memuat...
      </div>
    );
  }

  if (route === 'login') return <SecureLoginPage onBack={() => setRoute('landing')} />;
  if (route === 'dashboard') return <Dashboard onLogout={() => setRoute('landing')} />;
  return <LandingPage onLogin={() => setRoute('login')} />;
}
```

### Step 3: Update Dashboard.jsx

Edit `src/pages/Dashboard.jsx` untuk menggunakan hook baru:

```jsx
import { useAuth } from '../hooks/useSecureAuth.jsx'; // ✅ Ganti import

// Di dalam komponen NavBar:
function NavBar({ user, onLogout }) {
  const { exportKeystore, isEncrypted } = useAuth(); // ✅ Tambahkan

  const handleExportKeystore = async () => {
    if (!isEncrypted) {
      alert('Wallet ini tidak mendukung export keystore');
      return;
    }

    try {
      await exportKeystore();
      alert('Keystore berhasil didownload!');
    } catch (error) {
      alert('Gagal export keystore: ' + error.message);
    }
  };

  return (
    <nav className="site-nav">
      <div className="brand">
        <span>AI</span>
        <div>
          <strong>MemeAgent</strong>
          <small>Signal Intelligence Solana</small>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="user-chip">
          <div className="user-chip-avatar">
            {user?.publicKey?.[0]?.toUpperCase() || 'W'}
          </div>
          <span>{user?.publicKey?.slice(0, 8) || 'Wallet'}</span>
          <small>{user?.balanceSol?.toFixed(4) || '0.0000'} SOL</small>
        </div>
        {isEncrypted && (
          <button 
            type="button" 
            className="btn-secondary" 
            style={{ padding: '8px 14px', fontSize: 13 }}
            onClick={handleExportKeystore}
          >
            Export Keystore
          </button>
        )}
        <button 
          type="button" 
          className="btn-secondary" 
          style={{ padding: '8px 14px', fontSize: 13 }} 
          onClick={onLogout}
        >
          <LogOut size={14} /> Keluar
        </button>
      </div>
    </nav>
  );
}
```

---

## 🔐 Cara Menggunakan Sistem Baru

### 1. **Browser Wallet (Phantom/Solflare)**

Paling aman untuk user yang sudah punya wallet:

```javascript
// User klik "Browser Wallet"
// → Phantom popup muncul
// → User approve connection
// → Wallet terhubung (read-only untuk backtest)
```

**Keuntungan:**
- ✅ Private key tidak pernah terekspos
- ✅ Signing dilakukan di Phantom
- ✅ Paling aman

**Kekurangan:**
- ❌ Perlu install extension
- ❌ Tidak bisa auto-sign (perlu approval manual)

### 2. **Import Private Key**

Untuk user yang sudah punya wallet dan ingin auto-trading:

```javascript
// User klik "Import Private Key"
// → Paste private key (base58)
// → Buat password enkripsi
// → Private key dienkripsi AES-256-GCM
// → Disimpan di localStorage (encrypted)
```

**Keuntungan:**
- ✅ Bisa auto-sign transaksi
- ✅ Private key terenkripsi
- ✅ Cocok untuk auto-trading

**Kekurangan:**
- ⚠️ User harus trust aplikasi
- ⚠️ Perlu backup keystore

### 3. **Generate Wallet Baru**

Untuk user baru yang belum punya wallet:

```javascript
// User klik "Generate Wallet Baru"
// → Wallet baru dibuat (Keypair.generate())
// → User lihat public key + private key
// → Buat password enkripsi
// → Keystore file auto-download
// → Private key encrypted disimpan
```

**Keuntungan:**
- ✅ Mudah untuk pemula
- ✅ Keystore backup otomatis
- ✅ Full control

**Kekurangan:**
- ⚠️ User harus backup private key
- ⚠️ Wallet baru (balance 0)

### 4. **Upload Keystore**

Untuk user yang sudah punya keystore file:

```javascript
// User klik "Upload Keystore"
// → Pilih file .json
// → Masukkan password
// → Keystore didekripsi
// → Wallet terhubung
```

**Keuntungan:**
- ✅ Restore dari backup
- ✅ Aman (password protected)

---

## 🛡️ Fitur Keamanan

### 1. **Enkripsi AES-256-GCM**

```javascript
// Private key TIDAK PERNAH disimpan plaintext
const encrypted = await encrypt(privateKey, password);
localStorage.setItem('wallet', encrypted);

// Dekripsi hanya saat diperlukan
const privateKey = await decrypt(encrypted, password);
```

### 2. **PBKDF2 Key Derivation**

```javascript
// Password di-hash dengan 100,000 iterations
const key = await deriveKey(password, salt);
// Resistant terhadap brute-force attack
```

### 3. **Session Management**

```javascript
// Auto-logout setelah 30 menit idle
// Session disimpan di sessionStorage (hilang saat tab ditutup)
// Password tidak disimpan di localStorage
```

### 4. **Password Strength Validation**

```javascript
// Minimum requirements:
// - 8 karakter
// - Huruf besar + kecil
// - Angka
// - Karakter spesial
```

---

## 🧪 Testing

### Test Enkripsi:

```javascript
import { encrypt, decrypt } from './src/utils/encryption.js';

const data = 'sensitive data';
const password = 'MySecurePassword123!';

const encrypted = await encrypt(data, password);
console.log('Encrypted:', encrypted);

const decrypted = await decrypt(encrypted, password);
console.log('Decrypted:', decrypted);
// Output: "sensitive data"
```

### Test Wallet Generation:

```javascript
import { generateWallet } from './src/utils/walletManager.js';

const wallet = generateWallet();
console.log('Public Key:', wallet.publicKey);
console.log('Private Key:', wallet.privateKey);
```

---

## 📝 TODO: Fitur Tambahan

### Priority 1 (Critical):
- [ ] Backend proxy untuk API keys
- [ ] Rate limiting
- [ ] Transaction simulation sebelum send
- [ ] MEV protection (Jito bundles)

### Priority 2 (High):
- [ ] BIP39 mnemonic phrase support
- [ ] Hardware wallet support (Ledger)
- [ ] Multi-wallet management
- [ ] Transaction history

### Priority 3 (Medium):
- [ ] 2FA authentication
- [ ] Email notifications
- [ ] Telegram bot integration
- [ ] Mobile responsive improvements

---

## ⚠️ DISCLAIMER

**PENTING:** Aplikasi ini masih dalam mode **BACKTEST/SIMULASI**.

- ✅ Wallet connection untuk verifikasi ownership
- ✅ Balance checking
- ❌ TIDAK ADA auto-trading on-chain (belum diimplementasi)
- ❌ TIDAK ADA transaksi otomatis

**Dana Anda AMAN** karena:
1. Private key terenkripsi
2. Tidak ada auto-send transaction
3. Semua trade adalah simulasi virtual
4. Perlu konfirmasi manual untuk transaksi real

---

## 🆘 Troubleshooting

### Error: "Phantom wallet tidak terdeteksi"
**Solusi:** Install Phantom extension dari https://phantom.app

### Error: "Password salah atau keystore corrupt"
**Solusi:** Pastikan password yang dimasukkan benar. Jika lupa password, restore dari private key backup.

### Error: "Failed to fetch balance"
**Solusi:** Check koneksi internet atau ganti RPC endpoint di `.env`

### Private key hilang
**Solusi:** Restore dari keystore file backup. Jika tidak ada backup, wallet tidak bisa di-recover.

---

## 📞 Support

Jika ada pertanyaan atau issue:
1. Check SECURITY_AUDIT.md untuk detail keamanan
2. Baca dokumentasi Solana: https://docs.solana.com
3. Baca dokumentasi Wallet Adapter: https://github.com/solana-labs/wallet-adapter

---

**Dibuat:** 2026-05-31  
**Versi:** 1.0.0  
**Status:** Production-Ready (Backtest Mode)
