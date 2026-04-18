import React from 'react';
import { Shield as IconShield, TrendingUp as TrendUp, TrendingDown as TrendDown, Minus as TrendFlat, Activity } from 'lucide-react';
import ChartPanelWrapper from './components/ChartPanelWrapper';
import Sparkline from './components/Sparkline';
import DonutChart from './components/DonutChart';

/* ═══════════════════════════════════════════════════════════
   HealthSentryPanel.jsx — Module 5: AI Sentry
   Recharts Health Score + Lab Analytics
   ═══════════════════════════════════════════════════════════ */

const RiskDot = ({ color }) => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill={color}>
    <circle cx="12" cy="12" r="10" />
  </svg>
);

function getTrendIcon(data) {
  if (!data || data.length < 2) return { icon: <TrendFlat size={12} strokeWidth={2} />, cls: 'sentry-trend-neutral', label: 'Stable' };
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  const change = ((last - prev) / (prev || 1)) * 100;
  if (change > 5)  return { icon: <TrendUp size={12} strokeWidth={2} />, cls: 'sentry-trend-up',      label: `+${change.toFixed(1)}%` };
  if (change < -5) return { icon: <TrendDown size={12} strokeWidth={2} />, cls: 'sentry-trend-down',    label: `${change.toFixed(1)}%` };
  return           { icon: <TrendFlat size={12} strokeWidth={2} />, cls: 'sentry-trend-neutral', label: 'Stable' };
}

export default function HealthSentryPanel({ records }) {
  if (!records || records.length === 0) return null;

  const labHistory = {};
  const riskScores = [];

  const sorted = [...records].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  sorted.forEach(rec => {
    let parsed = null;
    try { parsed = JSON.parse(rec.extracted_text); } catch { return; }
    if (!parsed) return;

    if (parsed.risk_score) riskScores.push({ date: rec.created_at, score: parsed.risk_score, name: rec.file_name });

    const labs = parsed.data?.lab_results || parsed.lab_results || parsed.lab_values || [];
    labs.forEach(l => {
      const key = (l.test || l.name || '').toLowerCase().trim();
      if (!key) return;
      const val = parseFloat(l.result ?? l.value ?? 0);
      if (isNaN(val)) return;
      if (!labHistory[key]) labHistory[key] = { values: [], objects: [], unit: l.unit || '', displayName: l.test || l.name };
      labHistory[key].values.push(val);
      labHistory[key].objects.push({ value: val });
    });
  });

  const trackedMetrics = Object.entries(labHistory)
    .filter(([, v]) => v.values.length >= 2)
    .slice(0, 3);

  const latestRisk = riskScores.length > 0 ? riskScores[riskScores.length - 1].score : 5;
  const healthScore = Math.max(0, Math.min(100, 100 - (latestRisk * 8))); // Example mapping: Risk 5 = 60, Risk 1 = 92
  
  const donutData = [
    { name: 'Score', value: healthScore, color: 'var(--moss-800)' },
    { name: 'Deficit', value: 100 - healthScore, color: 'var(--bg-subtle)' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ── Health Score Panel ── */}
      <ChartPanelWrapper
        title="Clinical Health Score"
        icon={IconShield}
        footer={`Derived from ${records.length} documents. Risk factors detected: ${latestRisk >= 5 ? 'Elevated' : 'Low'}`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <DonutChart data={donutData} height={160} centerText={`${healthScore}`} centerSub="out of 100" />
          
          <div style={{ width: '100%', marginTop: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Core Drivers</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', borderBottom: '1px solid var(--border-ghost)' }}>
               <span>Document Risk Index</span>
               <span style={{ fontWeight: 600, color: latestRisk >= 7 ? 'var(--amber-600)' : 'var(--text-primary)' }}>{latestRisk}/10</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', borderBottom: '1px solid var(--border-ghost)' }}>
               <span>Tracked Labs</span>
               <span style={{ fontWeight: 600 }}>{Object.keys(labHistory).length} metrics</span>
            </div>
          </div>
        </div>
      </ChartPanelWrapper>

      {/* ── Labs Tracking Panel ── */}
      {trackedMetrics.length > 0 && (
        <ChartPanelWrapper
          title="Longitudinal Lab Analytics"
          icon={Activity}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {trackedMetrics.map(([key, metric]) => {
              const trend = getTrendIcon(metric.values);
              const latest = metric.values[metric.values.length - 1];
              return (
                <div key={key} style={{ padding: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{metric.displayName || key}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{metric.values.length} historical readings</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{latest} <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' }}>{metric.unit}</span></div>
                      <div style={{ fontSize: '11px' }} className={trend.cls}>{trend.icon} {trend.label}</div>
                    </div>
                  </div>
                  <Sparkline data={metric.objects} color={trend.cls === 'sentry-trend-down' ? 'var(--moss-600)' : 'var(--amber-600)'} height={32} />
                </div>
              );
            })}
          </div>
        </ChartPanelWrapper>
      )}

    </div>
  );
}
