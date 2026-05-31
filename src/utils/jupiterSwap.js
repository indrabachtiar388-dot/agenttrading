/**
 * jupiterSwap.js — Jupiter Aggregator Integration
 *
 * Integration dengan Jupiter V6 API untuk swap execution
 * Fitur:
 * - Fetch best quote dari Jupiter
 * - Build swap transaction dengan versioned transactions
 * - Execute swap dengan retry logic
 * - Slippage protection & price impact calculation
 */

import {
  VersionedTransaction,
  TransactionMessage,
  PublicKey,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';

import {
  JUPITER_ENDPOINTS,
  NATIVE_SOL_MINT,
  DEFAULT_SWAP_CONFIG,
  TRANSACTION_CONFIG,
  ERROR_MESSAGES,
  getPriceImpactLevel,
  validateSlippage
} from '../config/jupiter.js';

/**
 * Fetch quote dari Jupiter API
 * @param {string} inputMint - Input token mint address
 * @param {string} outputMint - Output token mint address
 * @param {number} amount - Amount in smallest unit (lamports for SOL)
 * @param {object} options - Quote options
 * @returns {Promise<object>} Quote data
 */
export async function fetchQuote(inputMint, outputMint, amount, options = {}) {
  try {
    const slippageBps = validateSlippage(options.slippageBps || DEFAULT_SWAP_CONFIG.slippageBps);

    // Build query parameters
    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount: amount.toString(),
      slippageBps: slippageBps.toString(),
      onlyDirectRoutes: (options.onlyDirectRoutes || DEFAULT_SWAP_CONFIG.onlyDirectRoutes).toString(),
      maxAccounts: (options.maxAccounts || DEFAULT_SWAP_CONFIG.maxAccounts).toString()
    });

    // Add optional parameters
    if (options.swapMode) {
      params.append('swapMode', options.swapMode);
    }

    if (options.platformFeeBps) {
      params.append('platformFeeBps', options.platformFeeBps.toString());
    }

    // Fetch quote from Jupiter
    const response = await fetch(`${JUPITER_ENDPOINTS.QUOTE}?${params.toString()}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Jupiter API error: ${response.status}`);
    }

    const quoteData = await response.json();

    // Validate quote response
    if (!quoteData || !quoteData.outAmount) {
      throw new Error(ERROR_MESSAGES.NO_ROUTES);
    }

    // Calculate price impact
    const priceImpactPct = Math.abs(parseFloat(quoteData.priceImpactPct || 0));
    const priceImpactLevel = getPriceImpactLevel(priceImpactPct);

    // Parse route information
    const routeInfo = parseRouteInfo(quoteData);

    return {
      success: true,
      quote: quoteData,
      inputAmount: amount,
      outputAmount: parseInt(quoteData.outAmount),
      priceImpactPct,
      priceImpactLevel,
      routeInfo,
      slippageBps,
      timestamp: Date.now()
    };

  } catch (error) {
    console.error('Fetch quote error:', error);
    return {
      success: false,
      error: error.message,
      timestamp: Date.now()
    };
  }
}

/**
 * Build swap transaction dari Jupiter API
 * @param {object} connection - Solana connection
 * @param {object} wallet - Wallet object dengan publicKey
 * @param {object} quoteResponse - Quote response dari fetchQuote
 * @param {object} options - Swap options
 * @returns {Promise<object>} Transaction data
 */
