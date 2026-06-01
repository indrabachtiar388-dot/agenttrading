// GET /api/birdeye?ca= -> { ok:true, priceUsd, liquidityUsd, marketCapUsd, priceChange24h,
//   holderCount, uniqueWallet24h, security:{ lpLocked, creatorPercentage, top10UserPercent } }
// Calls Birdeye public API server-side with X-API-KEY. Without a key -> { ok:false }. Cache ~18s.

import { config } from '../config.js';
import { fetchJson } from '../lib/rpc.js';
import { cached } from '../lib/cache.js';

const BIRDEYE_BASE = 'https://public-api.birdeye.so';
const TTL_MS = 18_000;

async function fetchBirdeye(ca) {
  const headers = { 'X-API-KEY': config.birdeyeApiKey, 'x-chain': 'solana' };

  // token_overview carries price/liquidity/mc/holders; token_security carries top10/creator/lp.
  const [overviewRes, securityRes] = await Promise.allSettled([
    fetchJson(`${BIRDEYE_BASE}/defi/token_overview?address=${encodeURIComponent(ca)}`, { headers }),
    fetchJson(`${BIRDEYE_BASE}/defi/token_security?address=${encodeURIComponent(ca)}`, { headers })
  ]);

  const overview = overviewRes.status === 'fulfilled' ? overviewRes.value?.data : null;
  const security = securityRes.status === 'fulfilled' ? securityRes.value?.data : null;

  if (!overview && !security) return { ok: false };

  return {
    ok: true,
    priceUsd: Number(overview?.price ?? 0),
    liquidityUsd: Number(overview?.liquidity ?? 0),
    marketCapUsd: Number(overview?.mc ?? overview?.marketCap ?? 0),
    priceChange24h: Number(overview?.priceChange24hPercent ?? 0),
    holderCount: Number(overview?.holder ?? security?.holderCount ?? 0),
    uniqueWallet24h: Number(overview?.uniqueWallet24h ?? 0),
    security: {
      lpLocked: security?.lockInfo ? true : (security?.lpLocked ?? null),
      creatorPercentage: security?.creatorPercentage ?? null,
      top10UserPercent: security?.top10UserPercent ?? null,
      top10HolderPercent: security?.top10HolderPercent ?? null
    }
  };
}

export default async function birdeyeRoutes(fastify) {
  fastify.get('/api/birdeye', async (request) => {
    const ca = String(request.query?.ca || '').trim();
    if (!ca) return { ok: false };
    if (!config.birdeyeApiKey) return { ok: false }; // no key -> graceful

    try {
      return await cached(`birdeye:${ca}`, TTL_MS, () => fetchBirdeye(ca));
    } catch {
      return { ok: false };
    }
  });
}
