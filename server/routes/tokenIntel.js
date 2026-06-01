// GET /api/token-intel?ca= -> full holder-intel shape mapped by liveProviders.js#fetchBackendTokenIntel:
//   { top10Pct, commonFunderWallets, smartMoneyCount, accounts, holderDetails, walletIntel,
//     uniqueOwnerCount, kol, whales, burners, madeOnSolIntel, globalFees, insightSummary,
//     smartWalletRegistrySize, smartWalletSource }
// Computed server-side via lib/holders.js (ported RPC logic). Cache 75s per ca.

import { fetchTopHolders } from '../lib/holders.js';
import { cached } from '../lib/cache.js';

const TTL_MS = 75_000;

function emptyIntel() {
  return {
    top10Pct: null,
    commonFunderWallets: null,
    smartMoneyCount: null,
    accounts: [],
    holderDetails: [],
    walletIntel: [],
    uniqueOwnerCount: null,
    kol: null,
    whales: null,
    burners: null,
    madeOnSolIntel: null,
    globalFees: null,
    insightSummary: [],
    smartWalletRegistrySize: 0,
    smartWalletSource: 'belum diatur'
  };
}

export default async function tokenIntelRoutes(fastify) {
  fastify.get('/api/token-intel', async (request, reply) => {
    const ca = String(request.query?.ca || '').trim();
    if (!ca) {
      reply.code(400);
      return { error: 'missing ca' };
    }

    const intel = await cached(`token-intel:${ca}`, TTL_MS, () => fetchTopHolders(ca));
    if (!intel) return emptyIntel();

    return {
      top10Pct: intel.top10Pct ?? null,
      commonFunderWallets: intel.commonFunderWallets ?? null,
      smartMoneyCount: intel.smartMoneyCount ?? null,
      accounts: intel.accounts || [],
      holderDetails: intel.holderDetails || [],
      walletIntel: intel.walletIntel || [],
      uniqueOwnerCount: intel.uniqueOwnerCount ?? null,
      kol: intel.kol ?? null,
      whales: intel.whales ?? null,
      burners: intel.burners ?? null,
      madeOnSolIntel: intel.madeOnSolIntel ?? null,
      globalFees: intel.globalFees ?? null,
      insightSummary: intel.insightSummary || [],
      smartWalletRegistrySize: intel.smartWalletRegistrySize ?? 0,
      smartWalletSource: intel.smartWalletSource || 'belum diatur'
    };
  });
}
