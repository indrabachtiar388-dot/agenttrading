// x402.js — Coinbase x402 seller handshake (HTTP 402, Solana USDC), implemented by hand
// with fetch (no x402 npm package published for Fastify). Scoped as a preHandler to ONE route.
//
// Behaviour:
//  - X402_RECEIVING_WALLET unset  -> gate DISABLED, route serves freely (logs one notice).
//  - set + no X-PAYMENT header     -> 402 with JSON payment requirements.
//  - set + X-PAYMENT header        -> verify then settle via X402_FACILITATOR_URL.
//      verify fail        -> 402 again
//      facilitator error  -> 502
//      success            -> attach X-PAYMENT-RESPONSE and continue.
//  Fails CLOSED (never serves paid content without settlement) but never crashes the app.

import { config } from '../config.js';

const RESOURCE = '/api/alpha';

// Build the payment-requirements object sent on a bare 402.
function paymentRequirements() {
  return {
    scheme: 'exact',
    network: config.x402.network || 'solana',
    asset: config.x402.asset,
    payTo: config.x402.receivingWallet,
    maxAmountRequired: config.x402.price,
    resource: RESOURCE,
    description: 'MemeAgent alpha feed access',
    mimeType: 'application/json'
  };
}

async function callFacilitator(path, body) {
  const res = await fetch(`${config.x402.facilitatorUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body)
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

// Returns a Fastify preHandler. If the gate is disabled, returns a no-op handler.
export function createX402Guard(fastify) {
  const { receivingWallet, facilitatorUrl } = config.x402;

  if (!receivingWallet) {
    fastify.log.info('[x402] X402_RECEIVING_WALLET not set — /api/alpha is UNGATED (free).');
    return async () => {}; // no-op preHandler
  }

  fastify.log.info(`[x402] Gate ENABLED for ${RESOURCE} -> payTo ${receivingWallet} (${config.x402.network}).`);

  return async function x402PreHandler(request, reply) {
    const requirements = paymentRequirements();
    const header = request.headers['x-payment'];

    // No payment provided -> challenge.
    if (!header) {
      reply.code(402).send({ x402Version: 1, error: 'payment required', accepts: [requirements] });
      return reply; // returning reply halts the lifecycle
    }

    // A facilitator is required to verify/settle real payments. Fail closed.
    if (!facilitatorUrl) {
      request.log.error('[x402] X-PAYMENT received but X402_FACILITATOR_URL is not configured.');
      reply.code(502).send({ error: 'payment facilitator not configured' });
      return reply;
    }

    let paymentPayload;
    try {
      // X-PAYMENT is base64-encoded JSON per the x402 spec.
      paymentPayload = JSON.parse(Buffer.from(String(header), 'base64').toString('utf8'));
    } catch {
      reply.code(402).send({ x402Version: 1, error: 'invalid X-PAYMENT encoding', accepts: [requirements] });
      return reply;
    }

    try {
      // 1) verify
      const verify = await callFacilitator('/verify', {
        x402Version: 1,
        paymentPayload,
        paymentRequirements: requirements
      });
      if (!verify.ok || verify.json?.isValid === false) {
        reply.code(402).send({
          x402Version: 1,
          error: verify.json?.invalidReason || 'payment verification failed',
          accepts: [requirements]
        });
        return reply;
      }

      // 2) settle
      const settle = await callFacilitator('/settle', {
        x402Version: 1,
        paymentPayload,
        paymentRequirements: requirements
      });
      if (!settle.ok || settle.json?.success === false) {
        reply.code(402).send({
          x402Version: 1,
          error: settle.json?.errorReason || 'payment settlement failed',
          accepts: [requirements]
        });
        return reply;
      }

      // Success — surface settlement receipt to the client and continue to the route.
      const receipt = Buffer.from(JSON.stringify(settle.json)).toString('base64');
      reply.header('X-PAYMENT-RESPONSE', receipt);
      return; // continue
    } catch (err) {
      request.log.error({ err }, '[x402] facilitator call errored');
      reply.code(502).send({ error: 'payment facilitator unreachable' });
      return reply;
    }
  };
}
