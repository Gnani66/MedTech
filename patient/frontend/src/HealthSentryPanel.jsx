import React from 'react';

/* ═══════════════════════════════════════════════════════════
   HealthSentryPanel.jsx — Module 5: AI Sentry
   Sparklines via inline SVG, Risk Scores, Trend Analysis
   ═══════════════════════════════════════════════════════════ */

const IconShield = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

// Inline SVG Sparkline — draws a clean line chart from data points
function Sparkline({ data, color = '#1B5E4F', width = '100%', height = 40 }) {
  if (!data || data.length < 2) {
    return (
      <div style={{
        height: `${height}px`,
        background: 'var(--bg-subtle)',
        borderRadius: 'var(--r-sm)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '11px', color: 'var(--text-muted)'
      }}>
        Not enough data
      </div>
    );
  }

  const W = 200;
  const H = height;
  const pad = 4;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2);
    const y = H - pad - ((v - min) / range) * (H - pad * 2);
    return `${x},${y}`;
  });

  const lastX = pad + ((data.length - 1) / (data.length - 1)) * (W - pad * 2);
  const lastY = H - pad - ((data[data.length - 1] - min) / range) * (H - pad * 2);

  // Area fill path
  const areaPoints = `${pad},${H} ${points.join(' ')} ${lastX},${H}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width, height, display: 'block' }} preserveAspectRatio="none">
      {/* Area fill */}
      <polygon
        points={areaPoints}
        fill={`${color}18`}
      />
      {/* Line */}
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last data point dot */}
      <circle cx={lastX} cy={lastY} r="3" fill={color} />
    </svg>
  );
}

// Risk Score to class/label/color mapping
function getRiskClass(score) {
  if (!score) return { cls: 'risk-score-low', label: 'Low', icon: '🟢' };
  if (score <= 3) return { cls: 'risk-score-low', label: `${score}/10`, icon: '🟢' };
  if (score <= 6) return { cls: 'risk-score-medium', label: `${score}/10`, icon: '🟡' };
  return { cls: 'risk-score-high', label: `${score}/10`, icon: '🔴' };
}

function getTrendIcon(data) {
  if (!data || data.length < 2) return { icon: '→', cls: 'sentry-trend-neutral', label: 'Stable' };
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  const change = ((last - prev) / (prev || 1)) * 100;
  if (change > 5)  return { icon: '↑', cls: 'sentry-trend-up',      label: `+${change.toFixed(1)}%` };
  if (change < -5) return { icon: '↓', cls: 'sentry-trend-down',    label: `${change.toFixed(1)}%` };
  return           { icon: '→', cls: 'sentry-trend-neutral', label: 'Stable' };
}

function HealthSentryPanel({ records }) {
  if (!records || records.length === 0) return null;

  // Parse all records, extract lab values grouped by test name
  const labHistory = {};
  const riskScores = [];
  const recordDates = [];

  // Process records in chronological order
  const sorted = [...records].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  sorted.forEach(rec => {
    let parsed = null;
    try { parsed = JSON.parse(rec.extracted_text); } catch { return; }
    if (!parsed) return;

    // Collect risk score
    if (parsed.risk_score) riskScores.push({ date: rec.created_at, score: parsed.risk_score, name: rec.file_name });

    // Collect lab values
    const labs = parsed.data?.lab_results || parsed.lab_results || parsed.lab_values || [];
    labs.forEach(l => {
      const key = (l.test || l.name || '').toLowerCase().trim();
      if (!key) return;
      const val = parseFloat(l.result ?? l.value ?? 0);
      if (isNaN(val)) return;
      if (!labHistory[key]) labHistory[key] = { values: [], unit: l.unit || '', displayName: l.test || l.name };
      labHistory[key].values.push(val);
    });
  });

  const trackedMetrics = Object.entries(labHistory)
    .filter(([, v]) => v.values.length >= 1)
    .slice(0, 5);

  // Latest high-risk record
  const highRisk = riskScores.filter(r => r.score >= 7);

  return (
    <div className="sentry-panel">
      <div className="sentry-header">
        <div className="sentry-title">
          <IconShield />
          AI Health Sentry
        </div>
        <span className="ai-badge">AI</span>
      </div>

      <div className="sentry-body">

        {/* ── Risk alerts ── */}
        {highRisk.length > 0 && (
          <div style={{
            background: 'var(--rose-50)', border: '1px solid var(--rose-100)',
            borderLeft: '3px solid var(--rose-500)',
            borderRadius: 'var(--r-md)', padding: '10px 14px',
            marginBottom: '16px', fontSize: '12.5px', color: 'var(--rose-600)'
          }}>
            <div style={{ fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
              ⚠ High-Risk Documents Detected
            </div>
            {highRisk.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                <span>{r.name?.substring(0, 28) || 'Document'}</span>
                <span className={`risk-score-badge ${getRiskClass(r.score).cls}`}>
                  {r.score}/10
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Tracked metrics with sparklines ── */}
        {trackedMetrics.length > 0 ? (
          trackedMetrics.map(([key, metric]) => {
            const trend = getTrendIcon(metric.values);
            const latest = metric.values[metric.values.length - 1];
            return (
              <div key={key} className="sentry-metric">
                <div className="sentry-metric-header">
                  <div>
                    <div className="sentry-metric-name">{metric.displayName || key}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {metric.values.length} reading{metric.values.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="sentry-metric-latest">
                      {latest} <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' }}>{metric.unit}</span>
                    </div>
                    <div style={{ fontSize: '11px', marginTop: '2px' }}>
                      <span className={trend.cls}>{trend.icon} {trend.label}</span>
                    </div>
                  </div>
                </div>
                <div className="sparkline-wrap">
                  <Sparkline
                    data={metric.values}
                    color={trend.cls === 'sentry-trend-up' ? '#E8834A' : '#1B5E4F'}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
            Upload lab reports to track trends here.
          </div>
        )}

        {/* ── Recent risk scores strip ── */}
        {riskScores.length > 0 && (
          <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-ghost)', paddingTop: '14px' }}>
            <div className="brief-section-label" style={{ marginBottom: '8px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Document Risk Scores
            </div>
            {riskScores.map((r, i) => {
              const risk = getRiskClass(r.score);
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '7px 0', borderBottom: '1px solid var(--border-ghost)', fontSize: '12.5px'
                }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.name?.substring(0, 22) || 'Document'}
                  </span>
                  <span className={`risk-score-badge ${risk.cls}`}>{risk.icon} {risk.label}</span>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

export default HealthSentryPanel;
