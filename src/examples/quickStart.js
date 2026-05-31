/**
 * quickStart.js — Quick Start Guide untuk Jupiter Integration
 *
 * Panduan cepat untuk mulai menggunakan Jupiter Aggregator
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { TradingExecutor } from '../utils/tradingExecutor.js';
import { fetchQuote, solToLamports } from '../utils/jupiterSwap.js';
import { NATIVE_SOL_MINT } from '../config/jupiter.js';

// ============================================================================
// SETUP
// ============================================================================

// 1. Setup Solana connection
const RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';
const connection = new Connection(RPC_ENDPOINT, 'confirmed');

// 2. Connect wallet (gunakan wallet adapter di production)
// const wallet = useWallet(); // React wallet adapter
// atau
// const wallet = { publicKey: '...', signTransaction: async (tx) => {...} };

// ============================================================================
// QUICK START EXAMPLES
// ============================================================================

/**
 * Example 1: Simple Buy (SOL -> Token)
 * Paling basic usage untuk buy token
 */
async function quickBuy(wallet, tokenAddress, amountSOL) {
  const executor = new TradingExecutor(connection, wallet);

  const signal = {
    ca: tokenAddress,
    symbol: 'TOKEN',
    priceUsd: 0.001,
    grade: 'A+',
    confidence: 85
  };

  const result = await executor.executeBuy(signal, amountSOL);

  if (result.success) {
    console.log('✅ Buy successful!');
    console.log('Tx:', result.signature);
    return result;
  } else {
    console.error('❌ Buy failed:', result.error);
    return null;
  }
}

/**
 * Example 2: Simple Sell (Token -> SOL)
 * Paling basic usage untuk sell token
 */
async function quickSell(wallet, tokenAddress, percentage = 100) {
  const executor = new TradingExecutor(connection, wallet);

  const trade = {
    ca: tokenAddress,
    symbol: 'TOKEN',
    entryPrice: 0.001,
    amount: 1000000,
    status: 'ACTIVE'
  };

  const result = await executor.executeSell(trade, percentage);

  if (result.success) {
    console.log('✅ Sell successful!');
    console.log('Tx:', result.signature);
    return result;
  } else {
    console.error('❌ Sell failed:', result.error);
    return null;
  }
}

/**
 * Example 3: Get Quote Only (No Execution)
 * Untuk check price sebelum execute
 */
async function checkPrice(tokenAddress, amountSOL) {
  const quote = await fetchQuote(
    NATIVE_SOL_MINT,
    tokenAddress,
    solToLamports(amountSOL)
  );

  if (quote.success) {
    console.log('Price Info:');
    console.log('- Input:', amountSOL, 'SOL');
    console.log('- Output:', quote.outputAmount, 'tokens');
    console.log('- Price Impact:', quote.priceImpactPct.toFixed(4), '%');
    console.log('- Routes:', quote.routeInfo.numberOfRoutes);
    return quote;
  } else {
    console.error('Failed to get quote:', quote.error);
    return null;
  }
}

/**
 * Example 4: Buy dengan Custom Slippage
 * Untuk volatile tokens yang butuh higher slippage
 */
async function buyWithCustomSlippage(wallet, tokenAddress, amountSOL, slippagePercent) {
  const executor = new TradingExecutor(connection, wallet);

  const signal = {
    ca: tokenAddress,
    symbol: 'TOKEN',
    priceUsd: 0.001,
    grade: 'A+',
    confidence: 85
  };

  const result = await executor.executeBuy(signal, amountSOL, {
    slippageBps: slippagePercent * 100 // Convert % to bps
  });

  return result;
}

/**
 * Example 5: Partial Sell
 * Sell sebagian position (e.g., take profit 50%)
 */
async function partialSell(wallet, tokenAddress, percentage) {
  const executor = new TradingExecutor(connection, wallet);

  const trade = {
    ca: tokenAddress,
    symbol: 'TOKEN',
    entryPrice: 0.001,
    amount: 1000000,
    status: 'ACTIVE'
  };

  const result = await executor.executeSell(trade, percentage);

  if (result.success) {
    console.log(`✅ Sold ${percentage}% of position`);
    console.log('SOL received:', result.estimatedSOLReceived);
  }

  return result;
}

// ============================================================================
// COMMON USE CASES
// ============================================================================

/**
 * Use Case 1: Auto-buy pada signal A+/A
 */
async function autoBuyOnSignal(wallet, signal, balance) {
  // Calculate position size (5% of balance untuk A+)
  const positionSize = signal.grade === 'A+' ? balance * 0.05 : balance * 0.03;

  // Minimum 0.01 SOL
  const amountSOL = Math.max(0.01, positionSize);

  console.log(`Auto-buying ${signal.symbol} with ${amountSOL} SOL`);

  return await quickBuy(wallet, signal.ca, amountSOL);
}

/**
 * Use Case 2: Take Profit Strategy
 */
async function takeProfitStrategy(wallet, trade, currentPrice) {
  const profitPercent = ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100;

  if (profitPercent >= 100) {
    // 100%+ profit: Sell 50%
    console.log('Taking 50% profit at 2x');
    return await partialSell(wallet, trade.ca, 50);
  } else if (profitPercent >= 50) {
    // 50%+ profit: Sell 25%
    console.log('Taking 25% profit at 1.5x');
    return await partialSell(wallet, trade.ca, 25);
  }

  return null;
}

/**
 * Use Case 3: Stop Loss Strategy
 */
