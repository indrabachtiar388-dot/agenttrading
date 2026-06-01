// config.js — reads all server env once and exposes a frozen config object.
// Everything is optional: missing keys degrade gracefully (endpoints return {ok:false} or empty).

const env = process.env;

function bool(v, fallback = false) {
  if (v == null || v === '') return fallback;
  return /^(1|true|yes|on)$/i.test(String(v).trim());
}

const HELIUS_API_KEY = (env.HELIUS_API_KEY || '').trim();

export const config = Object.freeze({
  port: Number(env.PORT || 3001),
  allowedOrigin: (env.ALLOWED_ORIGIN || '*').trim(),

  // Solana RPC: Helius if a key is present, else public mainnet-beta.
  heliusApiKey: HELIUS_API_KEY,
  rpcUrl: HELIUS_API_KEY
    ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
    : 'https://api.mainnet-beta.solana.com',

  birdeyeApiKey: (env.BIRDEYE_API_KEY || '').trim(),
  anthropicApiKey: (env.ANTHROPIC_API_KEY || '').trim(),

  // "addr:name:type,addr:name:type" — used by /api/smart-wallets and holder classification.
  smartWalletsRaw: (env.SMART_WALLETS || '').trim(),

  hermesUrl: (env.HERMES_URL || 'https://hermes.pyth.network').replace(/\/$/, ''),

  // x402 monetization gate (DISABLED unless a receiving wallet is set).
  x402: Object.freeze({
    receivingWallet: (env.X402_RECEIVING_WALLET || '').trim(),
    facilitatorUrl: (env.X402_FACILITATOR_URL || '').replace(/\/$/, ''),
    asset: (env.X402_ASSET || '').trim(), // USDC mint address
    price: (env.X402_PRICE || '10000').trim(), // atomic units (USDC has 6 decimals -> 10000 = 0.01)
    network: (env.X402_NETWORK || 'solana').trim()
  }),

  isDev: bool(env.DEV, false)
});

export const SOL_USD_PYTH_FEED_ID =
  '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d';
