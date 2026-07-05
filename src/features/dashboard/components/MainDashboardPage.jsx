import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CustomerGraphAppShell, { Icon } from '../../layout/components/CustomerGraphAppShell.jsx';
import { getCustomerGraphSession, navigateTo } from '../../auth/logic/authService.js';
import { analyseDashboardWidget } from '../../ai/logic/aiAnalysisService.js';
import { useDashboardSummary } from '../logic/useDashboardSummary.js';
import './MainDashboardPage.css';

const CHART_WIDTH = 410;
const CHART_HEIGHT = 220;
const PLOT_LEFT = 34;
const PLOT_RIGHT = 14;
const PLOT_TOP = 12;
const PLOT_BOTTOM = 44;
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

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function buildDataViewportBounds(labels) {
  const yValues = labels.filter((item) => item.hasScore).map((item) => item.y);

  if (!yValues.length) {
    return {
      focusMinY: 0,
      focusMaxY: PLOT_HEIGHT,
      centerY: PLOT_HEIGHT / 2,
      maxZoom: MIN_ZOOM,
    };
  }

  const minimumY = Math.min(...yValues);
  const maximumY = Math.max(...yValues);
  const scoreRange = Math.abs(((maximumY - minimumY) / PLOT_HEIGHT) * 100);

  // Keep breathing room above and below the real backend points. The maximum
  // zoom is calculated from this protected range, so dots can grow but cannot
  // be pushed outside of the graph frame.
  const scorePadding = clamp(Math.max(4, scoreRange * 0.35), 4, 12);
  const paddingY = (scorePadding / 100) * PLOT_HEIGHT;
  const focusMinY = clamp(minimumY - paddingY, 0, PLOT_HEIGHT);
  const focusMaxY = clamp(maximumY + paddingY, 0, PLOT_HEIGHT);
  const focusHeight = Math.max(focusMaxY - focusMinY, 1);

  return {
    focusMinY,
    focusMaxY,
    centerY: (focusMinY + focusMaxY) / 2,
    maxZoom: clamp(Math.min(MAX_ZOOM, PLOT_HEIGHT / focusHeight), MIN_ZOOM, MAX_ZOOM),
  };
}

function clampViewport(nextViewport, dataBounds) {
  const zoom = clamp(nextViewport.zoom, MIN_ZOOM, dataBounds.maxZoom);
  const visibleHeight = PLOT_HEIGHT / zoom;

  // Prevent normal panning from moving the complete protected data range out
  // of view. This is the important guard that keeps the line/dots visible
  // while pinch, wheel and button zoom are used.
  const chartMinimumCenter = visibleHeight / 2;
  const chartMaximumCenter = PLOT_HEIGHT - visibleHeight / 2;
  const dataMinimumCenter = dataBounds.focusMaxY - visibleHeight / 2;
  const dataMaximumCenter = dataBounds.focusMinY + visibleHeight / 2;
  const minimumCenter = Math.max(chartMinimumCenter, dataMinimumCenter);
  const maximumCenter = Math.min(chartMaximumCenter, dataMaximumCenter);
  const requestedCenter = Number.isFinite(nextViewport.centerY) ? nextViewport.centerY : dataBounds.centerY;
  const centerY = minimumCenter <= maximumCenter
    ? clamp(requestedCenter, minimumCenter, maximumCenter)
    : clamp(dataBounds.centerY, chartMinimumCenter, chartMaximumCenter);

  return {
    zoom,
    // Keep the time axis fixed. A six-month trend is easier to read when every
    // month remains visible while zoom changes only the health-score scale.
    centerX: PLOT_WIDTH / 2,
    centerY,
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

function smoothPath(pts) {
  if (pts.length < 2) return '';
  if (pts.length === 2) return `M ${pts[0].x},${pts[0].y} L ${pts[1].x},${pts[1].y}`;

  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

function buildSixMonthSlots(source) {
  let anchorYear;
  let anchorMonth;

  if (source.length) {
    const [year, month] = String(source[source.length - 1].month || '').split('-');
    anchorYear = Number(year);
    anchorMonth = Number(month) - 1;
  }
  if (!Number.isFinite(anchorYear) || !Number.isFinite(anchorMonth)) {
    const now = new Date();
    anchorYear = now.getFullYear();
    anchorMonth = now.getMonth();
  }

  const slots = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(anchorYear, anchorMonth - offset, 1);
    slots.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      date,
    });
  }
  return slots;
}

