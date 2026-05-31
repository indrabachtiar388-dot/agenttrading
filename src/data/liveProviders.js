const DEX_API = 'https://api.dexscreener.com';
const PUMP_PORTAL_WS = 'wss://pumpportal.fun/api/data';
const HELIUS_KEY = (import.meta.env.VITE_HELIUS_API_KEY || '').trim();
const SMART_WALLET_ENDPOINT = import.meta.env.DEV
  ? 'http://localhost:3001/api/smart-wallets'
  : '/api/smart-wallets';
const TOKEN_INTEL_ENDPOINT = import.meta.env.DEV
  ? 'http://localhost:3001/api/token-intel'
  : '/api/token-intel';
const HEALTH_ENDPOINT = import.meta.env.DEV
  ? 'http://localhost:3001/api/health'
  : '/api/health';
const SOLANA_RPC = HELIUS_KEY
  ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`
  : 'https://api.mainnet-beta.solana.com';
const TOKEN_PROGRAM_IDS = new Set([
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  'TokenzQdBNbLqP5VEi98vJb2t1B4jWsXg41dRT5sPp'
]);
const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111';

const PUMP_PROGRAM_ID = '6EF8rrecthR5Dk4r49j5b3m1TQBTciV4Xed2sW6qx6';

const AMM_PROGRAM_LABELS = {
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': 'Raydium AMM',
  'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK': 'Raydium CLMM',
  'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C': 'Raydium CPMM',
  'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc': 'Orca Whirlpool',
  '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP': 'Orca V1',
  'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo': 'Meteora DLMM',
  'Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB': 'Meteora pool',
  'cysPAa9aBwUWFQVnzcfYpcSEFLgYsRwUSSQ8MwGsHCH': 'Meteora dynamic AMM',
  '6EF8rrecthR5Dk4r49j5b3m1TQBTciV4Xed2sW6qx6': 'Pump.fun bonding',
  'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA': 'Pump Swap',
  'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX': 'Serum',
  '9HzJyW1qZsEiSfMUf6L2jo3CcTKAyBmSyKdwQeYisHrC': 'Phoenix',
  'CLMM9tUoggJu2wagPkkqs9eFG4BWhVBZWkP1qv3Sp7tR': 'Crema CLMM',
  'EhhTKczWMGQt46ynNeRX1WfeagwwJd7ufHvCDjRxjo5Q': 'Aldrin',
  'PERPHjGBqRHArX4DySjwM6UJHiR3sWAatqfdBS2qQJu': 'Drift',
  'AMM55ShdkoGRB5jVYPjWziwk8m5MpwyDgsMWHaMSQWH6': 'AMM legacy'
};

const KNOWN_BURN_ADDRESSES = new Set([
  '1nc1nerator11111111111111111111111111111111',
  'deadDeadDeadDeadDeadDeadDeadDeadDeadDead111',
  'burnburnburnburnburnburnburnburnburnburn111'
]);
const WS_TIMEOUT_MS = 2200;
const HTTP_TIMEOUT_MS = 9500;
const DEX_DISCOVERY_MAX_AGE_MINUTES = 3 * 24 * 60;
const DEX_SEARCH_TERMS = ['pumpfun', 'pump.fun', 'pumpswap', 'raydium', 'moonshot'];
const DEX_BROAD_QUERIES = ['solana', 'pump migrated', 'raydium fresh', 'meteora pool', 'pumpfun new'];
const DEFAULT_DEX_FEE_RATE = 0.0025;

import { fetchPumpFunDiscovery, pumpFunToFeedToken, fetchBirdeyeOverview, fetchJupiterPrice, crossValidatePrice, isJupiterRegistered } from './providers';

export async function fetchDiscoveryFeed() {
  const [dexFeed, dexSearchFeed, dexBroadFeed, pumpFeed, pumpFunFeed] = await Promise.all([
    fetchDexDiscoveryFeed().catch(() => []),
    fetchDexSearchDiscoveryFeed().catch(() => []),
    fetchDexBroadSearchFeed().catch(() => []),
    collectPumpPortalNewTokens({ limit: 8, timeoutMs: 4000 }).catch(() => []),
    fetchPumpFunFeedTokens({ limit: 30 }).catch(() => [])
  ]);

  const tokens = uniqueTokens([...pumpFeed, ...pumpFunFeed, ...dexSearchFeed, ...dexFeed, ...dexBroadFeed]);

  if (!tokens.length) {
    throw new Error('Belum ada token live yang balik dari semua sumber');
  }

  const pumpOk = pumpFeed.length > 0;
  const pumpFunOk = pumpFunFeed.length > 0;
  const dexOk = dexFeed.length > 0 || dexSearchFeed.length > 0 || dexBroadFeed.length > 0;

  const providerLabel = [
    pumpOk ? 'PumpPortal stream' : null,
    pumpFunOk ? 'Pump.fun frontend' : null,
    dexOk ? 'DexScreener discovery' : null
  ].filter(Boolean).join(' + ') || 'DexScreener live API';

  return {
    tokens,
    provider: providerLabel,
    fetchedAt: new Date().toISOString(),
    degraded: !pumpOk && !pumpFunOk,
    pumpPortalOk: pumpOk,
    pumpFunOk
  };
}

async function fetchPumpFunFeedTokens({ limit = 30 } = {}) {
  const coins = await fetchPumpFunDiscovery({ limit });
  return coins.map(pumpFunToFeedToken).filter(Boolean);
}

export async function fetchTokenMarketSnapshots(addresses = []) {
  const uniqueAddresses = [...new Set(addresses.map((address) => String(address || '').trim()).filter(Boolean))];
  if (!uniqueAddresses.length) return [];

  const chunks = [];
  for (let index = 0; index < uniqueAddresses.length; index += 25) {
    chunks.push(uniqueAddresses.slice(index, index + 25));
  }

  const responses = await Promise.allSettled(
    chunks.map((chunk) => fetchJson(`${DEX_API}/tokens/v1/solana/${chunk.join(',')}`))
  );

  const pairs = responses
    .flatMap((response) => (response.status === 'fulfilled' ? normalizeList(response.value) : []))
    .filter((pair) => pair?.chainId === 'solana' && pair?.baseToken?.address);

  const bestByAddress = new Map();
  pairs.forEach((pair) => {
    const address = pair.baseToken.address;
    const current = bestByAddress.get(address);
    if (!current || Number(pair.liquidity?.usd || 0) > Number(current.liquidity?.usd || 0)) {
      bestByAddress.set(address, pair);
    }
  });

  return Array.from(bestByAddress.values())
    .map((pair) => normalizeDexPair(pair, {}))
    .filter(Boolean);
}

export async function fetchProviderHealth() {
  const response = await fetchWithTimeout(HEALTH_ENDPOINT, {
    headers: {
      accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Health endpoint ${response.status}`);
  }

  return response.json();
}

async function fetchDexDiscoveryFeed() {
  const [profiles, boosts] = await Promise.allSettled([
    fetchJson(`${DEX_API}/token-profiles/latest/v1`),
    fetchJson(`${DEX_API}/token-boosts/latest/v1`)
  ]);

  const profileItems = profiles.status === 'fulfilled' ? normalizeList(profiles.value) : [];
  const boostItems = boosts.status === 'fulfilled' ? normalizeList(boosts.value) : [];
  const candidates = uniqueByAddress([...boostItems, ...profileItems])
    .filter((item) => item.chainId === 'solana' && item.tokenAddress);

  const pairs = await fetchPairsForCandidates(candidates);
  const boostMap = mapBoosts(boostItems);
  const tokens = pairs
    .filter(isLiveDiscoveryPair)
    .sort(sortDiscoveryPairs)
    .map((pair) => normalizeDexPair(pair, { boosted: boostMap.get(pair.baseToken?.address) }))
    .filter(Boolean);

  if (!tokens.length) {
    throw new Error('DexScreener gak ngasih pair Solana');
  }

  return tokens;
}

