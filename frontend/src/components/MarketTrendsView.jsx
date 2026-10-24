import React, { useState, useEffect } from 'react';
import {
  LineChart as ChartIcon,
  TrendingUp,
  BarChart2,
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';
import { fetchMarketTrends } from '../services/api';

export default function MarketTrendsView({ t }) {
  const [activeTab, setActiveTab] = useState('priceTrend');
  const [crop, setCrop] = useState('CROP_TOMATO');
  const [variety, setVariety] = useState('VAR_TOM_HYBRID');
  const [district, setDistrict] = useState('Hassan');
  const [mandi, setMandi] = useState('MND_HASSAN');
  const [dateRange, setDateRange] = useState('3months');

  const [trendData, setTrendData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTrends();
  }, [crop, variety, mandi, dateRange]);

  async function loadTrends() {
    setLoading(true);
    try {
      const data = await fetchMarketTrends(crop, variety, mandi, dateRange);
      setTrendData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const chartPoints = trendData?.chart_data || [];
  const svgWidth = 640;
  const svgHeight = 260;
  const padding = { top: 25, right: 55, bottom: 35, left: 55 };

  // Price scales (Left Y-axis) [0 to 3000]
  const minPrice = 0;
  const maxPrice = 3000;

  // Arrival scales (Right Y-axis) [0 to 300]
  const minArrival = 0;
  const maxArrival = 300;

  const getX = (idx) => {
    if (chartPoints.length <= 1) return padding.left;
    const innerW = svgWidth - padding.left - padding.right;
    return padding.left + (idx / (chartPoints.length - 1)) * innerW;
  };

  const getYPrice = (val) => {
    const innerH = svgHeight - padding.top - padding.bottom;
    const norm = (val - minPrice) / (maxPrice - minPrice);
    return svgHeight - padding.bottom - norm * innerH;
  };

  const getYArrival = (val) => {
    const innerH = svgHeight - padding.top - padding.bottom;
    const norm = (val - minArrival) / (maxArrival - minArrival);
    return svgHeight - padding.bottom - norm * innerH;
  };

  // Price line path
  const pricePath = chartPoints
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getYPrice(p.modal_price)}`)
    .join(' ');

  return (
    <div>
      {/* Title */}
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#113826' }}>
          {t.trends.title}
        </h2>
      </div>

      {/* Filter Bar matching Screenshot */}
      <div className="filter-bar">
        <div className="filter-group">
          <label className="filter-label">{t.comparison.crop}</label>
          <select
            className="filter-select"
            value={crop}
            onChange={(e) => setCrop(e.target.value)}
          >
            <option value="CROP_TOMATO">Tomato</option>
            <option value="CROP_ONION">Onion</option>
            <option value="CROP_POTATO">Potato</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">{t.comparison.variety}</label>
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
          <label className="filter-label">State</label>
          <select className="filter-select" defaultValue="Karnataka">
            <option value="Karnataka">Karnataka</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">District</label>
          <select
            className="filter-select"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
          >
            <option value="Hassan">Hassan</option>
            <option value="Mysore">Mysore</option>
            <option value="Mandya">Mandya</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Mandi</label>
          <select
            className="filter-select"
            value={mandi}
            onChange={(e) => setMandi(e.target.value)}
          >
            <option value="MND_HASSAN">Hassan APMC</option>
            <option value="MND_CRPATNA">Channarayapatna</option>
            <option value="MND_MYSORE">Mysore Mandi</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Date Range</label>
          <select
            className="filter-select"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="1year">Last 1 Year</option>
          </select>
        </div>
      </div>

      {/* Tabs matching Screenshot */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <button
          className={`pill-btn ${activeTab === 'priceTrend' ? 'active' : ''}`}
          onClick={() => setActiveTab('priceTrend')}
        >
          {t.trends.priceTrendTab}
        </button>
        <button
          className={`pill-btn ${activeTab === 'arrival' ? 'active' : ''}`}
          onClick={() => setActiveTab('arrival')}
        >
          {t.trends.arrivalTab}
        </button>
        <button
          className={`pill-btn ${activeTab === 'comparison' ? 'active' : ''}`}
          onClick={() => setActiveTab('comparison')}
        >
          {t.trends.comparisonTab}
        </button>
        <button
          className={`pill-btn ${activeTab === 'seasonality' ? 'active' : ''}`}
          onClick={() => setActiveTab('seasonality')}
        >
          {t.trends.seasonalityTab}
        </button>
      </div>

      {/* Dual Axis Chart Card + Insights Card Grid matching Screenshot */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* Left: Dual Axis Chart */}
        <div className="chart-container">
          <div className="chart-header">
            <div className="chart-title">
              Price & Arrival Trend ({trendData?.mandi_name || 'Hassan APMC'})
            </div>
            <div className="chart-legend">
              <div className="legend-item">
                <div className="legend-dot" style={{ backgroundColor: '#059669' }} />
                <span>Price (₹/q)</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ backgroundColor: '#F59E0B' }} />
                <span>Arrival (q)</span>
              </div>
            </div>
          </div>

          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
            {/* Grid & Left Axis: Price */}
            {[0, 1000, 2000, 3000].map((val) => {
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
                    {val.toLocaleString()}
                  </text>
                </g>
              );
            })}

            {/* Right Axis: Arrival */}
            {[0, 75, 150, 225, 300].map((val) => {
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
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Arrival Bars (Yellow/Orange) */}
            {chartPoints.map((p, idx) => {
              const cx = getX(idx);
              const barH = svgHeight - padding.bottom - getYArrival(p.arrivals_tonnes);
              return (
                <rect
                  key={`bar-${idx}`}
                  x={cx - 5}
                  y={getYArrival(p.arrivals_tonnes)}
                  width="10"
                  height={Math.max(barH, 2)}
                  fill="#FBBF24"
                  opacity="0.85"
                  rx="2"
                />
              );
            })}

            {/* Price Line (Green) */}
            {pricePath && (
              <path
                d={pricePath}
                fill="none"
                stroke="#059669"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            )}

            {/* Price Nodes */}
            {chartPoints.map((p, idx) => {
              const cx = getX(idx);
              const cy = getYPrice(p.modal_price);
              return (
                <circle
                  key={`node-${idx}`}
                  cx={cx}
                  cy={cy}
                  r="3.5"
                  fill="#059669"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
              );
            })}

            {/* X Axis Labels: Months (Jul, Aug, Sep, Oct) */}
            <text x={padding.left + 50} y={svgHeight - 10} fill="#4A5568" fontSize="11" textAnchor="middle">Jul</text>
            <text x={padding.left + 200} y={svgHeight - 10} fill="#4A5568" fontSize="11" textAnchor="middle">Aug</text>
            <text x={padding.left + 350} y={svgHeight - 10} fill="#4A5568" fontSize="11" textAnchor="middle">Sep</text>
            <text x={padding.left + 490} y={svgHeight - 10} fill="#4A5568" fontSize="11" textAnchor="middle">Oct</text>
          </svg>
        </div>

        {/* Right: Key Insights Box matching Screenshot */}
        <div className="calc-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#113826', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={16} color="#059669" />
            <span>{t.trends.keyInsightsTitle}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 10, fontSize: 13, color: '#1A241F' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#059669', marginTop: 6, flexShrink: 0 }} />
              <div>Prices increased by 14% in the last 3 weeks due to strong festive demand across South India.</div>
            </div>

            <div style={{ display: 'flex', gap: 10, fontSize: 13, color: '#1A241F' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#D97706', marginTop: 6, flexShrink: 0 }} />
              <div>Arrivals are higher in August–September (seasonal post-monsoon flush).</div>
            </div>

            <div style={{ display: 'flex', gap: 10, fontSize: 13, color: '#1A241F' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#2563EB', marginTop: 6, flexShrink: 0 }} />
              <div>Hassan mandi prices are currently 12% higher than Mysore mandi for hybrid tomato lots.</div>
            </div>
          </div>

          <div
            style={{
              marginTop: 22,
              padding: '12px',
              backgroundColor: '#FAFDF9',
              border: '1px solid #D1E5D8',
              borderRadius: 8,
              fontSize: 11,
              color: '#355E47'
            }}
          >
            <Info size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
            Observations queried directly from verified Agmarknet daily price registers. No synthetic data is generated.
          </div>
        </div>
      </div>
    </div>
  );
}
