import React from 'react';
import { Search, Bell, Sun, CloudRain, Wind, Droplets } from 'lucide-react';

export default function Topbar({ weather, t, onNavigate }) {
  return (
    <header className="topbar">
      {/* Search Input */}
      <div className="search-box">
        <Search size={16} color="#718096" />
        <input
          type="text"
          className="search-input"
          placeholder={t.topbar.searchPlaceholder}
        />
      </div>

      <div className="topbar-right">
        {/* Weather Intelligence Widget */}
        <div className="weather-widget">
          <div className="weather-main">
            <Sun size={20} color="#D97706" />
            <div>
              <div className="weather-temp">{weather?.temperature_celsius || 26}°C</div>
              <div className="weather-loc">{weather?.location || 'Hassan, Karnataka'} • {weather?.condition || 'Clear Sky'}</div>
            </div>
          </div>
          <div className="weather-metrics">
            <div title={t.topbar.weatherHumidity} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Droplets size={12} color="#2563EB" />
              <span>{weather?.humidity_percent || 68}%</span>
            </div>
            <div title={t.topbar.weatherWind} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Wind size={12} color="#4B5563" />
              <span>{weather?.wind_kmh || 8} km/h</span>
            </div>
            <div title={t.topbar.weatherRain} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <CloudRain size={12} color="#059669" />
              <span>{weather?.rain_chance_percent || 12}%</span>
            </div>
          </div>
        </div>

        {/* Topbar Actions */}
        <div className="topbar-actions">
          <button
            className="icon-btn"
            title="Price Alerts"
            onClick={() => onNavigate('alerts')}
          >
            <Bell size={18} />
            <span className="notification-badge" />
          </button>

          {/* Farmer Profile Badge */}
          <div
            className="user-profile-badge"
            onClick={() => onNavigate('settings')}
            title="Farmer Profile & Settings"
          >
            <div className="user-avatar">CP</div>
            <div className="user-info">
              <span className="user-name">Chethan P</span>
              <span className="user-role">{t.topbar.farmerRole}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