async function fetchDexSearchDiscoveryFeed() {
  const searches = await Promise.allSettled(
    DEX_SEARCH_TERMS.map((term) => fetchJson(`${DEX_API}/latest/dex/search?q=${encodeURIComponent(term)}`))
  );

  const pairs = searches
    .flatMap((response) => (response.status === 'fulfilled' ? normalizeList(response.value) : []))
    .filter((pair) => pair?.chainId === 'solana' && pair?.baseToken?.address)
    .filter(isFreshSearchPair)
    .sort(sortDiscoveryPairs);

  return uniquePairs(pairs)
    .map((pair) => normalizeDexPair(pair, { searchDiscovery: true }))
    .filter(Boolean);
}

async function fetchDexBroadSearchFeed() {
  // /latest/dex/pairs/solana bukan endpoint valid DexScreener (404).
  // Ganti pakai paralel /latest/dex/search dengan query berbeda buat coverage lebih luas.
  const searches = await Promise.allSettled(
    DEX_BROAD_QUERIES.map((query) => fetchJson(`${DEX_API}/latest/dex/search?q=${encodeURIComponent(query)}`))
  );

  const pairs = searches
    .flatMap((response) => (response.status === 'fulfilled' ? normalizeList(response.value) : []))
    .filter((pair) => pair?.chainId === 'solana' && pair?.baseToken?.address)
    .filter(isLiveDiscoveryPair)
    .sort(sortDiscoveryPairs)
    .slice(0, 60);

  return uniquePairs(pairs)
    .map((pair) => normalizeDexPair(pair, {}))
    .filter(Boolean);
}

export async function collectPumpPortalNewTokens({ limit = 6, timeoutMs = 2600 } = {}) {
  return new Promise((resolve) => {
    if (typeof WebSocket === 'undefined') {
      resolve([]);
      return;
    }

    const tokens = [];
    const ws = new WebSocket(PUMP_PORTAL_WS);
    const timer = window.setTimeout(() => {
      cleanup();
      resolve(tokens);
    }, timeoutMs);

    function cleanup() {
      window.clearTimeout(timer);
      try {
        ws.close();
      } catch {
        // noop
      }
    }

    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({ method: 'subscribeNewToken' }));
    });

    ws.addEventListener('message', (event) => {
      try {
        const token = normalizePumpPortalToken(JSON.parse(event.data));
        if (!token) return;
        tokens.push(token);
        if (tokens.length >= limit) {
          cleanup();
          resolve(tokens);
        }
      } catch {
        // Abaikan packet stream yang rusak, biar feed tetap hidup sampe timeout.
      }
    });

    ws.addEventListener('error', () => {
      cleanup();
      resolve(tokens);
    });
  });
}

export async function fetchTokenSnapshot(address) {
  const normalizedAddress = address.trim();
  const [dexResult, mintResult, pumpResult, ordersResult, birdeyeResult, jupiterResult, jupiterRegisteredResult] = await Promise.allSettled([
    fetchDexPairs(normalizedAddress),
    fetchMintAuthority(normalizedAddress),
    fetchPumpPortalSnapshot(normalizedAddress),
    fetchDexOrders(normalizedAddress),
    fetchBirdeyeOverview(normalizedAddress),
    fetchJupiterPrice([normalizedAddress]),
    isJupiterRegistered(normalizedAddress)
  ]);

  const dexPairs = dexResult.status === 'fulfilled' ? dexResult.value : [];
  const bestPair = pickBestPair(dexPairs);
  const mint = mintResult.status === 'fulfilled' ? mintResult.value : null;
  const pump = pumpResult.status === 'fulfilled' ? pumpResult.value : null;
  const dexOrders = ordersResult.status === 'fulfilled' ? ordersResult.value : [];
  const birdeye = birdeyeResult.status === 'fulfilled' ? birdeyeResult.value : null;
  const jupiterPrices = jupiterResult.status === 'fulfilled' ? jupiterResult.value : {};
  const jupiterRegistered = jupiterRegisteredResult.status === 'fulfilled' ? jupiterRegisteredResult.value : false;

  const holdersResult = await Promise.allSettled([
    fetchBackendTokenIntel(normalizedAddress),
    fetchTopHolders(normalizedAddress, mint?.supply ?? null, dexPairs)
  ]);
  const holders = mergeHolderIntel(
    holdersResult
      .filter((result) => result.status === 'fulfilled' && result.value)
      .map((result) => result.value)
  );

  if (!bestPair && !mint && !pump && !birdeye) {
    throw new Error('Gak ada live provider yang ngasih data token');
  }

  const priceDiscrepancy = crossValidatePrice({
    dexscreener: Number(bestPair?.priceUsd || 0),
    birdeye: birdeye?.priceUsd ?? 0,
    jupiter: jupiterPrices[normalizedAddress]?.priceUsd ?? 0
  });

  return normalizeTokenSnapshot({
    address: normalizedAddress,
    dexPair: bestPair,
    mint,
    pump,
    dexOrders,
    holders,
    dexPairs,
    birdeye,
    jupiterPrice: jupiterPrices[normalizedAddress] || null,
    jupiterRegistered,
    priceDiscrepancy,
    providerErrors: {
      dex: dexResult.status === 'rejected' ? dexResult.reason?.message : null,
      solanaRpc: mintResult.status === 'rejected' ? mintResult.reason?.message : null,
      pumpPortal: pumpResult.status === 'rejected' ? pumpResult.reason?.message : null,
      dexOrders: ordersResult.status === 'rejected' ? ordersResult.reason?.message : null,
      birdeye: birdeyeResult.status === 'rejected' ? birdeyeResult.reason?.message : null,
      jupiter: jupiterResult.status === 'rejected' ? jupiterResult.reason?.message : null,
      holders: holdersResult.every((result) => result.status === 'rejected')
        ? holdersResult.map((result) => result.reason?.message).filter(Boolean).join(' | ')
        : null
    }
  });
}

export async function fetchPumpPortalSnapshot(address) {
  const target = address.trim();

  return new Promise((resolve) => {
    if (typeof WebSocket === 'undefined') {
      resolve(null);
      return;
    }

    let settled = false;
    let ws;
    try {
      ws = new WebSocket(PUMP_PORTAL_WS);
    } catch {
      resolve(null);
      return;
    }

    const timer = window.setTimeout(() => {
      cleanup();
      resolve(null);
    }, WS_TIMEOUT_MS);

    function cleanup() {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      try {
        ws.close();
      } catch {
        // noop
      }
    }

    ws.addEventListener('open', () => {
      try {
        ws.send(JSON.stringify({ method: 'subscribeTokenTrade', keys: [address] }));
      } catch {
        cleanup();
        resolve(null);
      }
    });

    ws.addEventListener('message', (event) => {
      if (settled) return;
      try {
        const payload = JSON.parse(event.data);
        const mint = String(payload.mint || payload.tokenAddress || '').trim();
        if (!mint || mint !== target) return;
        cleanup();
        resolve({
          provider: 'PumpPortal live websocket',
          raw: payload,
          virtualSolReserves: Number(payload.virtualSolReserves || 0),
          virtualTokenReserves: Number(payload.virtualTokenReserves || 0),
          txType: payload.txType || null,
          traderPublicKey: payload.traderPublicKey || null
        });
      } catch {
        // packet rusak — biarkan timer yang resolve null
      }
    });

    ws.addEventListener('error', () => {
      cleanup();
      resolve(null);
    });

    ws.addEventListener('close', () => {
      cleanup();
      resolve(null);
    });
  });
}

