import React, { useState } from 'react';
import {
  MapPin,
  Truck,
  CheckCircle2,
  Info,
  GitCompare,
  Calculator,
  Compass,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Map as MapIcon
} from 'lucide-react';
import GeoapifyMandiMap from './GeoapifyMandiMap';

export default function LocationIntelligenceView({
  t,
  currentLocation,
  onLocationChange,
  onNavigate
}) {
  const [activeMandi, setActiveMandi] = useState(null);

  return (
    <div className="location-view-container" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header Section */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#113826', margin: 0 }}>
              {t?.location?.title || 'Interactive Mandi Map & Geospatial Intelligence'}
            </h2>
            <span
              style={{
                backgroundColor: '#ECFDF5',
                color: '#059669',
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 12,
                border: '1px solid #A7F3D0'
              }}
            >
              Geoapify Maps
            </span>
          </div>
          <p style={{ fontSize: 13, color: '#5A6A60', marginTop: 4, maxWidth: 720 }}>
            {t?.location?.subtitle ||
              'Explore mandi locations across Karnataka with interactive Leaflet & Geoapify map tiles. Click any market pin to inspect live crop prices, calculate freight distances, and locate your farm position.'}
          </p>
        </div>

        {/* Quick Cross-Navigation Shortcuts */}
        {onNavigate && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => onNavigate('smart-mandi')}
              className="btn-secondary"
              style={{
                padding: '8px 14px',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                borderRadius: 8
              }}
              title="Compare all mandis with net return ranking"
            >
              <GitCompare size={14} color="#059669" />
              <span>Smart Mandi Comparison</span>
            </button>
            <button
              onClick={() => onNavigate('calculator')}
              className="btn-secondary"
              style={{
                padding: '8px 14px',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                borderRadius: 8
              }}
              title="Calculate take-home profit & transport costs"
            >
              <Calculator size={14} color="#059669" />
              <span>Net Return Calculator</span>
            </button>
          </div>
        )}
      </div>

      {/* Primary Interactive Geoapify Maps Component */}
      <GeoapifyMandiMap
        onSelectMandi={(mandi) => setActiveMandi(mandi)}
        onNavigateToCalculator={(mandi) => {
          if (onNavigate) onNavigate('calculator');
        }}
        userLocation={currentLocation}
        onUserLocationChange={onLocationChange}
        t={t}
      />

      {/* Supplementary Agricultural Logistics & Freight Rates Card */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 14,
          marginTop: 6
        }}
      >
        {/* Freight & Road Detour Methodology */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #DDE5E0',
            borderRadius: 10,
            padding: '16px 18px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Truck size={17} color="#059669" />
            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#113826', margin: 0 }}>
              Regional Freight & Detour Modeling
            </h4>
          </div>
          <p style={{ fontSize: 12, color: '#5A6A60', lineHeight: 1.5, margin: 0 }}>
            Road distances apply a verified <strong>1.25x road curvature factor</strong> over straight-line Haversine coordinates to accurately match Karnataka State Highway and rural road network geography. Regional freight is modeled at <strong>₹0.85/km/quintal</strong>.
          </p>
        </div>

        {/* Agmarknet Multi-Crop Price Verification */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #DDE5E0',
            borderRadius: 10,
            padding: '16px 18px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <CheckCircle2 size={17} color="#059669" />
            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#113826', margin: 0 }}>
              Verified Agmarknet Mandi Dataset
            </h4>
          </div>
          <p style={{ fontSize: 12, color: '#5A6A60', lineHeight: 1.5, margin: 0 }}>
            Includes <strong>35 verified APMC mandis across 24 Karnataka districts</strong>. Crop prices reflect daily auction modal prices ingested from the Directorate of Marketing & Inspection (DMI) and Karnataka State Agricultural Marketing Board.
          </p>
        </div>

        {/* Location Privacy & Browser Permission */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #DDE5E0',
            borderRadius: 10,
            padding: '16px 18px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Compass size={17} color="#059669" />
            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#113826', margin: 0 }}>
              Location Services & Privacy
            </h4>
          </div>
          <p style={{ fontSize: 12, color: '#5A6A60', lineHeight: 1.5, margin: 0 }}>
            GPS position is only accessed with your explicit browser permission. Farm coordinates are processed client-side to calculate road transit and highlight closest APMC markets without transmitting your precise home coordinates.
          </p>
        </div>
      </div>
    </div>
  );
}
