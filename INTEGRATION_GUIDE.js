/**
 * Integration Example for Advanced Features
 *
 * This file demonstrates how to integrate the new advanced features:
 * 1. Advanced Analytics Dashboard
 * 2. Notification System
 * 3. Trade History Export
 * 4. Performance Metrics
 */

// ============================================================================
// 1. IMPORT THE NEW MODULES
// ============================================================================

import AdvancedAnalytics from '../components/AdvancedAnalytics.jsx';
import ToastContainer from '../components/ToastContainer.jsx';
import NotificationSettings from '../components/NotificationSettings.jsx';
import {
  notifySignalAPlusDetected,
  notifySignalADetected,
  notifyTradeExecuted,
  notifyTPHit,
  notifySLHit,
  notifyBalanceLow,
  notifyRunnerDetected,
  notifyRugWarning,
  notifyTradeClosed,
  requestNotificationPermission
} from '../utils/notifications';
import {
  exportToCSV,
  exportToJSON,
  exportTaxReport,
  exportPerformanceSummary
} from '../utils/exportTrades';
import { calculateAllMetrics } from '../utils/metrics';

// ============================================================================
// 2. ADD STYLES TO YOUR MAIN APP
// ============================================================================

// In your main index.jsx or App.jsx, import the analytics styles:
// import './styles/analytics.css';

// ============================================================================
// 3. ADD TOAST CONTAINER TO YOUR APP ROOT
// ============================================================================

// In your App.jsx or Dashboard.jsx, add ToastContainer at the root level:
/*
export default function App() {
  return (
    <>
      <YourMainContent />
      <ToastContainer />
    </>
  );
}
*/

// ============================================================================
// 4. REQUEST NOTIFICATION PERMISSION ON APP START
// ============================================================================

// In your Dashboard.jsx or main component, request permission:
/*
useEffect(() => {
  // Request notification permission when user first loads the app
  requestNotificationPermission();
}, []);
*/

// ============================================================================
// 5. INTEGRATE NOTIFICATIONS INTO YOUR TRADING LOGIC
// ============================================================================

// Example: When a new signal is detected
function onSignalDetected(signal) {
  if (signal.grade === 'A+') {
    notifySignalAPlusDetected(signal.ticker, {
      price: signal.entry,
      liquidity: signal.liquidityUsd
    });
  } else if (signal.grade === 'A') {
    notifySignalADetected(signal.ticker, {
      price: signal.entry,
      liquidity: signal.liquidityUsd
    });
  }
}

// Example: When a trade is executed
function onTradeExecuted(trade) {
  notifyTradeExecuted(trade.ticker, trade.entry, {
    amount: trade.entryAmount,
    grade: trade.grade
  });
}

// Example: When TP/SL is hit
function onTPHit(trade) {
  notifyTPHit(trade.ticker, trade.pnlPct, {
    exitPrice: trade.exitPrice,
    multiple: trade.exitPrice / trade.entry
  });
}

function onSLHit(trade) {
  notifySLHit(trade.ticker, trade.pnlPct, {
    exitPrice: trade.exitPrice
  });
}

// Example: When balance is low
function checkBalance(balance) {
  const MIN_BALANCE = 0.1; // 0.1 SOL
  if (balance < MIN_BALANCE) {
    notifyBalanceLow(balance);
  }
}

// Example: When a runner is detected
function onRunnerDetected(trade) {
  const multiple = trade.currentPrice / trade.entry;
  if (multiple >= 3) {
    notifyRunnerDetected(trade.ticker, multiple.toFixed(1));
  }
}

// Example: When trade is closed
function onTradeClosed(trade) {
  notifyTradeClosed(trade.ticker, trade.pnlPct, {
    status: trade.status,
    holdTime: (trade.closedAt - trade.entryAt) / 60000 // minutes
  });
}

// ============================================================================
// 6. ADD ADVANCED ANALYTICS TAB TO YOUR DASHBOARD
// ============================================================================

// In your Dashboard.jsx, add a new tab for analytics:
/*
const TABS = [
  { key: 'signals', label: 'Sinyal Pasar', icon: Activity },
  { key: 'performance', label: 'Performa', icon: Trophy },
  { key: 'analytics', label: 'Advanced Analytics', icon: BarChart3 }, // NEW
  { key: 'live', label: 'Live Trading', icon: Zap },
];

// In your render:
{tab === 'analytics' && (
  <AdvancedAnalytics
    trades={trades}
    stats={stats}
  />
)}
*/

// ============================================================================
// 7. ADD NOTIFICATION SETTINGS BUTTON TO YOUR HEADER
// ============================================================================

// In your Dashboard header:
/*
<div className="dashboard-header">
  <h1>MemeAgent</h1>
  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
    <NotificationSettings />
    <button onClick={onLogout}>
      <LogOut size={18} /> Logout
    </button>
  </div>
</div>
*/

// ============================================================================
// 8. ADD EXPORT FUNCTIONALITY TO YOUR PERFORMANCE PANEL
// ============================================================================

