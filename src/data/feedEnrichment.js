/**
 * feedEnrichment.js — Enrichment on-chain untuk kandidat discovery feed.
 *
 * MASALAH yang diselesaikan: token dari fetchDiscoveryFeed() tidak pernah
 * di-enrich data on-chain (mint/freeze/top-holders) sebelum di-grade. Akibatnya
 * apeEngine.computeConfidence mentok ~50 dan scoreUnknowns kasih penalti -21,
 * sehingga token bersih tidak pernah naik ke grade A/A+ → "nol sinyal".
 *
 * Modul ini meng-enrich HANYA top-N kandidat (bukan seluruh feed) dengan budget
 * ketat (cache TTL, concurrency cap, negative cache, batch RPC) agar hemat API.
 *
 * Tidak merombak scoring/grading — hanya MENGISI flags yang sebelumnya null,
 * dengan logika merge yang sama persis seperti normalizeTokenSnapshot().
 */

import { fetchMintAuthority, fetchTopHolders, rpc } from './liveProviders';

const TOKEN_PROGRAM_IDS = new Set([
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  'TokenzQdBNbLqP5VEi98vJb2t1B4jWsXg41dRT5sPp'
]);
const PUMP_PROGRAM_ID = '6EF8rrecthR5Dk4r49j5b3m1TQBTciV4Xed2sW6qx6';

// Budget defaults — bisa di-override lewat opsi enrichFeedTokens().
const DEFAULT_LIMIT = 14;        // hanya top-N kandidat yang di-enrich
const DEFAULT_CONCURRENCY = 3;   // batasi burst RPC holder
const MINT_TTL_MS = 5 * 60 * 1000;   // mint/freeze hampir immutable
const HOLDERS_TTL_MS = 90 * 1000;    // distribusi holder berubah lebih cepat
const NEGATIVE_TTL_MS = 30 * 1000;   // CA yang gagal: jangan retry tiap cycle

const mintCache = new Map();     // ca -> { data, expiresAt }
const holdersCache = new Map();  // ca -> { data, expiresAt }
const negativeCache = new Map(); // ca -> expiresAt (skip sementara)

function now() { return Date.now(); }

function getCached(cache, ca) {
  const hit = cache.get(ca);
  if (hit && hit.expiresAt > now()) return hit.data;
  if (hit) cache.delete(ca);
  return undefined;
}

function setCached(cache, ca, data, ttl) {
  cache.set(ca, { data, expiresAt: now() + ttl });
}

function isNegative(ca) {
  const until = negativeCache.get(ca);
  if (until && until > now()) return true;
  if (until) negativeCache.delete(ca);
  return false;
}

/**
 * Ambil mint authority untuk banyak CA sekaligus dalam SATU getMultipleAccounts.
 * Mengganti N panggilan getAccountInfo → 1 panggilan. Hasil parse mirror
 * fetchMintAuthority() di liveProviders.js.
 */
async function fetchMintAuthoritiesBatch(cas) {
  if (!cas.length) return new Map();
  const result = new Map();
  try {
    const data = await rpc('getMultipleAccounts', [
      cas,
      { encoding: 'jsonParsed', commitment: 'confirmed' }
    ]);
    const values = data?.value || [];
    values.forEach((value, index) => {
      const ca = cas[index];
      if (!value) return;
      const owner = value.owner;
      const parsed = value.data?.parsed?.info;
      result.set(ca, {
        provider: 'Solana RPC getMultipleAccounts',
        exists: true,
        tokenProgram: TOKEN_PROGRAM_IDS.has(owner),
        owner,
        decimals: parsed?.decimals ?? null,
        supply: Number(parsed?.supply || 0),
        mintAuthority: parsed?.mintAuthority || null,
        freezeAuthority: parsed?.freezeAuthority || null,
        isPumpProgramAccount: owner === PUMP_PROGRAM_ID
      });
    });
  } catch {
    // Fallback: getMultipleAccounts gagal → biarkan kosong, enrichOne pakai
    // fetchMintAuthority per-token sebagai cadangan.
  }
  return result;
}

/** Helper concurrency cap sederhana untuk array task. */
async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      try {
        results[index] = await worker(items[index], index);
      } catch {
        results[index] = null;
      }
    }
  });
  await Promise.all(runners);
  return results;
}

