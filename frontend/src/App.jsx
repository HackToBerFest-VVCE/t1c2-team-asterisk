import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import TrustFooter from './components/TrustFooter';
import DashboardView from './components/DashboardView';
import SmartMandiView from './components/SmartMandiView';
import NetReturnCalculatorView from './components/NetReturnCalculatorView';
import ForecastingView from './components/ForecastingView';
import LocationIntelligenceView from './components/LocationIntelligenceView';
import MarketTrendsView from './components/MarketTrendsView';
import SettingsView from './components/SettingsView';
import SavedReportsView from './components/SavedReportsView';

import en from './i18n/en.json';
import kn from './i18n/kn.json';
import { fetchHealth, fetchWeather, fetchCrops } from './services/api';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [lang, setLang] = useState('en');
  const [weather, setWeather] = useState(null);
  const [health, setHealth] = useState(null);
  const [crops, setCrops] = useState([]);

  const t = lang === 'kn' ? kn : en;

  useEffect(() => {
    // Initial health check & data bootstrap
    fetchHealth()
      .then((h) => setHealth(h))
      .catch((err) => console.warn('Health check notice:', err));

    fetchWeather()
      .then((w) => setWeather(w))
      .catch((err) => console.warn('Weather notice:', err));

    fetchCrops()
      .then((c) => setCrops(c))
      .catch((err) => console.warn('Crops fetch notice:', err));
  }, []);

  const dataMode = health?.snowflake?.mode || 'LOCAL_DEVELOPMENT_ADAPTER';

  return (
    <div className="app-container">
      {/* Responsive Left Sidebar */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        lang={lang}
        setLang={setLang}
        t={t}
      />

      {/* Main Content Area */}
      <div className="main-wrapper">
        <Topbar
          weather={weather}
          t={t}
          onNavigate={setCurrentView}
        />

        <main className="content-area">
          {currentView === 'dashboard' && (
            <DashboardView
              onNavigate={setCurrentView}
              t={t}
              dataMode={dataMode}
            />
          )}

          {currentView === 'smart-mandi' && (
            <SmartMandiView
              crops={crops}
              t={t}
            />
          )}

          {currentView === 'calculator' && (
            <NetReturnCalculatorView
              t={t}
            />
          )}

          {currentView === 'forecasting' && (
            <ForecastingView
              t={t}
            />
          )}

          {currentView === 'trends' && (
            <MarketTrendsView
              t={t}
            />
          )}

          {currentView === 'location' && (
            <LocationIntelligenceView
              t={t}
            />
          )}

          {currentView === 'saved-reports' && (
            <SavedReportsView
              t={t}
            />
          )}

          {currentView === 'alerts' && (
            <SavedReportsView
              t={t}
            />
          )}

          {currentView === 'settings' && (
            <SettingsView
              t={t}
              lang={lang}
              setLang={setLang}
            />
          )}
        </main>

        <TrustFooter
          t={t}
          dataMode={dataMode}
        />
      </div>
    </div>
  );
}
