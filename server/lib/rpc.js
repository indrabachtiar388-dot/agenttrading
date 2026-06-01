// rpc.js — server-side Solana JSON-RPC + generic fetch-with-timeout helpers.

import { config } from '../config.js';

const RPC_TIMEOUT_MS = 9000;

// fetch wrapper with an AbortController timeout. Throws on non-2xx.
export async function fetchJson(url, options = {}, timeoutMs = RPC_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { accept: 'application/json', ...(options.headers || {}) }
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Single Solana JSON-RPC call against the configured RPC (Helius or public).
export async function rpc(method, params) {
  const payload = await fetchJson(config.rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'memeagent', method, params })
  });
  if (payload.error) throw new Error(payload.error.message || `RPC ${method} failed`);
  return payload.result;
}
