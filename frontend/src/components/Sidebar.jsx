import React from 'react';
import {
  LayoutDashboard,
  GitCompare,
  Calculator,
  TrendingUp,
  LineChart,
  MapPin,
  FileText,
  Bell,
  Settings,
  Sprout
} from 'lucide-react';

export default function Sidebar({ currentView, setCurrentView, lang, setLang, t }) {
  const navItems = [
    { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { id: 'smart-mandi', label: t.nav.smartMandi, icon: GitCompare },
    { id: 'calculator', label: t.nav.calculator, icon: Calculator },
    { id: 'forecasting', label: t.nav.forecasting, icon: TrendingUp },
    { id: 'trends', label: t.nav.trends, icon: LineChart },
    { id: 'location', label: t.nav.location, icon: MapPin },
    { id: 'saved-reports', label: t.nav.savedReports, icon: FileText },
    { id: 'alerts', label: t.nav.alerts, icon: Bell },
    { id: 'settings', label: t.nav.settings, icon: Settings },
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand-badge">
          <div className="brand-icon">
            <Sprout size={20} />
          </div>
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
            >
              <Icon size={17} />
              <span>{item.label}</span>
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
