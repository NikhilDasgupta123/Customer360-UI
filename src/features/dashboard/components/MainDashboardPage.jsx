import { useMemo } from 'react';
import CustomerGraphAppShell, { Icon } from '../../layout/components/CustomerGraphAppShell.jsx';
import { navigateTo } from '../../auth/logic/authService.js';
import { useDashboardSummary } from '../logic/useDashboardSummary.js';
import './MainDashboardPage.css';

function number(value) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(value || 0));
}

function inr(value) {
  const amount = Number(value || 0);
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(amount >= 100_000_000 ? 0 : 2).replace(/\.00$/, '')} Cr`;
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(amount >= 1_000_000 ? 1 : 2).replace(/\.00$/, '')} L`;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function displayMonth(value) {
  const [year, month] = String(value || '').split('-');
  const date = new Date(Number(year || 2026), Math.max(0, Number(month || 1) - 1), 1);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(date);
}

function TrendChart({ points }) {
  const chart = useMemo(() => {
    const source = Array.isArray(points) ? points : [];
    if (!source.length) return { points: '', labels: [] };
    const width = 410; const height = 202; const left = 34; const right = 14; const top = 12; const bottom = 32;
    const drawableWidth = width - left - right; const drawableHeight = height - top - bottom;
    const coords = source.map((item, index) => {
      const x = left + (source.length === 1 ? drawableWidth / 2 : (drawableWidth * index) / (source.length - 1));
      const score = Math.max(0, Math.min(100, Number(item.average_health_score || 0)));
      const y = top + ((100 - score) / 100) * drawableHeight;
      return { x, y, label: displayMonth(item.month), score };
    });
    return { points: coords.map((item) => `${item.x},${item.y}`).join(' '), labels: coords, width, height, left, right, top, bottom };
  }, [points]);

  if (!chart.labels?.length) return <div className="dash-chart-empty">No health-score history is available yet.</div>;

  return (
    <svg className="dash-health-svg" viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label="Health score trend for the last six months">
      {[25, 50, 75, 100].map((score) => {
        const y = chart.top + ((100 - score) / 100) * (chart.height - chart.top - chart.bottom);
        return <g key={score}><line x1={chart.left} x2={chart.width - chart.right} y1={y} y2={y} className="dash-grid-line" /><text x="5" y={y + 4} className="dash-y-label">{score}</text></g>;
      })}
      <polyline points={chart.points} className="dash-trend-line" />
      {chart.labels.map((item) => <g key={`${item.label}-${item.x}`}><circle cx={item.x} cy={item.y} r="3.2" className="dash-trend-dot" /><text x={item.x} y={chart.height - 8} textAnchor="middle" className="dash-x-label">{item.label}</text></g>)}
    </svg>
  );
}

function RiskPill({ level }) {
  const normalized = String(level || 'high').toLowerCase();
  const label = normalized[0]?.toUpperCase() + normalized.slice(1);
  return <span className={`dash-risk-pill ${normalized}`}>{label}</span>;
}

export default function MainDashboardPage() {
  const { summary, isLoading, error, refresh } = useDashboardSummary();
  const metricCards = [
    { key: 'customers', label: 'Total Customers', value: number(summary.total_customers), note: 'All active customers', icon: 'customers', tone: 'green', to: '/customers' },
    { key: 'risk', label: 'High Risk Customers', value: number(summary.high_risk_customers), note: 'Needs attention', icon: 'risk', tone: 'red', to: '/customers?risk_level=high' },
    { key: 'renewals', label: 'Upcoming Renewals', value: number(summary.upcoming_renewals_next_30_days), note: 'Next 30 days', icon: 'approvals', tone: 'blue', to: '/customers?renewal_within_days=30' },
    { key: 'tickets', label: 'Open Critical Tickets', value: number(summary.open_critical_tickets), note: 'Open right now', icon: 'support', tone: 'red', to: '/customers' },
    { key: 'invoices', label: 'Delayed Invoices', value: number(summary.delayed_invoices_count), note: inr(summary.delayed_invoices_amount), icon: 'billing', tone: 'blue', to: '/customers' },
    { key: 'upsell', label: 'Upsell Opportunities', value: number(summary.upsell_opportunities_count), note: inr(summary.upsell_potential_revenue), icon: 'opportunities', tone: 'green', to: '/customers' },
    { key: 'revenue', label: 'Revenue at Risk', value: inr(summary.revenue_at_risk), note: 'High + critical portfolio', icon: 'risk', tone: 'ink', to: '/customers?risk_level=high', wide: true },
  ];

  return (
    <CustomerGraphAppShell activeNav="dashboard" screenCode="C-02" screenTitle="Main Dashboard" contentMode="fixed">
      <section className="dash-page-head">
        <div><p className="dash-eyebrow">PORTFOLIO OVERVIEW</p><h2>Customer health at a glance</h2><p>Live business intelligence from the connected customer graph.</p></div>
        <button className="dash-refresh-button" type="button" onClick={refresh} disabled={isLoading}>{isLoading ? 'Loading…' : '↻ Refresh'}</button>
      </section>
      {error ? <div className="dash-feedback error">{error}</div> : null}
      <section className={`dash-metrics ${isLoading ? 'is-loading' : ''}`} aria-label="Main dashboard metrics">
        {metricCards.map((card) => (
          <button key={card.key} type="button" className={`dash-metric-card ${card.tone} ${card.wide ? 'wide' : ''}`} onClick={() => navigateTo(card.to)}>
            <span className="dash-metric-icon"><Icon name={card.icon} size={16} /></span>
            <span className="dash-metric-label">{card.label}</span>
            <strong>{isLoading ? '—' : card.value}</strong>
            <small>{card.note}</small>
          </button>
        ))}
      </section>
      <section className="dash-bottom-grid">
        <article className="dash-panel dash-chart-panel"><header><h3>Health Score Trend <span>(Last 6 Months)</span></h3></header><TrendChart points={summary.health_score_trend} /></article>
        <article className="dash-panel dash-risk-panel"><header><h3>Top 5 High-Risk Customers</h3></header><div className="dash-risk-list">{summary.top_high_risk_customers?.length ? summary.top_high_risk_customers.map((customer) => (<button className="dash-risk-row" type="button" key={customer.customer_id || customer.customer_name} onClick={() => navigateTo(`/customers?search=${encodeURIComponent(customer.customer_name)}`)}><span className="dash-risk-company">{customer.customer_name}</span><strong>{customer.health_score ?? '—'}</strong><RiskPill level={customer.risk_level} /></button>)) : <p className="dash-chart-empty">No high-risk customers were found.</p>}</div><button type="button" className="dash-view-all" onClick={() => navigateTo('/customers?risk_level=high')}>View all ›</button></article>
      </section>
    </CustomerGraphAppShell>
  );
}
