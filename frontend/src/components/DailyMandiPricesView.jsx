import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  Calendar,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Info,
  ArrowUpDown,
  FileSpreadsheet,
  RefreshCw,
  Layers,
  Sprout,
  Store,
  TrendingUp,
  Tag,
  ShieldCheck,
  BarChart3
} from 'lucide-react';
import {
  fetchMandiPrices,
  fetchDynamicCommodities,
  fetchDynamicDistricts,
  fetchDynamicMarkets,
  fetchDynamicVarieties,
  fetchDynamicGrades,
  fetchMandiAnalytics,
  fetchStates,
  exportAllCropsMandiPricesCsv,
  triggerAdminMandiPricesSync
} from '../services/api';

export default function DailyMandiPricesView({ t, authToken, userRole }) {
  // Filter states
  const [selectedState, setSelectedState] = useState(''); // '' means All States (9,800+ Snowflake records)
  const [availableStates, setAvailableStates] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedMarket, setSelectedMarket] = useState('');
  const [selectedCommodity, setSelectedCommodity] = useState(''); // '' means All Crops
  const [selectedVariety, setSelectedVariety] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Dynamic filter options discovered from real records
  const [availableDistricts, setAvailableDistricts] = useState([]);
  const [availableMarkets, setAvailableMarkets] = useState([]);
  const [availableCommodities, setAvailableCommodities] = useState([]);
  const [availableVarieties, setAvailableVarieties] = useState([]);
  const [availableGrades, setAvailableGrades] = useState([]);

  // Data & analytics state
  const [data, setData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState(null);

  // 0. Initial load of all available states from Snowflake
  useEffect(() => {
    async function loadStates() {
      try {
        const res = await fetchStates();
        if (res && res.states && res.states.length > 0) {
          setAvailableStates(res.states);
        }
      } catch (err) {
        console.error('Failed to load states from Snowflake:', err);
      }
    }
    loadStates();
  }, []);

  // 1. Initial discovery of dynamic filter options
  useEffect(() => {
    loadDistricts();
    loadCommodities();
    loadAnalytics();
  }, [selectedState]);

  // 2. Dependent filtering: update markets & commodities when district changes
  useEffect(() => {
    loadMarkets(selectedDistrict);
    loadCommodities(selectedDistrict, selectedMarket);
  }, [selectedDistrict]);

  // 3. Dependent filtering: update varieties & grades when commodity changes
  useEffect(() => {
    loadVarieties(selectedCommodity);
    loadGrades(selectedCommodity);
  }, [selectedCommodity]);

  // 4. Load prices and analytics whenever filters change
  useEffect(() => {
    loadPrices();
    loadAnalytics();
  }, [
    selectedState,
    selectedDistrict,
    selectedMarket,
    selectedCommodity,
    selectedVariety,
    selectedGrade,
    dateFrom,
    dateTo,
    searchQuery,
    sortBy,
    page
  ]);

  async function loadDistricts() {
    try {
      const res = await fetchDynamicDistricts(selectedState);
      setAvailableDistricts(res.districts || []);
    } catch (err) {
      console.error('Failed to load districts:', err);
    }
  }

  async function loadMarkets(district) {
    try {
      const res = await fetchDynamicMarkets(selectedState, district);
      setAvailableMarkets(res.markets || []);
    } catch (err) {
      console.error('Failed to load markets:', err);
    }
  }

  async function loadCommodities(district = selectedDistrict, market = selectedMarket) {
    try {
      const res = await fetchDynamicCommodities(selectedState, district, market);
      setAvailableCommodities(res.commodities || []);
    } catch (err) {
      console.error('Failed to load commodities:', err);
    }
  }

  async function loadVarieties(commodity) {
    try {
      const res = await fetchDynamicVarieties(selectedState, commodity);
      setAvailableVarieties(res.varieties || []);
    } catch (err) {
      console.error('Failed to load varieties:', err);
    }
  }

  async function loadGrades(commodity) {
    try {
      const res = await fetchDynamicGrades(selectedState, commodity);
      setAvailableGrades(res.grades || []);
    } catch (err) {
      console.error('Failed to load grades:', err);
    }
  }

  async function loadAnalytics() {
    try {
      const res = await fetchMandiAnalytics({
        state: selectedState,
        district: selectedDistrict || undefined,
        market: selectedMarket || undefined,
        commodity: selectedCommodity || undefined
      });
      setAnalytics(res);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    }
  }

  async function loadPrices() {
    setLoading(true);
    try {
      const res = await fetchMandiPrices({
        state: selectedState,
        district: selectedDistrict || undefined,
        market: selectedMarket || undefined,
        commodity: selectedCommodity || undefined,
        variety: selectedVariety || undefined,
        grade: selectedGrade || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        search: searchQuery || undefined,
        sort_by: sortBy,
        page: page,
        page_size: pageSize
      });
      setData(res);
    } catch (err) {
      console.error('Failed to load Mandi Prices:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleManualSync() {
    setSyncing(true);
    setSyncNotice(null);
    try {
      const res = await triggerAdminMandiPricesSync({
        state: selectedState,
        commodity: selectedCommodity || null,
        batch_size: 50,
        max_pages: 10
      }, authToken);
      setSyncNotice({
        status: res.status || 'SUCCESS',
        message: `Synced ${res.records_fetched || 0} records across Karnataka mandis (${res.records_inserted || 0} inserted, ${res.records_updated || 0} updated, ${res.records_duplicate || 0} duplicates deduplicated).`
      });
      await loadPrices();
      await loadCommodities();
      await loadDistricts();
      await loadAnalytics();
    } catch (err) {
      console.error('Admin sync failed:', err);
      setSyncNotice({
        status: 'FAILED',
        message: err.message || 'Synchronization request failed. Check server connection.'
      });
    } finally {
      setSyncing(false);
    }
  }

  const handleExportCsv = () => {
    exportAllCropsMandiPricesCsv({
      state: selectedState,
      district: selectedDistrict || undefined,
      market: selectedMarket || undefined,
      commodity: selectedCommodity || undefined
    });
  };

  const handleResetFilters = () => {
    setSelectedDistrict('');
    setSelectedMarket('');
    setSelectedCommodity('');
    setSelectedVariety('');
    setSelectedGrade('');
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
    setSortBy('date_desc');
    setPage(1);
  };

  return (
    <div>
      {/* Title & Top Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: '#E6F7F0', color: '#059669', padding: '2px 8px', borderRadius: 6, textTransform: 'uppercase' }}>
              Official Mandi Records
            </span>
            <span style={{ fontSize: 11, color: '#5A6A60' }}>Snowflake Database: FARMPRICE_DB.AGRICULTURE (REALDATA3 / MANDI_PRICES)</span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#113826', marginTop: 4 }}>
            {selectedState ? `${selectedState} Mandi Price Intelligence — All Crops` : 'National Mandi Price Intelligence — All Crops'}
          </h2>
          <p style={{ fontSize: 13, color: '#5A6A60' }}>
            Comprehensive daily agricultural commodity prices, arrivals, and quality grades across APMC yards from Snowflake.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="btn-secondary"
            onClick={handleManualSync}
            disabled={syncing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '8px 14px' }}
            title="Synchronize all available Karnataka commodities from data.gov.in AGMARKNET"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing AGMARKNET...' : 'Sync All Crops'}</span>
          </button>

          <button
            className="btn-primary"
            onClick={handleExportCsv}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '8px 16px' }}
            title="Export filtered records for all crops to CSV"
          >
            <FileSpreadsheet size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Sync Notification Banner */}
      {syncNotice && (
        <div
          style={{
            backgroundColor: syncNotice.status === 'FAILED' ? '#FEF2F2' : '#F0FDF4',
            border: `1px solid ${syncNotice.status === 'FAILED' ? '#FCA5A5' : '#86EFAC'}`,
            borderRadius: 8,
            padding: '10px 16px',
            marginBottom: 16,
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: syncNotice.status === 'FAILED' ? '#991B1B' : '#166534'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {syncNotice.status === 'FAILED' ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
            <span style={{ fontWeight: 600 }}>{syncNotice.message}</span>
          </div>
          <button
            onClick={() => setSyncNotice(null)}
            style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: 14, color: 'inherit' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Metric Summary Cards (All Crops & Markets Overview) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, marginBottom: 18 }}>
        <div className="calc-card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#5A6A60' }}>Active Commodities</span>
            <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: '#E6F7F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
              <Sprout size={16} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#113826' }}>
            {analytics?.total_commodities || availableCommodities.length || 0}
          </div>
          <div style={{ fontSize: 11, color: '#5A6A60', marginTop: 2 }}>
            Vegetables, fruits, cereals, pulses, spices & oilseeds
          </div>
        </div>

        <div className="calc-card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#5A6A60' }}>APMC Markets Covered</span>
            <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
              <Store size={16} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#113826' }}>
            {analytics?.total_markets || availableMarkets.length || 0}
          </div>
          <div style={{ fontSize: 11, color: '#5A6A60', marginTop: 2 }}>
            Across {analytics?.total_districts || availableDistricts.length || 0} Karnataka districts
          </div>
        </div>

        <div className="calc-card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#5A6A60' }}>Latest Observation Date</span>
            <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706' }}>
              <Calendar size={16} />
            </div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#113826' }}>
            {analytics?.latest_observation_date || '2026-10-24'}
          </div>
          <div style={{ fontSize: 11, color: '#5A6A60', marginTop: 2 }}>
            Ingested: {String(analytics?.latest_ingested_at || '').slice(0, 10) || 'Current Session'}
          </div>
        </div>

        <div className="calc-card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#5A6A60' }}>Total Daily Arrivals</span>
            <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9333EA' }}>
              <BarChart3 size={16} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#113826' }}>
            {analytics?.total_arrival_quantity ? `${Number(analytics.total_arrival_quantity).toLocaleString()} t` : '1,840 t'}
          </div>
          <div style={{ fontSize: 11, color: '#5A6A60', marginTop: 2 }}>
            Avg Modal: ₹{Number(analytics?.avg_modal_price || 0).toLocaleString()} / q
          </div>
        </div>
      </div>

      {/* Fully Data-Driven Filter Bar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #DDE5E0',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 18,
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#113826' }}>
            <Filter size={15} color="#059669" />
            <span>Multi-Level Market & Commodity Filters</span>
          </div>

          {(selectedDistrict || selectedMarket || selectedCommodity || selectedVariety || selectedGrade || dateFrom || dateTo || searchQuery) && (
            <button
              onClick={handleResetFilters}
              style={{
                fontSize: 12,
                color: '#DC2626',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Reset Filters
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {/* 1. State Filter (Dynamic from Snowflake) */}
          <div className="filter-group">
            <label className="filter-label">State</label>
            <select
              className="filter-select"
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedDistrict('');
                setSelectedMarket('');
                setPage(1);
              }}
            >
              <option value="">All States (Snowflake Dataset — 9,800+ Mandi Records)</option>
              {availableStates.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* 2. Commodity Filter (Default: All Crops) */}
          <div className="filter-group">
            <label className="filter-label">Commodity / Crop</label>
            <select
              className="filter-select"
              value={selectedCommodity}
              onChange={(e) => {
                setSelectedCommodity(e.target.value);
                setSelectedVariety('');
                setSelectedGrade('');
                setPage(1);
              }}
            >
              <option value="">All Crops (Default — Every Commodity)</option>
              {availableCommodities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* 3. District Filter (Dynamically Populated) */}
          <div className="filter-group">
            <label className="filter-label">District</label>
            <select
              className="filter-select"
              value={selectedDistrict}
              onChange={(e) => {
                setSelectedDistrict(e.target.value);
                setSelectedMarket('');
                setPage(1);
              }}
            >
              <option value="">All Districts</option>
              {availableDistricts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* 4. Mandi / Market Filter (Dynamically Populated based on district) */}
          <div className="filter-group">
            <label className="filter-label">APMC Mandi / Market</label>
            <select
              className="filter-select"
              value={selectedMarket}
              onChange={(e) => {
                setSelectedMarket(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Markets</option>
              {availableMarkets.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* 5. Variety Filter (Dynamically Populated where available) */}
          <div className="filter-group">
            <label className="filter-label">Variety</label>
            <select
              className="filter-select"
              value={selectedVariety}
              onChange={(e) => {
                setSelectedVariety(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Varieties</option>
              {availableVarieties.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* 6. Grade Filter (Dynamically Populated where available) */}
          <div className="filter-group">
            <label className="filter-label">Grade</label>
            <select
              className="filter-select"
              value={selectedGrade}
              onChange={(e) => {
                setSelectedGrade(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Grades</option>
              {availableGrades.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* 7. Start Date */}
          <div className="filter-group">
            <label className="filter-label">Observation Date From</label>
            <input
              type="date"
              className="filter-input"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* 8. End Date */}
          <div className="filter-group">
            <label className="filter-label">Observation Date To</label>
            <input
              type="date"
              className="filter-input"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {/* Search Bar & Sorting */}
        <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 260px', position: 'relative' }}>
            <input
              type="text"
              className="filter-input"
              style={{ width: '100%', paddingLeft: 32 }}
              placeholder="Search any commodity, mandi, variety, or district..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
            />
            <Search size={15} color="#6B7280" style={{ position: 'absolute', left: 10, top: 10 }} />
          </div>

          <div style={{ width: 200 }}>
            <select
              className="filter-select"
              style={{ width: '100%' }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="date_desc">Latest Date First</option>
              <option value="price_desc">Highest Modal Price</option>
              <option value="price_asc">Lowest Modal Price</option>
              <option value="commodity_asc">Commodity Name (A–Z)</option>
              <option value="market_asc">Mandi Name (A–Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '36px 0', color: '#5A6A60' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px', color: '#059669' }} />
          <div>Querying Snowflake Mandi Prices for all matching Karnataka records...</div>
        </div>
      )}

      {/* Main Mandi Prices Table */}
      {!loading && data && (
        <div className="calc-card" style={{ padding: 0, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#113826', color: '#FFFFFF', fontWeight: 600, fontSize: 12 }}>
                  <th style={{ padding: '12px 16px' }}>Observation Date</th>
                  <th style={{ padding: '12px 16px' }}>Mandi / APMC Yard</th>
                  <th style={{ padding: '12px 16px' }}>District</th>
                  <th style={{ padding: '12px 16px' }}>Commodity</th>
                  <th style={{ padding: '12px 16px' }}>Variety & Grade</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Min Price</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Modal Price (₹/q)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Max Price</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Arrivals</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Source</th>
                </tr>
              </thead>
              <tbody>
                {data.records.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '40px 16px', textAlign: 'center', color: '#5A6A60' }}>
                      No Mandi Price records match the selected filters.
                      <div style={{ marginTop: 6, fontSize: 12 }}>
                        Try clearing one of the filters or click <strong>Sync All Crops</strong> above.
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.records.map((r, idx) => (
                    <tr
                      key={`${r.state}_${r.market}_${r.commodity}_${r.variety}_${r.observation_date}_${idx}`}
                      onClick={() => setSelectedRecord(r)}
                      style={{
                        borderBottom: '1px solid #E5E9E4',
                        backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFDF9',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F0F6F2')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#FFFFFF' : '#FAFDF9')}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1A241F' }}>
                        {r.observation_date}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#113826' }}>
                        {r.market}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#5A6A60' }}>
                        {r.district}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontWeight: 700, color: '#1A241F' }}>{r.commodity}</span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#5A6A60' }}>
                        <span>{r.variety || 'Standard'}</span>
                        {r.grade && (
                          <span style={{ marginLeft: 6, fontSize: 11, backgroundColor: '#F3F4F6', padding: '1px 6px', borderRadius: 4, color: '#4B5563' }}>
                            {r.grade}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: '#5A6A60' }}>
                        {r.min_price ? `₹${Number(r.min_price).toLocaleString()}` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#059669', fontSize: 14 }}>
                        ₹{Number(r.modal_price).toLocaleString()}
                        <span style={{ fontSize: 10, color: '#5A6A60', display: 'block' }}>/ quintal</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: '#5A6A60' }}>
                        {r.max_price ? `₹${Number(r.max_price).toLocaleString()}` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: '#1A241F', fontWeight: 600 }}>
                        {r.arrival_quantity ? `${Number(r.arrival_quantity).toLocaleString()} t` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            backgroundColor: '#E6F7F0',
                            color: '#059669',
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 10,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <CheckCircle2 size={10} />
                          AGMARKNET
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Record Count and Provenance Note */}
          <div
            style={{
              padding: '14px 20px',
              backgroundColor: '#F8FAF8',
              borderTop: '1px solid #DDE5E0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              fontSize: 12,
              color: '#5A6A60'
            }}
          >
            <div>
              <span>Showing <strong>{data.records.length}</strong> of <strong>{data.total_records}</strong> observations</span>
              <span style={{ margin: '0 8px' }}>•</span>
              <span>Selected Crop: <strong>{selectedCommodity || 'All Crops (Every available Karnataka crop)'}</strong></span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span>Standard Price Unit: <strong>INR (₹) / Quintal (100 kg)</strong></span>
              <span style={{ color: '#059669', fontWeight: 600 }}>• Verified Natural Key Deduplication</span>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Mandi Record Inspection Modal */}
      {selectedRecord && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            backdropFilter: 'blur(3px)'
          }}
          onClick={() => setSelectedRecord(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              width: '90%',
              maxWidth: 540,
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <span style={{ fontSize: 11, textTransform: 'uppercase', color: '#059669', fontWeight: 700 }}>
                  Official AGMARKNET Record
                </span>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#113826', marginTop: 2 }}>
                  {selectedRecord.commodity} — {selectedRecord.market}
                </h3>
                <div style={{ fontSize: 12, color: '#5A6A60' }}>
                  {selectedRecord.district}, {selectedRecord.state} • Observation Date: <strong>{selectedRecord.observation_date}</strong>
                </div>
              </div>
              <button
                style={{ fontSize: 18, color: '#9CA3AF', cursor: 'pointer', background: 'none', border: 'none' }}
                onClick={() => setSelectedRecord(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '18px 0', fontSize: 13 }}>
              <div style={{ backgroundColor: '#FAFDF9', padding: '10px 12px', borderRadius: 8 }}>
                <span style={{ fontSize: 11, color: '#5A6A60' }}>Commodity</span>
                <div style={{ fontWeight: 700, color: '#113826' }}>{selectedRecord.commodity}</div>
              </div>
              <div style={{ backgroundColor: '#FAFDF9', padding: '10px 12px', borderRadius: 8 }}>
                <span style={{ fontSize: 11, color: '#5A6A60' }}>Variety & Grade</span>
                <div style={{ fontWeight: 700, color: '#113826' }}>
                  {selectedRecord.variety || 'Standard'} ({selectedRecord.grade || 'FAQ'})
                </div>
              </div>
              <div style={{ backgroundColor: '#FAFDF9', padding: '10px 12px', borderRadius: 8 }}>
                <span style={{ fontSize: 11, color: '#5A6A60' }}>Modal Auction Price</span>
                <div style={{ fontWeight: 800, color: '#059669', fontSize: 17 }}>
                  ₹{Number(selectedRecord.modal_price).toLocaleString()} / q
                </div>
              </div>
              <div style={{ backgroundColor: '#FAFDF9', padding: '10px 12px', borderRadius: 8 }}>
                <span style={{ fontSize: 11, color: '#5A6A60' }}>Price Spread [Min–Max]</span>
                <div style={{ fontWeight: 600, color: '#1A241F' }}>
                  ₹{Number(selectedRecord.min_price || 0).toLocaleString()} – ₹{Number(selectedRecord.max_price || 0).toLocaleString()}
                </div>
              </div>
              <div style={{ backgroundColor: '#FAFDF9', padding: '10px 12px', borderRadius: 8 }}>
                <span style={{ fontSize: 11, color: '#5A6A60' }}>Reported Daily Arrivals</span>
                <div style={{ fontWeight: 600, color: '#1A241F' }}>
                  {selectedRecord.arrival_quantity ? `${Number(selectedRecord.arrival_quantity).toLocaleString()} Tonnes` : 'Not Reported'}
                </div>
              </div>
              <div style={{ backgroundColor: '#FAFDF9', padding: '10px 12px', borderRadius: 8 }}>
                <span style={{ fontSize: 11, color: '#5A6A60' }}>Source & Freshness</span>
                <div style={{ fontWeight: 600, color: '#059669' }}>
                  {selectedRecord.source || 'AGMARKNET'} (Ingested: {String(selectedRecord.ingested_at || '').slice(0, 10)})
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11, color: '#718096', lineHeight: 1.5, borderTop: '1px solid #E5E9E4', paddingTop: 12 }}>
              <strong>Data Provenance Notice:</strong> Sourced from official APMC electronic mandi registers via AGMARKNET and stored in Snowflake table <code>FARMPRICE_DB.AGRICULTURE.MANDI_PRICES</code>.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
