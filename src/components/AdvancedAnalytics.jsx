import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Award, Clock, Target, Download, Calendar } from 'lucide-react';
import { calculateAllMetrics } from '../utils/metrics';
import { exportToCSV, exportToJSON, exportTaxReport, exportPerformanceSummary } from '../utils/exportTrades';

function MetricCard({ label, value, subValue, icon: Icon, trend }) {
  const trendColor = trend === 'up' ? 'var(--green)' : trend === 'down' ? 'var(--red)' : 'var(--cyan)';

  return (
    <div className="metric-card">
      <div className="metric-card-header">
        <span className="metric-label">{label}</span>
        {Icon && <Icon size={16} style={{ color: 'var(--muted)' }} />}
      </div>
      <div className="metric-value" style={{ color: trendColor }}>
        {value}
      </div>
      {subValue && <div className="metric-sub">{subValue}</div>}
    </div>
  );
}

function PnLChart({ data, period }) {
  if (!data || data.length === 0) {
    return (
      <div className="chart-empty">
        Tidak ada data untuk periode {period}
      </div>
    );
  }

  const maxPnL = Math.max(...data.map(d => Math.abs(d.pnl)));
  const chartHeight = 120;

  return (
    <div className="pnl-chart">
      <div className="pnl-chart-bars">
        {data.map((item, i) => {
          const barHeight = maxPnL > 0 ? (Math.abs(item.pnl) / maxPnL) * chartHeight : 0;
          const isPositive = item.pnl >= 0;

          return (
            <div key={i} className="pnl-bar-container">
              <div
                className="pnl-bar"
                style={{
                  height: `${barHeight}px`,
                  backgroundColor: isPositive ? 'var(--green)' : 'var(--red)',
                  opacity: 0.8
                }}
                title={`${item.date}: ${isPositive ? '+' : ''}${item.pnl.toFixed(1)}%`}
              />
              <div className="pnl-bar-label">
                {period === 'daily' ? new Date(item.date).getDate() : item.date.split('-').pop()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WinRateByGradeChart({ data }) {
  const grades = ['A+', 'A', 'B'];
  const colors = {
    'A+': 'var(--green)',
    'A': 'var(--cyan)',
    'B': 'var(--amber)'
  };

  return (
    <div className="grade-chart">
      {grades.map(grade => {
        const gradeData = data[grade] || { winRate: 0, total: 0, wins: 0, losses: 0 };

        return (
          <div key={grade} className="grade-row">
            <div className="grade-label">
              <span className="grade-badge" style={{
                color: colors[grade],
                background: `${colors[grade]}22`,
                border: `1px solid ${colors[grade]}44`
              }}>
                {grade}
              </span>
              <span className="grade-stats">
                {gradeData.wins}W / {gradeData.losses}L
              </span>
            </div>
            <div className="grade-bar-container">
              <div
                className="grade-bar"
                style={{
                  width: `${gradeData.winRate}%`,
                  backgroundColor: colors[grade]
                }}
              />
              <span className="grade-percentage">{gradeData.winRate.toFixed(0)}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BestTokensTable({ tokens, title, isWorst = false }) {
  if (!tokens || tokens.length === 0) {
    return (
      <div className="empty-state" style={{ padding: 16 }}>
        Belum ada data
      </div>
    );
  }

  return (
    <div className="best-tokens-table">
      <h4 style={{ fontSize: 14, margin: '0 0 12px', color: 'var(--soft)' }}>{title}</h4>
      <table style={{ width: '100%', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--muted)' }}>
            <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 600 }}>Token</th>
            <th style={{ textAlign: 'center', padding: '8px 0', fontWeight: 600 }}>Grade</th>
            <th style={{ textAlign: 'right', padding: '8px 0', fontWeight: 600 }}>PnL</th>
            <th style={{ textAlign: 'right', padding: '8px 0', fontWeight: 600 }}>Hold</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
              <td style={{ padding: '8px 0' }}>
                <strong style={{ fontSize: 12 }}>${token.ticker}</strong>
              </td>
              <td style={{ textAlign: 'center', padding: '8px 0' }}>
                <span style={{
                  padding: '2px 6px',
                  borderRadius: 3,
                  fontSize: 10,
                  fontWeight: 700,
                  color: token.grade === 'A+' ? 'var(--green)' : token.grade === 'A' ? 'var(--cyan)' : 'var(--amber)',
                  background: token.grade === 'A+' ? 'rgba(22,163,74,0.15)' : token.grade === 'A' ? 'rgba(37,99,235,0.15)' : 'rgba(217,119,6,0.15)'
                }}>
                  {token.grade}
                </span>
              </td>
              <td style={{ textAlign: 'right', padding: '8px 0' }}>
                <strong style={{ color: token.pnlPct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {token.pnlPct >= 0 ? '+' : ''}{token.pnlPct.toFixed(1)}%
                </strong>
              </td>
              <td style={{ textAlign: 'right', padding: '8px 0', color: 'var(--muted)' }}>
                {token.holdTime < 60 ? `${Math.round(token.holdTime)}m` : `${Math.round(token.holdTime / 60)}h`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdvancedAnalytics({ trades = [], stats = {} }) {
  const [metrics, setMetrics] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    if (trades.length > 0) {
      const calculatedMetrics = calculateAllMetrics(trades);
      setMetrics(calculatedMetrics);
    }
  }, [trades]);

  if (!metrics) {
    return (
      <div className="panel">
        <div className="panel-header">
          <h3><BarChart3 size={16} style={{ verticalAlign: '-3px', marginRight: 6, color: 'var(--cyan)' }} /> Advanced Analytics</h3>
        </div>
        <div className="empty-state">
          Belum ada data trading. Mulai trading untuk melihat analytics.
        </div>
      </div>
    );
  }

  const handleExport = (type) => {
    try {
      switch (type) {
        case 'csv':
          exportToCSV(trades, { filterCompleted: true });
          break;
        case 'csv-tax':
          exportToCSV(trades, { filterCompleted: true, includeTaxInfo: true });
          break;
        case 'json':
          exportToJSON(trades, { filterCompleted: true });
          break;
        case 'tax-report':
          exportTaxReport(trades);
          break;
        case 'performance':
          exportPerformanceSummary(trades, stats);
          break;
        default:
          break;
      }
      setShowExportMenu(false);
    } catch (error) {
      console.error('Export error:', error);
      alert(error.message || 'Export gagal');
    }
  };

  const formatHoldTime = (minutes) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    if (minutes < 1440) return `${(minutes / 60).toFixed(1)}h`;
    return `${(minutes / 1440).toFixed(1)}d`;
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>
          <BarChart3 size={16} style={{ verticalAlign: '-3px', marginRight: 6, color: 'var(--cyan)' }} />
          Advanced Analytics
        </h3>
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: 13 }}
            onClick={() => setShowExportMenu(!showExportMenu)}
          >
            <Download size={14} /> Export
          </button>
          {showExportMenu && (
            <div className="export-menu">
              <button onClick={() => handleExport('csv')}>Export CSV</button>
              <button onClick={() => handleExport('csv-tax')}>Export CSV (Tax Info)</button>
              <button onClick={() => handleExport('json')}>Export JSON</button>
              <button onClick={() => handleExport('tax-report')}>Tax Report</button>
              <button onClick={() => handleExport('performance')}>Performance Summary</button>
            </div>
          )}
        </div>
      </div>

      {/* Risk-Adjusted Metrics */}
      <div className="analytics-section">
        <h4 className="section-title">Risk-Adjusted Returns</h4>
        <div className="metrics-grid">
          <MetricCard
            label="Sharpe Ratio"
            value={metrics.sharpeRatio.toFixed(2)}
            subValue="Return per unit risk"
            icon={Target}
            trend={metrics.sharpeRatio > 1 ? 'up' : metrics.sharpeRatio > 0 ? 'neutral' : 'down'}
          />
          <MetricCard
            label="Max Drawdown"
            value={`${metrics.maxDrawdown.maxDrawdown.toFixed(1)}%`}
            subValue={`Peak: ${metrics.maxDrawdown.peakValue.toFixed(1)}%`}
            icon={TrendingDown}
            trend="down"
          />
          <MetricCard
            label="Profit Factor"
            value={metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2)}
            subValue="Profit / Loss ratio"
            icon={Award}
            trend={metrics.profitFactor > 1.5 ? 'up' : 'neutral'}
          />
          <MetricCard
            label="Calmar Ratio"
            value={metrics.calmarRatio === Infinity ? '∞' : metrics.calmarRatio.toFixed(2)}
            subValue="Return / Max DD"
            icon={TrendingUp}
            trend={metrics.calmarRatio > 2 ? 'up' : 'neutral'}
          />
        </div>
      </div>

      {/* Trading Behavior */}
      <div className="analytics-section">
        <h4 className="section-title">Trading Behavior</h4>
        <div className="metrics-grid">
          <MetricCard
            label="Avg Hold Time"
            value={formatHoldTime(metrics.avgHoldTime)}
            subValue="Per position"
            icon={Clock}
            trend="neutral"
          />
          <MetricCard
            label="Win Streak"
            value={metrics.streaks.maxWinStreak}
            subValue={`Current: ${metrics.streaks.currentStreakType === 'WIN' ? metrics.streaks.currentStreak : 0}`}
            icon={TrendingUp}
            trend="up"
          />
          <MetricCard
            label="Loss Streak"
            value={metrics.streaks.maxLossStreak}
            subValue={`Current: ${metrics.streaks.currentStreakType === 'LOSS' ? metrics.streaks.currentStreak : 0}`}
            icon={TrendingDown}
            trend="down"
          />
          <MetricCard
            label="Expectancy"
            value={`${metrics.expectancy >= 0 ? '+' : ''}${metrics.expectancy.toFixed(1)}%`}
            subValue="Expected per trade"
            icon={Target}
            trend={metrics.expectancy > 0 ? 'up' : 'down'}
          />
        </div>
      </div>

      {/* PnL Charts */}
      <div className="analytics-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h4 className="section-title" style={{ margin: 0 }}>
            <Calendar size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
            Profit & Loss Trends
          </h4>
          <div className="period-selector">
            <button
              className={selectedPeriod === 'daily' ? 'active' : ''}
              onClick={() => setSelectedPeriod('daily')}
            >
              Daily
            </button>
            <button
              className={selectedPeriod === 'weekly' ? 'active' : ''}
              onClick={() => setSelectedPeriod('weekly')}
            >
              Weekly
            </button>
            <button
              className={selectedPeriod === 'monthly' ? 'active' : ''}
              onClick={() => setSelectedPeriod('monthly')}
            >
              Monthly
            </button>
          </div>
        </div>
        <PnLChart
          data={selectedPeriod === 'daily' ? metrics.dailyPnL : selectedPeriod === 'weekly' ? metrics.weeklyPnL : metrics.monthlyPnL}
          period={selectedPeriod}
        />
      </div>

      {/* Win Rate by Grade */}
      <div className="analytics-section">
        <h4 className="section-title">Win Rate by Grade</h4>
        <WinRateByGradeChart data={metrics.winRateByGrade} />
      </div>

      {/* Best & Worst Performers */}
      <div className="analytics-section">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <BestTokensTable tokens={metrics.bestTokens} title="🏆 Best Performers" />
          <BestTokensTable tokens={metrics.worstTokens} title="📉 Worst Performers" isWorst />
        </div>
      </div>
    </div>
  );
}
