import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CustomerGraphAppShell, { Icon } from '../../layout/components/CustomerGraphAppShell.jsx';
import { navigateTo } from '../../auth/logic/authService.js';
import { useDashboardSummary } from '../logic/useDashboardSummary.js';
import './MainDashboardPage.css';

const CHART_WIDTH = 410;
const CHART_HEIGHT = 202;
const PLOT_LEFT = 34;
const PLOT_RIGHT = 14;
const PLOT_TOP = 12;
const PLOT_BOTTOM = 32;
const PLOT_WIDTH = CHART_WIDTH - PLOT_LEFT - PLOT_RIGHT;
const PLOT_HEIGHT = CHART_HEIGHT - PLOT_TOP - PLOT_BOTTOM;
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
  const visibleWidth = PLOT_WIDTH / zoom;
  const visibleHeight = PLOT_HEIGHT / zoom;

  return {
    zoom,
    centerX: clamp(nextViewport.centerX, visibleWidth / 2, PLOT_WIDTH - visibleWidth / 2),
    centerY: clamp(nextViewport.centerY, visibleHeight / 2, PLOT_HEIGHT - visibleHeight / 2),
  };
}

function niceTickStep(rawStep) {
  if (!Number.isFinite(rawStep) || rawStep <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const multiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return multiplier * magnitude;
}

function formatAxisValue(value, step) {
  const decimals = step < 1 ? Math.min(2, Math.max(1, Math.ceil(-Math.log10(step)))) : 0;
  return Number(value.toFixed(decimals)).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

function buildVisibleYAxisTicks(viewY, visibleHeight) {
  const scoreAtY = (worldY) => clamp(100 - (worldY / PLOT_HEIGHT) * 100, 0, 100);
  const scoreMaximum = scoreAtY(viewY);
  const scoreMinimum = scoreAtY(viewY + visibleHeight);
  const scoreRange = Math.max(scoreMaximum - scoreMinimum, 0.1);
  const step = niceTickStep(scoreRange / 4);
  const firstTick = Math.ceil((scoreMinimum - 1e-8) / step) * step;
  const ticks = [];

  for (let score = firstTick; score <= scoreMaximum + step * 0.001; score += step) {
    const clampedScore = clamp(score, 0, 100);
    const worldY = ((100 - clampedScore) / 100) * PLOT_HEIGHT;
    const screenY = PLOT_TOP + ((worldY - viewY) / visibleHeight) * PLOT_HEIGHT;
    if (screenY >= PLOT_TOP - 0.1 && screenY <= CHART_HEIGHT - PLOT_BOTTOM + 0.1) {
      ticks.push({ score: clampedScore, y: screenY, label: formatAxisValue(clampedScore, step) });
    }
  }

  if (!ticks.length) {
    const midpoint = (scoreMinimum + scoreMaximum) / 2;
    const worldY = ((100 - midpoint) / 100) * PLOT_HEIGHT;
    ticks.push({ score: midpoint, y: PLOT_TOP + ((worldY - viewY) / visibleHeight) * PLOT_HEIGHT, label: formatAxisValue(midpoint, step) });
  }

  return ticks;
}

function TrendChart({ points }) {
  const svgRef = useRef(null);
  const clipId = useRef(`health-trend-plot-${Math.random().toString(36).slice(2)}`).current;
  const pointerPositionsRef = useRef(new Map());
  const gestureRef = useRef(null);
  const viewportRef = useRef({ zoom: MIN_ZOOM, centerX: PLOT_WIDTH / 2, centerY: PLOT_HEIGHT / 2 });
  const [viewport, setViewport] = useState(viewportRef.current);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const chart = useMemo(() => {
    const source = Array.isArray(points) ? points : [];
    if (!source.length) return { labels: [] };

    const labels = source.map((item, index) => {
      const x = source.length === 1 ? PLOT_WIDTH / 2 : (PLOT_WIDTH * index) / (source.length - 1);
      const score = clamp(Number(item.average_health_score || 0), 0, 100);
      const y = ((100 - score) / 100) * PLOT_HEIGHT;
      return {
        x,
        y,
        label: displayMonth(item.month),
        fullLabel: displayMonthAndYear(item.month),
        score,
      };
    });

    return { labels };
  }, [points]);

  const updateViewport = useCallback((nextViewport) => {
    const safeViewport = clampViewport(nextViewport);
    viewportRef.current = safeViewport;
    setViewport(safeViewport);
  }, []);

  const getRelativePlotPosition = useCallback((clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    const screenX = ((clientX - rect.left) / rect.width) * CHART_WIDTH;
    const screenY = ((clientY - rect.top) / rect.height) * CHART_HEIGHT;

    return {
      x: clamp((screenX - PLOT_LEFT) / PLOT_WIDTH, 0, 1),
      y: clamp((screenY - PLOT_TOP) / PLOT_HEIGHT, 0, 1),
    };
  }, []);

  const getWorldPositionForViewport = useCallback((clientX, clientY, sourceViewport = viewportRef.current) => {
    const relative = getRelativePlotPosition(clientX, clientY);
    if (!relative) return null;
    const visibleWidth = PLOT_WIDTH / sourceViewport.zoom;
    const visibleHeight = PLOT_HEIGHT / sourceViewport.zoom;

    return {
      x: sourceViewport.centerX - visibleWidth / 2 + relative.x * visibleWidth,
      y: sourceViewport.centerY - visibleHeight / 2 + relative.y * visibleHeight,
      relativeX: relative.x,
      relativeY: relative.y,
    };
  }, [getRelativePlotPosition]);

  const zoomAt = useCallback((targetZoom, clientX, clientY) => {
    const worldPosition = getWorldPositionForViewport(clientX, clientY);
    if (!worldPosition) return;

    const zoom = clamp(targetZoom, MIN_ZOOM, MAX_ZOOM);
    const visibleWidth = PLOT_WIDTH / zoom;
    const visibleHeight = PLOT_HEIGHT / zoom;
    updateViewport({
      zoom,
      centerX: worldPosition.x - (worldPosition.relativeX - 0.5) * visibleWidth,
      centerY: worldPosition.y - (worldPosition.relativeY - 0.5) * visibleHeight,
    });
    setHoveredPoint(null);
  }, [getWorldPositionForViewport, updateViewport]);

  const resetZoom = useCallback(() => {
    pointerPositionsRef.current.clear();
    gestureRef.current = null;
    updateViewport({ zoom: MIN_ZOOM, centerX: PLOT_WIDTH / 2, centerY: PLOT_HEIGHT / 2 });
    setHoveredPoint(null);
  }, [updateViewport]);

  const zoomFromChartCenter = useCallback((factor) => {
    const svg = svgRef.current;
    const rect = svg?.getBoundingClientRect();
    if (!rect?.width || !rect?.height) return;
    zoomAt(viewportRef.current.zoom * factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }, [zoomAt]);

  const pointerEntries = () => Array.from(pointerPositionsRef.current.entries()).slice(0, 2);

  const beginPan = useCallback((pointerId, point) => {
    const startViewport = viewportRef.current;
    gestureRef.current = {
      type: 'pan',
      pointerId,
      startClientX: point.clientX,
      startClientY: point.clientY,
      startViewport,
    };
  }, []);

  const beginPinch = useCallback(() => {
    const entries = pointerEntries();
    if (entries.length < 2) return;
    const [, first] = entries[0];
    const [, second] = entries[1];
    const midpointX = (first.clientX + second.clientX) / 2;
    const midpointY = (first.clientY + second.clientY) / 2;
    const startViewport = viewportRef.current;
    const anchor = getWorldPositionForViewport(midpointX, midpointY, startViewport);
    if (!anchor) return;

    gestureRef.current = {
      type: 'pinch',
      startViewport,
      startDistance: Math.max(Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY), 1),
      anchorWorldX: anchor.x,
      anchorWorldY: anchor.y,
    };
  }, [getWorldPositionForViewport]);

  const handlePointerDown = (event) => {
    pointerPositionsRef.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    event.currentTarget.setPointerCapture?.(event.pointerId);

    if (pointerPositionsRef.current.size === 1) {
      beginPan(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
      return;
    }

    beginPinch();
    event.preventDefault();
  };

  const handlePointerMove = (event) => {
    if (!pointerPositionsRef.current.has(event.pointerId)) return;
    pointerPositionsRef.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });

    if (pointerPositionsRef.current.size >= 2) {
      const gesture = gestureRef.current;
      if (!gesture || gesture.type !== 'pinch') {
        beginPinch();
        return;
      }

      const entries = pointerEntries();
      const [, first] = entries[0];
      const [, second] = entries[1];
      const distance = Math.max(Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY), 1);
      const midpointX = (first.clientX + second.clientX) / 2;
      const midpointY = (first.clientY + second.clientY) / 2;
      const relative = getRelativePlotPosition(midpointX, midpointY);
      if (!relative) return;

      const zoom = clamp(gesture.startViewport.zoom * (distance / gesture.startDistance), MIN_ZOOM, MAX_ZOOM);
      const visibleWidth = PLOT_WIDTH / zoom;
      const visibleHeight = PLOT_HEIGHT / zoom;
      updateViewport({
        zoom,
        centerX: gesture.anchorWorldX - (relative.x - 0.5) * visibleWidth,
        centerY: gesture.anchorWorldY - (relative.y - 0.5) * visibleHeight,
      });
      setHoveredPoint(null);
      event.preventDefault();
      return;
    }

    const gesture = gestureRef.current;
    if (!gesture || gesture.type !== 'pan' || gesture.pointerId !== event.pointerId || gesture.startViewport.zoom <= MIN_ZOOM) return;
    const svg = svgRef.current;
    const rect = svg?.getBoundingClientRect();
    if (!rect?.width || !rect?.height) return;

    const visibleWidth = PLOT_WIDTH / gesture.startViewport.zoom;
    const visibleHeight = PLOT_HEIGHT / gesture.startViewport.zoom;
    const plotPixelWidth = (PLOT_WIDTH / CHART_WIDTH) * rect.width;
    const plotPixelHeight = (PLOT_HEIGHT / CHART_HEIGHT) * rect.height;
    updateViewport({
      zoom: gesture.startViewport.zoom,
      centerX: gesture.startViewport.centerX - ((event.clientX - gesture.startClientX) / plotPixelWidth) * visibleWidth,
      centerY: gesture.startViewport.centerY - ((event.clientY - gesture.startClientY) / plotPixelHeight) * visibleHeight,
    });
    setHoveredPoint(null);
    event.preventDefault();
  };

  const handlePointerEnd = (event) => {
    pointerPositionsRef.current.delete(event.pointerId);
    const remaining = pointerEntries();

    if (remaining.length >= 2) {
      beginPinch();
      return;
    }

    if (remaining.length === 1) {
      const [pointerId, point] = remaining[0];
      beginPan(pointerId, point);
      return;
    }

    gestureRef.current = null;
  };

  const handleDoubleClick = (event) => {
    event.preventDefault();
    if (viewportRef.current.zoom > 1.05) {
      resetZoom();
      return;
    }
    zoomAt(Math.min(viewportRef.current.zoom * 1.8, MAX_ZOOM), event.clientX, event.clientY);
  };

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;

    const handleNativeWheel = (event) => {
      // Trackpad pinch is delivered as Ctrl/Command + wheel by desktop browsers.
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const boundedDelta = clamp(event.deltaY, -120, 120);
      zoomAt(viewportRef.current.zoom * Math.exp(-boundedDelta * 0.0038), event.clientX, event.clientY);
    };

    svg.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleNativeWheel);
  }, [zoomAt]);

  if (!chart.labels?.length) return <div className="dash-chart-empty">No health-score history is available yet.</div>;

  const visibleWidth = PLOT_WIDTH / viewport.zoom;
  const visibleHeight = PLOT_HEIGHT / viewport.zoom;
  const viewX = viewport.centerX - visibleWidth / 2;
  const viewY = viewport.centerY - visibleHeight / 2;
  const isZoomed = viewport.zoom > 1.01;
  const yTicks = buildVisibleYAxisTicks(viewY, visibleHeight);
  const toScreenPoint = (point) => ({
    x: PLOT_LEFT + ((point.x - viewX) / visibleWidth) * PLOT_WIDTH,
    y: PLOT_TOP + ((point.y - viewY) / visibleHeight) * PLOT_HEIGHT,
  });
  const renderedPoints = chart.labels.map((item) => ({ ...item, ...toScreenPoint(item) }));
  const trendPath = renderedPoints.map((item) => `${item.x},${item.y}`).join(' ');
  const activePoint = hoveredPoint ? renderedPoints.find((item) => item.fullLabel === hoveredPoint.fullLabel) : null;
  const tooltipPosition = activePoint ? { left: `${(activePoint.x / CHART_WIDTH) * 100}%`, top: `${(activePoint.y / CHART_HEIGHT) * 100}%` } : null;
  const tooltipPlacement = activePoint
    ? `${activePoint.x > CHART_WIDTH * 0.8 ? 'align-right' : activePoint.x < CHART_WIDTH * 0.2 ? 'align-left' : ''} ${activePoint.y < CHART_HEIGHT * 0.22 ? 'place-below' : ''}`
    : '';

  return (
    <div className={`dash-chart-wrap ${isZoomed ? 'is-zoomed' : ''}`} onMouseLeave={() => setHoveredPoint(null)}>
      <svg
        ref={svgRef}
        className="dash-health-svg is-interactive"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label="Interactive health score trend. Pinch or Ctrl/Command-scroll to zoom. Drag after zooming to pan."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onLostPointerCapture={handlePointerEnd}
        onDoubleClick={handleDoubleClick}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={PLOT_LEFT} y={PLOT_TOP} width={PLOT_WIDTH} height={PLOT_HEIGHT} />
          </clipPath>
        </defs>

        {yTicks.map((tick) => (
          <g key={`${tick.score}-${tick.y}`}>
            <line x1={PLOT_LEFT} x2={CHART_WIDTH - PLOT_RIGHT} y1={tick.y} y2={tick.y} className="dash-grid-line" />
            <text x={PLOT_LEFT - 7} y={tick.y + 4} textAnchor="end" className="dash-y-label">{tick.label}</text>
          </g>
        ))}

        <g clipPath={`url(#${clipId})`}>
          <polyline points={trendPath} className={`dash-trend-line ${hoveredPoint ? 'is-hovered' : ''}`} vectorEffect="non-scaling-stroke" />
          {renderedPoints.map((item) => {
            const isActive = hoveredPoint?.fullLabel === item.fullLabel;
            return (
              <circle
                key={`${item.fullLabel}-${item.x}`}
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
            );
          })}
        </g>

        {renderedPoints.map((item) => (
          item.x >= PLOT_LEFT - 10 && item.x <= CHART_WIDTH - PLOT_RIGHT + 10 ? (
            <text key={`label-${item.fullLabel}`} x={item.x} y={CHART_HEIGHT - 8} textAnchor="middle" className="dash-x-label">{item.label}</text>
          ) : null
        ))}
      </svg>

      <div className="dash-chart-zoom-controls" role="group" aria-label="Health trend chart controls">
        <button type="button" onClick={() => zoomFromChartCenter(1 / 1.35)} disabled={!isZoomed} aria-label="Zoom out">−</button>
        <button type="button" onClick={() => zoomFromChartCenter(1.35)} disabled={viewport.zoom >= MAX_ZOOM} aria-label="Zoom in">+</button>
        {isZoomed ? <button type="button" className="dash-chart-reset-button" onClick={resetZoom}>Reset</button> : null}
      </div>

      {hoveredPoint && activePoint ? (
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
            <span className="dash-chart-gesture-hint">Pinch / Ctrl + scroll to zoom · Scale adjusts automatically</span>
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