export async function buildSwapTransaction(connection, wallet, quoteResponse, options = {}) {
  try {
    if (!quoteResponse.success || !quoteResponse.quote) {
      throw new Error('Invalid quote response');
    }

    const userPublicKey = new PublicKey(wallet.publicKey);

    // Prepare swap request body
    const swapRequest = {
      quoteResponse: quoteResponse.quote,
      userPublicKey: userPublicKey.toString(),
      wrapAndUnwrapSol: options.wrapUnwrapSOL ?? DEFAULT_SWAP_CONFIG.wrapUnwrapSOL,
      useSharedAccounts: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: options.priorityFeeLamports || DEFAULT_SWAP_CONFIG.priorityFeeLamports
    };

    // Add optional fee account
    if (options.feeAccount) {
      swapRequest.feeAccount = options.feeAccount;
    }

    // Auto set priority fee if enabled
    if (options.autoSetPriorityFee ?? DEFAULT_SWAP_CONFIG.autoSetPriorityFee) {
      swapRequest.prioritizationFeeLamports = 'auto';
    }

    // Fetch swap transaction from Jupiter
    const response = await fetch(JUPITER_ENDPOINTS.SWAP, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(swapRequest)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Swap API error: ${response.status}`);
    }

    const swapData = await response.json();

    // Deserialize transaction
    const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

    return {
      success: true,
      transaction,
      quoteResponse,
      lastValidBlockHeight: swapData.lastValidBlockHeight,
      prioritizationFeeLamports: swapData.prioritizationFeeLamports,
      computeUnitLimit: swapData.computeUnitLimit,
      timestamp: Date.now()
    };

  } catch (error) {
    console.error('Build swap transaction error:', error);
    return {
      success: false,
      error: error.message,
      timestamp: Date.now()
    };
  }
}

/**
 * Execute swap dengan retry logic
 * @param {object} connection - Solana connection
 * @param {object} wallet - Wallet object dengan signTransaction
 * @param {object} transactionData - Transaction data dari buildSwapTransaction
 * @param {object} options - Execution options
 * @returns {Promise<object>} Execution result
 */
export async function executeSwap(connection, wallet, transactionData, options = {}) {
  if (!transactionData.success || !transactionData.transaction) {
    return {
      success: false,
      error: 'Invalid transaction data',
      timestamp: Date.now()
    };
  }

  const maxRetries = options.maxRetries || TRANSACTION_CONFIG.maxRetries;
  const retryDelay = options.retryDelay || TRANSACTION_CONFIG.retryDelay;

  let lastError;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;

    try {
      console.log(`Swap attempt ${attempt}/${maxRetries}...`);

      // Sign transaction
      const signedTx = await wallet.signTransaction(transactionData.transaction);

      // Send transaction
      const signature = await connection.sendRawTransaction(
        signedTx.serialize(),
        {
          skipPreflight: options.skipPreflight || TRANSACTION_CONFIG.skipPreflight,
          preflightCommitment: TRANSACTION_CONFIG.preflightCommitment,
          maxRetries: 0 // We handle retries manually
        }
      );

      console.log('Transaction sent:', signature);

      // Confirm transaction
      const confirmation = await confirmTransactionWithTimeout(
        connection,
        signature,
        transactionData.lastValidBlockHeight,
        options.confirmationTimeout || TRANSACTION_CONFIG.confirmationTimeout
      );

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      // Get transaction details
      const txDetails = await connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });

      return {
        success: true,
        signature,
        confirmation,
        txDetails,
        quoteResponse: transactionData.quoteResponse,
        attempts: attempt,
        timestamp: Date.now()
      };

    } catch (error) {
      lastError = error;
      console.error(`Swap attempt ${attempt} failed:`, error.message);

      // Check if error is retryable
      if (!isRetryableError(error) || attempt >= maxRetries) {
        break;
      }

      // Wait before retry
      if (attempt < maxRetries) {
        console.log(`Retrying in ${retryDelay}ms...`);
        await sleep(retryDelay);
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || ERROR_MESSAGES.TRANSACTION_FAILED,
    attempts: attempt,
    timestamp: Date.now()
  };
}

/**
 * Simulate swap untuk validasi sebelum execute
 * @param {object} connection - Solana connection
 * @param {object} wallet - Wallet object
 * @param {string} inputMint - Input token mint
 * @param {string} outputMint - Output token mint
 * @param {number} amount - Amount to swap
 * @param {object} options - Simulation options
 * @returns {Promise<object>} Simulation result
 */
export async function simulateSwap(connection, wallet, inputMint, outputMint, amount, options = {}) {
  try {
    // Fetch quote
    const quoteResponse = await fetchQuote(inputMint, outputMint, amount, options);

    if (!quoteResponse.success) {
      return {
        success: false,
        error: quoteResponse.error,
        timestamp: Date.now()
      };
    }

    // Check price impact
    if (quoteResponse.priceImpactPct > (options.maxPriceImpact || 5)) {
      return {
        success: false,
        error: ERROR_MESSAGES.PRICE_IMPACT_HIGH,
        priceImpactPct: quoteResponse.priceImpactPct,
        timestamp: Date.now()
      };
    }

    // Build transaction
    const txData = await buildSwapTransaction(connection, wallet, quoteResponse, options);

    if (!txData.success) {
      return {
        success: false,
        error: txData.error,
        timestamp: Date.now()
      };
    }

    // Simulate transaction
    const simulation = await connection.simulateTransaction(txData.transaction, {
      commitment: 'confirmed'
    });

    if (simulation.value.err) {
      return {
        success: false,
        error: `Simulation failed: ${JSON.stringify(simulation.value.err)}`,
        simulation: simulation.value,
        timestamp: Date.now()
      };
    }

    return {
      success: true,
      quoteResponse,
      simulation: simulation.value,
      estimatedOutput: quoteResponse.outputAmount,
      priceImpactPct: quoteResponse.priceImpactPct,
      priceImpactLevel: quoteResponse.priceImpactLevel,
      routeInfo: quoteResponse.routeInfo,
      timestamp: Date.now()
    };

  } catch (error) {
    console.error('Simulate swap error:', error);
    return {
      success: false,
      error: error.message,
      timestamp: Date.now()
    };
  }
}

/**
 * Helper: Confirm transaction dengan timeout
 */
async function confirmTransactionWithTimeout(connection, signature, lastValidBlockHeight, timeout) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const confirmation = await connection.confirmTransaction(
        {
          signature,
          lastValidBlockHeight,
          blockhash: (await connection.getLatestBlockhash()).blockhash
        },
        TRANSACTION_CONFIG.commitment
      );

      return confirmation;
    } catch (error) {
      // If block height exceeded, transaction failed
      if (error.message?.includes('block height exceeded')) {
        throw new Error('Transaction expired');
      }

      // Continue waiting
      await sleep(1000);
    }
  }

  throw new Error('Transaction confirmation timeout');
}

/**
 * Helper: Check if error is retryable
 */
function isRetryableError(error) {
  const retryableErrors = [
    'blockhash not found',
    'block height exceeded',
    'timeout',
    'network',
    'connection',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND'
  ];

  const errorMessage = error.message?.toLowerCase() || '';
  return retryableErrors.some(msg => errorMessage.includes(msg));
}

/**
 * Helper: Parse route information dari quote
 */
function parseRouteInfo(quoteData) {
  const routePlan = quoteData.routePlan || [];

  return {
    numberOfRoutes: routePlan.length,
    marketInfos: routePlan.map(route => ({
      label: route.swapInfo?.label || 'Unknown',
      inputMint: route.swapInfo?.inputMint,
      outputMint: route.swapInfo?.outputMint,
      inAmount: route.swapInfo?.inAmount,
      outAmount: route.swapInfo?.outAmount,
      feeAmount: route.swapInfo?.feeAmount,
      feeMint: route.swapInfo?.feeMint
    })),
    totalFeeAmount: routePlan.reduce((sum, route) => {
      return sum + parseInt(route.swapInfo?.feeAmount || 0);
    }, 0)
  };
}

/**
 * Helper: Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Helper: Convert SOL to lamports
 */
export function solToLamports(sol) {
  return Math.floor(sol * LAMPORTS_PER_SOL);
}

/**
 * Helper: Convert lamports to SOL
 */
export function lamportsToSol(lamports) {
  return lamports / LAMPORTS_PER_SOL;
}

/**
 * Helper: Format token amount dengan decimals
 */
export function formatTokenAmount(amount, decimals) {
  return amount / Math.pow(10, decimals);
}

/**
 * Helper: Parse token amount ke smallest unit
 */
export function parseTokenAmount(amount, decimals) {
  return Math.floor(amount * Math.pow(10, decimals));
}

export default {
  fetchQuote,
  buildSwapTransaction,
  executeSwap,
  simulateSwap,
  solToLamports,
  lamportsToSol,
  formatTokenAmount,
  parseTokenAmount
};
