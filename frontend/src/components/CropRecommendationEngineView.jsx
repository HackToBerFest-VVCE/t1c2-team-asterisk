import React, { useState, useEffect, useMemo } from 'react';
import {
  Sprout,
  TrendingUp,
  MapPin,
  Calendar,
  CloudSun,
  Coins,
  ShieldAlert,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  DollarSign,
  Droplets,
  Thermometer,
  Layers,
  Sparkles,
  Info,
  ExternalLink,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Building2,
  FileCheck2,
  Database,
  X
} from 'lucide-react';
import {
  fetchCropRecommendations,
  fetchRecommendationDistricts,
  fetchCropCategories,
  fetchRecommendationAuditLogs
} from '../services/api';

export default function CropRecommendationEngineView({
  t,
  lang = 'en',
  currentLocation = null,
  onLocationChange = null
}) {
  const isKn = lang === 'kn';

  // Filters & Parameters
  const [selectedDistrict, setSelectedDistrict] = useState(
    currentLocation?.district || 'Hassan'
  );
  const [districts, setDistricts] = useState([
    'Hassan', 'Kolar', 'Chikkaballapura', 'Bengaluru Rural', 'Bengaluru Urban',
    'Belagavi', 'Mysuru', 'Mandya', 'Haveri', 'Davanagere', 'Shivamogga',
    'Tumakuru', 'Chitradurga', 'Bagalkot', 'Vijayapura', 'Gadag', 'Dharwad',
    'Chamarajanagar', 'Ramanagara', 'Ballari', 'Koppal', 'Raichur', 'Kalaburagi'
  ]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSeason, setSelectedSeason] = useState('All');
  const [waterAvailability, setWaterAvailability] = useState('Any');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [acres, setAcres] = useState(1.0);
  const [searchQuery, setSearchQuery] = useState('');

  // Data & State
  const [recommendationsData, setRecommendationsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSyncedTime, setLastSyncedTime] = useState(null);

  // Deep-Dive Modal State
  const [activeModalCrop, setActiveModalCrop] = useState(null);
  const [modalTab, setModalTab] = useState('financials'); // 'financials', 'agronomic', 'forecast', 'provenance'
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);

  // Load available districts on mount
  useEffect(() => {
    fetchRecommendationDistricts()
      .then((res) => {
        if (res?.districts && res.districts.length > 0) {
          setDistricts(res.districts);
        }
      })
      .catch((err) => console.warn('Districts load error:', err));
  }, []);

  // Sync with prop location if changed
  useEffect(() => {
    if (currentLocation?.district && currentLocation.district !== selectedDistrict) {
      setSelectedDistrict(currentLocation.district);
    }
  }, [currentLocation]);

  // Load recommendations whenever parameters change
  const loadRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const lat = currentLocation?.latitude;
      const lon = currentLocation?.longitude;
      const budget = budgetLimit ? parseFloat(budgetLimit) : null;
      const data = await fetchCropRecommendations({
        district: selectedDistrict,
        latitude: lat,
        longitude: lon,
        category: selectedCategory !== 'All' ? selectedCategory : null,
        season: selectedSeason !== 'All' ? selectedSeason : null,
        water_availability: waterAvailability !== 'Any' ? waterAvailability : null,
        budget_limit_per_acre: budget,
        acres: parseFloat(acres) || 1.0
      });
      setRecommendationsData(data);
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Recommendations load error:', err);
      setError(err.message || 'Failed to load crop recommendations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, [selectedDistrict, selectedCategory, selectedSeason, waterAvailability, budgetLimit, acres]);

  // Filter recommendations by search query
  const filteredRecommendations = useMemo(() => {
    if (!recommendationsData?.recommendations) return [];
    if (!searchQuery.trim()) return recommendationsData.recommendations;
    const q = searchQuery.toLowerCase();
    return recommendationsData.recommendations.filter(
      (r) =>
        r.crop_name.toLowerCase().includes(q) ||
        (r.crop_name_kannada && r.crop_name_kannada.toLowerCase().includes(q)) ||
        (r.scientific_name && r.scientific_name.toLowerCase().includes(q)) ||
        r.category.toLowerCase().includes(q)
    );
  }, [recommendationsData, searchQuery]);

  const handleOpenAudit = async () => {
    try {
      const logs = await fetchRecommendationAuditLogs();
      setAuditLogs(logs?.data_sources || []);
      setIsAuditModalOpen(true);
    } catch (err) {
      console.warn('Audit logs load failed:', err);
    }
  };

  const weather = recommendationsData?.weather_summary;
  const kpis = recommendationsData?.kpis;
  const locInfo = recommendationsData?.location;

  return (
    <div className="crop-rec-engine-container">
      {/* 1. Header & Location Context Bar */}
      <div className="engine-header-card">
        <div className="engine-title-area">
          <div className="engine-badge-tag">
            <Sparkles size={16} />
            <span>{isKn ? 'ಹವಾಮಾನ-ಆಧಾರಿತ ಬೆಳೆ ಶಿಫಾರಸು ಎಂಜಿನ್' : 'Agricultural Decision Support Engine'}</span>
          </div>
          <h2 className="engine-main-heading">
            {isKn ? 'ಕರ್ನಾಟಕ ಬೆಳೆ ಶಿಫಾರಸು & ಲಾಭ ಮುನ್ಸೂಚನೆ' : 'Weather-Aware Crop Recommendation & Profit Engine'}
          </h2>
          <p className="engine-subtitle">
            {isKn
              ? 'ಐಸಿಎಆರ್, ಯುಎಎಸ್ ಬೆಂಗಳೂರು ಮತ್ತು ಎಪಿಎಂಸಿ ದತ್ತಾಂಶಗಳೊಂದಿಗೆ ನಿಮ್ಮ ಜಮೀನಿಗೆ ಸೂಕ್ತವಾದ ತರಕಾರಿ, ಹಣ್ಣು ಹಾಗೂ ವಾಣಿಜ್ಯ ಬೆಳೆಗಳ ನಿವ್ವಳ ಲಾಭದ ಲೆಕ್ಕಾಚಾರ.'
              : 'Data-driven agricultural guidance for Karnataka farmers. Identifies agro-climatically suitable crops, forecasted weather compatibility, and expected net profit per acre.'}
          </p>
        </div>

        {/* Location & Farm Size Controls */}
        <div className="engine-controls-bar">
          <div className="control-group">
            <label className="control-label">
              <MapPin size={15} />
              <span>{isKn ? 'ಜಿಲ್ಲೆ (ಕರ್ನಾಟಕ)' : 'District (Karnataka)'}</span>
            </label>
            <select
              className="control-select"
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
            >
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label className="control-label">
              <Layers size={15} />
              <span>{isKn ? 'ಜಮೀನಿನ ವಿಸ್ತೀರ್ಣ (ಎಕರೆ)' : 'Land Holding (Acres)'}</span>
            </label>
            <div className="acres-input-wrap">
              <input
                type="number"
                min="0.25"
                max="500"
                step="0.25"
                className="control-input acres-input"
                value={acres}
                onChange={(e) => setAcres(Math.max(0.1, parseFloat(e.target.value) || 1))}
              />
              <span className="unit-badge">{isKn ? 'ಎಕರೆ' : 'Acres'}</span>
            </div>
          </div>

          <div className="control-actions">
            <button
              className="refresh-engine-btn"
              onClick={loadRecommendations}
              disabled={loading}
              title="Refresh recommendations"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              <span>{isKn ? 'ನವೀಕರಿಸಿ' : 'Refresh'}</span>
            </button>

            <button
              className="audit-logs-btn"
              onClick={handleOpenAudit}
              title="Inspect official data sources"
            >
              <FileCheck2 size={16} />
              <span>{isKn ? 'ದತ್ತಾಂಶ ಮೂಲಗಳು' : 'Data Provenance'}</span>
            </button>
          </div>
        </div>

        {/* Live Weather & Agro-Climatic Zone Strip */}
        {weather && (
          <div className="weather-context-strip">
            <div className="weather-item">
              <CloudSun size={18} className="weather-icon text-amber" />
              <div>
                <span className="w-val">{weather.current_temperature}°C</span>
                <span className="w-desc">{weather.condition}</span>
              </div>
            </div>

            <div className="weather-item">
              <Droplets size={18} className="weather-icon text-blue" />
              <div>
                <span className="w-val">{weather.precipitation_7d_mm} mm</span>
                <span className="w-desc">{isKn ? '7-ದಿನಗಳ ಮಳೆ ಮುನ್ಸೂಚನೆ' : '7-Day Rain Forecast'}</span>
              </div>
            </div>

            <div className="weather-item">
              <Sprout size={18} className="weather-icon text-emerald" />
              <div>
                <span className="w-val">{locInfo?.agro_climatic_zone || 'Southern Transition Zone'}</span>
                <span className="w-desc">{isKn ? 'ಕೃಷಿ-ಹವಾಮಾನ ವಲಯ' : 'Agro-Climatic Zone'}</span>
              </div>
            </div>

            <div className="weather-item data-fresh-tag">
              <CheckCircle2 size={15} className="text-emerald" />
              <span>{isKn ? 'ಓಪನ್-ಮೆಟಿಯೊ (ECMWF/GFS) ಸಕ್ರಿಯ' : 'Open-Meteo ECMWF/GFS Active'}</span>
            </div>

            {recommendationsData?.metadata && (
              <div className="weather-item data-fresh-tag" style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '0.75rem' }} title={recommendationsData.metadata.data_source}>
                <Database size={15} className="text-blue" />
                <span>
                  {isKn ? 'ಸ್ನೋಫ್ಲೇಕ್ ಲೈವ್ ದತ್ತಾಂಶ' : 'Snowflake Live'} ({recommendationsData.metadata.active_mandi_records_count?.toLocaleString()} {isKn ? 'ದಾಖಲೆಗಳು' : 'records'})
                  {lastSyncedTime && ` • ${isKn ? 'ನವೀಕರಣ:' : 'Synced:'} ${lastSyncedTime}`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Top Summary KPI Widgets */}
      {kpis && (
        <div className="rec-kpi-grid">
          <div className="kpi-card highlight-emerald">
            <div className="kpi-icon-wrap">
              <Coins size={22} />
            </div>
            <div className="kpi-body">
              <span className="kpi-label">{isKn ? 'ಗರಿಷ್ಠ ನಿವ್ವಳ ಲಾಭ ನೀಡುವ ಬೆಳೆ' : 'Highest Net Profit Crop'}</span>
              <h3 className="kpi-val">{kpis.top_net_profit_crop}</h3>
              <p className="kpi-subval">
                +₹{Math.round(kpis.max_net_profit_acre).toLocaleString('en-IN')}{' '}
                <span className="sub-unit">/ {isKn ? 'ಎಕರೆಗೆ' : 'acre'}</span>
              </p>
            </div>
          </div>

          <div className="kpi-card highlight-blue">
            <div className="kpi-icon-wrap">
              <Sparkles size={22} />
            </div>
            <div className="kpi-body">
              <span className="kpi-label">{isKn ? 'ಉತ್ತಮ ಕೃಷಿ-ಹವಾಮಾನ ಹೊಂದಾಣಿಕೆ' : 'Top Agronomic Match'}</span>
              <h3 className="kpi-val">{kpis.top_suitability_crop}</h3>
              <p className="kpi-subval">
                {kpis.max_suitability_score}% {isKn ? 'ಹೊಂದಾಣಿಕೆ ಸ್ಕೋರ್' : 'Suitability Score'}
              </p>
            </div>
          </div>

          <div className="kpi-card highlight-purple">
            <div className="kpi-icon-wrap">
              <Calendar size={22} />
            </div>
            <div className="kpi-body">
              <span className="kpi-label">{isKn ? 'ಪ್ರಸ್ತುತ ಬಿತ್ತನೆ ಕಾಲ' : 'Active Sowing Season'}</span>
              <h3 className="kpi-val">{kpis.active_season}</h3>
              <p className="kpi-subval">{isKn ? 'ಸೂಕ್ತ ತಾಪಮಾನ ಮತ್ತು ತೇವಾಂಶ' : 'Optimal soil & moisture condition'}</p>
            </div>
          </div>

          <div className="kpi-card highlight-amber">
            <div className="kpi-icon-wrap">
              <Layers size={22} />
            </div>
            <div className="kpi-body">
              <span className="kpi-label">{isKn ? 'ಮೌಲ್ಯಮಾಪನ ಮಾಡಿದ ಬೆಳೆಗಳು' : 'Evaluated Crop Catalog'}</span>
              <h3 className="kpi-val">{filteredRecommendations.length} {isKn ? 'ಬೆಳೆಗಳು' : 'Crops'}</h3>
              <p className="kpi-subval">{isKn ? 'ತರಕಾರಿ, ಹಣ್ಣು ಮತ್ತು ವಾಣಿಜ್ಯ' : 'Vegetables, Fruits & Field Crops'}</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Multi-Dimensional Filters Bar */}
      <div className="filter-controls-container">
        {/* Category Tabs */}
        <div className="category-pill-tabs">
          {[
            { id: 'All', labelEn: 'All Crops', labelKn: 'ಎಲ್ಲಾ ಬೆಳೆಗಳು' },
            { id: 'Vegetables', labelEn: 'Vegetables', labelKn: 'ತರಕಾರಿಗಳು' },
            { id: 'Fruits', labelEn: 'Fruits', labelKn: 'ಹಣ್ಣುಗಳು' },
            { id: 'Cereals', labelEn: 'Cereals & Millets', labelKn: 'ಧಾನ್ಯ & ರಾಗಿ' },
            { id: 'Commercial', labelEn: 'Commercial & Spices', labelKn: 'ವಾಣಿಜ್ಯ & ಸಂಬಾರ' },
            { id: 'Oilseeds', labelEn: 'Oilseeds', labelKn: 'ಎಣ್ಣೆಕಾಳುಗಳು' }
          ].map((cat) => (
            <button
              key={cat.id}
              className={`cat-pill-btn ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {isKn ? cat.labelKn : cat.labelEn}
            </button>
          ))}
        </div>

        {/* Secondary Filters Strip */}
        <div className="secondary-filters-row">
          <div className="search-input-wrap">
            <Search size={15} />
            <input
              type="text"
              placeholder={isKn ? 'ಬೆಳೆ ಹುಡುಕಿ (ಉದಾ. ಟೊಮೆಟೊ, ಈರುಳ್ಳಿ, ಬಾಳೆ)...' : 'Search crop (e.g. Tomato, Onion, Banana)...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-field"
            />
          </div>

          <div className="dropdown-filter">
            <span className="filter-mini-label">{isKn ? 'ಋತುಮಾನ:' : 'Season:'}</span>
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="mini-select"
            >
              <option value="All">{isKn ? 'ಎಲ್ಲಾ ಋತುಗಳು' : 'All Seasons'}</option>
              <option value="Kharif">Kharif (ಮುಂಗಾರು)</option>
              <option value="Rabi">Rabi (ಹಿಂಗಾರು)</option>
              <option value="Summer">Summer (ಬೇಸಿಗೆ)</option>
              <option value="Year-Round">Year-Round (ವಾರ್ಷಿಕ)</option>
            </select>
          </div>

          <div className="dropdown-filter">
            <span className="filter-mini-label">{isKn ? 'ನೀರಿನ ಲಭ್ಯತೆ:' : 'Water:'}</span>
            <select
              value={waterAvailability}
              onChange={(e) => setWaterAvailability(e.target.value)}
              className="mini-select"
            >
              <option value="Any">{isKn ? 'ಎಲ್ಲವೂ' : 'Any'}</option>
              <option value="Low">{isKn ? 'ಕಡಿಮೆ (ಖುಷ್ಕಿ)' : 'Low (Dryland)'}</option>
              <option value="Medium">{isKn ? 'ಮಧ್ಯಮ (ಬೋರ್‌ವೆಲ್)' : 'Medium (Borewell)'}</option>
              <option value="High">{isKn ? 'ಹೆಚ್ಚು (ಖಾತರಿ ನೀರಾವರಿ)' : 'High (Assured Irrigation)'}</option>
            </select>
          </div>

          <div className="dropdown-filter">
            <span className="filter-mini-label">{isKn ? 'ಬಂಡವಾಳ ಮಿತಿ:' : 'Max Budget:'}</span>
            <select
              value={budgetLimit}
              onChange={(e) => setBudgetLimit(e.target.value)}
              className="mini-select"
            >
              <option value="">{isKn ? 'ಯಾವುದೇ ಮಿತಿಯಿಲ್ಲ' : 'No Limit'}</option>
              <option value="45000">≤ ₹45,000 / {isKn ? 'ಎಕರೆ' : 'acre'}</option>
              <option value="70000">≤ ₹70,000 / {isKn ? 'ಎಕರೆ' : 'acre'}</option>
              <option value="100000">≤ ₹1,00,000 / {isKn ? 'ಎಕರೆ' : 'acre'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Recommendation Cards List */}
      {loading ? (
        <div className="loading-card-skeleton">
          <RefreshCw size={36} className="animate-spin text-emerald" />
          <p>{isKn ? 'ಹವಾಮಾನ ಮತ್ತು ಮಾರುಕಟ್ಟೆ ಮುನ್ಸೂಚನೆಗಳನ್ನು ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...' : 'Evaluating agro-climatic match, weather models, and profit metrics...'}</p>
        </div>
      ) : error ? (
        <div className="error-card-box">
          <AlertTriangle size={32} className="text-red" />
          <p>{error}</p>
          <button className="retry-btn" onClick={loadRecommendations}>
            {isKn ? 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ' : 'Retry'}
          </button>
        </div>
      ) : filteredRecommendations.length === 0 ? (
        <div className="empty-state-box">
          <Sprout size={48} className="text-muted" />
          <h3>{isKn ? 'ಯಾವುದೇ ಹೊಂದಾಣಿಕೆಯ ಬೆಳೆಗಳು ಕಂಡುಬಂದಿಲ್ಲ' : 'No matching crops found'}</h3>
          <p>{isKn ? 'ದಯವಿಟ್ಟು ಫಿಲ್ಟರ್‌ಗಳನ್ನು ಸಡಿಲಿಸಿ ಅಥವಾ ಜಿಲ್ಲೆಯನ್ನು ಬದಲಾಯಿಸಿ.' : 'Try adjusting the category, water requirement, or budget filters.'}</p>
        </div>
      ) : (
        <div className="recommendations-card-list">
          {filteredRecommendations.map((item) => {
            const fin = item.profit_data.financials;
            const mandi = item.profit_data.mandi;
            const yld = item.profit_data.yield;
            const harvest = item.profit_data.forecast_at_harvest;

            const isTopRanked = item.rank <= 3;
            const profitColorClass = fin.net_profit_acre > 80000 ? 'text-emerald' : fin.net_profit_acre > 30000 ? 'text-blue' : 'text-amber';

            return (
              <div
                key={item.crop_id}
                className={`crop-rec-card ${isTopRanked ? 'top-tier-card' : ''}`}
              >
                {/* Card Header */}
                <div className="rec-card-header">
                  <div className="crop-identity-group">
                    <span className="rank-badge">#{item.rank}</span>
                    <div>
                      <h3 className="crop-name-title">
                        {item.crop_name}{' '}
                        {item.crop_name_kannada && (
                          <span className="kannada-name">({item.crop_name_kannada})</span>
                        )}
                      </h3>
                      {item.scientific_name && (
                        <span className="scientific-name">{item.scientific_name}</span>
                      )}
                    </div>
                  </div>

                  <div className="crop-badges-group">
                    <span className="category-pill">{item.category}</span>
                    <span
                      className={`score-pill ${
                        item.suitability_score >= 85
                          ? 'score-high'
                          : item.suitability_score >= 70
                          ? 'score-med'
                          : 'score-low'
                      }`}
                      title="Agro-Climatic Suitability Score based on temperature, rainfall & soil"
                    >
                      ★ {item.suitability_score}% {isKn ? 'ಹೊಂದಾಣಿಕೆ' : 'Match'}
                    </span>
                    <span className="water-pill" title="Water requirement">
                      <Droplets size={13} />
                      {item.water_needs}
                    </span>
                  </div>
                </div>

                {/* Main Metrics Matrix */}
                <div className="rec-card-matrix">
                  {/* Financial Column */}
                  <div className="matrix-col financial-col">
                    <span className="matrix-label">
                      {isKn ? 'ಅಂದಾಜು ನಿವ್ವಳ ಲಾಭ' : 'Expected Net Profit'}
                    </span>
                    <div className={`matrix-large-num ${profitColorClass}`}>
                      ₹{Math.round(fin.net_profit_acre).toLocaleString('en-IN')}
                      <span className="per-unit">/{isKn ? 'ಎಕರೆ' : 'acre'}</span>
                    </div>
                    {acres > 1 && (
                      <div className="scaled-total-profit">
                        {isKn ? `${acres} ಎಕರೆಗೆ ಒಟ್ಟು:` : `Total for ${acres} acres:`}{' '}
                        <strong>₹{Math.round(fin.scaled_net_profit).toLocaleString('en-IN')}</strong>
                      </div>
                    )}
                    <div className="financial-substats">
                      <span>{isKn ? 'ಆದಾಯ:' : 'Gross:'} ₹{Math.round(fin.gross_revenue_acre).toLocaleString('en-IN')}</span>
                      <span>•</span>
                      <span>{isKn ? 'ವೆಚ್ಚ:' : 'Costs:'} ₹{Math.round(fin.total_cost_acre).toLocaleString('en-IN')}</span>
                      <span>•</span>
                      <span>ROI: {fin.roi_pct}%</span>
                    </div>
                  </div>

                  {/* Mandi & Realization Column */}
                  <div className="matrix-col mandi-col">
                    <span className="matrix-label">
                      {isKn ? 'ಸೂಕ್ತ ಎಪಿಎಂಸಿ ಮಾರುಕಟ್ಟೆ' : 'Best Return Mandi'}
                    </span>
                    <div className="mandi-title">
                      <Building2 size={16} className="text-emerald" />
                      <span>{mandi.best_mandi_name}</span>
                    </div>
                    <div className="mandi-price-tag">
                      ₹{mandi.modal_price}{' '}
                      <span className="per-unit">/ {isKn ? 'ಕ್ವಿಂಟಾಲ್' : 'quintal'}</span>
                    </div>
                    <div className="mandi-distance-tag">
                      {mandi.distance_km} km {isKn ? 'ದೂರ' : 'away'} (₹{mandi.transport_deduction_per_q} {isKn ? 'ಸಾಗಣೆ/ಕ್ವಿಂ' : 'freight/q'})
                    </div>
                    <div className="breakeven-tag">
                      {isKn ? 'ಕನಿಷ್ಠ ಬ್ರೇಕ್-ಈವನ್ ಬೆಲೆ:' : 'Break-even Price:'} <strong>₹{fin.break_even_price_per_q}/q</strong>
                    </div>
                  </div>

                  {/* Agronomic Timing Column */}
                  <div className="matrix-col timing-col">
                    <span className="matrix-label">
                      {isKn ? 'ಕಾಲಮಿತಿ & ಇಳುವರಿ' : 'Timeline & Yield'}
                    </span>
                    <div className="timing-info-row">
                      <Calendar size={14} className="text-muted" />
                      <span>{isKn ? 'ಅವಧಿ:' : 'Duration:'} {item.growing_duration_days}</span>
                    </div>
                    <div className="timing-info-row">
                      <Sprout size={14} className="text-emerald" />
                      <span>{isKn ? 'ಮಾರುಕಟ್ಟೆ ಇಳುವರಿ:' : 'Marketable Yield:'} <strong>{yld.marketable_yield_q_acre} q/acre</strong></span>
                    </div>
                    <div className="timing-info-row">
                      <TrendingUp size={14} className="text-blue" />
                      <span>{isKn ? 'ಕೊಯ್ಲಿನ ನಿರೀಕ್ಷಿತ ಬೆಲೆ:' : 'Harvest Est. Price:'} {harvest.projected_price_range}</span>
                    </div>
                    <div className="timing-date-tag">
                      {isKn ? 'ಅಂದಾಜು ಕೊಯ್ಲು:' : 'Est. Harvest:'} {harvest.expected_harvest_date}
                    </div>
                  </div>
                </div>

                {/* Reasoning & Risk Alerts Footer */}
                <div className="rec-card-footer">
                  <div className="reasoning-summary">
                    <div className="reasoning-line">
                      <CheckCircle2 size={14} className="text-emerald" />
                      <span>{item.season_reasoning}</span>
                    </div>
                    {item.weather_risks && item.weather_risks.length > 0 && (
                      <div className="risk-line">
                        <AlertTriangle size={14} className="text-amber" />
                        <span>{item.weather_risks[0]}</span>
                      </div>
                    )}
                  </div>

                  <button
                    className="deep-dive-btn"
                    onClick={() => {
                      setActiveModalCrop(item);
                      setModalTab('financials');
                    }}
                  >
                    <span>{isKn ? 'ಪೂರ್ಣ ವಿಶ್ಲೇಷಣೆ' : 'Deep-Dive Analysis'}</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Deep-Dive Modal for Selected Crop */}
      {activeModalCrop && (
        <div className="modal-backdrop" onClick={() => setActiveModalCrop(null)}>
          <div className="deep-dive-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-header-titles">
                <span className="rank-badge">#{activeModalCrop.rank}</span>
                <div>
                  <h3 className="modal-crop-title">
                    {activeModalCrop.crop_name}{' '}
                    {activeModalCrop.crop_name_kannada && `(${activeModalCrop.crop_name_kannada})`}
                  </h3>
                  <span className="modal-crop-sub">
                    {activeModalCrop.scientific_name} • {activeModalCrop.category} • {selectedDistrict}, Karnataka
                  </span>
                </div>
              </div>

              <button className="modal-close-btn" onClick={() => setActiveModalCrop(null)}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="modal-tabs-strip">
              <button
                className={`modal-tab-btn ${modalTab === 'financials' ? 'active' : ''}`}
                onClick={() => setModalTab('financials')}
              >
                <DollarSign size={16} />
                <span>{isKn ? 'ಆರ್ಥಿಕ & ಸನ್ನಿವೇಶಗಳು' : 'Financials & Scenarios'}</span>
              </button>

              <button
                className={`modal-tab-btn ${modalTab === 'agronomic' ? 'active' : ''}`}
                onClick={() => setModalTab('agronomic')}
              >
                <Thermometer size={16} />
                <span>{isKn ? 'ಕೃಷಿ & ಹವಾಮಾನ ಹೊಂದಾಣಿಕೆ' : 'Agronomic & Weather'}</span>
              </button>

              <button
                className={`modal-tab-btn ${modalTab === 'forecast' ? 'active' : ''}`}
                onClick={() => setModalTab('forecast')}
              >
                <TrendingUp size={16} />
                <span>{isKn ? 'ಕೊಯ್ಲಿನ ಬೆಲೆ ಮುನ್ಸೂಚನೆ' : 'Harvest Forecast'}</span>
              </button>

              <button
                className={`modal-tab-btn ${modalTab === 'provenance' ? 'active' : ''}`}
                onClick={() => setModalTab('provenance')}
              >
                <FileCheck2 size={16} />
                <span>{isKn ? 'ದೃಢೀಕೃತ ದತ್ತಾಂಶ ಮೂಲಗಳು' : 'Data Provenance'}</span>
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="modal-content-scroll">
              {/* TAB 1: FINANCIALS & SCENARIOS */}
              {modalTab === 'financials' && (
                <div className="tab-financials-body">
                  <h4 className="section-title">
                    {isKn ? '3-ಹಂತದ ಸನ್ನಿವೇಶ ವಿಶ್ಲೇಷಣೆ (ಎಕರೆಗೆ)' : '3-Tier Scenario Profit Analysis (Per Acre)'}
                  </h4>
                  <p className="section-desc">
                    {isKn
                      ? 'ಹವಾಮಾನ ಏರಿಳಿತ, ಕೀಟಬಾಧೆ ಹಾಗೂ ಮಾರುಕಟ್ಟೆ ಬೆಲೆ ವ್ಯತ್ಯಾಸಗಳನ್ನು ಗಣನೆಗೆ ತೆಗೆದುಕೊಂಡು ತಯಾರಿಸಿದ ಕನ್ಸರ್ವೇಟಿವ್, ಬೇಸ್‌ಲೈನ್ ಮತ್ತು ಆಶಾವಾದಿ ಮಾದರಿಗಳು.'
                      : 'Rigorous mathematical projections accounting for marketable yield variations, price volatility, and transport deductions.'}
                  </p>

                  <div className="scenarios-table-wrap">
                    <table className="scenarios-table">
                      <thead>
                        <tr>
                          <th>{isKn ? 'ಸನ್ನಿವೇಶ' : 'Scenario'}</th>
                          <th>{isKn ? 'ಇಳುವರಿ' : 'Marketable Yield'}</th>
                          <th>{isKn ? 'ಮಾರಾಟ ಬೆಲೆ' : 'Selling Price'}</th>
                          <th>{isKn ? 'ಒಟ್ಟು ಆದಾಯ' : 'Gross Revenue'}</th>
                          <th>{isKn ? 'ಒಟ್ಟು ವೆಚ್ಚ' : 'Total Costs'}</th>
                          <th>{isKn ? 'ನಿವ್ವಳ ಲಾಭ' : 'Net Profit / Acre'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {['conservative', 'baseline', 'optimistic'].map((scKey) => {
                          const sc = activeModalCrop.profit_data.scenarios[scKey];
                          const isBase = scKey === 'baseline';
                          return (
                            <tr key={scKey} className={isBase ? 'baseline-row' : ''}>
                              <td className="scenario-name-cell">
                                <strong>{scKey.toUpperCase()}</strong>
                                <span className="sc-desc-mini">{sc.assumptions}</span>
                              </td>
                              <td>{sc.yield_q_acre} q</td>
                              <td>₹{sc.selling_price_per_q}/q</td>
                              <td>₹{Math.round(sc.gross_revenue_acre).toLocaleString('en-IN')}</td>
                              <td>₹{Math.round(sc.total_cost_acre).toLocaleString('en-IN')}</td>
                              <td className="net-profit-cell">
                                <strong>₹{Math.round(sc.net_profit_acre).toLocaleString('en-IN')}</strong>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <h4 className="section-title mt-6">
                    {isKn ? 'ಎಕರೆವಾರು ಕೃಷಿ ವೆಚ್ಚಗಳ ವಿವರಣೆ (ಯುಎಎಸ್ ಬೆಂಗಳೂರು & CACP)' : 'Itemized Cultivation Cost Breakdown (UAS Bengaluru & CACP)'}
                  </h4>
                  <div className="costs-breakdown-grid">
                    {[
                      { label: isKn ? 'ಬೀಜ / ಸಸಿ' : 'Seed / Seedlings', val: activeModalCrop.profit_data.costs.seed_cost_per_acre },
                      { label: isKn ? 'ಗೊಬ್ಬರ & ಪೋಷಕಾಂಶ' : 'Fertilizers & Nutrients', val: activeModalCrop.profit_data.costs.fertilizer_cost_per_acre },
                      { label: isKn ? 'ಕೂಲಿ ಕಾರ್ಮಿಕರು' : 'Labour & Weeding', val: activeModalCrop.profit_data.costs.labour_cost_per_acre },
                      { label: isKn ? 'ನೀರಾವರಿ & ವಿದ್ಯುತ್' : 'Irrigation & Pumping', val: activeModalCrop.profit_data.costs.irrigation_cost_per_acre },
                      { label: isKn ? 'ಸಸ್ಯ ಸಂರಕ್ಷಣೆ (ಕೀಟನಾಶಕ)' : 'Crop Protection', val: activeModalCrop.profit_data.costs.crop_protection_cost_per_acre },
                      { label: isKn ? 'ಯಂತ್ರೋಪಕರಣ & ಉಳುಮೆ' : 'Machinery & Tillage', val: activeModalCrop.profit_data.costs.machinery_tillage_cost_per_acre },
                      { label: isKn ? 'ಕೊಯ್ಲು ವೆಚ್ಚ' : 'Harvesting & Sorting', val: activeModalCrop.profit_data.costs.harvesting_cost_per_acre },
                      { label: isKn ? 'ಪ್ಯಾಕಿಂಗ್ & ಸಾಗಣೆ' : 'Packaging & APMC Freight', val: activeModalCrop.profit_data.costs.packaging_transport_cost_per_acre + activeModalCrop.profit_data.costs.transport_cost_acre }
                    ].map((cItem, i) => (
                      <div key={i} className="cost-item-box">
                        <span className="cost-label">{cItem.label}</span>
                        <span className="cost-val">₹{Math.round(cItem.val).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>

                  <div className="breakeven-banner">
                    <Info size={18} className="text-blue" />
                    <div>
                      <strong>{isKn ? 'ಬ್ರೇಕ್-ಈವನ್ ಮಾರಾಟ ಬೆಲೆ:' : 'Break-Even Threshold:'}</strong> ₹{activeModalCrop.profit_data.financials.break_even_price_per_q} / {isKn ? 'ಕ್ವಿಂಟಾಲ್' : 'quintal'}.{' '}
                      {isKn
                        ? 'ಈ ಬೆಲೆಗಿಂತ ಹೆಚ್ಚಿನ ದರದಲ್ಲಿ ಮಾರಾಟ ಮಾಡಿದಾಗ ನಿಮ್ಮ ಜಮೀನು ಲಾಭ ಗಳಿಸುತ್ತದೆ.'
                        : 'Any mandi selling price above this value generates a positive net return for the farmer.'}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: AGRONOMIC & WEATHER COMPATIBILITY */}
              {modalTab === 'agronomic' && (
                <div className="tab-agronomic-body">
                  <h4 className="section-title">
                    {isKn ? 'ಐಸಿಎಆರ್ ಕೃಷಿ-ಹವಾಮಾನ ಅಗತ್ಯತೆಗಳು' : 'Scientific Crop Growing Parameters (ICAR Guide)'}
                  </h4>

                  <div className="agronomic-spec-grid">
                    <div className="spec-card">
                      <Thermometer size={20} className="text-amber" />
                      <div>
                        <span className="spec-lbl">{isKn ? 'ಸೂಕ್ತ ತಾಪಮಾನ ಶ್ರೇಣಿ' : 'Optimal Temperature'}</span>
                        <h4 className="spec-val">{activeModalCrop.optimal_temp_range}</h4>
                        <span className="spec-sub">{isKn ? 'ಪ್ರಸ್ತುತ:' : 'Current:'} {weather?.current_temperature}°C</span>
                      </div>
                    </div>

                    <div className="spec-card">
                      <Droplets size={20} className="text-blue" />
                      <div>
                        <span className="spec-lbl">{isKn ? 'ನೀರಿನ ಅಗತ್ಯತೆ' : 'Water Needs'}</span>
                        <h4 className="spec-val">{activeModalCrop.water_needs}</h4>
                        <span className="spec-sub">{isKn ? '7-ದಿನಗಳ ಮಳೆ:' : '7d Forecast:'} {weather?.precipitation_7d_mm} mm</span>
                      </div>
                    </div>

                    <div className="spec-card">
                      <Layers size={20} className="text-emerald" />
                      <div>
                        <span className="spec-lbl">{isKn ? 'ಮಣ್ಣಿನ pH ಮತ್ತು ವಿಧ' : 'Soil pH & Soil Type'}</span>
                        <h4 className="spec-val">pH {activeModalCrop.soil_ph_range}</h4>
                        <span className="spec-sub">{activeModalCrop.soil_type}</span>
                      </div>
                    </div>

                    <div className="spec-card">
                      <Calendar size={20} className="text-purple" />
                      <div>
                        <span className="spec-lbl">{isKn ? 'ಬೆಳೆಯುವ ಅವಧಿ' : 'Growing Duration'}</span>
                        <h4 className="spec-val">{activeModalCrop.growing_duration_days}</h4>
                        <span className="spec-sub">{isKn ? 'ಋತುಮಾನ:' : 'Season:'} {activeModalCrop.season}</span>
                      </div>
                    </div>
                  </div>

                  <h4 className="section-title mt-6">
                    {isKn ? 'ಹವಾಮಾನ ಸೂಕ್ಷ್ಮತೆ & ಸಂಭವನೀಯ ಅಪಾಯಗಳು' : 'Weather Sensitivities & Field Precautions'}
                  </h4>
                  <div className="weather-risks-container">
                    {activeModalCrop.weather_risks && activeModalCrop.weather_risks.length > 0 ? (
                      activeModalCrop.weather_risks.map((risk, idx) => (
                        <div key={idx} className="weather-risk-alert-item">
                          <AlertTriangle size={18} className="text-amber" />
                          <span>{risk}</span>
                        </div>
                      ))
                    ) : (
                      <div className="weather-risk-clear-item">
                        <CheckCircle2 size={18} className="text-emerald" />
                        <span>{isKn ? 'ಹವಾಮಾನ ಪರಿಸ್ಥಿತಿಗಳು ಈ ಬೆಳೆಗೆ ಸಂಪೂರ್ಣವಾಗಿ ಅನುಕೂಲಕರವಾಗಿವೆ.' : 'Atmospheric conditions and 7-day numerical forecasts are fully within optimal thresholds.'}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: HARVEST FORECAST */}
              {modalTab === 'forecast' && (
                <div className="tab-forecast-body">
                  <h4 className="section-title">
                    {isKn ? 'ಕೊಯ್ಲಿನ ಸಮಯದಲ್ಲಿ ಮಾರುಕಟ್ಟೆ ಬೆಲೆ ಮುನ್ಸೂಚನೆ' : 'Projected Mandi Price at Harvest Window'}
                  </h4>

                  <div className="forecast-kpi-banner">
                    <div className="f-kpi-item">
                      <span className="f-lbl">{isKn ? 'ಅಂದಾಜು ಕೊಯ್ಲು ದಿನಾಂಕ' : 'Expected Harvest Date'}</span>
                      <h3 className="f-val">{activeModalCrop.profit_data.forecast_at_harvest.expected_harvest_date}</h3>
                      <span className="f-sub">({activeModalCrop.profit_data.forecast_at_harvest.harvest_month} Season)</span>
                    </div>

                    <div className="f-kpi-item">
                      <span className="f-lbl">{isKn ? 'ಪ್ರಸ್ತುತ ಎಪಿಎಂಸಿ ದರ' : 'Current Mandi Price'}</span>
                      <h3 className="f-val">₹{activeModalCrop.profit_data.mandi.modal_price}/q</h3>
                      <span className="f-sub">{activeModalCrop.profit_data.mandi.best_mandi_name}</span>
                    </div>

                    <div className="f-kpi-item highlight">
                      <span className="f-lbl">{isKn ? 'ನಿರೀಕ್ಷಿತ ಬೆಲೆ ಶ್ರೇಣಿ' : 'Forecast Price Range'}</span>
                      <h3 className="f-val text-emerald">{activeModalCrop.profit_data.forecast_at_harvest.projected_price_range}</h3>
                      <span className="f-sub">{isKn ? 'ಕಾಲೋಚಿತ ಸೂಚ್ಯಂಕ:' : 'Seasonal Index:'} {activeModalCrop.profit_data.forecast_at_harvest.seasonal_price_index}x</span>
                    </div>
                  </div>

                  <h4 className="section-title mt-6">
                    {isKn ? 'ಮುನ್ಸೂಚನಾ ಮಾದರಿ ಮೌಲ್ಯಮಾಪನ & ನಿಖರತೆ' : 'Model Error Evaluation & Historical Backtest'}
                  </h4>
                  <div className="model-eval-grid">
                    <div className="eval-item">
                      <span className="eval-lbl">Mean Absolute Error (MAE)</span>
                      <h4 className="eval-val">₹{activeModalCrop.profit_data.forecast_at_harvest.model_evaluation.mae_rs_per_q} / q</h4>
                    </div>
                    <div className="eval-item">
                      <span className="eval-lbl">Root Mean Squared Error (RMSE)</span>
                      <h4 className="eval-val">₹{activeModalCrop.profit_data.forecast_at_harvest.model_evaluation.rmse_rs_per_q} / q</h4>
                    </div>
                    <div className="eval-item">
                      <span className="eval-lbl">Mean Absolute % Error (MAPE)</span>
                      <h4 className="eval-val text-emerald">{activeModalCrop.profit_data.forecast_at_harvest.model_evaluation.mape_pct}%</h4>
                      <span className="eval-sub">vs {activeModalCrop.profit_data.forecast_at_harvest.model_evaluation.baseline_mape_pct}% Baseline</span>
                    </div>
                  </div>

                  <div className="limitations-callout">
                    <ShieldAlert size={18} className="text-amber" />
                    <div>
                      <strong>{isKn ? 'ಮುನ್ಸೂಚನಾ ಮಿತಿಗಳು:' : 'Forecasting Limitations:'}</strong>{' '}
                      {activeModalCrop.profit_data.forecast_at_harvest.model_evaluation.limitations}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: DATA PROVENANCE */}
              {modalTab === 'provenance' && (
                <div className="tab-provenance-body">
                  <h4 className="section-title">
                    {isKn ? 'ದೃಢೀಕೃತ ಕೃಷಿ ದತ್ತಾಂಶ ಮೂಲಗಳು' : 'Verified Data Provenance & Ingestion Sources'}
                  </h4>

                  <div className="provenance-cards-list">
                    <div className="prov-card">
                      <div className="prov-badge verified">ICAR Verified</div>
                      <h4>ICAR-IIHR Bengaluru & National Horticulture Board</h4>
                      <p>Crop growing temperatures, rainfall thresholds, and soil pH constraints.</p>
                    </div>

                    <div className="prov-card">
                      <div className="prov-badge academic">Academic Research</div>
                      <h4>University of Agricultural Sciences (UAS), Bengaluru</h4>
                      <p>Package of Practices, regional agro-climatic zones, and itemized cultivation cost studies.</p>
                    </div>

                    <div className="prov-card">
                      <div className="prov-badge official">Government Published</div>
                      <h4>Department of Agriculture and Farmers Welfare (DA&FW)</h4>
                      <p>District-level crop productivity and yield statistics for Karnataka.</p>
                    </div>

                    <div className="prov-card">
                      <div className="prov-badge streaming">Real-Time Streaming</div>
                      <h4>Open-Meteo Weather API</h4>
                      <p>High-resolution numerical weather forecasts (ECMWF, DWD, GFS) with zero fabricated observations.</p>
                    </div>

                    <div className="prov-card">
                      <div className="prov-badge sync">Government API</div>
                      <h4>AGMARKNET / data.gov.in</h4>
                      <p>Daily mandi arrivals, modal prices, and APMC trade observations across Karnataka.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. Data Source Provenance Modal */}
      {isAuditModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAuditModalOpen(false)}>
          <div className="audit-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-titles">
                <FileCheck2 size={24} className="text-emerald" />
                <div>
                  <h3 className="modal-crop-title">
                    {isKn ? 'ದತ್ತಾಂಶ ಮೂಲಗಳ ದೃಢೀಕರಣ ಲಾಗ್‌ಗಳು' : 'Connected Agricultural Data Sources & Audit Log'}
                  </h3>
                  <span className="modal-crop-sub">
                    {isKn ? 'ಹಿಂಬಾಲಿಸಬಹುದಾದ ಮತ್ತು ಪರಿಶೀಲಿಸಬಹುದಾದ ಅಧಿಕೃತ ಕೃಷಿ ದಾಖಲೆಗಳು' : 'Traceable, officially verified records in FARMPRICE_DB.AGRICULTURE'}
                  </span>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setIsAuditModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="audit-modal-body">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>{isKn ? 'ದತ್ತಾಂಶ ಸಂಸ್ಥೆ' : 'Source Organization'}</th>
                    <th>{isKn ? 'ಮಾಹಿತಿ ಸಂಗ್ರಹ' : 'Dataset Scope'}</th>
                    <th>{isKn ? 'ದಾಖಲೆಗಳು' : 'Records'}</th>
                    <th>{isKn ? 'ಸ್ಥಿತಿ' : 'Verification Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log, i) => (
                    <tr key={i}>
                      <td><strong>{log.source_name}</strong></td>
                      <td>
                        <span className="log-dataset-name">{log.dataset_name}</span>
                        <span className="log-summary-sub">{log.coverage_summary}</span>
                      </td>
                      <td>{log.records_ingested || 'Live'}</td>
                      <td>
                        <span className="status-chip active">
                          <CheckCircle2 size={12} />
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
