import { getSnapshots, getPeak, getFirst } from './snapshotStore';

const LEVELS = ['low', 'medium', 'high', 'critical'];

export function analyzeRug(token) {
  if (!token?.ca) return emptyResult();

  const reasons = [];
  let level = 'low';

  const snapshots = getSnapshots(token.ca);
  const flags = token.flags || {};
  const priceChange = token.priceChange || {};
  const lpStatus = String(token.lpStatus || '').toLowerCase();
  const isBondingCurve = token.provider === 'PumpPortal live websocket'
    || token.provider === 'Pump.fun frontend API'
    || lpStatus.includes('bonding');

  // 1. MadeOnSol/Birdeye blacklist
  if (flags.madeOnSolBlacklisted) {
    reasons.push('Sumber indeks blacklist token ini.');
    level = escalate(level, 'critical');
  }

  const m5 = Number(priceChange.m5 || 0);
  const h1 = Number(priceChange.h1 || 0);

  // 2. Authority red flag with active mint + LP drop
  if (flags.mintRevoked === false && h1 < -25) {
    reasons.push('Mint authority masih kebuka dan harga 1 jam terakhir drop > 25%.');
    level = escalate(level, 'critical');
  }
  if (flags.freezeActive === true) {
    reasons.push('Freeze authority aktif — wallet bisa dikunci.');
    level = escalate(level, 'high');
  }

  // 3. Price cliff
  if (m5 <= -30) {
    reasons.push(`Candle 5m drop ${m5.toFixed(1)}%.`);
    level = escalate(level, 'critical');
  } else if (m5 <= -18) {
    reasons.push(`Candle 5m drop ${m5.toFixed(1)}%.`);
    level = escalate(level, 'high');
  }
  if (h1 <= -50) {
    reasons.push(`Drawdown 1 jam ${h1.toFixed(1)}%.`);
    level = escalate(level, 'critical');
  } else if (h1 <= -35) {
    reasons.push(`Drawdown 1 jam ${h1.toFixed(1)}%.`);
    level = escalate(level, 'high');
  }

  // 4. Sell domination
  const sells = Number(flags.sells5m || 0);
  const buys = Number(flags.buys5m || 0);
  if (sells > buys * 3 + 8 && (sells + buys) > 15) {
    reasons.push(`Tekanan jual berat: ${sells} sell vs ${buys} buy 5m.`);
    level = escalate(level, 'high');
  }

  // 5. Snapshot-based LP pull detection (needs >=2 snapshots)
  if (snapshots.length >= 2 && !isBondingCurve) {
    const latest = snapshots[snapshots.length - 1];
    const previous = snapshots[snapshots.length - 2];
    const elapsedSeconds = Math.max(1, (latest._ts - previous._ts) / 1000);

    if (previous.liquidityUsd > 8000 && latest.liquidityUsd < previous.liquidityUsd * 0.5 && elapsedSeconds <= 120) {
      const dropPct = ((previous.liquidityUsd - latest.liquidityUsd) / previous.liquidityUsd) * 100;
      reasons.push(`LP ditarik ${dropPct.toFixed(0)}% dalam ${elapsedSeconds.toFixed(0)}s.`);
      level = escalate(level, 'critical');
    } else if (previous.liquidityUsd > 15000 && latest.liquidityUsd < previous.liquidityUsd * 0.7) {
      const dropPct = ((previous.liquidityUsd - latest.liquidityUsd) / previous.liquidityUsd) * 100;
      reasons.push(`LP turun ${dropPct.toFixed(0)}% antar snapshot.`);
      level = escalate(level, 'high');
    }

    const peakLp = getPeak(token.ca, 'liquidityUsd');
    if (peakLp && peakLp > 8000 && latest.liquidityUsd < peakLp * 0.4) {
      reasons.push(`LP cuma ${((latest.liquidityUsd / peakLp) * 100).toFixed(0)}% dari puncak.`);
      level = escalate(level, 'high');
    }
  }

  // 6. Volume death — only for tokens that previously had real volume
  if (snapshots.length >= 3 && !isBondingCurve) {
    const peakVolume = getPeak(token.ca, 'volume5m');
    const latestVolume = snapshots[snapshots.length - 1].volume5m;
    if (peakVolume && peakVolume > 8000 && latestVolume < peakVolume * 0.1) {
      reasons.push(`Volume mati ${((1 - latestVolume / peakVolume) * 100).toFixed(0)}% dari puncak.`);
      level = escalate(level, 'high');
    }
  }

  // 7. Txn stagnation — token previously active now silent
  const txns5m = Number(flags.txns5m || 0);
  const firstSnapshot = getFirst(token.ca);
  const ageSec = firstSnapshot ? (Date.now() - firstSnapshot._ts) / 1000 : 0;
  if (!isBondingCurve && txns5m <= 1 && ageSec > 600 && snapshots.some((snapshot) => snapshot.txns5m >= 8)) {
    reasons.push('Transaksi mati pada token yang sebelumnya aktif.');
    level = escalate(level, 'high');
  }

  // 8. Wash + low liquidity combo
  const volumeRatio = Number(flags.volumeLiquidityRatio || 0);
  if (volumeRatio > 10 && Number(token.liquidityUsd || 0) < 5000) {
    reasons.push(`Volume/LP ratio ${volumeRatio.toFixed(1)}x — kemungkinan wash.`);
    level = escalate(level, 'medium');
  }

  const isDead = txns5m === 0 && Number(token.liquidityUsd || 0) < 3000 && !isBondingCurve && ageSec > 600;
  const RUG_KEYWORDS = /lp|rug|ditarik|freeze|blacklist|authority|mint/i;
  const isRugged = level === 'critical' || (level === 'high' && reasons.some((reason) => RUG_KEYWORDS.test(reason)));

  return {
    isDead,
    isRugged,
    level,
    score: levelScore(level),
    reasons
  };
}

function emptyResult() {
  return { isDead: false, isRugged: false, level: 'low', score: 0, reasons: [] };
}

function escalate(current, next) {
  const a = LEVELS.indexOf(current);
  const b = LEVELS.indexOf(next);
  return LEVELS[Math.max(a, b)];
}

function levelScore(level) {
  return { low: 0, medium: 35, high: 70, critical: 95 }[level] || 0;
}
