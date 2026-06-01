// GET /api/health -> { ok:true, services:{...}, ts }
// Frontend only checks response.ok + valid JSON; services map is informational.

import { config } from '../config.js';

export default async function healthRoutes(fastify) {
  fastify.get('/api/health', async () => ({
    ok: true,
    services: {
      rpc: config.heliusApiKey ? 'helius' : 'public-mainnet-beta',
      birdeye: config.birdeyeApiKey ? 'configured' : 'no-key',
      jupiter: 'public',
      pumpfun: 'proxy',
      hermes: 'proxy',
      x402: config.x402.receivingWallet ? 'enabled' : 'disabled'
    },
    ts: Date.now()
  }));
}
