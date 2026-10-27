import React from 'react';
import {
  Printer,
  Download,
  ArrowLeft,
  Wheat,
  MapPin,
  Calendar,
  Layers,
  Settings,
  Info,
  CheckCircle2,
  AlertTriangle,
  MinusCircle,
  HelpCircle,
  TrendingUp,
  Coins,
  Truck,
  FileText,
  User,
  Phone,
  ShieldCheck,
  Clock,
  Building2
} from 'lucide-react';
import AgriculturalLandscapeFooter from './AgriculturalLandscapeFooter';

/**
 * Indian currency comma formatting (e.g. 1,05,000)
 */
function formatIndian(val) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const rounded = Math.round(Number(val));
  const s = rounded.toString();
  if (s.length <= 3) return s;
  const last3 = s.substring(s.length - 3);
  const rest = s.substring(0, s.length - 3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
}

export default function MasterReportLayout({
  docType = 'market_comparison', // 'market_comparison' | 'profit_loss' | 'crop_loss' | 'insurance_checklist' | 'complaint_status' | 'blank_complaint' | 'blank_crop_loss'
  lang = 'en',
  title,
  subtitle,
  metadata = [], // Array of { label, value, icon, strong, highlight }
  plStatus, // { outcome: 'PROFIT' | 'LOSS' | 'BREAK_EVEN' | 'INCOMPLETE', amount: 102790, label_en: '...', label_kn: '...' }
  sections = [], // Array of section objects
  tableData = null, // { headers: [], rows: [] }
  highlightCards = [], // Array of { title, desc, icon: 'coins' | 'truck' | 'volume' | 'alert' | 'shield' }
  disclaimerText,
  onClose,
  showActions = true,
  children
}) {
  const isKn = lang === 'kn';

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    if (!tableData || !tableData.rows || tableData.rows.length === 0) {
      alert(isKn ? 'ರಫ್ತು ಮಾಡಲು ಯಾವುದೇ ಕೋಷ್ಟಕ ಡೇಟಾ ಇಲ್ಲ.' : 'No tabular data available to export.');
      return;
    }
    const headers = tableData.headers.map(h => `"${h.label}"`).join(',');
    const rows = tableData.rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + headers + '\n' + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FarmPrice_Report_${docType}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Outcome banner computation
  const renderPlBanner = () => {
    if (!plStatus || !plStatus.outcome) return null;
    const outcome = plStatus.outcome.toUpperCase();
    let bannerClass = 'pl-status-profit';
    let SymbolIcon = CheckCircle2;
    let defaultTitle = isKn ? 'ಅಭಿನಂದನೆಗಳು — ನೀವು ಲಾಭದಲ್ಲಿದ್ದೀರಿ' : 'CONGRATULATIONS — YOU ARE IN PROFIT';

    if (outcome === 'LOSS') {
      bannerClass = 'pl-status-loss';
      SymbolIcon = AlertTriangle;
      defaultTitle = isKn ? 'ಎಚ್ಚರಿಕೆ — ಅಂದಾಜು ನಷ್ಟ' : 'WARNING — ESTIMATED LOSS';
    } else if (outcome === 'BREAK_EVEN') {
      bannerClass = 'pl-status-break-even';
      SymbolIcon = MinusCircle;
      defaultTitle = isKn ? 'ಸಮಸ್ಥಿತಿ — ಲಾಭವೂ ಇಲ್ಲ, ನಷ್ಟವೂ ಇಲ್ಲ' : 'BREAK-EVEN — NO ESTIMATED PROFIT OR LOSS';
    } else if (outcome === 'INCOMPLETE') {
      bannerClass = 'pl-status-incomplete';
      SymbolIcon = HelpCircle;
      defaultTitle = isKn ? 'ಲೆಕ್ಕಾಚಾರ ಅಪೂರ್ಣವಾಗಿದೆ' : 'CALCULATION INCOMPLETE';
    }

    const titleText = isKn ? (plStatus.label_kn || defaultTitle) : (plStatus.label_en || defaultTitle);

    return (
      <div className={`report-pl-indicator-banner ${bannerClass}`}>
        <div className="pl-indicator-left">
          <SymbolIcon size={20} className="pl-indicator-symbol" />
          <span className="pl-indicator-title">{titleText}</span>
        </div>
        {plStatus.amount !== undefined && plStatus.amount !== null && (
          <div className="pl-indicator-amount">
            ₹{formatIndian(plStatus.amount)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="market-comparison-report-wrapper">
      {/* Action Bar (Screen Only) */}
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
                <span>{isKn ? 'ಹಿಂದಕ್ಕೆ' : 'Back'}</span>
              </button>
            )}
            <span style={{ fontSize: 13, fontWeight: 700, color: '#113826' }}>
              FARMPRICE AI — {isKn ? 'ಅಧಿಕೃತ ಕೃಷಿ ವರದಿ' : 'Official Agricultural Intelligence Report'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="btn-secondary"
              onClick={handlePrint}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
            >
              <Printer size={14} />
              <span>{isKn ? 'ಮುದ್ರಿಸು / PDF ಉಳಿಸು' : 'Print / Save PDF'}</span>
            </button>

            {tableData && tableData.rows && tableData.rows.length > 0 && (
              <button
                className="btn-secondary"
                onClick={handleExportCsv}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
              >
                <Download size={14} />
                <span>{isKn ? 'CSV ರಫ್ತು' : 'Export CSV'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Document Sheet */}
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
              {isKn ? 'ಊಹಿಸಿ • ಹೋಲಿಸಿ • ಉತ್ತಮ ಬೆಲೆ ಪಡೆಯಿರಿ' : 'Predict • Compare • Get Better Prices'}
            </div>
          </div>

          {/* Top-Right: Slogan & Leaf Emblem */}
          <div className="report-branding-right">
            <div className="report-slogan">
              <em>{isKn ? 'ಸಮೃದ್ಧ ಕೃಷಿಗಾಗಿ ಜಾಣ್ಮೆಯ ನಿರ್ಧಾರಗಳು' : <>Smarter Decisions<br />for a Prosperous Farm</>}</em>
            </div>
            <div className="report-leaf-badge">
              <svg width="44" height="52" viewBox="0 0 44 52" fill="none">
                <path d="M4 48 C 6 22, 24 4, 42 2 C 44 26, 28 48, 4 48 Z" fill="#22C55E" />
                <path d="M6 46 C 8 26, 22 10, 38 6 C 36 28, 22 44, 6 46 Z" fill="#15803D" opacity="0.25" />
                <path d="M6 46 Q 22 24 38 6" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
                <path d="M16 32 Q 22 34 26 38" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
                <path d="M22 24 Q 28 26 32 30" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
              </svg>
            </div>
          </div>
        </header>

        {/* 2. Document Title Section */}
        <section className="report-title-section">
          <h1 className="report-main-title">
            {title || (isKn ? 'ಮಾರುಕಟ್ಟೆ ಬೆಲೆ ಹೋಲಿಕೆ ಮತ್ತು ವಿಶ್ಲೇಷಣೆ' : <>Market Price Comparison &amp; Anal<span className="accent-red-i">I</span>ysis</>)}
          </h1>
          {subtitle && (
            <p className="report-subtitle">{subtitle}</p>
          )}
          <div className="report-accent-line" />
        </section>

        {/* 3. Top Compact P&L Outcome Banner (if supplied) */}
        {renderPlBanner()}

        {/* 4. Metadata Summary Box (Pale-Green) */}
        {metadata && metadata.length > 0 && (
          <section className="report-summary-panel">
            <div className="summary-col">
              {metadata.slice(0, Math.ceil(metadata.length / 2)).map((item, idx) => (
                <div key={idx} className={`summary-item ${item.highlight ? 'highlight-best' : ''}`}>
                  {item.icon || <Wheat size={16} className="summary-icon" />}
                  <span className="summary-label">{item.label}:</span>
                  <span className={`summary-value ${item.strong ? 'strong' : ''}`}>{item.value}</span>
                </div>
              ))}
            </div>

            <div className="summary-divider-v" />

            <div className="summary-col">
              {metadata.slice(Math.ceil(metadata.length / 2)).map((item, idx) => (
                <div key={idx} className={`summary-item ${item.highlight ? 'highlight-best' : ''}`}>
                  {item.icon || <Calendar size={16} className="summary-icon" />}
                  <span className="summary-label">{item.label}:</span>
                  <span className={`summary-value ${item.strong ? 'strong' : ''}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Custom Body or Injected Content */}
        {children}

        {/* 5. Standardized Tabular Content (if supplied) */}
        {tableData && tableData.headers && tableData.headers.length > 0 && (
          <div style={{ marginTop: 20 }}>
            {tableData.title && (
              <div className="report-section-header">
                <div className="section-title-wrap">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="section-leaf-icon">
                    <path d="M3 21 C 4 10, 12 3, 21 2 C 22 13, 14 21, 3 21 Z" fill="#15803D" />
                    <path d="M4 20 Q 12 11 20 3" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  <h2>{tableData.title}</h2>
                </div>
                <div className="section-divider-line" />
              </div>
            )}

            <div className="report-table-container">
              <table className="report-comparison-table">
                <thead>
                  <tr>
                    {tableData.headers.map((h, i) => (
                      <th key={i} style={{ width: h.width || 'auto', textAlign: h.align || 'left' }}>
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.rows.map((row, rIdx) => {
                    const isBest = row._isBest || rIdx === 0;
                    return (
                      <tr key={rIdx} className={isBest ? 'row-best-mandi' : rIdx % 2 === 1 ? 'row-alt' : ''}>
                        {row.map((cell, cIdx) => {
                          const align = tableData.headers[cIdx]?.align || 'left';
                          return (
                            <td key={cIdx} style={{ textAlign: align }}>
                              {cell}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {(!tableData.rows || tableData.rows.length === 0) && (
                    <tr>
                      <td colSpan={tableData.headers.length} style={{ textAlign: 'center', padding: '24px', color: '#5A6A60' }}>
                        {isKn ? 'ಯಾವುದೇ ವಿವರಗಳು ಲಭ್ಯವಿಲ್ಲ' : 'No entries available'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 6. Highlight Cards (e.g. "Why This Market?" or "Key Assessment Points") */}
        {highlightCards && highlightCards.length > 0 && (
          <div style={{ marginTop: 22 }}>
            <div className="report-section-header">
              <div className="section-title-wrap">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="section-leaf-icon">
                  <path d="M3 21 C 4 10, 12 3, 21 2 C 22 13, 14 21, 3 21 Z" fill="#15803D" />
                  <path d="M4 20 Q 12 11 20 3" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <h2>{isKn ? 'ಪ್ರಮುಖ ಮೌಲ್ಯಮಾಪನ ಅಂಶಗಳು' : 'Key Assessment Highlights'}</h2>
              </div>
              <div className="section-divider-line" />
            </div>

            <div className="why-market-cards-grid">
              {highlightCards.map((card, i) => {
                let CardIcon = Coins;
                if (card.icon === 'truck') CardIcon = Truck;
                else if (card.icon === 'volume' || card.icon === 'trend') CardIcon = TrendingUp;
                else if (card.icon === 'shield') CardIcon = ShieldCheck;
                else if (card.icon === 'clock') CardIcon = Clock;
                else if (card.icon === 'building') CardIcon = Building2;

                return (
                  <div key={i} className="why-card">
                    <div className="why-card-icon-wrap">
                      <CardIcon size={22} className="why-card-icon" />
                    </div>
                    <div className="why-card-content">
                      <h3 className="why-card-title">{card.title}</h3>
                      <p className="why-card-desc">{card.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 7. Disclaimer Panel */}
        <div className="report-disclaimer-panel" style={{ marginTop: 18 }}>
          <div className="disclaimer-icon-wrap">
            <Info size={18} className="disclaimer-info-icon" />
          </div>
          <div className="disclaimer-text">
            <strong>{isKn ? 'ಪ್ರಮುಖ ಹಕ್ಕುತ್ಯಾಗ ಮತ್ತು ಷರತ್ತುಗಳು:' : 'Important Disclaimer & Assumptions:'} </strong>
            {disclaimerText || (isKn
              ? 'ಲೆಕ್ಕಾಚಾರಗಳು Agmarknet ಹರಾಜು ಬೆಲೆಗಳು, ಸಾರಿಗೆ ದೂರ ಮತ್ತು APMC ಕಡ್ಡಾಯ ಶುಲ್ಕಗಳ ಆಧಾರದ ಮೇಲೆ ಅಂದಾಜು ಮಾಡಲಾಗಿದೆ. ವಾಸ್ತವಿಕ ಬೆಲೆಗಳು ಬೆಳೆ ಗುಣಮಟ್ಟ ಮತ್ತು ಮಾರುಕಟ್ಟೆ ಪರಿಸ್ಥಿತಿಗಳಿಗೆ ಅನುಗುಣವಾಗಿ ಬದಲಾಗಬಹುದು.'
              : 'Calculations are deterministic mathematical estimates based on observed Agmarknet auction modal prices, standard road curvature freight metrics, and statutory APMC costs. Actual realized earnings may vary based on physical crop quality grading and same-day auction dynamics.')}
          </div>
        </div>

        {/* 8. Bottom Agricultural Landscape Illustration */}
        <AgriculturalLandscapeFooter style={{ marginTop: 18 }} />
      </div>
    </div>
  );
}
