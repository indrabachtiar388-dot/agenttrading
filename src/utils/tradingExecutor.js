/**
 * tradingExecutor.js — Live Trading Execution Engine
 *
 * Mengeksekusi trade real on-chain menggunakan wallet yang terkoneksi.
 * Fitur:
 * - Auto-buy saat signal grade A+/A
 * - Position sizing adaptif
 * - Slippage protection
 * - Transaction confirmation
 * - Error handling & retry logic
 */

import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction
} from '@solana/spl-token';

// Jupiter integration
import {
  fetchQuote,
  buildSwapTransaction,
  executeSwap,
  simulateSwap as jupiterSimulateSwap,
  solToLamports,
  lamportsToSol
} from './jupiterSwap.js';

import {
  NATIVE_SOL_MINT,
  DEFAULT_SWAP_CONFIG,
  TRANSACTION_CONFIG,
  ERROR_MESSAGES
} from '../config/jupiter.js';

const SLIPPAGE_BPS = 100; // 1% default slippage
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

/**
 * Trading Executor Class
 */
export class TradingExecutor {
  constructor(connection, wallet) {
    this.connection = connection;
    this.wallet = wallet;
    this.isExecuting = false;
  }

  /**
   * Execute buy order untuk signal
   * @param {object} signal - Signal object dengan entry price
   * @param {number} amountSol - Amount dalam SOL untuk trade
   * @param {object} options - Trading options
   * @returns {Promise<object>} Transaction result
   */
  async executeBuy(signal, amountSol, options = {}) {
    if (this.isExecuting) {
      throw new Error('Trade sedang dieksekusi. Tunggu sebentar.');
    }

    this.isExecuting = true;

    try {
      // Validate inputs
      this.validateBuyParams(signal, amountSol);

      // Get wallet balance
      const balance = await this.getWalletBalance();
      if (balance < amountSol) {
        throw new Error(`Balance tidak cukup. Balance: ${balance.toFixed(4)} SOL, Required: ${amountSol} SOL`);
      }

      // Calculate slippage
      const slippageBps = options.slippageBps || SLIPPAGE_BPS;
      const maxPrice = signal.priceUsd * (1 + slippageBps / 10000);

      // Simulate transaction first
      const simulation = await this.simulateSwap(signal.ca, amountSol, maxPrice);
      if (!simulation.success) {
        throw new Error(`Simulation failed: ${simulation.error}`);
      }

      // Build swap transaction using Jupiter
      const txData = await this.buildSwapTransaction(
        signal.ca,
        amountSol,
        maxPrice,
        {
          slippageBps: slippageBps,
          autoSetPriorityFee: options.autoSetPriorityFee ?? true,
          ...options
        }
      );

      // Execute swap using Jupiter
      const result = await executeSwap(
        this.connection,
        this.wallet,
        txData,
        {
          maxRetries: options.maxRetries || MAX_RETRIES,
          retryDelay: options.retryDelay || RETRY_DELAY,
          skipPreflight: options.skipPreflight || false
        }
      );

      if (!result.success) {
        throw new Error(result.error || ERROR_MESSAGES.TRANSACTION_FAILED);
      }

      const signature = result.signature;
      const confirmation = result.confirmation;

      return {
        success: true,
        signature,
        confirmation,
        signal,
        amountSol,
        executedPrice: simulation.executedPrice,
        estimatedOutput: simulation.estimatedOutput,
        priceImpact: simulation.priceImpact,
        priceImpactLevel: simulation.priceImpactLevel,
        slippage: slippageBps / 100,
        routeInfo: txData.quoteData?.routeInfo,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('Execute buy failed:', error);
      return {
        success: false,
        error: error.message,
        signal,
        amountSol,
        timestamp: Date.now()
      };
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Execute sell order untuk close position
   * @param {object} trade - Trade object
   * @param {number} percentage - Percentage to sell (0-100)
   * @param {object} options - Trading options
   * @returns {Promise<object>} Transaction result
   */
  async executeSell(trade, percentage = 100, options = {}) {
    if (this.isExecuting) {
      throw new Error('Trade sedang dieksekusi. Tunggu sebentar.');
    }

    this.isExecuting = true;

    try {
      // Validate inputs
      if (percentage <= 0 || percentage > 100) {
        throw new Error('Percentage harus antara 0-100');
      }

      // Get token balance
      const tokenBalance = await this.getTokenBalance(trade.ca);
      if (tokenBalance === 0) {
        throw new Error('Token balance kosong');
      }

      const amountToSell = (tokenBalance * percentage) / 100;

      // Build swap transaction (token -> SOL) using Jupiter
      const txData = await this.buildSwapTransaction(
        trade.ca,
        amountToSell,
        null,
        {
          reverse: true, // Sell mode
          slippageBps: options?.slippageBps || SLIPPAGE_BPS,
          autoSetPriorityFee: options?.autoSetPriorityFee ?? true
        }
      );

      // Execute swap using Jupiter
      const result = await executeSwap(
        this.connection,
        this.wallet,
        txData,
        {
          maxRetries: options?.maxRetries || MAX_RETRIES,
          retryDelay: options?.retryDelay || RETRY_DELAY,
          skipPreflight: options?.skipPreflight || false
        }
      );

      if (!result.success) {
        throw new Error(result.error || ERROR_MESSAGES.TRANSACTION_FAILED);
      }

      const signature = result.signature;
      const confirmation = result.confirmation;

      return {
        success: true,
        signature,
        confirmation,
        trade,
        percentage,
        amountSold: amountToSell,
        estimatedSOLReceived: txData.quoteData?.outputAmount ? lamportsToSol(txData.quoteData.outputAmount) : null,
        priceImpact: txData.quoteData?.priceImpactPct,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('Execute sell failed:', error);
      return {
        success: false,
        error: error.message,
        trade,
        percentage,
        timestamp: Date.now()
      };
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Validate buy parameters
   */
  validateBuyParams(signal, amountSol) {
    if (!signal || !signal.ca) {
      throw new Error('Signal tidak valid');
    }

    if (!signal.priceUsd || signal.priceUsd <= 0) {
      throw new Error('Price tidak valid');
    }

    if (amountSol <= 0) {
      throw new Error('Amount harus lebih dari 0');
    }

    if (amountSol < 0.01) {
      throw new Error('Minimum trade amount: 0.01 SOL');
    }
  }

  /**
   * Get wallet SOL balance
   */
  async getWalletBalance() {
    const publicKey = new PublicKey(this.wallet.publicKey);
    const balance = await this.connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  }

  /**
   * Get token balance
   */
  async getTokenBalance(tokenMint) {
    try {
      const publicKey = new PublicKey(this.wallet.publicKey);
      const mintPublicKey = new PublicKey(tokenMint);

      const tokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        publicKey
      );

      const balance = await this.connection.getTokenAccountBalance(tokenAccount);
      return Number(balance.value.amount) / Math.pow(10, balance.value.decimals);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Simulate swap transaction menggunakan Jupiter
   */
  async simulateSwap(tokenMint, amountSol, maxPrice) {
    try {
      // Convert SOL to lamports
      const amountLamports = solToLamports(amountSol);

      // Simulate swap: SOL -> Token
      const simulation = await jupiterSimulateSwap(
        this.connection,
        this.wallet,
        NATIVE_SOL_MINT,
        tokenMint,
        amountLamports,
        {
          slippageBps: SLIPPAGE_BPS,
          maxPriceImpact: 5 // 5% max price impact
        }
      );

      if (!simulation.success) {
        return {
          success: false,
          error: simulation.error
        };
      }

      // Calculate executed price
      const outputAmount = simulation.estimatedOutput;
      const executedPrice = outputAmount > 0 ? amountSol / outputAmount : 0;

      return {
        success: true,
        executedPrice,
        estimatedOutput: outputAmount,
        priceImpact: simulation.priceImpactPct,
        priceImpactLevel: simulation.priceImpactLevel,
        routeInfo: simulation.routeInfo
      };
    } catch (error) {
      console.error('Simulate swap error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Build swap transaction menggunakan Jupiter Aggregator
   */
  async buildSwapTransaction(tokenMint, amount, maxPrice, options = {}) {
    try {
      const reverse = options.reverse || false;

      let inputMint, outputMint, amountInSmallestUnit;

      if (reverse) {
        // Selling: Token -> SOL
        inputMint = tokenMint;
        outputMint = NATIVE_SOL_MINT;
        // Amount is already in token units, need to convert based on token decimals
        // For now, assume amount is in base units
        amountInSmallestUnit = Math.floor(amount);
      } else {
        // Buying: SOL -> Token
        inputMint = NATIVE_SOL_MINT;
        outputMint = tokenMint;
        amountInSmallestUnit = solToLamports(amount);
      }

      // Fetch quote from Jupiter
      const slippageBps = options.slippageBps || SLIPPAGE_BPS;
      const quoteResponse = await fetchQuote(
        inputMint,
        outputMint,
        amountInSmallestUnit,
        {
          slippageBps,
          onlyDirectRoutes: options.onlyDirectRoutes || false,
          maxAccounts: options.maxAccounts || DEFAULT_SWAP_CONFIG.maxAccounts
        }
      );

      if (!quoteResponse.success) {
        throw new Error(quoteResponse.error || ERROR_MESSAGES.NO_ROUTES);
      }

      // Check price impact
      if (quoteResponse.priceImpactPct > 5) {
        console.warn(`High price impact: ${quoteResponse.priceImpactPct.toFixed(2)}%`);
      }

      // Build swap transaction
      const txData = await buildSwapTransaction(
        this.connection,
        this.wallet,
        quoteResponse,
        {
          wrapUnwrapSOL: true,
          autoSetPriorityFee: options.autoSetPriorityFee ?? true,
          priorityFeeLamports: options.priorityFeeLamports || 0
        }
      );

      if (!txData.success) {
        throw new Error(txData.error || ERROR_MESSAGES.TRANSACTION_FAILED);
      }

      // Store quote data for later use
      txData.quoteData = quoteResponse;

      return txData;

    } catch (error) {
      console.error('Build swap transaction error:', error);
      throw error;
    }
  }

  /**
   * Sign transaction
   */
  async signTransaction(transaction) {
    if (!this.wallet.signTransaction) {
      throw new Error('Wallet tidak mendukung signing');
    }

    // Set recent blockhash
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = new PublicKey(this.wallet.publicKey);

    // Sign transaction
    const signed = await this.wallet.signTransaction(transaction);
    return signed;
  }

  /**
   * Send transaction with retry logic
   */
  async sendTransactionWithRetry(signedTransaction, retries = MAX_RETRIES) {
    let lastError;

    for (let i = 0; i < retries; i++) {
      try {
        const signature = await this.connection.sendRawTransaction(
          signedTransaction.serialize(),
          {
            skipPreflight: false,
            preflightCommitment: 'confirmed'
          }
        );

        return signature;
      } catch (error) {
        lastError = error;
        console.warn(`Transaction attempt ${i + 1} failed:`, error.message);

        if (i < retries - 1) {
          await this.sleep(RETRY_DELAY);
        }
      }
    }

    throw new Error(`Transaction failed after ${retries} attempts: ${lastError.message}`);
  }

  /**
   * Confirm transaction
   */
  async confirmTransaction(signature, commitment = 'confirmed') {
    const confirmation = await this.connection.confirmTransaction(
      signature,
      commitment
    );

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    return confirmation;
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Calculate position size berdasarkan balance dan risk management
 */
export function calculatePositionSize(balance, riskPercentage = 5, grade = 'A') {
  // Risk per trade: 1-5% of balance
  const riskPct = grade === 'A+' ? 5 : grade === 'A' ? 3 : 2;
  const maxRisk = Math.min(riskPercentage, riskPct);

  // Calculate position size
  const positionSize = (balance * maxRisk) / 100;

  // Minimum 0.01 SOL, Maximum 50% of balance
  return Math.max(0.01, Math.min(positionSize, balance * 0.5));
}

/**
 * Check if trade should be executed
 */
export function shouldExecuteTrade(signal, balance, existingTrades = []) {
  // Check balance
  if (balance < 0.01) {
    return { execute: false, reason: 'Balance tidak cukup (min 0.01 SOL)' };
  }

  // Check if already have position for this token
  const existingPosition = existingTrades.find(
    t => t.ca === signal.ca && t.status === 'ACTIVE'
  );

  if (existingPosition) {
    return { execute: false, reason: 'Sudah ada posisi aktif untuk token ini' };
  }

  // Check signal grade
  if (!['A+', 'A'].includes(signal.grade)) {
    return { execute: false, reason: 'Grade tidak memenuhi kriteria (hanya A+/A)' };
  }

  // Check confidence
  if (signal.confidence < 70) {
    return { execute: false, reason: 'Confidence terlalu rendah (<70%)' };
  }

  return { execute: true, reason: 'Ready to execute' };
}
