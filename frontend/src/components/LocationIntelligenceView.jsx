import React, { useState } from 'react';
import {
  MapPin,
  Search,
  Navigation,
  Truck,
  CheckCircle2,
  Info
} from 'lucide-react';

export default function LocationIntelligenceView({ t }) {
  const [query, setQuery] = useState('Hassan, Karnataka');
  const [selectedMandi, setSelectedMandi] = useState('MND_HASSAN');

  const nearbyMandis = [
    {
      id: 'MND_HASSAN',
      name: 'Hassan APMC',
      distanceKm: 12.6,
      duration: '25 min',
      netReturn: 58240,
      isBest: true,
      x: 180,
      y: 200
    },
    {
      id: 'MND_CRPATNA',
      name: 'Channarayapatna',
      distanceKm: 28.4,
      duration: '42 min',
      netReturn: 54810,
      isBest: false,
      x: 320,
      y: 240
    },
    {
      id: 'MND_ARASIKERE',
      name: 'Arasikere APMC',
      distanceKm: 52.1,
      duration: '1 hr 10 min',
      netReturn: 49230,
      isBest: false,
      x: 230,
      y: 90
    },
    {
      id: 'MND_HOLENARASIPURA',
      name: 'Holenarasipura Mandi',
      distanceKm: 50.7,
      duration: '1 hr 5 min',
      netReturn: 47680,
      isBest: false,
      x: 240,
      y: 310
    }
  ];

  const activeMandi = nearbyMandis.find((m) => m.id === selectedMandi) || nearbyMandis[0];

  return (
    <div>
      {/* Title */}
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#113826' }}>
          {t.location.title}
        </h2>
        <p style={{ fontSize: 13, color: '#5A6A60' }}>
          {t.location.subtitle}
        </p>
      </div>

      {/* Location Search Input */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #DDE5E0',
          borderRadius: 10,
          padding: '12px 18px',
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          marginBottom: 20
        }}
      >
        <MapPin size={18} color="#059669" />
        <input
          type="text"
          className="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.location.searchPlaceholder}
        />
        <button className="btn-primary" style={{ padding: '8px 20px' }}>
          <Search size={14} />
          <span>{t.location.search}</span>
        </button>
      </div>

      {/* Map & List Grid matching Screenshot */}
      <div className="location-grid">
        {/* Interactive Simulated Geospatial Map */}
        <div className="map-card">
          <div className="map-canvas-container" style={{ position: 'relative', overflow: 'hidden' }}>
            {/* Styled Map Background */}
            <svg
              viewBox="0 0 500 400"
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #1B3B2B 0%, #224E38 100%)'
              }}
            >
              {/* Satellite Terrain Grid Lines */}
              {[50, 100, 150, 200, 250, 300, 350].map((pos) => (
                <line
                  key={`h-${pos}`}
                  x1="0"
                  y1={pos}
                  x2="500"
                  y2={pos}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="1"
                />
              ))}
              {[50, 100, 150, 200, 250, 300, 350, 400, 450].map((pos) => (
                <line
                  key={`v-${pos}`}
                  x1={pos}
                  y1="0"
                  x2={pos}
                  y2="400"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="1"
                />
              ))}

              {/* Highway Curves */}
              <path
                d="M 50 120 Q 150 180 280 210 T 480 320"
                fill="none"
                stroke="#64748B"
                strokeWidth="4"
                opacity="0.4"
              />
              <path
                d="M 120 380 Q 190 260 250 150 T 360 40"
                fill="none"
                stroke="#64748B"
                strokeWidth="3"
                opacity="0.4"
              />

              {/* Origin Point: Hassan Farm */}
              <circle cx="140" cy="220" r="8" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2.5" />
              <text x="140" y="242" fill="#FFFFFF" fontSize="11" fontWeight="700" textAnchor="middle">
                Your Farm (Hassan)
              </text>

              {/* Road Route to Active Mandi */}
              <path
                d={`M 140 220 Q ${(140 + activeMandi.x) / 2 + 15} ${(220 + activeMandi.y) / 2 - 15} ${activeMandi.x} ${activeMandi.y}`}
                fill="none"
                stroke="#34D399"
                strokeWidth="4"
                strokeLinecap="round"
              />

              {/* Straight line (crow flies) */}
              <line
                x1="140"
                y1="220"
                x2={activeMandi.x}
                y2={activeMandi.y}
                stroke="#FCD34D"
                strokeWidth="2"
                strokeDasharray="4 4"
              />

              {/* Mandi Pins */}
              {nearbyMandis.map((m) => {
                const isSelected = m.id === selectedMandi;
                return (
                  <g
                    key={m.id}
                    onClick={() => setSelectedMandi(m.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      cx={m.x}
                      cy={m.y}
                      r={isSelected ? 10 : 7}
                      fill={m.isBest ? '#10B981' : '#EF4444'}
                      stroke="#FFFFFF"
                      strokeWidth="2.5"
                    />
                    {m.isBest && (
                      <circle
                        cx={m.x}
                        cy={m.y}
                        r="16"
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="1.5"
                        opacity="0.7"
                      />
                    )}
                    <text
                      x={m.x}
                      y={m.y - 14}
                      fill="#FFFFFF"
                      fontSize="10"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {m.name}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Active Mandi Overlay Card matching Screenshot */}
            <div
              style={{
                position: 'absolute',
                top: 20,
                left: 20,
                backgroundColor: 'rgba(255, 255, 255, 0.96)',
                backdropFilter: 'blur(8px)',
                borderRadius: 10,
                padding: '12px 16px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                minWidth: 190
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13, color: '#113826' }}>
                {activeMandi.name}
              </div>
              <div style={{ fontSize: 11, color: '#5A6A60', marginTop: 2 }}>
                {activeMandi.distanceKm} km • {activeMandi.duration}
              </div>
              {activeMandi.isBest && (
                <div
                  style={{
                    backgroundColor: '#10B981',
                    color: '#FFFFFF',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 10,
                    marginTop: 6,
                    display: 'inline-block'
                  }}
                >
                  Best Net Return
                </div>
              )}
            </div>

            {/* Google Maps / OSM watermarks */}
            <div
              style={{
                position: 'absolute',
                bottom: 8,
                left: 10,
                fontSize: 10,
                color: 'rgba(255,255,255,0.6)'
              }}
            >
              Agri-Geospatial Karnataka (APMC Regional Network)
            </div>
          </div>

          {/* Map Footer Legend matching Screenshot */}
          <div
            style={{
              padding: '12px 18px',
              backgroundColor: '#FFFFFF',
              borderTop: '1px solid #DDE5E0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 11,
              color: '#5A6A60'
            }}
          >
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 14, height: 4, backgroundColor: '#34D399', borderRadius: 2 }} />
                <span>{t.location.roadRoute}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 14, height: 2, borderBottom: '2px dashed #FCD34D' }} />
                <span>{t.location.straightLine}</span>
              </div>
            </div>
            <div style={{ fontWeight: 600, color: '#113826' }}>
              Freight Rate: ₹0.85/km/q
            </div>
          </div>
        </div>

        {/* Nearby Mandis List Card matching Screenshot */}
        <div className="calc-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#113826', marginBottom: 14 }}>
            {t.location.nearbyTitle}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {nearbyMandis.map((m) => {
              const isSelected = m.id === selectedMandi;
              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMandi(m.id)}
                  style={{
                    backgroundColor: isSelected ? '#FAFDF9' : '#FFFFFF',
                    border: `1.5px solid ${isSelected ? '#059669' : '#DDE5E0'}`,
                    borderRadius: 8,
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: m.isBest ? '#10B981' : '#9CA3AF'
                      }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1A241F' }}>
                        {m.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#5A6A60', marginTop: 1 }}>
                        {m.distanceKm} km • {m.duration}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: m.isBest ? '#059669' : '#1A241F' }}>
                      ₹ {m.netReturn.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 10, color: '#8E9F94' }}>
                      take-home return
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 18,
              padding: '12px',
              backgroundColor: '#F8FAF8',
              borderRadius: 8,
              fontSize: 11,
              color: '#5A6A60',
              lineHeight: 1.4
            }}
          >
            <Info size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle', color: '#059669' }} />
            Distances reflect audited Karnataka state road transit paths with standard detour curvature applied.
          </div>
        </div>
      </div>
    </div>
  );
}
