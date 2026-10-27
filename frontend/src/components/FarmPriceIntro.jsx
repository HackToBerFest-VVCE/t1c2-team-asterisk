import React, { useState, useEffect } from 'react';

/**
 * FarmPriceIntro — Cinematic Opening Animation
 * 
 * Phases:
 * Phase 1 (0.0s – 0.6s): Atmospheric ivory, warm gold & forest green background glow.
 * Phase 2 (0.6s – 1.6s): Reveal exact official logo with gentle scale and emerald aura.
 * Phase 3 (1.4s – 2.2s): Reveal brand statement: "Predict • Compare • Get Better Prices".
 * Phase 4 (2.0s – 2.8s): Readiness check & smooth crossfade into application.
 */
export default function FarmPriceIntro({ onComplete, isAppReady = true, forcePlay = false }) {
  const [phase, setPhase] = useState(1);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Check if user has already seen the intro in this session (unless forcePlay is requested)
    const hasSeenIntro = sessionStorage.getItem('farmprice_intro_seen');
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!forcePlay && (hasSeenIntro || prefersReducedMotion)) {
      onComplete?.();
      return;
    }

    // Phase progression timers
    const tPhase2 = setTimeout(() => setPhase(2), 550);
    const tPhase3 = setTimeout(() => setPhase(3), 1350);
    const tPhase4 = setTimeout(() => setPhase(4), 2100);

    // Fade out and complete
    const tExit = setTimeout(() => {
      setIsExiting(true);
    }, 2600);

    const tFinish = setTimeout(() => {
      sessionStorage.setItem('farmprice_intro_seen', 'true');
      onComplete?.();
    }, 3000);

    // Escape or Space key listener to skip instantly
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        handleSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(tPhase2);
      clearTimeout(tPhase3);
      clearTimeout(tPhase4);
      clearTimeout(tExit);
      clearTimeout(tFinish);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [forcePlay, onComplete]);

  const handleSkip = () => {
    setIsExiting(true);
    sessionStorage.setItem('farmprice_intro_seen', 'true');
    setTimeout(() => {
      onComplete?.();
    }, 200);
  };

  return (
    <div
      className="farmprice-intro-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: '#FCFDFB',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        transition: 'opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
        opacity: isExiting ? 0 : 1,
        transform: isExiting ? 'scale(1.02)' : 'scale(1)',
        pointerEvents: isExiting ? 'none' : 'auto'
      }}
      aria-label="FARMPRICE AI Intro Animation"
    >
      {/* Phase 1: Atmospheric Background Gradient & Warm Sunlight Glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 45%, rgba(245, 158, 11, 0.09) 0%, rgba(16, 185, 129, 0.07) 35%, rgba(17, 56, 38, 0.04) 70%, #FCFDFB 100%)',
          pointerEvents: 'none'
        }}
      />

      {/* Decorative Subtle Ambient Rings */}
      <div
        style={{
          position: 'absolute',
          width: 'min(90vw, 540px)',
          height: 'min(90vw, 540px)',
          borderRadius: '50%',
          border: '1px solid rgba(16, 185, 129, 0.12)',
          boxShadow: '0 0 80px rgba(5, 150, 105, 0.08)',
          pointerEvents: 'none',
          animation: 'farmpricePulse 3s ease-in-out infinite'
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 'min(70vw, 420px)',
          height: 'min(70vw, 420px)',
          borderRadius: '50%',
          border: '1px solid rgba(245, 158, 11, 0.10)',
          pointerEvents: 'none'
        }}
      />

      {/* Skip Button Top-Right */}
      <button
        onClick={handleSkip}
        style={{
          position: 'absolute',
          top: 24,
          right: 24,
          zIndex: 10,
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid #DDE5E0',
          borderRadius: 20,
          padding: '6px 14px',
          fontSize: 12,
          fontWeight: 600,
          color: '#5A6A60',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
          transition: 'all 0.2s ease'
        }}
        title="Skip intro animation (Esc)"
      >
        <span>Skip Intro</span>
        <kbd
          style={{
            fontSize: 10,
            padding: '1px 5px',
            borderRadius: 4,
            backgroundColor: '#F3F4F6',
            color: '#6B7280',
            border: '1px solid #E5E7EB'
          }}
        >
          Esc
        </kbd>
      </button>

      {/* Main Content Area */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '20px',
          maxWidth: 480,
          zIndex: 2
        }}
      >
        {/* Phase 2: Logo Reveal with Emerald/Golden Aura */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
            opacity: phase >= 2 ? 1 : 0,
            transform: phase >= 2 ? 'scale(1) translateY(0)' : 'scale(0.88) translateY(14px)'
          }}
        >
          {/* Soft Glow Underlay */}
          <div
            style={{
              position: 'absolute',
              width: 190,
              height: 190,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(16, 185, 129, 0.24) 0%, rgba(245, 158, 11, 0.15) 50%, transparent 75%)',
              filter: 'blur(20px)',
              pointerEvents: 'none',
              transform: 'scale(1.2)'
            }}
          />

          {/* Exact Uploaded Official Logo */}
          <img
            src="/assets/farmprice-ai-logo.png"
            alt="FARMPRICE AI — Agricultural Market Intelligence"
            style={{
              width: 'min(55vw, 190px)',
              height: 'min(55vw, 190px)',
              objectFit: 'contain',
              display: 'block',
              position: 'relative',
              filter: 'drop-shadow(0 12px 24px rgba(17, 56, 38, 0.12))'
            }}
          />
        </div>

        {/* Phase 3: Brand Statement & Tagline */}
        <div
          style={{
            marginTop: 24,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            opacity: phase >= 3 ? 1 : 0,
            transform: phase >= 3 ? 'translateY(0)' : 'translateY(16px)'
          }}
        >
          {/* Main Statement */}
          <div
            style={{
              fontSize: 'clamp(16px, 4.5vw, 20px)',
              fontWeight: 800,
              color: '#113826',
              letterSpacing: '-0.01em',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}
          >
            <span>Predict</span>
            <span style={{ color: '#059669', fontSize: 14 }}>•</span>
            <span>Compare</span>
            <span style={{ color: '#059669', fontSize: 14 }}>•</span>
            <span style={{ color: '#059669' }}>Get Better Prices</span>
          </div>

          {/* Subtitle Badge */}
          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              fontWeight: 600,
              color: '#5A6A60',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span style={{ color: '#D97706' }}>🌾</span>
            <span>FARMPRICE AI • Agricultural Market Intelligence</span>
          </div>
        </div>

        {/* Phase 4: Initialization / Progress Indicator */}
        <div
          style={{
            marginTop: 28,
            transition: 'all 0.6s ease',
            opacity: phase >= 4 ? 1 : 0,
            transform: phase >= 4 ? 'translateY(0)' : 'translateY(8px)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 14px',
            backgroundColor: 'rgba(230, 247, 240, 0.7)',
            borderRadius: 20,
            border: '1px solid #A7F3D0'
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#059669',
              display: 'inline-block',
              animation: 'farmpricePulse 1.2s infinite ease-in-out'
            }}
          />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#065F46' }}>
            {isAppReady ? 'Market Intelligence Engine Ready' : 'Connecting to AGMARKNET & Snowflake...'}
          </span>
        </div>
      </div>

      {/* Inline styles for pulse animations */}
      <style>{`
        @keyframes farmpricePulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