async function fetchPairsForCandidates(candidates) {
  const chunks = [];
  for (let index = 0; index < candidates.length; index += 8) {
    chunks.push(candidates.slice(index, index + 8));
  }

  const responses = await Promise.allSettled(
    chunks.map((chunk) =>
      fetchJson(`${DEX_API}/tokens/v1/solana/${chunk.map((item) => item.tokenAddress).join(',')}`)
    )
  );

  return responses
    .flatMap((response) => (response.status === 'fulfilled' ? normalizeList(response.value) : []))
    .filter((pair) => pair?.chainId === 'solana' && pair?.baseToken?.address);
}

async function fetchDexPairs(address) {
  const data = await fetchJson(`${DEX_API}/tokens/v1/solana/${address}`);
  return normalizeList(data).filter((pair) => pair?.chainId === 'solana');
}

async function fetchDexOrders(address) {
  const data = await fetchJson(`${DEX_API}/orders/v1/solana/${address}`);
  return normalizeList(data).filter((order) => order?.status === 'approved' || order?.paymentTimestamp);
}

export async function fetchMintAuthority(address) {
  const data = await rpc('getAccountInfo', [
    address,
    {
      encoding: 'jsonParsed',
      commitment: 'confirmed'
    }
  ]);

  const value = data?.value;
  if (!value) return null;

  const owner = value.owner;
  const parsed = value.data?.parsed?.info;
  const tokenProgram = TOKEN_PROGRAM_IDS.has(owner);

  return {
    provider: 'Solana RPC getAccountInfo',
    exists: true,
    tokenProgram,
    owner,
    decimals: parsed?.decimals ?? null,
    supply: Number(parsed?.supply || 0),
    mintAuthority: parsed?.mintAuthority || null,
    freezeAuthority: parsed?.freezeAuthority || null,
    isPumpProgramAccount: owner === PUMP_PROGRAM_ID
  };
}

const WALLET_LABELS = parseWalletLabels(import.meta.env.VITE_SMART_WALLETS || '');
let smartWalletLabelsPromise = null;

export async function fetchTopHolders(address, supplyFromMint = null, dexPairs = []) {
  try {
    const [largestAccounts, tokenSupply] = await Promise.all([
      rpc('getTokenLargestAccounts', [
        address,
        { commitment: 'confirmed' }
      ]),
      supplyFromMint != null
        ? Promise.resolve({ value: { amount: String(supplyFromMint) } })
        : rpc('getTokenSupply', [address, { commitment: 'confirmed' }]).catch(() => null)
    ]);

    const data = largestAccounts;
    const accounts = data?.value;
    if (!accounts || !accounts.length) return null;

    const totalSupply = Number(tokenSupply?.value?.amount || supplyFromMint || 0);
    const largestTokenAccounts = accounts.slice(0, 20);
    const topTokenAccountAddresses = largestTokenAccounts.map(a => a.address);
    const holderDetails = largestTokenAccounts.map((account, index) => ({
      rank: index + 1,
      tokenAccount: account.address,
      owner: null,
      amount: Number(account.amount || 0),
      pct: totalSupply > 0 ? (Number(account.amount || 0) / totalSupply) * 100 : null,
      solBalance: null,
      label: null,
      type: null,
      excludedFromTopHolders: false
    }));

    const accountInfos = await rpc('getMultipleAccounts', [
      topTokenAccountAddresses,
      { encoding: 'jsonParsed', commitment: 'confirmed' }
    ]);

    let kolDetected = null;
    let smartMoneyCount = 0;

    const smartWalletLabels = await getSmartWalletLabels();

    // 3. Cocokin owner sama registry Smart Money/KOL yang tersedia.
    const owners = [];
    if (accountInfos?.value) {
      accountInfos.value.forEach((info, index) => {
        const ownerWallet = info?.data?.parsed?.info?.owner;
        if (ownerWallet) {
          owners.push(ownerWallet);
          holderDetails[index].owner = ownerWallet;
          if (smartWalletLabels.labels[ownerWallet]) {
            const label = smartWalletLabels.labels[ownerWallet];
            if (label.type === 'KOL') kolDetected = { address: ownerWallet, ...label };
            if (label.type === 'Smart Wallet' || label.type === 'Alpha Wallet' || label.type === 'KOL') smartMoneyCount++;
            holderDetails[index].label = label.name;
            holderDetails[index].type = label.type;
          }
        }
      });
    }

    let whales = 0;
    let burners = 0;
    let algorithmicSmartWallets = 0;
    const uniqueOwners = [...new Set(owners)];
    const ownerAccountPrograms = new Map();

    if (uniqueOwners.length > 0) {
      const ownerInfos = await rpc('getMultipleAccounts', [
        uniqueOwners,
        { encoding: 'jsonParsed', commitment: 'confirmed' }
      ]);
      
      if (ownerInfos?.value) {
        ownerInfos.value.forEach((info, index) => {
          const owner = uniqueOwners[index];
          ownerAccountPrograms.set(owner, info?.owner || null);
          if (info) {
            const solBalance = (info.lamports || 0) / 1e9;
            holderDetails
              .filter((holder) => holder.owner === owner)
              .forEach((holder) => {
                holder.solBalance = solBalance;
              });
          }
        });
      }
    }

    holderDetails.forEach((holder) => {
      const role = classifyHolderRole(holder, ownerAccountPrograms, dexPairs);
      if (!role) return;
      holder.type = role.type;
      holder.label = role.label;
      holder.excludedFromTopHolders = true;
    });

    const lpAccounts = holderDetails.filter((holder) => holder.excludedFromTopHolders);
    const holderAccounts = holderDetails
      .filter((holder) => !holder.excludedFromTopHolders)
      .slice(0, 10)
      .map((holder, index) => ({ ...holder, rank: index + 1 }));
    const holderOwners = [...new Set(holderAccounts.map((holder) => holder.owner).filter(Boolean))];
    const top10Amount = holderAccounts.reduce((sum, holder) => sum + Number(holder.amount || 0), 0);
    const top10Pct = totalSupply > 0 ? (top10Amount / totalSupply) * 100 : null;

    whales = countWalletRole(holderAccounts, (holder) => Number(holder.solBalance || 0) >= 250);
    algorithmicSmartWallets = countWalletRole(holderAccounts, (holder) => Number(holder.solBalance || 0) >= 75);
    burners = countWalletRole(holderAccounts, (holder) => Number(holder.solBalance || 0) <= 0.05);

    const bundleCount = estimateCommonFunderProxy(top10Pct, holderOwners.length, burners);

    return {
      top10Pct,
      commonFunderWallets: bundleCount,
      smartMoneyCount: smartMoneyCount + algorithmicSmartWallets,
      accounts: holderAccounts,
      holderDetails: holderAccounts,
      excludedHolderDetails: lpAccounts,
      uniqueOwnerCount: holderOwners.length,
      kol: kolDetected,
      whales,
      burners,
      smartWalletRegistrySize: smartWalletLabels.size,
      smartWalletSource: smartWalletLabels.source,
      provider: 'RPC top holders'
    };
  } catch (error) {
    return null;
  }
}

