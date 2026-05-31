/**
 * useLiveTrading.jsx — Live Trading Management Hook
 *
 * Mengelola live trading execution dengan wallet yang terkoneksi.
 * Fitur:
 * - Auto-execute buy untuk signal grade A+/A
 * - Position management
 * - Auto-sell saat TP/SL hit
 * - Transaction history
 * - Risk management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Connection } from '@solana/web3.js';
import { useAuth } from './useSecureAuth';
import {
  TradingExecutor,
  calculatePositionSize,
  shouldExecuteTrade
} from '../utils/tradingExecutor';

const LIVE_TRADES_KEY = 'ma_live_trades';
const LIVE_SETTINGS_KEY = 'ma_live_settings';

// Default settings
const DEFAULT_SETTINGS = {
  enabled: false,
  autoExecute: false,
  riskPercentage: 3, // 3% per trade
  maxPositions: 5,
  minConfidence: 75,
  allowedGrades: ['A+', 'A'],
  slippageBps: 100, // 1%
  confirmBeforeTrade: true
};

export function useLiveTrading() {
  const { user, connection, signTransaction } = useAuth();
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(LIVE_SETTINGS_KEY);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [liveTrades, setLiveTrades] = useState(() => {
    try {
      const saved = localStorage.getItem(LIVE_TRADES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [pendingTrade, setPendingTrade] = useState(null);
  const [executing, setExecuting] = useState(false);
  const executorRef = useRef(null);

  // Initialize trading executor
  useEffect(() => {
    if (connection && user && user.canSign) {
      executorRef.current = new TradingExecutor(connection, {
        publicKey: user.publicKey,
        signTransaction: signTransaction
      });
    } else {
      executorRef.current = null;
    }
  }, [connection, user, signTransaction]);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem(LIVE_SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  // Save trades to localStorage
  useEffect(() => {
    localStorage.setItem(LIVE_TRADES_KEY, JSON.stringify(liveTrades));
  }, [liveTrades]);

  /**
   * Update settings
   */
  const updateSettings = useCallback((newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  /**
   * Check if can execute trade
   */
  const canExecuteTrade = useCallback(async (signal) => {
    if (!settings.enabled || !settings.autoExecute) {
      return { can: false, reason: 'Live trading disabled' };
    }

    if (!executorRef.current) {
      return { can: false, reason: 'Wallet tidak mendukung signing' };
    }

    if (!settings.allowedGrades.includes(signal.grade)) {
      return { can: false, reason: `Grade ${signal.grade} tidak diizinkan` };
    }

    if (signal.confidence < settings.minConfidence) {
      return { can: false, reason: `Confidence terlalu rendah (${signal.confidence}% < ${settings.minConfidence}%)` };
    }

    const activeTrades = liveTrades.filter(t => t.status === 'ACTIVE');
    if (activeTrades.length >= settings.maxPositions) {
      return { can: false, reason: `Max positions reached (${settings.maxPositions})` };
    }

    try {
      const balance = await executorRef.current.getWalletBalance();
      const check = shouldExecuteTrade(signal, balance, activeTrades);
      return { can: check.execute, reason: check.reason, balance };
    } catch (error) {
      return { can: false, reason: error.message };
    }
  }, [settings, liveTrades]);

  /**
   * Execute buy order
   */
  const executeBuy = useCallback(async (signal, amountSol = null) => {
    if (!executorRef.current) {
      throw new Error('Trading executor not initialized');
    }

    setExecuting(true);

    try {
      // Calculate position size if not provided
      let amount = amountSol;
      if (!amount) {
        const balance = await executorRef.current.getWalletBalance();
        amount = calculatePositionSize(balance, settings.riskPercentage, signal.grade);
      }

      // Execute trade
      const result = await executorRef.current.executeBuy(signal, amount, {
        slippageBps: settings.slippageBps
      });

      if (result.success) {
        // Create live trade record
        const trade = {
          id: 'live_' + Date.now(),
          ca: signal.ca,
          ticker: signal.ticker,
          name: signal.name,
          grade: signal.grade,
          side: 'BUY',
          entry: result.executedPrice,
          sl: signal.sl,
          tp: signal.tp,
          slPct: signal.slPct,
          tpPct: signal.tpPct,
          amountSol: amount,
          status: 'ACTIVE',
          signature: result.signature,
          openedAt: Date.now(),
          signal: signal
        };

        setLiveTrades(prev => [...prev, trade]);
        return { success: true, trade, result };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Execute buy failed:', error);
      return { success: false, error: error.message };
    } finally {
      setExecuting(false);
    }
  }, [settings]);

  /**
   * Execute sell order
   */
  const executeSell = useCallback(async (trade, percentage = 100, reason = 'Manual') => {
    if (!executorRef.current) {
      throw new Error('Trading executor not initialized');
    }

    setExecuting(true);

    try {
      const result = await executorRef.current.executeSell(trade, percentage);

      if (result.success) {
        // Update trade status
        setLiveTrades(prev => prev.map(t => {
          if (t.id === trade.id) {
            if (percentage >= 100) {
              return {
                ...t,
                status: 'CLOSED',
                closePrice: result.executedPrice || t.entry,
                closedAt: Date.now(),
                closeReason: reason,
                closeSignature: result.signature
              };
            } else {
              return {
                ...t,
                partialExits: [...(t.partialExits || []), {
                  percentage,
                  price: result.executedPrice,
                  signature: result.signature,
                  timestamp: Date.now()
                }]
              };
            }
          }
          return t;
        }));

        return { success: true, result };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Execute sell failed:', error);
      return { success: false, error: error.message };
    } finally {
      setExecuting(false);
    }
  }, []);

  /**
   * Request trade confirmation from user
   */
  const requestTradeConfirmation = useCallback((signal, amountSol) => {
    setPendingTrade({ signal, amountSol });
  }, []);

  /**
   * Confirm pending trade
   */
  const confirmPendingTrade = useCallback(async () => {
    if (!pendingTrade) return;

    const result = await executeBuy(pendingTrade.signal, pendingTrade.amountSol);
    setPendingTrade(null);
    return result;
  }, [pendingTrade, executeBuy]);

  /**
   * Cancel pending trade
   */
  const cancelPendingTrade = useCallback(() => {
    setPendingTrade(null);
  }, []);

  /**
   * Auto-execute trade for signal
   */
  const autoExecuteSignal = useCallback(async (signal) => {
    const check = await canExecuteTrade(signal);

    if (!check.can) {
      console.log(`Skip auto-execute: ${check.reason}`);
      return { executed: false, reason: check.reason };
    }

    // Calculate position size
    const amountSol = calculatePositionSize(
      check.balance,
      settings.riskPercentage,
      signal.grade
    );

    // If confirmation required, request confirmation
    if (settings.confirmBeforeTrade) {
      requestTradeConfirmation(signal, amountSol);
      return { executed: false, reason: 'Waiting for confirmation', pending: true };
    }

    // Execute immediately
    const result = await executeBuy(signal, amountSol);
    return { executed: result.success, ...result };
  }, [canExecuteTrade, settings, executeBuy, requestTradeConfirmation]);

  /**
   * Monitor active trades for TP/SL
   */
  const monitorActiveTrades = useCallback(async (currentPrices) => {
    if (!settings.enabled || !executorRef.current) return;

    const activeTrades = liveTrades.filter(t => t.status === 'ACTIVE');

    for (const trade of activeTrades) {
      const currentPrice = currentPrices[trade.ca];
      if (!currentPrice) continue;

      // Check SL
      if (currentPrice <= trade.sl) {
        console.log(`SL hit for ${trade.ticker} at ${currentPrice}`);
        await executeSell(trade, 100, 'Stop Loss');
      }

      // Check TP
      if (currentPrice >= trade.tp) {
        console.log(`TP hit for ${trade.ticker} at ${currentPrice}`);
        await executeSell(trade, 100, 'Take Profit');
      }
    }
  }, [settings, liveTrades, executeSell]);

  /**
   * Get live trading stats
   */
  const getStats = useCallback(() => {
    const closed = liveTrades.filter(t => t.status === 'CLOSED');
    const active = liveTrades.filter(t => t.status === 'ACTIVE');

    const wins = closed.filter(t => t.closePrice > t.entry);
    const losses = closed.filter(t => t.closePrice <= t.entry);

    return {
      total: closed.length,
      active: active.length,
      wins: wins.length,
      losses: losses.length,
      winRate: closed.length ? (wins.length / closed.length) * 100 : 0,
      totalVolume: liveTrades.reduce((sum, t) => sum + (t.amountSol || 0), 0)
    };
  }, [liveTrades]);

  /**
   * Clear all trades (for testing)
   */
  const clearTrades = useCallback(() => {
    setLiveTrades([]);
    localStorage.removeItem(LIVE_TRADES_KEY);
  }, []);

  return {
    // Settings
    settings,
    updateSettings,

    // Trades
    liveTrades,
    activeTrades: liveTrades.filter(t => t.status === 'ACTIVE'),
    closedTrades: liveTrades.filter(t => t.status === 'CLOSED'),

    // Execution
    executeBuy,
    executeSell,
    autoExecuteSignal,
    executing,

    // Confirmation
    pendingTrade,
    confirmPendingTrade,
    cancelPendingTrade,

    // Monitoring
    monitorActiveTrades,
    canExecuteTrade,

    // Stats
    stats: getStats(),
    clearTrades,

    // Status
    isEnabled: settings.enabled,
    isReady: !!executorRef.current && settings.enabled
  };
}
