import React, { useState } from 'react';
import {
  CloudRain,
  Sun,
  CloudSun,
  Wind,
  Droplets,
  Compass,
  RefreshCw,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  ChevronRight,
  ShieldAlert,
  Loader2,
  Navigation
} from 'lucide-react';

export default function FarmWeatherIntelligenceCard({
  weather,
  onRefresh,
  onOpenLocationSearch,
  onViewDetailedForecast,
  isLoading = false,
  selectedCrop = 'Tomato',
  t
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (onRefresh) await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const current = weather?.current || {};
  const temp = current.temperature_celsius ?? weather?.temperature_celsius ?? 26.0;
  const feelsLike = current.apparent_temperature_celsius ?? current.feels_like_celsius ?? temp;
  const condition = current.condition || weather?.condition || 'Mainly Clear';
  const humidity = current.humidity_percent ?? weather?.humidity_percent ?? 65;
  const windKmh = current.wind_kmh ?? weather?.wind_kmh ?? 8.0;
  const rainChance = current.rain_chance_percent ?? weather?.rain_chance_percent ?? 15;
  const precipMm = current.precipitation_mm ?? current.rain_mm ?? 0.0;
  const locationName = weather?.location_name || weather?.location || 'Hassan, Karnataka';
  const isCached = weather?.is_cached || false;
  const updatedTime = weather?.observation_time || weather?.timestamp || 'Recently';
  const hourly = weather?.hourly || [];
  const agri = weather?.agricultural_intelligence || {};
  const alerts = agri?.alerts || agri?.active_alerts || [];
  const primaryAlert = alerts[0];

  const getConditionIcon = (cond = '') => {
    const c = cond.toLowerCase();
    if (c.includes('rain') || c.includes('drizzle')) return <CloudRain size={28} color="#0284C7" />;
    if (c.includes('cloud')) return <CloudSun size={28} color="#D97706" />;
    return <Sun size={28} color="#EA580C" />;
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        border: '1px solid #DCE6E0',
        boxShadow: '0 4px 16px -2px rgba(17, 56, 38, 0.06)',
        padding: '20px 24px',
        marginBottom: 24,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Top Bar: Location Header, Status Badge & Actions */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          borderBottom: '1px solid #EBF1ED',
          paddingBottom: 14,
          marginBottom: 16
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: '#EBF5EE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1B5E3C'
            }}
          >
            <Compass size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#113826' }}>
                {locationName}
              </span>
              <button
                onClick={onOpenLocationSearch}
                style={{
                  background: 'none',
                  border: '1px solid #C8DAD0',
                  borderRadius: 14,
                  padding: '2px 9px',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#1B5E3C',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3
                }}
              >
                <MapPin size={11} />
                <span>Change</span>
              </button>
            </div>
            <div style={{ fontSize: 11, color: '#6A7D72', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Observed: {updatedTime.includes('T') ? updatedTime.split('T')[1].slice(0, 5) : updatedTime}</span>
              <span>•</span>
              <span style={{ color: isCached ? '#B45309' : '#15803D', fontWeight: 600 }}>
                {isCached ? 'Cached Regional Observation' : 'Live Open-Meteo'}
              </span>
            </div>
          </div>
        </div>

        {/* Right side: Refresh & Detailed Forecast CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing || isLoading}
            title="Refresh current weather observations"
            style={{
              backgroundColor: '#F3F7F4',
              border: '1px solid #D6E3DB',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              color: '#2A4E3B',
              cursor: (isRefreshing || isLoading) ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <RefreshCw size={13} className={(isRefreshing || isLoading) ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {onViewDetailedForecast && (
            <button
              onClick={onViewDetailedForecast}
              style={{
                backgroundColor: '#1B5E3C',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 8,
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <span>7-Day Advisory</span>
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Meteorological Matrix */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 14,
          marginBottom: 16
        }}
      >
        {/* Large Temp Hero */}
        <div
          style={{
            gridColumn: 'span 2',
            backgroundColor: '#F8FAF9',
            borderRadius: 12,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid #E4ECE7'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 34, fontWeight: 900, color: '#113826', letterSpacing: '-0.03em' }}>
                {temp}°C
              </span>
              <span style={{ fontSize: 13, color: '#6A7D72' }}>
                Feels like {feelsLike}°C
              </span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1B5E3C', marginTop: 2 }}>
              {condition}
            </div>
          </div>
          <div style={{ padding: 8, backgroundColor: '#FFFFFF', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            {getConditionIcon(condition)}
          </div>
        </div>

        {/* Rain Probability */}
        <div
          style={{
            backgroundColor: '#F0F9FF',
            borderRadius: 12,
            padding: '12px 14px',
            border: '1px solid #BAE6FD'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0369A1', fontSize: 12, fontWeight: 700 }}>
            <CloudRain size={16} />
            <span>Rain Chance</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0C4A6E', marginTop: 4 }}>
            {rainChance}%
          </div>
          <div style={{ fontSize: 11, color: '#0284C7', marginTop: 2 }}>
            {precipMm > 0 ? `${precipMm} mm expected` : 'Dry conditions'}
          </div>
        </div>

        {/* Humidity */}
        <div
          style={{
            backgroundColor: '#F0FDF4',
            borderRadius: 12,
            padding: '12px 14px',
            border: '1px solid #BBF7D0'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#15803D', fontSize: 12, fontWeight: 700 }}>
            <Droplets size={16} />
            <span>Humidity</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#14532D', marginTop: 4 }}>
            {humidity}%
          </div>
          <div style={{ fontSize: 11, color: '#16A34A', marginTop: 2 }}>
            {humidity > 70 ? 'Moist / storage alert' : 'Optimal ambient'}
          </div>
        </div>

        {/* Wind Speed */}
        <div
          style={{
            backgroundColor: '#FAF5FF',
            borderRadius: 12,
            padding: '12px 14px',
            border: '1px solid #E9D5FF'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#7E22CE', fontSize: 12, fontWeight: 700 }}>
            <Wind size={16} />
            <span>Wind Speed</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#581C87', marginTop: 4 }}>
            {windKmh} km/h
          </div>
          <div style={{ fontSize: 11, color: '#9333EA', marginTop: 2 }}>
            Gentle farm breeze
          </div>
        </div>
      </div>

      {/* 24-Hour Mini Timeline */}
      {hourly && hourly.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#7A8D82', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.04em' }}>
            Next 24-Hour Forecast Timeline
          </div>
          <div
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 6,
              scrollbarWidth: 'thin'
            }}
          >
            {hourly.slice(0, 12).map((item, idx) => (
              <div
                key={idx}
                style={{
                  minWidth: 70,
                  backgroundColor: '#FAFCFA',
                  border: '1px solid #E5EBE7',
                  borderRadius: 10,
                  padding: '8px 6px',
                  textAlign: 'center',
                  flexShrink: 0
                }}
              >
                <div style={{ fontSize: 11, color: '#6A7D72', fontWeight: 600 }}>
                  {item.hour_label}
                </div>
                <div style={{ margin: '4px 0' }}>
                  {getConditionIcon(item.condition)}
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#113826' }}>
                  {item.temperature_celsius}°
                </div>
                {item.rain_probability_pct > 0 && (
                  <div style={{ fontSize: 10, color: '#0284C7', fontWeight: 700, marginTop: 2 }}>
                    {item.rain_probability_pct}% rain
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agricultural Harvest & Logistics Advisory Banner */}
      <div
        style={{
          borderRadius: 12,
          padding: '12px 16px',
          backgroundColor: rainChance >= 50 ? '#FFFBEB' : '#F0F9F4',
          border: '1px solid',
          borderColor: rainChance >= 50 ? '#FDE68A' : '#CCE6D8',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12
        }}
      >
        <div style={{ color: rainChance >= 50 ? '#D97706' : '#15803D', marginTop: 2 }}>
          {rainChance >= 50 ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: rainChance >= 50 ? '#92400E' : '#113826' }}>
            {primaryAlert?.title || (rainChance >= 50 ? 'Rainfall Transport Alert' : 'Favorable Harvesting Window')}
          </div>
          <p style={{ fontSize: 12, color: rainChance >= 50 ? '#78350F' : '#3B5748', margin: '3px 0 0 0', lineHeight: 1.45 }}>
            {primaryAlert?.message || (
              rainChance >= 50
                ? `High precipitation probability (${rainChance}%) in ${locationName.split(',')[0]}. Mandate waterproof tarpaulin coverage for ${selectedCrop} truck haulage.`
                : `Optimal atmospheric conditions for picking and field grading of ${selectedCrop}. Highway corridors operating with normal freight transit.`
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
