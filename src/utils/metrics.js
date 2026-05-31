/**
 * Performance Metrics Calculator
 * Menghitung berbagai metrik trading performance seperti Sharpe ratio, max drawdown, dll.
 */

/**
 * Menghitung Sharpe Ratio
 * Mengukur risk-adjusted return (return per unit risk)
 * @param {Array} trades - Array of completed trades
 * @param {number} riskFreeRate - Risk-free rate (default 0 untuk crypto)
 * @returns {number} Sharpe ratio
 */
export function calculateSharpeRatio(trades, riskFreeRate = 0) {
  const completedTrades = trades.filter(t => t.status === 'WIN' || t.status === 'LOSS');

  if (completedTrades.length < 2) return 0;

  const returns = completedTrades.map(t => (t.pnlPct || 0) / 100);
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

  // Calculate standard deviation
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;

  return (avgReturn - riskFreeRate) / stdDev;
}

/**
 * Menghitung Maximum Drawdown
 * Penurunan terbesar dari peak ke trough dalam equity curve
 * @param {Array} trades - Array of completed trades
 * @returns {Object} { maxDrawdown, maxDrawdownPct, peakValue, troughValue }
 */
export function calculateMaxDrawdown(trades) {
  const completedTrades = trades
    .filter(t => t.status === 'WIN' || t.status === 'LOSS')
    .sort((a, b) => (a.closedAt || 0) - (b.closedAt || 0));

  if (completedTrades.length === 0) {
    return { maxDrawdown: 0, maxDrawdownPct: 0, peakValue: 0, troughValue: 0 };
  }

  let cumulative = 0;
  let peak = 0;
  let maxDrawdown = 0;
  let maxDrawdownPct = 0;
  let peakValue = 0;
  let troughValue = 0;

  completedTrades.forEach(trade => {
    cumulative += (trade.pnlPct || 0);

    if (cumulative > peak) {
      peak = cumulative;
    }

    const drawdown = peak - cumulative;
    const drawdownPct = peak !== 0 ? (drawdown / Math.abs(peak)) * 100 : 0;

    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownPct = drawdownPct;
      peakValue = peak;
      troughValue = cumulative;
    }
  });

  return {
    maxDrawdown: Math.abs(maxDrawdown),
    maxDrawdownPct: Math.abs(maxDrawdownPct),
    peakValue,
    troughValue
  };
}

/**
 * Menghitung Profit Factor
 * Ratio total profit vs total loss
 * @param {Array} trades - Array of completed trades
 * @returns {number} Profit factor (>1 = profitable)
 */
export function calculateProfitFactor(trades) {
  const completedTrades = trades.filter(t => t.status === 'WIN' || t.status === 'LOSS');

  if (completedTrades.length === 0) return 0;

  const totalProfit = completedTrades
    .filter(t => (t.pnlPct || 0) > 0)
    .reduce((sum, t) => sum + (t.pnlPct || 0), 0);

  const totalLoss = Math.abs(completedTrades
    .filter(t => (t.pnlPct || 0) < 0)
    .reduce((sum, t) => sum + (t.pnlPct || 0), 0));

  if (totalLoss === 0) return totalProfit > 0 ? Infinity : 0;

  return totalProfit / totalLoss;
}

/**
 * Menghitung Expectancy
 * Expected value per trade
 * @param {Array} trades - Array of completed trades
 * @returns {number} Expectancy percentage
 */
export function calculateExpectancy(trades) {
  const completedTrades = trades.filter(t => t.status === 'WIN' || t.status === 'LOSS');

  if (completedTrades.length === 0) return 0;

  const wins = completedTrades.filter(t => (t.pnlPct || 0) > 0);
  const losses = completedTrades.filter(t => (t.pnlPct || 0) < 0);

  const winRate = wins.length / completedTrades.length;
  const lossRate = 1 - winRate;

  const avgWin = wins.length > 0
    ? wins.reduce((sum, t) => sum + (t.pnlPct || 0), 0) / wins.length
    : 0;

  const avgLoss = losses.length > 0
    ? Math.abs(losses.reduce((sum, t) => sum + (t.pnlPct || 0), 0) / losses.length)
    : 0;

  return (winRate * avgWin) - (lossRate * avgLoss);
}

