import React, { useState, useEffect } from 'react';
import {
  LineChart as ChartIcon,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart2,
  Calendar,
  Sparkles,
  Info,
  Download,
  GitCompare,
  Layers,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { fetchMarketTrends } from '../services/api';

export default function MarketTrendsView({ t }) {
  const [crop, setCrop] = useState('CROP_TOMATO');
  const [variety, setVariety] = useState('VAR_TOM_HYBRID');
  const [mandi, setMandi] = useState('MND_HASSAN');
  const [compareMandi, setCompareMandi] = useState('');
  const [aggregation, setAggregation] = useState('daily');
  const [timeframe, setTimeframe] = useState('3months');

  const [trendData, setTrendData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  useEffect(() => {
    loadTrends();
  }, [crop, variety, mandi, compareMandi, aggregation, timeframe]);

  async function loadTrends() {
    setLoading(true);
    try {
      const data = await fetchMarketTrends(
        crop,
        variety,
        mandi,
        compareMandi || undefined,
        aggregation,
        timeframe
      );
      setTrendData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const chartPoints = trendData?.chart_data || [];
  const trendSignal = trendData?.trend_signal || {};

  // Export chart data as CSV
  const handleExportCsv = () => {
    if (!chartPoints.length) return;
    const headers = ['Date', 'Primary Modal Price (INR/q)', 'Min Price (INR/q)', 'Max Price (INR/q)', 'Arrivals (Tonnes)'];
    if (compareMandi) {
      headers.push(`Compare Mandi Price (${trendData?.compare_mandi_name || 'Compare'} INR/q)`);
    }

    const rows = chartPoints.map((p) => {
      const row = [p.date, p.modal_price, p.min_price || '', p.max_price || '', p.arrivals_tonnes || 0];
      if (compareMandi) {
        row.push(p.compare_modal_price ?? '');
      }
      return row.join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `farmprice_trends_${crop}_${aggregation}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // SVG Chart Geometry
  const svgWidth = 660;
  const svgHeight = 270;
  const padding = { top: 30, right: 60, bottom: 40, left: 60 };

  // Price scale (Left Y-axis)
  const allPrices = chartPoints.flatMap((p) => [
    p.modal_price,
    p.min_price,
    p.max_price,
    p.compare_modal_price
  ]).filter((v) => v !== null && v !== undefined && !isNaN(v));

  const rawMinPrice = allPrices.length ? Math.min(...allPrices) : 1000;
  const rawMaxPrice = allPrices.length ? Math.max(...allPrices) : 3000;
  const minPrice = Math.max(0, Math.floor(rawMinPrice * 0.85 / 100) * 100);
  const maxPrice = Math.ceil(rawMaxPrice * 1.15 / 100) * 100 || 3000;

  // Arrival scale (Right Y-axis)
  const allArrivals = chartPoints.map((p) => p.arrivals_tonnes || 0);
  const maxArrival = Math.max(100, Math.ceil((Math.max(...allArrivals, 50) * 1.25) / 50) * 50);
  const minArrival = 0;

  const getX = (idx) => {
    if (chartPoints.length <= 1) return padding.left;
    const innerW = svgWidth - padding.left - padding.right;
    return padding.left + (idx / (chartPoints.length - 1)) * innerW;
  };

  const getYPrice = (val) => {
    if (val === null || val === undefined || isNaN(val)) return 0;
    const innerH = svgHeight - padding.top - padding.bottom;
    const norm = (val - minPrice) / (maxPrice - minPrice || 1);
    return svgHeight - padding.bottom - norm * innerH;
  };

  const getYArrival = (val) => {
    const innerH = svgHeight - padding.top - padding.bottom;
    const norm = (val - minArrival) / (maxArrival - minArrival || 1);
    return svgHeight - padding.bottom - norm * innerH;
  };

  // Price paths
  const pricePath = chartPoints.length > 1
    ? chartPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getYPrice(p.modal_price)}`).join(' ')
    : '';

  // Min and Max dashed lines
  const minPricePath = chartPoints.length > 1
    ? chartPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getYPrice(p.min_price || p.modal_price)}`).join(' ')
    : '';

  const maxPricePath = chartPoints.length > 1
    ? chartPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getYPrice(p.max_price || p.modal_price)}`).join(' ')
    : '';

  // Compare mandi line path
  const comparePoints = chartPoints.filter((p) => p.compare_modal_price !== null && p.compare_modal_price !== undefined);
  const comparePath = comparePoints.length > 1
    ? chartPoints
        .map((p, idx) => {
          if (p.compare_modal_price === null || p.compare_modal_price === undefined) return null;
          return `${idx === 0 || !chartPoints[idx - 1]?.compare_modal_price ? 'M' : 'L'} ${getX(idx)} ${getYPrice(p.compare_modal_price)}`;
        })
        .filter(Boolean)
        .join(' ')
    : '';

  // Price steps for Y-axis (4 intervals)
  const priceSteps = [0, 0.33, 0.66, 1].map((pct) => Math.round(minPrice + pct * (maxPrice - minPrice)));
  const arrivalSteps = [0, 0.33, 0.66, 1].map((pct) => Math.round(minArrival + pct * (maxArrival - minArrival)));

  // Trend Badge styling
  const classification = trendSignal?.classification || 'INCONCLUSIVE';
  const getTrendBadge = (cls) => {
    switch (cls) {
      case 'RISING':
        return {
          icon: TrendingUp,
          bg: '#E6F7F0',
          color: '#059669',
          border: '#A7F3D0',
          label: 'RISING TREND'
        };
      case 'FALLING':
        return {
          icon: TrendingDown,
          bg: '#FEE2E2',
          color: '#DC2626',
          border: '#FECACA',
          label: 'FALLING TREND'
        };
      case 'STABLE':
        return {
          icon: Minus,
          bg: '#EFF6FF',
          color: '#2563EB',
          border: '#BFDBFE',
          label: 'STABLE MARKET'
        };
      default:
        return {
          icon: AlertTriangle,
          bg: '#F3F4F6',
          color: '#6B7280',
          border: '#E5E7EB',
          label: 'INSUFFICIENT HISTORY'
        };
    }
  };

  const badge = getTrendBadge(classification);
  const BadgeIcon = badge.icon;

  return (
    <div>
      {/* Top Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#113826', margin: 0 }}>
            {t.trends?.title || 'Historical Price Charts & Trend Intelligence'}
          </h2>
          <p style={{ fontSize: 13, color: '#5A6A60', marginTop: 4 }}>
            Aggregated auction records from verified APMC market registers.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleExportCsv}
            disabled={!chartPoints.length}
            className="filter-select"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: chartPoints.length ? 'pointer' : 'not-allowed',
              backgroundColor: '#FFFFFF',
              borderColor: '#113826',
              color: '#113826',
              fontWeight: 600
            }}
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="filter-bar" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div className="filter-group">
          <label className="filter-label">Crop</label>
          <select
            className="filter-select"
            value={crop}
            onChange={(e) => setCrop(e.target.value)}
          >
            <option value="CROP_TOMATO">Tomato</option>
            <option value="CROP_ONION">Onion</option>
            <option value="CROP_POTATO">Potato</option>
            <option value="CROP_CHILLI">Green Chilli</option>
            <option value="CROP_GINGER">Ginger</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Variety</label>
          <select
            className="filter-select"
            value={variety}
            onChange={(e) => setVariety(e.target.value)}
          >
            <option value="VAR_TOM_HYBRID">Hybrid</option>
            <option value="VAR_TOM_LOCAL">Local</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Primary Mandi</label>
          <select
            className="filter-select"
            value={mandi}
            onChange={(e) => setMandi(e.target.value)}
          >
            <option value="MND_HASSAN">Hassan APMC</option>
            <option value="MND_CRPATNA">Channarayapatna</option>
            <option value="MND_MYSORE">Mysore Mandi</option>
            <option value="MND_BANGALORE">Bangalore APMC</option>
            <option value="MND_KOLAR">Kolar APMC</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Compare With (Optional)</label>
          <select
            className="filter-select"
            value={compareMandi}
            onChange={(e) => setCompareMandi(e.target.value)}
          >
            <option value="">-- None --</option>
            <option value="MND_MYSORE">Mysore Mandi</option>
            <option value="MND_CRPATNA">Channarayapatna</option>
            <option value="MND_BANGALORE">Bangalore APMC</option>
            <option value="MND_KOLAR">Kolar APMC</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Timeframe</label>
          <select
            className="filter-select"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
          >
            <option value="1month">Last 1 Month</option>
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="1year">Last 1 Year</option>
          </select>
        </div>
      </div>

      {/* Feature 2: Aggregation Selector (Daily / Weekly / Monthly) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`pill-btn ${aggregation === 'daily' ? 'active' : ''}`}
            onClick={() => setAggregation('daily')}
          >
            Daily Observations
          </button>
          <button
            className={`pill-btn ${aggregation === 'weekly' ? 'active' : ''}`}
            onClick={() => setAggregation('weekly')}
          >
            Weekly Aggregation
          </button>
          <button
            className={`pill-btn ${aggregation === 'monthly' ? 'active' : ''}`}
            onClick={() => setAggregation('monthly')}
          >
            Monthly Aggregation
          </button>
        </div>

        {/* Aggregation rule badge */}
        <div style={{ fontSize: 12, color: '#5A6A60', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Info size={14} color="#059669" />
          <span>{trendData?.aggregation_rule_note || 'Documented mathematical median rules applied.'}</span>
        </div>
      </div>

      {/* Feature 3: Trend Detection Signal Card */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
          marginBottom: 20,
          padding: '16px 20px',
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #DDE5E0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        {/* Signal Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: badge.bg,
              border: `1px solid ${badge.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: badge.color
            }}
          >
            <BadgeIcon size={24} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#5A6A60', textTransform: 'uppercase' }}>
              Trend Classification
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: badge.color }}>
              {badge.label}
            </div>
          </div>
        </div>

        {/* SMA 7 vs SMA 21 */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#5A6A60', textTransform: 'uppercase' }}>
            Moving Averages (7D vs 21D)
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1A241F', marginTop: 2 }}>
            ₹{trendSignal?.sma_7 ? trendSignal.sma_7.toLocaleString() : '—'}/q{' '}
            <span style={{ fontSize: 12, fontWeight: 500, color: '#5A6A60' }}>
              vs ₹{trendSignal?.sma_21 ? trendSignal.sma_21.toLocaleString() : '—'}/q
            </span>
          </div>
          <div style={{ fontSize: 11, color: '#5A6A60' }}>
            Short-term vs long-term baseline
          </div>
        </div>

        {/* Momentum & Volatility */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#5A6A60', textTransform: 'uppercase' }}>
            Momentum & Volatility
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: trendSignal?.momentum_pct >= 0 ? '#059669' : '#DC2626', marginTop: 2 }}>
            {trendSignal?.momentum_pct !== undefined ? `${trendSignal.momentum_pct > 0 ? '+' : ''}${trendSignal.momentum_pct}%` : '—'}
            <span style={{ fontSize: 12, fontWeight: 500, color: '#5A6A60', marginLeft: 8 }}>
              CV: {trendSignal?.volatility_cv !== undefined ? `${trendSignal.volatility_cv}%` : '—'}
            </span>
          </div>
          <div style={{ fontSize: 11, color: '#5A6A60' }}>
            {trendSignal?.supporting_evidence?.days_evaluated || 0} observations evaluated
          </div>
        </div>

        {/* Period Change */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#5A6A60', textTransform: 'uppercase' }}>
            Period Price Delta
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: (trendData?.period_change_pct || 0) >= 0 ? '#059669' : '#DC2626', marginTop: 2 }}>
            {(trendData?.period_change_pct || 0) > 0 ? '+' : ''}{trendData?.period_change_pct || 0}%
            <span style={{ fontSize: 12, fontWeight: 500, color: '#5A6A60', marginLeft: 6 }}>
              ({(trendData?.period_change_abs || 0) > 0 ? '+' : ''}₹{trendData?.period_change_abs || 0}/q)
            </span>
          </div>
          <div style={{ fontSize: 11, color: '#5A6A60' }}>
            Across {trendData?.total_observations || 0} data records
          </div>
        </div>
      </div>

      {/* Main Dual-Axis Chart & Key Insights Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* Left: Dual Axis SVG Chart */}
        <div className="chart-container" style={{ position: 'relative' }}>
          <div className="chart-header">
            <div>
              <div className="chart-title">
                {trendData?.crop_name || 'Crop'} Price & Arrival Trend ({trendData?.mandi_name || 'Primary Mandi'})
              </div>
              {compareMandi && trendData?.compare_mandi_name && (
                <div style={{ fontSize: 12, color: '#2563EB', fontWeight: 600, marginTop: 2 }}>
                  Compared with: {trendData.compare_mandi_name}
                </div>
              )}
            </div>

            {/* Dynamic Legend */}
            <div className="chart-legend" style={{ flexWrap: 'wrap', gap: 12 }}>
              <div className="legend-item">
                <div className="legend-dot" style={{ backgroundColor: '#059669' }} />
                <span>Modal Price (₹/q)</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ backgroundColor: '#9CA3AF' }} />
                <span>Min/Max Range</span>
              </div>
              {compareMandi && (
                <div className="legend-item">
                  <div className="legend-dot" style={{ backgroundColor: '#2563EB' }} />
                  <span>{trendData?.compare_mandi_name || 'Compare'}</span>
                </div>
              )}
              <div className="legend-item">
                <div className="legend-dot" style={{ backgroundColor: '#FBBF24' }} />
                <span>Arrivals (Tonnes)</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5A6A60' }}>
              Loading historical auction series...
            </div>
          ) : chartPoints.length === 0 ? (
            <div style={{ height: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#5A6A60' }}>
              <AlertTriangle size={32} color="#D97706" style={{ marginBottom: 8 }} />
              <div>No historical records found for this combination in the warehouse.</div>
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              style={{ width: '100%', height: 'auto', overflow: 'visible', cursor: 'crosshair' }}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              {/* Grid & Left Axis: Price (₹/q) */}
              {priceSteps.map((val) => {
                const yPos = getYPrice(val);
                return (
                  <g key={`p-${val}`}>
                    <line
                      x1={padding.left}
                      y1={yPos}
                      x2={svgWidth - padding.right}
                      y2={yPos}
                      stroke="#E5E9E4"
                      strokeDasharray="2 2"
                    />
                    <text
                      x={padding.left - 8}
                      y={yPos + 4}
                      fill="#718096"
                      fontSize="10"
                      textAnchor="end"
                    >
                      ₹{val.toLocaleString()}
                    </text>
                  </g>
                );
              })}

              {/* Right Axis: Arrival (Tonnes) */}
              {arrivalSteps.map((val) => {
                const yPos = getYArrival(val);
                return (
                  <g key={`a-${val}`}>
                    <text
                      x={svgWidth - padding.right + 8}
                      y={yPos + 4}
                      fill="#D97706"
                      fontSize="10"
                      textAnchor="start"
                    >
                      {val}t
                    </text>
                  </g>
                );
              })}

              {/* Arrival Bars (Yellow/Orange) */}
              {chartPoints.map((p, idx) => {
                const cx = getX(idx);
                const barH = svgHeight - padding.bottom - getYArrival(p.arrivals_tonnes || 0);
                return (
                  <rect
                    key={`bar-${idx}`}
                    x={cx - 6}
                    y={getYArrival(p.arrivals_tonnes || 0)}
                    width="12"
                    height={Math.max(barH, 2)}
                    fill="#FBBF24"
                    opacity="0.75"
                    rx="2"
                  />
                );
              })}

              {/* Min Price Dashed Line */}
              {minPricePath && (
                <path
                  d={minPricePath}
                  fill="none"
                  stroke="#9CA3AF"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                />
              )}

              {/* Max Price Dashed Line */}
              {maxPricePath && (
                <path
                  d={maxPricePath}
                  fill="none"
                  stroke="#9CA3AF"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                />
              )}

              {/* Compare Mandi Price Line (Blue) */}
              {comparePath && (
                <path
                  d={comparePath}
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />
              )}

              {/* Primary Price Line (Green) */}
              {pricePath && (
                <path
                  d={pricePath}
                  fill="none"
                  stroke="#059669"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )}

              {/* Interactive Price Nodes */}
              {chartPoints.map((p, idx) => {
                const cx = getX(idx);
                const cy = getYPrice(p.modal_price);
                const isHovered = hoveredPoint?.idx === idx;
                return (
                  <g
                    key={`node-${idx}`}
                    onMouseEnter={() => setHoveredPoint({ ...p, idx, cx, cy })}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 6 : 3.5}
                      fill={isHovered ? '#113826' : '#059669'}
                      stroke="#FFFFFF"
                      strokeWidth={isHovered ? 2 : 1.5}
                    />
                    {/* Invisible hit area for smooth hovering */}
                    <circle cx={cx} cy={cy} r="14" fill="transparent" />
                  </g>
                );
              })}

              {/* X Axis Labels: Date sampling */}
              {chartPoints.map((p, idx) => {
                // Show max 6 date labels across the axis
                const showLabel = idx === 0 || idx === chartPoints.length - 1 || idx % Math.ceil(chartPoints.length / 5) === 0;
                if (!showLabel) return null;
                const cx = getX(idx);
                return (
                  <text
                    key={`label-${idx}`}
                    x={cx}
                    y={svgHeight - 12}
                    fill="#4A5568"
                    fontSize="10"
                    textAnchor="middle"
                  >
                    {p.date.replace('Wk of ', '').slice(-5)}
                  </text>
                );
              })}
            </svg>
          )}

          {/* Interactive Floating Tooltip */}
          {hoveredPoint && (
            <div
              style={{
                position: 'absolute',
                top: Math.max(10, hoveredPoint.cy - 70),
                left: Math.min(svgWidth - 180, Math.max(10, hoveredPoint.cx - 80)),
                backgroundColor: '#113826',
                color: '#FFFFFF',
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 11,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                pointerEvents: 'none',
                zIndex: 10
              }}
            >
              <div style={{ fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: 3, marginBottom: 4 }}>
                {hoveredPoint.date}
              </div>
              <div>Modal Price: ₹{hoveredPoint.modal_price?.toLocaleString()}/q</div>
              {hoveredPoint.min_price && (
                <div style={{ color: '#D1E5D8' }}>Range: ₹{hoveredPoint.min_price} - ₹{hoveredPoint.max_price}</div>
              )}
              {hoveredPoint.compare_modal_price && (
                <div style={{ color: '#93C5FD' }}>
                  {trendData?.compare_mandi_name || 'Compare'}: ₹{hoveredPoint.compare_modal_price?.toLocaleString()}/q
                </div>
              )}
              <div style={{ color: '#FDE68A' }}>Arrivals: {hoveredPoint.arrivals_tonnes} tonnes</div>
            </div>
          )}
        </div>

        {/* Right: Key Insights & Mathematical Evidence Box */}
        <div className="calc-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#113826', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={16} color="#059669" />
            <span>Factual Market Insights</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(trendData?.key_insights || []).map((insight, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 10, fontSize: 13, color: '#1A241F', lineHeight: 1.4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: idx === 0 ? '#059669' : idx === 1 ? '#D97706' : '#2563EB', marginTop: 6, flexShrink: 0 }} />
                <div>{insight}</div>
              </div>
            ))}
          </div>

          {/* Mathematical Trend Explanation */}
          <div
            style={{
              marginTop: 18,
              padding: '12px',
              backgroundColor: '#FAFDF9',
              border: '1px solid #D1E5D8',
              borderRadius: 8,
              fontSize: 12,
              color: '#355E47'
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={14} color="#059669" />
              <span>Trend Engine Mathematical Proof</span>
            </div>
            <div>{trendSignal?.explanation || 'Computing trend classification from moving average divergences.'}</div>
          </div>

          {/* Aggregation Documentation */}
          <div
            style={{
              marginTop: 12,
              padding: '10px 12px',
              backgroundColor: '#F8FAF8',
              border: '1px solid #E5E9E4',
              borderRadius: 8,
              fontSize: 11,
              color: '#5A6A60'
            }}
          >
            <Info size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
            Official APMC records. Weekly & monthly points compute the true mathematical median of auction lots, avoiding skewed averages.
          </div>
        </div>
      </div>
    </div>
  );
}
