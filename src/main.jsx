import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './hooks/useSecureAuth.jsx';
import './styles/main.css';
import './styles/wallet.css';
import './styles/live-trading.css';
import './styles/analytics.css';
import './styles/trading-style.css';
import './styles/command-center.css';

// Import monitoring utilities
import { initGA, trackPerformance, trackWebVitals } from './utils/analytics.js';
import { initSentry } from './utils/errorTracking.js';

// Initialize monitoring in production
if (import.meta.env.VITE_DEV_MODE !== 'true') {
  // Initialize error tracking
  initSentry().catch(console.error);

  // Initialize analytics
  initGA();

  // Track performance metrics
  window.addEventListener('load', () => {
    trackPerformance();
    trackWebVitals();
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