/**
 * Menghitung Win/Loss Streaks
 * Streak terpanjang menang dan kalah berturut-turut
 * @param {Array} trades - Array of completed trades
 * @returns {Object} { maxWinStreak, maxLossStreak, currentStreak }
 */
export function calculateStreaks(trades) {
  const completedTrades = trades
    .filter(t => t.status === 'WIN' || t.status === 'LOSS')
    .sort((a, b) => (a.closedAt || 0) - (b.closedAt || 0));

  if (completedTrades.length === 0) {
    return { maxWinStreak: 0, maxLossStreak: 0, currentStreak: 0, currentStreakType: null };
  }

  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let currentStreak = 0;
  let currentStreakType = null;

  completedTrades.forEach((trade, index) => {
    const isWin = trade.status === 'WIN';

    if (index === 0) {
      currentStreak = 1;
      currentStreakType = isWin ? 'WIN' : 'LOSS';
      if (isWin) maxWinStreak = 1;
      else maxLossStreak = 1;
    } else {
      const prevIsWin = completedTrades[index - 1].status === 'WIN';

      if (isWin === prevIsWin) {
        currentStreak++;
      } else {
        currentStreak = 1;
        currentStreakType = isWin ? 'WIN' : 'LOSS';
      }

      if (isWin && currentStreak > maxWinStreak) {
        maxWinStreak = currentStreak;
      } else if (!isWin && currentStreak > maxLossStreak) {
        maxLossStreak = currentStreak;
      }
    }
  });

  return {
    maxWinStreak,
    maxLossStreak,
    currentStreak,
    currentStreakType
  };
}

/**
 * Menghitung Average Hold Time
 * Rata-rata waktu holding position (dalam menit)
 * @param {Array} trades - Array of completed trades
 * @returns {number} Average hold time in minutes
 */
export function calculateAvgHoldTime(trades) {
  const completedTrades = trades.filter(t =>
    (t.status === 'WIN' || t.status === 'LOSS') && t.entryAt && t.closedAt
  );

  if (completedTrades.length === 0) return 0;

  const totalHoldTime = completedTrades.reduce((sum, t) => {
    return sum + (t.closedAt - t.entryAt);
  }, 0);

  return totalHoldTime / completedTrades.length / 60000; // Convert to minutes
}

/**
 * Menghitung Win Rate by Grade
 * Win rate untuk setiap grade (A+, A, B)
 * @param {Array} trades - Array of completed trades
 * @returns {Object} { 'A+': winRate, 'A': winRate, 'B': winRate }
 */
export function calculateWinRateByGrade(trades) {
  const completedTrades = trades.filter(t => t.status === 'WIN' || t.status === 'LOSS');

  const grades = ['A+', 'A', 'B'];
  const result = {};

  grades.forEach(grade => {
    const gradeTrades = completedTrades.filter(t => t.grade === grade);
    const wins = gradeTrades.filter(t => t.status === 'WIN').length;

    result[grade] = {
      winRate: gradeTrades.length > 0 ? (wins / gradeTrades.length) * 100 : 0,
      total: gradeTrades.length,
      wins,
      losses: gradeTrades.length - wins
    };
  });

  return result;
}

/**
 * Menghitung Best Performing Tokens
 * Top tokens berdasarkan PnL
 * @param {Array} trades - Array of completed trades
 * @param {number} limit - Number of top tokens to return
 * @returns {Array} Array of top performing tokens
 */
export function getBestPerformingTokens(trades, limit = 10) {
  const completedTrades = trades.filter(t => t.status === 'WIN' || t.status === 'LOSS');

  return completedTrades
    .sort((a, b) => (b.pnlPct || 0) - (a.pnlPct || 0))
    .slice(0, limit)
    .map(t => ({
      ticker: t.ticker,
      name: t.name,
      ca: t.ca,
      pnlPct: t.pnlPct,
      grade: t.grade,
      entryAt: t.entryAt,
      closedAt: t.closedAt,
      holdTime: t.closedAt && t.entryAt ? (t.closedAt - t.entryAt) / 60000 : 0
    }));
}