function mergeHolderIntel(results = []) {
  if (!results.length) return null;

  return results
    .sort((a, b) => holderIntelScore(b) - holderIntelScore(a))
    .reduce((merged, item) => ({
      ...item,
      ...merged,
      top10Pct: merged.top10Pct ?? item.top10Pct,
      commonFunderWallets: merged.commonFunderWallets ?? item.commonFunderWallets,
      smartMoneyCount: merged.smartMoneyCount ?? item.smartMoneyCount,
      accounts: merged.accounts?.length ? merged.accounts : item.accounts,
      holderDetails: merged.holderDetails?.length ? merged.holderDetails : item.holderDetails,
      excludedHolderDetails: merged.excludedHolderDetails?.length ? merged.excludedHolderDetails : item.excludedHolderDetails,
      walletIntel: merged.walletIntel?.length ? merged.walletIntel : item.walletIntel,
      insightSummary: merged.insightSummary?.length ? merged.insightSummary : item.insightSummary,
      uniqueOwnerCount: merged.uniqueOwnerCount ?? item.uniqueOwnerCount,
      kol: merged.kol ?? item.kol,
      whales: merged.whales ?? item.whales,
      burners: merged.burners ?? item.burners,
      madeOnSolIntel: merged.madeOnSolIntel ?? item.madeOnSolIntel,
      globalFees: mergeGlobalFees(merged.globalFees, item.globalFees),
      smartWalletRegistrySize: Math.max(Number(merged.smartWalletRegistrySize || 0), Number(item.smartWalletRegistrySize || 0)),
      smartWalletSource: [merged.smartWalletSource, item.smartWalletSource].filter(Boolean).join(' + '),
      provider: [merged.provider, item.provider].filter(Boolean).join(' + ')
    }));
}

function holderIntelScore(item = {}) {
  let score = 0;
  if (item.provider === 'backend token-intel') score += 12;
  if (item.top10Pct != null) score += 18;
  if (item.uniqueOwnerCount != null) score += 12;
  if (item.excludedHolderDetails?.length) score += 30;
  score += Math.min(Number(item.holderDetails?.length || 0) * 4, 40);
  score += Math.min(Number(item.walletIntel?.length || 0) * 3, 18);
  score += Math.min(Number(item.insightSummary?.length || 0) * 2, 10);
  return score;
}

function classifyHolderRole(holder, ownerAccountPrograms, dexPairs = []) {
  if (holder.owner && KNOWN_BURN_ADDRESSES.has(holder.owner)) {
    return { type: 'Burn', label: 'Burn / dead address' };
  }

  const ownerProgram = holder.owner ? ownerAccountPrograms.get(holder.owner) : null;
  const pairAddresses = new Set(dexPairs.map((pair) => pair?.pairAddress).filter(Boolean));
  if (pairAddresses.has(holder.tokenAccount) || pairAddresses.has(holder.owner)) {
    return { type: 'Liquidity Pool', label: 'LP / pair account' };
  }

  if (ownerProgram && AMM_PROGRAM_LABELS[ownerProgram]) {
    return { type: 'Liquidity Pool', label: `${AMM_PROGRAM_LABELS[ownerProgram]} vault` };
  }

  if (TOKEN_PROGRAM_IDS.has(ownerProgram)) {
    return { type: 'Liquidity Pool', label: 'Token program vault' };
  }

  if (ownerProgram && ownerProgram !== SYSTEM_PROGRAM_ID) {
    return { type: 'Liquidity Pool', label: 'Pool/program vault' };
  }

  return null;
}

function countWalletRole(holders, predicate) {
  return holders.filter((holder) => holder.owner && predicate(holder)).length;
}

async function fetchBackendTokenIntel(address) {
  const response = await fetchWithTimeout(`${TOKEN_INTEL_ENDPOINT}?ca=${encodeURIComponent(address)}`, {
    headers: {
      accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Token intel ${response.status}`);
  }

  const payload = await response.json();
  return {
    top10Pct: payload.top10Pct,
    commonFunderWallets: payload.commonFunderWallets,
    smartMoneyCount: payload.smartMoneyCount,
    accounts: payload.accounts || [],
    holderDetails: payload.holderDetails || [],
    walletIntel: payload.walletIntel || [],
    uniqueOwnerCount: payload.uniqueOwnerCount,
    kol: payload.kol,
    whales: payload.whales,
    burners: payload.burners,
    madeOnSolIntel: payload.madeOnSolIntel || null,
    globalFees: payload.globalFees || payload.madeOnSolIntel?.globalFees || null,
    insightSummary: payload.insightSummary || [],
    smartWalletRegistrySize: payload.smartWalletRegistrySize,
    smartWalletSource: payload.smartWalletSource,
    provider: 'backend token-intel'
  };
}

async function getSmartWalletLabels() {
  if (!smartWalletLabelsPromise) {
    smartWalletLabelsPromise = buildSmartWalletLabels().catch(() => ({
      labels: WALLET_LABELS,
      size: Object.keys(WALLET_LABELS).length,
      source: Object.keys(WALLET_LABELS).length ? 'VITE_SMART_WALLETS' : 'belum diatur'
    }));
  }

  return smartWalletLabelsPromise;
}

async function buildSmartWalletLabels() {
  const labels = { ...WALLET_LABELS };
  const sources = [];
  if (Object.keys(WALLET_LABELS).length) sources.push('VITE_SMART_WALLETS');

  const registry = await fetchSmartWalletRegistry().catch(() => null);
  if (registry?.labels) {
    Object.assign(labels, registry.labels);
    if (registry.size > 0) sources.push(registry.source || 'backend cache');
  }

  return {
    labels,
    size: Object.keys(labels).length,
    source: sources.length ? sources.join(' + ') : 'belum diatur'
  };
}

async function fetchSmartWalletRegistry() {
  const response = await fetchWithTimeout(SMART_WALLET_ENDPOINT, {
    headers: {
      accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Smart wallet registry ${response.status}`);
  }

  const payload = await response.json();
  return {
    labels: payload.labels || {},
    size: Number(payload.size || Object.keys(payload.labels || {}).length),
    source: payload.source || 'backend cache'
  };
}

export async function rpc(method, params) {
  const response = await fetchWithTimeout(SOLANA_RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'should-i-ape',
      method,
      params
    })
  });

  const payload = await response.json();
  if (payload.error) {
    throw new Error(payload.error.message || `RPC ${method} gagal`);
  }
  return payload.result;
}

function estimateCommonFunderProxy(top10Pct, uniqueOwnerCount, burners) {
  if (top10Pct == null) return null;

  let score = 0;
  if (top10Pct >= 70) score += 4;
  else if (top10Pct >= 55) score += 3;
  else if (top10Pct >= 42) score += 2;

  if (uniqueOwnerCount > 0 && uniqueOwnerCount <= 4) score += 2;
  else if (uniqueOwnerCount > 0 && uniqueOwnerCount <= 7) score += 1;

  if (burners >= 4) score += 2;
  else if (burners >= 2) score += 1;

  return clamp(score, 0, 8);
}

function parseWalletLabels(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((labels, item) => {
      const [address, name = 'Configured Smart Wallet', type = 'Smart Wallet', x = null] = item.split(':').map((part) => part.trim());
      if (address) labels[address] = { name, type, x };
      return labels;
    }, {});
}

