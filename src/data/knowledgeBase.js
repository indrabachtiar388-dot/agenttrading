export const ponyinPrinciples = [
  {
    id: 'bundle',
    title: 'Bundle Token',
    source: 'Materi Vol.1 · #1 + Space 10 Mei 2026',
    materiId: 'p0',
    materiLabel: 'Bundle Token',
    rule: 'Dev atau tim sering memecah supply ke banyak wallet. Baca top holder, pola funding, dan transaksi awal sebelum percaya pada chart.',
    checks: ['top10Pct', 'commonFunderWallets', 'firstMinuteHoldingPct', 'cabalSync']
  },
  {
    id: 'globalFees',
    title: 'Global Fees',
    source: 'Materi Vol.1 · #2 + Space 26 Maret 2026',
    materiId: 'p1',
    materiLabel: 'Global Fees',
    rule: 'Volume besar harus disertai jejak biaya dan aktivitas yang masuk akal. Jika volume tinggi tetapi biaya, likuiditas, atau jumlah transaksi tipis, anggap sebagai risiko wash trading.',
    checks: ['reportedVolume', 'feeCollected', 'volumeLiquidityRatio', 'txns5m']
  },
  {
    id: 'authority',
    title: 'Revoke & Minting',
    source: 'Materi Vol.1 · #3',
    materiId: 'p2',
    materiLabel: 'Revoke & Minting',
    rule: 'Mint authority dan freeze authority adalah filter dasar. Mint yang masih terbuka atau freeze yang aktif tidak boleh dianggap aman.',
    checks: ['mintRevoked', 'freezeActive']
  },
  {
    id: 'dexPaid',
    title: 'Dex Paid, Ads & Boost',
    source: 'Materi Vol.1 · #5',
    materiId: 'p4',
    materiLabel: 'Dex Paid, Ads & Boost',
    rule: 'Dex paid, ads, dan boost berguna bila muncul sebelum chart terlalu tinggi. Bila baru dibayar setelah pump besar, itu bisa menjadi indikasi exit-liquidity timing.',
    checks: ['dexPaidTiming', 'activeBoosts', 'pumpFromLowPct']
  },
  {
    id: 'candle',
    title: '3 Konfirmasi Candle',
    source: 'Materi Vol.1 · #6',
    materiId: 'p5',
    materiLabel: '3 Konfirmasi Candle',
    rule: 'Entry pada dip membutuhkan konfirmasi. Hindari market buy ketika candle masih jatuh dan tekanan jual belum mereda.',
    checks: ['candleConfirmation', 'priceChange']
  },
  {
    id: 'holders',
    title: 'Membaca Holder',
    source: 'Materi Vol.1 · #8',
    materiId: 'p7',
    materiLabel: 'Membaca Holder',
    rule: 'Persentase holder tidak memiliki angka universal. Fase token menentukan apakah konsentrasi supply masih wajar atau sudah menjadi red flag.',
    checks: ['phase', 'top10Pct', 'marketCap']
  },
  {
    id: 'scalping',
    title: 'Instant Scalping',
    source: 'Materi Vol.2 · A7',
    materiId: 'pa6',
    materiLabel: 'Instant Scalping',
    rule: 'Fresh launch wajib lolos filter new-pair: kondisi network, holder baru, balance top holder, dan entry market cap.',
    checks: ['ageMinutes', 'marketCap', 'txns5m', 'liquidityUsd']
  },
  {
    id: 'walletPing',
    title: 'Wallet Ping',
    source: 'Materi Vol.2 · A3 + Space recordings',
    materiId: 'pa2',
    materiLabel: 'Wallet Ping',
    rule: 'Wallet ping bukan sinyal auto-buy. Aktivitas wallet hanyalah pemicu untuk analisis lanjutan.',
    checks: ['smartWalletActivity', 'devTx']
  }
];

export const analysisLayers = [
  {
    index: '01',
    title: 'Keamanan Contract & Fundamental',
    description: 'Mint authority, freeze authority, supply, likuiditas, dan data on-chain via Solana RPC.'
  },
  {
    index: '02',
    title: 'Deteksi Bundle & Cabal',
    description: 'Top holder, risiko funding source, aktivitas menit pertama, dan indikasi koordinasi wallet.'
  },
  {
    index: '03',
    title: 'Volume vs Global Fees',
    description: 'Reported volume dibaca bersama likuiditas, jumlah transaksi, dan data fee bila disediakan provider.'
  },
  {
    index: '04',
    title: 'Timing Marketing',
    description: 'Dex paid, ads, boost, serta waktu pembayaran dibandingkan umur token dan besaran pump.'
  },
  {
    index: '05',
    title: 'Konfirmasi Dip Teknis',
    description: 'Konfirmasi candle, tekanan buy/sell, dan perubahan harga multi-timeframe sebelum entry.'
  }
];

export const criticalUnknownCopy = 'Membutuhkan indexer seperti Helius, Bitquery, Solscan Pro, atau PumpPortal metered stream untuk bukti penuh.';
