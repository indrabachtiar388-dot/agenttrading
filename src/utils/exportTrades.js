/**
 * Trade History Export
 * Export trade data ke CSV dan JSON format
 */

/**
 * Convert trades to CSV format
 * @param {Array} trades - Array of trades
 * @param {boolean} includeTaxInfo - Include tax report columns
 * @returns {string} CSV string
 */
export function tradesToCSV(trades, includeTaxInfo = false) {
  if (!trades || trades.length === 0) {
    return '';
  }

  // CSV Headers
  const headers = [
    'Date',
    'Time',
    'Ticker',
    'Token Name',
    'Contract Address',
    'Grade',
    'Status',
    'Entry Price',
    'Exit Price',
    'Entry Amount (SOL)',
    'Exit Amount (SOL)',
    'PnL %',
    'PnL (SOL)',
    'Hold Time (minutes)',
    'TP %',
    'SL %',
    'Peak Price',
    'Peak %',
    'Position Remaining %',
    'Realized PnL %',
    'Exit Reason'
  ];

  if (includeTaxInfo) {
    headers.push(
      'Cost Basis (SOL)',
      'Proceeds (SOL)',
      'Capital Gain/Loss (SOL)',
      'Holding Period'
    );
  }

  // Convert trades to rows
  const rows = trades.map(trade => {
    const entryDate = trade.entryAt ? new Date(trade.entryAt) : null;
    const closedDate = trade.closedAt ? new Date(trade.closedAt) : null;
    const holdTimeMinutes = entryDate && closedDate
      ? Math.round((closedDate - entryDate) / 60000)
      : 0;

    const peakPct = trade.peakPrice && trade.entry
      ? (((trade.peakPrice - trade.entry) / trade.entry) * 100).toFixed(2)
      : '0';

    const row = [
      entryDate ? entryDate.toLocaleDateString('id-ID') : '-',
      entryDate ? entryDate.toLocaleTimeString('id-ID') : '-',
      trade.ticker || '-',
      trade.name || '-',
      trade.ca || '-',
      trade.grade || '-',
      trade.status || 'ACTIVE',
      trade.entry || 0,
      trade.exitPrice || trade.currentPrice || 0,
      trade.entryAmount || 0,
      trade.exitAmount || 0,
      (trade.pnlPct || 0).toFixed(2),
      (trade.pnlSol || 0).toFixed(4),
      holdTimeMinutes,
      (trade.tpPct || 0).toFixed(2),
      (trade.slPct || 0).toFixed(2),
      trade.peakPrice || 0,
      peakPct,
      ((trade.positionRemaining || 1) * 100).toFixed(0),
      (trade.realizedPnl || 0).toFixed(2),
      trade.exitReason || '-'
    ];

    if (includeTaxInfo) {
      const costBasis = trade.entryAmount || 0;
      const proceeds = trade.exitAmount || 0;
      const capitalGain = proceeds - costBasis;
      const holdingPeriod = holdTimeMinutes < 525600 ? 'Short-term' : 'Long-term'; // < 1 year

      row.push(
        costBasis.toFixed(4),
        proceeds.toFixed(4),
        capitalGain.toFixed(4),
        holdingPeriod
      );
    }

    return row;
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      // Escape cells containing commas or quotes
      const cellStr = String(cell);
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(','))
  ].join('\n');

  return csvContent;
}

/**
 * Convert trades to JSON format
 * @param {Array} trades - Array of trades
 * @param {boolean} pretty - Pretty print JSON
 * @returns {string} JSON string
 */