/**
 * Terapkan hasil enrichment ke flags token (mutasi in-place).
 * Logika merge identik dengan normalizeTokenSnapshot() di liveProviders.js.
 */
function applyEnrichment(token, mint, holders) {
  const flags = token.flags || (token.flags = {});

  if (mint) {
    // rawProviders.mint = sinyal ke computeConfidence untuk +24 (Solana RPC).
    token.rawProviders = { ...(token.rawProviders || {}), mint };
    if (mint.tokenProgram) {
      flags.mintRevoked = !mint.mintAuthority;
      flags.freezeActive = Boolean(mint.freezeAuthority);
    }
  }

  if (holders) {
    if (holders.top10Pct != null) flags.top10Pct = holders.top10Pct;
    if (holders.commonFunderWallets != null) flags.commonFunderWallets = holders.commonFunderWallets;
    if (holders.uniqueOwnerCount != null) flags.uniqueOwnerCount = holders.uniqueOwnerCount;
    if (holders.smartMoneyCount != null) flags.smartMoneyCount = holders.smartMoneyCount;
    if (holders.whales != null) flags.whales = holders.whales;
    if (holders.burners != null) flags.burners = holders.burners;
    if (holders.kol != null) flags.kolDetected = holders.kol;
  }

  return token;
}

/**
 * Enrich top-N kandidat feed dengan data on-chain (mint/freeze + top holders).
 * Mutasi token in-place dan mengembalikan array yang sama. Hemat API:
 * cache TTL per-CA, batch mint dalam 1 RPC, concurrency cap untuk holder,
 * negative cache untuk CA yang gagal.
 *
 * @param {Array} tokens daftar token feed (sudah terurut by relevansi)
 * @param {{limit?:number, concurrency?:number}} opts
 * @returns {Promise<{tokens:Array, stats:{enriched:number, cacheHit:number, failed:number, skipped:number}}>}
 */
export async function enrichFeedTokens(tokens = [], opts = {}) {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const concurrency = opts.concurrency ?? DEFAULT_CONCURRENCY;
  const stats = { enriched: 0, cacheHit: 0, failed: 0, skipped: 0 };

  const candidates = tokens
    .filter((t) => t && t.ca)
    .slice(0, limit);
  if (!candidates.length) return { tokens, stats };

  // ── Mint/freeze: pakai cache, sisanya di-batch dalam 1 getMultipleAccounts ──
  const mintByCa = new Map();
  const needMint = [];
  for (const token of candidates) {
    const cached = getCached(mintCache, token.ca);
    if (cached !== undefined) {
      mintByCa.set(token.ca, cached);
      stats.cacheHit++;
    } else if (!isNegative(token.ca)) {
      needMint.push(token.ca);
    } else {
      stats.skipped++;
    }
  }

  if (needMint.length) {
    const fetched = await fetchMintAuthoritiesBatch(needMint);
    for (const ca of needMint) {
      let mint = fetched.get(ca);
      // Cadangan per-token kalau batch tidak mengembalikan akun ini.
      if (!mint) mint = await fetchMintAuthority(ca).catch(() => null);
      if (mint) {
        setCached(mintCache, ca, mint, MINT_TTL_MS);
        mintByCa.set(ca, mint);
      } else {
        negativeCache.set(ca, now() + NEGATIVE_TTL_MS);
      }
    }
  }

  // ── Holders: per-token (fetchTopHolders sudah batch internal), concurrency cap ──
  await runWithConcurrency(candidates, concurrency, async (token) => {
    const ca = token.ca;
    const mint = mintByCa.get(ca) || null;

    let holders = getCached(holdersCache, ca);
    if (holders === undefined) {
      if (isNegative(ca)) {
        holders = null;
      } else {
        holders = await fetchTopHolders(ca, mint?.supply ?? null, []).catch(() => null);
        if (holders) setCached(holdersCache, ca, holders, HOLDERS_TTL_MS);
      }
    } else {
      stats.cacheHit++;
    }

    if (mint || holders) {
      applyEnrichment(token, mint, holders);
      stats.enriched++;
    } else {
      stats.failed++;
    }
  });

  return { tokens, stats };
}

/** Bersihkan cache (untuk testing / reset manual). */
export function clearEnrichmentCache() {
  mintCache.clear();
  holdersCache.clear();
  negativeCache.clear();
}
