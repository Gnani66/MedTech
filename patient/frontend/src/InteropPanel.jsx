import React from 'react';
import { Rss, CopySlash as Link, CheckCircle2 } from 'lucide-react';

export default function InteropPanel() {
  const connectedSystems = [
    { name: 'Epic MyChart', status: 'Active', synced: '2h ago' },
    { name: 'Apple Health', status: 'Active', synced: '4m ago' },
    { name: 'Regional HIE', status: 'Pending', synced: '-' }
  ];

  return (
    <div className="sentry-panel" style={{ marginTop: '24px' }}>
      <div className="sentry-header" style={{ borderBottom: '1px solid var(--border-ghost)', paddingBottom: '12px' }}>
        <div className="sentry-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Rss size={16} strokeWidth={2} style={{ color: 'var(--amber-600)' }} />
          Network Interoperability
        </div>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>FHIR R4</span>
      </div>
      
      <div className="sentry-body" style={{ padding: '16px 0 0 0' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
          Your data is automatically synchronized across partner health systems to prevent redundant forms and clinical gaps.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {connectedSystems.map((sys, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-canvas)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link size={14} style={{ color: sys.status === 'Active' ? 'var(--moss-600)' : 'var(--text-muted)' }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{sys.name}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', color: sys.status === 'Active' ? 'var(--moss-600)' : 'var(--amber-600)' }}>
                  {sys.status === 'Active' && <CheckCircle2 size={12} />}
                  {sys.status}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Sync: {sys.synced}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
