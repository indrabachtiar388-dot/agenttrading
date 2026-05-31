/**
 * telegramBot.js — Integrasi Telegram Bot untuk MemeAgent
 *
 * Fitur:
 * - Kirim alert (sinyal baru, TP/SL, trending sosial) ke Telegram
 * - Command handler: /status, /balance, /trades, /help, /start
 * - Notifikasi real-time (long polling getUpdates)
 * - Eksekusi trade via Telegram (opsional, dimatikan secara default
 *   demi keamanan — aktifkan dengan menyediakan handler executeTrade)
 *
 * Arsitektur:
 * - Memakai Telegram Bot HTTP API (https://api.telegram.org/bot<token>/...)
 *   yang dapat dipanggil langsung dari browser via fetch.
 * - Token & chatId disimpan di config runtime (idealnya via backend proxy
 *   untuk produksi; di sini kita izinkan konfigurasi runtime agar pluggable).
 * - Jika token tidak diset, semua pengiriman di-queue & dilog (mode dry-run)
 *   sehingga aplikasi tetap jalan tanpa kredensial.
 */

const API_BASE = 'https://api.telegram.org/bot';

// ----------------------------------------------------------------------------
// Konfigurasi runtime
// ----------------------------------------------------------------------------
const config = {
  token:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TELEGRAM_TOKEN) || '',
  chatId:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TELEGRAM_CHAT_ID) || '',
  proxy:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TELEGRAM_PROXY) || '',
  enableTradeExecution: false,
};

/** Konfigurasi token/chatId/proxy bot saat runtime. */
export function configureBot(opts = {}) {
  Object.assign(config, opts);
  return { ...config, token: config.token ? '***' : '' };
}

export function isConfigured() {
  return Boolean(config.token && config.chatId) || Boolean(config.proxy);
}

// Handler eksternal yang disuntikkan aplikasi (agar bot tahu state app)
const handlers = {
  getStatus: null, // () => ({ agentOn, signals, uptime, ... })
  getBalance: null, // () => Promise<{ sol, usd }>
  getTrades: null, // () => Array<trade>
  executeTrade: null, // (args) => Promise<result>  (opsional)
};

/** Daftarkan handler agar command bisa mengakses state aplikasi. */
export function registerHandlers(h = {}) {
  Object.assign(handlers, h);
}

// Antrian pesan saat dry-run (tanpa token)
const outbox = [];
export function getOutbox() {
  return [...outbox];
}

