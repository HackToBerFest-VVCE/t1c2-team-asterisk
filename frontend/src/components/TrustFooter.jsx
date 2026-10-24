import React from 'react';
import { Sprout, Cpu, Database, CheckCircle, ShieldCheck } from 'lucide-react';

export default function TrustFooter({ t, dataMode }) {
  const isSample = dataMode === 'LOCAL_DEVELOPMENT_ADAPTER';

  return (
    <footer className="trust-footer">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Sprout size={18} color="#10B981" />
        <span style={{ fontWeight: 700, color: '#FFFFFF', fontSize: 13 }}>
          {t.brand.name}
        </span>
        <span style={{ color: '#8E9F94', fontSize: 11 }}>
          {isSample ? '(Local Curated APMC Adapter)' : '(Connected to Snowflake)'}
        </span>
      </div>

      <div className="trust-badges">
        <div className="trust-item">
          <Cpu size={14} color="#10B981" />
          <span>{t.trust.openSource}</span>
        </div>
        <div className="trust-item">
          <Database size={14} color="#60A5FA" />
          <span>{t.trust.snowflake}</span>
        </div>
        <div className="trust-item">
          <CheckCircle size={14} color="#34D399" />
          <span>{t.trust.realData}</span>
        </div>
        <div className="trust-item">
          <ShieldCheck size={14} color="#FBBF24" />
          <span>{t.trust.transparent}</span>
        </div>
      </div>

      <div style={{ color: '#A3C9B0', fontSize: 11, fontStyle: 'italic' }}>
        {t.trust.footerEmpower}
      </div>
    </footer>
  );
}
