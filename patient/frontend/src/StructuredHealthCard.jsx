// src/StructuredHealthCard.jsx
import React from 'react';

export default function StructuredHealthCard({ textData }) {
  if (!textData) return (
    <p style={{
      fontSize: '13px',
      color: 'var(--text-muted)',
      fontFamily: 'var(--font-body)',
      fontStyle: 'italic'
    }}>
      No data available.
    </p>
  );

  let parsedData = null;
  try {
    parsedData = JSON.parse(textData);
  } catch {
    return (
      <p style={{
        whiteSpace: 'pre-wrap',
        fontSize: '13.5px',
        color: 'var(--text-secondary)',
        lineHeight: 1.75,
        fontFamily: 'var(--font-body)'
      }}>
        {textData}
      </p>
    );
  }

  // 🛡️ Safe renderer for nested AI data
  const renderSafeString = (data) => {
    if (!data) return "N/A";
    if (typeof data === 'object') {
      const val = data.value || data.result || '';
      const unit = data.unit || '';
      return `${val} ${unit}`.trim();
    }
    return String(data);
  };

  return (
    <div style={{ marginTop: '4px', fontSize: '14px', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>

      {/* 🩸 1. Lab Values Table */}
      {parsedData.lab_values && parsedData.lab_values.length > 0 && (
        <div style={{ marginBottom: '18px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            marginBottom: '10px'
          }}>
            <span style={{ fontSize: '13px' }}>🩸</span>
            <h5 style={{
              margin: 0,
              color: 'var(--moss-600)',
              textTransform: 'uppercase',
              fontSize: '10.5px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              fontFamily: 'var(--font-body)'
            }}>
              Extracted Lab Results
            </h5>
          </div>
          <div style={{
            overflowX: 'auto',
            borderRadius: '14px',
            border: '1px solid var(--border-soft)',
            boxShadow: 'var(--shadow-xs)'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
              fontFamily: 'var(--font-body)'
            }}>
              <thead>
                <tr style={{ background: 'var(--bg-subtle)' }}>
                  <th style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid var(--border-ghost)',
                    textAlign: 'left',
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.10em',
                    color: 'var(--text-muted)'
                  }}>Test Name</th>
                  <th style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid var(--border-ghost)',
                    textAlign: 'left',
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.10em',
                    color: 'var(--text-muted)'
                  }}>Result</th>
                  <th style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid var(--border-ghost)',
                    textAlign: 'left',
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.10em',
                    color: 'var(--text-muted)'
                  }}>Normal Range</th>
                </tr>
              </thead>
              <tbody>
                {parsedData.lab_values.map((lab, idx) => (
                  <tr key={idx} style={{
                    background: idx % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-subtle)'
                  }}>
                    <td style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid var(--border-ghost)',
                      fontWeight: 600,
                      color: 'var(--text-secondary)'
                    }}>
                      {renderSafeString(lab.test)}
                    </td>
                    <td style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid var(--border-ghost)',
                      fontWeight: 700,
                      color: 'var(--moss-600)'
                    }}>
                      {renderSafeString(lab.result)}
                    </td>
                    <td style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid var(--border-ghost)',
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px'
                    }}>
                      {renderSafeString(lab.range)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 💊 2. Medications List */}
      {parsedData.medications && parsedData.medications.length > 0 && (
        <div style={{ marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px' }}>💊</span>
            <h5 style={{
              margin: 0,
              color: 'var(--moss-600)',
              textTransform: 'uppercase',
              fontSize: '10.5px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              fontFamily: 'var(--font-body)'
            }}>
              Prescribed Medications
            </h5>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {parsedData.medications.map((med, idx) => (
              <div key={idx} style={{
                background: 'var(--moss-50)',
                padding: '7px 14px',
                borderRadius: '9999px',
                border: '1px solid var(--moss-200)',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <strong style={{ color: 'var(--moss-700)', fontWeight: 700 }}>
                  {renderSafeString(med.name)}
                </strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>
                  · {renderSafeString(med.dosage)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 📝 3. Doctor's Notes */}
      {parsedData.notes && (
        <div style={{
          background: 'var(--clay-100)',
          padding: '14px 16px',
          borderRadius: '14px',
          borderLeft: '3px solid var(--clay-500)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '7px' }}>
            <span style={{ fontSize: '13px' }}>📝</span>
            <h5 style={{
              margin: 0,
              color: 'var(--clay-700)',
              fontSize: '10.5px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.10em',
              fontFamily: 'var(--font-body)'
            }}>
              Clinical Notes
            </h5>
          </div>
          <p style={{
            margin: 0,
            fontSize: '13.5px',
            lineHeight: 1.72,
            color: 'var(--bark-600)'
          }}>
            {renderSafeString(parsedData.notes)}
          </p>
        </div>
      )}

    </div>
  );
}