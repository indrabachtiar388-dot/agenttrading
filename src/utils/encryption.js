/**
 * encryption.js — Client-side Encryption Utilities
 *
 * Menggunakan Web Crypto API untuk enkripsi data sensitif.
 * PENTING: Private keys TIDAK PERNAH dikirim ke server.
 */

/**
 * Generate encryption key dari password menggunakan PBKDF2
 * @param {string} password - User password
 * @param {Uint8Array} salt - Salt untuk key derivation
 * @returns {Promise<CryptoKey>}
 */
export async function deriveKey(password, salt) {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000, // OWASP recommendation
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data dengan AES-256-GCM
 * @param {string} plaintext - Data yang akan dienkripsi
 * @param {string} password - Password untuk enkripsi
 * @returns {Promise<string>} Base64 encoded encrypted data
 */
export async function encrypt(plaintext, password) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Generate random salt dan IV
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // Derive key dari password
    const key = await deriveKey(password, salt);

    // Encrypt data
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      data
    );

    // Combine salt + iv + encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    // Return as base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Gagal mengenkripsi data');
  }
}

/**
 * Decrypt data dengan AES-256-GCM
 * @param {string} encryptedBase64 - Base64 encoded encrypted data
 * @param {string} password - Password untuk dekripsi
 * @returns {Promise<string>} Decrypted plaintext
 */
export async function decrypt(encryptedBase64, password) {
  try {
    // Decode base64
    const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));

    // Extract salt, iv, dan encrypted data
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);

    // Derive key dari password
    const key = await deriveKey(password, salt);

    // Decrypt data
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encrypted
    );

    // Convert to string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Gagal mendekripsi data. Password salah atau data corrupt.');
  }
}

/**
 * Generate random password untuk keystore
 * @param {number} length - Panjang password
 * @returns {string}
 */
export function generateSecurePassword(length = 32) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const randomValues = window.crypto.getRandomValues(new Uint8Array(length));
  return Array.from(randomValues)
    .map(x => charset[x % charset.length])
    .join('');
}

/**
 * Hash password untuk verifikasi (tidak untuk enkripsi!)
 * @param {string} password
 * @returns {Promise<string>} Hex encoded hash
 */
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await window.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Secure localStorage wrapper dengan auto-encryption
 */
export class SecureStorage {
  constructor(password) {
    this.password = password;
  }

  async setItem(key, value) {
    const encrypted = await encrypt(JSON.stringify(value), this.password);
    localStorage.setItem(`secure_${key}`, encrypted);
  }

  async getItem(key) {
    const encrypted = localStorage.getItem(`secure_${key}`);
    if (!encrypted) return null;

    try {
      const decrypted = await decrypt(encrypted, this.password);
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }

  removeItem(key) {
    localStorage.removeItem(`secure_${key}`);
  }

  clear() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('secure_'));
    keys.forEach(k => localStorage.removeItem(k));
  }
}

/**
 * Validate password strength
 * @param {string} password
 * @returns {object} { valid: boolean, score: number, feedback: string[] }
 */
export function validatePasswordStrength(password) {
  const feedback = [];
  let score = 0;

  if (password.length < 8) {
    feedback.push('Password minimal 8 karakter');
  } else if (password.length < 12) {
    score += 1;
    feedback.push('Password sebaiknya minimal 12 karakter');
  } else {
    score += 2;
  }

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Tambahkan huruf kecil');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Tambahkan huruf besar');

  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('Tambahkan angka');

  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else feedback.push('Tambahkan karakter spesial (!@#$%^&*)');

  const valid = score >= 4 && password.length >= 8;

  return {
    valid,
    score: Math.min(score, 6),
    feedback: valid ? ['Password cukup kuat'] : feedback
  };
}