export function tradesToJSON(trades, pretty = true) {
  if (!trades || trades.length === 0) {
    return '[]';
  }

  const exportData = trades.map(trade => ({
    timestamp: trade.entryAt || Date.now(),
    closedAt: trade.closedAt || null,
    ticker: trade.ticker,
    name: trade.name,
    contractAddress: trade.ca,
    grade: trade.grade,
    status: trade.status,
    entry: {
      price: trade.entry,
      amount: trade.entryAmount,
      timestamp: trade.entryAt
    },
    exit: {
      price: trade.exitPrice || trade.currentPrice,
      amount: trade.exitAmount,
      timestamp: trade.closedAt,
      reason: trade.exitReason
    },
    performance: {
      pnlPct: trade.pnlPct,
      pnlSol: trade.pnlSol,
      realizedPnl: trade.realizedPnl,
      peakPrice: trade.peakPrice,
      peakPct: trade.peakPrice && trade.entry
        ? (((trade.peakPrice - trade.entry) / trade.entry) * 100)
        : 0
    },
    targets: {
      tpPct: trade.tpPct,
      slPct: trade.slPct,
      tp: trade.tp,
      sl: trade.sl
    },
    position: {
      remaining: trade.positionRemaining || 1,
      exitEvents: trade.exitEvents || []
    },
    metadata: {
      confidence: trade.confidence,
      score: trade.score,
      rr: trade.rr,
      liquidityUsd: trade.liquidityUsd
    }
  }));

  return pretty ? JSON.stringify(exportData, null, 2) : JSON.stringify(exportData);
}

/**
 * Download file to user's computer
 * @param {string} content - File content
 * @param {string} filename - Filename
 * @param {string} mimeType - MIME type
 */
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export trades to CSV file
 * @param {Array} trades - Array of trades
 * @param {Object} options - Export options
 */
export function exportToCSV(trades, options = {}) {
  const {
    filename = `memeagent-trades-${new Date().toISOString().split('T')[0]}.csv`,
    includeTaxInfo = false,
    filterCompleted = false
  } = options;

  let tradesToExport = trades;

  if (filterCompleted) {
    tradesToExport = trades.filter(t => t.status === 'WIN' || t.status === 'LOSS');
  }

  const csv = tradesToCSV(tradesToExport, includeTaxInfo);

  if (!csv) {
    throw new Error('No trades to export');
  }

  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
}

/**
 * Export trades to JSON file
 * @param {Array} trades - Array of trades
 * @param {Object} options - Export options
 */
export function exportToJSON(trades, options = {}) {
  const {
    filename = `memeagent-trades-${new Date().toISOString().split('T')[0]}.json`,
    pretty = true,
    filterCompleted = false
  } = options;

  let tradesToExport = trades;

  if (filterCompleted) {
    tradesToExport = trades.filter(t => t.status === 'WIN' || t.status === 'LOSS');
  }

  const json = tradesToJSON(tradesToExport, pretty);

  if (!json || json === '[]') {
    throw new Error('No trades to export');
  }

  downloadFile(json, filename, 'application/json;charset=utf-8;');
}

/**
 * Generate tax report
 * @param {Array} trades - Array of trades
 * @param {number} taxYear - Tax year (default current year)
 * @returns {Object} Tax report data
 */
export function generateTaxReport(trades, taxYear = new Date().getFullYear()) {
  const completedTrades = trades.filter(t =>
    (t.status === 'WIN' || t.status === 'LOSS') &&
    t.closedAt &&
    new Date(t.closedAt).getFullYear() === taxYear
  );

  const shortTerm = []; // < 1 year
  const longTerm = []; // >= 1 year

  completedTrades.forEach(trade => {
    const holdTimeMs = trade.closedAt - trade.entryAt;
    const holdTimeDays = holdTimeMs / (1000 * 60 * 60 * 24);

    const taxEntry = {
      date: new Date(trade.closedAt).toLocaleDateString('id-ID'),
      ticker: trade.ticker,
      ca: trade.ca,
      costBasis: trade.entryAmount || 0,
      proceeds: trade.exitAmount || 0,
      gainLoss: (trade.exitAmount || 0) - (trade.entryAmount || 0),
      holdDays: Math.round(holdTimeDays)
    };

    if (holdTimeDays < 365) {
      shortTerm.push(taxEntry);
    } else {
      longTerm.push(taxEntry);
    }
  });

  const totalShortTermGain = shortTerm.reduce((sum, t) => sum + t.gainLoss, 0);
  const totalLongTermGain = longTerm.reduce((sum, t) => sum + t.gainLoss, 0);
  const totalGain = totalShortTermGain + totalLongTermGain;

  return {
    taxYear,
    summary: {
      totalTrades: completedTrades.length,
      shortTermTrades: shortTerm.length,
      longTermTrades: longTerm.length,
      totalShortTermGain,
      totalLongTermGain,
      totalGain
    },
    shortTerm,
    longTerm
  };
}

