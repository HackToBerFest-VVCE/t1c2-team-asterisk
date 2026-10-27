import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  GitCompare,
  Calculator,
  TrendingUp,
  LineChart,
  MapPin,
  CheckCircle2,
  Database,
  Cpu,
  Shield,
  Store,
  CloudSun,
  Sparkles,
  ShieldAlert,
  MessageSquareWarning,
  Coins
} from 'lucide-react';
import FarmWeatherIntelligenceCard from './FarmWeatherIntelligenceCard';
import { fetchMandiAnalytics } from '../services/api';

export default function DashboardView({
  onNavigate,
  t,
  dataMode,
  userInfo,
  weather,
  onRefreshWeather,
  onOpenLocationModal,
  isLoadingWeather = false
}) {
  const [mandiStats, setMandiStats] = useState(null);

  useEffect(() => {
    fetchMandiAnalytics({})
      .then((res) => setMandiStats(res))
      .catch((err) => console.error('Mandi stats load error:', err));
  }, []);

  const quickCards = [
    {
      id: 'snowflake-explorer',
      title: 'Snowflake Data Explorer',
      desc: 'Browse live tables, agronomy benchmarks & 9,800+ APMC records',
      icon: Database,
      highlight: true
    },
    {
      id: 'crop-recommendations',
      title: 'Crop Recommendation & Profit Engine',
      desc: 'Weather-based suitability, harvest forecasts & net returns',
      icon: Sparkles,
      highlight: false
    },

    {
      id: 'daily-prices',
      title: t.nav.dailyPrices || 'Daily Mandi Prices',
      desc: 'Browse verified AGMARKNET prices',
      icon: Store,
    },
    {
      id: 'smart-mandi',
      title: t.nav.smartMandi,
      desc: 'Compare prices across mandis',
      icon: GitCompare,
    },
    {
      id: 'calculator',
      title: t.nav.calculator,
      desc: 'Know your actual profit',
      icon: Calculator,
    },
    {
      id: 'profit-loss-reports',
      title: t.nav.profitLossReports || 'Profit & Loss Reports',
      desc: 'Master P&L statements & freight accounting',
      icon: Coins,
    },
    {
      id: 'crop-loss-insurance',
      title: t.nav.cropLossInsurance || 'Crop Loss & Insurance',
      desc: 'PMFBY 72h damage intimation & schemes',
      icon: ShieldAlert,
    },
    {
      id: 'complaints',
      title: t.nav.complaints || 'APMC Complaints Desk',
      desc: 'Grievance redressal, weighing fraud & tracking',
      icon: MessageSquareWarning,
    },
    {
      id: 'forecasting',
      title: t.nav.forecasting,
      desc: 'Get future price insights',
      icon: TrendingUp,
    },
    {
      id: 'trends',
      title: t.nav.trends,
      desc: 'Explore trends & patterns',
      icon: LineChart,
    },
    {
      id: 'weather-impact',
      title: t.nav.weatherImpact || 'Weather Context',
      desc: 'Field conditions & transport risks',
      icon: CloudSun,
    },
  ];

  return (
    <div>
      {/* Hero Banner with Farmer Image */}
      <div className="hero-card">
        <div className="hero-content">
          {/* Personalized Avatar Welcome Chip */}
          <div
            onClick={() => onNavigate('settings')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              padding: '4px 12px 4px 6px',
              borderRadius: 20,
              marginBottom: 12,
              backdropFilter: 'blur(4px)',
              cursor: 'pointer',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              transition: 'background-color 0.2s ease'
            }}
            title="Go to User Profile & Photo Settings"
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                backgroundColor: '#10B981',
                color: '#FFFFFF',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                border: '1.5px solid #FFFFFF'
              }}
            >
              {userInfo?.avatar_url ? (
                <img
                  src={userInfo.avatar_url}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                userInfo?.avatar_initials || 'CP'
              )}
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF' }}>
              Welcome back, {userInfo?.name || 'Chethan P'} ({userInfo?.district || 'Hassan'})
            </span>
          </div>

          <h2 className="hero-heading">{t.hero.title}</h2>
          <p className="hero-desc">{t.hero.subtitle}</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              className="hero-cta-btn"
              onClick={() => onNavigate('crop-recommendations')}
              style={{
                backgroundColor: '#10B981',
                borderColor: '#059669',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
              }}
            >
              <Sparkles size={16} />
              <span>{t.nav.cropRecommendations || '✨ Crop Recommendations & Profit'}</span>
            </button>

            <button
              className="hero-cta-btn"
              onClick={() => onNavigate('smart-mandi')}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                backdropFilter: 'blur(4px)'
              }}
            >
              <span>{t.hero.exploreButton}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
        <div className="hero-image-box">
          <img
            src="/farmer_hero.jpg"
            alt="Indian farmer standing proudly in lush agricultural field"
            onError={(e) => {
              // fallback if public path differs
              e.target.src = 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?q=80&w=1000&auto=format&fit=crop';
            }}
          />
          <div className="hero-image-overlay" />
        </div>
      </div>

      {/* Dedicated Farm Weather Intelligence Card */}
      <FarmWeatherIntelligenceCard
        weather={weather}
        onRefresh={onRefreshWeather}
        onOpenLocationSearch={onOpenLocationModal}
        onViewDetailedForecast={() => onNavigate('weather-impact')}
        isLoading={isLoadingWeather}
        selectedCrop="Tomato"
        t={t}
      />

      {/* Quick Action Navigation Cards */}
      <div className="quick-cards-grid">
        {quickCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className="quick-card"
              onClick={() => onNavigate(card.id)}
            >
              <div className="quick-card-icon">
                <Icon size={20} />
              </div>
              <div>
                <div className="quick-card-title">{card.title}</div>
                <div className="quick-card-desc">{card.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Karnataka Mandi Price Intelligence Card (Snowflake backed) */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #DDE5E0',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 18,
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Store size={18} color="#059669" />
            <span style={{ fontSize: 14, fontWeight: 800, color: '#113826' }}>
              Live Karnataka Mandi Price Registry (AGMARKNET & Snowflake)
            </span>
            <span style={{ fontSize: 11, backgroundColor: '#E6F7F0', color: '#059669', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
              All Karnataka Crops
            </span>
          </div>
          <button
            onClick={() => onNavigate('daily-prices')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 700,
              color: '#059669',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <span>Explore All Mandis</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <div style={{ backgroundColor: '#FAFDF9', padding: '10px 14px', borderRadius: 8, border: '1px solid #E6ECE8' }}>
            <div style={{ fontSize: 11, color: '#5A6A60' }}>Active Crops</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#113826' }}>
              {mandiStats?.total_commodities || '35+'} Commodities
            </div>
          </div>
          <div style={{ backgroundColor: '#FAFDF9', padding: '10px 14px', borderRadius: 8, border: '1px solid #E6ECE8' }}>
            <div style={{ fontSize: 11, color: '#5A6A60' }}>Mandis Represented</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#113826' }}>
              {mandiStats?.total_markets || '25+'} APMC Yards
            </div>
          </div>
          <div style={{ backgroundColor: '#FAFDF9', padding: '10px 14px', borderRadius: 8, border: '1px solid #E6ECE8' }}>
            <div style={{ fontSize: 11, color: '#5A6A60' }}>Latest Observation</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#059669' }}>
              {mandiStats?.latest_observation_date || '2026-10-24'}
            </div>
          </div>
          <div style={{ backgroundColor: '#FAFDF9', padding: '10px 14px', borderRadius: 8, border: '1px solid #E6ECE8' }}>
            <div style={{ fontSize: 11, color: '#5A6A60' }}>Daily Arrivals Volume</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#113826' }}>
              {mandiStats?.total_arrival_quantity ? `${Number(mandiStats.total_arrival_quantity).toLocaleString()} t` : '1,840 t'}
            </div>
          </div>
        </div>
      </div>

      {/* Trust & Provenance Bar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #DDE5E0',
          borderRadius: 12,
          padding: '16px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: '#E6F7F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669'
            }}
          >
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#113826' }}>
              {t.trust.line1}
            </div>
            <div style={{ fontSize: 11, color: '#5A6A60' }}>
              {t.trust.line2}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 18, fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#113826', fontWeight: 600 }}>
            <Cpu size={15} color="#059669" />
            <span>Open Source AI</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#113826', fontWeight: 600 }}>
            <Database size={15} color="#2563EB" />
            <span>Snowflake Analytics</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#113826', fontWeight: 600 }}>
            <Shield size={15} color="#D97706" />
            <span>Secure & Transparent</span>
          </div>
        </div>
      </div>
    </div>
  );
}
