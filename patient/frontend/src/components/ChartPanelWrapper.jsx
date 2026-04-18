import React from 'react';

export default function ChartPanelWrapper({ title, icon: Icon, children, footer }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {Icon && <Icon size={16} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />}
          {title}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        {children}
      </div>
      {footer && (
        <div style={{ borderTop: '1px solid var(--border-ghost)', marginTop: '16px', paddingTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
          {footer}
        </div>
      )}
    </div>
  );
}