// ----------------------------------------------------------------------------
// Low-level API call
// ----------------------------------------------------------------------------
async function callApi(method, params = {}) {
  // Mode proxy backend (disarankan untuk produksi)
  if (config.proxy) {
    const res = await fetch(`${config.proxy.replace(/\/$/, '')}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return res.json();
  }

  // Mode langsung (butuh token)
  if (!config.token) {
    // Dry-run: log + queue, tidak melempar error
    outbox.push({ method, params, ts: Date.now(), dryRun: true });
    console.info(`[telegramBot] dry-run ${method}`, params);
    return { ok: false, dryRun: true };
  }

  const url = `${API_BASE}${config.token}/${method}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!data.ok) {
    console.warn(`[telegramBot] ${method} gagal:`, data.description);
  }
  return data;
}

// ----------------------------------------------------------------------------
// Pengiriman pesan & alert
// ----------------------------------------------------------------------------

/** Kirim pesan teks (MarkdownV2-safe ke chat default). */
export async function sendMessage(text, { chatId, parseMode = 'Markdown' } = {}) {
  return callApi('sendMessage', {
    chat_id: chatId || config.chatId,
    text,
    parse_mode: parseMode,
    disable_web_page_preview: true,
  });
}

/** Alert sinyal baru. */
export async function alertSignal(signal) {
  const emoji = signal.grade === 'A+' ? '🟢' : signal.grade === 'A' ? '🔵' : '🟡';
  const text =
    `${emoji} *Sinyal Baru ${escapeMd(signal.grade)}* — $${escapeMd(signal.ticker)}\n` +
    `Confidence: *${signal.confidence ?? '?'}%*\n` +
    `Entry: \`$${fmt(signal.entry ?? signal.priceUsd)}\`\n` +
    `TP: \`$${fmt(signal.tp)}\` | SL: \`$${fmt(signal.sl)}\`\n` +
    (signal.reasons?.length ? `_${escapeMd(signal.reasons.slice(0, 2).join(', '))}_\n` : '') +
    (signal.url ? `[Chart](${signal.url})` : '');
  return sendMessage(text);
}

/** Alert hasil trade (WIN/LOSS atau TP/SL tercapai). */
export async function alertTradeResult(trade) {
  const win = trade.status === 'WIN' || (trade.pnlPct ?? 0) > 0;
  const emoji = win ? '✅' : '❌';
  const text =
    `${emoji} *Trade ${escapeMd(trade.status || (win ? 'WIN' : 'LOSS'))}* — $${escapeMd(trade.ticker)}\n` +
    `Entry: \`$${fmt(trade.entry)}\` → Exit: \`$${fmt(trade.exit ?? trade.lastPrice)}\`\n` +
    `PnL: *${(trade.pnlPct ?? 0) >= 0 ? '+' : ''}${fmt(trade.pnlPct)}%*`;
  return sendMessage(text);
}

/** Alert token trending dari analisa sosial Twitter. */
export async function alertSocialTrending(social) {
  const text =
    `🔥 *Trending Sosial* — $${escapeMd(social.ticker)}\n` +
    `Sentiment: *${escapeMd(social.sentiment?.label || 'n/a')}* (${social.sentiment?.score})\n` +
    `Tweet: ${social.tweetCount} | KOL: ${social.kolCount}\n` +
    (social.volumeSpike?.spike ? `📈 Volume spike ${social.volumeSpike.ratio}x\n` : '') +
    `Social score: *${social.socialScore}/100*`;
  return sendMessage(text);
}

// ----------------------------------------------------------------------------
// Command handling
// ----------------------------------------------------------------------------

/** Bangun teks balasan untuk sebuah command. */
export async function handleCommand(command, args = [], ctx = {}) {
  const cmd = command.replace(/^\//, '').split('@')[0].toLowerCase();

  switch (cmd) {
    case 'start':
    case 'help':
      return (
        '*MemeAgent Bot* 🤖\n\n' +
        'Perintah tersedia:\n' +
        '/status — status agent & ringkasan\n' +
        '/balance — saldo wallet\n' +
        '/trades — posisi & riwayat trade\n' +
        '/help — bantuan ini'
      );

    case 'status': {
      const s = (await safeCall(handlers.getStatus)) || {};
      return (
        '*Status Agent*\n' +
        `Auto-track: ${s.agentOn ? '🟢 Aktif' : '⚪ Jeda'}\n` +
        `Sinyal aktif: ${s.signals ?? '—'}\n` +
        `Posisi terbuka: ${s.openTrades ?? '—'}\n` +
        `Win rate: ${s.winRate != null ? s.winRate + '%' : '—'}`
      );
    }

    case 'balance': {
      const b = (await safeCall(handlers.getBalance)) || {};
      if (b.sol == null) return 'Saldo tidak tersedia (wallet belum terhubung).';
      return (
        '*Saldo Wallet*\n' +
        `${fmt(b.sol)} SOL` +
        (b.usd != null ? ` (≈ $${fmt(b.usd)})` : '')
      );
    }

    case 'trades': {
      const trades = (await safeCall(handlers.getTrades)) || [];
      if (!trades.length) return 'Belum ada trade.';
      const active = trades.filter((t) => t.status === 'ACTIVE');
      const closed = trades.filter((t) => t.status !== 'ACTIVE');
      const lines = ['*Posisi Aktif*'];
      if (!active.length) lines.push('_tidak ada_');
      active.slice(0, 10).forEach((t) => {
        const pnl = t.pnlPct ?? 0;
        lines.push(`• $${escapeMd(t.ticker)} — ${pnl >= 0 ? '+' : ''}${fmt(pnl)}%`);
      });
      lines.push('', `*Riwayat:* ${closed.length} trade selesai`);
      const wins = closed.filter((t) => t.status === 'WIN' || (t.pnlPct ?? 0) > 0).length;
      if (closed.length) {
        lines.push(`Win: ${wins}/${closed.length} (${Math.round((wins / closed.length) * 100)}%)`);
      }
      return lines.join('\n');
    }

    case 'buy':
    case 'sell': {
      if (!config.enableTradeExecution || !handlers.executeTrade) {
        return '⚠️ Eksekusi trade via Telegram dinonaktifkan demi keamanan.';
      }
      const ticker = args[0];
      const amount = parseFloat(args[1]);
      if (!ticker) return 'Format: /' + cmd + ' <TICKER> <amount>';
      try {
        const result = await handlers.executeTrade({
          side: cmd.toUpperCase(),
          ticker,
          amount: Number.isFinite(amount) ? amount : undefined,
          chatId: ctx.chatId,
        });
        return result?.success
          ? `✅ ${cmd.toUpperCase()} $${escapeMd(ticker)} berhasil. ${result.signature ? '`' + result.signature.slice(0, 12) + '...`' : ''}`
          : `❌ Gagal: ${escapeMd(result?.error || 'unknown')}`;
      } catch (err) {
        return `❌ Error: ${escapeMd(err.message)}`;
      }
    }

    default:
      return `Perintah tidak dikenal: /${escapeMd(cmd)}. Ketik /help.`;
  }
}

// ----------------------------------------------------------------------------
// Polling (getUpdates) — terima command real-time
// ----------------------------------------------------------------------------
let pollOffset = 0;
let pollTimer = null;
let polling = false;

/** Mulai long-polling getUpdates untuk menerima command. */
export function startPolling({ intervalMs = 2500 } = {}) {
  if (!config.token && !config.proxy) {
    console.info('[telegramBot] startPolling dilewati: bot belum dikonfigurasi.');
    return stopPolling;
  }
  if (polling) return stopPolling;
  polling = true;

  const tick = async () => {
    if (!polling) return;
    try {
      const data = await callApi('getUpdates', { offset: pollOffset, timeout: 0, limit: 20 });
      if (data?.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          pollOffset = update.update_id + 1;
          await processUpdate(update);
        }
      }
    } catch (err) {
      console.warn('[telegramBot] polling error:', err.message);
    }
  };

  tick();
  pollTimer = setInterval(tick, intervalMs);
  return stopPolling;
}

export function stopPolling() {
  polling = false;
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function processUpdate(update) {
  const msg = update.message || update.edited_message;
  if (!msg || !msg.text) return;
  const text = msg.text.trim();
  if (!text.startsWith('/')) return;

  const [command, ...args] = text.split(/\s+/);
  const reply = await handleCommand(command, args, { chatId: msg.chat?.id });
  if (reply) {
    await sendMessage(reply, { chatId: msg.chat?.id });
  }
}

// ----------------------------------------------------------------------------
// Utils
// ----------------------------------------------------------------------------
async function safeCall(fn) {
  if (typeof fn !== 'function') return null;
  try {
    return await fn();
  } catch (err) {
    console.warn('[telegramBot] handler error:', err.message);
    return null;
  }
}

function fmt(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  const num = Number(n);
  if (Math.abs(num) < 0.0001 && num !== 0) return num.toExponential(2);
  if (Math.abs(num) < 1) return num.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

// Escape minimal untuk Markdown (legacy) agar tidak merusak format
function escapeMd(s) {
  return String(s ?? '').replace(/([_*`\[\]])/g, '\\$1');
}

export default {
  configureBot,
  isConfigured,
  registerHandlers,
  sendMessage,
  alertSignal,
  alertTradeResult,
  alertSocialTrending,
  handleCommand,
  startPolling,
  stopPolling,
  getOutbox,
};
