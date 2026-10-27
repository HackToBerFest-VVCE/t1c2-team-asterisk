import React, { useState } from 'react';
import {
  X,
  User,
  Sprout,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { loginPublic } from '../services/api';
import BrandLogo from './BrandLogo';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  // Public login fields
  const [farmerName, setFarmerName] = useState('Chethan P');
  const [farmerPhone, setFarmerPhone] = useState('9876543210');
  const [farmerDistrict, setFarmerDistrict] = useState('Hassan');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen) return null;

  async function handlePublicLogin(isGuest = false) {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await loginPublic({
        name: isGuest ? 'Guest Farmer' : farmerName,
        phone: isGuest ? undefined : farmerPhone,
        district: farmerDistrict,
        is_guest: isGuest
      });
      setSuccessMsg(res.message);
      setTimeout(() => {
        onLoginSuccess({
          role: 'public',
          name: res.name,
          district: res.district,
          phone: res.phone,
          token: res.token
        });
        onClose();
      }, 600);
    } catch (err) {
      setError(err.message || 'Public login failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 36, 24, 0.65)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0 20px 40px -10px rgba(17, 56, 38, 0.3)',
          overflow: 'hidden',
          border: '1px solid #DDE5E0'
        }}
      >
        {/* Modal Top Header */}
        <div
          style={{
            backgroundColor: '#113826',
            color: '#FFFFFF',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BrandLogo size={32} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.02em' }}>
                FARMPRICE AI
              </div>
              <div style={{ fontSize: 11, color: '#A7F3D0' }}>
                Farmer Access & Location Profile
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#A7F3D0',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px' }}>
          {/* Notification feedback */}
          {error && (
            <div
              style={{
                marginBottom: 16,
                padding: '12px 14px',
                backgroundColor: '#FEE2E2',
                border: '1px solid #FECACA',
                borderRadius: 8,
                fontSize: 13,
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <div>{error}</div>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                marginBottom: 16,
                padding: '12px 14px',
                backgroundColor: '#E6F7F0',
                border: '1px solid #A7F3D0',
                borderRadius: 8,
                fontSize: 13,
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <div>{successMsg}</div>
            </div>
          )}

          <div>
            <div style={{ fontSize: 13, color: '#5A6A60', marginBottom: 18, lineHeight: 1.5 }}>
              Access live APMC mandi prices, compare market returns, forecast movements, and evaluate weather impacts for your Karnataka farm.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1A241F', marginBottom: 6 }}>
                  Farmer / Citizen Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="#718096" style={{ position: 'absolute', left: 12, top: 12 }} />
                  <input
                    type="text"
                    className="filter-select"
                    style={{ width: '100%', paddingLeft: 38 }}
                    value={farmerName}
                    onChange={(e) => setFarmerName(e.target.value)}
                    placeholder="e.g. Chethan P"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1A241F', marginBottom: 6 }}>
                    Mobile Number
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={16} color="#718096" style={{ position: 'absolute', left: 12, top: 12 }} />
                    <input
                      type="tel"
                      className="filter-select"
                      style={{ width: '100%', paddingLeft: 38 }}
                      value={farmerPhone}
                      onChange={(e) => setFarmerPhone(e.target.value)}
                      placeholder="10-digit mobile"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1A241F', marginBottom: 6 }}>
                    Home District
                  </label>
                  <div style={{ position: 'relative' }}>
                    <MapPin size={16} color="#718096" style={{ position: 'absolute', left: 12, top: 12 }} />
                    <select
                      className="filter-select"
                      style={{ width: '100%', paddingLeft: 38 }}
                      value={farmerDistrict}
                      onChange={(e) => setFarmerDistrict(e.target.value)}
                    >
                      <option value="Hassan">Hassan</option>
                      <option value="Mysore">Mysore</option>
                      <option value="Mandya">Mandya</option>
                      <option value="Kolar">Kolar</option>
                      <option value="Bengaluru Urban">Bengaluru Urban</option>
                      <option value="Belgaum">Belgaum</option>
                      <option value="Tumkur">Tumkur</option>
                      <option value="Shimoga">Shimoga</option>
                      <option value="Chitradurga">Chitradurga</option>
                      <option value="Dharwad">Dharwad</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handlePublicLogin(false)}
                disabled={loading}
                className="hero-cta-btn"
                style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
              >
                <span>{loading ? 'Logging in...' : 'Sign In as Farmer'}</span>
                <ArrowRight size={16} />
              </button>

              <div style={{ textAlign: 'center', marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => handlePublicLogin(true)}
                  disabled={loading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#059669',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Or Continue as Guest Farmer (1-Click Instant)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
