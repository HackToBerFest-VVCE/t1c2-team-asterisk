import React, { useState, useEffect } from 'react';
import {
  Download,
  Info,
  ChevronDown,
  ChevronUp,
  MapPin,
  TrendingUp,
  Truck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { fetchMarketComparison, downloadReport } from '../services/api';

export default function SmartMandiView({ crops, t }) {
  const [selectedCrop, setSelectedCrop] = useState('CROP_TOMATO');
  const [selectedVariety, setSelectedVariety] = useState('VAR_TOM_HYBRID');
  const [quantity, setQuantity] = useState(50);
  const [unit, setUnit] = useState('quintals');
  const [sellingDate, setSellingDate] = useState('2026-10-24');
  const [activeFilterPill, setActiveFilterPill] = useState('netReturn');
  const [sortBy, setSortBy] = useState('bestNetReturn');
  
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedWhy, setExpandedWhy] = useState({});
  const [error, setError] = useState(null);

  // Trigger comparison fetch
  useEffect(() => {
    loadComparison();
  }, [selectedCrop, selectedVariety, quantity, unit, sellingDate]);

  async function loadComparison() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMarketComparison({
        crop_id: selectedCrop,
        variety_id: selectedVariety,
        quantity: parseFloat(quantity) || 50,
        unit: unit,
        origin_name: 'Hassan, Karnataka',
        selling_date: sellingDate
      });
      setComparisonData(data);
    } catch (err) {
      setError(err.message || 'Failed to load comparison');
    } finally {
      setLoading(false);
    }
  }

  const toggleWhy = (mandiId) => {
    setExpandedWhy((prev) => ({ ...prev, [mandiId]: !prev[mandiId] }));
  };

  // Sort items according to user pill / dropdown selection
  const getSortedMandis = () => {
    if (!comparisonData?.mandis) return [];
    const list = [...comparisonData.mandis];
    if (activeFilterPill === 'distance' || sortBy === 'nearestDistance') {
      return list.sort((a, b) => a.estimated_road_distance_km - b.estimated_road_distance_km);
    }
    if (activeFilterPill === 'price' || sortBy === 'highestPrice') {
      return list.sort((a, b) => b.modal_price_per_q - a.modal_price_per_q);
    }
    if (activeFilterPill === 'arrival' || sortBy === 'arrivalVolume') {
      return list.sort((a, b) => (b.arrival_quantity_tonnes || 0) - (a.arrival_quantity_tonnes || 0));
    }
    // Default: Best Net Return
    return list.sort((a, b) => b.estimated_net_return - a.estimated_net_return);
  };

  const sortedMandis = getSortedMandis();

  return (
    <div>
      {/* Title & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#113826' }}>
            {t.comparison.title}
          </h2>
          <p style={{ fontSize: 13, color: '#5A6A60' }}>
            {t.comparison.subtitle}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn-secondary"
            onClick={() => downloadReport('csv', {
              crop_id: selectedCrop,
              variety_id: selectedVariety,
              quantity: parseFloat(quantity) || 50,
              unit
            })}
            title="Download CSV"
          >
            <Download size={14} />
            <span>CSV</span>
          </button>

          <button
            className="btn-primary"
            onClick={() => downloadReport('pdf', {
              crop_id: selectedCrop,
              variety_id: selectedVariety,
              quantity: parseFloat(quantity) || 50,
              unit
            })}
            title="Download PDF Report"
          >
            <Download size={14} />
            <span>PDF Report</span>
          </button>
        </div>
      </div>

      {/* Filter Bar matching Screenshot */}
      <div className="filter-bar">
        {/* Crop Select */}
        <div className="filter-group">
          <label className="filter-label">{t.comparison.crop}</label>
          <select
            className="filter-select"
            value={selectedCrop}
            onChange={(e) => {
              setSelectedCrop(e.target.value);
              setSelectedVariety(null);
            }}
          >
            <option value="CROP_TOMATO">Tomato (ಟೊಮೆಟೊ)</option>
            <option value="CROP_ONION">Onion (ಈರುಳ್ಳಿ)</option>
            <option value="CROP_POTATO">Potato (ಆಲೂಗಡ್ಡೆ)</option>
            <option value="CROP_MAIZE">Maize (ಮೆಕ್ಕೆಜೋಳ)</option>
            <option value="CROP_PADDY">Paddy (ಭತ್ತ)</option>
            <option value="CROP_RAGI">Ragi (ರಾಗಿ)</option>
          </select>
        </div>

        {/* Variety Select */}
        <div className="filter-group">
          <label className="filter-label">{t.comparison.variety}</label>
          <select
            className="filter-select"
            value={selectedVariety || ''}
            onChange={(e) => setSelectedVariety(e.target.value)}
          >
            {selectedCrop === 'CROP_TOMATO' && (
              <>
                <option value="VAR_TOM_HYBRID">Hybrid (ಹೈಬ್ರಿಡ್)</option>
                <option value="VAR_TOM_LOCAL">Local / Desi (ನಾಟಿ)</option>
              </>
            )}
            {selectedCrop === 'CROP_ONION' && (
              <>
                <option value="VAR_ONI_MED">Medium (ಮಧ್ಯಮ)</option>
                <option value="VAR_ONI_SMALL">Small / Shallot (ಸಣ್ಣ)</option>
              </>
            )}
            {selectedCrop === 'CROP_POTATO' && (
              <option value="VAR_POT_JYOTHI">Kufri Jyothi</option>
            )}
            {selectedCrop === 'CROP_MAIZE' && (
              <option value="VAR_MAI_HYBRID">Hybrid Yellow</option>
            )}
            {selectedCrop === 'CROP_PADDY' && (
              <option value="VAR_PAD_SONA">Sona Masuri</option>
            )}
            {selectedCrop === 'CROP_RAGI' && (
              <option value="VAR_RAG_LOCAL">Local Brown</option>
            )}
          </select>
        </div>

        {/* Quantity */}
        <div className="filter-group">
          <label className="filter-label">{t.comparison.quantity}</label>
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              type="number"
              className="filter-input"
              style={{ width: 80, minWidth: 80 }}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
            />
            <select
              className="filter-select"
              style={{ width: 95, minWidth: 95 }}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              <option value="quintals">{t.comparison.quintals}</option>
              <option value="kg">{t.comparison.kg}</option>
            </select>
          </div>
        </div>

        {/* Selling Date */}
        <div className="filter-group">
          <label className="filter-label">{t.comparison.sellingDate}</label>
          <input
            type="date"
            className="filter-input"
            value={sellingDate}
            onChange={(e) => setSellingDate(e.target.value)}
          />
        </div>

        {/* Filter Pills matching Screenshot */}
        <div className="filter-pills">
          <button
            className={`pill-btn ${activeFilterPill === 'distance' ? 'active' : ''}`}
            onClick={() => setActiveFilterPill('distance')}
          >
            Distance
          </button>
          <button
            className={`pill-btn ${activeFilterPill === 'price' ? 'active' : ''}`}
            onClick={() => setActiveFilterPill('price')}
          >
            Price
          </button>
          <button
            className={`pill-btn ${activeFilterPill === 'arrival' ? 'active' : ''}`}
            onClick={() => setActiveFilterPill('arrival')}
          >
            Arrival
          </button>
          <button
            className={`pill-btn ${activeFilterPill === 'netReturn' ? 'active' : ''}`}
            onClick={() => setActiveFilterPill('netReturn')}
          >
            Net Return
          </button>
        </div>

        {/* Sort By Dropdown */}
        <div className="filter-group" style={{ marginLeft: 8 }}>
          <label className="filter-label">{t.comparison.sortBy}</label>
          <select
            className="filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="bestNetReturn">{t.comparison.bestNetReturn}</option>
            <option value="highestPrice">{t.comparison.highestPrice}</option>
            <option value="nearestDistance">{t.comparison.nearestDistance}</option>
            <option value="arrivalVolume">{t.comparison.arrivalVolume}</option>
          </select>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#5A6A60' }}>
          Calculating net returns and querying active markets...
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', padding: '12px 16px', borderRadius: 8, color: '#991B1B', marginBottom: 16 }}>
          <AlertTriangle size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
          {error}
        </div>
      )}

      {/* Data Quality Notice */}
      {comparisonData?.data_quality_notice && (
        <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', padding: '10px 16px', borderRadius: 8, color: '#92400E', fontSize: 12, marginBottom: 16 }}>
          <Info size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
          {comparisonData.data_quality_notice}
        </div>
      )}

      {/* Mandi Cards Stack */}
      <div className="mandi-cards-stack">
        {sortedMandis.map((mandi, idx) => {
          const isExpanded = !!expandedWhy[mandi.mandi_id];
          return (
            <div
              key={mandi.mandi_id}
              className={`mandi-card ${mandi.is_best_net_return ? 'best-option' : ''}`}
            >
              {/* Badges */}
              {mandi.is_best_net_return && (
                <span className="badge-best">Best Option ★</span>
              )}
              {mandi.is_highest_price && !mandi.is_best_net_return && (
                <span className="badge-highest-price">Highest Listed Price</span>
              )}

              {/* Mandi Meta */}
              <div className="mandi-meta">
                <div className="mandi-rank">{idx + 1}</div>
                <div>
                  <div className="mandi-title">
                    {mandi.mandi_name}
                  </div>
                  <div className="mandi-dist">
                    <MapPin size={12} color="#059669" />
                    <span>{mandi.district}, Karnataka</span>
                    <span>•</span>
                    <Truck size={12} color="#4B5563" />
                    <span>{mandi.estimated_road_distance_km} km road</span>
                  </div>
                </div>
              </div>

              {/* Price Points */}
              <div className="mandi-prices">
                <div className="price-box">
                  <span className="price-label">{t.comparison.min}</span>
                  <span className="price-val">₹{mandi.min_price_per_q.toLocaleString()}</span>
                </div>
                <div className="price-box modal">
                  <span className="price-label">{t.comparison.modalPrice}</span>
                  <span className="price-val">₹{mandi.modal_price_per_q.toLocaleString()}</span>
                </div>
                <div className="price-box">
                  <span className="price-label">{t.comparison.max}</span>
                  <span className="price-val">₹{mandi.max_price_per_q.toLocaleString()}</span>
                </div>
              </div>

              {/* Net Return Display */}
              <div className="mandi-net-return">
                <span className="net-return-label">{t.comparison.netReturn}</span>
                <span className="net-return-val">
                  ₹{mandi.estimated_net_return.toLocaleString()}
                </span>
                <span className="net-return-sub">
                  / {comparisonData?.quantity_quintals || 50} q (₹{mandi.net_return_per_quintal.toLocaleString()}/q)
                </span>
              </div>

              {/* Why button */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 100 }}>
                <button
                  className="btn-secondary"
                  style={{ fontSize: 11, padding: '5px 10px' }}
                  onClick={() => toggleWhy(mandi.mandi_id)}
                >
                  <Info size={13} />
                  <span>Why this?</span>
                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </div>

              {/* Why Panel Drawer if Expanded */}
              {isExpanded && (
                <div className="why-panel" style={{ width: '100%', gridColumn: '1 / -1', marginTop: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={14} color="#059669" />
                    <span>Decision Factors for {mandi.mandi_name}:</span>
                  </div>
                  {mandi.recommendation_reasons.map((r, i) => (
                    <div key={i}>• {r}</div>
                  ))}
                  <div style={{ marginTop: 4, fontSize: 11, color: '#355E47' }}>
                    Source: {mandi.data_source} • Verified on {mandi.observation_date} • APMC Cess: 1.5%
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
