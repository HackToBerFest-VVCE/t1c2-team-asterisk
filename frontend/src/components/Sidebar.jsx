import React from 'react';
import BrandLogo from './BrandLogo';
import {
  LayoutDashboard,
  GitCompare,
  Calculator,
  TrendingUp,
  LineChart,
  MapPin,
  FileText,
  Settings,
  Store,
  CloudSun,
  Sparkles,
  Database,
  ShieldAlert,
  MessageSquareWarning,
  Coins,
  ShoppingBag
} from 'lucide-react';

export default function Sidebar({ currentView, setCurrentView, lang, setLang, t }) {
  const navItems = [
    { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    {
      id: 'marketplace',
      label: lang === 'kn' ? 'ಕೃಷಿ ಮಾರುಕಟ್ಟೆ' : (t.nav.marketplace || 'Agri Marketplace'),
      icon: ShoppingBag
    },
    {
      id: 'snowflake-explorer',
      label: t.nav.snowflakeExplorer || 'Snowflake Data Explorer',
      icon: Database
    },
    {
      id: 'crop-recommendations',
      label: lang === 'kn' ? 'ಬೆಳೆ ಶಿಫಾರಸು & ಲಾಭ ಎಂಜಿನ್' : 'Crop Recommendation & Profit',
      icon: Sparkles
    },
    { id: 'daily-prices', label: t.nav.dailyPrices || 'Daily Mandi Prices', icon: Store },
    { id: 'smart-mandi', label: t.nav.smartMandi, icon: GitCompare },
    { id: 'calculator', label: t.nav.calculator, icon: Calculator },
    {
      id: 'profit-loss-reports',
      label: t.nav.profitLossReports || (lang === 'kn' ? 'ಲಾಭ-ನಷ್ಟ ವರದಿಗಳು' : 'Profit & Loss Reports'),
      icon: Coins
    },
    {
      id: 'crop-loss-insurance',
      label: t.nav.cropLossInsurance || (lang === 'kn' ? 'ಬೆಳೆ ಹಾನಿ & ವಿಮೆ' : 'Crop Loss & Insurance'),
      icon: ShieldAlert
    },
    {
      id: 'complaints',
      label: t.nav.complaints || (lang === 'kn' ? 'ದೂರು ನಿರ್ವಹಣೆ' : 'Complaints Desk'),
      icon: MessageSquareWarning
    },
    { id: 'forecasting', label: t.nav.forecasting, icon: TrendingUp },
    { id: 'trends', label: t.nav.trends, icon: LineChart },
    { id: 'weather-impact', label: t.nav.weatherImpact || 'Weather Context', icon: CloudSun },
    { id: 'location', label: t.nav.location, icon: MapPin },
    { id: 'saved-reports', label: t.nav.savedReports, icon: FileText },
    { id: 'settings', label: t.nav.settings, icon: Settings },
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div
        className="sidebar-header"
        onClick={() => setCurrentView('dashboard')}
        style={{ cursor: 'pointer' }}
        title="Go to FARMPRICE AI Dashboard"
      >
        <div className="brand-badge">
          <BrandLogo size={36} priority />
          <div>
            <h1 className="brand-title">{t.brand.name}</h1>
            <p className="brand-subtitle">{t.brand.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setCurrentView(item.id)}
              title={item.label}
            >
              <Icon size={17} />
              <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Language Switcher Footer */}
      <div className="sidebar-footer">
        <div className="lang-switch">
          <button
            className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
            onClick={() => setLang('en')}
          >
            English
          </button>
          <button
            className={`lang-btn ${lang === 'kn' ? 'active' : ''}`}
            onClick={() => setLang('kn')}
          >
            ಕನ್ನಡ
          </button>
        </div>
      </div>
    </aside>
  );
}
