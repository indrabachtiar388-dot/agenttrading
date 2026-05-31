/**
 * jupiter.js — Jupiter Aggregator Configuration
 *
 * Configuration untuk Jupiter V6 API integration
 * Jupiter adalah aggregator terbaik di Solana untuk swap routing
 */

// Jupiter V6 API Base URL
export const JUPITER_API_BASE = 'https://quote-api.jup.ag/v6';

// Jupiter API Endpoints
export const JUPITER_ENDPOINTS = {
  QUOTE: `${JUPITER_API_BASE}/quote`,
  SWAP: `${JUPITER_API_BASE}/swap`,
  SWAP_INSTRUCTIONS: `${JUPITER_API_BASE}/swap-instructions`,
  TOKENS: `${JUPITER_API_BASE}/tokens`,
  PRICE: `${JUPITER_API_BASE}/price`
};

// Native SOL mint address (wrapped SOL)
export const NATIVE_SOL_MINT = 'So11111111111111111111111111111111111111112';

// Common token addresses on Solana
export const COMMON_TOKENS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  WIF: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm'
};

// Default swap settings
export const DEFAULT_SWAP_CONFIG = {
  // Slippage in basis points (100 = 1%)
  slippageBps: 100,

  // Maximum slippage allowed (500 = 5%)
  maxSlippageBps: 500,

  // Minimum slippage (50 = 0.5%)
  minSlippageBps: 50,

  // Priority fee in lamports (0 = auto)
  priorityFeeLamports: 0,

  // Auto priority fee (let Jupiter calculate optimal fee)
  autoSetPriorityFee: true,

  // Use versioned transactions (recommended for better performance)
  useVersionedTransactions: true,

  // Maximum accounts for routing
  maxAccounts: 64,

  // Only use direct routes (faster but might not get best price)
  onlyDirectRoutes: false,

  // Asset ledger difference (for exact output swaps)
  asLegacyTransaction: false,

  // Wrap/unwrap SOL automatically
  wrapUnwrapSOL: true,

  // Fee account (optional, for referral fees)
  feeAccount: null,

  // Platform fee in basis points (0 = no fee)
  platformFeeBps: 0
};

// Transaction settings
export const TRANSACTION_CONFIG = {
  // Maximum retries for failed transactions
  maxRetries: 3,

  // Retry delay in milliseconds
  retryDelay: 2000,

  // Transaction confirmation timeout (30 seconds)
  confirmationTimeout: 30000,

  // Commitment level for confirmation
  commitment: 'confirmed',

  // Skip preflight checks (not recommended)
  skipPreflight: false,

  // Preflight commitment
  preflightCommitment: 'confirmed'
};

// Quote settings
export const QUOTE_CONFIG = {
  // Refresh quote interval in milliseconds (10 seconds)
  refreshInterval: 10000,

  // Quote expiry time in milliseconds (30 seconds)
  expiryTime: 30000,

  // Minimum quote difference to trigger update (in percentage)
  minUpdateThreshold: 0.5
};

// Error messages
export const ERROR_MESSAGES = {
  NO_ROUTES: 'Tidak ada route tersedia untuk swap ini',
  INSUFFICIENT_LIQUIDITY: 'Likuiditas tidak cukup',
  SLIPPAGE_EXCEEDED: 'Slippage melebihi batas maksimum',
  PRICE_IMPACT_HIGH: 'Price impact terlalu tinggi',
  TRANSACTION_FAILED: 'Transaksi gagal',
  QUOTE_EXPIRED: 'Quote sudah expired, refresh quote',
  INVALID_TOKEN: 'Token address tidak valid',
  NETWORK_ERROR: 'Network error, coba lagi'
};

// Price impact thresholds
export const PRICE_IMPACT_THRESHOLDS = {
  LOW: 1,      // < 1% - Safe
  MEDIUM: 3,   // 1-3% - Caution
  HIGH: 5,     // 3-5% - Warning
  EXTREME: 10  // > 5% - Danger
};

// Minimum amounts (in lamports for SOL, in token units for others)
export const MIN_AMOUNTS = {
  SOL: 0.001,  // 0.001 SOL minimum
  TOKEN: 1     // 1 token unit minimum
};

/**
 * Get price impact warning level
 */
export function getPriceImpactLevel(priceImpactPct) {
  if (priceImpactPct < PRICE_IMPACT_THRESHOLDS.LOW) return 'safe';
  if (priceImpactPct < PRICE_IMPACT_THRESHOLDS.MEDIUM) return 'low';
  if (priceImpactPct < PRICE_IMPACT_THRESHOLDS.HIGH) return 'medium';
  if (priceImpactPct < PRICE_IMPACT_THRESHOLDS.EXTREME) return 'high';
  return 'extreme';
}

/**
 * Validate slippage value
 */
export function validateSlippage(slippageBps) {
  if (slippageBps < DEFAULT_SWAP_CONFIG.minSlippageBps) {
    return DEFAULT_SWAP_CONFIG.minSlippageBps;
  }
  if (slippageBps > DEFAULT_SWAP_CONFIG.maxSlippageBps) {
    return DEFAULT_SWAP_CONFIG.maxSlippageBps;
  }
  return slippageBps;
}

/**
 * Calculate dynamic slippage based on market conditions
 */
export function calculateDynamicSlippage(baseSlippage, priceImpact, volatility = 1) {
  // Increase slippage for high price impact or volatility
  let dynamicSlippage = baseSlippage;

  if (priceImpact > PRICE_IMPACT_THRESHOLDS.MEDIUM) {
    dynamicSlippage *= 1.5;
  }

  if (volatility > 1.5) {
    dynamicSlippage *= 1.2;
  }

  return validateSlippage(Math.round(dynamicSlippage));
}

export default {
  JUPITER_API_BASE,
  JUPITER_ENDPOINTS,
  NATIVE_SOL_MINT,
  COMMON_TOKENS,
  DEFAULT_SWAP_CONFIG,
  TRANSACTION_CONFIG,
  QUOTE_CONFIG,
  ERROR_MESSAGES,
  PRICE_IMPACT_THRESHOLDS,
  MIN_AMOUNTS,
  getPriceImpactLevel,
  validateSlippage,
  calculateDynamicSlippage
};
