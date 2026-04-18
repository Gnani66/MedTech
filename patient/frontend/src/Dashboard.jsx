import React, { useEffect, useState, useRef } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import StructuredHealthCard from './StructuredHealthCard';
import DoctorsBriefPanel from './DoctorsBriefPanel';
import HealthSentryPanel from './HealthSentryPanel';
import MedicationReminderPanel from './MedicationReminderPanel';
import AlertHistoryPanel from './AlertHistoryPanel';
import './Dashboard.css';

import { Upload as IconUpload, Share2 as IconShare, User as IconUser, LayoutGrid as IconGrid, Menu as IconMenu, Search as IconSearch, Bell as IconBell, Shield as IconShield, Clock as IconClock, Sparkles as IconSpark } from 'lucide-react';

const API_BASE_URL = import.meta.env.DEV ? 'http://127.0.0.1:5002' : 'https://medbridge-ai-backend.onrender.com';

/* ─── Filter Categories — plain text, no emoji ── */
const FILTER_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'lab', label: 'Labs' },
  { id: 'prescription', label: 'Prescriptions' },
  { id: 'imaging', label: 'Imaging' },
  { id: 'vaccine', label: 'Vaccines' },
];

/* ─── QR Permissions ── */
const QR_PERMISSIONS = [
  { id: 'Labs', label: 'Lab Reports' },
  { id: 'Prescription', label: 'Prescriptions' },
  { id: 'Imaging', label: 'Imaging' },
  { id: 'Vaccine', label: 'Vaccines' },
];

/* ─── Group records into Health Episodes (within 14 days) ── */
function groupIntoEpisodes(records) {
  if (!records.length) return [];
  const sorted = [...records].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const episodes = [];
  let current = [];
  let lastDate = null;
  sorted.forEach(rec => {
    const date = new Date(rec.created_at);
    if (!lastDate || (lastDate - date) / 86400000 <= 14) {
      current.push(rec);
    } else {
      if (current.length) episodes.push(current);
      current = [rec];
    }
    lastDate = date;
  });
  if (current.length) episodes.push(current);
  return episodes;
}

/* ─── Filter records by category + search ── */
function filterRecords(records, category, searchQuery) {
  let out = records;
  if (category !== 'all') {
    out = out.filter(r => {
      const t = ((r.document_type || '') + (r.file_name || '') + (r.extracted_text || '')).toLowerCase();
      return t.includes(category);
    });
  }
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    out = out.filter(r =>
      ((r.file_name || '') + (r.extracted_text || '')).toLowerCase().includes(q)
    );
  }
  return out;
}

