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
import DailyMandiPricesView from './components/DailyMandiPricesView';
import WeatherImpactView from './components/WeatherImpactView';
import SnowflakeDataExplorerView from './components/SnowflakeDataExplorerView';

import AuthModal from './components/AuthModal';
import FarmPriceIntro from './components/FarmPriceIntro';
import CropRecommendationEngineView from './components/CropRecommendationEngineView';
import CropLossInsuranceView from './components/CropLossInsuranceView';
import ComplaintManagementView from './components/ComplaintManagementView';
import ProfitLossReportView from './components/ProfitLossReportView';
import MarketplaceView from './components/MarketplaceView';

import en from './i18n/en.json';
import kn from './i18n/kn.json';
import {
  fetchHealth,
  fetchWeather,
  fetchCurrentWeather,
  fetchPreferredFarmLocation,
  fetchCrops,
  fetchUserProfile
} from './services/api';
import LocationSearchModal from './components/LocationSearchModal';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem('farmprice_lang') || 'en';
    } catch {
      return 'en';
    }
  });

  const setLang = (newLang) => {
    setLangState(newLang);
    try {
      localStorage.setItem('farmprice_lang', newLang);
    } catch {}
  };
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(() => {
    try {
      const saved = localStorage.getItem('farmprice_location');
      return saved ? JSON.parse(saved) : {
        name: 'Hassan, Karnataka',
        location_name: 'Hassan, Karnataka',
        village_town: 'Hassan',
        district: 'Hassan',
        state: 'Karnataka',
        latitude: 13.0033,
        longitude: 76.1004,
        is_gps_detected: false
      };
    } catch {
      return {
        name: 'Hassan, Karnataka',
        location_name: 'Hassan, Karnataka',
        district: 'Hassan',
        latitude: 13.0033,
        longitude: 76.1004
      };
    }
  });

  const [health, setHealth] = useState(null);
  const [crops, setCrops] = useState([]);

  // Function to load live weather for specific coordinates
  const loadWeatherForLocation = async (loc) => {
    setWeatherLoading(true);
    try {
      const lat = loc.latitude || 13.0033;
      const lon = loc.longitude || 76.1004;
      const locLabel = loc.location_name || loc.name || 'Hassan, Karnataka';
      const w = await fetchCurrentWeather(lat, lon, locLabel);
      setWeather(w);
    } catch (err) {
      console.warn('Weather fetch error:', err);
    } finally {
      setWeatherLoading(false);
    }
  };

  const handleLocationChange = (newLoc) => {
    setCurrentLocation(newLoc);
    try {
      localStorage.setItem('farmprice_location', JSON.stringify(newLoc));
    } catch {}
    loadWeatherForLocation(newLoc);
  };

  const handleRefreshWeather = () => {
    return loadWeatherForLocation(currentLocation);
  };

  // Cinematic Intro Animation State (Session-tracked)
  const [showIntro, setShowIntro] = useState(() => {
    try {
      const seen = sessionStorage.getItem('farmprice_intro_seen');
      const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      return !seen && !prefersReduced;
    } catch {
      return false;
    }
  });
  const [forcePlayIntro, setForcePlayIntro] = useState(false);

  // Role and Authentication State
  const [userRole, setUserRole] = useState(() => localStorage.getItem('farmprice_role') || 'public');
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('farmprice_token') || '');
  const [userInfo, setUserInfo] = useState(() => {
    const saved = localStorage.getItem('farmprice_user');
    return saved ? JSON.parse(saved) : { name: 'Chethan P', district: 'Hassan', phone: '9876543210' };
  });

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('public');

  const t = lang === 'kn' ? kn : en;

  useEffect(() => {
    // Initial health check & data bootstrap
    fetchHealth()
      .then((h) => setHealth(h))
      .catch((err) => console.warn('Health check notice:', err));

    // Initial location check: try to fetch saved preferred farm location from backend
    fetchPreferredFarmLocation(authToken)
      .then((pref) => {
        if (pref && pref.has_saved_location) {
          const loc = {
            name: pref.location_name,
            location_name: pref.location_name,
            village_town: pref.village_town,
            district: pref.district,
            state: pref.state,
            pincode: pref.pincode,
            latitude: pref.latitude,
            longitude: pref.longitude,
            is_gps_detected: pref.is_gps_detected
          };
          setCurrentLocation(loc);
          localStorage.setItem('farmprice_location', JSON.stringify(loc));
          loadWeatherForLocation(loc);
        } else {
          loadWeatherForLocation(currentLocation);
        }
      })
      .catch(() => {
        loadWeatherForLocation(currentLocation);
      });

    fetchCrops()
      .then((c) => setCrops(c))
      .catch((err) => console.warn('Crops fetch notice:', err));

    // Fetch user profile on startup to restore persistent avatar and details
    fetchUserProfile(userRole === 'admin' ? 'admin-apmc-01' : 'usr_chethan', authToken)
      .then((res) => {
        if (res?.data) {
          setUserInfo((prev) => {
            const merged = {
              ...prev,
              name: res.data.full_name || prev.name,
              district: res.data.district || prev.district,
              avatar_url: res.data.avatar_url,
              avatar_initials: res.data.avatar_initials
            };
            localStorage.setItem('farmprice_user', JSON.stringify(merged));
            return merged;
          });
        }
      })
      .catch(() => {});
  }, [authToken, userRole]);

  const dataMode = health?.snowflake?.mode || 'LOCAL_DEVELOPMENT_ADAPTER';

  const handleOpenAuth = (tab = 'public') => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  const handleLoginSuccess = (authData) => {
    setUserRole(authData.role);
    setAuthToken(authData.token);
    const updatedUser = {
      name: authData.name,
      district: authData.district,
      phone: authData.phone,
      yard_id: authData.yard_id,
      yard_name: authData.yard_name
    };
    setUserInfo(updatedUser);
    localStorage.setItem('farmprice_role', authData.role);
    localStorage.setItem('farmprice_token', authData.token);
    localStorage.setItem('farmprice_user', JSON.stringify(updatedUser));

    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setUserRole('public');
    setAuthToken('');
    const defaultUser = { name: 'Chethan P', district: 'Hassan', phone: '+91 98765 43210' };
    setUserInfo(defaultUser);
    localStorage.removeItem('farmprice_token');
    localStorage.setItem('farmprice_role', 'public');
    localStorage.setItem('farmprice_user', JSON.stringify(defaultUser));
    setCurrentView('dashboard');
  };

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
          userRole={userRole}
          userInfo={userInfo}
          onOpenAuth={handleOpenAuth}
          authToken={authToken}
          onOpenLocationModal={() => setIsLocationModalOpen(true)}
        />

        <main className="content-area">
          {currentView === 'dashboard' && (
            <DashboardView
              onNavigate={setCurrentView}
              t={t}
              dataMode={dataMode}
              userInfo={userInfo}
              weather={weather}
              onRefreshWeather={handleRefreshWeather}
              onOpenLocationModal={() => setIsLocationModalOpen(true)}
              isLoadingWeather={weatherLoading}
            />
          )}

          {currentView === 'crop-recommendations' && (
            <CropRecommendationEngineView
              t={t}
              lang={lang}
              currentLocation={currentLocation}
              onLocationChange={handleLocationChange}
            />
          )}

          {currentView === 'marketplace' && (
            <MarketplaceView
              t={t}
              lang={lang}
              userInfo={userInfo}
              userRole={userRole}
            />
          )}



          {currentView === 'daily-prices' && (
            <DailyMandiPricesView
              t={t}
              authToken={authToken}
              userRole={userRole}
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

          {currentView === 'profit-loss-reports' && (
            <ProfitLossReportView
              t={t}
              lang={lang}
              userInfo={userInfo}
            />
          )}

          {currentView === 'crop-loss-insurance' && (
            <CropLossInsuranceView
              t={t}
              lang={lang}
              userInfo={userInfo}
            />
          )}

          {currentView === 'complaints' && (
            <ComplaintManagementView
              t={t}
              lang={lang}
              userInfo={userInfo}
              userRole={userRole}
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

          {currentView === 'weather-impact' && (
            <WeatherImpactView
              t={t}
              currentLocation={currentLocation}
              onLocationChange={handleLocationChange}
              authToken={authToken}
            />
          )}

          {currentView === 'location' && (
            <LocationIntelligenceView
              t={t}
              currentLocation={currentLocation}
              onLocationChange={handleLocationChange}
              onNavigate={setCurrentView}
            />
          )}

          {currentView === 'snowflake-explorer' && (
            <SnowflakeDataExplorerView
              t={t}
            />
          )}

          {currentView === 'saved-reports' && (
            <SavedReportsView
              t={t}
            />
          )}



          {currentView === 'settings' && (
            <SettingsView
              t={t}
              lang={lang}
              setLang={setLang}
              userRole={userRole}
              authToken={authToken}
              onOpenAuth={handleOpenAuth}
              onLogout={handleLogout}
              onReplayIntro={() => {
                setForcePlayIntro(true);
                setShowIntro(true);
              }}
              onProfileUpdated={(updatedProfile) => {
                setUserInfo((prev) => {
                  const merged = {
                    ...prev,
                    name: updatedProfile.full_name || prev.name,
                    district: updatedProfile.district || prev.district,
                    avatar_url: updatedProfile.avatar_url,
                    avatar_initials: updatedProfile.avatar_initials || prev.avatar_initials
                  };
                  localStorage.setItem('farmprice_user', JSON.stringify(merged));
                  return merged;
                });
              }}
            />
          )}
        </main>

        <TrustFooter
          t={t}
          dataMode={dataMode}
        />
      </div>

      {/* Unified Portal Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultTab={authModalTab}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Cinematic Branded Opening Animation */}
      {showIntro && (
        <FarmPriceIntro
          onComplete={() => {
            setShowIntro(false);
            setForcePlayIntro(false);
          }}
          isAppReady={Boolean(health || crops.length > 0)}
          forcePlay={forcePlayIntro}
        />
      )}
      {/* Farm Location Detection & Search Modal */}
      <LocationSearchModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocation={currentLocation}
        onLocationSelected={handleLocationChange}
        authToken={authToken}
      />
    </div>
  );
}
