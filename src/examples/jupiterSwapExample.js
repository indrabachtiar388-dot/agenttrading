/**
 * jupiterSwapExample.js — Example Usage untuk Jupiter Integration
 *
 * Contoh penggunaan Jupiter Aggregator integration untuk swap execution
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { TradingExecutor } from '../utils/tradingExecutor.js';
import {
  fetchQuote,
  simulateSwap,
  solToLamports,
  lamportsToSol
} from '../utils/jupiterSwap.js';
import { NATIVE_SOL_MINT } from '../config/jupiter.js';

// ============================================================================
// EXAMPLE 1: Fetch Quote untuk SOL -> Token Swap
// ============================================================================

async function exampleFetchQuote() {
  console.log('\n=== Example 1: Fetch Quote ===\n');

  const inputMint = NATIVE_SOL_MINT; // SOL
  const outputMint = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'; // BONK
  const amountSOL = 0.1; // 0.1 SOL
  const amountLamports = solToLamports(amountSOL);

  try {
    const quote = await fetchQuote(inputMint, outputMint, amountLamports, {
      slippageBps: 100, // 1% slippage
      onlyDirectRoutes: false
    });

    if (quote.success) {
      console.log('Quote berhasil didapat:');
      console.log(`- Input: ${amountSOL} SOL`);
      console.log(`- Estimated Output: ${quote.outputAmount} tokens`);
      console.log(`- Price Impact: ${quote.priceImpactPct.toFixed(4)}%`);
      console.log(`- Price Impact Level: ${quote.priceImpactLevel}`);
      console.log(`- Number of Routes: ${quote.routeInfo.numberOfRoutes}`);
      console.log(`- Slippage: ${quote.slippageBps / 100}%`);
    } else {
      console.error('Quote gagal:', quote.error);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// ============================================================================
// EXAMPLE 2: Simulate Swap sebelum Execute
// ============================================================================

async function exampleSimulateSwap(connection, wallet) {
  console.log('\n=== Example 2: Simulate Swap ===\n');

  const tokenMint = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'; // BONK
  const amountSOL = 0.1;
  const amountLamports = solToLamports(amountSOL);

  try {
    const simulation = await simulateSwap(
      connection,
      wallet,
      NATIVE_SOL_MINT,
      tokenMint,
      amountLamports,
      {
        slippageBps: 100,
        maxPriceImpact: 5 // Max 5% price impact
      }
    );

    if (simulation.success) {
      console.log('Simulation berhasil:');
      console.log(`- Estimated Output: ${simulation.estimatedOutput} tokens`);
      console.log(`- Price Impact: ${simulation.priceImpactPct.toFixed(4)}%`);
      console.log(`- Price Impact Level: ${simulation.priceImpactLevel}`);
      console.log(`- Route Info:`, simulation.routeInfo);
      console.log('✅ Swap aman untuk dieksekusi');
    } else {
      console.error('❌ Simulation gagal:', simulation.error);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// ============================================================================
// EXAMPLE 3: Execute Buy Order (SOL -> Token)
// ============================================================================

async function exampleExecuteBuy(connection, wallet) {
  console.log('\n=== Example 3: Execute Buy Order ===\n');

  const executor = new TradingExecutor(connection, wallet);

  // Mock signal object
  const signal = {
    ca: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
    symbol: 'BONK',
    priceUsd: 0.00001234,
    grade: 'A+',
    confidence: 85
  };

  const amountSol = 0.1; // Buy dengan 0.1 SOL

  try {
    console.log(`Executing buy order untuk ${signal.symbol}...`);
    console.log(`Amount: ${amountSol} SOL`);

    const result = await executor.executeBuy(signal, amountSol, {
      slippageBps: 100, // 1% slippage
      autoSetPriorityFee: true,
      maxRetries: 3
    });

    if (result.success) {
      console.log('\n✅ Buy order berhasil!');
      console.log(`- Signature: ${result.signature}`);
      console.log(`- Amount: ${result.amountSol} SOL`);
      console.log(`- Estimated Output: ${result.estimatedOutput} tokens`);
      console.log(`- Price Impact: ${result.priceImpact.toFixed(4)}%`);
      console.log(`- Slippage: ${result.slippage}%`);
      console.log(`- Route Info:`, result.routeInfo);
    } else {
      console.error('\n❌ Buy order gagal:', result.error);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// ============================================================================
// EXAMPLE 4: Execute Sell Order (Token -> SOL)
// ============================================================================

async function exampleExecuteSell(connection, wallet) {
  console.log('\n=== Example 4: Execute Sell Order ===\n');

  const executor = new TradingExecutor(connection, wallet);

  // Mock trade object
  const trade = {
    ca: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
    symbol: 'BONK',
    entryPrice: 0.00001234,
    amount: 1000000,
    status: 'ACTIVE'
  };

  const percentage = 100; // Sell 100% of position

  try {
    console.log(`Executing sell order untuk ${trade.symbol}...`);
    console.log(`Percentage: ${percentage}%`);

    const result = await executor.executeSell(trade, percentage);

    if (result.success) {
      console.log('\n✅ Sell order berhasil!');
      console.log(`- Signature: ${result.signature}`);
      console.log(`- Amount Sold: ${result.amountSold} tokens`);
      console.log(`- Estimated SOL Received: ${result.estimatedSOLReceived} SOL`);
      console.log(`- Price Impact: ${result.priceImpact?.toFixed(4)}%`);
    } else {
      console.error('\n❌ Sell order gagal:', result.error);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// ============================================================================
// EXAMPLE 5: Error Handling untuk Common Cases
// ============================================================================

async function exampleErrorHandling(connection, wallet) {
  console.log('\n=== Example 5: Error Handling ===\n');

  const executor = new TradingExecutor(connection, wallet);

  // Test Case 1: Insufficient Balance
  console.log('Test Case 1: Insufficient Balance');
  try {
    const signal = {
      ca: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
      symbol: 'BONK',
      priceUsd: 0.00001234,
      grade: 'A+',
      confidence: 85
    };

    const result = await executor.executeBuy(signal, 1000); // 1000 SOL (likely insufficient)

    if (!result.success) {
      console.log(`✅ Error handled correctly: ${result.error}`);
    }
  } catch (error) {
    console.log(`✅ Error caught: ${error.message}`);
  }

  // Test Case 2: Invalid Token Address
  console.log('\nTest Case 2: Invalid Token Address');
  try {
    const invalidQuote = await fetchQuote(
      NATIVE_SOL_MINT,
      'InvalidTokenAddress123',
      solToLamports(0.1)
    );

    if (!invalidQuote.success) {
      console.log(`✅ Error handled correctly: ${invalidQuote.error}`);
    }
  } catch (error) {
    console.log(`✅ Error caught: ${error.message}`);
  }

  // Test Case 3: High Price Impact
  console.log('\nTest Case 3: High Price Impact Warning');
  try {
    const simulation = await simulateSwap(
      connection,
      wallet,
      NATIVE_SOL_MINT,
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
      solToLamports(100), // Large amount = high price impact
      {
        slippageBps: 100,
        maxPriceImpact: 5
      }
    );

    if (!simulation.success) {
      console.log(`✅ High price impact detected: ${simulation.error}`);
    } else if (simulation.priceImpactLevel === 'high' || simulation.priceImpactLevel === 'extreme') {
      console.log(`⚠️ Warning: Price impact is ${simulation.priceImpactLevel} (${simulation.priceImpactPct.toFixed(2)}%)`);
    }
  } catch (error) {
    console.log(`✅ Error caught: ${error.message}`);
  }

  // Test Case 4: Zero Balance Token Sell
  console.log('\nTest Case 4: Zero Balance Token Sell');
  try {
    const trade = {
      ca: 'SomeTokenWithZeroBalance111111111111111111111',
      symbol: 'ZERO',
      entryPrice: 0.001,
      amount: 0,
      status: 'ACTIVE'
    };

    const result = await executor.executeSell(trade, 100);

    if (!result.success) {
      console.log(`✅ Error handled correctly: ${result.error}`);
    }
  } catch (error) {
    console.log(`✅ Error caught: ${error.message}`);
  }
}

// ============================================================================
// EXAMPLE 6: Advanced Usage dengan Custom Settings
// ============================================================================

async function exampleAdvancedUsage(connection, wallet) {
  console.log('\n=== Example 6: Advanced Usage ===\n');

  const executor = new TradingExecutor(connection, wallet);

  const signal = {
    ca: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    symbol: 'BONK',
    priceUsd: 0.00001234,
    grade: 'A+',
    confidence: 85
  };

  try {
    console.log('Executing dengan custom settings...');

    const result = await executor.executeBuy(signal, 0.1, {
      slippageBps: 150, // 1.5% slippage (higher for volatile tokens)
      autoSetPriorityFee: true, // Auto calculate priority fee
      maxRetries: 5, // More retries for better success rate
      onlyDirectRoutes: false, // Allow multi-hop routes for better prices
      maxAccounts: 64 // Maximum accounts for complex routes
    });

    if (result.success) {
      console.log('\n✅ Advanced buy order berhasil!');
      console.log('Settings used:');
      console.log(`- Slippage: ${result.slippage}%`);
      console.log(`- Price Impact: ${result.priceImpact.toFixed(4)}%`);
      console.log(`- Routes: ${result.routeInfo?.numberOfRoutes || 'N/A'}`);
    } else {
      console.error('\n❌ Advanced buy order gagal:', result.error);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// ============================================================================
// Main Function untuk Run All Examples
// ============================================================================

export async function runAllExamples() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Jupiter Aggregator Integration - Usage Examples       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Setup connection (gunakan RPC endpoint yang sesuai)
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

  // Mock wallet object (dalam production, gunakan wallet adapter)
  const mockWallet = {
    publicKey: 'YourWalletPublicKeyHere',
    signTransaction: async (tx) => tx // Mock sign function
  };

  // Run examples
  await exampleFetchQuote();

  // Note: Examples berikut memerlukan wallet yang terkoneksi
  // Uncomment untuk testing dengan wallet real

  // await exampleSimulateSwap(connection, mockWallet);
  // await exampleExecuteBuy(connection, mockWallet);
  // await exampleExecuteSell(connection, mockWallet);
  // await exampleErrorHandling(connection, mockWallet);
  // await exampleAdvancedUsage(connection, mockWallet);

  console.log('\n✅ All examples completed!');
}

// Export individual examples
export {
  exampleFetchQuote,
  exampleSimulateSwap,
  exampleExecuteBuy,
  exampleExecuteSell,
  exampleErrorHandling,
  exampleAdvancedUsage
};

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples().catch(console.error);
}