async function stopLossStrategy(wallet, trade, currentPrice) {
  const lossPercent = ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100;

  if (lossPercent <= -20) {
    // 20% loss: Sell all
    console.log('Stop loss triggered at -20%');
    return await quickSell(wallet, trade.ca, 100);
  }

  return null;
}

/**
 * Use Case 4: DCA (Dollar Cost Averaging)
 */
async function dcaBuy(wallet, tokenAddress, totalAmount, numBuys, intervalMs) {
  const amountPerBuy = totalAmount / numBuys;
  const results = [];

  for (let i = 0; i < numBuys; i++) {
    console.log(`DCA Buy ${i + 1}/${numBuys}: ${amountPerBuy} SOL`);

    const result = await quickBuy(wallet, tokenAddress, amountPerBuy);
    results.push(result);

    if (i < numBuys - 1) {
      // Wait before next buy
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }

  return results;
}

/**
 * Use Case 5: Check if Trade is Profitable
 */
async function checkProfitability(tokenAddress, entryPrice, amountTokens) {
  // Get current quote for selling
  const quote = await fetchQuote(
    tokenAddress,
    NATIVE_SOL_MINT,
    amountTokens
  );

  if (quote.success) {
    const currentValue = quote.outputAmount / 1e9; // Convert lamports to SOL
    const entryValue = entryPrice * amountTokens;
    const profit = currentValue - entryValue;
    const profitPercent = (profit / entryValue) * 100;

    console.log('Profitability Check:');
    console.log('- Entry Value:', entryValue, 'SOL');
    console.log('- Current Value:', currentValue, 'SOL');
    console.log('- Profit:', profit, 'SOL');
    console.log('- Profit %:', profitPercent.toFixed(2), '%');

    return {
      isProfitable: profit > 0,
      profit,
      profitPercent
    };
  }

  return null;
}

// ============================================================================
// SAFETY CHECKS
// ============================================================================

/**
 * Safety Check: Validate before buy
 */
async function safetyCheckBuy(wallet, tokenAddress, amountSOL) {
  const executor = new TradingExecutor(connection, wallet);

  // 1. Check balance
  const balance = await executor.getWalletBalance();
  if (balance < amountSOL) {
    console.error('❌ Insufficient balance');
    return false;
  }

  // 2. Check quote
  const quote = await fetchQuote(
    NATIVE_SOL_MINT,
    tokenAddress,
    solToLamports(amountSOL)
  );

  if (!quote.success) {
    console.error('❌ Cannot get quote:', quote.error);
    return false;
  }

  // 3. Check price impact
  if (quote.priceImpactPct > 5) {
    console.warn('⚠️ High price impact:', quote.priceImpactPct.toFixed(2), '%');
    return false;
  }

  // 4. Check liquidity
  if (quote.outputAmount === 0) {
    console.error('❌ No liquidity');
    return false;
  }

  console.log('✅ All safety checks passed');
  return true;
}

/**
 * Safety Check: Validate before sell
 */
async function safetyCheckSell(wallet, tokenAddress) {
  const executor = new TradingExecutor(connection, wallet);

  // 1. Check token balance
  const balance = await executor.getTokenBalance(tokenAddress);
  if (balance === 0) {
    console.error('❌ No tokens to sell');
    return false;
  }

  // 2. Check if can get quote
  const quote = await fetchQuote(
    tokenAddress,
    NATIVE_SOL_MINT,
    Math.floor(balance)
  );

  if (!quote.success) {
    console.error('❌ Cannot get quote:', quote.error);
    return false;
  }

  console.log('✅ Safe to sell');
  console.log('- Token balance:', balance);
  console.log('- Estimated SOL:', quote.outputAmount / 1e9);

  return true;
}

// ============================================================================
// EXPORT
// ============================================================================

export {
  // Basic operations
  quickBuy,
  quickSell,
  checkPrice,
  buyWithCustomSlippage,
  partialSell,

  // Use cases
  autoBuyOnSignal,
  takeProfitStrategy,
  stopLossStrategy,
  dcaBuy,
  checkProfitability,

  // Safety checks
  safetyCheckBuy,
  safetyCheckSell
};

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*

// Example 1: Simple buy
await quickBuy(wallet, 'TokenAddress', 0.1);

// Example 2: Simple sell
await quickSell(wallet, 'TokenAddress', 100);

// Example 3: Check price first
const quote = await checkPrice('TokenAddress', 0.1);
if (quote && quote.priceImpactPct < 2) {
  await quickBuy(wallet, 'TokenAddress', 0.1);
}

// Example 4: Buy with 2% slippage
await buyWithCustomSlippage(wallet, 'TokenAddress', 0.1, 2);

// Example 5: Sell 50% of position
await partialSell(wallet, 'TokenAddress', 50);

// Example 6: Auto-buy on signal
const signal = { ca: 'TokenAddress', grade: 'A+', ... };
await autoBuyOnSignal(wallet, signal, 1.5); // 1.5 SOL balance

// Example 7: Take profit at 2x
const trade = { ca: 'TokenAddress', entryPrice: 0.001, ... };
await takeProfitStrategy(wallet, trade, 0.002); // Current price 0.002

// Example 8: DCA buy
await dcaBuy(wallet, 'TokenAddress', 0.5, 5, 60000); // 0.5 SOL over 5 buys, 1 min apart

// Example 9: Safety check before buy
if (await safetyCheckBuy(wallet, 'TokenAddress', 0.1)) {
  await quickBuy(wallet, 'TokenAddress', 0.1);
}

*/
