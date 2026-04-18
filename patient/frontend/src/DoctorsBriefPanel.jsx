import React, { useState, useEffect } from 'react';

/* ═══════════════════════════════════════════════════════════
   DoctorsBriefPanel.jsx — Module 2: High-Velocity 5-Second Summary
   Shows: Active Meds, Vitals w/ % change (Amber), AI Notes (Violet)
   ═══════════════════════════════════════════════════════════ */

const AISpark = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
  </svg>
);

const IconPill = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/>
    <path d="m8.5 8.5 7 7"/>
  </svg>
);

const IconActivity = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

const IconAlertTriangle = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
    <path d="M12 9v4"/><path d="M12 17h.01"/>
  </svg>
);

function DoctorsBriefPanel({ records, brief, loading, onGenerate }) {
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
          <AISpark />
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

        {/* ── Active Medications ── */}
        {activeMeds.length > 0 && (
          <div className="brief-section">
            <div className="brief-section-label">
              <IconPill /> Active Medications ({activeMeds.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
              {activeMeds.map((med, i) => (
                <div key={i} className="brief-med-tag" title={med.purpose}>
                  💊 {med.name}
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
              <IconActivity /> Lab Trends
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
                    }>
                      {v.changePct > 0 ? '↑' : '↓'} {Math.abs(v.changePct)}%
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
            <strong><IconAlertTriangle /> Decision Support Note</strong>
            {notes.substring(0, 220)}{notes.length > 220 ? '…' : ''}
          </div>
        )}

      </div>
    </div>
  );
}

export default DoctorsBriefPanel;