/* ═══════════════════════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null);
  const [records, setRecords] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [aiBrief, setAiBrief] = useState('');
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [pendingRecord, setPendingRecord] = useState(null);
  const [editedText, setEditedText] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeToken, setActiveToken] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [qrCountdown, setQrCountdown] = useState(600);
  const [qrPermissions, setQrPermissions] = useState(['Labs', 'Prescription', 'Imaging', 'Vaccine']);
  const [shareExpiryMs, setShareExpiryMs] = useState(10);
  const [auditToast, setAuditToast] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [liveViewMode, setLiveViewMode] = useState(false);
  const [activeSessions, setActiveSessions] = useState([]);
  const [accessHistory, setAccessHistory] = useState([]);
  const [healthAlerts, setHealthAlerts] = useState([]);
  const [criticalAlertModal, setCriticalAlertModal] = useState(null);

  /* ── Export JSON ── */
  const handleExportJSON = () => {
    if (!records || records.length === 0) return alert('No records to export.');
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(records, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', `medbridge-health-summary-${Date.now()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };
  const [expandedRecords, setExpandedRecords] = useState({});
  const [renamingRecord, setRenamingRecord] = useState(null); // { id, value }

  const toggleRecord = (id) => setExpandedRecords(p => ({ ...p, [id]: !p[id] }));

  /* ── Rename record ── */
  const handleRenameRecord = async (recordId, newName) => {
    if (!newName || !newName.trim()) { setRenamingRecord(null); return; }
    try {
      const { error } = await supabase.from('medical_records')
        .update({ file_name: newName.trim() })
        .eq('id', recordId);
      if (error) throw error;
      setRecords(prev => prev.map(r => r.id === recordId ? { ...r, file_name: newName.trim() } : r));
    } catch (err) { console.error('Rename failed:', err); }
    setRenamingRecord(null);
  };

  /* ── Revoke Live Access ── */
  const handleRevokeAccess = async () => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from('share_tokens')
        .update({ expires_at: now })
        .eq('patient_id', activeProfile.id)
        .gte('expires_at', now);
      if (error) throw error;
      setLiveViewMode(false);
      fetchAccessData();
      setAuditToast('Access revoked successfully. Live session terminated.');
      setTimeout(() => setAuditToast(null), 5000);
      setShowShareModal(false);
    } catch (err) {
      console.error(err);
      alert('Failed to revoke access.');
    }
  };

  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const countdownRef = useRef(null);
  const searchRef = useRef(null);

  /* ── Init ── */
  useEffect(() => {
    async function init() {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { navigate('/', { replace: true }); return; }
      setUser(u);
      try {
        const { data } = await supabase
          .from('user_profiles').select('*')
          .or(`id.eq.${u.id},parent_id.eq.${u.id}`);
        if (data?.length) {
          setProfiles(data);
          setActiveProfile(data.find(p => p.id === u.id) || data[0]);
        } else {
          const fb = { id: u.id, full_name: 'Patient' };
          setProfiles([fb]); setActiveProfile(fb);
        }
      } catch (e) { console.error(e); }
    }
    init();
  }, [navigate]);

  /* ── Fetch records & access data ── */
  const fetchAccessData = () => {
    if (!activeProfile) return;
    const now = new Date().toISOString();

    supabase.from('share_tokens')
      .select('*').eq('patient_id', activeProfile.id).gte('expires_at', now)
      .then(({ data: st }) => setActiveSessions(st || []));

    supabase.from('audit_logs')
      .select('*').eq('patient_id', activeProfile.id).eq('action', 'doctor_viewed')
      .order('created_at', { ascending: false }).limit(5)
      .then(({ data: ah }) => setAccessHistory(ah || []));
  };

  /* ── Fetch health alerts ── */
  const fetchAlerts = () => {
    if (!activeProfile) return;
    supabase.from('health_alerts')
      .select('*').eq('patient_id', activeProfile.id)
      .order('sent_at', { ascending: false }).limit(10)
      .then(({ data }) => setHealthAlerts(data || []));
  };

  useEffect(() => {
    if (!activeProfile) return;
    supabase.from('medical_records').select('*')
      .eq('patient_id', activeProfile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setRecords(data || []));

    // eslint-disable-next-line
    fetchAccessData();
    // eslint-disable-next-line
    fetchAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile]);

  /* ── Realtime Audit Subscription ── */
  useEffect(() => {
    if (!activeProfile) return;

    const channel = supabase
      .channel('public:audit_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs', filter: `patient_id=eq.${activeProfile.id}` }, (payload) => {
        if (payload.new.action === 'doctor_viewed') {
          setLiveViewMode(true);
          fetchAccessData();
          setAuditToast(`A doctor has viewed your records at ${new Date(payload.new.created_at).toLocaleTimeString()}`);
          setTimeout(() => setAuditToast(null), 8000);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile]);

  /* ── QR countdown ── */
  useEffect(() => {
    if (showShareModal && activeToken) {
      clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        setQrCountdown(prev => {
          if (prev <= 1) { clearInterval(countdownRef.current); setShowShareModal(false); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(countdownRef.current);
  }, [showShareModal, activeToken]);

  /* ── Upload ── */
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    setUploading(true); setUploadProgress(15);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      await supabase.storage.from('medical_records').upload(path, file);
      setUploadProgress(40);
      const { data: { publicUrl } } = supabase.storage.from('medical_records').getPublicUrl(path);
      setUploadProgress(60);
      const res = await fetch(`${API_BASE_URL}/api/analyze-prescription`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: publicUrl })
      });
      const ai = await res.json();
      setUploadProgress(95);
      setEditedText(ai.extracted_text || JSON.stringify({ is_valid: false, summary: 'Analysis failed.' }));
      setPendingRecord({ file_name: file.name, file_url: publicUrl, document_type: file.type.includes('pdf') ? 'PDF' : 'Image' });
    } catch (err) {
      console.error(err);
      alert('AI processing error. Please try again later.');
    } finally {
      setUploading(false); setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAcknowledgeAlert = async (alertId) => {
    await supabase.from('health_alerts').update({ acknowledged: true }).eq('id', alertId);
    fetchAlerts();
  };

  /* ── Confirm save ── */
  const handleConfirmSave = async () => {
    try {
      const { data: nr, error } = await supabase.from('medical_records')
        .insert([{ patient_id: activeProfile.id, file_name: pendingRecord.file_name, file_url: pendingRecord.file_url, document_type: pendingRecord.document_type, extracted_text: editedText }])
        .select();
      if (error) throw error;
      if (nr) {
        await supabase.from('audit_logs').insert([{ record_id: nr[0].id, patient_id: activeProfile.id, action: 'patient_verified' }]);
        setRecords([nr[0], ...records]);

        /* ── Critical alert check ── */
        try {
          const alertRes = await fetch(`${API_BASE_URL}/api/check-critical-alert`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              extractedData: editedText,
              patientName: activeProfile.full_name,
              emergencyContactPhone: activeProfile.emergency_contact_phone || null,
              emergencyContactName: activeProfile.emergency_contact_name || null,
            })
          });
          const alertData = await alertRes.json();
          if (alertData.alert) {
            // Log alert to Supabase
            await supabase.from('health_alerts').insert([{
              patient_id: activeProfile.id,
              record_id: nr[0].id,
              alert_type: alertData.alerts.some(a => a.severity === 'critical') ? 'critical_vitals' : 'high_risk',
              message: alertData.message,
              contact_phone: activeProfile.emergency_contact_phone || null,
              contact_name: activeProfile.emergency_contact_name || null,
            }]);
            fetchAlerts();
            setCriticalAlertModal(alertData);
          }
        } catch (alertErr) { console.error('Alert check failed:', alertErr); }
      }
      setPendingRecord(null); setAiBrief('');
    } catch (err) { console.error(err); alert('Failed to save record.'); }
  };

  /* ── Doctor brief ── */
  const handleGenerateBrief = async () => {
    setLoadingBrief(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/generate-summary`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records, patientName: activeProfile?.full_name })
      });
      const d = await res.json();
      setAiBrief(d.summary || 'No summary generated.');
    } catch { setAiBrief('Unable to generate. Check the AI server is running.'); }
    finally { setLoadingBrief(false); }
  };

  /* ── QR share token ── */
  const handleGenerateShareToken = async () => {
    try {
      const expires = new Date(Date.now() + shareExpiryMs * 60000).toISOString();
      const { data, error } = await supabase.from('share_tokens')
        .insert([{ patient_id: activeProfile.id, expires_at: expires }]) // 👈 removed 'permissions' column since it doesn't exist
        .select();
      if (error) throw error;
      setActiveToken(data[0].id);
      fetchAccessData();
      setQrCountdown(shareExpiryMs * 60);
      setShowShareModal(true);
    } catch (err) { console.error(err); alert(`Error generating share link: ${err.message}`); }
  };

  const togglePermission = (id) =>
    setQrPermissions(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

  /* ── Skeleton Loading ── */
  if (!user || !activeProfile) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-canvas)', display: 'flex' }}>
        <div style={{ width: '240px', background: 'var(--moss-800)', padding: '24px', flexShrink: 0 }}>
          <div style={{ height: '24px', width: '120px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginBottom: '40px' }} />
          {[1, 2, 3, 4].map(i => <div key={i} style={{ height: '20px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '16px' }} />)}
        </div>
        <div style={{ flex: 1, padding: '32px' }}>
          <div style={{ height: '180px', width: '100%', background: 'var(--border-soft)', borderRadius: '16px', marginBottom: '24px', animation: 'breathe 2s infinite' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
            {[1, 2, 3, 4].map(i => <div key={i} style={{ height: '90px', background: 'white', borderRadius: '12px', border: '1px solid var(--border)' }} />)}
          </div>
        </div>
      </div>
    );
  }

  const displayedRecords = filterRecords(records, activeFilter, searchQuery);
  const episodes = groupIntoEpisodes(displayedRecords);
  const qrPct = (qrCountdown / (shareExpiryMs * 60)) * 100;
  const qrMins = Math.floor(qrCountdown / 60);
  const qrSecs = String(qrCountdown % 60).padStart(2, '0');
  let pendingParsed = null;
  try { pendingParsed = editedText ? JSON.parse(editedText) : null; } catch { /* ignore parse error */ }
  const firstName = activeProfile.full_name?.split(' ')[0] || 'Patient';

  return (
    <div className="dash-root">

      {/* Sidebar overlay */}
      <div className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* ══ SIDEBAR ══ */}
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        {/* Wordmark only — no icon box */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-name">MedBridge</div>
          <div className="sidebar-logo-sub">Clinical Intelligence</div>
        </div>

        <div className="sidebar-divider" style={{ margin: '8px 0' }} />

        <nav className="sidebar-nav">
          <div className="sidebar-item active">
            <span className="sidebar-item-icon"><IconGrid size={15} strokeWidth={2} /></span>
            Health Vault
          </div>
          <div className="sidebar-item" onClick={() => navigate('/profile')}>
            <span className="sidebar-item-icon"><IconUser size={14} strokeWidth={2} /></span>
            Health Profile
          </div>
          <div className="sidebar-item" onClick={handleGenerateShareToken}>
            <span className="sidebar-item-icon"><IconShare size={14} strokeWidth={2} /></span>
            Share with Doctor
          </div>
        </nav>

        <div className="sidebar-divider" />

        {/* Profiles — smaller nav items, no uppercase label */}
        <nav className="sidebar-nav">
          {profiles.map(p => (
            <div
              key={p.id}
              className={`sidebar-item${activeProfile.id === p.id ? ' active' : ''}`}
              onClick={() => { setActiveProfile(p); setAiBrief(''); }}
            >
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.16)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', fontWeight: 700, color: 'white', flexShrink: 0
              }}>
                {(p.full_name || 'P')[0]}
              </div>
              {p.id === user.id ? 'Me' : p.full_name?.split(' ')[0]}
            </div>
          ))}
          {/* Add member — plain row, no dashed box */}
          <div className="sidebar-add-member" onClick={() => navigate('/profile')}>
            + Add member
          </div>
        </nav>

        {/* User block */}
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{firstName[0]}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{activeProfile.full_name || 'Patient'}</div>
            <div className="sidebar-user-role">{user.email}</div>
          </div>
        </div>
        <div style={{ padding: '2px 10px 16px' }}>
          <button className="logout-btn" onClick={() => { supabase.auth.signOut(); navigate('/'); }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* ══ MAIN ══ */}
      <main className="dash-main">

        {/* Topbar */}
        <header className="topbar">
          <button className="topbar-hamburger" onClick={() => setSidebarOpen(o => !o)} aria-label="Toggle Navigation Sidebar">
            <IconMenu size={18} strokeWidth={2} />
          </button>
          <div className="topbar-breadcrumb">
            <span className="topbar-breadcrumb-root">MedBridge</span>
            <span className="topbar-breadcrumb-sep">/</span>
            <span className="topbar-title">Health Vault</span>
          </div>
          <div className="topbar-search" onClick={() => searchRef.current?.focus()}>
            <IconSearch size={13} strokeWidth={2} />
            <input
              ref={searchRef}
              placeholder="Search records"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="topbar-right">
            <button className="topbar-icon-btn" title="Notifications" aria-label="View notifications">
              <IconBell size={16} strokeWidth={2} />
            </button>
            <div className="topbar-avatar" onClick={() => navigate('/profile')}>
              {firstName[0]}
            </div>
          </div>
        </header>

        <div className="dash-body">

          {/* ── Live View Banner ── */}
          {liveViewMode && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 'var(--r-md)',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              animation: 'slideDown 0.3s ease-out'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 600, fontSize: '14px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'breathe 2s infinite' }} />
                LIVE: A healthcare provider is currently viewing your records
              </div>
              <button
                onClick={handleRevokeAccess}
                style={{
                  background: '#ef4444', color: 'white', border: 'none', borderRadius: 'var(--r-md)',
                  padding: '6px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                  transition: 'background 0.2s, transform 0.2s', whiteSpace: 'nowrap',
                  boxShadow: '0 2px 8px rgba(239,68,68,0.25)'
                }}
                onMouseOver={(e) => { e.target.style.background = '#dc2626'; e.target.style.transform = 'translateY(-1px)'; }}
                onMouseOut={(e) => { e.target.style.background = '#ef4444'; e.target.style.transform = 'none'; }}
                onMouseDown={(e) => e.target.style.transform = 'translateY(1px)'}
                onMouseUp={(e) => e.target.style.transform = 'translateY(-1px)'}
              >
                Revoke Access
              </button>
            </div>
          )}

          {/* Audit toast */}
          {auditToast && (
            <div className="audit-toast" style={{ marginBottom: '16px' }}>
              <IconBell size={16} strokeWidth={2} /> {auditToast}
            </div>
          )}

          {/* ── Hero ── */}
          <section className="dash-hero">
            <div className="dash-hero-text">
              <span className="dash-hero-eyebrow">Health Vault</span>
              <h1 className="dash-hero-title">
                Good to see you, {firstName}.
              </h1>
              <p className="dash-hero-sub">
                {records.length} record{records.length !== 1 ? 's' : ''} on file. Keep it updated for the best care.
              </p>
              <span className="dash-hero-id">
                ID: {activeProfile.id?.substring(0, 16) || '—'}…
              </span>
            </div>
            <div className="dash-hero-actions">
              <button
                className="dash-hero-btn dash-hero-btn-primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Processing…' : 'Upload Record'}
              </button>
              <button className="dash-hero-btn dash-hero-btn-ghost" onClick={handleGenerateShareToken}>
                Share QR
              </button>
            </div>
          </section>

          {/* ── Stat Strip — no colored icon blobs ── */}
          <div className="stat-strip">
            {[
              { label: 'Total Records', value: records.length, delta: 'in your vault' },
              { label: 'Profiles', value: profiles.length, delta: 'family care' },
              { label: 'AI Modules', value: 5, delta: 'active' },
              { label: 'Encryption', value: '256', delta: 'bit AES' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <span className="stat-label">{s.label}</span>
                <div className="stat-value">{s.value}</div>
                <div className="stat-delta">{s.delta}</div>
              </div>
            ))}
          </div>

          {/* ── Profile Switcher — clean horizontal row ── */}
          <div className="profile-strip">
            {profiles.map((p, i) => (
              <React.Fragment key={p.id}>
                {i > 0 && <div className="profile-sep" />}
                <div
                  className={`profile-avatar-wrap${activeProfile.id === p.id ? ' active' : ''}`}
                  onClick={() => { setActiveProfile(p); setAiBrief(''); }}
                >
                  <div className="profile-avatar">{(p.full_name || 'P')[0]}</div>
                  <span className="profile-avatar-label">
                    {p.id === user.id ? 'Me' : p.full_name?.split(' ')[0]}
                  </span>
                </div>
              </React.Fragment>
            ))}
            <div className="profile-sep" />
            <div className="profile-add-link" onClick={() => navigate('/profile')}>
              + Add member
            </div>
          </div>

          {/* ── Filter Pills — plain text, no colored dots ── */}
          <div className="filter-pill-bar">
            {FILTER_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className={`filter-pill${activeFilter === cat.id ? ' active' : ''}`}
                onClick={() => setActiveFilter(cat.id)}
              >
                {cat.label}
              </button>
            ))}
            {searchQuery && (
              <button
                className="filter-pill"
                onClick={() => setSearchQuery('')}
                style={{ borderColor: 'var(--moss-300)', color: 'var(--moss-700)', background: 'var(--moss-50)' }}
              >
                "{searchQuery}" ×
              </button>
            )}
          </div>

          {/* ── Main Grid ── */}
          <div className="dash-grid">

            {/* Left column */}
            <div>

              {/* Upload Card */}
              <div className="records-card" style={{ marginBottom: '20px' }}>
                <div className="records-card-head">
                  <div className="section-head">
                    <span className="section-title">Upload Document</span>
                    <span className="ai-badge"><IconSpark size={13} strokeWidth={2} /> AI-Processed</span>
                  </div>
                </div>
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} accept="image/*,.pdf" />
                <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
                  <div className="upload-zone-icon"><IconUpload size={15} strokeWidth={2} /></div>
                  <div className="upload-zone-title">
                    {uploading ? 'AI is reading your document…' : `Drop a file for ${firstName}`}
                  </div>
                  <div className="upload-zone-sub">
                    Prescriptions, Lab Reports, Imaging, PDFs · <span>click to browse</span>
                  </div>
                </div>
                {uploading && (
                  <div className="upload-progress">
                    <div className="upload-progress-bar" style={{ width: `${uploadProgress}%` }} />
                  </div>
                )}
                <div style={{ height: '16px' }} />
              </div>

              {/* Module 2: Doctor's View */}
              <DoctorsBriefPanel records={records} brief={aiBrief} loading={loadingBrief} onGenerate={handleGenerateBrief} activeProfile={activeProfile} />

              {/* Module 4: Timeline */}
              <div className="section-head" style={{ marginBottom: '14px' }}>
                <span className="section-title">Health Timeline</span>
                <span className="section-link">{displayedRecords.length} record{displayedRecords.length !== 1 ? 's' : ''}</span>
              </div>

              <div className="timeline-wrapper">
                {episodes.length > 0 ? episodes.map((episode, epIdx) => {
                  const epDate = new Date(episode[0].created_at);
                  const isMulti = episode.length > 1;
                  return (
                    <div key={epIdx} className="timeline-episode">
                      <div className="timeline-episode-label">
                        <div className="timeline-year">
                          {isMulti
                            ? `Health Episode · ${episode.length} records`
                            : epDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                        {isMulti && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                            {epDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            {' — '}
                            {new Date(episode[episode.length - 1].created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        )}
                      </div>
                      {episode.map(record => {
                        let riskScore = 0;
                        let clinicalInfo = null;
                        try {
                          const parsed = JSON.parse(record.extracted_text);
                          riskScore = parsed?.risk_score || 0;
                          const ent = parsed?.data?.clinical_entities || parsed?.clinical_entities || null;
                          clinicalInfo = {
                            hospital: ent?.hospital_name || ent?.clinic_name || null,
                            doctor: ent?.doctor_name || null,
                            diagnosis: ent?.diagnosis || null,
                            category: parsed?.category || null,
                          };
                        } catch { /* ignore parse error */ }
                        const riskClass = riskScore >= 7 ? 'risk-high' : riskScore >= 4 ? 'risk-medium' : riskScore > 0 ? 'risk-low' : '';
                        const isExpanded = !!expandedRecords[record.id];
                        const displayTitle = record.file_name;
                        const isRenaming = renamingRecord?.id === record.id;
                        return (
                          <div key={record.id} className={`timeline-record-card${riskClass ? ` ${riskClass}` : ''}`}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isExpanded ? '14px' : '0', gap: '12px', flexWrap: 'wrap' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                  {isRenaming ? (
                                    <input
                                      autoFocus
                                      defaultValue={renamingRecord.value}
                                      onBlur={(e) => handleRenameRecord(record.id, e.target.value)}
                                      onKeyDown={(e) => { if (e.key === 'Enter') handleRenameRecord(record.id, e.target.value); if (e.key === 'Escape') setRenamingRecord(null); }}
                                      onClick={(e) => e.stopPropagation()}
                                      style={{
                                        fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)',
                                        background: 'var(--bg-subtle)', border: '1.5px solid var(--moss-400)',
                                        borderRadius: 'var(--r-md)', padding: '3px 10px', outline: 'none',
                                        width: '100%', maxWidth: '360px', fontFamily: 'inherit'
                                      }}
                                    />
                                  ) : (
                                    <>
                                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{displayTitle}</div>
                                      <button
                                        title="Rename this record"
                                        className="rename-record-btn"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRenamingRecord({ id: record.id, value: record.file_name }); }}
                                      >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                                      </button>
                                    </>
                                  )}
                                  {clinicalInfo?.category && (
                                    <span style={{
                                      background: 'var(--moss-50)', border: '1px solid var(--moss-200)',
                                      color: 'var(--moss-700)', padding: '1px 8px', borderRadius: 'var(--r-full)',
                                      fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em'
                                    }}>{clinicalInfo.category}</span>
                                  )}
                                </div>
                                {clinicalInfo?.diagnosis && (
                                  <div style={{ fontSize: '12.5px', color: 'var(--amber-700)', fontWeight: 600, marginBottom: '2px' }}>
                                    {clinicalInfo.diagnosis}
                                  </div>
                                )}
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                  <span>{new Date(record.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                  {clinicalInfo?.doctor && <span>· {clinicalInfo.doctor}</span>}
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                {riskScore > 0 && (
                                  <span className={`risk-score-badge ${riskScore <= 3 ? 'risk-score-low' : riskScore <= 6 ? 'risk-score-medium' : 'risk-score-high'}`}>
                                    Risk {riskScore}/10
                                  </span>
                                )}
                                <a href={record.file_url} target="_blank" rel="noreferrer" className="record-action" onClick={(e) => e.stopPropagation()}>Source</a>
                                <button
                                  className="record-action"
                                  onClick={() => toggleRecord(record.id)}
                                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}
                                >
                                  {isExpanded ? 'Collapse ↑' : 'Expand ↓'}
                                </button>
                              </div>
                            </div>
                            {isExpanded && <StructuredHealthCard textData={record.extracted_text} />}
                          </div>
                        );
                      })}
                    </div>
                  );
                }) : (
                  <div className="empty-state">
                    <div className="empty-state-icon">—</div>
                    <div className="empty-state-title">
                      {searchQuery ? 'No records match your search' : 'Your vault is empty'}
                    </div>
                    <div className="empty-state-sub">
                      {searchQuery ? 'Try a different term.' : 'Upload your first document to begin.'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right column */}
            <div className="right-col">

              <HealthSentryPanel records={records} />

              {/* Health Identity */}
              <div className="health-card">
                <div className="section-head" style={{ marginBottom: '14px' }}>
                  <span className="section-title">Health Identity</span>
                  <span className="section-link" onClick={() => navigate('/profile')}>Edit</span>
                </div>
                {[
                  { label: 'Blood Group', value: activeProfile.blood_group },
                  { label: 'Age', value: activeProfile.age },
                  { label: 'Weight', value: activeProfile.weight_kg ? `${activeProfile.weight_kg} kg` : null },
                  { label: 'Height', value: activeProfile.height_cm ? `${activeProfile.height_cm} cm` : null },
                  { label: 'Phone', value: activeProfile.phone },
                ].map(row => (
                  <div key={row.label} className="health-row">
                    <span className="health-row-label">{row.label}</span>
                    <span className="health-row-value">{row.value || '—'}</span>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="health-card">
                <div className="section-head" style={{ marginBottom: '14px' }}>
                  <span className="section-title">Quick Actions</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button onClick={() => fileInputRef.current?.click()} className="primary-btn" style={{ justifyContent: 'flex-start', borderRadius: 'var(--r-md)' }}>
                    <IconUpload size={15} strokeWidth={2} /> Upload Document
                  </button>
                  <button
                    onClick={handleGenerateShareToken}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'var(--amber-50)', border: '1px solid var(--amber-100)', borderRadius: 'var(--r-md)', color: 'var(--amber-600)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'background var(--t)' }}
                  >
                    <IconShare size={14} strokeWidth={2} /> Share with Doctor
                  </button>
                  <button onClick={handleExportJSON} className="secondary-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-start' }}>
                    <IconUpload size={14} strokeWidth={2} style={{ transform: 'rotate(180deg)' }} /> Export JSON
                  </button>
                  <button onClick={() => navigate('/profile')} className="secondary-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-start' }}>
                    <IconUser size={14} strokeWidth={2} /> Manage Profile
                  </button>
                </div>
              </div>

              {/* Access History & Active Sessions */}
              {(activeSessions.length > 0 || accessHistory.length > 0) && (
                <div className="health-card">
                  <div className="section-head" style={{ marginBottom: '14px' }}>
                    <span className="section-title">Access & Activity</span>
                    {activeSessions.length > 0 && (
                      <span className="section-link" style={{ color: '#ef4444' }} onClick={handleRevokeAccess}>Revoke All</span>
                    )}
                  </div>

                  {activeSessions.length > 0 && (
                    <div style={{ background: 'var(--bg-subtle)', padding: '10px 12px', borderRadius: 'var(--r-md)', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', animation: 'breathe 2s infinite' }} />
                        {activeSessions.length} Active Sharing Link{activeSessions.length > 1 ? 's' : ''}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Doctors with links can currently view your records. Revoke access to instantly lock them out.</div>
                    </div>
                  )}

                  {accessHistory.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {accessHistory.map((log) => {
                        const d = new Date(log.created_at);
                        return (
                          <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--moss-100)', color: 'var(--moss-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <IconClock size={16} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                                Health Vault Accessed
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                {d.toLocaleDateString()} at {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <button
                        onClick={handleGenerateBrief}
                        disabled={loadingBrief}
                        style={{ marginTop: '8px', padding: '8px', width: '100%', background: 'transparent', border: '1px dashed var(--moss-300)', borderRadius: 'var(--r-md)', color: 'var(--moss-600)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.background = 'var(--moss-50)'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <IconSpark size={14} />
                        {loadingBrief ? 'Generating Summary...' : 'Summarize Profile (What Doctors See)'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Medication Reminder Panel */}
              <MedicationReminderPanel records={records} />

              {/* Alert History Panel */}
              <AlertHistoryPanel alerts={healthAlerts} onAcknowledge={handleAcknowledgeAlert} />

              {/* Security Status — green card */}
              <div className="security-card">
                <span className="security-card-label">Security</span>
                {[
                  '256-bit AES encryption',
                  'HIPAA compliant storage',
                  'Temporal QR sharing',
                  'Full audit logging',
                ].map(item => (
                  <div key={item} className="security-item">
                    <div className="security-item-dot" />
                    {item}
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* ══ MODULE 1: REVIEW MODAL ══ */}
      {pendingRecord && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <h3>Review Extraction</h3>
              <span className="ai-badge"><IconSpark size={13} strokeWidth={2} /> AI</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Verify the AI-extracted data before saving to your vault.
            </p>
            {pendingParsed && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '8px' }}>Extracted Fields</div>
                <div className="review-field-grid">
                  {pendingParsed.category && <div className="review-field"><div className="review-field-label">Type</div><div className="review-field-value">{pendingParsed.category}</div></div>}
                  {pendingParsed.patient_name && <div className="review-field"><div className="review-field-label">Patient</div><div className="review-field-value">{pendingParsed.patient_name}</div></div>}
                  {pendingParsed.date && <div className="review-field"><div className="review-field-label">Date</div><div className="review-field-value">{pendingParsed.date}</div></div>}
                  {pendingParsed.risk_score && (
                    <div className="review-field">
                      <div className="review-field-label">Risk Score</div>
                      <div className="review-field-value">
                        <span className={`risk-score-badge ${pendingParsed.risk_score <= 3 ? 'risk-score-low' : pendingParsed.risk_score <= 6 ? 'risk-score-medium' : 'risk-score-high'}`}>
                          {pendingParsed.risk_score}/10
                        </span>
                      </div>
                    </div>
                  )}
                  {pendingParsed.summary && (
                    <div className="review-field" style={{ gridColumn: '1/-1' }}>
                      <div className="review-field-label">Summary</div>
                      <div className="review-field-value">{pendingParsed.summary}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Raw JSON (editable)
            </div>
            <textarea className="textarea-field" value={editedText} onChange={e => setEditedText(e.target.value)} style={{ minHeight: '130px', fontSize: '12px' }} />
            <div className="button-group">
              <button onClick={() => setPendingRecord(null)} className="secondary-btn">Cancel</button>
              <button onClick={handleConfirmSave} className="primary-btn" style={{ flex: 1, justifyContent: 'center' }}>
                Confirm and Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODULE 3: QR SHARE MODAL ══ */}
      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: '440px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <h3>Secure Health Share</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IconClock size={12} strokeWidth={2} /> {qrMins}:{qrSecs}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '0', textAlign: 'left' }}>
              Temporal link — auto-expires. Patient consent required.
            </p>
            <div className="qr-countdown-bar-wrap">
              <div className="qr-countdown-bar" style={{ width: `${qrPct}%` }} />
            </div>
            <div style={{ textAlign: 'left', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Share Permissions
              </div>
              <div className="qr-permission-grid">
                {QR_PERMISSIONS.map(perm => (
                  <div key={perm.id} className={`qr-permission-item${qrPermissions.includes(perm.id) ? ' selected' : ''}`} onClick={() => togglePermission(perm.id)}>
                    <input type="checkbox" checked={qrPermissions.includes(perm.id)} onChange={() => togglePermission(perm.id)} onClick={e => e.stopPropagation()} />
                    {perm.label}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ textAlign: 'left', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Token Expiry Time
              </div>
              <select
                value={shareExpiryMs}
                onChange={(e) => setShareExpiryMs(Number(e.target.value))}
                style={{ width: '100%', padding: '6px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', fontSize: '13px', outline: 'none', background: 'var(--bg-panel)', color: 'var(--text-primary)' }}
              >
                <option value={5}>5 Minutes</option>
                <option value={10}>10 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={60}>1 Hour</option>
                <option value={1440}>24 Hours</option>
              </select>
            </div>
            {/* QR Code — white background, no mint blob */}
            <div style={{ padding: '20px', background: 'var(--bg-subtle)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', display: 'inline-block', marginBottom: '16px' }}>
              <QRCodeSVG value={`${window.location.origin}/shared/token/${activeToken}?perms=${qrPermissions.join(',')}`} size={160} fgColor="#111110" bgColor="transparent" />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowShareModal(false)} className="secondary-btn" style={{ flex: 1 }}>Close</button>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(`${window.location.origin}/shared/token/${activeToken}?perms=${qrPermissions.join(',')}`);
                  setAuditToast('Secure link copied. The patient will be notified when a doctor views it.');
                  setTimeout(() => setAuditToast(null), 6000);
                }}
                className="primary-btn" style={{ flex: 2, justifyContent: 'center' }}
              >
                Copy Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ CRITICAL ALERT MODAL ══ */}
      {criticalAlertModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconBell size={20} style={{ color: '#ef4444' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#ef4444' }}>⚠️ Critical Health Alert</h3>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Anomalies detected in the uploaded record</p>
              </div>
            </div>

            <div style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 'var(--r-md)', padding: '14px', marginBottom: '16px' }}>
              {criticalAlertModal.alerts.map((a, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < criticalAlertModal.alerts.length - 1 ? '1px solid rgba(239,68,68,0.1)' : 'none', fontSize: '13px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.metric}</span>
                  <span style={{
                    fontWeight: 700,
                    color: a.severity === 'critical' ? '#ef4444' : a.severity === 'low' ? '#3b82f6' : '#f59e0b'
                  }}>{a.value}</span>
                </div>
              ))}
            </div>

            {!activeProfile.emergency_contact_phone ? (
              <div style={{ background: 'var(--amber-50)', border: '1px solid var(--amber-200)', borderRadius: 'var(--r-md)', padding: '12px', marginBottom: '16px', fontSize: '12px', color: 'var(--amber-700)' }}>
                <strong>No emergency contact set.</strong> Go to your Profile to add an emergency contact number so alerts can be sent via WhatsApp.
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Alert will be sent to <strong>{criticalAlertModal.emergencyContactName || 'Emergency Contact'}</strong> ({activeProfile.emergency_contact_phone})
              </div>
            )}

            <div className="button-group">
              <button onClick={() => setCriticalAlertModal(null)} className="secondary-btn">Dismiss</button>
              {criticalAlertModal.waLink && (
                <a
                  href={criticalAlertModal.waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="primary-btn"
                  style={{ flex: 1, justifyContent: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                  onClick={() => setCriticalAlertModal(null)}
                >
                  Send Alert via WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}