function TrendChart({ points }) {
  const svgRef = useRef(null);
  const clipId = useRef(`health-trend-plot-${Math.random().toString(36).slice(2)}`).current;
  const gradientId = useRef(`health-trend-fill-${Math.random().toString(36).slice(2)}`).current;
  const pointerPositionsRef = useRef(new Map());
  const gestureRef = useRef(null);
  const viewportRef = useRef({ zoom: MIN_ZOOM, centerX: PLOT_WIDTH / 2, centerY: PLOT_HEIGHT / 2 });
  const [viewport, setViewport] = useState(viewportRef.current);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const chart = useMemo(() => {
    const source = Array.isArray(points) ? points : [];
    const slots = buildSixMonthSlots(source);
    const bySlot = new Map(source.map((item) => [String(item.month), item]));

    const labels = slots.map((slot, index) => {
      const match = bySlot.get(slot.key);
      const x = (PLOT_WIDTH * index) / (slots.length - 1);
      const hasScore = Boolean(match);
      const score = hasScore ? clamp(Number(match.average_health_score || 0), 0, 100) : null;
      const y = hasScore ? ((100 - score) / 100) * PLOT_HEIGHT : null;
      return {
        x,
        y,
        hasScore,
        label: new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(slot.date),
        fullLabel: new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(slot.date),
        score,
      };
    });

    return { labels };
  }, [points]);

  const dataViewportBounds = useMemo(() => buildDataViewportBounds(chart.labels), [chart.labels]);

  const updateViewport = useCallback((nextViewport) => {
    const safeViewport = clampViewport(nextViewport, dataViewportBounds);
    viewportRef.current = safeViewport;
    setViewport(safeViewport);
  }, [dataViewportBounds]);

  // A dashboard refresh can change the underlying Neo4j values. Keep an
  // existing zoom level where possible, but recenter safely around the latest
  // returned points so an old viewport never leaves the refreshed line hidden.
  useEffect(() => {
    const currentViewport = viewportRef.current;
    const nextZoom = Math.min(currentViewport.zoom, dataViewportBounds.maxZoom);
    const nextCenterY = nextZoom > MIN_ZOOM + 0.01 ? dataViewportBounds.centerY : PLOT_HEIGHT / 2;
    const safeViewport = clampViewport({
      zoom: nextZoom,
      centerX: PLOT_WIDTH / 2,
      centerY: nextCenterY,
    }, dataViewportBounds);

    viewportRef.current = safeViewport;
    setViewport((previousViewport) => (
      previousViewport.zoom === safeViewport.zoom && previousViewport.centerY === safeViewport.centerY
        ? previousViewport
        : safeViewport
    ));
  }, [dataViewportBounds]);

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
    const visibleWidth = PLOT_WIDTH;
    const visibleHeight = PLOT_HEIGHT / sourceViewport.zoom;

    return {
      x: PLOT_WIDTH / 2 - visibleWidth / 2 + relative.x * visibleWidth,
      y: sourceViewport.centerY - visibleHeight / 2 + relative.y * visibleHeight,
      relativeX: relative.x,
      relativeY: relative.y,
    };
  }, [getRelativePlotPosition]);

  const zoomAt = useCallback((targetZoom, clientX, clientY) => {
    const worldPosition = getWorldPositionForViewport(clientX, clientY);
    if (!worldPosition) return;

    const zoom = clamp(targetZoom, MIN_ZOOM, MAX_ZOOM);
    const visibleHeight = PLOT_HEIGHT / zoom;
    updateViewport({
      zoom,
      centerX: PLOT_WIDTH / 2,
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

  const zoomBy = useCallback((factor) => {
    const currentViewport = viewportRef.current;
    updateViewport({
      zoom: currentViewport.zoom * factor,
      centerX: PLOT_WIDTH / 2,
      // Button zoom deliberately centres on the real backend data. That makes
      // the line visibly expand instead of zooming into empty chart space.
      centerY: dataViewportBounds.centerY,
    });
    setHoveredPoint(null);
  }, [dataViewportBounds, updateViewport]);

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
      const visibleHeight = PLOT_HEIGHT / zoom;
      updateViewport({
        zoom,
        centerX: PLOT_WIDTH / 2,
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

    const visibleHeight = PLOT_HEIGHT / gesture.startViewport.zoom;
    const plotPixelHeight = (PLOT_HEIGHT / CHART_HEIGHT) * rect.height;
    updateViewport({
      zoom: gesture.startViewport.zoom,
      centerX: PLOT_WIDTH / 2,
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

  const hasAnyData = chart.labels.some((item) => item.hasScore);
  if (!hasAnyData) return <div className="dash-chart-empty">No health-score history is available yet.</div>;

  const visibleWidth = PLOT_WIDTH;
  const visibleHeight = PLOT_HEIGHT / viewport.zoom;
  const viewX = 0;
  const viewY = viewport.centerY - visibleHeight / 2;
  const isZoomed = viewport.zoom > 1.01;
  const yTicks = buildVisibleYAxisTicks(viewY, visibleHeight);
  const toScreenX = (x) => PLOT_LEFT + ((x - viewX) / visibleWidth) * PLOT_WIDTH;
  const toScreenY = (y) => PLOT_TOP + ((y - viewY) / visibleHeight) * PLOT_HEIGHT;
  const renderedPoints = chart.labels.map((item) => ({
    ...item,
    x: toScreenX(item.x),
    y: item.hasScore ? toScreenY(item.y) : null,
  }));
  const baselineY = CHART_HEIGHT - PLOT_BOTTOM;
  const segments = [];
  let currentSegment = [];
  renderedPoints.forEach((item) => {
    if (item.hasScore) {
      currentSegment.push(item);
    } else if (currentSegment.length) {
      segments.push(currentSegment);
      currentSegment = [];
    }
  });
  if (currentSegment.length) segments.push(currentSegment);

  const linePath = segments.filter((segment) => segment.length >= 2).map((segment) => smoothPath(segment)).join(' ');
  const areaPath = segments
    .filter((segment) => segment.length >= 2)
    .map((segment) => `${smoothPath(segment)} L ${segment[segment.length - 1].x},${baselineY} L ${segment[0].x},${baselineY} Z`)
    .join(' ');
  const plottedPoints = renderedPoints.filter((item) => item.hasScore);
  const activePoint = hoveredPoint ? plottedPoints.find((item) => item.fullLabel === hoveredPoint.fullLabel) : null;
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
        aria-label="Interactive health score trend. Pinch or Ctrl/Command-scroll to zoom the score scale. Drag vertically after zooming to adjust the visible score range."
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
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2f6df2" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#2f6df2" stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => (
          <g key={`${tick.score}-${tick.y}`}>
            <line x1={PLOT_LEFT} x2={CHART_WIDTH - PLOT_RIGHT} y1={tick.y} y2={tick.y} className="dash-grid-line" />
            <text x={PLOT_LEFT - 7} y={tick.y + 3} textAnchor="end" className="dash-y-label">{tick.label}</text>
          </g>
        ))}
        <line x1={PLOT_LEFT} x2={CHART_WIDTH - PLOT_RIGHT} y1={CHART_HEIGHT - PLOT_BOTTOM} y2={CHART_HEIGHT - PLOT_BOTTOM} className="dash-axis-baseline" />

        <g clipPath={`url(#${clipId})`}>
          <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
          <path d={linePath} className={`dash-trend-line ${hoveredPoint ? 'is-hovered' : ''}`} fill="none" vectorEffect="non-scaling-stroke" />
          {plottedPoints.map((item) => {
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

      </svg>

      {/* Keep the month labels outside the SVG clipping area. This guarantees
          that all six labels remain visible on desktop and mobile layouts. */}
      <div className="dash-chart-x-axis" aria-label="Health-score trend months">
        {chart.labels.map((item) => (
          <span key={`label-${item.fullLabel}`} title={item.fullLabel}>{item.label}</span>
        ))}
      </div>

      <div className="dash-chart-toolbar" role="group" aria-label="Health-score chart zoom controls">
        <button
          className="dash-chart-toolbutton"
          type="button"
          onClick={() => zoomBy(1 / 1.35)}
          disabled={viewport.zoom <= MIN_ZOOM + 0.01}
          aria-label="Zoom out health-score scale"
          title="Zoom out"
        >
          −
        </button>
        <button
          className="dash-chart-toolbutton"
          type="button"
          onClick={() => zoomBy(1.35)}
          disabled={viewport.zoom >= dataViewportBounds.maxZoom - 0.01}
          aria-label="Zoom in health-score scale"
          title="Zoom in"
        >
          +
        </button>
        <button
          className="dash-chart-toolbutton dash-chart-reset-button"
          type="button"
          onClick={resetZoom}
          disabled={!isZoomed}
          aria-label="Reset health-score chart zoom"
          title="Reset zoom"
        >
          Reset
        </button>
      </div>

      {isZoomed ? (
        <div className="dash-chart-zoom-badge" role="status" aria-live="polite">
          {viewport.zoom.toFixed(1)}× <span>· data stays visible</span>
        </div>
      ) : null}

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


const DASHBOARD_AI_WIDGETS = {
  total_customers: {
    title: 'Customer base overview',
    eyebrow: 'TOTAL CUSTOMERS',
    loading: 'Reviewing active customer coverage and portfolio concentration.',
  },
  high_risk_customers: {
    title: 'High-risk customer review',
    eyebrow: 'HIGH-RISK CUSTOMERS',
    loading: 'Reviewing current risk signals and the accounts that need attention.',
  },
  upcoming_renewals: {
    title: 'Upcoming renewal review',
    eyebrow: 'UPCOMING RENEWALS',
    loading: 'Reviewing renewals due in the next 30 days and their risk context.',
  },
  open_critical_tickets: {
    title: 'Critical support review',
    eyebrow: 'OPEN CRITICAL TICKETS',
    loading: 'Reviewing open critical support signals and affected accounts.',
  },
  delayed_invoices: {
    title: 'Delayed invoice review',
    eyebrow: 'DELAYED INVOICES',
    loading: 'Reviewing overdue billing signals and the accounts requiring follow-up.',
  },
  upsell_opportunities: {
    title: 'Upsell opportunity review',
    eyebrow: 'UPSELL OPPORTUNITIES',
    loading: 'Reviewing open expansion opportunities and their customer context.',
  },
  revenue_at_risk: {
    title: 'Revenue-at-risk review',
    eyebrow: 'REVENUE AT RISK',
    loading: 'Reviewing high-risk revenue exposure and the most urgent account actions.',
  },
  health_score_trend: {
    title: 'Health score trend review',
    eyebrow: 'HEALTH SCORE TREND',
    loading: 'Reviewing the six-month health-score movement and material changes.',
  },
  top_high_risk_customers: {
    title: 'Top high-risk accounts',
    eyebrow: 'TOP 5 HIGH-RISK CUSTOMERS',
    loading: 'Reviewing the five highest-risk customers and their next-best actions.',
  },
};

const WIDGET_PROGRESS_STAGES = [
  'Reading the current dashboard data',
  'Checking the relevant customer signals',
  'Preparing a concise AI brief',
];

function formatAiTimestamp(value) {
  if (!value) return '';
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
}

function widgetStatusLabel(status) {
  const labels = {
    stable: 'Stable',
    attention: 'Needs attention',
    critical: 'Critical',
    opportunity: 'Opportunity',
    info: 'Information',
  };
  return labels[String(status || '').toLowerCase()] || 'AI insight';
}

function AiWidgetProgress({ widget, activeStage }) {
  return (
    <div className="dash-widget-progress" aria-live="polite">
      <div className="dash-widget-progress-heading">
        <span className="dash-widget-spinner" aria-hidden="true" />
        <div>
          <strong>Analysing {widget.title}</strong>
          <p>{widget.loading}</p>
        </div>
      </div>
      <ol className="dash-widget-progress-list">
        {WIDGET_PROGRESS_STAGES.map((stage, index) => {
          const isComplete = index < activeStage;
          const isCurrent = index === activeStage;
          return (
            <li key={stage} className={`${isComplete ? 'is-complete' : ''} ${isCurrent ? 'is-current' : ''}`}>
              <span className="dash-widget-progress-mark" aria-hidden="true">
                {isComplete ? <Icon name="check" size={13} /> : index + 1}
              </span>
              <span>{stage}</span>
              {isCurrent ? <em>In progress</em> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function AiWidgetDrawer({
  widget,
  result,
  error,
  isAnalysing,
  activeStage,
  onClose,
  onAnalyseAgain,
}) {
  if (!widget) return null;

  return (
    <div className="dash-widget-layer" role="presentation">
      <button type="button" className="dash-widget-backdrop" onClick={onClose} aria-label="Close AI insight" />
      <aside className="dash-widget-drawer" role="dialog" aria-modal="true" aria-labelledby="dashboard-ai-widget-title">
        <header className="dash-widget-drawer-header">
          <div className="dash-widget-drawer-title">
            <span><Icon name="sparkles" size={17} /></span>
            <div>
              <p>{widget.eyebrow}</p>
              <h3 id="dashboard-ai-widget-title">{widget.title}</h3>
            </div>
          </div>
          <button type="button" className="dash-widget-close" onClick={onClose} aria-label="Close AI insight">
            <Icon name="close" size={17} />
          </button>
        </header>

        {isAnalysing ? <AiWidgetProgress widget={widget} activeStage={activeStage} /> : null}

        {!isAnalysing && error ? (
          <div className="dash-widget-error" role="alert">
            <strong>Analysis was not completed.</strong>
            <span>{error}</span>
            <button type="button" onClick={onAnalyseAgain}>Try again</button>
          </div>
        ) : null}

        {!isAnalysing && !error && result ? (
          <div className="dash-widget-result">
            <div className="dash-widget-result-topline">
              <span className={`dash-widget-status ${String(result.status || 'info').toLowerCase()}`}>
                <span aria-hidden="true" />
                {widgetStatusLabel(result.status)}
              </span>
              {result.generated_at ? <small>Analysed {formatAiTimestamp(result.generated_at)}</small> : null}
            </div>

            <section className="dash-widget-result-section">
              <h4>AI brief</h4>
              <p>{result.summary || 'No AI summary was returned for this dashboard area.'}</p>
            </section>

            {Array.isArray(result.evidence) && result.evidence.length ? (
              <section className="dash-widget-result-section">
                <h4>Based on current data</h4>
                <ul className="dash-widget-evidence-list">
                  {result.evidence.slice(0, 3).map((item, index) => (
                    <li key={`${item}-${index}`}><Icon name="check" size={14} /><span>{item}</span></li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="dash-widget-next-action">
              <span><Icon name="sparkles" size={15} /></span>
              <div>
                <h4>Recommended next step</h4>
                <p>{result.recommended_action || 'Review this dashboard area with the responsible owner.'}</p>
              </div>
            </section>

            <footer className="dash-widget-result-footer">
              <button type="button" className="dash-widget-analyse-again" onClick={onAnalyseAgain}>
                <Icon name="sparkles" size={14} />
                <span>Analyse again</span>
              </button>
              <small>AI guidance requires human review before action.</small>
            </footer>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function AiWidgetTrigger({ section, label, onClick, disabled, compact = false }) {
  return (
    <button
      type="button"
      className={`dash-widget-trigger ${compact ? 'is-compact' : ''}`}
      onClick={() => onClick(section)}
      disabled={disabled}
      aria-label={`Analyse ${label} with AI`}
      title={`Analyse ${label} with AI`}
    >
      <Icon name="sparkles" size={compact ? 15 : 16} />
    </button>
  );
}

export default function MainDashboardPage() {
  const { summary, isLoading, error, refresh } = useDashboardSummary();
  const session = getCustomerGraphSession();
  const canAnalyseWidgets = session?.role === 'admin';
  const [activeWidgetSection, setActiveWidgetSection] = useState(null);
  const [widgetResults, setWidgetResults] = useState({});
  const [widgetError, setWidgetError] = useState('');
  const [isWidgetAnalysing, setIsWidgetAnalysing] = useState(false);
  const [widgetAnalysisStage, setWidgetAnalysisStage] = useState(0);
  const stageTimersRef = useRef([]);

  const clearStageTimers = useCallback(() => {
    stageTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    stageTimersRef.current = [];
  }, []);

  useEffect(() => () => clearStageTimers(), [clearStageTimers]);

  const startWidgetAnalysis = useCallback(async (section) => {
    if (!canAnalyseWidgets || isWidgetAnalysing || !DASHBOARD_AI_WIDGETS[section]) return;
    clearStageTimers();
    setActiveWidgetSection(section);
    setWidgetError('');
    setIsWidgetAnalysing(true);
    setWidgetAnalysisStage(0);
    stageTimersRef.current = [
      window.setTimeout(() => setWidgetAnalysisStage(1), 650),
      window.setTimeout(() => setWidgetAnalysisStage(2), 1500),
    ];

    try {
      const result = await analyseDashboardWidget(section);
      setWidgetResults((previous) => ({ ...previous, [section]: result }));
      setWidgetAnalysisStage(WIDGET_PROGRESS_STAGES.length);
    } catch (requestError) {
      setWidgetError(requestError.message || 'This AI analysis could not be completed.');
    } finally {
      clearStageTimers();
      setIsWidgetAnalysing(false);
    }
  }, [canAnalyseWidgets, clearStageTimers, isWidgetAnalysing]);

  const closeWidgetDrawer = useCallback(() => {
    if (isWidgetAnalysing) return;
    setActiveWidgetSection(null);
    setWidgetError('');
  }, [isWidgetAnalysing]);

  const activeWidget = activeWidgetSection ? DASHBOARD_AI_WIDGETS[activeWidgetSection] : null;
  const activeWidgetResult = activeWidgetSection ? widgetResults[activeWidgetSection] : null;

  const metricCards = [
    { key: 'customers', section: 'total_customers', label: 'Total Customers', value: number(summary.total_customers), note: 'All active customers', icon: 'customers', tone: 'green', to: '/customers' },
    { key: 'risk', section: 'high_risk_customers', label: 'High Risk Customers', value: number(summary.high_risk_customers), note: 'Needs attention', icon: 'risk', tone: 'red', to: '/customers?risk_level=high' },
    { key: 'renewals', section: 'upcoming_renewals', label: 'Upcoming Renewals', value: number(summary.upcoming_renewals_next_30_days), note: 'Next 30 days', icon: 'approvals', tone: 'blue', to: '/customers?renewal_within_days=30' },
    { key: 'tickets', section: 'open_critical_tickets', label: 'Open Critical Tickets', value: number(summary.open_critical_tickets), note: 'Open right now', icon: 'support', tone: 'red', to: '/customers' },
    { key: 'invoices', section: 'delayed_invoices', label: 'Delayed Invoices', value: number(summary.delayed_invoices_count), note: inr(summary.delayed_invoices_amount), icon: 'billing', tone: 'blue', to: '/customers' },
    { key: 'upsell', section: 'upsell_opportunities', label: 'Upsell Opportunities', value: number(summary.upsell_opportunities_count), note: inr(summary.upsell_potential_revenue), icon: 'opportunities', tone: 'green', to: '/customers' },
    { key: 'revenue', section: 'revenue_at_risk', label: 'Revenue at Risk', value: inr(summary.revenue_at_risk), note: 'High + critical portfolio', icon: 'risk', tone: 'ink', to: '/customers?risk_level=high', wide: true },
  ];

  return (
    <CustomerGraphAppShell activeNav="dashboard" contentMode="scrollable">
      <section className="dash-page-head">
        <div>
          <p className="dash-eyebrow">PORTFOLIO OVERVIEW</p>
          <h2>Customer health at a glance</h2>
          <p>Live business intelligence from the connected customer graph.</p>
        </div>
        <div className="dash-head-actions">
          <button className="dash-refresh-button" type="button" onClick={refresh} disabled={isLoading}>{isLoading ? 'Loading…' : '↻ Refresh'}</button>
        </div>
      </section>
      {error ? <div className="dash-feedback error">{error}</div> : null}

      <section className={`dash-metrics ${isLoading ? 'is-loading' : ''}`} aria-label="Main dashboard metrics">
        {metricCards.map((card) => (
          <article key={card.key} className={`dash-metric-card ${card.tone} ${card.wide ? 'wide' : ''}`}>
            <button type="button" className="dash-metric-main" onClick={() => navigateTo(card.to)}>
              <span className="dash-metric-icon"><Icon name={card.icon} size={16} /></span>
              <span className="dash-metric-label">{card.label}</span>
              <strong>{isLoading ? '—' : card.value}</strong>
              <small>{card.note}</small>
            </button>
            {canAnalyseWidgets ? (
              <AiWidgetTrigger section={card.section} label={card.label} onClick={startWidgetAnalysis} disabled={isWidgetAnalysing} />
            ) : null}
          </article>
        ))}
      </section>

      <section className="dash-bottom-grid">
        <article className="dash-panel dash-chart-panel">
          <header>
            <div className="dash-panel-heading">
              <h3>Health Score Trend <span>(Last 6 Months)</span></h3>
              <div className="dash-panel-tools">
                <span className="dash-chart-gesture-hint">Pinch / Ctrl + scroll to zoom · Months stay visible</span>
                {canAnalyseWidgets ? <AiWidgetTrigger compact section="health_score_trend" label="Health Score Trend" onClick={startWidgetAnalysis} disabled={isWidgetAnalysing} /> : null}
              </div>
            </div>
          </header>
          {isLoading ? <p className="dash-chart-empty">Loading health score trend…</p> : <TrendChart points={summary.health_score_trend} />}
        </article>

        <article className="dash-panel dash-risk-panel">
          <header>
            <div className="dash-panel-heading">
              <h3>Top 5 High-Risk Customers</h3>
              {canAnalyseWidgets ? <AiWidgetTrigger compact section="top_high_risk_customers" label="Top 5 High-Risk Customers" onClick={startWidgetAnalysis} disabled={isWidgetAnalysing} /> : null}
            </div>
          </header>
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

      <AiWidgetDrawer
        widget={activeWidget}
        result={activeWidgetResult}
        error={widgetError}
        isAnalysing={isWidgetAnalysing}
        activeStage={widgetAnalysisStage}
        onClose={closeWidgetDrawer}
        onAnalyseAgain={() => activeWidgetSection && startWidgetAnalysis(activeWidgetSection)}
      />
    </CustomerGraphAppShell>
  );
}