// Example: Add export buttons to PerformancePanel
/*
function PerformancePanelWithExport({ trades, stats }) {
  const handleExport = (type) => {
    try {
      switch (type) {
        case 'csv':
          exportToCSV(trades, { filterCompleted: true });
          break;
        case 'json':
          exportToJSON(trades, { filterCompleted: true });
          break;
        case 'tax':
          exportTaxReport(trades);
          break;
        case 'summary':
          exportPerformanceSummary(trades, stats);
          break;
      }
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div>
      <PerformancePanel trades={trades} stats={stats} />
      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button onClick={() => handleExport('csv')}>Export CSV</button>
        <button onClick={() => handleExport('json')}>Export JSON</button>
        <button onClick={() => handleExport('tax')}>Tax Report</button>
        <button onClick={() => handleExport('summary')}>Summary</button>
      </div>
    </div>
  );
}
*/

// ============================================================================
// 9. CALCULATE AND DISPLAY METRICS
// ============================================================================

// Example: Calculate metrics in your component
/*
function MetricsDisplay({ trades }) {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    if (trades.length > 0) {
      const calculatedMetrics = calculateAllMetrics(trades);
      setMetrics(calculatedMetrics);
    }
  }, [trades]);

  if (!metrics) return null;

  return (
    <div>
      <h3>Performance Metrics</h3>
      <p>Sharpe Ratio: {metrics.sharpeRatio.toFixed(2)}</p>
      <p>Max Drawdown: {metrics.maxDrawdown.maxDrawdown.toFixed(2)}%</p>
      <p>Profit Factor: {metrics.profitFactor.toFixed(2)}</p>
      <p>Expectancy: {metrics.expectancy.toFixed(2)}%</p>
      <p>Avg Hold Time: {metrics.avgHoldTime.toFixed(0)} minutes</p>
    </div>
  );
}
*/

// ============================================================================
// 10. COMPLETE INTEGRATION EXAMPLE
// ============================================================================

/*
// In your Dashboard.jsx:

import { useState, useEffect } from 'react';
import { BarChart3, Activity, Trophy, Zap } from 'lucide-react';
import AdvancedAnalytics from '../components/AdvancedAnalytics.jsx';
import ToastContainer from '../components/ToastContainer.jsx';
import NotificationSettings from '../components/NotificationSettings.jsx';
import {
  notifySignalAPlusDetected,
  notifyTradeExecuted,
  notifyTradeClosed,
  requestNotificationPermission
} from '../utils/notifications';
import '../styles/analytics.css';

const TABS = [
  { key: 'signals', label: 'Sinyal Pasar', icon: Activity },
  { key: 'performance', label: 'Performa', icon: Trophy },
  { key: 'analytics', label: 'Advanced Analytics', icon: BarChart3 },
  { key: 'live', label: 'Live Trading', icon: Zap },
];

export default function Dashboard({ onLogout }) {
  const [tab, setTab] = useState('signals');
  const [trades, setTrades] = useState([]);
  const [stats, setStats] = useState({});

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Monitor for new signals
  useEffect(() => {
    // Your signal detection logic here
    // When new signal detected:
    // notifySignalAPlusDetected(signal.ticker, { price: signal.entry });
  }, []);

  // Monitor for trade events
  useEffect(() => {
    // Your trade monitoring logic here
    // When trade executed:
    // notifyTradeExecuted(trade.ticker, trade.entry);
    // When trade closed:
    // notifyTradeClosed(trade.ticker, trade.pnlPct);
  }, [trades]);

  return (
    <>
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>MemeAgent</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <NotificationSettings />
            <button onClick={onLogout}>Logout</button>
          </div>
        </div>

        <div className="tabs">
          {TABS.map(t => (
            <button
              key={t.key}
              className={tab === t.key ? 'active' : ''}
              onClick={() => setTab(t.key)}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="tab-content">
          {tab === 'signals' && <SignalsPanel />}
          {tab === 'performance' && <PerformancePanel trades={trades} stats={stats} />}
          {tab === 'analytics' && <AdvancedAnalytics trades={trades} stats={stats} />}
          {tab === 'live' && <LiveTradingPanel />}
        </div>
      </div>

      <ToastContainer />
    </>
  );
}
*/

// ============================================================================
// NOTES
// ============================================================================

/*
1. Make sure to import analytics.css in your main app file
2. ToastContainer should be added at the root level of your app
3. Request notification permission early (on app mount or after login)
4. Integrate notification calls into your existing trading logic
5. The AdvancedAnalytics component can be added as a new tab or section
6. Export functions can be called from buttons in your UI
7. Metrics calculations are automatic when you pass trades to AdvancedAnalytics
8. All notification settings are persisted in localStorage
9. Browser notifications require user permission
10. Toast notifications work without permission
*/

export {
  onSignalDetected,
  onTradeExecuted,
  onTPHit,
  onSLHit,
  checkBalance,
  onRunnerDetected,
  onTradeClosed
};
