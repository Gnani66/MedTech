import React from 'react';
import { Bell, Check, ExternalLink } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   AlertHistoryPanel.jsx
   Shows recent emergency health alerts sent
   ═══════════════════════════════════════════════════════════ */

export default function AlertHistoryPanel({ alerts, onAcknowledge }) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-xl)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px 14px',
        borderBottom: '1px solid var(--border-soft)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
          <Bell size={14} strokeWidth={2} style={{ color: '#ef4444' }} />
          Emergency Alerts
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
          {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {alerts.slice(0, 5).map((alert) => {
          const d = new Date(alert.sent_at);
          return (
            <div key={alert.id} style={{
              padding: '10px 12px',
              background: alert.acknowledged ? 'var(--bg-subtle)' : 'rgba(239,68,68,0.04)',
              border: `1px solid ${alert.acknowledged ? 'var(--border-soft)' : 'rgba(239,68,68,0.15)'}`,
              borderRadius: 'var(--r-md)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '99px',
                      background: alert.alert_type === 'critical_vitals' ? 'rgba(239,68,68,0.1)' : 'rgba(234,179,8,0.15)',
                      color: alert.alert_type === 'critical_vitals' ? '#ef4444' : '#b45309',
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      {alert.alert_type === 'critical_vitals' ? 'Critical' : 'Warning'}
                    </span>
                    {alert.acknowledged && (
                      <span style={{ fontSize: '10px', color: 'var(--moss-600)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <Check size={10} strokeWidth={3} /> Acknowledged
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '4px' }}>
                    Sent to <strong>{alert.contact_name || 'Emergency Contact'}</strong>
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                    {d.toLocaleDateString('en-IN')} at {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {!alert.acknowledged && onAcknowledge && (
                  <button
                    onClick={() => onAcknowledge(alert.id)}
                    title="Mark as acknowledged"
                    style={{
                      background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
                      padding: '4px 8px', cursor: 'pointer',
                      fontSize: '10px', fontWeight: 600, color: 'var(--moss-600)',
                      whiteSpace: 'nowrap', transition: 'all 0.15s',
                    }}
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
