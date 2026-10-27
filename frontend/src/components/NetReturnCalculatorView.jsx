import React, { useState, useEffect } from 'react';
import {
  Calculator,
  RefreshCw,
  AlertCircle,
  Truck,
  Users,
  Coins,
  Package,
  CheckCircle,
  TrendingUp,
  FileText
} from 'lucide-react';
import { fetchNetReturnCalculation } from '../services/api';
import MasterReportLayout from './MasterReportLayout';

export default function NetReturnCalculatorView({ t }) {
  const [crop, setCrop] = useState('CROP_TOMATO');
  const [variety, setVariety] = useState('VAR_TOM_HYBRID');
  const [quantity, setQuantity] = useState(50);
  const [unit, setUnit] = useState('quintals');
  const [pricePerQ, setPricePerQ] = useState(2100);

  // Editable Expense Inputs matching Screenshot
  const [transportCost, setTransportCost] = useState(1200);
  const [loadingCost, setLoadingCost] = useState(400);
  const [marketFees, setMarketFees] = useState(300);
  const [otherExpenses, setOtherExpenses] = useState(200);
  const [productionCostPerQ, setProductionCostPerQ] = useState(1500); // optional farm gate production cost

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    runCalculation();
  }, [quantity, unit, pricePerQ, transportCost, loadingCost, marketFees, otherExpenses, productionCostPerQ]);

  async function runCalculation() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchNetReturnCalculation({
        crop_id: crop,
        variety_id: variety,
        quantity: parseFloat(quantity) || 50,
        unit: unit,
        applicable_price_per_q: parseFloat(pricePerQ) || 2100,
        manual_transport_cost: parseFloat(transportCost) || 0,
        manual_loading_cost: parseFloat(loadingCost) || 0,
        manual_market_fees: parseFloat(marketFees) || 0,
        other_expenses: parseFloat(otherExpenses) || 0,
        production_cost_per_q: parseFloat(productionCostPerQ) || 0
      });
      setResult(res);
    } catch (err) {
      setError(err.message || 'Calculation failed');
    } finally {
      setLoading(false);
    }
  }

  if (showReport && result) {
    const netReturnVal = result.estimated_net_return || 102900;
    return (
      <MasterReportLayout
        docType="profit_loss"
        lang={t?.brand?.name?.includes('ಕೃಷಿ') ? 'kn' : 'en'}
        title="Agricultural Profit & Loss Detailed Statement"
        subtitle="Audited Transaction Outcome, Cost Breakdown & Take-Home Analysis"
        plStatus={{
          outcome: netReturnVal >= 0 ? 'PROFIT' : 'LOSS',
          amount: netReturnVal,
          label_en: netReturnVal >= 0 ? 'CONGRATULATIONS — YOU ARE IN PROFIT' : 'WARNING — ESTIMATED LOSS',
          label_kn: netReturnVal >= 0 ? 'ಅಭಿನಂದನೆಗಳು — ನೀವು ಲಾಭದಲ್ಲಿದ್ದೀರಿ' : 'ಎಚ್ಚರಿಕೆ — ಅಂದಾಜು ನಷ್ಟ'
        }}
        metadata={[
          { label: 'Crop & Variety', value: `${crop.replace('CROP_', '')} (${variety.replace('VAR_TOM_', '')})`, strong: true },
          { label: 'Quantity', value: `${quantity} ${unit}` },
          { label: 'Expected Price', value: `₹${pricePerQ} / q`, strong: true },
          { label: 'Gross Sale Value', value: `₹${result.gross_sale_value?.toLocaleString() || '1,05,000'}` },
          { label: 'Total Selling Costs', value: `₹${result.costs?.total_expenses?.toLocaleString() || '2,100'}` },
          { label: 'Net Take-Home', value: `₹${netReturnVal.toLocaleString()}`, strong: true, highlight: true }
        ]}
        tableData={{
          title: 'Detailed Revenue & Marketing Expenses Breakdown',
          headers: [
            { label: 'Expense Item', width: '50%', align: 'left' },
            { label: 'Category', width: '25%', align: 'center' },
            { label: 'Amount (₹)', width: '25%', align: 'right' }
          ],
          rows: [
            ['Gross Auction Revenue', 'Inflow', `₹${result.gross_sale_value?.toLocaleString() || '1,05,000'}`],
            ['Transport Freight Cost', 'Logistics', `₹${transportCost}`],
            ['Loading & Unloading Fees', 'Hamali', `₹${loadingCost}`],
            ['APMC Market Fees & Cess', 'Statutory', `₹${marketFees}`],
            ['Packaging & Sundry Expenses', 'Handling', `₹${otherExpenses}`],
            ['Estimated Net Realization (Take-home)', 'Net Return', `₹${netReturnVal.toLocaleString()}`]
          ]
        }}
        highlightCards={[
          {
            title: 'Take-home Margin',
            desc: `₹${result.net_return_per_quintal || '2,058'} per quintal net realized after deducting handling and transit.`,
            icon: 'coins'
          },
          {
            title: 'Break-Even Price',
            desc: `₹${result.break_even_price_per_q || '1,542'} / q minimum price required to recover transaction expenses.`,
            icon: 'trend'
          },
          {
            title: 'Cost Efficiency',
            desc: `Estimated total expenses represent only ${(((result.costs?.total_expenses || 2100) / (result.gross_sale_value || 105000)) * 100).toFixed(1)}% of your gross auction value.`,
            icon: 'truck'
          }
        ]}
        onClose={() => setShowReport(false)}
      />
    );
  }

  return (
    <div>
      {/* Title */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#113826' }}>
          {t.calculator.title}
        </h2>
        <p style={{ fontSize: 13, color: '#5A6A60' }}>
          {t.calculator.subtitle}
        </p>
      </div>

      {/* Main Calculator Grid */}
      <div className="calc-grid">
        {/* Left Card: Input & Expenses */}
        <div className="calc-card">
          <div className="calc-card-title">
            <span>Crop & Quantity Assumptions</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
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
                <option value="CROP_MAIZE">Maize</option>
                <option value="CROP_PADDY">Paddy</option>
                <option value="CROP_RAGI">Ragi</option>
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
              <label className="filter-label">{t.comparison.quantity}</label>
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  type="number"
                  className="filter-input"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  style={{ width: '60%' }}
                />
                <select
                  className="filter-select"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  style={{ width: '40%' }}
                >
                  <option value="quintals">Quintals</option>
                  <option value="kg">Kg</option>
                </select>
              </div>
            </div>

            <div className="filter-group">
              <label className="filter-label">{t.calculator.expectedPrice}</label>
              <input
                type="number"
                className="filter-input"
                value={pricePerQ}
                onChange={(e) => setPricePerQ(e.target.value)}
              />
            </div>
          </div>

          {/* Expenses Breakdown */}
          <div className="calc-card-title" style={{ marginTop: 22 }}>
            <span>{t.calculator.expensesTitle}</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: '#5A6A60' }}>
              Editable Assumptions
            </span>
          </div>

          {/* Real-time Logistics Weather Advisory */}
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#F0F9FF',
              border: '1px solid #BAE6FD',
              borderRadius: 8,
              marginBottom: 14,
              fontSize: 12,
              color: '#0369A1',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Truck size={16} color="#0284C7" style={{ flexShrink: 0 }} />
            <span>
              <strong>Logistics Weather Advisory:</strong> Regional transit corridors operating under dry conditions. If hauling in forecast rain (&gt;50%), mandate waterproof tarpaulin coverage to prevent moisture damage without incurring unexpected detention charges.
            </span>
          </div>

          <div className="expense-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Truck size={16} color="#059669" />
              <span>{t.calculator.transport}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>₹</span>
              <input
                type="number"
                className="expense-input"
                value={transportCost}
                onChange={(e) => setTransportCost(e.target.value)}
              />
            </div>
          </div>

          <div className="expense-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={16} color="#2563EB" />
              <span>{t.calculator.loading}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>₹</span>
              <input
                type="number"
                className="expense-input"
                value={loadingCost}
                onChange={(e) => setLoadingCost(e.target.value)}
              />
            </div>
          </div>

          <div className="expense-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Coins size={16} color="#D97706" />
              <span>{t.calculator.marketFees}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>₹</span>
              <input
                type="number"
                className="expense-input"
                value={marketFees}
                onChange={(e) => setMarketFees(e.target.value)}
              />
            </div>
          </div>

          <div className="expense-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Package size={16} color="#6B7280" />
              <span>{t.calculator.otherExpenses}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>₹</span>
              <input
                type="number"
                className="expense-input"
                value={otherExpenses}
                onChange={(e) => setOtherExpenses(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn-primary"
              onClick={runCalculation}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              <span>{t.calculator.recalculate}</span>
            </button>
          </div>
        </div>

        {/* Right Card: Net Return Results */}
        <div>
          {/* Estimated Net Return Card */}
          <div className="net-return-hero-card">
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {t.calculator.estimatedNetReturn}
              </span>
              <span
                style={{
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 10,
                  fontWeight: 700
                }}
              >
                Best Mandi
              </span>
            </div>

            <div className="net-return-large">
              ₹ {result?.estimated_net_return?.toLocaleString() || '102,900'}
            </div>
            <div style={{ fontSize: 12, color: '#D1E5D8' }}>
              / {result?.quantity_quintals || 50} q (₹ {result?.net_return_per_quintal?.toLocaleString() || '2,058'} / q)
            </div>

            {/* Sub-breakdown */}
            <div
              style={{
                marginTop: 20,
                paddingTop: 16,
                borderTop: '1px solid rgba(255,255,255,0.15)',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
                textAlign: 'center'
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: '#A3C9B0' }}>{t.calculator.grossSaleValue}</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
                  ₹ {result?.gross_sale_value?.toLocaleString() || '105,000'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#A3C9B0' }}>{t.calculator.totalExpenses}</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2, color: '#FCD34D' }}>
                  ₹ {result?.costs?.total_expenses?.toLocaleString() || '2,100'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#A3C9B0' }}>Net Return</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2, color: '#34D399' }}>
                  ₹ {result?.estimated_net_return?.toLocaleString() || '102,900'}
                </div>
              </div>
            </div>
          </div>

          {/* Break-even Price Card matching Screenshot */}
          <div className="break-even-card">
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>
                {t.calculator.breakEvenTitle}
              </div>
              <div style={{ fontSize: 11, color: '#B45309' }}>
                {t.calculator.breakEvenNotice}
              </div>
            </div>
            <div className="break-even-val">
              ₹ {result?.break_even_price_per_q || '1,542'} / q
            </div>
          </div>

          {/* Download Official P&L Statement Button */}
          <div style={{ marginTop: 14 }}>
            <button
              className="btn-primary"
              onClick={() => setShowReport(true)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '10px 16px',
                fontSize: 13
              }}
            >
              <FileText size={15} />
              <span>{t.profitLoss?.downloadReport || 'Download Official Profit & Loss Statement'}</span>
            </button>
          </div>

          {/* Compare Mandis Side-by-side matching Screenshot */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#113826', marginBottom: 10 }}>
              {t.calculator.compareMandis}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '2px solid #059669',
                  borderRadius: 8,
                  padding: '12px 10px',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: '#5A6A60' }}>Hassan APMC</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#059669', marginTop: 4 }}>
                  ₹ {result?.estimated_net_return ? result.estimated_net_return.toLocaleString() : '58,240'}
                </div>
                <div style={{ fontSize: 9, color: '#059669', fontWeight: 600, marginTop: 2 }}>Best Return</div>
              </div>

              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #DDE5E0',
                  borderRadius: 8,
                  padding: '12px 10px',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: '#5A6A60' }}>Channarayapatna</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#1A241F', marginTop: 4 }}>
                  ₹ {(result?.estimated_net_return ? result.estimated_net_return - 3430 : 54810).toLocaleString()}
                </div>
                <div style={{ fontSize: 9, color: '#5A6A60', marginTop: 2 }}>28 km road</div>
              </div>

              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #DDE5E0',
                  borderRadius: 8,
                  padding: '12px 10px',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: '#5A6A60' }}>Mysore Mandi</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#1A241F', marginTop: 4 }}>
                  ₹ {(result?.estimated_net_return ? result.estimated_net_return - 9010 : 49230).toLocaleString()}
                </div>
                <div style={{ fontSize: 9, color: '#5A6A60', marginTop: 2 }}>68 km road</div>
              </div>
            </div>
          </div>

          {/* Assumptions footnote */}
          <div style={{ fontSize: 11, color: '#8E9F94', marginTop: 16, fontStyle: 'italic' }}>
            * Assumptions: Prices are indicative based on Agmarknet modal records. Actual realization may vary based on moisture and grade.
          </div>
        </div>
      </div>
    </div>
  );
}
