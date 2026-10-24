import React, { useState } from 'react';
import {
  User,
  Phone,
  MapPin,
  Languages,
  Sprout,
  Bell,
  HelpCircle,
  FileText,
  Shield,
  Edit2,
  Check
} from 'lucide-react';

export default function SettingsView({ t, lang, setLang }) {
  const [activeSubTab, setActiveSubTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [phone, setPhone] = useState('+91 98765 43210');
  const [location, setLocation] = useState('Hassan, Karnataka');

  return (
    <div>
      {/* Title */}
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#113826' }}>
          Settings & Farmer Profile
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24 }}>
        {/* Left Subnav Card */}
        <div className="calc-card" style={{ padding: '16px 12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              className={`nav-item ${activeSubTab === 'profile' ? 'active' : ''}`}
              style={{ color: activeSubTab === 'profile' ? '#FFFFFF' : '#1A241F' }}
              onClick={() => setActiveSubTab('profile')}
            >
              <User size={16} />
              <span>Profile</span>
            </button>
            <button
              className={`nav-item ${activeSubTab === 'language' ? 'active' : ''}`}
              style={{ color: activeSubTab === 'language' ? '#FFFFFF' : '#1A241F' }}
              onClick={() => setActiveSubTab('language')}
            >
              <Languages size={16} />
              <span>{t.settings.language}</span>
            </button>
            <button
              className={`nav-item ${activeSubTab === 'notifications' ? 'active' : ''}`}
              style={{ color: activeSubTab === 'notifications' ? '#FFFFFF' : '#1A241F' }}
              onClick={() => setActiveSubTab('notifications')}
            >
              <Bell size={16} />
              <span>Notifications</span>
            </button>
            <button
              className={`nav-item ${activeSubTab === 'crops' ? 'active' : ''}`}
              style={{ color: activeSubTab === 'crops' ? '#FFFFFF' : '#1A241F' }}
              onClick={() => setActiveSubTab('crops')}
            >
              <Sprout size={16} />
              <span>{t.settings.preferredCrops}</span>
            </button>
            <button
              className={`nav-item ${activeSubTab === 'help' ? 'active' : ''}`}
              style={{ color: activeSubTab === 'help' ? '#FFFFFF' : '#1A241F' }}
              onClick={() => setActiveSubTab('help')}
            >
              <HelpCircle size={16} />
              <span>Help & Support</span>
            </button>
          </div>
        </div>

        {/* Right Content Panel */}
        <div className="calc-card" style={{ padding: '28px' }}>
          {activeSubTab === 'profile' && (
            <div>
              {/* Profile Header matching Screenshot */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 20, borderBottom: '1px solid #DDE5E0', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      backgroundColor: '#113826',
                      color: '#FFFFFF',
                      fontSize: 20,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    CP
                  </div>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: '#113826' }}>Chethan P</h3>
                    <p style={{ fontSize: 12, color: '#5A6A60' }}>chethan@farmer.ai • Karnataka Farmer Account</p>
                    <span
                      style={{
                        display: 'inline-block',
                        backgroundColor: '#E6F7F0',
                        color: '#059669',
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontSize: 10,
                        fontWeight: 700,
                        marginTop: 4
                      }}
                    >
                      Active Farmer
                    </span>
                  </div>
                </div>

                <button
                  className="btn-secondary"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit2 size={13} />
                  <span>{isEditing ? t.settings.save : t.settings.edit}</span>
                </button>
              </div>

              {/* Profile Fields matching Screenshot */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label className="filter-label">{t.settings.name}</label>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1A241F', marginTop: 4 }}>
                    Chethan P
                  </div>
                </div>

                <div>
                  <label className="filter-label">{t.settings.phone}</label>
                  {isEditing ? (
                    <input
                      type="text"
                      className="filter-input"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1A241F', marginTop: 4 }}>
                      {phone}
                    </div>
                  )}
                </div>

                <div>
                  <label className="filter-label">{t.settings.location}</label>
                  {isEditing ? (
                    <input
                      type="text"
                      className="filter-input"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1A241F', marginTop: 4 }}>
                      {location}
                    </div>
                  )}
                </div>

                <div>
                  <label className="filter-label">{t.settings.language}</label>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1A241F', marginTop: 4 }}>
                    English, ಕನ್ನಡ (Kannada)
                  </div>
                </div>
              </div>

              {/* Preferred Crops tags matching Screenshot */}
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #DDE5E0' }}>
                <label className="filter-label">{t.settings.preferredCrops}</label>
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <span
                    style={{
                      backgroundColor: '#FAFDF9',
                      border: '1.5px solid #059669',
                      color: '#059669',
                      padding: '4px 12px',
                      borderRadius: 14,
                      fontSize: 12,
                      fontWeight: 600
                    }}
                  >
                    🍅 Tomato
                  </span>
                  <span
                    style={{
                      backgroundColor: '#FAFDF9',
                      border: '1.5px solid #D97706',
                      color: '#D97706',
                      padding: '4px 12px',
                      borderRadius: 14,
                      fontSize: 12,
                      fontWeight: 600
                    }}
                  >
                    🧅 Onion
                  </span>
                  <span
                    style={{
                      backgroundColor: '#FAFDF9',
                      border: '1.5px solid #2563EB',
                      color: '#2563EB',
                      padding: '4px 12px',
                      borderRadius: 14,
                      fontSize: 12,
                      fontWeight: 600
                    }}
                  >
                    🌾 Paddy
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'language' && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#113826', marginBottom: 12 }}>
                {t.settings.language} Preference
              </h3>
              <p style={{ fontSize: 13, color: '#5A6A60', marginBottom: 20 }}>
                Choose your preferred interface language. All numbers, prices and calculations remain identical.
              </p>

              <div style={{ display: 'flex', gap: 16 }}>
                <div
                  onClick={() => setLang('en')}
                  style={{
                    flex: 1,
                    padding: 20,
                    borderRadius: 10,
                    border: `2px solid ${lang === 'en' ? '#059669' : '#DDE5E0'}`,
                    backgroundColor: lang === 'en' ? '#FAFDF9' : '#FFFFFF',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#113826' }}>English</div>
                  <div style={{ fontSize: 12, color: '#5A6A60', marginTop: 4 }}>Standard English interface</div>
                </div>

                <div
                  onClick={() => setLang('kn')}
                  style={{
                    flex: 1,
                    padding: 20,
                    borderRadius: 10,
                    border: `2px solid ${lang === 'kn' ? '#059669' : '#DDE5E0'}`,
                    backgroundColor: lang === 'kn' ? '#FAFDF9' : '#FFFFFF',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#113826' }}>ಕನ್ನಡ (Kannada)</div>
                  <div style={{ fontSize: 12, color: '#5A6A60', marginTop: 4 }}>ಸಂಪೂರ್ಣ ಕನ್ನಡ ಭಾಷೆ ಬೆಂಬಲ</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
