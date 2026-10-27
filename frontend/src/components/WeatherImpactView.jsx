import React, { useState, useEffect } from 'react';
import {
  CloudRain,
  Sun,
  CloudSun,
  Wind,
  Droplets,
  AlertTriangle,
  Truck,
  Sprout,
  ShieldAlert,
  Info,
  Clock,
  CheckCircle2,
  MapPin,
  Compass,
  RefreshCw,
  Sunrise,
  Sunset,
  ArrowUpRight,
  TrendingDown,
  Navigation,
  Loader2
} from 'lucide-react';
import { fetchWeatherForecast, fetchWeatherImpact } from '../services/api';
import LocationSearchModal from './LocationSearchModal';

const COMMODITIES = [
  { id: 'Tomato', name: 'Tomato', category: 'Perishable', moistureAlert: 'Splits in rain > 10mm' },
  { id: 'Potato', name: 'Potato', category: 'Tubers', moistureAlert: 'Air cure after damp harvest' },
  { id: 'Onion', name: 'Onion', category: 'Semi-Perishable', moistureAlert: 'Cure in aerated shade' },
  { id: 'Ginger', name: 'Ginger', category: 'Tubers', moistureAlert: 'Wash & shade dry' },
  { id: 'Paddy', name: 'Paddy / Rice', category: 'Cereals', moistureAlert: 'Requires <14% grain moisture' },
  { id: 'Maize', name: 'Maize', category: 'Cereals', moistureAlert: 'Sun drying needed' },
  { id: 'Ragi', name: 'Ragi (Finger Millet)', category: 'Millets', moistureAlert: 'Pallet storage' }
];

