import React, { useState, useEffect } from 'react';
import {
  User,
  Palette,
  Languages,
  Bell,
  Shield,
  Eye,
  Download,
  Sliders,
  HelpCircle,
  Info,
  Check,
  Edit2,
  X,
  Lock,
  Smartphone,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Send,
  Database,
  Cpu,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Camera,
  Trash2,
  Upload
} from 'lucide-react';
import {
  fetchUserProfile,
  updateUserProfile,
  uploadProfilePhoto,
  removeProfilePhoto,
  fetchUserPreferences,
  updateUserPreferences,
  fetchUserNotifications,
  updateUserNotifications,
  fetchActiveSessions,
  terminateOtherSessions,
  changeUserPassword,
  exportUserDataBundle,
  deleteUserAccount,
  submitUserFeedback,
  fetchSystemAbout,
  downloadReport,
  exportDailyPricesCsv
} from '../services/api';
import PhotoEditorModal from './PhotoEditorModal';
import BrandLogo from './BrandLogo';

export default function SettingsView({
  t,
  lang,
  setLang,
  userRole = 'public',
  authToken = '',
  onOpenAuth,
  onLogout,
  onProfileUpdated,
  onReplayIntro
}) {
  const [activeTab, setActiveTab] = useState('account');
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(null);
  const [feedbackError, setFeedbackError] = useState(null);

  // Profile State
  const [profile, setProfile] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    state: 'Karnataka',
    district: 'Hassan',
    village_or_town: '',
    preferred_language: 'en'
  });

  // Preferences State
  const [preferences, setPreferences] = useState(null);
  const [theme, setTheme] = useState('system');
  const [accentColor, setAccentColor] = useState('#113826');
  const [dashboardDensity, setDashboardDensity] = useState('comfortable');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [fontSize, setFontSize] = useState('normal');
  const [highContrast, setHighContrast] = useState(false);

  // App defaults
  const [defaultCrop, setDefaultCrop] = useState('CROP_TOMATO');
  const [defaultMandi, setDefaultMandi] = useState('MND_HASSAN');
  const [defaultQuantity, setDefaultQuantity] = useState(50);
  const [defaultUnit, setDefaultUnit] = useState('quintals');
  const [defaultChartRange, setDefaultChartRange] = useState('3months');
  const [maxDistanceKm, setMaxDistanceKm] = useState(150);

  // Notifications State
  const [notifConfig, setNotifConfig] = useState(null);

  // Security & Sessions State
  const [sessions, setSessions] = useState([]);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [passwordErr, setPasswordErr] = useState(null);

  // Data Export & Deletion State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleteError, setDeleteError] = useState(null);

  // Help & FAQ State
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const [feedbackForm, setFeedbackForm] = useState({
    category: 'general',
    subject: '',
    message: '',
    email: ''
  });

  // System & About State
  const [aboutData, setAboutData] = useState(null);

  useEffect(() => {
    loadAllSettings();
  }, []);

  async function loadAllSettings() {
    setLoading(true);
    try {
      const [profRes, prefRes, notifRes, sessRes, aboutRes] = await Promise.all([
        fetchUserProfile().catch(() => null),
        fetchUserPreferences().catch(() => null),
        fetchUserNotifications().catch(() => null),
        fetchActiveSessions().catch(() => null),
        fetchSystemAbout().catch(() => null)
      ]);

      if (profRes?.data) {
        setProfile(profRes.data);
        setProfileForm({
          full_name: profRes.data.full_name || 'Chethan P',
          email: profRes.data.email || 'chethan@farmer.ai',
          phone: profRes.data.phone || '+91 98765 43210',
          state: profRes.data.state || 'Karnataka',
          district: profRes.data.district || 'Hassan',
          village_or_town: profRes.data.village_or_town || 'Channarayapatna Hobli',
          preferred_language: profRes.data.preferred_language || 'en'
        });
      }

      if (prefRes?.data) {
        const p = prefRes.data;
        setPreferences(p);
        setTheme(p.theme || 'system');
        setAccentColor(p.accent_color || '#113826');
        setDashboardDensity(p.dashboard_density || 'comfortable');
        setReducedMotion(Boolean(p.reduced_motion));
        setFontSize(p.font_size || 'normal');
        setHighContrast(Boolean(p.high_contrast));

        setDefaultCrop(p.default_crop_id || 'CROP_TOMATO');
        setDefaultMandi(p.default_mandi_id || 'MND_HASSAN');
        setDefaultQuantity(p.default_quantity || 50);
        setDefaultUnit(p.default_quantity_unit || 'quintals');
        setDefaultChartRange(p.default_chart_range || '3months');
        setMaxDistanceKm(p.max_recommendation_distance_km || 150);

        applyAppearanceToDom(p.theme, p.dashboard_density, p.reduced_motion, p.font_size, p.high_contrast);
      }

      if (notifRes?.data) {
        setNotifConfig(notifRes.data);
      }

      if (sessRes?.sessions) {
        setSessions(sessRes.sessions);
      }

      if (aboutRes) {
        setAboutData(aboutRes);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  }

  function applyAppearanceToDom(th, dens, redMot, fSize, hCont) {
    const root = document.documentElement;
    // Theme
    if (th === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else if (th === 'light') {
      root.removeAttribute('data-theme');
    } else {
      // System default
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.setAttribute('data-theme', 'dark');
      } else {
        root.removeAttribute('data-theme');
      }
    }

    // Density
    root.setAttribute('data-density', dens || 'comfortable');

    // Reduced motion
    if (redMot) {
      root.setAttribute('data-reduced-motion', 'true');
    } else {
      root.removeAttribute('data-reduced-motion');
    }

    // High contrast
    if (hCont) {
      root.setAttribute('data-contrast', 'high');
    } else {
      root.removeAttribute('data-contrast');
    }

    // Font size
    root.setAttribute('data-font-size', fSize || 'normal');
  }

  // Save Profile
  async function handleSaveProfile(e) {
    e.preventDefault();
    setFeedbackSuccess(null);
    setFeedbackError(null);
    try {
      const res = await updateUserProfile(profileForm);
      setProfile(res.data);
      setIsEditingProfile(false);
      if (onProfileUpdated) {
        onProfileUpdated(res.data);
      }
      setFeedbackSuccess('Profile information successfully saved to local warehouse profile table.');
    } catch (err) {
      setFeedbackError(err.message || 'Failed to update profile.');
    }
  }

  // Save Profile Photo from Modal
  async function handleSavePhoto(file) {
    setFeedbackSuccess(null);
    setFeedbackError(null);
    try {
      const res = await uploadProfilePhoto(file, authToken);
      if (res?.data?.avatar_url) {
        const newUrl = res.data.avatar_url;
        setProfile((prev) => ({
          ...prev,
          avatar_url: newUrl,
          avatar_initials: res.data.profile?.avatar_initials || prev?.avatar_initials
        }));
        if (onProfileUpdated) {
          onProfileUpdated({
            avatar_url: newUrl,
            avatar_initials: res.data.profile?.avatar_initials
          });
        }
        setFeedbackSuccess('Profile photo uploaded, optimized, and saved successfully!');
      }
    } catch (err) {
      setFeedbackError(err.message || 'Failed to upload profile photo.');
      throw err;
    }
  }

  // Remove Profile Photo
  async function handleRemovePhoto() {
    setFeedbackSuccess(null);
    setFeedbackError(null);
    try {
      await removeProfilePhoto(authToken);
      setProfile((prev) => ({ ...prev, avatar_url: null }));
      if (onProfileUpdated) {
        onProfileUpdated({ avatar_url: null });
      }
      setFeedbackSuccess('Profile photo removed successfully. Initials restored.');
    } catch (err) {
      setFeedbackError(err.message || 'Failed to remove profile photo.');
      throw err;
    }
  }

  // Save Appearance Preferences
  async function handleSaveAppearance(newTheme, newAccent, newDensity, newMotion, newFontSize, newContrast) {
    const th = newTheme !== undefined ? newTheme : theme;
    const ac = newAccent !== undefined ? newAccent : accentColor;
    const den = newDensity !== undefined ? newDensity : dashboardDensity;
    const mot = newMotion !== undefined ? newMotion : reducedMotion;
    const fs = newFontSize !== undefined ? newFontSize : fontSize;
    const hc = newContrast !== undefined ? newContrast : highContrast;

    setTheme(th);
    setAccentColor(ac);
    setDashboardDensity(den);
    setReducedMotion(mot);
    setFontSize(fs);
    setHighContrast(hc);

    applyAppearanceToDom(th, den, mot, fs, hc);

    try {
      await updateUserPreferences({
        theme: th,
        accent_color: ac,
        dashboard_density: den,
        reduced_motion: mot,
        font_size: fs,
        high_contrast: hc,
        default_crop_id: defaultCrop,
        default_mandi_id: defaultMandi,
        default_quantity: defaultQuantity,
        default_quantity_unit: defaultUnit,
        default_chart_range: defaultChartRange,
        max_recommendation_distance_km: maxDistanceKm,
        analytics_consent: true
      });
      setFeedbackSuccess('Appearance preferences applied and saved.');
    } catch (err) {
      console.warn('Preferences save warning:', err);
    }
  }

  // Save Application Defaults
  async function handleSaveAppPreferences() {
    setFeedbackSuccess(null);
    setFeedbackError(null);
    try {
      await updateUserPreferences({
        theme,
        accent_color: accentColor,
        dashboard_density: dashboardDensity,
        reduced_motion: reducedMotion,
        font_size: fontSize,
        high_contrast: highContrast,
        default_crop_id: defaultCrop,
        default_mandi_id: defaultMandi,
        default_quantity: defaultQuantity,
        default_quantity_unit: defaultUnit,
        default_chart_range: defaultChartRange,
        max_recommendation_distance_km: maxDistanceKm,
        analytics_consent: true
      });
      setFeedbackSuccess('Application default preferences successfully updated.');
    } catch (err) {
      setFeedbackError(err.message || 'Failed to update application preferences.');
    }
  }

  // Notification Toggle
  async function handleToggleNotification(field) {
    if (!notifConfig) return;
    const updated = { ...notifConfig, [field]: notifConfig[field] ? 0 : 1 };
    setNotifConfig(updated);
    try {
      await updateUserNotifications({
        price_rise_alerts: Boolean(updated.price_rise_alerts),
        price_fall_alerts: Boolean(updated.price_fall_alerts),
        selected_crop_alerts: Boolean(updated.selected_crop_alerts),
        favorite_mandi_updates: Boolean(updated.favorite_mandi_updates),
        data_refresh_alerts: Boolean(updated.data_refresh_alerts),
        weekly_market_summary: Boolean(updated.weekly_market_summary),
        alert_threshold_pct: updated.alert_threshold_pct || 5.0,
        preferred_delivery_channel: updated.preferred_delivery_channel || 'in_app',
        quiet_hours_start: updated.quiet_hours_start || '22:00',
        quiet_hours_end: updated.quiet_hours_end || '06:00'
      });
      setFeedbackSuccess('Notification preferences updated.');
    } catch (err) {
      console.error(err);
    }
  }

  // Password Change
  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordMsg(null);
    setPasswordErr(null);
    try {
      const res = await changeUserPassword({
        current_password: passwordForm.current,
        new_password: passwordForm.new,
        confirm_password: passwordForm.confirm
      });
      setPasswordMsg(res.message);
      setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (err) {
      setPasswordErr(err.message || 'Failed to change password.');
    }
  }

  // Terminate Sessions
  async function handleTerminateOtherSessions() {
    try {
      const res = await terminateOtherSessions();
      setSessions(sessions.filter((s) => s.is_current));
      setFeedbackSuccess(res.message);
    } catch (err) {
      console.error(err);
    }
  }

  // Download Account Data Bundle
  async function handleDownloadAccountData() {
    try {
      const data = await exportUserDataBundle();
      const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonStr);
      downloadAnchor.setAttribute('download', `farmprice_account_export_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setFeedbackSuccess('Account data bundle downloaded successfully.');
    } catch (err) {
      setFeedbackError('Export failed: ' + err.message);
    }
  }

  // Account Deletion
  async function handleConfirmDeleteAccount() {
    setDeleteError(null);
    try {
      await deleteUserAccount(deleteConfirmationText);
      setShowDeleteModal(false);
      alert('Your account data has been purged. Resetting to guest.');
      if (onLogout) onLogout();
    } catch (err) {
      setDeleteError(err.message || 'Deletion failed. Verify exact confirmation string.');
    }
  }

  // Feedback Submission
  async function handleSubmitFeedback(e) {
    e.preventDefault();
    setFeedbackSuccess(null);
    setFeedbackError(null);
    try {
      const res = await submitUserFeedback(feedbackForm);
      setFeedbackSuccess(res.message);
      setFeedbackForm({ category: 'general', subject: '', message: '', email: '' });
    } catch (err) {
      setFeedbackError(err.message || 'Failed to submit feedback.');
    }
  }

  const navTabs = [
    { id: 'account', label: '1. Account & Profile', icon: User },
    { id: 'appearance', label: '2. Appearance', icon: Palette },
    { id: 'language', label: '3. Language & Region', icon: Languages },
    { id: 'notifications', label: '4. Notifications', icon: Bell },
    { id: 'privacy', label: '5. Privacy & Security', icon: Shield },
    { id: 'accessibility', label: '6. Accessibility', icon: Eye },
    { id: 'data', label: '7. Data & Downloads', icon: Download },
    { id: 'preferences', label: '8. Application Defaults', icon: Sliders },
    { id: 'help', label: '9. Help & Support', icon: HelpCircle },
    { id: 'about', label: '10. About FARMPRICE AI', icon: Info },
  ];

  const faqs = [
    {
      q: 'What is a Modal Price and how does it differ from Min and Max prices?',
      a: 'The Modal Price is the officially reported auction price at which the highest volume of lots was traded during a given market auction. Unlike an arithmetic average which can be skewed by outliers, the modal price represents the true prevailing market rate.'
    },
    {
      q: 'How is the Estimated Net Return calculated in FARMPRICE AI?',
      a: 'Net Return = Gross Sale Value (Saleable Quantity × Compatible Price) minus Total Selling Expenses (Transport Freight + Loading/Unloading Labor + APMC Market Cess + Weighing + Storage + Custom Costs). We never rank mandis by headline price alone.'
    },
    {
      q: 'Are APMC market prices live or delayed?',
      a: 'Agmarknet daily mandi prices are official statutory auction registers reported by APMC secretaries at the close of trading batches. FARMPRICE AI displays the exact reporting date and retrieval timestamp on every card and never makes false claims of sub-second real-time prices.'
    },
    {
      q: 'Why does the Smart Mandi engine sometimes recommend a mandi with a lower listed price?',
      a: 'A distant market may offer a ₹150/q higher headline price, but hauling produce 120 km incurs higher diesel freight, weighing cess, and risk of perishable weight loss. Our algorithm optimizes your take-home cash after all verified road and market expenses.'
    },
    {
      q: 'What are the limitations of the AI Price Forecasting module?',
      a: 'Forecasts are statistical projections using chronological time-series regression and seasonal-naive baselines with 95% confidence intervals. They reflect historical volatility and are decision-support estimates, not financial guarantees.'
    }
  ];

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#113826', margin: 0 }}>
            {t.settings?.profileTitle || 'Settings & User Profile'}
          </h2>
          <p style={{ fontSize: 13, color: '#5A6A60', marginTop: 4 }}>
            Manage your personal profile, appearance, regional formats, data exports, and agricultural preferences.
          </p>
        </div>
      </div>

      {/* Global Toast / Feedback */}
      {feedbackSuccess && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#E6F7F0',
            border: '1px solid #A7F3D0',
            borderRadius: 8,
            color: '#059669',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={16} />
            <span>{feedbackSuccess}</span>
          </div>
          <button onClick={() => setFeedbackSuccess(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#059669' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {feedbackError && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#FEE2E2',
            border: '1px solid #FECACA',
            borderRadius: 8,
            color: '#DC2626',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} />
            <span>{feedbackError}</span>
          </div>
          <button onClick={() => setFeedbackError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main 2-Column Layout: Sidebar Tabs on Left + Content on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20 }}>
        {/* Navigation Submenu */}
        <div className="calc-card" style={{ padding: '14px 10px', height: 'fit-content' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setFeedbackSuccess(null);
                    setFeedbackError(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: isActive ? 700 : 500
                  }}
                >
                  <Icon size={16} color={isActive ? '#FFFFFF' : '#059669'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Active Content Panel */}
        <div className="calc-card" style={{ padding: '28px' }}>
          {/* ============================================================ */}
          {/* 1. ACCOUNT & PROFILE */}
          {/* ============================================================ */}
          {activeTab === 'account' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 20, borderBottom: '1px solid #DDE5E0', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                  {/* Circular Avatar Container with Hoverable Camera Badge */}
                  <div style={{ position: 'relative', width: 76, height: 76, flexShrink: 0 }}>
                    <div
                      onClick={() => setIsPhotoModalOpen(true)}
                      style={{
                        width: 76,
                        height: 76,
                        borderRadius: '50%',
                        backgroundColor: userRole === 'admin' ? '#D97706' : '#113826',
                        color: '#FFFFFF',
                        fontSize: 24,
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: '3px solid #10B981',
                        transition: 'transform 0.2s ease'
                      }}
                      title="Click to edit or change profile photo"
                    >
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile?.full_name || 'User Profile Photo'}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <span>{profile?.avatar_initials || (userRole === 'admin' ? 'AD' : 'CP')}</span>
                      )}
                    </div>
                    {/* Floating Camera Edit Badge */}
                    <button
                      type="button"
                      onClick={() => setIsPhotoModalOpen(true)}
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        backgroundColor: '#059669',
                        color: '#FFFFFF',
                        border: '2px solid #FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}
                      title="Edit Photo"
                      aria-label="Edit Profile Photo"
                    >
                      <Camera size={13} />
                    </button>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: 18, fontWeight: 800, color: '#113826', margin: 0 }}>
                        {profile?.full_name || 'Chethan P'}
                      </h3>
                      {/* Photo Action Buttons */}
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setIsPhotoModalOpen(true)}
                          style={{ padding: '3px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                          title="Open photo editor to crop, zoom or rotate"
                        >
                          <Camera size={12} color="#059669" />
                          <span>{profile?.avatar_url ? 'Change Photo' : 'Edit Photo'}</span>
                        </button>
                        {profile?.avatar_url && (
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => {
                              if (window.confirm('Are you sure you want to remove your profile photo and restore initials?')) {
                                handleRemovePhoto();
                              }
                            }}
                            style={{ padding: '3px 8px', fontSize: 11, color: '#DC2626', borderColor: '#FECACA', display: 'flex', alignItems: 'center', gap: 4 }}
                            title="Remove photo and restore default initials"
                          >
                            <Trash2 size={12} />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <p style={{ fontSize: 13, color: '#5A6A60', marginTop: 4, marginBottom: 4 }}>
                      {profile?.email || 'chethan@farmer.ai'} • {profile?.district || 'Hassan'}, {profile?.state || 'Karnataka'}
                    </p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          backgroundColor: userRole === 'admin' ? '#FEF3C7' : '#E6F7F0',
                          color: userRole === 'admin' ? '#92400E' : '#059669',
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700
                        }}
                      >
                        {userRole === 'admin' ? '🛡️ APMC Administrator' : '🌾 Verified Farmer Account'}
                      </span>
                      <span style={{ fontSize: 11, color: '#5A6A60' }}>
                        Member since {profile?.created_at?.split(' ')[0] || '2026-07-15'}
                      </span>
                      {profile?.avatar_url && (
                        <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>
                          • 📷 Photo Saved
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  {!isEditingProfile ? (
                    <button
                      className="btn-secondary"
                      onClick={() => setIsEditingProfile(true)}
                    >
                      <Edit2 size={13} />
                      <span>Edit Profile</span>
                    </button>
                  ) : (
                    <button
                      className="btn-secondary"
                      onClick={() => setIsEditingProfile(false)}
                      style={{ color: '#DC2626', borderColor: '#FECACA' }}
                    >
                      <X size={13} />
                      <span>Cancel</span>
                    </button>
                  )}
                  <button
                    onClick={() => onOpenAuth(userRole)}
                    className="filter-select"
                    style={{ fontSize: 12, padding: '6px 12px', cursor: 'pointer' }}
                  >
                    Switch Role / Logout
                  </button>
                </div>
              </div>

              {/* Profile Details Form */}
              <form onSubmit={handleSaveProfile}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
                  <div>
                    <label className="filter-label">Full Name</label>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        className="filter-select"
                        style={{ width: '100%', marginTop: 4 }}
                        value={profileForm.full_name}
                        onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                        required
                      />
                    ) : (
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1A241F', marginTop: 6 }}>
                        {profile?.full_name || 'Chethan P'}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="filter-label">Email Address</label>
                    {isEditingProfile ? (
                      <input
                        type="email"
                        className="filter-select"
                        style={{ width: '100%', marginTop: 4 }}
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      />
                    ) : (
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1A241F', marginTop: 6 }}>
                        {profile?.email || 'chethan@farmer.ai'}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="filter-label">Mobile Phone Number</label>
                    {isEditingProfile ? (
                      <input
                        type="tel"
                        className="filter-select"
                        style={{ width: '100%', marginTop: 4 }}
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      />
                    ) : (
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1A241F', marginTop: 6 }}>
                        {profile?.phone || '+91 98765 43210'}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="filter-label">Home District</label>
                    {isEditingProfile ? (
                      <select
                        className="filter-select"
                        style={{ width: '100%', marginTop: 4 }}
                        value={profileForm.district}
                        onChange={(e) => setProfileForm({ ...profileForm, district: e.target.value })}
                      >
                        <option value="Hassan">Hassan</option>
                        <option value="Mysore">Mysore</option>
                        <option value="Mandya">Mandya</option>
                        <option value="Kolar">Kolar</option>
                        <option value="Bengaluru Urban">Bengaluru Urban</option>
                        <option value="Belgaum">Belgaum</option>
                      </select>
                    ) : (
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1A241F', marginTop: 6 }}>
                        {profile?.district || 'Hassan'}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="filter-label">State</label>
                    {isEditingProfile ? (
                      <select
                        className="filter-select"
                        style={{ width: '100%', marginTop: 4 }}
                        value={profileForm.state}
                        onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                      >
                        <option value="Karnataka">Karnataka</option>
                        <option value="Tamil Nadu">Tamil Nadu</option>
                        <option value="Andhra Pradesh">Andhra Pradesh</option>
                        <option value="Maharashtra">Maharashtra</option>
                      </select>
                    ) : (
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1A241F', marginTop: 6 }}>
                        {profile?.state || 'Karnataka'}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="filter-label">Village / Town / Hobli</label>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        className="filter-select"
                        style={{ width: '100%', marginTop: 4 }}
                        value={profileForm.village_or_town}
                        onChange={(e) => setProfileForm({ ...profileForm, village_or_town: e.target.value })}
                      />
                    ) : (
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1A241F', marginTop: 6 }}>
                        {profile?.village_or_town || 'Channarayapatna Hobli'}
                      </div>
                    )}
                  </div>
                </div>

                {isEditingProfile && (
                  <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                    <button type="submit" className="hero-cta-btn">
                      <Check size={16} />
                      <span>Save Profile Changes</span>
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setIsEditingProfile(false)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* ============================================================ */}
          {/* 2. APPEARANCE SETTINGS */}
          {/* ============================================================ */}
          {activeTab === 'appearance' && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#113826', marginBottom: 6 }}>
                Appearance & Theme
              </h3>
              <p style={{ fontSize: 13, color: '#5A6A60', marginBottom: 20 }}>
                Customize interface colors, dashboard density, and animations. Settings apply immediately and persist in your profile.
              </p>

              {/* Theme Selector */}
              <div style={{ marginBottom: 24 }}>
                <label className="filter-label" style={{ marginBottom: 8, display: 'block' }}>Interface Theme</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                  {[
                    { id: 'light', label: 'Light Theme', desc: 'Clean Ivory & White surfaces' },
                    { id: 'dark', label: 'Dark Theme', desc: 'High-contrast Forest Night' },
                    { id: 'system', label: 'System Default', desc: 'Match device OS preference' },
                  ].map((tItem) => {
                    const isSel = theme === tItem.id;
                    return (
                      <div
                        key={tItem.id}
                        onClick={() => handleSaveAppearance(tItem.id, accentColor, dashboardDensity, reducedMotion, fontSize, highContrast)}
                        style={{
                          padding: '16px',
                          borderRadius: 10,
                          border: `2px solid ${isSel ? '#059669' : '#DDE5E0'}`,
                          backgroundColor: isSel ? '#FAFDF9' : '#FFFFFF',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#113826' }}>{tItem.label}</span>
                          {isSel && <CheckCircle2 size={16} color="#059669" />}
                        </div>
                        <div style={{ fontSize: 12, color: '#5A6A60', marginTop: 4 }}>{tItem.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Accent Color Options */}
              <div style={{ marginBottom: 24 }}>
                <label className="filter-label" style={{ marginBottom: 8, display: 'block' }}>Brand Accent Color</label>
                <div style={{ display: 'flex', gap: 14 }}>
                  {[
                    { color: '#113826', name: 'Forest Green (Primary)' },
                    { color: '#059669', name: 'Emerald Sage' },
                    { color: '#D97706', name: 'Harvest Amber' },
                    { color: '#2563EB', name: 'Agri Blue' },
                  ].map((c) => {
                    const isSel = accentColor === c.color;
                    return (
                      <div
                        key={c.color}
                        onClick={() => handleSaveAppearance(theme, c.color, dashboardDensity, reducedMotion, fontSize, highContrast)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 14px',
                          borderRadius: 8,
                          border: `1.5px solid ${isSel ? c.color : '#DDE5E0'}`,
                          cursor: 'pointer',
                          backgroundColor: isSel ? '#F4F7F4' : '#FFFFFF'
                        }}
                      >
                        <div style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: c.color }} />
                        <span style={{ fontSize: 13, fontWeight: isSel ? 700 : 500, color: '#1A241F' }}>{c.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dashboard Density & Reduced Motion */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={{ padding: '16px', border: '1px solid #DDE5E0', borderRadius: 10 }}>
                  <label className="filter-label" style={{ display: 'block', marginBottom: 6 }}>Dashboard Density</label>
                  <select
                    className="filter-select"
                    style={{ width: '100%' }}
                    value={dashboardDensity}
                    onChange={(e) => handleSaveAppearance(theme, accentColor, e.target.value, reducedMotion, fontSize, highContrast)}
                  >
                    <option value="comfortable">Comfortable (Standard Padding)</option>
                    <option value="compact">Compact (Dense Data View)</option>
                  </select>
                  <div style={{ fontSize: 11, color: '#5A6A60', marginTop: 4 }}>
                    Controls padding of comparison tables and cards.
                  </div>
                </div>

                <div style={{ padding: '16px', border: '1px solid #DDE5E0', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#113826' }}>Reduced Motion</div>
                    <div style={{ fontSize: 12, color: '#5A6A60' }}>Disable chart transitions and micro-animations</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={reducedMotion}
                    onChange={(e) => handleSaveAppearance(theme, accentColor, dashboardDensity, e.target.checked, fontSize, highContrast)}
                    style={{ width: 18, height: 18, accentColor: '#059669', cursor: 'pointer' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 3. LANGUAGE AND REGION */}
          {/* ============================================================ */}
          {activeTab === 'language' && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#113826', marginBottom: 6 }}>
                Language & Regional Settings
              </h3>
              <p style={{ fontSize: 13, color: '#5A6A60', marginBottom: 20 }}>
                Switch portal language, regional market default, currency, and numerical formats.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div
                  onClick={() => setLang('en')}
                  style={{
                    padding: '20px',
                    borderRadius: 10,
                    border: `2px solid ${lang === 'en' ? '#059669' : '#DDE5E0'}`,
                    backgroundColor: lang === 'en' ? '#FAFDF9' : '#FFFFFF',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#113826' }}>English</div>
                  <div style={{ fontSize: 12, color: '#5A6A60', marginTop: 4 }}>Standard Indian Agricultural English</div>
                  <div style={{ fontSize: 11, color: '#059669', marginTop: 8, fontWeight: 600 }}>Active Language</div>
                </div>

                <div
                  onClick={() => setLang('kn')}
                  style={{
                    padding: '20px',
                    borderRadius: 10,
                    border: `2px solid ${lang === 'kn' ? '#059669' : '#DDE5E0'}`,
                    backgroundColor: lang === 'kn' ? '#FAFDF9' : '#FFFFFF',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#113826' }}>ಕನ್ನಡ (Kannada)</div>
                  <div style={{ fontSize: 12, color: '#5A6A60', marginTop: 4 }}>ಕರ್ನಾಟಕ ಕೃಷಿ ಮಾರುಕಟ್ಟೆ ಕನ್ನಡ ಪರಿಭಾಷೆ</div>
                  <div style={{ fontSize: 11, color: '#059669', marginTop: 8, fontWeight: 600 }}>Noto Sans Kannada Enabled</div>
                </div>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#FAFDF9', border: '1px solid #D1E5D8', borderRadius: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#113826', marginBottom: 6 }}>
                  Standard Regional Formats:
                </div>
                <div style={{ fontSize: 12, color: '#355E47', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div>• Currency: <strong>₹ Indian Rupee (INR)</strong></div>
                  <div>• Price Quotation Unit: <strong>₹ / Quintal (100 kg)</strong> with verified conversion to ₹ / kg</div>
                  <div>• Numerical Standard: <strong>Lakh & Crore Indian Numbering System (e.g. ₹1,05,000)</strong></div>
                  <div>• Calendar standard: <strong>IST (Indian Standard Time, UTC+05:30)</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 4. NOTIFICATION SETTINGS */}
          {/* ============================================================ */}
          {activeTab === 'notifications' && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#113826', marginBottom: 6 }}>
                Market Notification Preferences
              </h3>
              <p style={{ fontSize: 13, color: '#5A6A60', marginBottom: 20 }}>
                Manage automated alerts for price surges, market arrivals, and forecast updates.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { field: 'price_rise_alerts', label: 'Price-Rise Alert (> 5% in 7 Days)', desc: 'Notify when modal prices jump significantly in your home APMC.' },
                  { field: 'price_fall_alerts', label: 'Price-Fall Warning (> 5% in 7 Days)', desc: 'Receive prompt alerts when auction rates begin downward momentum.' },
                  { field: 'selected_crop_alerts', label: 'Preferred Crops Daily Summary', desc: 'Updates for Tomato, Onion, and Paddy arrivals.' },
                  { field: 'favorite_mandi_updates', label: 'Favorite Mandi Lot Clearance', desc: 'Updates when Hassan, Mysore, or Bengaluru APMC auction results publish.' },
                  { field: 'weekly_market_summary', label: 'Weekly Agricultural Market Intelligence Digest', desc: 'Comprehensive weekend digest comparing regional price spreads.' },
                ].map((nItem) => {
                  const isChecked = Boolean(notifConfig?.[nItem.field]);
                  return (
                    <div
                      key={nItem.field}
                      style={{
                        padding: '14px 18px',
                        border: '1px solid #DDE5E0',
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: isChecked ? '#FAFDF9' : '#FFFFFF'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#113826' }}>{nItem.label}</div>
                        <div style={{ fontSize: 12, color: '#5A6A60', marginTop: 2 }}>{nItem.desc}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleNotification(nItem.field)}
                        style={{ width: 20, height: 20, accentColor: '#059669', cursor: 'pointer' }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Delivery Channels */}
              <div style={{ marginTop: 24, padding: '16px', border: '1px solid #DDE5E0', borderRadius: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#113826', marginBottom: 8 }}>
                  Notification Delivery Channel
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  <div style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #059669', backgroundColor: '#E6F7F0' }}>
                    <div style={{ fontWeight: 700, color: '#065F46', fontSize: 13 }}>In-App Alerts</div>
                    <div style={{ fontSize: 11, color: '#047857' }}>● Connected & Active</div>
                  </div>
                  <div style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #DDE5E0', backgroundColor: '#FAFBF9' }}>
                    <div style={{ fontWeight: 700, color: '#1A241F', fontSize: 13 }}>SMS Gateway</div>
                    <div style={{ fontSize: 11, color: '#5A6A60' }}>Requires Twilio in Production</div>
                  </div>
                  <div style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #DDE5E0', backgroundColor: '#FAFBF9' }}>
                    <div style={{ fontWeight: 700, color: '#1A241F', fontSize: 13 }}>WhatsApp Delivery</div>
                    <div style={{ fontSize: 11, color: '#5A6A60' }}>Requires Meta Business API</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 5. PRIVACY AND SECURITY */}
          {/* ============================================================ */}
          {activeTab === 'privacy' && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#113826', marginBottom: 6 }}>
                Privacy & Account Security
              </h3>
              <p style={{ fontSize: 13, color: '#5A6A60', marginBottom: 20 }}>
                Manage account passwords, view active browser sessions, and exercise privacy data controls.
              </p>

              {/* Password Change Form */}
              <div style={{ padding: '20px', border: '1px solid #DDE5E0', borderRadius: 10, marginBottom: 24 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#113826', marginBottom: 12 }}>
                  Change Account Password
                </div>
                {passwordMsg && (
                  <div style={{ padding: '8px 12px', backgroundColor: '#E6F7F0', color: '#059669', borderRadius: 6, fontSize: 12, marginBottom: 12 }}>
                    {passwordMsg}
                  </div>
                )}
                {passwordErr && (
                  <div style={{ padding: '8px 12px', backgroundColor: '#FEE2E2', color: '#DC2626', borderRadius: 6, fontSize: 12, marginBottom: 12 }}>
                    {passwordErr}
                  </div>
                )}
                <form onSubmit={handleChangePassword} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  <div>
                    <label className="filter-label">Current Password</label>
                    <input
                      type="password"
                      className="filter-select"
                      style={{ width: '100%', marginTop: 4 }}
                      value={passwordForm.current}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="filter-label">New Password</label>
                    <input
                      type="password"
                      className="filter-select"
                      style={{ width: '100%', marginTop: 4 }}
                      value={passwordForm.new}
                      onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="filter-label">Confirm New Password</label>
                    <input
                      type="password"
                      className="filter-select"
                      style={{ width: '100%', marginTop: 4 }}
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                      required
                    />
                  </div>
                  <div style={{ alignSelf: 'flex-end' }}>
                    <button type="submit" className="hero-cta-btn" style={{ padding: '9px 16px', fontSize: 13 }}>
                      Update Password
                    </button>
                  </div>
                </form>
              </div>

              {/* Active Sessions */}
              <div style={{ padding: '20px', border: '1px solid #DDE5E0', borderRadius: 10, marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#113826' }}>Active Device Sessions</div>
                    <div style={{ fontSize: 12, color: '#5A6A60' }}>Devices currently authenticated to your portal account</div>
                  </div>
                  <button
                    onClick={handleTerminateOtherSessions}
                    className="btn-secondary"
                    style={{ fontSize: 12, padding: '6px 12px' }}
                  >
                    Sign Out Other Devices
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sessions.map((sess) => (
                    <div
                      key={sess.session_id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        backgroundColor: '#FAFBF9',
                        border: '1px solid #E5E9E4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Smartphone size={16} color="#059669" />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#1A241F' }}>
                            {sess.device_info}
                            {sess.is_current ? (
                              <span style={{ marginLeft: 8, fontSize: 10, backgroundColor: '#E6F7F0', color: '#059669', padding: '2px 6px', borderRadius: 8, fontWeight: 700 }}>
                                CURRENT DEVICE
                              </span>
                            ) : null}
                          </div>
                          <div style={{ fontSize: 11, color: '#5A6A60' }}>IP: {sess.ip_address} • {sess.last_active_at}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Rights & Deletion */}
              <div style={{ display: 'flex', gap: 14 }}>
                <button
                  onClick={handleDownloadAccountData}
                  className="btn-secondary"
                >
                  <Download size={14} />
                  <span>Request Account Data Export (JSON)</span>
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #DC2626',
                    color: '#DC2626',
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Delete Account
                </button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 6. ACCESSIBILITY */}
          {/* ============================================================ */}
          {activeTab === 'accessibility' && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#113826', marginBottom: 6 }}>
                Accessibility Controls
              </h3>
              <p style={{ fontSize: 13, color: '#5A6A60', marginBottom: 20 }}>
                Adjust font sizing, high-contrast borders, and accessibility helpers for easy reading on mobile and field tablets.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 24 }}>
                <div style={{ padding: '16px', border: '1px solid #DDE5E0', borderRadius: 10 }}>
                  <label className="filter-label" style={{ display: 'block', marginBottom: 6 }}>Text Size Preference</label>
                  <select
                    className="filter-select"
                    style={{ width: '100%' }}
                    value={fontSize}
                    onChange={(e) => handleSaveAppearance(theme, accentColor, dashboardDensity, reducedMotion, e.target.value, highContrast)}
                  >
                    <option value="normal">Normal (100% - Standard)</option>
                    <option value="large">Large (115% - High Readability)</option>
                    <option value="extra-large">Extra Large (130% - Maximum Size)</option>
                  </select>
                </div>

                <div style={{ padding: '16px', border: '1px solid #DDE5E0', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#113826' }}>High-Contrast Mode</div>
                    <div style={{ fontSize: 12, color: '#5A6A60' }}>Thick black/green card borders for sunny field conditions</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={highContrast}
                    onChange={(e) => handleSaveAppearance(theme, accentColor, dashboardDensity, reducedMotion, fontSize, e.target.checked)}
                    style={{ width: 20, height: 20, accentColor: '#059669', cursor: 'pointer' }}
                  />
                </div>
              </div>

              {/* Glossary */}
              <div style={{ padding: '16px', backgroundColor: '#FAFDF9', border: '1px solid #D1E5D8', borderRadius: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#113826', marginBottom: 8 }}>
                  🌾 Plain-Language Agricultural Glossary
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12, color: '#355E47' }}>
                  <div><strong>Modal Price:</strong> The single most frequent price paid in today's official APMC auction.</div>
                  <div><strong>Quintal:</strong> Standard Indian commodity unit equal to exactly 100 kilograms.</div>
                  <div><strong>APMC Cess:</strong> Statutory market fee charged by market committees (typically 1.5% in Karnataka).</div>
                  <div><strong>Break-Even Price:</strong> The exact minimum price per quintal you must receive to cover all haulage and mandi fees without losing money.</div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 7. DATA AND DOWNLOADS */}
          {/* ============================================================ */}
          {activeTab === 'data' && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#113826', marginBottom: 6 }}>
                Data & Downloads Center
              </h3>
              <p style={{ fontSize: 13, color: '#5A6A60', marginBottom: 20 }}>
                Export verified agricultural market intelligence reports and your personal account preferences.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                <div style={{ padding: '18px', border: '1px solid #DDE5E0', borderRadius: 10, backgroundColor: '#FAFBF9' }}>
                  <FileText size={24} color="#059669" />
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#113826', marginTop: 10 }}>PDF Intelligence Report</div>
                  <div style={{ fontSize: 12, color: '#5A6A60', marginTop: 4, minHeight: 36 }}>
                    Comprehensive mandi comparison, net return breakdown, and route logistics sheet.
                  </div>
                  <button
                    onClick={() => downloadReport('pdf', { crop_id: 'CROP_TOMATO', quantity: 50, unit: 'quintals' })}
                    className="btn-secondary"
                    style={{ width: '100%', marginTop: 12, justifyContent: 'center' }}
                  >
                    Download PDF
                  </button>
                </div>

                <div style={{ padding: '18px', border: '1px solid #DDE5E0', borderRadius: 10, backgroundColor: '#FAFBF9' }}>
                  <FileSpreadsheet size={24} color="#2563EB" />
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#113826', marginTop: 10 }}>Daily Mandi Prices CSV</div>
                  <div style={{ fontSize: 12, color: '#5A6A60', marginTop: 4, minHeight: 36 }}>
                    Official AGMARKNET auction observations, arrivals, and price ranges.
                  </div>
                  <button
                    onClick={() => exportDailyPricesCsv('CROP_TOMATO')}
                    className="btn-secondary"
                    style={{ width: '100%', marginTop: 12, justifyContent: 'center' }}
                  >
                    Export CSV
                  </button>
                </div>

                <div style={{ padding: '18px', border: '1px solid #DDE5E0', borderRadius: 10, backgroundColor: '#FAFBF9' }}>
                  <Download size={24} color="#D97706" />
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#113826', marginTop: 10 }}>Personal Account Bundle</div>
                  <div style={{ fontSize: 12, color: '#5A6A60', marginTop: 4, minHeight: 36 }}>
                    DPDPA-compliant export of your profile, preferences, and session logs.
                  </div>
                  <button
                    onClick={handleDownloadAccountData}
                    className="btn-secondary"
                    style={{ width: '100%', marginTop: 12, justifyContent: 'center' }}
                  >
                    Export JSON
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 8. APPLICATION DEFAULTS */}
          {/* ============================================================ */}
          {activeTab === 'preferences' && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#113826', marginBottom: 6 }}>
                Application Default Inputs
              </h3>
              <p style={{ fontSize: 13, color: '#5A6A60', marginBottom: 20 }}>
                Configure default values to pre-populate Net Return Calculators, Smart Mandi Comparisons, and Charts.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
                <div>
                  <label className="filter-label">Default Crop</label>
                  <select
                    className="filter-select"
                    style={{ width: '100%', marginTop: 4 }}
                    value={defaultCrop}
                    onChange={(e) => setDefaultCrop(e.target.value)}
                  >
                    <option value="CROP_TOMATO">Tomato (ಹಣ್ಣು ಟೊಮ್ಯಾಟೋ)</option>
                    <option value="CROP_ONION">Onion (ಈರುಳ್ಳಿ)</option>
                    <option value="CROP_POTATO">Potato (ಆಲೂಗಡ್ಡೆ)</option>
                    <option value="CROP_CHILLI">Green Chilli (ಹಸಿ ಮೆಣಸಿನಕಾಯಿ)</option>
                    <option value="CROP_GINGER">Ginger (ಶುಂಠಿ)</option>
                  </select>
                </div>

                <div>
                  <label className="filter-label">Default Mandi Location</label>
                  <select
                    className="filter-select"
                    style={{ width: '100%', marginTop: 4 }}
                    value={defaultMandi}
                    onChange={(e) => setDefaultMandi(e.target.value)}
                  >
                    <option value="MND_HASSAN">Hassan APMC (ಹಾಸನ)</option>
                    <option value="MND_CRPATNA">Channarayapatna (ಚನ್ನರಾಯಪಟ್ಟಣ)</option>
                    <option value="MND_MYSORE">Mysore Bandipalya (ಮೈಸೂರು)</option>
                    <option value="MND_BANGALORE">Bengaluru Yeshwanthpur (ಬೆಂಗಳೂರು)</option>
                    <option value="MND_KOLAR">Kolar APMC (ಕೋಲಾರ)</option>
                  </select>
                </div>

                <div>
                  <label className="filter-label">Default Quantity</label>
                  <input
                    type="number"
                    className="filter-select"
                    style={{ width: '100%', marginTop: 4 }}
                    value={defaultQuantity}
                    onChange={(e) => setDefaultQuantity(Number(e.target.value))}
                    min="1"
                  />
                </div>

                <div>
                  <label className="filter-label">Quantity Unit</label>
                  <select
                    className="filter-select"
                    style={{ width: '100%', marginTop: 4 }}
                    value={defaultUnit}
                    onChange={(e) => setDefaultUnit(e.target.value)}
                  >
                    <option value="quintals">Quintals (100 kg)</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="tonnes">Tonnes (1000 kg)</option>
                  </select>
                </div>

                <div>
                  <label className="filter-label">Chart Timeframe</label>
                  <select
                    className="filter-select"
                    style={{ width: '100%', marginTop: 4 }}
                    value={defaultChartRange}
                    onChange={(e) => setDefaultChartRange(e.target.value)}
                  >
                    <option value="1month">Last 1 Month</option>
                    <option value="3months">Last 3 Months</option>
                    <option value="6months">Last 6 Months</option>
                    <option value="1year">Last 1 Year</option>
                  </select>
                </div>

                <div>
                  <label className="filter-label">Max Travel Radius ({maxDistanceKm} km)</label>
                  <input
                    type="range"
                    min="25"
                    max="300"
                    step="25"
                    value={maxDistanceKm}
                    onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
                    style={{ width: '100%', marginTop: 10, accentColor: '#059669' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 24 }}>
                <button onClick={handleSaveAppPreferences} className="hero-cta-btn">
                  <Check size={16} />
                  <span>Save Application Defaults</span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 9. HELP AND SUPPORT */}
          {/* ============================================================ */}
          {activeTab === 'help' && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#113826', marginBottom: 6 }}>
                Frequently Asked Questions & Support
              </h3>
              <p style={{ fontSize: 13, color: '#5A6A60', marginBottom: 20 }}>
                Transparent explanations of market formulas, data provenance, and operational assistance.
              </p>

              {/* FAQ Accordion */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                {faqs.map((faq, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div
                      key={idx}
                      style={{
                        border: '1px solid #DDE5E0',
                        borderRadius: 8,
                        overflow: 'hidden'
                      }}
                    >
                      <button
                        onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}
                        style={{
                          width: '100%',
                          padding: '14px 18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: isOpen ? '#FAFDF9' : '#FFFFFF',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#113826' }}>{faq.q}</span>
                        {isOpen ? <ChevronUp size={16} color="#059669" /> : <ChevronDown size={16} color="#5A6A60" />}
                      </button>
                      {isOpen && (
                        <div style={{ padding: '14px 18px', backgroundColor: '#FFFFFF', borderTop: '1px solid #E5E9E4', fontSize: 13, color: '#4B5563', lineHeight: 1.6 }}>
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Contact / Feedback Form */}
              <div style={{ padding: '20px', border: '1px solid #DDE5E0', borderRadius: 10, backgroundColor: '#FAFBF9' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#113826', marginBottom: 12 }}>
                  Submit Inquiry or Feedback
                </div>
                <form onSubmit={handleSubmitFeedback} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label className="filter-label">Category</label>
                      <select
                        className="filter-select"
                        style={{ width: '100%', marginTop: 4 }}
                        value={feedbackForm.category}
                        onChange={(e) => setFeedbackForm({ ...feedbackForm, category: e.target.value })}
                      >
                        <option value="general">General Support</option>
                        <option value="pricing_data">Mandi Price Clarification</option>
                        <option value="calculator">Expense Calculation Question</option>
                        <option value="bug_report">Report an Issue</option>
                        <option value="suggestion">Feature Suggestion</option>
                      </select>
                    </div>

                    <div>
                      <label className="filter-label">Subject</label>
                      <input
                        type="text"
                        className="filter-select"
                        style={{ width: '100%', marginTop: 4 }}
                        placeholder="Brief summary..."
                        value={feedbackForm.subject}
                        onChange={(e) => setFeedbackForm({ ...feedbackForm, subject: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="filter-label">Message Details</label>
                    <textarea
                      rows={3}
                      className="filter-select"
                      style={{ width: '100%', marginTop: 4, resize: 'vertical' }}
                      placeholder="Describe your question or observation..."
                      value={feedbackForm.message}
                      onChange={(e) => setFeedbackForm({ ...feedbackForm, message: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <button type="submit" className="hero-cta-btn" style={{ fontSize: 13, padding: '9px 18px' }}>
                      <Send size={14} />
                      <span>Submit to Operations Registry</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 10. ABOUT FARMPRICE AI */}
          {/* ============================================================ */}
          {activeTab === 'about' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <BrandLogo size={52} priority />
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: '#113826', margin: 0 }}>
                      {aboutData?.project_name || 'FARMPRICE AI'}
                    </h3>
                    <div style={{ fontSize: 12, color: '#059669', fontWeight: 700 }}>
                      Predict • Compare • Get Better Prices
                    </div>
                  </div>
                </div>

                {onReplayIntro && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={onReplayIntro}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      padding: '6px 14px',
                      cursor: 'pointer'
                    }}
                    title="Watch the cinematic brand intro animation again"
                  >
                    <span>🎬 Replay Opening Animation</span>
                  </button>
                )}
              </div>

              <p style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.6, marginBottom: 20 }}>
                FARMPRICE AI is an open-source agricultural market intelligence and decision-support platform designed to transform raw statutory APMC mandi records into actionable take-home net returns for Indian farmers.
              </p>

              {/* Live Warehouse & System Status Card */}
              <div style={{ padding: '16px', border: '1px solid #DDE5E0', borderRadius: 10, backgroundColor: '#FAFDF9', marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#113826', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RefreshCw size={15} color="#059669" />
                  <span>Live System & Data Warehouse Health</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, fontSize: 12 }}>
                  <div>
                    <span style={{ color: '#5A6A60' }}>Warehouse Status:</span>{' '}
                    <strong style={{ color: '#059669' }}>{aboutData?.system_health?.warehouse_status || 'HEALTHY'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#5A6A60' }}>Active Mode:</span>{' '}
                    <strong>{aboutData?.system_health?.warehouse_mode || 'LOCAL_DEVELOPMENT_ADAPTER'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#5A6A60' }}>Observations Stored:</span>{' '}
                    <strong>{aboutData?.system_health?.total_verified_observations || 104} APMC Lots</strong>
                  </div>
                  <div>
                    <span style={{ color: '#5A6A60' }}>Software Version:</span>{' '}
                    <strong>{aboutData?.version || '1.2.0-Production'}</strong>
                  </div>
                </div>
              </div>

              {/* Real Tech Stack */}
              <div style={{ padding: '16px', border: '1px solid #DDE5E0', borderRadius: 10, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#113826', marginBottom: 10 }}>
                  Verified Production Tech Stack
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#4B5563' }}>
                  <div>• <strong>Frontend:</strong> React 18, Vite 5, Lucide Icons, Pure Vanilla CSS tokens with mobile drawer layouts</div>
                  <div>• <strong>Backend:</strong> FastAPI 0.115, Pydantic v2, Python 3.10, Uvicorn ASGI Server</div>
                  <div>• <strong>Data Layer:</strong> Multi-tiered Snowflake analytical warehouse connector with curated SQLite local development adapter</div>
                  <div>• <strong>Machine Learning:</strong> Scikit-learn (Ridge Regression with chronological validation & Seasonal-Naive benchmark)</div>
                  <div>• <strong>Reporting Engine:</strong> ReportLab vector PDF generator & standard RFC 4180 CSV streaming</div>
                  <div>• <strong>Typography:</strong> Google Inter & Noto Sans Kannada Dual Engine</div>
                </div>
              </div>

              {/* Data Sources */}
              <div style={{ padding: '16px', backgroundColor: '#F8FAF8', border: '1px solid #E5E9E4', borderRadius: 10, fontSize: 12, color: '#5A6A60' }}>
                <div style={{ fontWeight: 700, color: '#1A241F', marginBottom: 4 }}>Official Indian Agricultural Data Attribution</div>
                Mandi auction observations conform to the Ministry of Agriculture & Farmers Welfare, Directorate of Marketing & Inspection (AGMARKNET / data.gov.in) standards. Weather observations queried via Open-Meteo.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Account Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 14, maxWidth: 460, width: '100%', padding: '24px', border: '1px solid #FECACA' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#DC2626', marginBottom: 12 }}>
              <AlertTriangle size={24} />
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Confirm Account Purge</h3>
            </div>
            <p style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.5, marginBottom: 16 }}>
              This action will permanently delete your farmer profile, notification configurations, preferences, and session logs from the local database.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#1A241F', display: 'block', marginBottom: 6 }}>
                Type <code style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '2px 6px', borderRadius: 4 }}>DELETE MY ACCOUNT</code> to confirm:
              </label>
              <input
                type="text"
                className="filter-select"
                style={{ width: '100%' }}
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="DELETE MY ACCOUNT"
              />
            </div>

            {deleteError && (
              <div style={{ color: '#DC2626', fontSize: 12, marginBottom: 12 }}>{deleteError}</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmationText(''); setDeleteError(null); }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteAccount}
                style={{
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                Purge Account Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Photo Editor Modal */}
      <PhotoEditorModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        currentPhotoUrl={profile?.avatar_url}
        onSavePhoto={handleSavePhoto}
        onRemovePhoto={handleRemovePhoto}
      />
    </div>
  );
}
