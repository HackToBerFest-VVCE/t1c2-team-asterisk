import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Sun,
  CloudRain,
  Wind,
  Droplets,
  LogIn,
  Camera,
  User,
  Settings,
  ChevronDown,
  LogOut
} from 'lucide-react';

export default function Topbar({
  weather,
  t,
  onNavigate,
  userInfo,
  onOpenAuth,
  authToken,
  onOpenLocationModal
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close account menu on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="topbar">
      {/* Search Input */}
      <div className="search-box">
        <Search size={16} color="#718096" />
        <input
          type="text"
          className="search-input"
          placeholder={t.topbar?.searchPlaceholder || 'Search mandis, crops, prices...'}
        />
      </div>

      <div className="topbar-right">
        {/* Weather Intelligence Widget */}
        <div
          className="weather-widget"
          onClick={() => {
            if (onOpenLocationModal) onOpenLocationModal();
            else if (onNavigate) onNavigate('weather-impact');
          }}
          style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
          title="Click to detect GPS or change farm location"
        >
          <div className="weather-main">
            <Sun size={20} color="#D97706" />
            <div>
              <div className="weather-temp">{weather?.temperature_celsius || 26}°C</div>
              <div className="weather-loc">
                {weather?.location_name || weather?.location || 'Hassan, Karnataka'} • {weather?.condition || 'Clear Sky'}
              </div>
            </div>
          </div>
          <div className="weather-metrics">
            <div title={t.topbar?.weatherHumidity || 'Humidity'} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Droplets size={12} color="#2563EB" />
              <span>{weather?.humidity_percent || 68}%</span>
            </div>
            <div title={t.topbar?.weatherWind || 'Wind Speed'} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Wind size={12} color="#4B5563" />
              <span>{weather?.wind_kmh || 8} km/h</span>
            </div>
            <div title={t.topbar?.weatherRain || 'Rain Probability'} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <CloudRain size={12} color="#059669" />
              <span>{weather?.rain_chance_percent || 12}%</span>
            </div>
          </div>
        </div>

        {/* Topbar Actions */}
        <div className="topbar-actions" style={{ position: 'relative' }} ref={menuRef}>
          {/* Quick Farmer Login / Profile Switcher Button */}
          <button
            onClick={() => onOpenAuth('public')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #059669',
              backgroundColor: '#E6F7F0',
              color: '#065F46',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Switch Farmer Profile"
          >
            <LogIn size={14} color="#059669" />
            <span>Switch Profile</span>
          </button>

          {/* User Profile Badge with Circular Avatar */}
          <div
            className="user-profile-badge"
            onClick={() => setMenuOpen((prev) => !prev)}
            style={{
              cursor: 'pointer',
              borderColor: '#DDE5E0',
              backgroundColor: '#FFFFFF',
              position: 'relative',
              userSelect: 'none'
            }}
            title="Account Menu & Profile Details"
          >
            <div
              className="user-avatar"
              style={{
                backgroundColor: '#113826',
                color: '#FFFFFF',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700
              }}
            >
              {userInfo?.avatar_url ? (
                <img
                  src={userInfo.avatar_url}
                  alt={userInfo?.name || 'Profile'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                userInfo?.avatar_initials || 'CP'
              )}
            </div>
            <div className="user-info">
              <span className="user-name" style={{ color: '#1A241F' }}>
                {userInfo?.name || 'Chethan P'}
              </span>
              <span className="user-role" style={{ color: '#5A6A60' }}>
                🌾 Farmer ({userInfo?.district || 'Hassan'})
              </span>
            </div>
            <ChevronDown size={14} color="#6B7280" style={{ transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
          </div>

          {/* Account Menu Dropdown */}
          {menuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: 250,
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                border: '1px solid #DDE5E0',
                padding: '8px 0',
                zIndex: 1000
              }}
            >
              {/* Profile Card Header in Dropdown */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    backgroundColor: '#113826',
                    color: '#FFFFFF',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 15,
                    flexShrink: 0,
                    border: '2px solid #10B981'
                  }}
                >
                  {userInfo?.avatar_url ? (
                    <img
                      src={userInfo.avatar_url}
                      alt="Avatar"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    userInfo?.avatar_initials || 'CP'
                  )}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#113826', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {userInfo?.name || 'Chethan P'}
                  </div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>
                    🌾 Farmer ({userInfo?.district || 'Hassan'})
                  </div>
                </div>
              </div>

              {/* Actions */}
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onNavigate('settings');
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 16px',
                  background: 'none',
                  border: 'none',
                  fontSize: 13,
                  color: '#374151',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <User size={15} color="#059669" />
                <span>View & Edit Profile</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onNavigate('settings');
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 16px',
                  background: 'none',
                  border: 'none',
                  fontSize: 13,
                  color: '#374151',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Camera size={15} color="#059669" />
                <span>Edit Profile Photo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onNavigate('settings');
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 16px',
                  background: 'none',
                  border: 'none',
                  fontSize: 13,
                  color: '#374151',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Settings size={15} color="#059669" />
                <span>Application Settings</span>
              </button>

              <div style={{ height: 1, backgroundColor: '#F3F4F6', margin: '4px 0' }} />

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenAuth('public');
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 16px',
                  background: 'none',
                  border: 'none',
                  fontSize: 13,
                  color: '#DC2626',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <LogOut size={15} color="#DC2626" />
                <span>Switch Account / Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
