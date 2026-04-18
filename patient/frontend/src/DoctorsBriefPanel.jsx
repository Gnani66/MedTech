import React from 'react';

/* ═══════════════════════════════════════════════════════════
   DoctorsBriefPanel.jsx — Module 2: High-Velocity 5-Second Summary
   Shows: Active Meds, Vitals w/ % change (Amber), AI Notes (Violet)
   ═══════════════════════════════════════════════════════════ */

import { Sparkles as AISpark, Pill as IconPill, Activity as IconActivity, TrendingUp as IconTrendingUp, TrendingDown as IconTrendingDown, AlertTriangle as IconAlertTriangle } from 'lucide-react';

function DoctorsBriefPanel({ records, brief, loading, onGenerate, activeProfile }) {
  // Parse structured data from all records
  const allParsed = records.map(r => {
    try { return JSON.parse(r.extracted_text); }
    catch { return null; }
  }).filter(Boolean);

  // Aggregate active medications
  const activeMeds = [];
  const seen = new Set();
  allParsed.forEach(p => {
    const meds = p.data?.medications || p.medications || [];
    meds.forEach(m => {
      const name = m.name || m;
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        activeMeds.push({ name, dosage: m.dosage || '', purpose: m.purpose || '' });
      }
    });
  });

  // Aggregate vitals with trend comparison (latest vs second-latest)
  const vitalHistory = {};
  [...allParsed].reverse().forEach(p => {
    const labs = p.data?.lab_results || p.lab_results || p.lab_values || [];
    labs.forEach(l => {
      const key = (l.test || l.name || '').toLowerCase();
      if (!key) return;
      if (!vitalHistory[key]) vitalHistory[key] = [];
      const val = parseFloat(l.result ?? l.value ?? 0);
      if (!isNaN(val)) vitalHistory[key].push({ val, unit: l.unit || '' });
    });
  });

  // Build vital trend rows — filter out empty arrays first to prevent crash
  const vitalRows = Object.entries(vitalHistory)
    .filter(([, history]) => history.length > 0)  // ← safety: skip keys with no valid readings
    .slice(0, 5)
    .map(([key, history]) => {
      const latest = history[history.length - 1];
      if (!latest) return null; // extra guard
      const prev = history.length > 1 ? history[history.length - 2] : null;
      let changePct = null;
      if (prev && prev.val != null && prev.val !== 0) {
        changePct = ((latest.val - prev.val) / prev.val * 100).toFixed(1);
      }
      return {
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value: latest.val,
        unit: latest.unit,
        changePct: changePct !== null ? parseFloat(changePct) : null
      };
    })
    .filter(Boolean); // remove any null entries

  // Extract contraindication notes
  const notes = allParsed.map(p => p.notes).filter(Boolean).join(' ');

  if (records.length === 0) return null;

  return (
    <div className="doctors-brief-panel" style={{ marginBottom: '16px' }}>
      <div className="doctors-brief-header">
        <div className="doctors-brief-title">
          <AISpark size={14} strokeWidth={2} />
          Doctor's View
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="ai-badge">AI</span>
          {!brief && (
            <button
              onClick={onGenerate}
              disabled={loading}
              style={{
                background: 'var(--moss-800)', color: 'white',
                border: 'none', borderRadius: 'var(--r-full)',
                padding: '6px 14px', fontSize: '12px', fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
                opacity: loading ? 0.6 : 1,
                transition: 'all var(--t)'
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    width: '10px', height: '10px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white', borderRadius: '50%',
                    display: 'inline-block', animation: 'spin 0.65s linear infinite'
                  }} />
                  Analyzing…
                </span>
              ) : 'Generate Brief'}
            </button>
          )}
          {brief && (
            <button
              onClick={onGenerate}
              disabled={loading}
              style={{
                background: 'transparent', border: '1px solid var(--border)',
                borderRadius: 'var(--r-full)', padding: '5px 12px',
                fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              Refresh
            </button>
          )}
        </div>
      </div>

      <div className="doctors-brief-body">

        {/* ── Patient-Reported Health Profile ── */}
        {(activeProfile?.allergies?.length > 0 || activeProfile?.chronic_conditions?.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            {activeProfile?.allergies?.length > 0 && (
              <div className="brief-section" style={{ marginBottom: 0 }}>
                <div className="brief-section-label" style={{ color: 'var(--amber-700)' }}>
                  <IconAlertTriangle size={13} strokeWidth={2} /> Known Allergies
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                  {activeProfile.allergies.map((item, i) => (
                    <div key={i} style={{ background: 'var(--amber-50)', color: 'var(--amber-800)', border: '1px solid var(--amber-200)', borderRadius: 'var(--r-full)', padding: '2px 8px', fontSize: '11px', fontWeight: 600 }}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {activeProfile?.chronic_conditions?.length > 0 && (
              <div className="brief-section" style={{ marginBottom: 0 }}>
                <div className="brief-section-label" style={{ color: 'var(--moss-700)' }}>
                  <IconActivity size={13} strokeWidth={2} /> Chronic Conditions
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                  {activeProfile.chronic_conditions.map((item, i) => (
                    <div key={i} style={{ background: 'var(--moss-50)', color: 'var(--moss-800)', border: '1px solid var(--moss-200)', borderRadius: 'var(--r-full)', padding: '2px 8px', fontSize: '11px', fontWeight: 600 }}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Active Medications ── */}
        {activeMeds.length > 0 && (
          <div className="brief-section">
            <div className="brief-section-label">
              <IconPill size={13} strokeWidth={2} /> Active Medications ({activeMeds.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
              {activeMeds.map((med, i) => (
                <div key={i} className="brief-med-tag" title={med.purpose}>
                  <IconPill size={13} strokeWidth={2} /> {med.name}
                  {med.dosage && <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>· {med.dosage}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Vitals with % change ── */}
        {vitalRows.length > 0 && (
          <div className="brief-section">
            <div className="brief-section-label">
              <IconActivity size={13} strokeWidth={2} /> Lab Trends
            </div>
            {vitalRows.map((v, i) => (
              <div key={i} className="brief-vital-row">
                <span className="brief-vital-label">{v.name}</span>
                <div className="brief-vital-value">
                  {v.value} {v.unit}
                  {v.changePct !== null && (
                    <span className={
                      Math.abs(v.changePct) < 3 ? 'vital-change-neutral' :
                      v.changePct > 0 ? 'vital-change-up' : 'vital-change-down'
                    } style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {v.changePct > 0 ? <IconTrendingUp size={12} strokeWidth={2} /> : <IconTrendingDown size={12} strokeWidth={2} />} {Math.abs(v.changePct)}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── AI Full Brief (when generated) ── */}
        {brief && (
          <div className="brief-section">
            <div className="brief-section-label">Clinical Summary</div>
            <div style={{
              fontSize: '13px', color: 'var(--text-secondary)',
              lineHeight: 1.72, whiteSpace: 'pre-wrap',
              background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)',
              padding: '12px 14px', marginTop: '6px'
            }}>
              {brief}
            </div>
          </div>
        )}

        {/* ── Contraindication / Clinical Notes ── */}
        {notes && (
          <div className="contraindication-note">
            <strong><IconAlertTriangle size={13} strokeWidth={2} /> Decision Support Note</strong>
            {notes.substring(0, 220)}{notes.length > 220 ? '…' : ''}
          </div>
        )}

      </div>
    </div>
  );
}

export default DoctorsBriefPanel;
