/**
 * Notification System
 * Browser notifications dan toast notifications untuk trading events
 */

// Check if browser supports notifications
export function isNotificationSupported() {
  return 'Notification' in window;
}

// Request notification permission
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) {
    console.warn('Browser tidak mendukung notifications');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

// Show browser notification
export function showBrowserNotification(title, options = {}) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return null;
  }

  const defaultOptions = {
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: [200, 100, 200],
    requireInteraction: false,
    ...options
  };

  try {
    return new Notification(title, defaultOptions);
  } catch (error) {
    console.error('Error showing notification:', error);
    return null;
  }
}

// Notification types
export const NotificationType = {
  SIGNAL_A_PLUS: 'signal_a_plus',
  SIGNAL_A: 'signal_a',
  TRADE_EXECUTED: 'trade_executed',
  TP_HIT: 'tp_hit',
  SL_HIT: 'sl_hit',
  BALANCE_LOW: 'balance_low',
  RUNNER_DETECTED: 'runner_detected',
  RUG_WARNING: 'rug_warning',
  TRADE_CLOSED: 'trade_closed'
};

// Notification settings (stored in localStorage)
const SETTINGS_KEY = 'ma_notification_settings';

export function getNotificationSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (error) {
    console.error('Error loading notification settings:', error);
  }

  // Default settings
  return {
    enabled: true,
    browser: true,
    toast: true,
    sound: true,
    types: {
      [NotificationType.SIGNAL_A_PLUS]: true,
      [NotificationType.SIGNAL_A]: true,
      [NotificationType.TRADE_EXECUTED]: true,
      [NotificationType.TP_HIT]: true,
      [NotificationType.SL_HIT]: true,
      [NotificationType.BALANCE_LOW]: true,
      [NotificationType.RUNNER_DETECTED]: true,
      [NotificationType.RUG_WARNING]: true,
      [NotificationType.TRADE_CLOSED]: true
    }
  };
}

export function saveNotificationSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving notification settings:', error);
  }
}

// Toast notification queue
let toastQueue = [];
let toastListeners = [];

export function subscribeToToasts(callback) {
  toastListeners.push(callback);
  return () => {
    toastListeners = toastListeners.filter(cb => cb !== callback);
  };
}

function notifyToastListeners() {
  toastListeners.forEach(callback => callback([...toastQueue]));
}

export function showToast(message, type = 'info', duration = 5000) {
  const toast = {
    id: Date.now() + Math.random(),
    message,
    type, // 'success', 'error', 'warning', 'info'
    duration,
    timestamp: Date.now()
  };

  toastQueue.push(toast);
  notifyToastListeners();

  if (duration > 0) {
    setTimeout(() => {
      removeToast(toast.id);
    }, duration);
  }

  return toast.id;
}

export function removeToast(id) {
  toastQueue = toastQueue.filter(t => t.id !== id);
  notifyToastListeners();
}

export function clearAllToasts() {
  toastQueue = [];
  notifyToastListeners();
}

