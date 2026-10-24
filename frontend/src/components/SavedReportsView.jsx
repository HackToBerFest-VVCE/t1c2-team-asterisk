import React, { useState } from 'react';
import {
  FileText,
  Download,
  Bell,
  CheckCircle,
  Calendar,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { downloadReport } from '../services/api';

export default function SavedReportsView({ t }) {
  const [activeTab, setActiveTab] = useState('reports');
  const [alerts, setAlerts] = useState([
    {
      id: 'ALT_1',
      crop: 'Tomato (Hybrid)',
      condition: 'Alert when price > ₹ 2,200 / q',
      mandi: 'Hassan APMC',
      active: true
    },
    {
      id: 'ALT_2',
      crop: 'Onion (Medium)',
      condition: 'Alert when price > ₹ 2,500 / q',
      mandi: 'Mysore Mandi',
      active: false
    }
  ]);

  const savedReports = [
    {
      id: 'REP_1',
      title: 'Tomato — Hassan APMC',
      date: '28 Oct 2026',
      type: 'Net Return Report',
      cropId: 'CROP_TOMATO'
    },
    {
      id: 'REP_2',
      title: 'Onion — Mysore Mandi',
      date: '24 Oct 2026',
      type: 'Market Comparison',
      cropId: 'CROP_ONION'
    },
    {
      id: 'REP_3',
      title: 'Paddy — Channarayapatna',
      date: '15 Oct 2026',
      type: 'Price Trend',
      cropId: 'CROP_PADDY'
    }
  ];

  const toggleAlert = (id) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a))
    );
  };

  return (
    <div>
      {/* Title */}
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#113826' }}>
          {t.savedReports.title}
        </h2>
      </div>

      {/* Tabs matching Screenshot */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button
          className={`pill-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          {t.savedReports.savedReportsTab}
        </button>
        <button
          className={`pill-btn ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          {t.savedReports.priceAlertsTab}
        </button>
      </div>

      {/* Tab 1: Saved Reports List */}
      {activeTab === 'reports' && (
        <div className="calc-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#113826', marginBottom: 16 }}>
            Generated Comparison & Return Reports
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {savedReports.map((r) => (
              <div
                key={r.id}
                style={{
                  backgroundColor: '#FAFDF9',
                  border: '1px solid #DDE5E0',
                  borderRadius: 10,
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      backgroundColor: '#E6F7F0',
                      color: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <FileText size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1A241F' }}>
                      {r.title}
                    </div>
                    <div style={{ fontSize: 11, color: '#5A6A60', marginTop: 2 }}>
                      {r.date} • {r.type}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn-secondary"
                    style={{ fontSize: 12, padding: '6px 12px' }}
                    onClick={() => downloadReport('csv', { crop_id: r.cropId, quantity: 50, unit: 'quintals' })}
                  >
                    <Download size={13} />
                    <span>CSV</span>
                  </button>
                  <button
                    className="btn-primary"
                    style={{ fontSize: 12, padding: '6px 12px' }}
                    onClick={() => downloadReport('pdf', { crop_id: r.cropId, quantity: 50, unit: 'quintals' })}
                  >
                    <Download size={13} />
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Price Alerts */}
      {activeTab === 'alerts' && (
        <div className="calc-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#113826' }}>
              Price Movement Alerts
            </div>
            <div style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>
              {t.savedReports.enableAlerts}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {alerts.map((a) => (
              <div
                key={a.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #DDE5E0',
                  borderRadius: 10,
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      backgroundColor: a.active ? '#E6F7F0' : '#F3F4F6',
                      color: a.active ? '#059669' : '#9CA3AF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Bell size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1A241F' }}>
                      {a.crop}
                    </div>
                    <div style={{ fontSize: 12, color: '#5A6A60', marginTop: 1 }}>
                      {a.condition} ({a.mandi})
                    </div>
                  </div>
                </div>

                {/* Toggle Switch */}
                <div
                  onClick={() => toggleAlert(a.id)}
                  style={{
                    width: 44,
                    height: 24,
                    backgroundColor: a.active ? '#059669' : '#D1D5DB',
                    borderRadius: 12,
                    padding: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      backgroundColor: '#FFFFFF',
                      borderRadius: '50%',
                      transform: a.active ? 'translateX(20px)' : 'translateX(0px)',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