async function fetchJson(url) {
  const response = await fetchWithTimeout(url, {
    headers: {
      accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

function normalizeList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.pairs)) return value.pairs;
  if (Array.isArray(value?.profiles)) return value.profiles;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function normalizeWebsites(websites = []) {
  return normalizeList(websites)
    .map((item) => ({
      label: item.label || 'Website',
      url: item.url || null
    }))
    .filter((item) => item.url);
}

function normalizeSocials(socials = []) {
  return normalizeList(socials)
    .map((item) => ({
      type: item.type || item.label || 'social',
      url: item.url || null
    }))
    .filter((item) => item.url);
}

function uniqueByAddress(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.chainId}:${item.tokenAddress || item.baseToken?.address || ''}`;
    if (!item.tokenAddress || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueTokens(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.ca || seen.has(item.ca)) return false;
    seen.add(item.ca);
    return true;
  });
}

function uniquePairs(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item?.baseToken?.address || item?.pairAddress;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mapBoosts(items) {
  const map = new Map();
  items.forEach((item) => {
    if (!item.tokenAddress) return;
    map.set(item.tokenAddress, {
      active: Number(item.amount || 0) > 0,
      amount: Number(item.amount || 0),
      totalAmount: Number(item.totalAmount || 0),
      url: item.url || null
    });
  });
  return map;
}

function normalizePumpPortalToken(payload) {
  const mint = payload?.mint || payload?.tokenAddress;
  if (!mint) return null;

  const symbol = payload.symbol || payload.ticker || shortAddress(mint);
  const name = payload.name || 'Pump.fun Live Token';
  const marketCapSol = Number(payload.marketCapSol || 0);
  const initialBuy = Number(payload.initialBuy || payload.solAmount || 0);

  return {
    id: payload.signature || mint,
    phase: 'new',
    name,
    ticker: symbol,
    ca: mint,
    pairAddress: null,
    source: 'PumpPortal live Pump.fun stream',
    age: 'live',
    ageMinutes: 0,
    curve: 1,
    buySell: initialBuy ? '1/0' : '0/0',
    devTx: null,
    sniperWallets: null,
    lpStatus: 'Bonding curve',
    marketCap: marketCapSol ? `${marketCapSol.toFixed(marketCapSol >= 10 ? 1 : 2)} SOL` : 'bonding',
    volume5m: 'token baru',
    priceUsd: 0,
    liquidityUsd: 0,
    priceChange: { m5: 0, h1: 0, h6: 0, h24: 0 },
    url: `https://pump.fun/coin/${mint}`,
    flags: {
      mintRevoked: null,
      freezeActive: null,
      lpBurned: false,
      devSoldPct: null,
      top10Pct: null,
      commonFunderWallets: null,
      firstMinuteHoldingPct: null,
      cabalSync: initialBuy > 5 ? 58 : 34,
      reportedVolume: 0,
      feeCollected: null,
      globalFees: null,
      dexPaidTiming: 'none',
      activeBoosts: 0,
      pumpFromLowPct: 0,
      candleConfirmation: initialBuy > 0 ? 44 : 28,
      volumeLiquidityRatio: 0,
      txns5m: initialBuy ? 1 : 0,
      buys5m: initialBuy ? 1 : 0,
      sells5m: 0,
      pumpPortalTradeSeen: true
    },
    provider: 'PumpPortal live websocket',
    providerConfidence: 'low',
    feedInsight: 'Token baru dari stream Pump.fun. Scan CA dulu buat cek authority, Dex pair, sama risiko bundle sebelum entry.'
  };
}

function pickBestPair(pairs) {
  return [...pairs].sort((a, b) => Number(b.liquidity?.usd || 0) - Number(a.liquidity?.usd || 0))[0] || null;
}

function normalizeDexPair(pair, extras = {}) {
  if (!pair?.baseToken?.address) return null;

  const createdAtMs = Number(pair.pairCreatedAt || 0);
  const ageMinutes = createdAtMs ? Math.max(0, Math.floor((Date.now() - createdAtMs) / 60000)) : null;
  const fdv = Number(pair.fdv || pair.marketCap || 0);
  const txns5m = sumTxns(pair.txns?.m5);
  const buys5m = Number(pair.txns?.m5?.buys || 0);
  const sells5m = Number(pair.txns?.m5?.sells || 0);
  const volume5m = Number(pair.volume?.m5 || 0);
  const volumeH1 = Number(pair.volume?.h1 || 0);
  const volumeH6 = Number(pair.volume?.h6 || 0);
  const volumeH24 = Number(pair.volume?.h24 || 0);
  const liquidityUsd = Number(pair.liquidity?.usd || 0);
  const priceChange = {
    m5: Number(pair.priceChange?.m5 || 0),
    h1: Number(pair.priceChange?.h1 || 0),
    h6: Number(pair.priceChange?.h6 || 0),
    h24: Number(pair.priceChange?.h24 || 0)
  };

  return {
    id: pair.pairAddress || pair.url || pair.baseToken.address,
    phase: inferPhase(ageMinutes, fdv, pair.dexId),
    name: pair.baseToken.name || 'Unknown Token',
    ticker: pair.baseToken.symbol || '???',
    ca: pair.baseToken.address,
    pairAddress: pair.pairAddress || null,
    pairCreatedAt: createdAtMs || null,
    source: labelSource(pair),
    age: formatAge(ageMinutes),
    ageMinutes,
    curve: inferCurve(pair, ageMinutes),
    buySell: `${buys5m}/${sells5m}`,
    devTx: null,
    sniperWallets: null,
    lpStatus: inferLpStatus(pair, liquidityUsd),
    marketCap: formatUsd(fdv),
    volume5m: formatUsd(volume5m),
    priceUsd: Number(pair.priceUsd || 0),
    liquidityUsd,
    pairDex: pair.dexId || null,
    pairUrl: pair.url || null,
    websites: normalizeWebsites(pair.info?.websites),
    socials: normalizeSocials(pair.info?.socials),
    metrics: {
      volume: { m5: volume5m, h1: volumeH1, h6: volumeH6, h24: volumeH24 },
      txns: {
        m5: txns5m,
        h1: sumTxns(pair.txns?.h1),
        h6: sumTxns(pair.txns?.h6),
        h24: sumTxns(pair.txns?.h24)
      },
      buys: {
        m5: buys5m,
        h1: Number(pair.txns?.h1?.buys || 0),
        h6: Number(pair.txns?.h6?.buys || 0),
        h24: Number(pair.txns?.h24?.buys || 0)
      },
      sells: {
        m5: sells5m,
        h1: Number(pair.txns?.h1?.sells || 0),
        h6: Number(pair.txns?.h6?.sells || 0),
        h24: Number(pair.txns?.h24?.sells || 0)
      }
    },
    priceChange,
    url: pair.url || null,
    flags: {
      mintRevoked: null,
      freezeActive: null,
      lpBurned: false,
      devSoldPct: null,
      top10Pct: null,
      commonFunderWallets: null,
      firstMinuteHoldingPct: null,
      cabalSync: inferCabalSync({ txns5m, buys5m, sells5m, volume5m, liquidityUsd, priceChange }),
      reportedVolume: volume5m,
      feeCollected: null,
      globalFees: buildDexGlobalFeeEstimate({ volume5m, volumeH1, volumeH24 }),
      dexPaidTiming: extras.boosted?.active ? inferDexPaidTiming(ageMinutes, priceChange) : 'none',
      activeBoosts: extras.boosted?.amount || 0,
      pumpFromLowPct: inferPumpFromLow(priceChange),
      candleConfirmation: inferCandleConfirmation(priceChange, buys5m, sells5m),
      volumeLiquidityRatio: liquidityUsd > 0 ? volume5m / liquidityUsd : 0,
      txns5m,
      buys5m,
      sells5m
    },
    provider: 'DexScreener live API',
    providerConfidence: 'medium',
    feedInsight: buildFeedInsight({ txns5m, buys5m, sells5m, volume5m, liquidityUsd, priceChange, boosted: extras.boosted })
  };
}

