// src/StructuredHealthCard.jsx — Upgraded for Clinical Intelligence Engine
import React from 'react';

// Risk score badge inline
function RiskScoreBadge({ score }) {
  if (!score) return null;
  const cls = score <= 3 ? 'risk-score-low' : score <= 6 ? 'risk-score-medium' : 'risk-score-high';
  const icon = score <= 3 ? '🟢' : score <= 6 ? '🟡' : '🔴';
  return (
    <span className={`risk-score-badge ${cls}`} title="AI Clinical Risk Score (1-10)">
      {icon} Risk {score}/10
    </span>
  );
}

export default function StructuredHealthCard({ textData }) {
  if (!textData) return (
    <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
      No data available.
    </p>
  );

  let parsedData = null;
  try {
    parsedData = JSON.parse(textData);
  } catch {
    return (
      <p style={{ whiteSpace: 'pre-wrap', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.75 }}>
        {textData}
      </p>
    );
  }

  const renderSafeString = (data) => {
    if (!data) return 'N/A';
    if (typeof data === 'object') {
      const val = data.value || data.result || '';
      const unit = data.unit || '';
      return `${val} ${unit}`.trim();
    }
    return String(data);
  };

  // Normalise lab results from multiple possible schema shapes
  const labs = parsedData.data?.lab_results || parsedData.lab_results || parsedData.lab_values || [];
  const meds = parsedData.data?.medications || parsedData.medications || [];
  const vitals = parsedData.data?.vitals_extraction || parsedData.vitals || null;
  const entities = parsedData.data?.clinical_entities || parsedData.clinical_entities || null;
  const notes = parsedData.notes || parsedData.clinical_notes || null;
  const summary = parsedData.summary || null;
  const category = parsedData.category || null;
  const riskScore = parsedData.risk_score || null;

  return (
    <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>

      {/* Header row: category + risk score */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {category && (
          <span className="badge badge-green">{category}</span>
        )}
        <RiskScoreBadge score={riskScore} />
        {parsedData.is_valid === false && (
          <span className="badge badge-danger">⚠ Not a Medical Document</span>
        )}
      </div>

      {/* AI summary line */}
      {summary && (
        <div style={{
          background: 'var(--violet-50)',
          border: '1px solid var(--violet-200)',
          borderLeft: '3px solid var(--violet-500)',
          borderRadius: 'var(--r-md)',
          padding: '10px 14px',
          marginBottom: '14px',
          fontSize: '13px',
          color: 'var(--violet-700)',
          fontStyle: 'italic',
          lineHeight: 1.65
        }}>
          <span style={{
            display: 'block', fontSize: '9px', fontWeight: 700, letterSpacing: '0.10em',
            textTransform: 'uppercase', color: 'var(--violet-500)', marginBottom: '3px'
          }}>
            ✦ AI Summary
          </span>
          {summary}
        </div>
      )}

      {/* Vitals Extraction — Module 1 new field */}
      {vitals && Object.keys(vitals).length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px' }}>❤️</span>
            <span style={{
              fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.10em', color: 'var(--moss-700)'
            }}>Vitals</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {Object.entries(vitals).map(([k, v]) => (
              <div key={k} style={{
                background: 'var(--mint-bg)', border: '1px solid var(--mint-border)',
                borderRadius: 'var(--r-full)', padding: '4px 12px',
                fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px'
              }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{k}:</span>
                <strong style={{ color: 'var(--moss-800)' }}>{renderSafeString(v)}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clinical Entities — Module 1 new field */}
      {entities && Object.keys(entities).length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px' }}>🏥</span>
            <span style={{
              fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.10em', color: 'var(--moss-700)'
            }}>Clinical Entities</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {Object.entries(entities).filter(([, v]) => v).map(([k, v]) => (
              <div key={k} style={{
                background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-full)', padding: '4px 12px', fontSize: '12px',
                display: 'flex', alignItems: 'center', gap: '5px'
              }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{k.replace(/_/g, ' ')}:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{renderSafeString(v)}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lab Results Table */}
      {labs.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px' }}>🩸</span>
            <span style={{
              fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.10em', color: 'var(--moss-700)'
            }}>Lab Results</span>
          </div>
          <div style={{ overflowX: 'auto', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-subtle)' }}>
                  {['Test', 'Result', 'Normal Range', 'Flag'].map(h => (
                    <th key={h} style={{
                      padding: '8px 12px', borderBottom: '1px solid var(--border-ghost)',
                      textAlign: 'left', fontSize: '10px', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {labs.map((lab, idx) => (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? 'white' : 'var(--bg-subtle)' }}>
                    <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border-ghost)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {renderSafeString(lab.test || lab.name)}
                    </td>
                    <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border-ghost)', fontWeight: 700, color: lab.flag ? 'var(--amber-700)' : 'var(--moss-700)' }}>
                      {renderSafeString(lab.result ?? lab.value)} {lab.unit || ''}
                    </td>
                    <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border-ghost)', color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                      {renderSafeString(lab.normal_range || lab.range || '—')}
                    </td>
                    <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border-ghost)' }}>
                      {lab.flag
                        ? <span className="badge badge-amber">⚠ Abnormal</span>
                        : <span style={{ fontSize: '11px', color: 'var(--moss-600)', fontWeight: 600 }}>✓ Normal</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Medications List */}
      {meds.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px' }}>💊</span>
            <span style={{
              fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.10em', color: 'var(--moss-700)'
            }}>Medications</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
            {meds.map((med, idx) => (
              <div key={idx} style={{
                background: 'var(--moss-50)', padding: '5px 12px',
                borderRadius: 'var(--r-full)', border: '1px solid var(--moss-200)',
                fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '5px'
              }}>
                {med.is_new && (
                  <span style={{ background: 'var(--violet-500)', color: 'white', fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: 'var(--r-full)', letterSpacing: '0.04em' }}>NEW</span>
                )}
                <strong style={{ color: 'var(--moss-800)', fontWeight: 700 }}>
                  {renderSafeString(med.name || med)}
                </strong>
                {med.dosage && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>· {med.dosage}</span>
                )}
                {med.purpose && (
                  <span style={{ color: 'var(--moss-600)', fontSize: '11px' }}>({med.purpose})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clinical Notes */}
      {notes && (
        <div style={{
          background: 'var(--amber-50)', borderRadius: 'var(--r-md)',
          borderLeft: '3px solid var(--amber-500)', padding: '12px 14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px' }}>📝</span>
            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--amber-700)' }}>
              Clinical Notes
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.72, color: 'var(--text-secondary)' }}>
            {renderSafeString(notes)}
          </p>
        </div>
      )}

    </div>
  );
}