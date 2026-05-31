/**
 * WalletConnect.jsx — Secure Wallet Connection Component
 *
 * Mendukung:
 * 1. Browser wallet (Phantom, Solflare, Backpack)
 * 2. Import private key dengan enkripsi
 * 3. Generate new wallet
 * 4. Keystore management
 */

import { useState, useEffect } from 'react';
import { Wallet, Key, Download, Upload, Eye, EyeOff, AlertTriangle, CheckCircle, Lock } from 'lucide-react';
import {
  generateWallet,
  importWalletFromPrivateKey,
  isValidPrivateKey,
  createKeystore,
  decryptKeystore,
  downloadKeystore,
  uploadKeystore,
  WalletStorage
} from '../utils/walletManager';
import { validatePasswordStrength } from '../utils/encryption';

export default function WalletConnect({ onConnect, onCancel }) {
  const [mode, setMode] = useState('select'); // select, import, generate, keystore
  const [privateKey, setPrivateKey] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedWallet, setGeneratedWallet] = useState(null);
  const [keystoreFile, setKeystoreFile] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState(null);

  useEffect(() => {
    if (password) {
      setPasswordStrength(validatePasswordStrength(password));
    } else {
      setPasswordStrength(null);
    }
  }, [password]);

  const handleBrowserWallet = async () => {
    setError('');
    setLoading(true);

    try {
      // Check if Phantom is installed
      if (window.solana && window.solana.isPhantom) {
        const response = await window.solana.connect();
        const publicKey = response.publicKey.toString();

        onConnect({
          type: 'browser',
          publicKey,
          provider: 'Phantom',
          // Private key tidak tersedia untuk browser wallet (ini aman)
          canSign: true
        });
      } else {
        setError('Phantom wallet tidak terdeteksi. Install dari phantom.app');
      }
    } catch (err) {
      setError('Gagal menghubungkan wallet: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImportPrivateKey = async () => {
    setError('');

    if (!privateKey.trim()) {
      setError('Private key wajib diisi');
      return;
    }

    if (!isValidPrivateKey(privateKey.trim())) {
      setError('Format private key tidak valid');
      return;
    }

    if (!password) {
      setError('Password wajib diisi untuk enkripsi');
      return;
    }

    if (password !== confirmPassword) {
      setError('Password tidak cocok');
      return;
    }

    if (!passwordStrength?.valid) {
      setError('Password terlalu lemah. ' + passwordStrength.feedback.join(', '));
      return;
    }

    setLoading(true);

    try {
      const wallet = importWalletFromPrivateKey(privateKey.trim());

      // Save encrypted wallet
      await WalletStorage.save(wallet.privateKey, password);

      onConnect({
        type: 'imported',
        publicKey: wallet.publicKey,
        provider: 'Private Key',
        canSign: true,
        encrypted: true
      });
    } catch (err) {
      setError('Gagal import wallet: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateWallet = () => {
    setError('');
    const wallet = generateWallet();
    setGeneratedWallet(wallet);
    setMode('generate');
  };

  const handleSaveGeneratedWallet = async () => {
    if (!password) {
      setError('Password wajib diisi untuk enkripsi');
      return;
    }

    if (password !== confirmPassword) {
      setError('Password tidak cocok');
      return;
    }

    if (!passwordStrength?.valid) {
      setError('Password terlalu lemah. ' + passwordStrength.feedback.join(', '));
      return;
    }

    setLoading(true);

    try {
      // Save encrypted wallet
      await WalletStorage.save(generatedWallet.privateKey, password);

      // Download keystore backup
      const keystore = await createKeystore(generatedWallet.privateKey, password);
      downloadKeystore(keystore);

      onConnect({
        type: 'generated',
        publicKey: generatedWallet.publicKey,
        provider: 'Generated',
        canSign: true,
        encrypted: true
      });
    } catch (err) {
      setError('Gagal menyimpan wallet: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeystoreUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');
    setLoading(true);

    try {
      const keystore = await uploadKeystore(file);
      setKeystoreFile(keystore);
      setMode('keystore');
    } catch (err) {
      setError('File keystore tidak valid: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockKeystore = async () => {
    if (!password) {
      setError('Password wajib diisi');
      return;
    }

    setLoading(true);

    try {
      const wallet = await decryptKeystore(keystoreFile, password);

      // Save to storage
      await WalletStorage.save(wallet.privateKey, password);

      onConnect({
        type: 'keystore',
        publicKey: wallet.publicKey,
        provider: 'Keystore',
        canSign: true,
        encrypted: true
      });
    } catch (err) {
      setError('Password salah atau keystore corrupt');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSavedWallet = async () => {
    if (!password) {
      setError('Password wajib diisi');
      return;
    }

    setLoading(true);

    try {
      const wallet = await WalletStorage.load(password);

      onConnect({
        type: 'saved',
        publicKey: wallet.publicKey,
        provider: 'Saved Wallet',
        canSign: true,
        encrypted: true
      });
    } catch (err) {
      setError('Password salah atau wallet tidak ditemukan');
    } finally {
      setLoading(false);
    }
  };

  // Check if there's a saved wallet
  const hasSavedWallet = WalletStorage.exists();
  const savedPublicKey = WalletStorage.getPublicKey();

  if (mode === 'select') {
    return (
      <div className="wallet-connect-modal">
        <div className="wallet-connect-card">
          <h2>Hubungkan Wallet</h2>
          <p className="subtitle">Pilih metode untuk menghubungkan wallet Solana Anda</p>

          {hasSavedWallet && (
            <div className="saved-wallet-section">
              <div className="saved-wallet-info">
                <Lock size={20} />
                <div>
                  <strong>Wallet Tersimpan</strong>
                  <p>{savedPublicKey?.slice(0, 8)}...{savedPublicKey?.slice(-8)}</p>
                </div>
              </div>
              <input
                type="password"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLoadSavedWallet()}
              />
              <button
                className="btn-primary"
                onClick={handleLoadSavedWallet}
                disabled={loading || !password}
              >
                {loading ? 'Membuka...' : 'Buka Wallet'}
              </button>
              <div className="divider">atau pilih metode lain</div>
            </div>
          )}

          <div className="wallet-options">
            <button className="wallet-option" onClick={handleBrowserWallet} disabled={loading}>
              <Wallet size={24} />
              <div>
                <strong>Browser Wallet</strong>
                <p>Phantom, Solflare, Backpack</p>
              </div>
            </button>

            <button className="wallet-option" onClick={() => setMode('import')} disabled={loading}>
              <Key size={24} />
              <div>
                <strong>Import Private Key</strong>
                <p>Import wallet dari private key</p>
              </div>
            </button>

            <button className="wallet-option" onClick={handleGenerateWallet} disabled={loading}>
              <Wallet size={24} />
              <div>
                <strong>Generate Wallet Baru</strong>
                <p>Buat wallet baru secara otomatis</p>
              </div>
            </button>

            <label className="wallet-option" htmlFor="keystore-upload">
              <Upload size={24} />
              <div>
                <strong>Upload Keystore</strong>
                <p>Import dari file keystore</p>
              </div>
              <input
                id="keystore-upload"
                type="file"
                accept=".json"
                onChange={handleKeystoreUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {error && (
            <div className="error-message">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          <button className="btn-secondary" onClick={onCancel} style={{ marginTop: 16 }}>
            Batal
          </button>

          <div className="security-notice">
            <Lock size={14} />
            <p>Private key Anda dienkripsi dengan AES-256-GCM dan tidak pernah dikirim ke server.</p>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'import') {
    return (
      <div className="wallet-connect-modal">
        <div className="wallet-connect-card">
          <h2>Import Private Key</h2>
          <p className="subtitle">Masukkan private key Solana Anda (format base58)</p>

          <div className="form-group">
            <label>Private Key</label>
            <div className="input-with-icon">
              <input
                type={showPrivateKey ? 'text' : 'password'}
                placeholder="Paste private key di sini"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowPrivateKey(!showPrivateKey)}
              >
                {showPrivateKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Password Enkripsi</label>
            <input
              type="password"
              placeholder="Buat password untuk enkripsi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {passwordStrength && (
              <div className={`password-strength strength-${passwordStrength.score}`}>
                <div className="strength-bar">
                  <div className="strength-fill" style={{ width: `${(passwordStrength.score / 6) * 100}%` }} />
                </div>
                <p>{passwordStrength.feedback[0]}</p>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Konfirmasi Password</label>
            <input
              type="password"
              placeholder="Ketik ulang password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleImportPrivateKey()}
            />
          </div>

          {error && (
            <div className="error-message">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          <div className="button-group">
            <button className="btn-secondary" onClick={() => setMode('select')} disabled={loading}>
              Kembali
            </button>
            <button
              className="btn-primary"
              onClick={handleImportPrivateKey}
              disabled={loading || !privateKey || !password || !confirmPassword}
            >
              {loading ? 'Mengimpor...' : 'Import Wallet'}
            </button>
          </div>

          <div className="security-notice">
            <Lock size={14} />
            <p>Private key akan dienkripsi dengan password Anda dan disimpan secara lokal.</p>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'generate' && generatedWallet) {
    return (
      <div className="wallet-connect-modal">
        <div className="wallet-connect-card">
          <h2>Wallet Baru Berhasil Dibuat</h2>
          <p className="subtitle">Simpan private key Anda dengan aman!</p>

          <div className="warning-box">
            <AlertTriangle size={20} />
            <div>
              <strong>PENTING: Backup Private Key Anda!</strong>
              <p>Jika Anda kehilangan private key, Anda akan kehilangan akses ke wallet selamanya.</p>
            </div>
          </div>

          <div className="wallet-info">
            <div className="info-item">
              <label>Public Key (Address)</label>
              <div className="copy-field">
                <code>{generatedWallet.publicKey}</code>
                <button onClick={() => navigator.clipboard.writeText(generatedWallet.publicKey)}>
                  Copy
                </button>
              </div>
            </div>

            <div className="info-item">
              <label>Private Key</label>
              <div className="copy-field">
                <code className={showPrivateKey ? '' : 'blurred'}>
                  {showPrivateKey ? generatedWallet.privateKey : '••••••••••••••••••••••••••••••••'}
                </code>
                <button onClick={() => setShowPrivateKey(!showPrivateKey)}>
                  {showPrivateKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                {showPrivateKey && (
                  <button onClick={() => navigator.clipboard.writeText(generatedWallet.privateKey)}>
                    Copy
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Password Enkripsi</label>
            <input
              type="password"
              placeholder="Buat password untuk enkripsi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {passwordStrength && (
              <div className={`password-strength strength-${passwordStrength.score}`}>
                <div className="strength-bar">
                  <div className="strength-fill" style={{ width: `${(passwordStrength.score / 6) * 100}%` }} />
                </div>
                <p>{passwordStrength.feedback[0]}</p>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Konfirmasi Password</label>
            <input
              type="password"
              placeholder="Ketik ulang password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="error-message">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          <div className="button-group">
            <button className="btn-secondary" onClick={() => {
              setMode('select');
              setGeneratedWallet(null);
            }} disabled={loading}>
              Batal
            </button>
            <button
              className="btn-primary"
              onClick={handleSaveGeneratedWallet}
              disabled={loading || !password || !confirmPassword}
            >
              <Download size={16} />
              {loading ? 'Menyimpan...' : 'Simpan & Download Backup'}
            </button>
          </div>

          <div className="security-notice">
            <CheckCircle size={14} />
            <p>File keystore backup akan otomatis terdownload setelah Anda klik Simpan.</p>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'keystore' && keystoreFile) {
    return (
      <div className="wallet-connect-modal">
        <div className="wallet-connect-card">
          <h2>Unlock Keystore</h2>
          <p className="subtitle">Masukkan password untuk membuka keystore</p>

          <div className="keystore-info">
            <Lock size={20} />
            <div>
              <strong>Keystore File</strong>
              <p>{keystoreFile.publicKey.slice(0, 8)}...{keystoreFile.publicKey.slice(-8)}</p>
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Masukkan password keystore"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlockKeystore()}
              autoFocus
            />
          </div>

          {error && (
            <div className="error-message">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          <div className="button-group">
            <button className="btn-secondary" onClick={() => {
              setMode('select');
              setKeystoreFile(null);
            }} disabled={loading}>
              Kembali
            </button>
            <button
              className="btn-primary"
              onClick={handleUnlockKeystore}
              disabled={loading || !password}
            >
              {loading ? 'Membuka...' : 'Unlock Wallet'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
