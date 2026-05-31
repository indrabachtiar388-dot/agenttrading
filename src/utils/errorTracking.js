/**
 * Error tracking utility for Sentry integration
 *
 * To enable Sentry:
 * 1. Install: npm install @sentry/react
 * 2. Set VITE_SENTRY_DSN environment variable
 * 3. Uncomment the Sentry import and initialization code below
 */

let Sentry = null;

// Initialize Sentry
export const initSentry = async () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn || import.meta.env.VITE_DEV_MODE === 'true') {
    console.log('Error tracking disabled (no DSN or dev mode)');
    return;
  }

  try {
    // Dynamically import Sentry only if it's installed
    // Uncomment the following lines when @sentry/react is installed:
    /*
    const SentryModule = await import('@sentry/react');
    Sentry = SentryModule;

    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      integrations: [
        new Sentry.BrowserTracing(),
        new Sentry.Replay({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      beforeSend(event) {
        if (event.request) {
          delete event.request.cookies;
          delete event.request.headers;
        }
        return event;
      },
    });

    console.log('Sentry initialized');
    */
    console.log('Sentry not configured. Install @sentry/react to enable error tracking.');
  } catch (error) {
    console.warn('Failed to initialize Sentry:', error.message);
  }
};

// Capture exception
export const captureException = (error, context = {}) => {
  if (Sentry) {
    Sentry.captureException(error, {
      extra: context,
    });
  } else {
    console.error('Error:', error, context);
  }
};

// Capture message
export const captureMessage = (message, level = 'info', context = {}) => {
  if (Sentry) {
    Sentry.captureMessage(message, {
      level,
      extra: context,
    });
  } else {
    console.log(`[${level}] ${message}`, context);
  }
};

// Set user context
export const setUser = (user) => {
  if (Sentry) {
    Sentry.setUser(user ? {
      id: user.id,
      username: user.username,
    } : null);
  }
};

// Add breadcrumb
export const addBreadcrumb = (category, message, data = {}) => {
  if (Sentry) {
    Sentry.addBreadcrumb({
      category,
      message,
      data,
      level: 'info',
    });
  }
};

// Track transaction performance
export const startTransaction = (name, op) => {
  if (Sentry) {
    return Sentry.startTransaction({ name, op });
  }
  return null;
};

// Error boundary wrapper
export const withErrorBoundary = (Component, fallback) => {
  if (Sentry) {
    return Sentry.withErrorBoundary(Component, {
      fallback,
      showDialog: false,
    });
  }
  return Component;
};
