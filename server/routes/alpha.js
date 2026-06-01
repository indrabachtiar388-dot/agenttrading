// GET /api/alpha          -> monetized ranked alpha feed (x402-gated, rate-limited)
// GET /api/alpha/preview  -> ungated delayed teaser (top 1-2 items)
//
// The x402 gate is applied ONLY to /api/alpha via a route-scoped preHandler.
// /api/alpha/preview and all proxy routes stay free.

import { getAlphaFeed, getAlphaPreview } from '../lib/alpha.js';
import { createX402Guard } from '../middleware/x402.js';

export default async function alphaRoutes(fastify) {
  const x402Guard = createX402Guard(fastify);

  // Ungated teaser — register first so it is never caught by the gated handler.
  fastify.get('/api/alpha/preview', async () => {
    const items = await getAlphaPreview().catch(() => []);
    return { ok: true, preview: true, items };
  });

  // Gated + rate-limited full feed.
  fastify.get('/api/alpha', {
    preHandler: x402Guard,
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '1 minute'
      }
    }
  }, async () => {
    const items = await getAlphaFeed().catch(() => []);
    return { ok: true, items, ts: Date.now() };
  });
}
