// GET /api/smart-wallets -> { labels:{}, size, source }
// Sourced from SMART_WALLETS env ("addr:name:type" comma-separated) or empty. Cache long.

import { getSmartWalletRegistry } from '../lib/holders.js';
import { cached } from '../lib/cache.js';

const TTL_MS = 60 * 60 * 1000;

export default async function smartWalletRoutes(fastify) {
  fastify.get('/api/smart-wallets', async () =>
    cached('smart-wallets', TTL_MS, async () => getSmartWalletRegistry())
  );
}
