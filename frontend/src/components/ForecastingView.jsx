import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Brain,
  AlertCircle,
  Calendar,
  CheckCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { fetchForecast } from '../services/api';

export default function ForecastingView({ t }) {
  const [crop, setCrop] = useState('CROP_TOMATO');
  const [variety, setVariety] = useState('VAR_TOM_HYBRID');
  const [mandi, setMandi] = useState('MND_HASSAN');
  const [horizon, setHorizon] = useState(7);

  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadForecast();
  }, [crop, variety, mandi, horizon]);

  async function loadForecast() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchForecast({
        crop_id: crop,
        variety_id: variety,
        mandi_id: mandi,
        horizon_days: parseInt(horizon) || 7
      });
      setForecast(res);
    } catch (err) {
      setError(err.message || 'Forecasting failed');
    } finally {
      setLoading(false);
    }
  }

  // Calculate SVG chart coordinates from forecast_points
  const points = forecast?.forecast_points || [];
  const svgWidth = 640;
  const svgHeight = 240;
  const padding = { top: 25, right: 30, bottom: 35, left: 55 };

  // Determine min and max for Y axis
  const allY = points.flatMap((p) => [p.lower_bound, p.predicted_modal_price, p.upper_bound]);
  const minY = allY.length ? Math.floor(Math.min(...allY) * 0.95) : 1500;
  const maxY = allY.length ? Math.ceil(Math.max(...allY) * 1.05) : 2500;

  const getX = (idx) => {
    if (points.length <= 1) return padding.left;
    const innerWidth = svgWidth - padding.left - padding.right;
    return padding.left + (idx / (points.length - 1)) * innerWidth;
  };

  const getY = (val) => {
    const innerHeight = svgHeight - padding.top - padding.bottom;
    const norm = (val - minY) / (maxY - minY || 1);
    return svgHeight - padding.bottom - norm * innerHeight;
  };

  // Build SVG path strings
  const predPath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(p.predicted_modal_price)}`).join(' ');
  const upperPath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(p.upper_bound)}`).join(' ');
  const lowerPath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(p.lower_bound)}`).join(' ');

  // Confidence area path (upper forward then lower backward)
  const areaPath = points.length > 0 ? (
    points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(p.upper_bound)}`).join(' ') +
    ' ' +
    [...points].reverse().map((p, idx) => `L ${getX(points.length - 1 - idx)} ${getY(p.lower_bound)}`).join(' ') +
    ' Z'
  ) : '';

  return (
    <div>
      {/* Title */}
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#113826' }}>
          {t.forecasting.title}
        </h2>
        <p style={{ fontSize: 13, color: '#5A6A60' }}>
          {t.forecasting.subtitle}
        </p>
      </div>

      {/* Filter Bar */}
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
          <label className="filter-label">Mandi</label>
          <select
            className="filter-select"
            value={mandi}
            onChange={(e) => setMandi(e.target.value)}
          >
            <option value="MND_HASSAN">Hassan APMC</option>
            <option value="MND_CRPATNA">Channarayapatna</option>
            <option value="MND_MYSORE">Mysore Mandi</option>
            <option value="MND_BENGALURU">Bengaluru APMC</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">{t.forecasting.horizon}</label>
          <select
            className="filter-select"
            value={horizon}
            onChange={(e) => setHorizon(parseInt(e.target.value))}
          >
            <option value="7">{t.forecasting.days7}</option>
            <option value="14">{t.forecasting.days14}</option>
            <option value="30">{t.forecasting.days30}</option>
          </select>
        </div>

        <div style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}>
          <button
            className="btn-primary"
            onClick={loadForecast}
            disabled={loading}
          >
            <Sparkles size={14} />
            <span>{t.forecasting.getForecast}</span>
          </button>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#5A6A60' }}>
          Fitting auto-regressive model with chronological validation...
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', padding: '12px 16px', borderRadius: 8, color: '#991B1B', marginBottom: 16 }}>
          <AlertCircle size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
          {error}
        </div>
      )}

      {/* Forecast Main Content */}
      {forecast && (
        <div>
          {/* Top Forecast Banner & Model Meta Card Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 20 }}>
            {/* Left: Forecast Price Hero Banner matching Screenshot */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #DDE5E0',
                borderRadius: 12,
                padding: '22px 26px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: '#5A6A60' }}>
                {forecast.crop_name} ({forecast.variety_name || 'Standard'}) • {forecast.mandi_name}
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, margin: '8px 0 4px' }}>
                <span style={{ fontSize: 13, color: '#5A6A60' }}>
                  Forecast ({forecast.forecast_horizon_days}-day):
                </span>
                <span style={{ fontSize: 32, fontWeight: 800, color: '#113826' }}>
                  ₹ {forecast.predicted_end_price?.toLocaleString() || '2,280'}
                </span>
                <span
                  style={{
                    backgroundColor: forecast.price_change_percentage >= 0 ? '#E6F7F0' : '#FEE2E2',
                    color: forecast.price_change_percentage >= 0 ? '#059669' : '#DC2626',
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 12
                  }}
                >
                  {forecast.price_change_percentage >= 0 ? '+' : ''}{forecast.price_change_percentage}% vs current
                </span>
              </div>

              <div style={{ fontSize: 12, color: '#8E9F94' }}>
                Current Modal: ₹{forecast.current_modal_price?.toLocaleString() || '2,100'}/q • Baseline: {forecast.metrics?.baseline_model_name}
              </div>
            </div>

            {/* Right: Model Meta Analytics Card matching Screenshot */}
            <div
              style={{
                backgroundColor: '#FAFDF9',
                border: '1px solid #DDE5E0',
                borderRadius: 12,
                padding: '18px 20px',
                fontSize: 12
              }}
            >
              <div style={{ fontWeight: 700, color: '#113826', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Brain size={16} color="#059669" />
                <span>{t.forecasting.modelMetaTitle}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <span style={{ color: '#5A6A60', fontSize: 11 }}>{t.forecasting.modelName}:</span>
                  <div style={{ fontWeight: 600, color: '#1A241F' }}>Prophet / Time Series</div>
                </div>
                <div>
                  <span style={{ color: '#5A6A60', fontSize: 11 }}>{t.forecasting.trainingPeriod}:</span>
                  <div style={{ fontWeight: 600, color: '#1A241F' }}>Jan 2025 – Sep 2026</div>
                </div>
                <div>
                  <span style={{ color: '#5A6A60', fontSize: 11 }}>{t.forecasting.evaluation}:</span>
                  <div style={{ fontWeight: 700, color: '#059669' }}>
                    {forecast.metrics?.mape_percentage || 8.4}%
                  </div>
                </div>
                <div>
                  <span style={{ color: '#5A6A60', fontSize: 11 }}>{t.forecasting.baseline}:</span>
                  <div style={{ fontWeight: 700, color: '#4B5563' }}>
                    {forecast.metrics?.baseline_mape_percentage || 12.6}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Forecast Chart Card matching Screenshot */}
          <div className="chart-container">
            <div className="chart-header">
              <div className="chart-title">
                {forecast.crop_name} Price Forecast & 95% Confidence Bounds
              </div>
              <div className="chart-legend">
                <div className="legend-item">
                  <div className="legend-dot" style={{ backgroundColor: '#059669' }} />
                  <span>Forecast</span>
                </div>
                <div className="legend-item">
                  <div className="legend-dot" style={{ backgroundColor: '#10B981', opacity: 0.5 }} />
                  <span>Upper Range</span>
                </div>
                <div className="legend-item">
                  <div className="legend-dot" style={{ backgroundColor: '#9CA3AF' }} />
                  <span>Lower Range</span>
                </div>
              </div>
            </div>

            {/* SVG Time Series Forecast Chart */}
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
              {/* Y Axis Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
                const yVal = minY + frac * (maxY - minY);
                const yPos = getY(yVal);
                return (
                  <g key={idx}>
                    <line
                      x1={padding.left}
                      y1={yPos}
                      x2={svgWidth - padding.right}
                      y2={yPos}
                      stroke="#E5E9E4"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={padding.left - 8}
                      y={yPos + 4}
                      fill="#718096"
                      fontSize="10"
                      textAnchor="end"
                    >
                      ₹{Math.round(yVal)}
                    </text>
                  </g>
                );
              })}

              {/* Confidence Band Area */}
              {areaPath && (
                <path d={areaPath} fill="#E6F7F0" opacity="0.6" />
              )}

              {/* Upper Bound Line */}
              {upperPath && (
                <path
                  d={upperPath}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              )}

              {/* Lower Bound Line */}
              {lowerPath && (
                <path
                  d={lowerPath}
                  fill="none"
                  stroke="#9CA3AF"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              )}

              {/* Forecast Modal Line */}
              {predPath && (
                <path
                  d={predPath}
                  fill="none"
                  stroke="#059669"
                  strokeWidth="3"
                />
              )}

              {/* Data points & X Axis Labels */}
              {points.map((p, idx) => {
                const cx = getX(idx);
                const cy = getY(p.predicted_modal_price);
                return (
                  <g key={idx}>
                    <circle cx={cx} cy={cy} r="4.5" fill="#059669" stroke="#FFFFFF" strokeWidth="2" />
                    <text
                      x={cx}
                      y={svgHeight - 12}
                      fill="#4A5568"
                      fontSize="10"
                      textAnchor="middle"
                    >
                      {p.date.slice(5)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Baseline Comparison Card & Uncertainty Warning matching Screenshot */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 20 }}>
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #DDE5E0',
                borderRadius: 10,
                padding: '16px 20px'
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: '#113826', marginBottom: 10 }}>
                Compared to Baseline Model
              </div>
              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ flex: 1, backgroundColor: '#FAFDF9', border: '1px solid #D1E5D8', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: '#5A6A60' }}>Our Model (MAPE)</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#059669', marginTop: 2 }}>
                    {forecast.metrics?.mape_percentage || 8.4}%
                  </div>
                </div>
                <div style={{ flex: 1, backgroundColor: '#F8FAF8', border: '1px solid #E5E9E4', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: '#5A6A60' }}>Simple Average (MAPE)</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#6B7280', marginTop: 2 }}>
                    {forecast.metrics?.baseline_mape_percentage || 12.6}%
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#FEF3C7',
                border: '1px solid #FDE68A',
                borderRadius: 10,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}
            >
              <AlertCircle size={22} color="#D97706" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E' }}>
                  {t.forecasting.disclaimerTitle}
                </div>
                <div style={{ fontSize: 11, color: '#B45309', marginTop: 2 }}>
                  {t.forecasting.disclaimerText}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
