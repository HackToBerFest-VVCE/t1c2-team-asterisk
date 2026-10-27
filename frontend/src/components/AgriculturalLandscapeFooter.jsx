import React from 'react';

/**
 * AgriculturalLandscapeFooter
 * Reproduces the beautiful rural landscape illustration from the
 * FarmPrice AI Market Comparison Report template:
 * - Layered rolling green hills
 * - Cozy farmhouse and barn silhouettes
 * - Rising morning sun with radiant warmth
 * - Lush green corner foliage
 */
export default function AgriculturalLandscapeFooter({ className = '', style = {} }) {
  return (
    <div
      className={`agricultural-landscape-footer ${className}`}
      style={{
        width: '100%',
        overflow: 'hidden',
        lineHeight: 0,
        position: 'relative',
        marginTop: 'auto',
        ...style
      }}
    >
      <svg
        viewBox="0 0 1000 150"
        preserveAspectRatio="none"
        style={{
          width: '100%',
          height: '100%',
          maxHeight: 130,
          display: 'block'
        }}
      >
        <defs>
          {/* Gradients for Rolling Hills */}
          <linearGradient id="hillDistantGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C6E9D0" />
            <stop offset="100%" stopColor="#A8DCB7" />
          </linearGradient>

          <linearGradient id="hillMidGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5CA875" />
            <stop offset="100%" stopColor="#3E935A" />
          </linearGradient>

          <linearGradient id="hillForeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2D7A49" />
            <stop offset="50%" stopColor="#22663B" />
            <stop offset="100%" stopColor="#174E2C" />
          </linearGradient>

          <linearGradient id="hillFrontWave" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#358553" />
            <stop offset="100%" stopColor="#1E5C34" />
          </linearGradient>

          {/* Morning Sunrise Glow */}
          <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFF275" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#FEE685" stopOpacity="0.75" />
            <stop offset="75%" stopColor="#FDE68A" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FEF9C3" stopOpacity="0" />
          </radialGradient>

          {/* Leaf Gradients */}
          <linearGradient id="leafGradLeft" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#15803D" />
            <stop offset="100%" stopColor="#4ADE80" />
          </linearGradient>
          <linearGradient id="leafGradRight" x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#166534" />
            <stop offset="100%" stopColor="#22C55E" />
          </linearGradient>
        </defs>

        {/* 1. Sunrise on the right horizon */}
        <circle cx="860" cy="85" r="70" fill="url(#sunGlow)" />
        <circle cx="860" cy="85" r="32" fill="#FDE047" opacity="0.9" />

        {/* 2. Distant Soft Green Hill */}
        <path
          d="M0,110 Q280,65 520,95 T1000,75 L1000,150 L0,150 Z"
          fill="url(#hillDistantGrad)"
          opacity="0.8"
        />

        {/* 3. Midground Rolling Hill */}
        <path
          d="M0,125 Q220,78 480,105 T1000,88 L1000,150 L0,150 Z"
          fill="url(#hillMidGrad)"
        />

        {/* 4. Farm Buildings & Trees on Mid Hill (Right side near sunrise) */}
        <g id="farm-settlement" transform="translate(800, 68)">
          {/* Main Farmhouse */}
          <rect x="25" y="16" width="32" height="20" fill="#F0FDF4" rx="1" />
          <polygon points="23,16 41,2 59,16" fill="#1B4D2E" />
          <rect x="36" y="24" width="8" height="12" fill="#143D24" />
          <rect x="28" y="20" width="5" height="5" fill="#FEF08A" />
          <rect x="47" y="20" width="5" height="5" fill="#FEF08A" />

          {/* Small Barn / Silo */}
          <rect x="62" y="19" width="22" height="17" fill="#E2F3E7" rx="1" />
          <polygon points="60,19 73,8 86,19" fill="#15803D" />
          <rect x="68" y="26" width="9" height="10" fill="#164E2D" />

          {/* Stylized Deciduous Trees */}
          <circle cx="14" cy="22" r="10" fill="#2E7D47" />
          <circle cx="10" cy="26" r="8" fill="#1F6335" />
          <rect x="12" y="28" width="3" height="8" fill="#523924" />

          {/* Pine / Cypress Trees */}
          <polygon points="94,36 91,18 97,18" fill="#14532D" />
          <polygon points="94,26 89,12 99,12" fill="#166534" />
          <polygon points="103,36 100,20 106,20" fill="#14532D" />
          <polygon points="103,28 98,14 108,14" fill="#166534" />
        </g>

        {/* Left side stylized trees in distance */}
        <g id="left-trees" transform="translate(140, 92)">
          <circle cx="20" cy="12" r="9" fill="#27673C" />
          <circle cx="34" cy="10" r="11" fill="#1E542F" />
          <circle cx="48" cy="14" r="8" fill="#367F4D" />
        </g>

        {/* 5. Foreground Deep Rich Hill */}
        <path
          d="M0,135 Q260,95 560,120 T1000,105 L1000,150 L0,150 Z"
          fill="url(#hillForeGrad)"
        />

        {/* 6. Front Wave Hill */}
        <path
          d="M0,142 Q340,118 680,138 T1000,122 L1000,150 L0,150 Z"
          fill="url(#hillFrontWave)"
        />

        {/* 7. Sprouting Corner Leaves - Bottom Left */}
        <g id="corner-leaves-left" transform="translate(10, 85)">
          {/* Main Leaf */}
          <path
            d="M 5,60 C 15,35 45,20 70,30 C 60,50 35,62 5,60 Z"
            fill="url(#leafGradLeft)"
            filter="drop-shadow(0 2px 4px rgba(0,0,0,0.15))"
          />
          <path
            d="M 8,57 Q 35,42 66,32"
            stroke="#ECFDF5"
            strokeWidth="1.5"
            fill="none"
            opacity="0.8"
          />

          {/* Secondary Leaf */}
          <path
            d="M 2,62 C 5,42 22,30 42,38 C 35,52 20,60 2,62 Z"
            fill="#166534"
            opacity="0.9"
          />
          <path
            d="M 4,60 Q 20,46 40,40"
            stroke="#A7F3D0"
            strokeWidth="1"
            fill="none"
            opacity="0.7"
          />

          {/* Tertiary Small Bud */}
          <path
            d="M 32,58 C 42,48 55,48 65,55 C 55,62 44,62 32,58 Z"
            fill="#22C55E"
          />
        </g>

        {/* 8. Sprouting Corner Leaves - Bottom Right */}
        <g id="corner-leaves-right" transform="translate(930, 95)">
          <path
            d="M 65,50 C 50,30 20,20 0,35 C 15,50 40,58 65,50 Z"
            fill="url(#leafGradRight)"
            filter="drop-shadow(0 2px 4px rgba(0,0,0,0.15))"
          />
          <path
            d="M 62,48 Q 35,35 4,37"
            stroke="#ECFDF5"
            strokeWidth="1.5"
            fill="none"
            opacity="0.8"
          />
          <path
            d="M 68,52 C 60,38 42,32 25,42 C 38,52 52,58 68,52 Z"
            fill="#15803D"
            opacity="0.9"
          />
        </g>
      </svg>
    </div>
  );
}
