/**
 * Analytics utility for tracking user behavior and performance
 */

// Google Analytics
export const initGA = () => {
  const trackingId = import.meta.env.VITE_GA_TRACKING_ID;

  if (!trackingId || import.meta.env.VITE_DEV_MODE === 'true') {
    console.log('Analytics disabled in development mode');
    return;
  }

  // Load GA script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  gtag('js', new Date());
  gtag('config', trackingId, {
    send_page_view: false, // We'll send manually
  });
};

// Track page views
export const trackPageView = (pageName) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      page_title: pageName,
      page_location: window.location.href,
      page_path: window.location.pathname,
    });
  }
};

// Track custom events
export const trackEvent = (category, action, label, value) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// Track wallet connections
export const trackWalletConnect = (walletType) => {
  trackEvent('Wallet', 'connect', walletType);
};

// Track trades
export const trackTrade = (action, tokenAddress, amount) => {
  trackEvent('Trading', action, tokenAddress, amount);
};

// Track errors
export const trackError = (errorMessage, errorLocation) => {
  trackEvent('Error', errorLocation, errorMessage);
};

// Performance monitoring
export const trackPerformance = () => {
  if (typeof window.gtag === 'function' && window.performance) {
    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
    const connectTime = perfData.responseEnd - perfData.requestStart;
    const renderTime = perfData.domComplete - perfData.domLoading;

    window.gtag('event', 'timing_complete', {
      name: 'page_load',
      value: pageLoadTime,
      event_category: 'Performance',
    });

    window.gtag('event', 'timing_complete', {
      name: 'server_response',
      value: connectTime,
      event_category: 'Performance',
    });

    window.gtag('event', 'timing_complete', {
      name: 'dom_render',
      value: renderTime,
      event_category: 'Performance',
    });
  }
};

// Web Vitals tracking
export const trackWebVitals = () => {
  if ('PerformanceObserver' in window) {
    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      trackEvent('Web Vitals', 'LCP', 'score', Math.round(lastEntry.renderTime || lastEntry.loadTime));
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        trackEvent('Web Vitals', 'FID', 'score', Math.round(entry.processingStart - entry.startTime));
      });
    });
    fidObserver.observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift (CLS)
    let clsScore = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsScore += entry.value;
        }
      }
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });

    // Report CLS on page unload
    window.addEventListener('beforeunload', () => {
      trackEvent('Web Vitals', 'CLS', 'score', Math.round(clsScore * 1000));
    });
  }
};
