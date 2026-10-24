import React from 'react';
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
  Shield
} from 'lucide-react';

export default function DashboardView({ onNavigate, t, dataMode }) {
  const quickCards = [
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
      id: 'location',
      title: t.nav.location,
      desc: 'Find best mandis near you',
      icon: MapPin,
    },
  ];

  return (
    <div>
      {/* Hero Banner with Farmer Image */}
      <div className="hero-card">
        <div className="hero-content">
          <h2 className="hero-heading">{t.hero.title}</h2>
          <p className="hero-desc">{t.hero.subtitle}</p>
          <button
            className="hero-cta-btn"
            onClick={() => onNavigate('smart-mandi')}
          >
            <span>{t.hero.exploreButton}</span>
            <ArrowRight size={16} />
          </button>
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
