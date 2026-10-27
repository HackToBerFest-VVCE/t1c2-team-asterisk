import React from 'react';
import {
  Printer,
  Download,
  Share2,
  Wheat,
  MapPin,
  Star,
  Calendar,
  Layers,
  Settings,
  Coins,
  Truck,
  TrendingUp,
  Info,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';
import AgriculturalLandscapeFooter from './AgriculturalLandscapeFooter';
import { downloadReport } from '../services/api';

/**
 * Format number to Indian Currency Comma Notation (e.g. 1,05,000)
 */
function formatIndianNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '—';
  const rounded = Math.round(num);
  const str = rounded.toString();
  if (str.length <= 3) return str;
  const lastThree = str.substring(str.length - 3);
  const otherNumbers = str.substring(0, str.length - 3);
  return otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
}

export default function MarketComparisonReport({
  comparisonData,
  cropName = 'Tomato',
  varietyName = 'Hybrid',
  originName = 'Hassan, Karnataka',
  quantity = 50.0,
  unit = 'Quintals',
  comparisonDate = '2026-10-24',
  dataMode = 'LOCAL_DEVELOPMENT_ADAPTER',
  onClose,
  showActions = true
}) {
  // Extract or fallback from comparisonData
  const crop = comparisonData?.crop_name || cropName;
  const variety = comparisonData?.variety_name || varietyName;
  const origin = comparisonData?.origin_name || originName;
  const qty = comparisonData?.quantity_quintals || quantity;
  const date = comparisonData?.comparison_date || comparisonDate;
  const mode = comparisonData?.data_mode || dataMode;
  const mandis = comparisonData?.mandis || [];

  const bestMandi = mandis.find((m) => m.is_best_net_return) || mandis[0] || {
    mandi_name: 'Hassan APMC',
    estimated_net_return: 102790,
    estimated_road_distance_km: 2.0,
    transport_expense: 2210,
    arrival_quantity_tonnes: 125.0
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    downloadReport('pdf', {
      crop_id: comparisonData?.crop_id || 'CROP_TOMATO',
      variety_id: comparisonData?.variety_id || 'VAR_TOM_HYBRID',
      quantity: qty,
      unit: 'quintals',
      origin_name: origin,
      selling_date: date
    });
  };

  const handleDownloadCsv = () => {
    downloadReport('csv', {
      crop_id: comparisonData?.crop_id || 'CROP_TOMATO',
      variety_id: comparisonData?.variety_id || 'VAR_TOM_HYBRID',
      quantity: qty,
      unit: 'quintals',
      origin_name: origin,
      selling_date: date
    });
  };

  return (
    <div className="market-comparison-report-wrapper">
      {/* Top Action Bar (Hidden in Print) */}
      {showActions && (
        <div className="report-action-bar no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {onClose && (
              <button
                className="btn-secondary"
                onClick={onClose}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
            )}
            <span style={{ fontSize: 13, fontWeight: 700, color: '#113826' }}>
              Official APMC Market Comparison Report
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="btn-secondary"
              onClick={handlePrint}
              title="Print official report or save as PDF"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
            >
              <Printer size={14} />
              <span>Print / Save PDF</span>
            </button>

            <button
              className="btn-secondary"
              onClick={handleDownloadCsv}
              title="Export raw tabular data to CSV"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>

            <button
              className="btn-primary"
              onClick={handleDownloadPdf}
              title="Download compiled PDF document"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
            >
              <Download size={14} />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Report Document Sheet (Matches Exact Uploaded PNG Design) */}
      <div className="market-comparison-report-sheet print-document">
        
        {/* 1. Header & Agricultural Branding */}
        <header className="report-header">
          {/* Top-Left: Logo & Tagline */}
          <div className="report-branding-left">
            <div className="report-logo-lockup">
              <img
                src="/assets/farmprice-ai-logo.png"
                alt="FarmPrice AI"
                className="report-logo-img"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="report-brand-text">
                <span className="brand-farmprice">FarmPrice</span>
                <span className="brand-ai"> AI</span>
              </div>
            </div>
            <div className="report-tagline">
              Predict &bull; Compare &bull; Get Better Prices
            </div>
          </div>

          {/* Top-Right: Slogan & Leaf Emblem */}
          <div className="report-branding-right">
            <div className="report-slogan">
              <em>Smarter Decisions<br />for a Prosperous Farm</em>
            </div>
            <div className="report-leaf-badge">
              {/* Elegant curved green leaf illustration */}
              <svg width="44" height="52" viewBox="0 0 44 52" fill="none">
                <path
                  d="M4 48 C 6 22, 24 4, 42 2 C 44 26, 28 48, 4 48 Z"
                  fill="#22C55E"
                />
                <path
                  d="M6 46 C 8 26, 22 10, 38 6 C 36 28, 22 44, 6 46 Z"
                  fill="#15803D"
                  opacity="0.25"
                />
                <path
                  d="M6 46 Q 22 24 38 6"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M16 32 Q 22 34 26 38"
                  stroke="#FFFFFF"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  opacity="0.8"
                />
                <path
                  d="M22 24 Q 28 26 32 30"
                  stroke="#FFFFFF"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  opacity="0.8"
                />
              </svg>
            </div>
          </div>
        </header>

        {/* 2. Report Title & Subtitle */}
        <section className="report-title-section">
          <h1 className="report-main-title">
            Market Price Comparison &amp; Anal<span className="accent-red-i">I</span>ysis
          </h1>
          <p className="report-subtitle">
            Know Your Market. Compare Prices. Sell With Confidence.
          </p>
          <div className="report-accent-line" />
        </section>

        {/* 2.5 Prominent Compact P&L Outcome Indicator Banner */}
        {bestMandi && (
          <div className={`report-pl-indicator-banner ${bestMandi.estimated_net_return >= 0 ? 'pl-status-profit' : 'pl-status-loss'}`}>
            <div className="pl-indicator-left">
              {bestMandi.estimated_net_return >= 0 ? (
                <CheckCircle2 size={18} className="pl-indicator-symbol" />
              ) : (
                <AlertTriangle size={18} className="pl-indicator-symbol" />
              )}
              <span className="pl-indicator-title">
                {bestMandi.estimated_net_return >= 0
                  ? 'CONGRATULATIONS — YOU ARE IN PROFIT'
                  : 'WARNING — ESTIMATED LOSS'}
              </span>
            </div>
            <div className="pl-indicator-amount">
              ₹{formatIndianNumber(bestMandi.estimated_net_return)}
            </div>
          </div>
        )}

        {/* 3. Crop & Report Summary Panel (Rounded Pale-Green) */}
        <section className="report-summary-panel">
          <div className="summary-col">
            <div className="summary-item">
              <Wheat size={16} className="summary-icon" />
              <span className="summary-label">Crop:</span>
              <span className="summary-value">
                {crop} ({variety})
              </span>
            </div>

            <div className="summary-item">
              <MapPin size={16} className="summary-icon" />
              <span className="summary-label">Origin:</span>
              <span className="summary-value">{origin}</span>
            </div>

            <div className="summary-item highlight-best">
              <Star size={16} className="summary-icon star-icon" fill="#15803D" />
              <span className="summary-label">Best Recommended Mandi:</span>
              <span className="summary-value strong">{bestMandi.mandi_name}</span>
            </div>
          </div>

          <div className="summary-divider-v" />

          <div className="summary-col">
            <div className="summary-item">
              <Layers size={16} className="summary-icon" />
              <span className="summary-label">Quantity:</span>
              <span className="summary-value">{qty} Quintals</span>
            </div>

            <div className="summary-item">
              <Calendar size={16} className="summary-icon" />
              <span className="summary-label">Date:</span>
              <span className="summary-value">{date}</span>
            </div>

            <div className="summary-item">
              <Settings size={16} className="summary-icon" />
              <span className="summary-label">Data Mode:</span>
              <span className="summary-value code-mode">{mode}</span>
            </div>
          </div>
        </section>

        {/* 4. Section Heading: Market Comparison & Net Return Breakdown */}
        <div className="report-section-header">
          <div className="section-title-wrap">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="section-leaf-icon">
              <path
                d="M3 21 C 4 10, 12 3, 21 2 C 22 13, 14 21, 3 21 Z"
                fill="#15803D"
              />
              <path
                d="M4 20 Q 12 11 20 3"
                stroke="#FFFFFF"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <h2>Market Comparison &amp; Net Return Breakdown</h2>
          </div>
          <div className="section-divider-line" />
        </div>

        {/* 5. Comparison & Net Return Table */}
        <div className="report-table-container">
          <table className="report-comparison-table">
            <thead>
              <tr>
                <th style={{ width: '7%', textAlign: 'center' }}>Rank</th>
                <th style={{ width: '25%', textAlign: 'left' }}>Mandi</th>
                <th style={{ width: '11%', textAlign: 'right' }}>Price (Rs/q)</th>
                <th style={{ width: '12%', textAlign: 'right' }}>Road Dist (km)</th>
                <th style={{ width: '12%', textAlign: 'right' }}>Gross Value (Rs)</th>
                <th style={{ width: '11%', textAlign: 'right' }}>Total Costs (Rs)</th>
                <th style={{ width: '12%', textAlign: 'right' }}>Net Return (Rs)</th>
                <th style={{ width: '10%', textAlign: 'right' }}>Net / q (Rs)</th>
              </tr>
            </thead>
            <tbody>
              {mandis.map((m, idx) => {
                const isBest = m.is_best_net_return || idx === 0;
                // Parse optional secondary location label (e.g. Yeshwanthpur)
                const nameParts = m.mandi_name.split('(');
                const primaryName = nameParts[0].trim();
                const subName = nameParts.length > 1 ? `(${nameParts[1]}` : null;

                return (
                  <tr
                    key={m.mandi_id || idx}
                    className={isBest ? 'row-best-mandi' : idx % 2 === 1 ? 'row-alt' : ''}
                  >
                    {/* Rank Badge */}
                    <td style={{ textAlign: 'center' }}>
                      <span className="rank-badge">#{m.rank || idx + 1}</span>
                    </td>

                    {/* Mandi Name */}
                    <td style={{ textAlign: 'left' }}>
                      <div className="mandi-name-cell">
                        <span className={`mandi-primary-name ${isBest ? 'bold-mandi' : ''}`}>
                          {primaryName}
                        </span>
                        {isBest && <span className="best-star-symbol"> &starf;</span>}
                        {subName && (
                          <div className="mandi-sub-name">{subName}</div>
                        )}
                      </div>
                    </td>

                    {/* Modal Price */}
                    <td style={{ textAlign: 'right' }}>
                      {formatIndianNumber(m.modal_price_per_q)}
                    </td>

                    {/* Road Distance */}
                    <td style={{ textAlign: 'right' }}>
                      {typeof m.estimated_road_distance_km === 'number'
                        ? m.estimated_road_distance_km.toFixed(1)
                        : m.estimated_road_distance_km || '—'}
                    </td>

                    {/* Gross Value */}
                    <td style={{ textAlign: 'right' }}>
                      {formatIndianNumber(m.gross_sale_value)}
                    </td>

                    {/* Total Costs */}
                    <td style={{ textAlign: 'right' }}>
                      {formatIndianNumber(m.total_expenses)}
                    </td>

                    {/* Net Return */}
                    <td style={{ textAlign: 'right', fontWeight: isBest ? 800 : 700, color: '#0F3D24' }}>
                      {formatIndianNumber(m.estimated_net_return)}
                    </td>

                    {/* Net / Quintal */}
                    <td style={{ textAlign: 'right' }}>
                      {formatIndianNumber(m.net_return_per_quintal)}
                    </td>
                  </tr>
                );
              })}

              {mandis.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#5A6A60' }}>
                    No market observations currently available for this crop and date.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 6. Section Heading: Why This Market? */}
        <div className="report-section-header" style={{ marginTop: 22 }}>
          <div className="section-title-wrap">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="section-leaf-icon">
              <path
                d="M3 21 C 4 10, 12 3, 21 2 C 22 13, 14 21, 3 21 Z"
                fill="#15803D"
              />
              <path
                d="M4 20 Q 12 11 20 3"
                stroke="#FFFFFF"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <h2>Why This Market?</h2>
          </div>
          <div className="section-divider-line" />
        </div>

        {/* 7. "Why This Market?" 3 Recommendation Cards */}
        <div className="why-market-cards-grid">
          {/* Card 1: Highest Take-home Return */}
          <div className="why-card">
            <div className="why-card-icon-wrap">
              <Coins size={22} className="why-card-icon" />
            </div>
            <div className="why-card-content">
              <h3 className="why-card-title">Highest Take-home Return</h3>
              <p className="why-card-desc">
                {bestMandi.mandi_name} gives the highest net return of ₹{formatIndianNumber(bestMandi.estimated_net_return)} for your {qty} {unit.toLowerCase()}.
              </p>
            </div>
          </div>

          {/* Card 2: Low Freight Overhead */}
          <div className="why-card">
            <div className="why-card-icon-wrap">
              <Truck size={22} className="why-card-icon" />
            </div>
            <div className="why-card-content">
              <h3 className="why-card-title">Low Freight Overhead</h3>
              <p className="why-card-desc">
                Only {typeof bestMandi.estimated_road_distance_km === 'number' ? bestMandi.estimated_road_distance_km.toFixed(1) : bestMandi.estimated_road_distance_km} km road distance from your origin, reducing transport cost (₹{formatIndianNumber(bestMandi.transport_expense)}).
              </p>
            </div>
          </div>

          {/* Card 3: High Trading Volume */}
          <div className="why-card">
            <div className="why-card-icon-wrap">
              <TrendingUp size={22} className="why-card-icon" />
            </div>
            <div className="why-card-content">
              <h3 className="why-card-title">High Trading Volume</h3>
              <p className="why-card-desc">
                {bestMandi.arrival_quantity_tonnes ? (
                  <>
                    {bestMandi.arrival_quantity_tonnes} tonnes ({(bestMandi.arrival_quantity_tonnes * 10).toFixed(0)} quintals) guarantees fast auction clearance.
                  </>
                ) : (
                  <>
                    Consistent daily auction trading volume guarantees active buyer competition and quick clearance.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* 8. Disclaimer & Assumptions Callout Box */}
        <div className="report-disclaimer-panel">
          <div className="disclaimer-icon-wrap">
            <Info size={18} className="disclaimer-info-icon" />
          </div>
          <div className="disclaimer-text">
            <strong>Important Disclaimer &amp; Assumptions:</strong> Calculations are deterministic mathematical estimates based on observed Agmarknet auction modal prices, standard road curvature freight metrics, and statutory APMC costs. Actual realized earnings may vary based on physical crop quality grading and same-day auction dynamics.
          </div>
        </div>

        {/* 9. Bottom Agricultural Landscape Illustration */}
        <AgriculturalLandscapeFooter style={{ marginTop: 18 }} />
      </div>
    </div>
  );
}