/**
 * Menghitung Worst Performing Tokens
 * Bottom tokens berdasarkan PnL
 * @param {Array} trades - Array of completed trades
 * @param {number} limit - Number of worst tokens to return
 * @returns {Array} Array of worst performing tokens
 */
export function getWorstPerformingTokens(trades, limit = 10) {
  const completedTrades = trades.filter(t => t.status === 'WIN' || t.status === 'LOSS');

  return completedTrades
    .sort((a, b) => (a.pnlPct || 0) - (b.pnlPct || 0))
    .slice(0, limit)
    .map(t => ({
      ticker: t.ticker,
      name: t.name,
      ca: t.ca,
      pnlPct: t.pnlPct,
      grade: t.grade,
      entryAt: t.entryAt,
      closedAt: t.closedAt,
      holdTime: t.closedAt && t.entryAt ? (t.closedAt - t.entryAt) / 60000 : 0
    }));
}

/**
 * Menghitung Daily/Weekly/Monthly PnL
 * Aggregate PnL by time period
 * @param {Array} trades - Array of completed trades
 * @param {string} period - 'daily', 'weekly', or 'monthly'
 * @returns {Array} Array of { date, pnl, trades }
 */
export function calculatePnLByPeriod(trades, period = 'daily') {
  const completedTrades = trades
    .filter(t => (t.status === 'WIN' || t.status === 'LOSS') && t.closedAt)
    .sort((a, b) => a.closedAt - b.closedAt);

  if (completedTrades.length === 0) return [];

  const grouped = {};

  completedTrades.forEach(trade => {
    const date = new Date(trade.closedAt);
    let key;

    if (period === 'daily') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    } else if (period === 'weekly') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getDate()) / 7)).padStart(2, '0')}`;
    } else if (period === 'monthly') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    if (!grouped[key]) {
      grouped[key] = { date: key, pnl: 0, trades: 0, wins: 0, losses: 0 };
    }

    grouped[key].pnl += (trade.pnlPct || 0);
    grouped[key].trades++;
    if (trade.status === 'WIN') grouped[key].wins++;
    else grouped[key].losses++;
  });

  return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Menghitung Risk-Adjusted Returns (Calmar Ratio)
 * Return / Max Drawdown
 * @param {Array} trades - Array of completed trades
 * @returns {number} Calmar ratio
 */
export function calculateCalmarRatio(trades) {
  const completedTrades = trades.filter(t => t.status === 'WIN' || t.status === 'LOSS');

  if (completedTrades.length === 0) return 0;

  const totalReturn = completedTrades.reduce((sum, t) => sum + (t.pnlPct || 0), 0);
  const { maxDrawdown } = calculateMaxDrawdown(trades);

  if (maxDrawdown === 0) return totalReturn > 0 ? Infinity : 0;

  return totalReturn / maxDrawdown;
}

/**
 * Menghitung semua metrics sekaligus
 * @param {Array} trades - Array of trades
 * @returns {Object} All metrics
 */
export function calculateAllMetrics(trades) {
  return {
    sharpeRatio: calculateSharpeRatio(trades),
    maxDrawdown: calculateMaxDrawdown(trades),
    profitFactor: calculateProfitFactor(trades),
    expectancy: calculateExpectancy(trades),
    streaks: calculateStreaks(trades),
    avgHoldTime: calculateAvgHoldTime(trades),
    winRateByGrade: calculateWinRateByGrade(trades),
    bestTokens: getBestPerformingTokens(trades, 5),
    worstTokens: getWorstPerformingTokens(trades, 5),
    calmarRatio: calculateCalmarRatio(trades),
    dailyPnL: calculatePnLByPeriod(trades, 'daily'),
    weeklyPnL: calculatePnLByPeriod(trades, 'weekly'),
    monthlyPnL: calculatePnLByPeriod(trades, 'monthly')
  };
}
