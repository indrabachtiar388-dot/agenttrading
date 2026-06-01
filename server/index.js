// index.js — MemeAgent backend entrypoint.
// Mounts CORS + rate-limit, registers all /api routes, listens on PORT (default 3001).
// The frontend dev proxy hardcodes http://localhost:3001/api/*.

import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';

import { config } from './config.js';

import healthRoutes from './routes/health.js';
import birdeyeRoutes from './routes/birdeye.js';
import jupiterRoutes from './routes/jupiter.js';
import pumpfunRoutes from './routes/pumpfun.js';
import tokenIntelRoutes from './routes/tokenIntel.js';
import smartWalletRoutes from './routes/smartWallets.js';
import hermesRoutes from './routes/hermes.js';
import alphaRoutes from './routes/alpha.js';

const fastify = Fastify({
  logger: { level: process.env.LOG_LEVEL || 'info' },
  trustProxy: true
});

// CORS — allow the configured origin (or all in dev). Expose X-PAYMENT-RESPONSE for x402 clients.
await fastify.register(cors, {
  origin: config.allowedOrigin === '*' ? true : config.allowedOrigin.split(',').map((o) => o.trim()),
  exposedHeaders: ['X-PAYMENT-RESPONSE'],
  allowedHeaders: ['content-type', 'accept', 'x-payment']
});

// Rate-limit registered NON-global: only routes that opt in via config.rateLimit (i.e. /api/alpha).
await fastify.register(rateLimit, {
  global: false,
  max: 60,
  timeWindow: '1 minute'
});

// Routes
await fastify.register(healthRoutes);
await fastify.register(birdeyeRoutes);
await fastify.register(jupiterRoutes);
await fastify.register(pumpfunRoutes);
await fastify.register(tokenIntelRoutes);
await fastify.register(smartWalletRoutes);
await fastify.register(hermesRoutes);
await fastify.register(alphaRoutes);

try {
  await fastify.listen({ port: config.port, host: '0.0.0.0' });
  fastify.log.info(`MemeAgent server listening on :${config.port}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
