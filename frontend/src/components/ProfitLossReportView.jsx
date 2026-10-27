import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Coins,
  Truck,
  Layers,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  MinusCircle,
  HelpCircle,
  Download,
  Printer,
  RefreshCw,
  FileText,
  DollarSign,
  ArrowRight,
  Info,
  Clock,
  History
} from 'lucide-react';
import { calculateProfitLoss, fetchProfitLossHistory } from '../services/api';
import MasterReportLayout from './MasterReportLayout';

function formatIndian(val) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const rounded = Math.round(Number(val));
  const s = rounded.toString();
  if (s.length <= 3) return s;
  const last3 = s.substring(s.length - 3);
  const rest = s.substring(0, s.length - 3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
}

export default function ProfitLossReportView({ lang = 'en', t, userInfo }) {
  const isKn = lang === 'kn';
  const [activeTab, setActiveTab] = useState('calculate'); // 'calculate' | 'history'

  // Input states
  const [cropName, setCropName] = useState('Tomato');
  const [varietyName, setVarietyName] = useState('Hybrid Shivam');
  const [originName, setOriginName] = useState('Hassan, Karnataka');
  const [mandiName, setMandiName] = useState('Hassan APMC');
  const [quantity, setQuantity] = useState(50.0);
  const [salePrice, setSalePrice] = useState(2100.0);
  const [roadDistKm, setRoadDistKm] = useState(2.0);
  const [transportRate, setTransportRate] = useState(0.85);
  const [loadingRate, setLoadingRate] = useState(8.0);
  const [cessPercent, setCessPercent] = useState(1.5);
  const [weighingRate, setWeighingRate] = useState(3.0);
  const [productionCostPerQ, setProductionCostPerQ] = useState(1200.0);

  const [calculating, setCalculating] = useState(false);
  const [calcResult, setCalcResult] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Master Report preview state
  const [showMasterReport, setShowMasterReport] = useState(false);

  const runCalculation = async () => {
    setCalculating(true);
    try {
      const payload = {
        farmer_name: userInfo?.name || 'Chethan P',
        crop_name: cropName,
        variety_name: varietyName,
        origin_name: originName,
        mandi_name: mandiName,
        quantity: parseFloat(quantity) || 50.0,
        unit: 'Quintals',
        sale_price_per_q: parseFloat(salePrice) || 2100.0,
        road_distance_km: parseFloat(roadDistKm) || 2.0,
        transport_rate_per_km_per_q: parseFloat(transportRate) || 0.85,
        loading_unloading_per_q: parseFloat(loadingRate) || 8.0,
        apmc_cess_percent: parseFloat(cessPercent) || 1.5,
        weighing_fee_per_q: parseFloat(weighingRate) || 3.0,
        production_cost_per_q: parseFloat(productionCostPerQ) || 0.0
      };
      const res = await calculateProfitLoss(payload);
      setCalcResult(res.data);
    } catch (err) {
      alert(err.message || 'Calculation failed');
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    runCalculation();
  }, []);

  const loadHistory = () => {
    setLoadingHistory(true);
    fetchProfitLossHistory()
      .then(res => setHistoryList(res))
      .catch(err => console.error(err))
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  // Master Report Renderer
  if (showMasterReport && calcResult) {
    const isProfit = calcResult.outcome === 'PROFIT';
    return (
      <MasterReportLayout
        docType="profit_loss"
        lang={lang}
        title={isKn ? 'ಕೃಷಿ ಲಾಭ ಮತ್ತು ನಷ್ಟದ ವಿವರವಾದ ವರದಿ' : 'Agricultural Profit & Loss Detailed Statement'}
        subtitle={isKn ? 'ನೈಜ ಮಾರುಕಟ್ಟೆ ವಹಿವಾಟು, ಸಾರಿಗೆ ವೆಚ್ಚ ಮತ್ತು ನಿವ್ವಳ ಆದಾಯದ ಲೆಕ್ಕಾಚಾರ' : 'Deterministic Transaction Outcome, Cost Breakdown & Take-Home Analysis'}
        plStatus={{
          outcome: calcResult.outcome,
          amount: calcResult.net_profit_after_production != null ? calcResult.net_profit_after_production : calcResult.estimated_net_return,
          label_en: calcResult.outcome_banner_en,
          label_kn: calcResult.outcome_banner_kn
        }}
        metadata={[
          { label: isKn ? 'ರೈತರ ಹೆಸರು' : 'Farmer Name', value: userInfo?.name || 'Chethan P', strong: true },
          { label: isKn ? 'ಬೆಳೆ & ತಳಿ' : 'Crop & Variety', value: `${cropName} (${varietyName})` },
          { label: isKn ? 'ಮೂಲ ಸ್ಥಳ' : 'Origin', value: originName },
          { label: isKn ? 'ಗಮ್ಯಸ್ಥಾನ APMC' : 'Destination Mandi', value: mandiName, highlight: true },
          { label: isKn ? 'ಮಾರಾಟ ಪ್ರಮಾಣ' : 'Sale Quantity', value: `${quantity} Quintals` },
          { label: isKn ? 'ಹರಾಜು ದರ' : 'Auction Rate', value: `₹${formatIndian(salePrice)} / q`, strong: true },
          { label: isKn ? 'ಸಾರಿಗೆ ದೂರ' : 'Road Distance', value: `${roadDistKm} km` },
          { label: isKn ? 'ದಿನಾಂಕ' : 'Report Date', value: new Date().toISOString().slice(0, 10) }
        ]}
        tableData={{
          title: isKn ? 'ಆದಾಯ ಮತ್ತು ಖರ್ಚುಗಳ ಸಮಗ್ರ ಲೆಕ್ಕಾಚಾರ' : 'Financial Revenue & Expenditure Breakdown',
          headers: [
            { label: isKn ? 'ವಿವರ' : 'Particulars', width: '40%', align: 'left' },
            { label: isKn ? 'ದರ / ಸೂತ್ರ' : 'Rate / Metric', width: '25%', align: 'center' },
            { label: isKn ? 'ಮೊತ್ತ (ರೂ)' : 'Amount (₹)', width: '35%', align: 'right' }
          ],
          rows: [
            [
              isKn ? 'ಒಟ್ಟು ಮಾರಾಟ ಆದಾಯ (Gross Revenue)' : 'Gross Sale Revenue (Qty × Price)',
              `${quantity} q × ₹${formatIndian(salePrice)}`,
              `₹${formatIndian(calcResult.gross_revenue)}`
            ],
            [
              isKn ? 'ಸಾರಿಗೆ ವೆಚ್ಚ (Transport Freight)' : 'Transport Freight Overhead',
              `${roadDistKm} km @ ₹${transportRate}/km/q`,
              `₹${formatIndian(calcResult.transport_expense)}`
            ],
            [
              isKn ? 'APMC ಕಡ್ಡಾಯ ಶುಲ್ಕ (Market Cess)' : 'Statutory APMC Market Cess',
              `${cessPercent}% of Gross Revenue`,
              `₹${formatIndian(calcResult.apmc_cess)}`
            ],
            [
              isKn ? 'ಹೇರುವ / ಇಳಿಸುವ ವೆಚ್ಚ (Hamali)' : 'Loading & Unloading Fees',
              `₹${loadingRate} per quintal`,
              `₹${formatIndian(calcResult.loading_unloading)}`
            ],
            [
              isKn ? 'ತೂಕದ ಶುಲ್ಕ (Weighment)' : 'Weighing & Yard Fees',
              `₹${weighingRate} per quintal`,
              `₹${formatIndian(calcResult.weighing_fee)}`
            ],
            [
              <strong>{isKn ? 'ಒಟ್ಟು ಮಾರಾಟ ವೆಚ್ಚಗಳು (Total Selling Expenses)' : 'Total Selling & Handling Expenses'}</strong>,
              'Freight + Cess + Hamali + Weighing',
              <strong style={{ color: '#D97706' }}>₹{formatIndian(calcResult.total_expenses)}</strong>
            ],
            [
              <strong>{isKn ? 'ಅಂದಾಜು ನಿವ್ವಳ ವರಮಾನ (Take-home Net Return)' : 'Estimated Net Realization (Take-Home)'}</strong>,
              'Gross Revenue - Expenses',
              <strong style={{ color: '#059669', fontSize: 14 }}>₹{formatIndian(calcResult.estimated_net_return)}</strong>
            ],
            ...(productionCostPerQ > 0 ? [
              [
                isKn ? 'ಕೃಷಿ / ಉತ್ಪಾದನಾ ವೆಚ್ಚ (Cultivation Cost)' : 'Cultivation / Production Cost',
                `${quantity} q × ₹${formatIndian(productionCostPerQ)}`,
                `₹${formatIndian(calcResult.total_production_cost)}`
              ],
              [
                <strong>{isKn ? 'ನಿಜವಾದ ನಿವ್ವಳ ಲಾಭ / ನಷ್ಟ (True Profit After Production)' : 'True Net Profit (After Production Cost)'}</strong>,
                'Net Realization - Cultivation Cost',
                <strong style={{ color: isProfit ? '#059669' : '#DC2626', fontSize: 15 }}>₹{formatIndian(calcResult.net_profit_after_production)}</strong>
              ]
            ] : [])
          ]
        }}
        highlightCards={[
          {
            title: isKn ? 'ಕ್ವಿಂಟಾಲ್‌ಗೆ ನಿವ್ವಳ ಆದಾಯ' : 'Net Realization per Quintal',
            desc: `₹${formatIndian(calcResult.net_return_per_quintal)} ${isKn ? 'ಪ್ರತಿ ಕ್ವಿಂಟಾಲ್‌ಗೆ ರೈತರ ಕೈಸೇರುವ ನಿವ್ವಳ ಹಣ.' : 'net realized per quintal after deducting transit & handling fees.'}`,
            icon: 'coins'
          },
          {
            title: isKn ? 'ಸಮಸ್ಥಿತಿ ಬೆಲೆ (Break-Even)' : 'Break-Even Minimum Price',
            desc: `₹${formatIndian(calcResult.break_even_price_per_q)} ${isKn ? 'ನಷ್ಟವಾಗದಂತೆ ಮಾರಾಟ ಮಾಡಬೇಕಾದ ಕನಿಷ್ಠ ಬೆಲೆ.' : '/ q minimum auction price required to cover all transaction costs.'}`,
            icon: 'trend'
          },
          {
            title: isKn ? 'ಸಾರಿಗೆ ವೆಚ್ಚದ ಪಾಲು' : 'Freight Efficiency Ratio',
            desc: `${((calcResult.total_expenses / (calcResult.gross_revenue || 1)) * 100).toFixed(1)}% ${isKn ? 'ಒಟ್ಟು ಆದಾಯದಲ್ಲಿ ಮಾರಾಟ ವೆಚ್ಚದ ಶೇಕಡಾವಾರು ಪ್ರಮಾಣ.' : 'of gross revenue utilized for marketing and transit fees.'}`,
            icon: 'truck'
          }
        ]}
        onClose={() => setShowMasterReport(false)}
      />
    );
  }

  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div className="dashboard-content" style={{ maxWidth: 1240, margin: '0 auto', padding: '1.25rem 1rem' }}>
      
      {/* 1. Header Banner matching Reference Template */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 46,
            height: 46,
            borderRadius: 12,
            background: '#DCFCE7',
            color: '#15803D',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(22, 163, 74, 0.12)'
          }}>
            <TrendingUp size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F3A24', margin: 0, letterSpacing: '-0.3px' }}>
                {isKn ? 'ಲಾಭ ಮತ್ತು ನಷ್ಟ' : 'Profit & Loss'}
              </h1>
              <span style={{
                background: '#DCFCE7',
                color: '#166534',
                border: '1px solid #BBF7D0',
                padding: '2.5px 10px',
                borderRadius: 9999,
                fontSize: 11.5,
                fontWeight: 700
              }}>
                {isKn ? 'ಹಣಕಾಸು ಲೆಕ್ಕಾಚಾರ' : 'Financial Calculator'}
              </span>
            </div>
            <p style={{ fontSize: 13.5, color: '#4B6354', margin: '4px 0 0 0' }}>
              {isKn
                ? 'ನಿಮ್ಮ ಮಾರಾಟ ವೆಚ್ಚಗಳು, ಅಂದಾಜು ಆದಾಯ ಮತ್ತು ಅಂತಿಮ ಹಣಕಾಸು ಫಲಿತಾಂಶವನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಿ.'
                : 'Understand your selling costs, estimated returns and financial outcome.'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Navigation Pill Tabs */}
      <div className="fp-pill-tabs">
        <button
          className={`fp-tab-pill-btn ${activeTab === 'calculate' ? 'active' : ''}`}
          onClick={() => setActiveTab('calculate')}
        >
          <Coins size={16} />
          <span>{isKn ? 'ಲಾಭ-ನಷ್ಟ ಲೆಕ್ಕಾಚಾರ' : 'P&L Calculator'}</span>
        </button>

        <button
          className={`fp-tab-pill-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={16} />
          <span>{isKn ? 'ಉಳಿಸಿದ ಇತಿಹಾಸ' : 'Saved Calculation History'}</span>
        </button>
      </div>

      {/* 3. Main Two-Column Layout */}
      {activeTab === 'calculate' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(330px, 1fr) minmax(360px, 1.15fr)', gap: 24, alignItems: 'start' }}>
          
          {/* ================= LEFT COLUMN: PARAMETERS CARD ================= */}
          <div className="fp-card-box" style={{ padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#EDF7F1',
                color: '#15803D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Coins size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: 16.5, fontWeight: 800, color: '#0F3A24', margin: 0 }}>
                  {isKn ? 'ಮಾರಾಟ ಮತ್ತು ವೆಚ್ಚದ ಮಾನದಂಡಗಳು' : 'Sale & Cost Parameters'}
                </h2>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  {isKn ? 'ನಿಮ್ಮ ಅಂದಾಜು ಲಾಭ ಅಥವಾ ನಷ್ಟವನ್ನು ಲೆಕ್ಕಹಾಕಲು ಕೆಳಗಿನ ವಿವರಗಳನ್ನು ನಮೂದಿಸಿ.' : 'Enter the details below to calculate your estimated profit or loss.'}
                </div>
              </div>
            </div>

            {/* Subsection 1: Crop and Sale Details */}
            <div className="fp-section-pill-header">
              <span style={{ fontSize: 15 }}>🌱</span>
              <span>{isKn ? '1. ಬೆಳೆ ಮತ್ತು ಮಾರಾಟದ ವಿವರಗಳು' : '1. Crop and Sale Details'}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="fp-field-label">
                  {isKn ? 'ಬೆಳೆಯ ಹೆಸರು' : 'Crop Name'} <span className="required-star">*</span>
                </label>
                <select
                  value={cropName}
                  onChange={(e) => setCropName(e.target.value)}
                  className="fp-select-control"
                >
                  <option value="Tomato">Tomato</option>
                  <option value="Onion">Onion</option>
                  <option value="Potato">Potato</option>
                  <option value="Paddy (Dhan)">Paddy</option>
                  <option value="Maize">Maize</option>
                  <option value="Ragi">Ragi</option>
                  <option value="Chilli">Chilli</option>
                  <option value="Cotton">Cotton</option>
                  <option value="Banana">Banana</option>
                  <option value="Ginger">Ginger</option>
                </select>
              </div>

              <div>
                <label className="fp-field-label">
                  {isKn ? 'ತಳಿ' : 'Variety'} <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  value={varietyName}
                  onChange={(e) => setVarietyName(e.target.value)}
                  className="fp-input-control"
                  placeholder="e.g. Hybrid Shivam"
                />
              </div>

              <div>
                <label className="fp-field-label">
                  {isKn ? 'ಪ್ರಮಾಣ (ಕ್ವಿಂಟಾಲ್)' : 'Quantity (q)'} <span className="required-star">*</span>
                </label>
                <div className="fp-input-addon-wrapper">
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                  <span className="fp-input-addon-tag">q (quintals)</span>
                </div>
              </div>

              <div>
                <label className="fp-field-label">
                  {isKn ? 'ನಿರೀಕ್ಷಿತ ಬೆಲೆ (ರೂ/ಕ್ವಿ)' : 'Expected Price (₹/q)'} <span className="required-star">*</span>
                </label>
                <div className="fp-input-addon-wrapper">
                  <input
                    type="number"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                  />
                  <span className="fp-input-addon-tag">₹/q</span>
                </div>
              </div>
            </div>

            {/* Subsection 2: Transportation and Market Expenses */}
            <div className="fp-section-pill-header" style={{ marginTop: 18 }}>
              <span style={{ fontSize: 15 }}>🚛</span>
              <span>{isKn ? '2. ಸಾರಿಗೆ ಮತ್ತು ಮಾರುಕಟ್ಟೆ ವೆಚ್ಚಗಳು' : '2. Transportation and Market Expenses'}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="fp-field-label">
                  {isKn ? 'ರಸ್ತೆ ದೂರ (ಕಿ.ಮೀ)' : 'Road Distance (km)'} <span className="required-star">*</span>
                </label>
                <div className="fp-input-addon-wrapper">
                  <input
                    type="number"
                    value={roadDistKm}
                    onChange={(e) => setRoadDistKm(e.target.value)}
                  />
                  <span className="fp-input-addon-tag">km</span>
                </div>
              </div>

              <div>
                <label className="fp-field-label">
                  {isKn ? 'ಸಾರಿಗೆ ದರ (ರೂ/ಕಿಮೀ/ಕ್ವಿ)' : 'Freight (₹/km/q)'} <span className="required-star">*</span>
                </label>
                <div className="fp-input-addon-wrapper">
                  <input
                    type="number"
                    step="0.05"
                    value={transportRate}
                    onChange={(e) => setTransportRate(e.target.value)}
                  />
                  <span className="fp-input-addon-tag">₹/km/q</span>
                </div>
              </div>

              <div>
                <label className="fp-field-label">
                  {isKn ? 'APMC ಸೆಸ್ (%)' : 'APMC Cess (%)'} <span className="required-star">*</span>
                </label>
                <div className="fp-input-addon-wrapper">
                  <input
                    type="number"
                    step="0.1"
                    value={cessPercent}
                    onChange={(e) => setCessPercent(e.target.value)}
                  />
                  <span className="fp-input-addon-tag">%</span>
                </div>
              </div>

              <div>
                <label className="fp-field-label">
                  {isKn ? 'ಹೇರುವಿಕೆ & ಹಮಾಲಿ' : 'Loading & Hamali (₹/q)'} <span className="required-star">*</span>
                </label>
                <div className="fp-input-addon-wrapper">
                  <input
                    type="number"
                    value={loadingRate}
                    onChange={(e) => setLoadingRate(e.target.value)}
                  />
                  <span className="fp-input-addon-tag">₹/q</span>
                </div>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label className="fp-field-label">
                  {isKn ? 'ತೂಕ ಶುಲ್ಕ (ರೂ)' : 'Weighing Fee (₹)'} <span className="required-star">*</span>
                </label>
                <div className="fp-input-addon-wrapper">
                  <input
                    type="number"
                    value={weighingRate}
                    onChange={(e) => setWeighingRate(e.target.value)}
                  />
                  <span className="fp-input-addon-tag">₹</span>
                </div>
              </div>
            </div>

            {/* Subsection 3: Production Expenses */}
            <div className="fp-section-pill-header" style={{ marginTop: 18, marginBottom: 4 }}>
              <span style={{ fontSize: 15 }}>🌱</span>
              <span>{isKn ? '3. ಕೃಷಿ ಉತ್ಪಾದನಾ ವೆಚ್ಚಗಳು' : '3. Production Expenses'}</span>
            </div>
            <div style={{ fontSize: 11.5, color: '#64748B', marginBottom: 12 }}>
              {isKn ? 'ಐಚ್ಛಿಕ — ಕೃಷಿ ಉತ್ಪಾದನಾ ವೆಚ್ಚವನ್ನು ಸೇರಿಸಲು ಬಯಸಿದರೆ ನಮೂದಿಸಿ.' : 'Optional — Enter if you want to include cultivation/production cost.'}
            </div>

            <div>
              <label className="fp-field-label">
                {isKn ? 'ಉತ್ಪಾದನಾ / ಕೃಷಿ ವೆಚ್ಚ (ರೂ/ಕ್ವಿಂಟಾಲ್)' : 'Cultivation / Production Cost (₹/q)'}
              </label>
              <div className="fp-input-addon-wrapper">
                <input
                  type="number"
                  value={productionCostPerQ}
                  onChange={(e) => setProductionCostPerQ(e.target.value)}
                  placeholder="e.g. 1200"
                />
                <span className="fp-input-addon-tag">₹/q</span>
              </div>
            </div>

            {/* Submit Update Button */}
            <button
              className="fp-btn-primary"
              onClick={runCalculation}
              disabled={calculating}
              style={{ width: '100%', marginTop: 20, padding: '12px' }}
            >
              <RefreshCw size={15} className={calculating ? 'spin-icon' : ''} />
              <span>{calculating ? (isKn ? 'ಲೆಕ್ಕಹಾಕಲಾಗುತ್ತಿದೆ...' : 'Recalculating...') : (isKn ? 'ಮರು ಲೆಕ್ಕಾಚಾರ ಮಾಡಿ' : 'Update Calculation')}</span>
            </button>
          </div>

          {/* ================= RIGHT COLUMN: OUTCOME & BREAKDOWN ================= */}
          <div>
            {calcResult && (
              <>
                {/* 1. Status Banner */}
                {calcResult.outcome === 'PROFIT' ? (
                  <div className="fp-status-banner-profit">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="fp-status-badge-profit">
                        <CheckCircle2 size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#065F46', letterSpacing: '0.2px' }}>
                          {isKn ? 'ಅಭಿನಂದನೆಗಳು — ನೀವು ಲಾಭದಲ್ಲಿದ್ದೀರಿ' : 'CONGRATULATIONS — YOU ARE IN PROFIT'}
                        </div>
                        <div style={{ fontSize: 12, color: '#4B6354', marginTop: 2 }}>
                          {isKn ? 'ನಿಮ್ಮ ಅಂದಾಜು ನಿವ್ವಳ ಲಾಭವು ಶೂನ್ಯಕ್ಕಿಂತ ಹೆಚ್ಚಾಗಿದೆ.' : 'Your estimated net profit is greater than zero.'}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#065F46' }}>
                        {isKn ? 'ನಿವ್ವಳ ಲಾಭ' : 'Net Profit'}
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
                        ₹{formatIndian(calcResult.net_profit_after_production != null ? calcResult.net_profit_after_production : calcResult.estimated_net_return)}
                        <span style={{ fontSize: 18 }}>↗</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="fp-status-banner-loss">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="fp-status-badge-loss">
                        <AlertTriangle size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#991B1B', letterSpacing: '0.2px' }}>
                          {isKn ? 'ಗಮನಿಸಿ — ಅಂದಾಜು ನಷ್ಟ ಪತ್ತೆಯಾಗಿದೆ' : 'ATTENTION — ESTIMATED LOSS DETECTED'}
                        </div>
                        <div style={{ fontSize: 12, color: '#7F1D1D', marginTop: 2 }}>
                          {isKn ? 'ಮಾರಾಟ ಮತ್ತು ಕೃಷಿ ವೆಚ್ಚಗಳು ಒಟ್ಟು ಆದಾಯಕ್ಕಿಂತ ಹೆಚ್ಚಿವೆ.' : 'Total selling and production costs exceed gross revenue.'}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#991B1B' }}>
                        {isKn ? 'ನಿವ್ವಳ ನಷ್ಟ' : 'Net Loss'}
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
                        ₹{formatIndian(Math.abs(calcResult.net_profit_after_production != null ? calcResult.net_profit_after_production : calcResult.estimated_net_return))}
                        <span style={{ fontSize: 18 }}>↘</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Three Metric Cards in a Row */}
                <div className="fp-metric-card-grid">
                  <div className="fp-metric-card-revenue">
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#DCFCE7', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                      <Coins size={15} />
                    </div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#166534' }}>
                      {isKn ? 'ಒಟ್ಟು ಮಾರಾಟ ಆದಾಯ' : 'Gross Revenue'}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#0F3A24', marginTop: 4 }}>
                      ₹{formatIndian(calcResult.gross_revenue)}
                    </div>
                    <div style={{ fontSize: 10.5, color: '#4B6354', marginTop: 3, lineHeight: 1.35 }}>
                      {isKn ? 'ನಿರೀಕ್ಷಿತ ಪ್ರಮಾಣ ಮತ್ತು ಬೆಲೆಯಿಂದ ಒಟ್ಟು ಮೌಲ್ಯ' : 'Sale value from expected quantity and price'}
                    </div>
                  </div>

                  <div className="fp-metric-card-expenses">
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                      <DollarSign size={15} />
                    </div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#92400E' }}>
                      {isKn ? 'ಒಟ್ಟು ವೆಚ್ಚಗಳು' : 'Total Expenses'}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#B45309', marginTop: 4 }}>
                      ₹{formatIndian(calcResult.total_expenses)}
                    </div>
                    <div style={{ fontSize: 10.5, color: '#78350F', marginTop: 3, lineHeight: 1.35 }}>
                      {isKn ? 'ಸಾರಿಗೆ, ನಿರ್ವಹಣೆ, ಮಾರುಕಟ್ಟೆ ಶುಲ್ಕಗಳು' : 'Transport, handling, market fees, & other costs'}
                    </div>
                  </div>

                  <div className="fp-metric-card-realization">
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#DCFCE7', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                      <Coins size={15} />
                    </div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#166534' }}>
                      {isKn ? 'ನಿವ್ವಳ ಕೈಸೇರುವ ಹಣ' : 'Net Realization'}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#0F3A24', marginTop: 4 }}>
                      ₹{formatIndian(calcResult.estimated_net_return)}
                    </div>
                    <div style={{ fontSize: 10.5, color: '#4B6354', marginTop: 3, lineHeight: 1.35 }}>
                      {isKn ? 'ಎಲ್ಲಾ ಮಾರಾಟ ವೆಚ್ಚಗಳ ನಂತರ ರೈತರ ಕೈಸೇರುವ ಹಣ' : 'After all selling expenses'}
                    </div>
                  </div>
                </div>

                {/* 3. Expense Breakdown Card */}
                <div className="fp-card-box" style={{ marginTop: 16, padding: '20px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: '#EDF7F1', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Coins size={14} />
                    </div>
                    <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0F3A24', margin: 0 }}>
                      {isKn ? 'ವೆಚ್ಚಗಳ ಸಮಗ್ರ ವಿವರ' : 'Expense Breakdown'}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div className="fp-expense-row">
                      <span className="fp-expense-label">
                        <Truck size={14} color="#6B7280" />
                        <span>{isKn ? 'ಸಾರಿಗೆ ವೆಚ್ಚ (₹)' : 'Transportation Freight (₹)'}</span>
                      </span>
                      <span className="fp-expense-val">₹{formatIndian(calcResult.transport_expense)}</span>
                    </div>

                    <div className="fp-expense-row">
                      <span className="fp-expense-label">
                        <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 700, width: 14, textAlign: 'center' }}>%</span>
                        <span>{isKn ? 'APMC ಸೆಸ್ (₹)' : 'APMC Cess (₹)'}</span>
                      </span>
                      <span className="fp-expense-val">₹{formatIndian(calcResult.apmc_cess)}</span>
                    </div>

                    <div className="fp-expense-row">
                      <span className="fp-expense-label">
                        <Layers size={14} color="#6B7280" />
                        <span>{isKn ? 'ಹೇರುವಿಕೆ & ಹಮಾಲಿ (₹)' : 'Loading & Hamali (₹)'}</span>
                      </span>
                      <span className="fp-expense-val">₹{formatIndian(calcResult.loading_unloading)}</span>
                    </div>

                    <div className="fp-expense-row">
                      <span className="fp-expense-label">
                        <HelpCircle size={14} color="#6B7280" />
                        <span>{isKn ? 'ತೂಕ ಶುಲ್ಕ (₹)' : 'Weighing Fee (₹)'}</span>
                      </span>
                      <span className="fp-expense-val">₹{formatIndian(calcResult.weighing_fee)}</span>
                    </div>

                    <div style={{ borderTop: '1px solid #E5E7EB', margin: '6px 0' }} />

                    <div className="fp-expense-row" style={{ fontWeight: 800 }}>
                      <span style={{ color: '#111827', fontWeight: 800 }}>
                        {isKn ? 'ಒಟ್ಟು ಮಾರಾಟ ವೆಚ್ಚಗಳು' : 'Total Selling Expenses'}
                      </span>
                      <span style={{ color: '#111827', fontWeight: 800 }}>
                        ₹{formatIndian(calcResult.total_expenses)}
                      </span>
                    </div>

                    {productionCostPerQ > 0 && (
                      <div className="fp-expense-row">
                        <span className="fp-expense-label">
                          <span style={{ fontSize: 14 }}>🌱</span>
                          <span>{isKn ? 'ಉತ್ಪಾದನಾ ವೆಚ್ಚ (₹)' : 'Production Cost (₹)'}</span>
                        </span>
                        <span className="fp-expense-val">₹{formatIndian(calcResult.total_production_cost)}</span>
                      </div>
                    )}
                  </div>

                  {/* Highlighted Net Profit Panel */}
                  <div className="fp-highlight-profit-box">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: '#DCFCE7', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Coins size={16} />
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#0F3A24' }}>
                        {isKn ? 'ಅಂದಾಜು ನಿವ್ವಳ ಲಾಭ' : 'Estimated Net Profit'}
                      </span>
                    </div>
                    <span style={{ fontSize: 22, fontWeight: 800, color: calcResult.outcome === 'PROFIT' ? '#15803D' : '#DC2626' }}>
                      ₹{formatIndian(calcResult.net_profit_after_production != null ? calcResult.net_profit_after_production : calcResult.estimated_net_return)}
                    </span>
                  </div>

                  {/* Collapsible Calculation Details */}
                  <div style={{ marginTop: 12 }}>
                    <button
                      onClick={() => setDetailsOpen(!detailsOpen)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '6px 0',
                        fontSize: 12.5,
                        color: '#4B5563',
                        fontWeight: 600
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{detailsOpen ? '▴' : '▾'}</span>
                        <span>{isKn ? 'ಲೆಕ್ಕಾಚಾರದ ವಿವರಗಳನ್ನು ವೀಕ್ಷಿಸಿ' : 'View Calculation Details'}</span>
                      </span>
                      <Info size={14} color="#9CA3AF" />
                    </button>

                    {detailsOpen && (
                      <div style={{
                        background: '#F9FAFB',
                        border: '1px solid #E5E7EB',
                        borderRadius: 8,
                        padding: 12,
                        marginTop: 6,
                        fontSize: 12,
                        color: '#4B5563',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{isKn ? 'ಕ್ವಿಂಟಾಲ್‌ಗೆ ನಿವ್ವಳ ಆದಾಯ:' : 'Net Return per Quintal:'}</span>
                          <span style={{ fontWeight: 700, color: '#15803D' }}>₹{formatIndian(calcResult.net_return_per_quintal)}/q</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{isKn ? 'ಕನಿಷ್ಠ ಸಮಸ್ಥಿತಿ ಬೆಲೆ (Break-Even):' : 'Break-Even Selling Price:'}</span>
                          <span style={{ fontWeight: 700, color: '#B45309' }}>₹{formatIndian(calcResult.break_even_price_per_q)}/q</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{isKn ? 'ಸಾರಿಗೆ ದಕ್ಷತೆ ಅನುಪಾತ:' : 'Freight Efficiency Ratio:'}</span>
                          <span style={{ fontWeight: 700 }}>
                            {((calcResult.total_expenses / (calcResult.gross_revenue || 1)) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Action Buttons Row */}
                <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                  <button
                    className="fp-btn-primary"
                    onClick={() => setShowMasterReport(true)}
                    style={{ flex: 1.5, padding: '12px 18px', fontSize: 13.5 }}
                  >
                    <Download size={16} />
                    <span>{isKn ? 'ಲಾಭ-ನಷ್ಟ ವರದಿ ಡೌನ್‌ಲೋಡ್' : 'Download Profit & Loss Report'}</span>
                  </button>

                  <button
                    className="fp-btn-secondary"
                    onClick={() => {
                      setShowMasterReport(true);
                      setTimeout(() => window.print(), 400);
                    }}
                    style={{ flex: 1, padding: '12px 18px', fontSize: 13.5 }}
                  >
                    <Printer size={16} />
                    <span>{isKn ? 'ವರದಿ ಮುದ್ರಿಸಿ' : 'Print Report'}</span>
                  </button>
                </div>

                {/* 5. Footer Metadata Row */}
                <div className="fp-footer-meta-bar">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Clock size={13} color="#9CA3AF" />
                    <span>{isKn ? 'ಕೊನೆಯ ನವೀಕರಣ: 27 ಅಕ್ಟೋ 2026' : 'Last Updated: 27 Oct 2026, 11:45 AM'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Layers size={13} color="#9CA3AF" />
                    <span>{isKn ? 'ಡೇಟಾ ಮೂಲ: Snowflake (MANDI_PRICES)' : 'Data Source: Snowflake (MANDI_PRICES)'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <FileText size={13} color="#9CA3AF" />
                    <span>{isKn ? 'ವರದಿ ಭಾಷೆ: ಕನ್ನಡ' : 'Report Language: English'}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: HISTORY */}
      {activeTab === 'history' && (
        <div className="fp-card-box" style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #E5E7EB', paddingBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F3A24', margin: 0 }}>
              {isKn ? 'ಉಳಿಸಲಾದ ಲಾಭ-ನಷ್ಟ ಲೆಕ್ಕಾಚಾರಗಳ ಇತಿಹಾಸ' : 'Saved Profit & Loss Calculation Records'}
            </h3>
            <button className="fp-btn-secondary" onClick={loadHistory} style={{ padding: '6px 12px', fontSize: 12 }}>
              <RefreshCw size={13} />
              <span>{isKn ? 'ನವೀಕರಿಸಿ' : 'Refresh'}</span>
            </button>
          </div>

          {loadingHistory ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>Loading history...</div>
          ) : historyList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280' }}>
              <History size={36} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
              <p style={{ margin: 0 }}>No saved calculation history found.</p>
            </div>
          ) : (
            <div className="report-table-container">
              <table className="report-comparison-table">
                <thead>
                  <tr>
                    <th>Ref ID</th>
                    <th>Date</th>
                    <th>Crop</th>
                    <th>Mandi</th>
                    <th>Qty (q)</th>
                    <th>Revenue</th>
                    <th>Net Return</th>
                    <th>Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.map(h => (
                    <tr key={h.record_id}>
                      <td style={{ fontWeight: 700, color: '#166534' }}>{h.record_id}</td>
                      <td>{h.created_at?.slice(0, 10)}</td>
                      <td>{h.crop_name}</td>
                      <td>{h.mandi_name}</td>
                      <td>{h.quantity}</td>
                      <td>₹{formatIndian(h.gross_revenue)}</td>
                      <td style={{ fontWeight: 700, color: '#059669' }}>₹{formatIndian(h.net_return)}</td>
                      <td>
                        <span className={`badge-tag ${h.outcome === 'PROFIT' ? 'resolved' : 'rejected'}`}>
                          {h.outcome}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