/**
 * Export tax report to CSV
 * @param {Array} trades - Array of trades
 * @param {number} taxYear - Tax year
 */
export function exportTaxReport(trades, taxYear = new Date().getFullYear()) {
  const report = generateTaxReport(trades, taxYear);

  const headers = [
    'Date',
    'Ticker',
    'Contract Address',
    'Cost Basis (SOL)',
    'Proceeds (SOL)',
    'Gain/Loss (SOL)',
    'Hold Days',
    'Type'
  ];

  const rows = [
    ...report.shortTerm.map(t => [
      t.date,
      t.ticker,
      t.ca,
      t.costBasis.toFixed(4),
      t.proceeds.toFixed(4),
      t.gainLoss.toFixed(4),
      t.holdDays,
      'Short-term'
    ]),
    ...report.longTerm.map(t => [
      t.date,
      t.ticker,
      t.ca,
      t.costBasis.toFixed(4),
      t.proceeds.toFixed(4),
      t.gainLoss.toFixed(4),
      t.holdDays,
      'Long-term'
    ])
  ];

  // Add summary rows
  rows.push(
    [],
    ['SUMMARY'],
    ['Total Trades', report.summary.totalTrades],
    ['Short-term Trades', report.summary.shortTermTrades],
    ['Long-term Trades', report.summary.longTermTrades],
    ['Total Short-term Gain/Loss (SOL)', report.summary.totalShortTermGain.toFixed(4)],
    ['Total Long-term Gain/Loss (SOL)', report.summary.totalLongTermGain.toFixed(4)],
    ['Total Gain/Loss (SOL)', report.summary.totalGain.toFixed(4)]
  );

  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const filename = `memeagent-tax-report-${taxYear}.csv`;
  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
}

/**
 * Export performance summary
 * @param {Array} trades - Array of trades
 * @param {Object} stats - Performance stats
 */
export function exportPerformanceSummary(trades, stats) {
  const completedTrades = trades.filter(t => t.status === 'WIN' || t.status === 'LOSS');

  const summary = {
    generatedAt: new Date().toISOString(),
    overview: {
      totalTrades: stats.total,
      activeTrades: stats.active,
      completedTrades: completedTrades.length,
      wins: stats.wins,
      losses: stats.losses,
      winRate: stats.winRate,
      totalPnL: stats.totalPnlPct,
      expectancy: stats.expectancy
    },
    performance: {
      avgWin: stats.avgWinPct,
      avgLoss: stats.avgLossPct,
      bestTrade: stats.bestPct,
      worstTrade: stats.worstPct,
      avgMultiple: stats.avgMultiple
    },
    runners: {
      over3x: stats.over3x,
      over5x: stats.over5x,
      over10x: stats.over10x
    },
    trades: completedTrades.map(t => ({
      ticker: t.ticker,
      grade: t.grade,
      pnlPct: t.pnlPct,
      status: t.status,
      entryAt: t.entryAt,
      closedAt: t.closedAt
    }))
  };

  const json = JSON.stringify(summary, null, 2);
  const filename = `memeagent-performance-${new Date().toISOString().split('T')[0]}.json`;
  downloadFile(json, filename, 'application/json;charset=utf-8;');
}
