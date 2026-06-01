// GET /api/jupiter?action=price&ids=ca1,ca2 -> { prices: { [ca]: { priceUsd } } }  (cache 4s)
// GET /api/jupiter?action=tokens               -> { byAddress: { [ca]: {...} } }     (cache 1h)
// Proxies Jupiter Price API + token list. Degrades to empty maps on failure.

import { fetchJson } from '../lib/rpc.js';
import { cached } from '../lib/cache.js';

const JUP_PRICE = 'https://lite-api.jup.ag/price/v3';
const JUP_TOKENS = 'https://lite-api.jup.ag/tokens/v2/tag?query=verified';
const PRICE_TTL_MS = 4_000;
const TOKENS_TTL_MS = 60 * 60 * 1000;

async function fetchPrices(ids) {
  const url = `${JUP_PRICE}?ids=${ids.map(encodeURIComponent).join(',')}`;
  // Jupiter Price v3 returns a flat map keyed by mint: { [id]: { usdPrice, ... } }.
  const data = await fetchJson(url).catch(() => null);
  const prices = {};
  const map = data && typeof data === 'object' ? data : {};
  for (const id of ids) {
    const entry = map[id];
    const priceUsd = Number(entry?.usdPrice ?? entry?.price ?? 0);
    if (priceUsd > 0) prices[id] = { priceUsd };
  }
  return { prices };
}

async function fetchTokens() {
  const data = await fetchJson(JUP_TOKENS).catch(() => null);
  const byAddress = {};
  // v2 tag endpoint returns an array of tokens keyed by `id` (the mint address).
  if (Array.isArray(data)) {
    for (const tok of data) {
      const addr = tok?.id || tok?.address;
      if (!addr) continue;
      byAddress[addr] = {
        address: addr,
        symbol: tok.symbol || null,
        name: tok.name || null,
        decimals: tok.decimals ?? null,
        tags: tok.tags || []
      };
    }
  }
  return { byAddress };
}

export default async function jupiterRoutes(fastify) {
  fastify.get('/api/jupiter', async (request) => {
    const action = String(request.query?.action || 'price').trim();

    if (action === 'tokens') {
      try {
        return await cached('jupiter:tokens', TOKENS_TTL_MS, fetchTokens);
      } catch {
        return { byAddress: {} };
      }
    }

    // default: price
    const ids = String(request.query?.ids || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!ids.length) return { prices: {} };

    try {
      const key = `jupiter:price:${[...ids].sort().join(',')}`;
      return await cached(key, PRICE_TTL_MS, () => fetchPrices(ids));
    } catch {
      return { prices: {} };
    }
  });
}
