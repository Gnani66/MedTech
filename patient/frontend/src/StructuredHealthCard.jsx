import React from 'react';
import { AlertCircle as IconAlert, CheckCircle2 as IconCheck, Activity as IconHeart, Building2 as IconHospital, Droplet as IconBlood, Pill as IconPill, Sparkles as IconSpark, Phone as IconPhone, MapPin as IconPin, Stethoscope as IconDoctor, Calendar as IconCalendar, FileText as IconFile } from 'lucide-react';

const RiskDot = ({ color }) => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill={color}>
    <circle cx="12" cy="12" r="10" />
  </svg>
);

function RiskScoreBadge({ score }) {
  if (!score) return null;
  const cls = score <= 3 ? 'risk-score-low' : score <= 6 ? 'risk-score-medium' : 'risk-score-high';
  const icon = score <= 3 ? <RiskDot color="var(--moss-600)" /> : score <= 6 ? <RiskDot color="var(--amber-600)" /> : <RiskDot color="var(--rose-600)" />;
  return (
    <span className={`risk-score-badge ${cls}`} title="AI Clinical Risk Score (1-10)" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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

  // Normalise fields from multiple possible schema shapes
  const labs = parsedData.data?.lab_results || parsedData.lab_results || parsedData.lab_values || [];
  const meds = parsedData.data?.medications || parsedData.medications || [];
  const vitals = parsedData.data?.vitals_extraction || parsedData.vitals || null;
  const entities = parsedData.data?.clinical_entities || parsedData.clinical_entities || null;
  const notes = parsedData.notes || parsedData.clinical_notes || null;
  const summary = parsedData.summary || null;
  const category = parsedData.category || null;
  const riskScore = parsedData.risk_score || null;

  // Extract hospital/doctor info (support both old and new schema)
  const hospitalName = entities?.hospital_name || entities?.clinic_name || null;
  const hospitalPhone = entities?.hospital_phone || null;
  const hospitalAddress = entities?.hospital_address || null;
  const doctorName = entities?.doctor_name || null;
  const doctorReg = entities?.doctor_registration || null;
  const diagnosis = entities?.diagnosis || null;
  const visitReason = entities?.visit_reason || null;
  const dateOfVisit = entities?.date_of_visit || null;
  const treatmentFrom = entities?.treatment_from || null;
  const treatmentTo = entities?.treatment_to || null;
  const advice = entities?.advice || null;

  const hasHospitalInfo = hospitalName || doctorName || diagnosis;

  return (
    <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>

      {/* ── Hospital / Doctor Header Banner ── */}
      {hasHospitalInfo && (
        <div style={{
          background: 'var(--moss-800)',
          borderRadius: 'var(--r-lg)',
          padding: '18px 20px',
          marginBottom: '14px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse 320px 200px at 10% -20%, rgba(93,112,82,0.5) 0%, transparent 60%)',
            pointerEvents: 'none'
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Hospital Name + Category + Risk */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconHospital size={16} strokeWidth={2} style={{ color: 'var(--moss-300)', flexShrink: 0 }} />
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#FDFCF8', letterSpacing: '-0.01em' }}>
                  {hospitalName || 'Medical Record'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                {category && (
                  <span style={{
                    background: 'rgba(253,252,248,0.12)', border: '1px solid rgba(253,252,248,0.2)',
                    color: 'rgba(253,252,248,0.85)', padding: '2px 10px', borderRadius: 'var(--r-full)',
                    fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em'
                  }}>{category}</span>
                )}
                {riskScore > 0 && (
                  <span style={{
                    background: riskScore <= 3 ? 'rgba(93,112,82,0.3)' : riskScore <= 6 ? 'rgba(193,140,93,0.3)' : 'rgba(200,80,80,0.3)',
                    border: `1px solid ${riskScore <= 3 ? 'rgba(93,112,82,0.5)' : riskScore <= 6 ? 'rgba(193,140,93,0.5)' : 'rgba(200,80,80,0.5)'}`,
                    color: '#FDFCF8', padding: '2px 10px', borderRadius: 'var(--r-full)',
                    fontSize: '10px', fontWeight: 700
                  }}>Risk {riskScore}/10</span>
                )}
              </div>
            </div>

            {/* Hospital Contact */}
            {(hospitalPhone || hospitalAddress) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '10px', fontSize: '11.5px', color: 'rgba(253,252,248,0.5)' }}>
                {hospitalPhone && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <IconPhone size={11} strokeWidth={2} /> {hospitalPhone}
                  </span>
                )}
                {hospitalAddress && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <IconPin size={11} strokeWidth={2} /> {hospitalAddress}
                  </span>
                )}
              </div>
            )}

            <div style={{ borderTop: '1px solid rgba(253,252,248,0.1)', paddingTop: '10px' }} />

            {/* Doctor + Diagnosis Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              {doctorName && (
                <div>
                  <div style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(253,252,248,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' }}>
                    Attending Physician
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#FDFCF8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <IconDoctor size={13} strokeWidth={2} style={{ color: 'var(--moss-300)' }} />
                    {doctorName}
                  </div>
                  {doctorReg && (
                    <div style={{ fontSize: '10.5px', color: 'rgba(253,252,248,0.4)', marginTop: '2px' }}>{doctorReg}</div>
                  )}
                </div>
              )}
              {diagnosis && (
                <div>
                  <div style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(253,252,248,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' }}>Diagnosis</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--amber-300)' }}>{diagnosis}</div>
                </div>
              )}
              {visitReason && (
                <div>
                  <div style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(253,252,248,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' }}>Visit Type</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(253,252,248,0.75)' }}>{visitReason}</div>
                </div>
              )}
              {(treatmentFrom || treatmentTo || dateOfVisit) && (
                <div>
                  <div style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(253,252,248,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' }}>
                    {treatmentFrom && treatmentTo ? 'Treatment Period' : 'Visit Date'}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(253,252,248,0.75)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <IconCalendar size={12} strokeWidth={2} style={{ color: 'var(--moss-300)' }} />
                    {treatmentFrom && treatmentTo ? `${treatmentFrom} → ${treatmentTo}` : dateOfVisit || '—'}
                  </div>
                </div>
              )}
            </div>

            {/* Advice */}
            {advice && (
              <div style={{
                marginTop: '10px', padding: '8px 12px',
                background: 'rgba(253,252,248,0.08)', border: '1px solid rgba(253,252,248,0.12)',
                borderRadius: 'var(--r-md)', fontSize: '12px', color: 'rgba(253,252,248,0.7)',
                display: 'flex', alignItems: 'flex-start', gap: '6px'
              }}>
                <IconFile size={13} strokeWidth={2} style={{ color: 'var(--moss-300)', flexShrink: 0, marginTop: '1px' }} />
                <span><strong style={{ color: 'rgba(253,252,248,0.9)' }}>Advice:</strong> {advice}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fallback header if no hospital info */}
      {!hasHospitalInfo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {category && <span className="badge badge-green">{category}</span>}
          <RiskScoreBadge score={riskScore} />
          {parsedData.is_valid === false && (
            <span className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <IconAlert size={12} strokeWidth={2.5} /> Not a Medical Document
            </span>
          )}
        </div>
      )}

      {hasHospitalInfo && parsedData.is_valid === false && (
        <div style={{ marginBottom: '12px' }}>
          <span className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <IconAlert size={12} strokeWidth={2.5} /> Not a Medical Document
          </span>
        </div>
      )}

      {/* AI Summary */}
      {summary && (
        <div style={{
          background: 'var(--violet-50)', border: '1px solid var(--violet-200)',
          borderLeft: '3px solid var(--violet-500)', borderRadius: 'var(--r-md)',
          padding: '10px 14px', marginBottom: '14px', fontSize: '13px',
          color: 'var(--violet-700)', fontStyle: 'italic', lineHeight: 1.65
        }}>
          <span style={{
            display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px', fontWeight: 700,
            letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--violet-500)', marginBottom: '3px'
          }}>
            <IconSpark size={10} strokeWidth={2} /> AI Summary
          </span>
          {summary}
        </div>
      )}

      {/* Patient Name */}
      {parsedData.patient_name && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px', padding: '8px 12px', background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-ghost)' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Patient:</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{parsedData.patient_name}</span>
          {parsedData.date && (
            <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)' }}>
              <IconCalendar size={11} strokeWidth={2} style={{ marginRight: '3px' }} />{parsedData.date}
            </span>
          )}
        </div>
      )}

      {/* Vitals */}
      {vitals && Object.keys(vitals).filter(k => vitals[k]).length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <IconHeart size={12} strokeWidth={2} />
            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--moss-700)' }}>Vitals</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {Object.entries(vitals).filter(([, v]) => v).map(([k, v]) => (
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

      {/* Lab Results */}
      {labs.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <IconBlood size={12} strokeWidth={2} />
            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--moss-700)' }}>Lab Results</span>
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
                        ? <span className="badge badge-amber" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><IconAlert size={12} strokeWidth={2.5} /> Abnormal</span>
                        : <span style={{ fontSize: '11px', color: 'var(--moss-600)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><IconCheck size={12} strokeWidth={3} /> Normal</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Medications */}
      {meds.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <IconPill size={12} strokeWidth={2} />
            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--moss-700)' }}>Medications</span>
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
                <strong style={{ color: 'var(--moss-800)', fontWeight: 700 }}>{renderSafeString(med.name || med)}</strong>
                {med.dosage && <span style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>· {med.dosage}</span>}
                {med.purpose && <span style={{ color: 'var(--moss-600)', fontSize: '11px' }}>({med.purpose})</span>}
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