// Play notification sound
function playNotificationSound(type) {
  const settings = getNotificationSettings();
  if (!settings.sound) return;

  try {
    // Simple beep using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Different frequencies for different notification types
    const frequencies = {
      [NotificationType.SIGNAL_A_PLUS]: 880, // A5
      [NotificationType.TP_HIT]: 1046.5, // C6
      [NotificationType.SL_HIT]: 440, // A4
      [NotificationType.RUG_WARNING]: 220, // A3
      default: 523.25 // C5
    };

    oscillator.frequency.value = frequencies[type] || frequencies.default;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
}

// Main notification function
export function notify(type, data = {}) {
  const settings = getNotificationSettings();

  if (!settings.enabled || !settings.types[type]) {
    return;
  }

  let title = '';
  let body = '';
  let toastMessage = '';
  let toastType = 'info';
  let icon = '🔔';

  switch (type) {
    case NotificationType.SIGNAL_A_PLUS:
      title = '🚀 Signal A+ Detected!';
      body = `${data.ticker || 'Token'} - Setup kuat terdeteksi`;
      toastMessage = `Signal A+ detected: $${data.ticker}`;
      toastType = 'success';
      icon = '🚀';
      break;

    case NotificationType.SIGNAL_A:
      title = '⭐ Signal A Detected';
      body = `${data.ticker || 'Token'} - Setup bagus terdeteksi`;
      toastMessage = `Signal A detected: $${data.ticker}`;
      toastType = 'info';
      icon = '⭐';
      break;

    case NotificationType.TRADE_EXECUTED:
      title = '✅ Trade Executed';
      body = `Entry ${data.ticker || 'Token'} @ ${data.price || '-'}`;
      toastMessage = `Trade executed: $${data.ticker} @ ${data.price}`;
      toastType = 'success';
      icon = '✅';
      break;

    case NotificationType.TP_HIT:
      title = '💰 Take Profit Hit!';
      body = `${data.ticker || 'Token'} - TP hit +${data.pnl || 0}%`;
      toastMessage = `TP hit: $${data.ticker} +${data.pnl}%`;
      toastType = 'success';
      icon = '💰';
      break;

    case NotificationType.SL_HIT:
      title = '🛑 Stop Loss Hit';
      body = `${data.ticker || 'Token'} - SL hit ${data.pnl || 0}%`;
      toastMessage = `SL hit: $${data.ticker} ${data.pnl}%`;
      toastType = 'warning';
      icon = '🛑';
      break;

    case NotificationType.BALANCE_LOW:
      title = '⚠️ Balance Low Warning';
      body = `Balance: ${data.balance || 0} SOL`;
      toastMessage = `Low balance warning: ${data.balance} SOL`;
      toastType = 'warning';
      icon = '⚠️';
      break;

    case NotificationType.RUNNER_DETECTED:
      title = '🏃 Runner Detected!';
      body = `${data.ticker || 'Token'} - ${data.multiple || 0}x`;
      toastMessage = `Runner detected: $${data.ticker} ${data.multiple}x`;
      toastType = 'success';
      icon = '🏃';
      break;

    case NotificationType.RUG_WARNING:
      title = '⚠️ Rug Warning!';
      body = `${data.ticker || 'Token'} - ${data.reason || 'Suspicious activity'}`;
      toastMessage = `Rug warning: $${data.ticker}`;
      toastType = 'error';
      icon = '⚠️';
      break;

    case NotificationType.TRADE_CLOSED:
      title = data.pnl >= 0 ? '✅ Trade Closed (Win)' : '❌ Trade Closed (Loss)';
      body = `${data.ticker || 'Token'} - ${data.pnl >= 0 ? '+' : ''}${data.pnl || 0}%`;
      toastMessage = `Trade closed: $${data.ticker} ${data.pnl >= 0 ? '+' : ''}${data.pnl}%`;
      toastType = data.pnl >= 0 ? 'success' : 'error';
      icon = data.pnl >= 0 ? '✅' : '❌';
      break;

    default:
      title = 'MemeAgent Notification';
      body = data.message || '';
      toastMessage = data.message || 'Notification';
  }

  // Show browser notification
  if (settings.browser) {
    showBrowserNotification(title, {
      body,
      icon: icon,
      tag: type,
      data: data
    });
  }

  // Show toast notification
  if (settings.toast) {
    showToast(`${icon} ${toastMessage}`, toastType);
  }

  // Play sound
  if (settings.sound) {
    playNotificationSound(type);
  }
}

// Convenience functions
export function notifySignalAPlusDetected(ticker, data = {}) {
  notify(NotificationType.SIGNAL_A_PLUS, { ticker, ...data });
}

export function notifySignalADetected(ticker, data = {}) {
  notify(NotificationType.SIGNAL_A, { ticker, ...data });
}

export function notifyTradeExecuted(ticker, price, data = {}) {
  notify(NotificationType.TRADE_EXECUTED, { ticker, price, ...data });
}

export function notifyTPHit(ticker, pnl, data = {}) {
  notify(NotificationType.TP_HIT, { ticker, pnl, ...data });
}

export function notifySLHit(ticker, pnl, data = {}) {
  notify(NotificationType.SL_HIT, { ticker, pnl, ...data });
}

export function notifyBalanceLow(balance, data = {}) {
  notify(NotificationType.BALANCE_LOW, { balance, ...data });
}

export function notifyRunnerDetected(ticker, multiple, data = {}) {
  notify(NotificationType.RUNNER_DETECTED, { ticker, multiple, ...data });
}

export function notifyRugWarning(ticker, reason, data = {}) {
  notify(NotificationType.RUG_WARNING, { ticker, reason, ...data });
}

export function notifyTradeClosed(ticker, pnl, data = {}) {
  notify(NotificationType.TRADE_CLOSED, { ticker, pnl, ...data });
}