export default function WeatherImpactView({
  t,
  currentLocation,
  onLocationChange,
  authToken = null
}) {
  const [selectedCrop, setSelectedCrop] = useState('Tomato');
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Active coordinates
  const activeLat = currentLocation?.latitude || 13.0033;
  const activeLon = currentLocation?.longitude || 76.1004;
  const activeLocName = currentLocation?.location_name || 'Hassan, Karnataka';

  useEffect(() => {
    loadWeatherData();
  }, [activeLat, activeLon, selectedCrop]);

  async function loadWeatherData() {
    setLoading(true);
    try {
      const data = await fetchWeatherForecast(activeLat, activeLon, activeLocName, selectedCrop);
      setForecastData(data);
    } catch (err) {
      console.warn('Weather forecast load error, falling back to impact:', err);
      try {
        const fallback = await fetchWeatherImpact(selectedCrop, activeLocName.split(',')[0], activeLat, activeLon);
        setForecastData({
          location_name: activeLocName,
          current: fallback.weather_observation?.current || fallback.weather_observation || {},
          daily: fallback.daily_forecast || [],
          hourly: fallback.hourly_forecast || [],
          agricultural_intelligence: {
            alerts: fallback.active_alerts || [],
            drying_advisory: fallback.drying_advisory,
            storage_advisory: fallback.storage_advisory,
            transport_logistics_advisory: fallback.transport_logistics_advisory,
            causation_disclaimer: fallback.causation_disclaimer
          }
        });
      } catch (e) {
        console.error(e);
      }
    } finally {
      setLoading(false);
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadWeatherData();
    setTimeout(() => setRefreshing(false), 500);
  };

  const current = forecastData?.current || {};
  const temp = current.temperature_celsius ?? forecastData?.temperature_celsius ?? 26.0;
  const feelsLike = current.apparent_temperature_celsius ?? current.feels_like_celsius ?? temp;
  const condition = current.condition || forecastData?.condition || 'Mainly Clear';
  const humidity = current.humidity_percent ?? forecastData?.humidity_percent ?? 65;
  const windKmh = current.wind_kmh ?? forecastData?.wind_kmh ?? 8.0;
  const rainChance = current.rain_chance_percent ?? forecastData?.rain_chance_percent ?? 15;
  const precipMm = current.precipitation_mm ?? current.rain_mm ?? 0.0;
  const daily = forecastData?.daily || [];
  const hourly = forecastData?.hourly || [];
  const agri = forecastData?.agricultural_intelligence || {};
  const alerts = agri?.alerts || agri?.active_alerts || [];

  const getConditionIcon = (cond = '') => {
    const c = cond.toLowerCase();
    if (c.includes('rain') || c.includes('drizzle')) return <CloudRain size={24} color="#0284C7" />;
    if (c.includes('cloud')) return <CloudSun size={24} color="#D97706" />;
    return <Sun size={24} color="#EA580C" />;
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Page Title & Global Subheader */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 20
        }}
      >
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#113826', margin: 0 }}>
            Agricultural Weather Intelligence & 7-Day Advisory
          </h2>
          <p style={{ fontSize: 13, color: '#5A6A60', margin: '4px 0 0 0' }}>
            Real-time agro-meteorological observations from Open-Meteo, harvest suitability windows, and transit corridor alerts.
          </p>
        </div>

        {/* Location & Refresh Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setIsLocationModalOpen(true)}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #C8DAD0',
              borderRadius: 10,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 700,
              color: '#1B5E3C',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
          >
            <MapPin size={15} />
            <span>{activeLocName.split(',')[0]} (Change Location)</span>
          </button>

          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            style={{
              backgroundColor: '#F3F7F4',
              border: '1px solid #D6E3DB',
              borderRadius: 10,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 600,
              color: '#2A4E3B',
              cursor: (refreshing || loading) ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <RefreshCw size={14} className={(refreshing || loading) ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Target Commodity Selector Bar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          padding: '14px 18px',
          border: '1px solid #DCE6E0',
          marginBottom: 22,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 800, color: '#113826', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Select Crop for Tailored Moisture & Harvest Advisory:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {COMMODITIES.map((c) => {
            const isSelected = selectedCrop === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCrop(c.id)}
                style={{
                  backgroundColor: isSelected ? '#1B5E3C' : '#F4F7F5',
                  color: isSelected ? '#FFFFFF' : '#2A4E3B',
                  border: '1px solid',
                  borderColor: isSelected ? '#1B5E3C' : '#D5E2DA',
                  borderRadius: 20,
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s'
                }}
              >
                <Sprout size={13} />
                <span>{c.name}</span>
                <span
                  style={{
                    fontSize: 10,
                    opacity: 0.85,
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)',
                    padding: '1px 6px',
                    borderRadius: 10
                  }}
                >
                  {c.category}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#5A6A60' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px auto', color: '#1B5E3C' }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: '#113826' }}>
            Fetching Real-Time Meteorological Observations...
          </div>
          <div style={{ fontSize: 13, color: '#6A7D72', marginTop: 4 }}>
            Querying high-resolution Open-Meteo atmospheric models for {activeLocName}
          </div>
        </div>
      )}

      {!loading && (
        <>
          {/* Section 1: Hero Meteorological Overview Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #DCE6E0',
              borderRadius: 16,
              padding: '24px 28px',
              marginBottom: 24,
              boxShadow: '0 4px 16px -2px rgba(17, 56, 38, 0.05)'
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 20
              }}
            >
              {/* Primary Temp & Condition */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 16,
                    backgroundColor: '#F8FAF9',
                    border: '1px solid #E5EBE7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {getConditionIcon(condition)}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 36, fontWeight: 900, color: '#113826', letterSpacing: '-0.03em' }}>
                      {temp}°C
                    </span>
                    <span style={{ fontSize: 13, color: '#6A7D72' }}>
                      (Feels {feelsLike}°)
                    </span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1B5E3C' }}>
                    {condition}
                  </div>
                  <div style={{ fontSize: 11, color: '#7A8D82', marginTop: 2 }}>
                    {activeLocName}
                  </div>
                </div>
              </div>

              {/* Rain Probability Metric */}
              <div
                style={{
                  backgroundColor: '#F0F9FF',
                  borderRadius: 12,
                  padding: '14px 18px',
                  border: '1px solid #BAE6FD'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0369A1', fontSize: 12, fontWeight: 700 }}>
                  <CloudRain size={16} />
                  <span>Precipitation Risk</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#0C4A6E', marginTop: 4 }}>
                  {rainChance}%
                </div>
                <div style={{ fontSize: 11, color: '#0284C7', marginTop: 2 }}>
                  {precipMm > 0 ? `${precipMm} mm rain expected` : 'No immediate rain'}
                </div>
              </div>

              {/* Relative Humidity Metric */}
              <div
                style={{
                  backgroundColor: '#F0FDF4',
                  borderRadius: 12,
                  padding: '14px 18px',
                  border: '1px solid #BBF7D0'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#15803D', fontSize: 12, fontWeight: 700 }}>
                  <Droplets size={16} />
                  <span>Relative Humidity</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#14532D', marginTop: 4 }}>
                  {humidity}%
                </div>
                <div style={{ fontSize: 11, color: '#16A34A', marginTop: 2 }}>
                  {humidity >= 70 ? 'Moisture-proof packing advised' : 'Dry ambient storage'}
                </div>
              </div>

              {/* Wind Speed Metric */}
              <div
                style={{
                  backgroundColor: '#FAF5FF',
                  borderRadius: 12,
                  padding: '14px 18px',
                  border: '1px solid #E9D5FF'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#7E22CE', fontSize: 12, fontWeight: 700 }}>
                  <Wind size={16} />
                  <span>Wind Velocity</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#581C87', marginTop: 4 }}>
                  {windKmh} km/h
                </div>
                <div style={{ fontSize: 11, color: '#9333EA', marginTop: 2 }}>
                  Direction: {current.wind_direction_deg || 180}° S/SW
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: 7-Day Agricultural Forecast Cards */}
          <div style={{ marginBottom: 26 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 800, color: '#113826' }}>
                7-Day Agricultural Forecast
              </div>
              <div style={{ fontSize: 12, color: '#6A7D72' }}>
                Source: Open-Meteo European & German Open Data
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
                gap: 12
              }}
            >
              {daily && daily.map((day, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: idx === 0 ? '#F0F7F2' : '#FFFFFF',
                    border: '1px solid',
                    borderColor: idx === 0 ? '#1B5E3C' : '#E2ECE5',
                    borderRadius: 14,
                    padding: '14px 12px',
                    textAlign: 'center',
                    boxShadow: idx === 0 ? '0 2px 8px rgba(27,94,60,0.1)' : 'none'
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800, color: idx === 0 ? '#1B5E3C' : '#113826' }}>
                    {idx === 0 ? 'Today' : day.day_name}
                  </div>
                  <div style={{ fontSize: 11, color: '#7A8D82', marginBottom: 8 }}>
                    {day.date?.slice(5)}
                  </div>

                  <div style={{ margin: '8px 0' }}>
                    {getConditionIcon(day.condition)}
                  </div>

                  <div style={{ fontSize: 15, fontWeight: 900, color: '#113826' }}>
                    {day.temperature_max_celsius}°{' '}
                    <span style={{ fontSize: 12, color: '#7A8D82', fontWeight: 500 }}>
                      / {day.temperature_min_celsius}°
                    </span>
                  </div>

                  <div style={{ fontSize: 11, fontWeight: 700, color: day.precipitation_probability_max >= 40 ? '#0284C7' : '#6A7D72', marginTop: 4 }}>
                    {day.precipitation_probability_max}% rain
                  </div>

                  {day.precipitation_sum_mm > 0 && (
                    <div style={{ fontSize: 10, color: '#0369A1', marginTop: 1 }}>
                      {day.precipitation_sum_mm} mm
                    </div>
                  )}

                  <div style={{ fontSize: 11, color: '#3A5748', marginTop: 6, fontWeight: 600 }}>
                    {day.condition}
                  </div>

                  {day.sunrise && day.sunset && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        fontSize: 10,
                        color: '#8A9990',
                        marginTop: 8,
                        paddingTop: 6,
                        borderTop: '1px solid #ECEFEA'
                      }}
                    >
                      <Sunrise size={11} color="#D97706" />
                      <span>{day.sunrise.split('T')[1]?.slice(0, 5)}</span>
                      <span>•</span>
                      <Sunset size={11} color="#EA580C" />
                      <span>{day.sunset.split('T')[1]?.slice(0, 5)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Next 24-Hour Timeline */}
          {hourly && hourly.length > 0 && (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                border: '1px solid #DCE6E0',
                padding: '20px 24px',
                marginBottom: 26
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 800, color: '#113826', marginBottom: 14 }}>
                Next 24-Hour Hourly Progression
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  overflowX: 'auto',
                  paddingBottom: 8,
                  scrollbarWidth: 'thin'
                }}
              >
                {hourly.slice(0, 24).map((h, i) => (
                  <div
                    key={i}
                    style={{
                      minWidth: 78,
                      backgroundColor: '#F8FAF9',
                      border: '1px solid #E5EBE7',
                      borderRadius: 10,
                      padding: '10px 8px',
                      textAlign: 'center',
                      flexShrink: 0
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6A7D72' }}>
                      {h.hour_label}
                    </div>
                    <div style={{ margin: '6px 0' }}>
                      {getConditionIcon(h.condition)}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#113826' }}>
                      {h.temperature_celsius}°
                    </div>
                    <div style={{ fontSize: 10, color: h.rain_probability_pct >= 40 ? '#0284C7' : '#8A9990', fontWeight: 700, marginTop: 4 }}>
                      {h.rain_probability_pct}% rain
                    </div>
                    <div style={{ fontSize: 10, color: '#5A6A60', marginTop: 2 }}>
                      {h.humidity_percent}% hum
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Agricultural Deep-Dive Insights */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16,
              marginBottom: 24
            }}
          >
            {/* Harvest Suitability Panel */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 14,
                border: '1px solid #DCE6E0',
                padding: '18px 20px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: '#1B5E3C' }}>
                <Sprout size={18} />
                <span style={{ fontSize: 14, fontWeight: 800, color: '#113826' }}>
                  Field Harvest Suitability ({selectedCrop})
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#4B6355', lineHeight: 1.5, margin: '0 0 10px 0' }}>
                {agri.alerts?.[0]?.message || 'Optimal dry field conditions prevailing. Early mornings (6:00 AM - 10:00 AM) recommended for picking.'}
              </p>
              <div
                style={{
                  fontSize: 11,
                  backgroundColor: '#F0F9F4',
                  color: '#15803D',
                  padding: '6px 10px',
                  borderRadius: 6,
                  fontWeight: 600
                }}
              >
                Harvest Window: {rainChance < 40 ? 'FAVORABLE / DRY' : 'CHALLENGING (RAIN RISK)'}
              </div>
            </div>

            {/* Post-Harvest Drying & Pallet Storage Advisory */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 14,
                border: '1px solid #DCE6E0',
                padding: '18px 20px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: '#D97706' }}>
                <Sun size={18} />
                <span style={{ fontSize: 14, fontWeight: 800, color: '#113826' }}>
                  Sun-Drying & Storage Guidance
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#4B6355', lineHeight: 1.5, margin: '0 0 10px 0' }}>
                {agri.drying_advisory || 'Dry conditions favor grain sun-drying. Ensure produce is elevated on wooden pallets to prevent floor dampness.'}
              </p>
              <div
                style={{
                  fontSize: 11,
                  backgroundColor: '#FFFBEB',
                  color: '#92400E',
                  padding: '6px 10px',
                  borderRadius: 6,
                  fontWeight: 600
                }}
              >
                {agri.storage_advisory || 'Store in ventilated warehouse with moisture-barrier gunny bags.'}
              </div>
            </div>

            {/* Freight & Haulage Corridor Advisory */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 14,
                border: '1px solid #DCE6E0',
                padding: '18px 20px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: '#2563EB' }}>
                <Truck size={18} />
                <span style={{ fontSize: 14, fontWeight: 800, color: '#113826' }}>
                  Transit Corridors & Logistics
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#4B6355', lineHeight: 1.5, margin: '0 0 10px 0' }}>
                {agri.transport_logistics_advisory || 'Regional highway routes operating smoothly. Standard haulage transit times to APMC yards.'}
              </p>
              <div
                style={{
                  fontSize: 11,
                  backgroundColor: '#EFF6FF',
                  color: '#1E40AF',
                  padding: '6px 10px',
                  borderRadius: 6,
                  fontWeight: 600
                }}
              >
                Logistics Status: {rainChance >= 50 ? 'HEAVY TARPAULIN MANDATORY' : 'SMOOTH TRANSIT'}
              </div>
            </div>
          </div>

          {/* Section 5: Mandatory Causation vs Correlation Disclaimer */}
          <div
            style={{
              borderRadius: 14,
              padding: '16px 20px',
              backgroundColor: '#F8FAF9',
              border: '1px solid #D2DFD8',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12
            }}
          >
            <Info size={20} color="#1B5E3C" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#113826', marginBottom: 2 }}>
                Evidence-Based Contextual Transparency
              </div>
              <p style={{ fontSize: 12, color: '#4B6355', lineHeight: 1.5, margin: 0 }}>
                Important Contextual Note: Agricultural weather conditions influence harvesting logistics,
                road transit speed, and short-term auction arrivals. Weather observations represent correlated
                environmental factors and must NOT be interpreted as proof that weather alone caused any specific price change.
              </p>
            </div>
          </div>
        </>
      )}

      {/* Location Search & GPS Modal */}
      <LocationSearchModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocation={currentLocation}
        onLocationSelected={(newLoc) => {
          if (onLocationChange) onLocationChange(newLoc);
        }}
        authToken={authToken}
      />
    </div>
  );
}