function isLiveDiscoveryPair(pair) {
  if (!pair?.baseToken?.address) return false;

  const dexId = String(pair.dexId || '').toLowerCase();
  const isPumpBondingCurve = dexId.includes('pump') && !pair.pairAddress;

  const createdAtMs = Number(pair.pairCreatedAt || 0);
  const ageMinutes = createdAtMs
    ? Math.max(0, (Date.now() - createdAtMs) / 60000)
    : (isPumpBondingCurve ? 0 : null);
  if (ageMinutes != null && ageMinutes > DEX_DISCOVERY_MAX_AGE_MINUTES) return false;

  const liquidityUsd = Number(pair.liquidity?.usd || 0);
  const volume5m = Number(pair.volume?.m5 || 0);
  const volumeH1 = Number(pair.volume?.h1 || 0);
  const txns5m = sumTxns(pair.txns?.m5);
  const buys5m = Number(pair.txns?.m5?.buys || 0);
  const sells5m = Number(pair.txns?.m5?.sells || 0);
  const priceM5 = Number(pair.priceChange?.m5 || 0);
  const priceH1 = Number(pair.priceChange?.h1 || 0);
  const fdv = Number(pair.fdv || pair.marketCap || 0);

  // Bonding curve / Pump.fun: pakai filter terpisah karena LP biasanya 0 dan vol dihitung beda.
  if (isPumpBondingCurve) {
    if (priceM5 <= -25 || priceH1 <= -45) return false;
    if (sells5m > buys5m * 3 + 6) return false;
    return txns5m >= 4 || volumeH1 > 0 || fdv > 4000;
  }

  if (!createdAtMs) return false;
  if (liquidityUsd < 6500) return false;
  if (fdv > 0 && fdv < 8000) return false;
  if (priceM5 <= -12 || priceH1 <= -24) return false;
  if (sells5m > buys5m * 2.6 + 8) return false;

  const hasFreshActivity = txns5m >= 8 || volume5m >= 1500;
  const hasSustainedActivity = txns5m >= 18 || volume5m >= 6500 || liquidityUsd >= 25000;
  const entryScore = pairEntryScore(pair);

  if (ageMinutes > 45 && !hasSustainedActivity) return false;
  if (ageMinutes > 24 * 60 && txns5m < 14 && volume5m < 4500) return false;
  return hasFreshActivity && entryScore >= 48;
}

function isFreshSearchPair(pair) {
  if (!pair?.baseToken?.address) return false;

  const createdAtMs = Number(pair.pairCreatedAt || 0);
  const ageMinutes = createdAtMs ? Math.max(0, (Date.now() - createdAtMs) / 60000) : 0;
  const txns5m = sumTxns(pair.txns?.m5);
  const txnsH1 = sumTxns(pair.txns?.h1);
  const volume5m = Number(pair.volume?.m5 || 0);
  const volumeH1 = Number(pair.volume?.h1 || 0);
  const buys5m = Number(pair.txns?.m5?.buys || 0);
  const sells5m = Number(pair.txns?.m5?.sells || 0);
  const priceM5 = Number(pair.priceChange?.m5 || 0);
  const fdv = Number(pair.fdv || pair.marketCap || 0);

  if (createdAtMs && ageMinutes > DEX_DISCOVERY_MAX_AGE_MINUTES) return false;
  if (fdv > 0 && fdv < 8000) return false;
  if (priceM5 <= -12) return false;
  if (sells5m > buys5m * 2.6 + 8) return false;

  return (txns5m >= 8 || volume5m >= 1500 || txnsH1 >= 35 || volumeH1 >= 5000) && pairEntryScore(pair) >= 48;
}

function sortDiscoveryPairs(a, b) {
  return discoveryRank(b) - discoveryRank(a);
}

function discoveryRank(pair) {
  const createdAtMs = Number(pair.pairCreatedAt || 0);
  const ageMinutes = createdAtMs ? Math.max(0, (Date.now() - createdAtMs) / 60000) : DEX_DISCOVERY_MAX_AGE_MINUTES;
  const txns5m = sumTxns(pair.txns?.m5);
  const volume5m = Number(pair.volume?.m5 || 0);
  const liquidityUsd = Number(pair.liquidity?.usd || 0);
  const priceM5 = Number(pair.priceChange?.m5 || 0);

  return pairEntryScore(pair) * 10
    + Math.max(0, 180 - Math.abs(ageMinutes - 90))
    + Math.min(txns5m, 120) * 2
    + Math.min(volume5m / 100, 160)
    + Math.min(liquidityUsd / 1000, 80)
    + Math.max(-40, Math.min(priceM5, 120));
}

function pairEntryScore(pair) {
  const liquidityUsd = Number(pair.liquidity?.usd || 0);
  const volume5m = Number(pair.volume?.m5 || 0);
  const txns5m = sumTxns(pair.txns?.m5);
  const buys5m = Number(pair.txns?.m5?.buys || 0);
  const sells5m = Number(pair.txns?.m5?.sells || 0);
  const priceM5 = Number(pair.priceChange?.m5 || 0);
  const priceH1 = Number(pair.priceChange?.h1 || 0);
  const fdv = Number(pair.fdv || pair.marketCap || 0);
  const volumeLiquidityRatio = liquidityUsd > 0 ? volume5m / liquidityUsd : 0;
  const buyRatio = buys5m + sells5m > 0 ? buys5m / (buys5m + sells5m) : 0.5;

  let score = 0;
  score += Math.min(liquidityUsd / 900, 24);
  score += Math.min(volume5m / 900, 18);
  score += Math.min(txns5m * 1.2, 18);
  score += Math.round((buyRatio - 0.5) * 24);
  score += fdv >= 12000 ? 8 : 0;

  if (priceM5 > 0 && priceM5 <= 35) score += 12;
  else if (priceM5 > 35 && priceM5 <= 120) score += 5;
  else if (priceM5 < -5) score -= 14;

  if (priceH1 > -8 && priceH1 < 220) score += 8;
  if (priceH1 < -20) score -= 14;
  if (volumeLiquidityRatio > 6) score -= 18;
  else if (volumeLiquidityRatio > 3.5) score -= 8;
  if (sells5m > buys5m * 2 + 8) score -= 18;

  return clamp(Math.round(score), 0, 100);
}

