import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from './supabaseClient';
import StructuredHealthCard from './StructuredHealthCard';

/* ═══════════════════════════════════════════════════════════
   SharedView.jsx — Module 3: Consent-First Doctor View
   Token-based access · Audit logging · Premium design
   ═══════════════════════════════════════════════════════════ */

const MedBridgeLogo = ({ size = 18, color = 'white' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <rect x="13" y="4" width="6" height="24" rx="3" fill={color}/>
    <rect x="4" y="13" width="24" height="6" rx="3" fill={color}/>
  </svg>
);

function SharedView() {
  const { tokenId: token } = useParams();
  const [records, setRecords] = useState([]);
  const [patientName, setPatientName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expired, setExpired] = useState(false);
  const [permissions, setPermissions] = useState([]);
  const auditLogged = useRef(false);

  useEffect(() => {
    const loadSharedData = async () => {
      try {
        // 1. Validate the share token
        const { data: tokenData, error: tokenError } = await supabase
          .from('share_tokens')
          .select('*')
          .eq('id', token)
          .single();

        if (tokenError || !tokenData) {
          setError('This link is invalid or does not exist.');
          setLoading(false);
          return;
        }

        // 2. Check expiry
        if (new Date(tokenData.expires_at) < new Date()) {
          setExpired(true);
          setLoading(false);
          return;
        }

        // 3. Get patient info
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('id', tokenData.patient_id)
          .single();

        if (profile) setPatientName(profile.full_name);

        // Get permissions from URL or token
        const queryParams = new URLSearchParams(window.location.search);
        const urlPerms = queryParams.get('perms');
        const tokenPermissions = urlPerms ? urlPerms.split(',') : (tokenData.permissions || []);
        setPermissions(tokenPermissions);

        // 4. Fetch records
        let query = supabase
          .from('medical_records')
          .select('*')
          .eq('patient_id', tokenData.patient_id)
          .order('created_at', { ascending: false });

        // Apply permission filters if specific categories are set
        if (tokenPermissions.length > 0) {
          // Filter by document_type matching the permissions
          const permissionTypes = tokenPermissions.map(p => p.toLowerCase());
          const { data: allRecords } = await query;
          const filtered = (allRecords || []).filter(r => {
            const searchIndex = ((r.document_type || '') + ' ' + (r.file_name || '') + ' ' + (r.extracted_text || '')).toLowerCase();
            return permissionTypes.some(p => {
              // Normalize permissions (e.g. "labs" -> "lab") to ensure matching "Lab Report"
              const normalizedPerm = p.replace(/s$/i, ''); 
              return searchIndex.includes(normalizedPerm);
            });
          });
          setRecords(filtered);
        } else {
          const { data } = await query;
          setRecords(data || []);
        }

        // 5. Log access in audit_logs (once only)
        if (!auditLogged.current) {
          auditLogged.current = true;
          await supabase.from('audit_logs').insert([{
            patient_id: tokenData.patient_id,
            action: 'doctor_viewed',
            record_id: null
          }]);
        }

      } catch (err) {
        setError('Failed to load patient records.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (token) loadSharedData();
  }, [token]);

  // --- Loading State ---
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#F7F7F5',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '16px'
      }}>
        <div style={{
          width: '48px', height: '48px', background: '#1B5E4F',
          borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'breathe 2s ease-in-out infinite'
        }}>
          <MedBridgeLogo size={20} />
        </div>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#6B6B6B' }}>
          Verifying access credentials…
        </p>
      </div>
    );
  }

  // --- Expired State ---
  if (expired) {
    return (
      <div style={{ minHeight: '100vh', background: '#F7F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{
          background: 'white', borderRadius: '20px', padding: '40px',
          maxWidth: '400px', width: '100%', textAlign: 'center',
          border: '1px solid #EBEBEB', boxShadow: '0 2px 12px rgba(15,15,15,0.06)'
        }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏰</div>
          <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 700, color: '#0F0F0F', marginBottom: '10px' }}>
            Access Expired
          </h2>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#6B6B6B', lineHeight: 1.65 }}>
            This sharing link has expired for security reasons. Please ask the patient to generate a new QR code.
          </p>
          <div style={{
            marginTop: '20px', background: '#FEF7F2', border: '1px solid var(--amber-300)',
            borderRadius: '10px', padding: '12px 16px', fontSize: '12px', color: '#B85A1A'
          }}>
            🔒 Temporal access links expire after 10-15 minutes to protect patient privacy.
          </div>
        </div>
      </div>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#F7F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{
          background: 'white', borderRadius: '20px', padding: '40px',
          maxWidth: '400px', width: '100%', textAlign: 'center',
          border: '1px solid #EBEBEB'
        }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 700, color: '#0F0F0F', marginBottom: '10px' }}>
            Invalid Link
          </h2>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#6B6B6B' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F7F5', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Top Banner ── */}
      <div style={{
        background: '#1B5E4F', padding: '0',
        position: 'sticky', top: 0, zIndex: 50
      }}>
        <div style={{
          maxWidth: '780px', margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '8px', display: 'flex' }}>
              <MedBridgeLogo size={18} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#F7F7F5', letterSpacing: '-0.01em' }}>MedBridge</div>
              <div style={{ fontSize: '10px', color: 'rgba(247,247,245,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Secure Health Share</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              background: 'rgba(247,247,245,0.15)', border: '1px solid rgba(247,247,245,0.25)',
              color: 'rgba(247,247,245,0.85)', padding: '4px 12px', borderRadius: '9999px',
              fontSize: '11px', fontWeight: 600
            }}>
              🔒 Verified Patient Data
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '32px 24px 64px' }}>

        {/* Patient Info Card */}
        <div style={{
          background: 'white', borderRadius: '20px', padding: '28px',
          border: '1px solid #EBEBEB', marginBottom: '24px',
          boxShadow: '0 2px 12px rgba(15,15,15,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '52px', height: '52px', background: '#1B5E4F',
                borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '22px', fontWeight: 700, color: 'white'
              }}>
                {patientName?.[0] || 'P'}
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#1B5E4F', marginBottom: '3px' }}>Patient Health Timeline</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: '#0F0F0F', letterSpacing: '-0.02em' }}>{patientName || 'Patient'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flex: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12px', color: '#9A9A96', textAlign: 'right' }}>
                <div style={{ fontWeight: 600, color: '#6B4FBB' }}>👨‍⚕️ Doctor Mode Active</div>
                <div style={{ marginTop: '3px' }}>{records.length} record{records.length !== 1 ? 's' : ''} shared</div>
              </div>
            </div>
          </div>

          {/* Permissions strip */}
          {permissions.length > 0 && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #EBEBEB' }}>
              <div style={{ fontSize: '11px', color: '#9A9A96', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Shared Categories
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {permissions.map(p => (
                  <span key={p} style={{
                    background: '#E8F5F0', border: '1px solid #B8DDD7',
                    color: '#1B5E4F', padding: '3px 10px', borderRadius: '9999px',
                    fontSize: '12px', fontWeight: 600
                  }}>{p}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Audit Notice */}
        <div style={{
          background: '#FEF7F2', border: '1px solid #FAD8C2',
          borderLeft: '3px solid #E8834A',
          borderRadius: '14px', padding: '12px 16px', marginBottom: '24px',
          display: 'flex', alignItems: 'flex-start', gap: '10px',
          fontSize: '13px', color: '#B85A1A'
        }}>
          <span style={{ fontSize: '16px', flexShrink: 0 }}>🔔</span>
          <div>
            <strong style={{ display: 'block', fontWeight: 700, fontSize: '12px', marginBottom: '2px' }}>
              Live Access Notification
            </strong>
            The patient has been notified that their records are being viewed. This session is being logged for security.
          </div>
        </div>

        {/* Records */}
        {records.length === 0 ? (
          <div style={{
            background: 'white', borderRadius: '20px', padding: '48px 24px',
            textAlign: 'center', border: '1px solid #EBEBEB'
          }}>
            <div style={{ fontSize: '36px', marginBottom: '12px', opacity: 0.3 }}>📋</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#3A3A38' }}>No records shared</div>
            <div style={{ fontSize: '13px', color: '#9A9A96', marginTop: '6px' }}>
              The patient has not shared any records under the current permissions.
            </div>
          </div>
        ) : (
          records.map((record) => (
            <div key={record.id} style={{
              background: 'white', border: '1px solid #EBEBEB',
              borderRadius: '20px', padding: '24px', marginBottom: '16px',
              boxShadow: '0 2px 12px rgba(15,15,15,0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F0F0F', letterSpacing: '-0.01em' }}>
                    {record.file_name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9A9A96', marginTop: '3px' }}>
                    {new Date(record.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {record.document_type && <span style={{ marginLeft: '8px', fontWeight: 600, color: '#6B6B6B' }}>· {record.document_type}</span>}
                  </div>
                </div>
                <a
                  href={record.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: '#E8F5F0', color: '#1B5E4F', border: '1px solid #B8DDD7',
                    padding: '6px 14px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700,
                    display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none'
                  }}
                >
                  View Original ↗
                </a>
              </div>
              <StructuredHealthCard textData={record.extracted_text} />
            </div>
          ))
        )}

        {/* Legal Footer */}
        <div style={{
          marginTop: '32px', padding: '16px 20px',
          background: 'white', border: '1px solid #EBEBEB', borderRadius: '14px',
          fontSize: '12px', color: '#9A9A96', lineHeight: 1.65
        }}>
          <strong style={{ color: '#6B6B6B' }}>Legal Disclaimer:</strong> This page displays a patient-managed health record summary generated via MedBridge AI. It does not constitute an official medical diagnosis or clinical advice. All extracted text has been self-verified by the patient. Always verify critical information directly with the original attached documents.
        </div>
      </div>
    </div>
  );
}

export default SharedView;