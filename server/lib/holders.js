// holders.js — server-side port of the frontend's fetchTopHolders / classifyHolderRole /
// estimateCommonFunderProxy logic (from src/data/liveProviders.js). Uses server RPC.
// Powers /api/token-intel and feeds /api/alpha.

import { rpc } from './rpc.js';
import { config } from '../config.js';

const TOKEN_PROGRAM_IDS = new Set([
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  'TokenzQdBNbLqP5VEi98vJb2t1B4jWsXg41dRT5sPp'
]);
const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111';

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

// Parse "addr:name:type,addr:name:type" into { [addr]: { name, type, x } }.
export function parseWalletLabels(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((labels, item) => {
      const [address, name = 'Configured Smart Wallet', type = 'Smart Wallet', x = null] =
        item.split(':').map((part) => part.trim());
      if (address) labels[address] = { name, type, x };
      return labels;
    }, {});
}

const WALLET_LABELS = parseWalletLabels(config.smartWalletsRaw);

// Public registry shape mirrors the /api/smart-wallets response.
export function getSmartWalletRegistry() {
  const size = Object.keys(WALLET_LABELS).length;
  return {
    labels: WALLET_LABELS,
    size,
    source: size ? 'SMART_WALLETS' : 'belum diatur'
  };
}

function classifyHolderRole(holder, ownerAccountPrograms, dexPairs = []) {
  if (holder.owner && KNOWN_BURN_ADDRESSES.has(holder.owner)) {
    return { type: 'Burn', label: 'Burn / dead address' };
  }
  const ownerProgram = holder.owner ? ownerAccountPrograms.get(holder.owner) : null;
  const pairAddresses = new Set(dexPairs.map((p) => p?.pairAddress).filter(Boolean));
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
  return holders.filter((h) => h.owner && predicate(h)).length;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Heuristic proxy for "common funder" bundles, ported verbatim.
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

// Core: fetch top holders for a mint and build the holder-intel payload.
// Returns null on any failure (matches frontend graceful behaviour).
export async function fetchTopHolders(address, { supplyFromMint = null, dexPairs = [] } = {}) {
  try {
    const [largestAccounts, tokenSupply] = await Promise.all([
      rpc('getTokenLargestAccounts', [address, { commitment: 'confirmed' }]),
      supplyFromMint != null
        ? Promise.resolve({ value: { amount: String(supplyFromMint) } })
        : rpc('getTokenSupply', [address, { commitment: 'confirmed' }]).catch(() => null)
    ]);

    const accounts = largestAccounts?.value;
    if (!accounts || !accounts.length) return null;

    const totalSupply = Number(tokenSupply?.value?.amount || supplyFromMint || 0);
    const largestTokenAccounts = accounts.slice(0, 20);
    const topTokenAccountAddresses = largestTokenAccounts.map((a) => a.address);
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
    const registry = getSmartWalletRegistry();

    const owners = [];
    if (accountInfos?.value) {
      accountInfos.value.forEach((info, index) => {
        const ownerWallet = info?.data?.parsed?.info?.owner;
        if (ownerWallet) {
          owners.push(ownerWallet);
          holderDetails[index].owner = ownerWallet;
          const label = registry.labels[ownerWallet];
          if (label) {
            if (label.type === 'KOL') kolDetected = { address: ownerWallet, ...label };
            if (label.type === 'Smart Wallet' || label.type === 'Alpha Wallet' || label.type === 'KOL') {
              smartMoneyCount++;
            }
            holderDetails[index].label = label.name;
            holderDetails[index].type = label.type;
          }
        }
      });
    }

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
              .filter((h) => h.owner === owner)
              .forEach((h) => { h.solBalance = solBalance; });
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

    const lpAccounts = holderDetails.filter((h) => h.excludedFromTopHolders);
    const holderAccounts = holderDetails
      .filter((h) => !h.excludedFromTopHolders)
      .slice(0, 10)
      .map((h, index) => ({ ...h, rank: index + 1 }));
    const holderOwners = [...new Set(holderAccounts.map((h) => h.owner).filter(Boolean))];
    const top10Amount = holderAccounts.reduce((sum, h) => sum + Number(h.amount || 0), 0);
    const top10Pct = totalSupply > 0 ? (top10Amount / totalSupply) * 100 : null;

    const whales = countWalletRole(holderAccounts, (h) => Number(h.solBalance || 0) >= 250);
    const algorithmicSmartWallets = countWalletRole(holderAccounts, (h) => Number(h.solBalance || 0) >= 75);
    const burners = countWalletRole(holderAccounts, (h) => Number(h.solBalance || 0) <= 0.05);
    const bundleCount = estimateCommonFunderProxy(top10Pct, holderOwners.length, burners);

    return {
      top10Pct,
      commonFunderWallets: bundleCount,
      smartMoneyCount: smartMoneyCount + algorithmicSmartWallets,
      accounts: holderAccounts,
      holderDetails: holderAccounts,
      excludedHolderDetails: lpAccounts,
      walletIntel: [],
      uniqueOwnerCount: holderOwners.length,
      kol: kolDetected,
      whales,
      burners,
      madeOnSolIntel: null,
      globalFees: null,
      insightSummary: [],
      smartWalletRegistrySize: registry.size,
      smartWalletSource: registry.source,
      provider: 'RPC top holders'
    };
  } catch {
    return null;
  }
}