function normalizeTokenSnapshot({ address, dexPair, mint, pump, dexOrders, holders, dexPairs, birdeye, jupiterPrice, jupiterRegistered, priceDiscrepancy, providerErrors }) {
  const base = dexPair
    ? normalizeDexPair(dexPair, {})
    : {
        id: address,
        phase: mint?.isPumpProgramAccount ? 'fresh' : 'manual',
        name: 'Live Contract',
        ticker: shortAddress(address),
        ca: address,
        pairAddress: null,
        source: mint?.isPumpProgramAccount ? 'Pump.fun program account' : 'Solana RPC',
        age: 'unknown age',
        ageMinutes: null,
        curve: 0,
        buySell: '0/0',
        devTx: null,
        sniperWallets: null,
        lpStatus: 'No Dex pair found',
        marketCap: 'unknown',
        volume5m: 'unknown',
        priceUsd: 0,
        liquidityUsd: 0,
        priceChange: { m5: 0, h1: 0, h6: 0, h24: 0 },
        url: null,
        flags: {
          mintRevoked: null,
          freezeActive: null,
          lpBurned: false,
          devSoldPct: null,
          top10Pct: null,
          commonFunderWallets: null,
          uniqueOwnerCount: null,
          firstMinuteHoldingPct: null,
          cabalSync: null,
          reportedVolume: 0,
          feeCollected: null,
          globalFees: null,
          dexPaidTiming: 'none',
          activeBoosts: 0,
          pumpFromLowPct: 0,
          candleConfirmation: 0,
          volumeLiquidityRatio: 0,
          txns5m: 0,
          buys5m: 0,
          sells5m: 0
        },
        provider: 'Solana RPC',
    providerConfidence: 'low',
    feedInsight: 'Dex pair belum ketemu. Analisis cuma pake data akun mint yang tersedia.'
      };

  // Kalau DexScreener pair gak ada tapi Birdeye punya data, isi dari Birdeye supaya UI gak kosong.
  if (!dexPair && birdeye) {
    base.priceUsd = birdeye.priceUsd || base.priceUsd;
    base.liquidityUsd = birdeye.liquidityUsd || base.liquidityUsd;
    base.marketCap = birdeye.marketCapUsd ? formatUsd(birdeye.marketCapUsd) : base.marketCap;
    base.source = 'Birdeye token overview';
    if (birdeye.priceChange24h != null) {
      base.priceChange = { ...base.priceChange, h24: birdeye.priceChange24h };
    }
  }

  const orderTiming = inferOrderTiming(base, dexOrders);
  const globalFees = mergeGlobalFees(
    holders?.globalFees || holders?.madeOnSolIntel?.globalFees || null,
    base.flags.globalFees || null
  );

  return {
    ...base,
    source: mergeSources(base.source, mint, pump, birdeye),
    flags: {
      ...base.flags,
      mintRevoked: mint?.tokenProgram ? !mint.mintAuthority : base.flags.mintRevoked,
      freezeActive: mint?.tokenProgram ? Boolean(mint.freezeAuthority) : base.flags.freezeActive,
      top10Pct: holders
        ? holders.top10Pct
        : (birdeye?.security?.top10UserPercent ?? birdeye?.security?.top10HolderPercent ?? base.flags.top10Pct),
      commonFunderWallets: holders ? holders.commonFunderWallets : base.flags.commonFunderWallets,
      uniqueOwnerCount: holders ? holders.uniqueOwnerCount : base.flags.uniqueOwnerCount,
      kolDetected: holders ? holders.kol : base.flags.kolDetected,
      smartMoneyCount: holders ? holders.smartMoneyCount : base.flags.smartMoneyCount,
      whales: holders ? holders.whales : base.flags.whales,
      burners: holders ? holders.burners : base.flags.burners,
      feeCollected: globalFees?.exact && globalFees?.windows?.m5 != null ? globalFees.windows.m5 : base.flags.feeCollected,
      globalFees,
      tokenIntelProvider: holders ? holders.provider : base.flags.tokenIntelProvider,
      smartWalletRegistrySize: holders ? holders.smartWalletRegistrySize : base.flags.smartWalletRegistrySize,
      smartWalletSource: holders ? holders.smartWalletSource : base.flags.smartWalletSource,
      madeOnSolTokenIntel: Boolean(holders?.madeOnSolIntel),
      madeOnSolBlacklisted: holders?.madeOnSolIntel?.blacklisted ?? base.flags.madeOnSolBlacklisted,
      pumpPortalTradeSeen: Boolean(pump),
      dexPaidTiming: orderTiming.timing || base.flags.dexPaidTiming,
      activeBoosts: orderTiming.count || base.flags.activeBoosts,
      dexPairCount: dexPairs.length,
      birdeyeHolderCount: birdeye?.holderCount ?? null,
      birdeyeUniqueWallet24h: birdeye?.uniqueWallet24h ?? null,
      birdeyeLpLocked: birdeye?.security?.lpLocked ?? null,
      birdeyeCreatorPct: birdeye?.security?.creatorPercentage ?? null,
      jupiterRegistered: Boolean(jupiterRegistered),
      priceDiscrepancyPct: priceDiscrepancy?.discrepancyPct ?? 0,
      priceDiscrepancySuspicious: Boolean(priceDiscrepancy?.suspicious)
    },
    rawProviders: {
      dexPair,
      mint,
      pump,
      dexOrders,
      globalFees,
      liquidityPool: buildLiquidityPoolIntel(dexPair, dexPairs, holders?.excludedHolderDetails || []),
      madeOnSol: holders?.madeOnSolIntel || null,
      holders: holders?.holderDetails || null,
      excludedHolders: holders?.excludedHolderDetails || null,
      walletIntel: holders?.walletIntel || null,
      insightSummary: holders?.insightSummary || null,
      birdeye,
      jupiterPrice,
      jupiterRegistered,
      priceDiscrepancy,
      holderMeta: holders ? {
        smartWalletRegistrySize: holders.smartWalletRegistrySize,
        smartWalletSource: holders.smartWalletSource,
        tokenIntelProvider: holders.provider
      } : null,
      providerErrors
    },
    providerConfidence: dexPair && mint ? 'high' : (dexPair || mint || birdeye) ? 'medium' : 'low'
  };
}

function buildLiquidityPoolIntel(dexPair, dexPairs = [], excludedHolders = []) {
  if (!dexPair && !dexPairs.length && !excludedHolders.length) return null;
  const pair = dexPair || pickBestPair(dexPairs);
  const liquidityUsd = Number(pair?.liquidity?.usd || 0);

  return {
    dex: pair?.dexId || null,
    pairAddress: pair?.pairAddress || null,
    pairUrl: pair?.url || null,
    usd: liquidityUsd,
    base: Number(pair?.liquidity?.base || 0),
    quote: Number(pair?.liquidity?.quote || 0),
    status: pair ? inferLpStatus(pair, liquidityUsd) : 'LP vault ketemu dari top accounts',
    pairCount: dexPairs.length,
    excludedTopAccounts: excludedHolders
  };
}

function inferOrderTiming(token, orders = []) {
  if (!orders.length) {
    return { timing: null, count: 0 };
  }

  const paymentTimes = orders
    .map((order) => Number(order.paymentTimestamp || 0) * 1000)
    .filter(Boolean);

  if (!paymentTimes.length) {
    return { timing: 'early', count: orders.length };
  }

  const firstPayment = Math.min(...paymentTimes);
  if (token.pairCreatedAt) {
    const minutesAfterPair = (firstPayment - token.pairCreatedAt) / 60000;
    return {
      timing: minutesAfterPair > 120 || token.flags.pumpFromLowPct > 300 ? 'late' : 'early',
      count: orders.length
    };
  }

  return {
    timing: token.flags.pumpFromLowPct > 300 ? 'late' : 'early',
    count: orders.length
  };
}

function mergeSources(source, mint, pump, birdeye) {
  const sources = [source];
  if (mint) sources.push('Solana RPC');
  if (pump) sources.push('PumpPortal stream');
  if (birdeye) sources.push('Birdeye overview');
  return [...new Set(sources.filter(Boolean))].join(' + ');
}

function mergeGlobalFees(primary, fallback) {
  if (!primary && !fallback) return null;
  if (!primary) return fallback;
  if (!fallback) return primary;

  return {
    provider: primary.provider || fallback.provider,
    exact: primary.exact || fallback.exact || false,
    currentUsd: primary.currentUsd ?? fallback.currentUsd ?? null,
    windows: {
      m5: primary.windows?.m5 ?? fallback.windows?.m5 ?? null,
      h1: primary.windows?.h1 ?? fallback.windows?.h1 ?? null,
      h24: primary.windows?.h24 ?? fallback.windows?.h24 ?? null
    },
    rateBps: primary.rateBps ?? fallback.rateBps ?? null,
    updatedAt: primary.updatedAt || fallback.updatedAt || new Date().toISOString()
  };
}

function buildDexGlobalFeeEstimate({ volume5m = 0, volumeH1 = 0, volumeH24 = 0 }) {
  const m5 = Number(volume5m) > 0 ? Number(volume5m) * DEFAULT_DEX_FEE_RATE : null;
  const h1 = Number(volumeH1) > 0 ? Number(volumeH1) * DEFAULT_DEX_FEE_RATE : null;
  const h24 = Number(volumeH24) > 0 ? Number(volumeH24) * DEFAULT_DEX_FEE_RATE : null;
  if (m5 == null && h1 == null && h24 == null) return null;
  return {
    provider: 'estimasi proxy (volume * 0.25%)',
    exact: false,
    currentUsd: m5 ?? h1 ?? h24 ?? null,
    windows: { m5, h1, h24 },
    rateBps: 25,
    updatedAt: new Date().toISOString()
  };
}

