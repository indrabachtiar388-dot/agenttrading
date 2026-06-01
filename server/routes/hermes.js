// GET /api/hermes?ids=feedId1,feedId2 -> { prices: { [id]: { price, conf, expo, publishTime } } }
// GET /api/hermes/sol                  -> SOL/USD via the known Pyth SOL/USD feed id
// Proxies Pyth Hermes. Cache 3s.

import { config, SOL_USD_PYTH_FEED_ID } from '../config.js';
import { fetchJson } from '../lib/rpc.js';
import { cached } from '../lib/cache.js';

const TTL_MS = 3_000;

// Hermes returns ids without 0x; normalize for lookup.
function norm(id) {
  return String(id || '').replace(/^0x/i, '').toLowerCase();
}

async function fetchHermes(ids) {
  const query = ids.map((id) => `ids[]=${encodeURIComponent(id)}`).join('&');
  const data = await fetchJson(`${config.hermesUrl}/v2/updates/price/latest?${query}`);
  const prices = {};
  const parsed = Array.isArray(data?.parsed) ? data.parsed : [];
  // Map returned feeds back to the exact ids the caller asked for.
  const byNorm = new Map(parsed.map((p) => [norm(p.id), p]));
  for (const id of ids) {
    const entry = byNorm.get(norm(id));
    const p = entry?.price;
    if (p) {
      prices[id] = {
        price: Number(p.price),
        conf: Number(p.conf),
        expo: Number(p.expo),
        publishTime: Number(p.publish_time)
      };
    }
  }
  return { prices };
}

export default async function hermesRoutes(fastify) {
  fastify.get('/api/hermes/sol', async () => {
    try {
      const result = await cached('hermes:sol', TTL_MS, () => fetchHermes([SOL_USD_PYTH_FEED_ID]));
      return { prices: result.prices, feedId: SOL_USD_PYTH_FEED_ID };
    } catch {
      return { prices: {} };
    }
  });

  fastify.get('/api/hermes', async (request) => {
    const ids = String(request.query?.ids || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!ids.length) return { prices: {} };

    try {
      const key = `hermes:${[...ids].sort().join(',')}`;
      return await cached(key, TTL_MS, () => fetchHermes(ids));
    } catch {
      return { prices: {} };
    }
  });
}
