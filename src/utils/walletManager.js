/**
 * walletManager.js — Secure Wallet Management
 *
 * Mengelola private keys dengan enkripsi AES-256-GCM.
 * Private keys TIDAK PERNAH disimpan dalam plaintext.
 */

import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { encrypt, decrypt, generateSecurePassword } from './encryption';

/**
 * Generate new Solana keypair
 * @returns {object} { publicKey: string, privateKey: string, mnemonic: string }
 */
export function generateWallet() {
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toBase58();
  const privateKey = bs58.encode(keypair.secretKey);

  return {
    publicKey,
    privateKey,
    // TODO: Implement BIP39 mnemonic generation
    mnemonic: null
  };
}

/**
 * Import wallet dari private key
 * @param {string} privateKeyBase58 - Private key dalam format base58
 * @returns {object} { publicKey: string, privateKey: string }
 */
export function importWalletFromPrivateKey(privateKeyBase58) {
  try {
    const secretKey = bs58.decode(privateKeyBase58);
    const keypair = Keypair.fromSecretKey(secretKey);
    const publicKey = keypair.publicKey.toBase58();

    return {
      publicKey,
      privateKey: privateKeyBase58
    };
  } catch (error) {
    throw new Error('Private key tidak valid');
  }
}

/**
 * Validate Solana private key
 * @param {string} privateKeyBase58
 * @returns {boolean}
 */
export function isValidPrivateKey(privateKeyBase58) {
  try {
    const secretKey = bs58.decode(privateKeyBase58);
    if (secretKey.length !== 64) return false;
    Keypair.fromSecretKey(secretKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate Solana public key
 * @param {string} publicKeyBase58
 * @returns {boolean}
 */
export function isValidPublicKey(publicKeyBase58) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(publicKeyBase58);
}

/**
 * Create encrypted keystore file
 * @param {string} privateKey - Private key dalam format base58
 * @param {string} password - Password untuk enkripsi
 * @returns {Promise<object>} Keystore object
 */
export async function createKeystore(privateKey, password) {
  const wallet = importWalletFromPrivateKey(privateKey);

  const keystore = {
    version: 1,
    publicKey: wallet.publicKey,
    crypto: {
      cipher: 'aes-256-gcm',
      kdf: 'pbkdf2',
      kdfParams: {
        iterations: 100000,
        hash: 'sha256'
      }
    },
    encryptedPrivateKey: await encrypt(privateKey, password),
    timestamp: Date.now()
  };

  return keystore;
}

/**
 * Decrypt keystore file
 * @param {object} keystore - Keystore object
 * @param {string} password - Password untuk dekripsi
 * @returns {Promise<object>} { publicKey: string, privateKey: string }
 */
export async function decryptKeystore(keystore, password) {
  try {
    const privateKey = await decrypt(keystore.encryptedPrivateKey, password);
    const wallet = importWalletFromPrivateKey(privateKey);

    // Verify public key matches
    if (wallet.publicKey !== keystore.publicKey) {
      throw new Error('Keystore corrupt: public key mismatch');
    }

    return wallet;
  } catch (error) {
    throw new Error('Password salah atau keystore corrupt');
  }
}

/**
 * Export keystore sebagai JSON file
 * @param {object} keystore
 * @param {string} filename
 */
export function downloadKeystore(keystore, filename = null) {
  const name = filename || `memeagent-keystore-${keystore.publicKey.slice(0, 8)}.json`;
  const blob = new Blob([JSON.stringify(keystore, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();

  URL.revokeObjectURL(url);
}

/**
 * Import keystore dari JSON file
 * @param {File} file
 * @returns {Promise<object>} Keystore object
 */
export async function uploadKeystore(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const keystore = JSON.parse(e.target.result);

        // Validate keystore structure
        if (!keystore.version || !keystore.publicKey || !keystore.encryptedPrivateKey) {
          throw new Error('Format keystore tidak valid');
        }

        resolve(keystore);
      } catch (error) {
        reject(new Error('File keystore tidak valid'));
      }
    };

    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsText(file);
  });
}

/**
 * Sign transaction dengan private key
 * @param {Transaction} transaction - Solana transaction
 * @param {string} privateKeyBase58 - Private key dalam format base58
 * @returns {Transaction} Signed transaction
 */
export function signTransaction(transaction, privateKeyBase58) {
  try {
    const secretKey = bs58.decode(privateKeyBase58);
    const keypair = Keypair.fromSecretKey(secretKey);
    transaction.sign(keypair);
    return transaction;
  } catch (error) {
    throw new Error('Gagal menandatangani transaksi');
  }
}

/**
 * Wallet storage manager dengan enkripsi
 */
export class WalletStorage {
  static STORAGE_KEY = 'memeagent_wallet';

  /**
   * Save encrypted wallet ke localStorage
   * @param {string} privateKey
   * @param {string} password
   */
  static async save(privateKey, password) {
    const keystore = await createKeystore(privateKey, password);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(keystore));
    return keystore;
  }

  /**
   * Load dan decrypt wallet dari localStorage
   * @param {string} password
   * @returns {Promise<object>} { publicKey: string, privateKey: string }
   */
  static async load(password) {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) throw new Error('Wallet tidak ditemukan');

    const keystore = JSON.parse(stored);
    return await decryptKeystore(keystore, password);
  }

  /**
   * Check apakah ada wallet tersimpan
   * @returns {boolean}
   */
  static exists() {
    return localStorage.getItem(this.STORAGE_KEY) !== null;
  }

  /**
   * Get public key tanpa decrypt
   * @returns {string|null}
   */
  static getPublicKey() {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return null;

    try {
      const keystore = JSON.parse(stored);
      return keystore.publicKey;
    } catch {
      return null;
    }
  }

  /**
   * Remove wallet dari localStorage
   */
  static remove() {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Change wallet password
   * @param {string} oldPassword
   * @param {string} newPassword
   */
  static async changePassword(oldPassword, newPassword) {
    const wallet = await this.load(oldPassword);
    await this.save(wallet.privateKey, newPassword);
  }
}