export function inferPhase(ageMinutes, fdv, dexId = '') {
  const dex = dexId.toLowerCase();
  if (ageMinutes != null && ageMinutes <= 30) return 'new';
  if (dex.includes('raydium') || dex.includes('orca') || dex.includes('meteora')) return 'migrated';
  if (fdv > 45000 && fdv < 120000) return 'early';
  if (ageMinutes != null && ageMinutes <= 360) return 'early';
  if (ageMinutes != null && ageMinutes <= 1440) return 'soon';
  return 'migrated';
}

function inferCurve(pair, ageMinutes) {
  if (pair.dexId?.toLowerCase().includes('pump')) return ageMinutes != null ? Math.min(98, Math.round(12 + ageMinutes * 2.2)) : 40;
  return 100;
}

function inferLpStatus(pair, liquidityUsd) {
  if (pair.dexId?.toLowerCase().includes('pump')) return 'Bonding curve';
  if (!pair.pairAddress) return 'Pair not indexed';
  if (liquidityUsd >= 50000) return 'Deep liquidity';
  if (liquidityUsd >= 10000) return 'Tradable liquidity';
  if (liquidityUsd > 0) return 'Thin liquidity';
  return 'No liquidity data';
}

function labelSource(pair) {
  const dex = pair.dexId ? capitalize(pair.dexId) : 'DexScreener';
  return pair.labels?.length ? `${dex} ${pair.labels.join('/')}` : dex;
}

function inferCabalSync({ txns5m, buys5m, sells5m, volume5m, liquidityUsd, priceChange }) {
  let risk = 15;
  if (txns5m > 120 && liquidityUsd < 12000) risk += 22;
  if (volume5m > liquidityUsd * 3 && liquidityUsd > 0) risk += 22;
  if (buys5m > sells5m * 4 && priceChange.m5 < 8) risk += 18;
  if (priceChange.m5 > 120) risk += 14;
  return clamp(Math.round(risk), 0, 96);
}

function inferPumpFromLow(priceChange) {
  return Math.max(0, Math.round(Math.max(priceChange.m5, priceChange.h1, priceChange.h6, priceChange.h24)));
}

function inferDexPaidTiming(ageMinutes, priceChange) {
  if (ageMinutes != null && ageMinutes < 25) return 'early';
  return inferPumpFromLow(priceChange) > 300 ? 'late' : 'early';
}

function inferCandleConfirmation(priceChange, buys5m, sells5m) {
  let score = 50;
  const total = buys5m + sells5m;
  const buyRatio = total > 0 ? buys5m / total : 0.5;
  if (priceChange.m5 > 0) score += 15;
  if (priceChange.h1 > -20) score += 10;
  if (priceChange.m5 < -15) score -= 25;
  if (priceChange.h1 < -45) score -= 14;
  score += Math.round((buyRatio - 0.5) * 45);
  return clamp(score, 0, 100);
}

function buildFeedInsight({ txns5m, buys5m, sells5m, volume5m, liquidityUsd, priceChange, boosted }) {
  if (boosted?.active && inferPumpFromLow(priceChange) > 300) {
    return `Dex boost aktif setelah move besar (+${inferPumpFromLow(priceChange)}%). Baca sebagai potensi exit timing.`;
  }
  if (liquidityUsd > 0 && volume5m > liquidityUsd * 3) {
    return 'Volume 5m jauh lebih gede dari liquidity. Perlu curiga wash atau churn bot.';
  }
  if (txns5m > 80 && buys5m > sells5m * 3 && priceChange.m5 < 10) {
    return 'Banyak buy tapi harga gak ikut naik. Ada indikasi supply ditahan/dilepas.';
  }
  if (priceChange.m5 < -15) {
    return 'Candle 5m merah kuat. Tunggu konfirmasi, jangan tangkap pisau jatuh.';
  }
  if (buys5m > sells5m && priceChange.m5 > 0) {
    return 'Buy pressure 5m positif. Tetep cek authority sama distribusi holder.';
  }
  return 'Data live udah kebaca. Lanjut cek holder, authority, sama timing entry.';
}

function sumTxns(txnWindow = {}) {
  return Number(txnWindow.buys || 0) + Number(txnWindow.sells || 0);
}

function formatAge(ageMinutes) {
  if (ageMinutes == null) return 'unknown';
  if (ageMinutes < 60) return `${ageMinutes}m`;
  const hours = Math.floor(ageMinutes / 60);
  if (hours < 48) return `${hours}h ${ageMinutes % 60}m`;
  return `${Math.floor(hours / 24)}d`;
}

export function formatUsd(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num) || num <= 0) return 'unknown';
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(num >= 10_000_000 ? 0 : 1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(num >= 100_000 ? 0 : 1)}K`;
  return `$${num.toFixed(num >= 10 ? 0 : 2)}`;
}

function shortAddress(address) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`.toUpperCase();
}

function isSolanaAddress(value) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(value || ''));
}

function capitalize(value) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function subscribeToPumpPortalStream(onToken, onStatus = () => {}) {
  if (typeof WebSocket === 'undefined') {
    onStatus({ connected: false, error: 'WebSocket unavailable' });
    return () => {};
  }

  let ws;
  let active = true;
  let reconnectTimer;
  let retryCount = 0;
  let lastOpenAt = 0;
  let stableResetTimer;
  const MAX_DELAY_MS = 60000;
  const BASE_DELAYS = [1500, 3000, 6000, 12000, 24000, 45000];

  function connect() {
    if (!active) return;
    onStatus({ connected: false, connecting: true, error: null });
    try {
      ws = new WebSocket(PUMP_PORTAL_WS);
    } catch {
      onStatus({ connected: false, connecting: false, error: 'PumpPortal reconnecting' });
      scheduleRetry();
      return;
    }

    ws.addEventListener('open', () => {
      lastOpenAt = Date.now();
      // Setelah stable 5 menit, reset retry counter biar backoff balik ke awal.
      window.clearTimeout(stableResetTimer);
      stableResetTimer = window.setTimeout(() => {
        retryCount = 0;
      }, 5 * 60 * 1000);

      try {
        ws.send(JSON.stringify({ method: 'subscribeNewToken' }));
        onStatus({ connected: true, connecting: false, error: null });
      } catch {
        onStatus({ connected: false, connecting: false, error: 'PumpPortal reconnecting' });
      }
    });

    ws.addEventListener('message', (event) => {
      try {
        const token = normalizePumpPortalToken(JSON.parse(event.data));
        if (token) {
          token._fetchedAt = Date.now();
          token._lastSeenAt = Date.now();
          onStatus({ connected: true, connecting: false, lastTokenAt: token._lastSeenAt, error: null });
          onToken(token);
        }
      } catch {}
    });

    ws.addEventListener('error', () => {
      onStatus({ connected: false, connecting: false, error: 'PumpPortal reconnecting' });
      if (ws && ws.readyState !== WebSocket.CLOSED) {
        try { ws.close(); } catch {}
      }
    });

    ws.addEventListener('close', () => {
      window.clearTimeout(stableResetTimer);
      if (active) {
        // Kalau stream hidup >2 menit baru putus, anggap reset penalty.
        if (Date.now() - lastOpenAt > 120000) {
          retryCount = Math.max(0, retryCount - 2);
        }
        scheduleRetry();
      }
    });
  }

  function scheduleRetry() {
    if (!active) return;
    retryCount += 1;
    const baseDelay = BASE_DELAYS[Math.min(retryCount - 1, BASE_DELAYS.length - 1)];
    const jitter = Math.random() * 1000;
    const delay = Math.min(baseDelay + jitter, MAX_DELAY_MS);
    onStatus({ connected: false, connecting: true, error: null, nextRetryInMs: delay });
    reconnectTimer = window.setTimeout(connect, delay);
  }

  connect();

  return () => {
    active = false;
    window.clearTimeout(reconnectTimer);
    window.clearTimeout(stableResetTimer);
    if (ws) {
      try { ws.close(); } catch {}
    }
  };
}
