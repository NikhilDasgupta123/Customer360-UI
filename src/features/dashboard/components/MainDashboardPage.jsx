import { useCallback, useMemo, useRef, useState } from 'react';
import CustomerGraphAppShell, { Icon } from '../../layout/components/CustomerGraphAppShell.jsx';
import { navigateTo } from '../../auth/logic/authService.js';
import { useDashboardSummary } from '../logic/useDashboardSummary.js';
import './MainDashboardPage.css';

const CHART_WIDTH = 410;
const CHART_HEIGHT = 202;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

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

function displayMonthAndYear(value) {
  const [year, month] = String(value || '').split('-');
  const date = new Date(Number(year || 2026), Math.max(0, Number(month || 1) - 1), 1);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(date);
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function clampViewport(nextViewport) {
  const zoom = clamp(nextViewport.zoom, MIN_ZOOM, MAX_ZOOM);
  const visibleWidth = CHART_WIDTH / zoom;
  const visibleHeight = CHART_HEIGHT / zoom;

  return {
    zoom,
    centerX: clamp(nextViewport.centerX, visibleWidth / 2, CHART_WIDTH - visibleWidth / 2),
    centerY: clamp(nextViewport.centerY, visibleHeight / 2, CHART_HEIGHT - visibleHeight / 2),
  };
}

function TrendChart({ points }) {
  const svgRef = useRef(null);
  const pointerPositionsRef = useRef(new Map());
  const pinchRef = useRef(null);
  const dragRef = useRef(null);
  const viewportRef = useRef({ zoom: MIN_ZOOM, centerX: CHART_WIDTH / 2, centerY: CHART_HEIGHT / 2 });
  const [viewport, setViewport] = useState(viewportRef.current);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const chart = useMemo(() => {
    const source = Array.isArray(points) ? points : [];
    if (!source.length) return { points: '', labels: [] };

    const left = 34;
    const right = 14;
    const top = 12;
    const bottom = 32;
    const drawableWidth = CHART_WIDTH - left - right;
    const drawableHeight = CHART_HEIGHT - top - bottom;
    const coords = source.map((item, index) => {
      const x = left + (source.length === 1 ? drawableWidth / 2 : (drawableWidth * index) / (source.length - 1));
      const score = Math.max(0, Math.min(100, Number(item.average_health_score || 0)));
      const y = top + ((100 - score) / 100) * drawableHeight;
      return {
        x,
        y,
        label: displayMonth(item.month),
        fullLabel: displayMonthAndYear(item.month),
        score,
      };
    });

    return {
      points: coords.map((item) => `${item.x},${item.y}`).join(' '),
      labels: coords,
      left,
      right,
      top,
      bottom,
    };
  }, [points]);

  const updateViewport = useCallback((nextViewport) => {
    const safeViewport = clampViewport(nextViewport);
    viewportRef.current = safeViewport;
    setViewport(safeViewport);
  }, []);

  const getWorldPosition = useCallback((clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return null;

    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    const currentViewport = viewportRef.current;
    const visibleWidth = CHART_WIDTH / currentViewport.zoom;
    const visibleHeight = CHART_HEIGHT / currentViewport.zoom;
    const relativeX = clamp((clientX - rect.left) / rect.width, 0, 1);
    const relativeY = clamp((clientY - rect.top) / rect.height, 0, 1);

    return {
      x: currentViewport.centerX - visibleWidth / 2 + relativeX * visibleWidth,
      y: currentViewport.centerY - visibleHeight / 2 + relativeY * visibleHeight,
      relativeX,
      relativeY,
    };
  }, []);

  const zoomAt = useCallback((targetZoom, clientX, clientY) => {
    const worldPosition = getWorldPosition(clientX, clientY);
    if (!worldPosition) return;

    const zoom = clamp(targetZoom, MIN_ZOOM, MAX_ZOOM);
    const visibleWidth = CHART_WIDTH / zoom;
    const visibleHeight = CHART_HEIGHT / zoom;

    updateViewport({
      zoom,
      centerX: worldPosition.x - (worldPosition.relativeX - 0.5) * visibleWidth,
      centerY: worldPosition.y - (worldPosition.relativeY - 0.5) * visibleHeight,
    });
    setHoveredPoint(null);
  }, [getWorldPosition, updateViewport]);

  const resetZoom = useCallback(() => {
    pointerPositionsRef.current.clear();
    pinchRef.current = null;
    dragRef.current = null;
    updateViewport({ zoom: MIN_ZOOM, centerX: CHART_WIDTH / 2, centerY: CHART_HEIGHT / 2 });
    setHoveredPoint(null);
  }, [updateViewport]);

  const getFirstTwoPointers = () => Array.from(pointerPositionsRef.current.values()).slice(0, 2);

  const handlePointerDown = (event) => {
    pointerPositionsRef.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    event.currentTarget.setPointerCapture?.(event.pointerId);

    if (pointerPositionsRef.current.size === 1) {
      const currentViewport = viewportRef.current;
      dragRef.current = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startCenterX: currentViewport.centerX,
        startCenterY: currentViewport.centerY,
        startZoom: currentViewport.zoom,
      };
      return;
    }

    if (pointerPositionsRef.current.size >= 2) {
      const [first, second] = getFirstTwoPointers();
      pinchRef.current = {
        startDistance: Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY) || 1,
        startZoom: viewportRef.current.zoom,
      };
      dragRef.current = null;
      event.preventDefault();
    }
  };

  const handlePointerMove = (event) => {
    if (!pointerPositionsRef.current.has(event.pointerId)) return;

    pointerPositionsRef.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });

    if (pointerPositionsRef.current.size >= 2) {
      const [first, second] = getFirstTwoPointers();
      const pinch = pinchRef.current;
      if (!first || !second || !pinch) return;

      const distance = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY) || 1;
      const midpointX = (first.clientX + second.clientX) / 2;
      const midpointY = (first.clientY + second.clientY) / 2;
      zoomAt(pinch.startZoom * (distance / pinch.startDistance), midpointX, midpointY);
      event.preventDefault();
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || drag.startZoom <= MIN_ZOOM) return;

    const svg = svgRef.current;
    const rect = svg?.getBoundingClientRect();
    if (!rect?.width || !rect?.height) return;

    const visibleWidth = CHART_WIDTH / drag.startZoom;
    const visibleHeight = CHART_HEIGHT / drag.startZoom;
    updateViewport({
      zoom: drag.startZoom,
      centerX: drag.startCenterX - ((event.clientX - drag.startClientX) / rect.width) * visibleWidth,
      centerY: drag.startCenterY - ((event.clientY - drag.startClientY) / rect.height) * visibleHeight,
    });
    setHoveredPoint(null);
    event.preventDefault();
  };

  const handlePointerEnd = (event) => {
    pointerPositionsRef.current.delete(event.pointerId);
    dragRef.current = null;

    if (pointerPositionsRef.current.size >= 2) {
      const [first, second] = getFirstTwoPointers();
      pinchRef.current = {
        startDistance: Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY) || 1,
        startZoom: viewportRef.current.zoom,
      };
      return;
    }

    pinchRef.current = null;
  };

  const handleWheel = (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    zoomAt(viewportRef.current.zoom * Math.exp(-event.deltaY * 0.0035), event.clientX, event.clientY);
  };

  const handleDoubleClick = (event) => {
    event.preventDefault();
    const currentZoom = viewportRef.current.zoom;
    if (currentZoom > 1.05) {
      resetZoom();
      return;
    }
    zoomAt(Math.min(currentZoom * 1.8, MAX_ZOOM), event.clientX, event.clientY);
  };

  if (!chart.labels?.length) return <div className="dash-chart-empty">No health-score history is available yet.</div>;

  const visibleWidth = CHART_WIDTH / viewport.zoom;
  const visibleHeight = CHART_HEIGHT / viewport.zoom;
  const viewBoxX = viewport.centerX - visibleWidth / 2;
  const viewBoxY = viewport.centerY - visibleHeight / 2;
  const isZoomed = viewport.zoom > 1.01;

  const tooltipPosition = hoveredPoint ? {
    left: `${((hoveredPoint.x - viewBoxX) / visibleWidth) * 100}%`,
    top: `${((hoveredPoint.y - viewBoxY) / visibleHeight) * 100}%`,
  } : null;
  const tooltipPlacement = hoveredPoint
    ? `${hoveredPoint.x > viewBoxX + visibleWidth * 0.8 ? 'align-right' : hoveredPoint.x < viewBoxX + visibleWidth * 0.2 ? 'align-left' : ''} ${hoveredPoint.y < viewBoxY + visibleHeight * 0.22 ? 'place-below' : ''}`
    : '';

  return (
    <div className={`dash-chart-wrap ${isZoomed ? 'is-zoomed' : ''}`} onMouseLeave={() => setHoveredPoint(null)}>
      <svg
        ref={svgRef}
        className="dash-health-svg is-interactive"
        viewBox={`${viewBoxX} ${viewBoxY} ${visibleWidth} ${visibleHeight}`}
        role="img"
        aria-label="Interactive health score trend. Pinch to zoom and drag to pan."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      >
        {[25, 50, 75, 100].map((score) => {
          const y = chart.top + ((100 - score) / 100) * (CHART_HEIGHT - chart.top - chart.bottom);
          return (
            <g key={score}>
              <line x1={chart.left} x2={CHART_WIDTH - chart.right} y1={y} y2={y} className="dash-grid-line" />
              <text x="5" y={y + 4} className="dash-y-label">{score}</text>
            </g>
          );
        })}
        <polyline points={chart.points} className={`dash-trend-line ${hoveredPoint ? 'is-hovered' : ''}`} />
        {chart.labels.map((item) => {
          const isActive = hoveredPoint?.x === item.x;
          return (
            <g key={`${item.label}-${item.x}`} className="dash-chart-point-group">
              <circle
                cx={item.x}
                cy={item.y}
                r={isActive ? 5.2 : 4.4}
                className={`dash-trend-dot ${isActive ? 'is-active' : ''}`}
                tabIndex="0"
                role="button"
                aria-label={`${item.fullLabel}: average health score ${item.score}`}
                onMouseEnter={() => setHoveredPoint(item)}
                onFocus={() => setHoveredPoint(item)}
                onBlur={() => setHoveredPoint(null)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setHoveredPoint(item);
                  }
                  if (event.key === 'Escape') setHoveredPoint(null);
                }}
              />
              <text x={item.x} y={CHART_HEIGHT - 8} textAnchor="middle" className="dash-x-label">{item.label}</text>
            </g>
          );
        })}
      </svg>

      {isZoomed ? (
        <button type="button" className="dash-chart-reset-button" onClick={resetZoom} aria-label="Reset chart zoom">
          Reset view
        </button>
      ) : null}

      {hoveredPoint ? (
        <div className={`dash-chart-tooltip ${tooltipPlacement}`} style={tooltipPosition} role="status">
          <strong>{hoveredPoint.fullLabel}</strong>
          <span>Average health score <b>{hoveredPoint.score}</b></span>
        </div>
      ) : null}
    </div>
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
    <CustomerGraphAppShell activeNav="dashboard" contentMode="fixed">
      <section className="dash-page-head">
        <div>
          <p className="dash-eyebrow">PORTFOLIO OVERVIEW</p>
          <h2>Customer health at a glance</h2>
          <p>Live business intelligence from the connected customer graph.</p>
        </div>
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
        <article className="dash-panel dash-chart-panel">
          <header className="dash-panel-heading">
            <h3>Health Score Trend <span>(Last 6 Months)</span></h3>
            <span className="dash-chart-gesture-hint">Pinch / Ctrl + scroll to zoom</span>
          </header>
          <TrendChart points={summary.health_score_trend} />
        </article>
        <article className="dash-panel dash-risk-panel">
          <header><h3>Top 5 High-Risk Customers</h3></header>
          <div className="dash-risk-list">
            {summary.top_high_risk_customers?.length ? summary.top_high_risk_customers.map((customer) => (
              <button className="dash-risk-row" type="button" key={customer.customer_id || customer.customer_name} onClick={() => navigateTo(`/customers?search=${encodeURIComponent(customer.customer_name)}`)}>
                <span className="dash-risk-company">{customer.customer_name}</span>
                <strong>{customer.health_score ?? '—'}</strong>
                <RiskPill level={customer.risk_level} />
              </button>
            )) : <p className="dash-chart-empty">No high-risk customers were found.</p>}
          </div>
          <button type="button" className="dash-view-all" onClick={() => navigateTo('/customers?risk_level=high')}>View all ›</button>
        </article>
      </section>
    </CustomerGraphAppShell>
  );
}
