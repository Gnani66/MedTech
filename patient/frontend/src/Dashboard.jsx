import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import StructuredHealthCard from './StructuredHealthCard';
import DoctorsBriefPanel from './DoctorsBriefPanel';
import HealthSentryPanel from './HealthSentryPanel';
import './Dashboard.css';

/* ─── Icons (SVG only — no emoji) ─────────────────────────── */
const IconUpload = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const IconShare = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
);
const IconUser = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconGrid = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
);
const IconMenu = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="12" x2="20" y2="12"/>
    <line x1="4" y1="6" x2="20" y2="6"/>
    <line x1="4" y1="18" x2="20" y2="18"/>
  </svg>
);
const IconSearch = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);
const IconBell = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);
const IconShield = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IconClock = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconSpark = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
  </svg>
);

/* ─── Filter Categories — plain text, no emoji ── */
const FILTER_CATEGORIES = [
  { id: 'all',          label: 'All' },
  { id: 'lab',          label: 'Labs' },
  { id: 'prescription', label: 'Prescriptions' },
  { id: 'imaging',      label: 'Imaging' },
  { id: 'vaccine',      label: 'Vaccines' },
];

/* ─── QR Permissions ── */
const QR_PERMISSIONS = [
  { id: 'Labs',         label: 'Lab Reports' },
  { id: 'Prescription', label: 'Prescriptions' },
  { id: 'Imaging',      label: 'Imaging' },
  { id: 'Vaccine',      label: 'Vaccines' },
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
  const [user, setUser]                   = useState(null);
  const [profiles, setProfiles]           = useState([]);
  const [activeProfile, setActiveProfile] = useState(null);
  const [records, setRecords]             = useState([]);
  const [uploading, setUploading]         = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [aiBrief, setAiBrief]             = useState('');
  const [loadingBrief, setLoadingBrief]   = useState(false);
  const [pendingRecord, setPendingRecord] = useState(null);
  const [editedText, setEditedText]       = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeToken, setActiveToken]     = useState(null);
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [qrCountdown, setQrCountdown]     = useState(600);
  const [qrPermissions, setQrPermissions] = useState(['Labs', 'Prescription', 'Imaging', 'Vaccine']);
  const [shareExpiryMs] = useState(10);
  const [auditToast, setAuditToast]       = useState(null);
  const [activeFilter, setActiveFilter]   = useState('all');
  const [searchQuery, setSearchQuery]     = useState('');

  const navigate      = useNavigate();
  const fileInputRef  = useRef(null);
  const countdownRef  = useRef(null);
  const searchRef     = useRef(null);

  /* ── Init ── */
  useEffect(() => {
    async function init() {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { navigate('/'); return; }
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

  /* ── Fetch records ── */
  useEffect(() => {
    if (!activeProfile) return;
    supabase.from('medical_records').select('*')
      .eq('patient_id', activeProfile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setRecords(data || []));
  }, [activeProfile]);

  /* ── QR countdown ── */
  useEffect(() => {
    if (showShareModal && activeToken) {
      setQrCountdown(shareExpiryMs * 60);
      clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        setQrCountdown(prev => {
          if (prev <= 1) { clearInterval(countdownRef.current); setShowShareModal(false); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(countdownRef.current);
  }, [showShareModal, activeToken, shareExpiryMs]);

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
      const res = await fetch('http://localhost:5001/api/analyze-prescription', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: publicUrl })
      });
      const ai = await res.json();
      setUploadProgress(95);
      setEditedText(ai.extracted_text || JSON.stringify({ is_valid: false, summary: 'Analysis failed.' }));
      setPendingRecord({ file_name: file.name, file_url: publicUrl, document_type: file.type.includes('pdf') ? 'PDF' : 'Image' });
    } catch (err) {
      console.error(err);
      alert('AI processing error. Is the AI server running on port 5001?');
    } finally {
      setUploading(false); setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
      }
      setPendingRecord(null); setAiBrief('');
    } catch (err) { console.error(err); alert('Failed to save record.'); }
  };

  /* ── Doctor brief ── */
  const handleGenerateBrief = useCallback(async () => {
    setLoadingBrief(true);
    try {
      const res = await fetch('http://localhost:5001/api/generate-summary', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records, patientName: activeProfile?.full_name })
      });
      const d = await res.json();
      setAiBrief(d.summary || 'No summary generated.');
    } catch { setAiBrief('Unable to generate. Check the AI server is running.'); }
    finally { setLoadingBrief(false); }
  }, [records, activeProfile]);

  /* ── QR share token ── */
  const handleGenerateShareToken = async () => {
    try {
      const expires = new Date(Date.now() + shareExpiryMs * 60000).toISOString();
      const { data, error } = await supabase.from('share_tokens')
        .insert([{ patient_id: activeProfile.id, expires_at: expires }]) // 👈 removed 'permissions' column since it doesn't exist
        .select();
      if (error) throw error;
      setActiveToken(data[0].id);
      setShowShareModal(true);
    } catch (err) { console.error(err); alert(`Error generating share link: ${err.message}`); }
  };

  const togglePermission = (id) =>
    setQrPermissions(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

  /* ── Loading screen ── */
  if (!user || !activeProfile) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-canvas)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        <div style={{ width: '36px', height: '36px', border: '2px solid var(--border)', borderTopColor: 'var(--moss-700)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading your vault…</p>
      </div>
    );
  }

  const displayedRecords = filterRecords(records, activeFilter, searchQuery);
  const episodes = groupIntoEpisodes(displayedRecords);
  const qrPct = (qrCountdown / (shareExpiryMs * 60)) * 100;
  const qrMins = Math.floor(qrCountdown / 60);
  const qrSecs = String(qrCountdown % 60).padStart(2, '0');
  let pendingParsed = null;
  try { pendingParsed = editedText ? JSON.parse(editedText) : null; } catch {}
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
            <span className="sidebar-item-icon"><IconGrid /></span>
            Health Vault
          </div>
          <div className="sidebar-item" onClick={() => navigate('/profile')}>
            <span className="sidebar-item-icon"><IconUser /></span>
            Health Profile
          </div>
          <div className="sidebar-item" onClick={handleGenerateShareToken}>
            <span className="sidebar-item-icon"><IconShare /></span>
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
          <button className="topbar-hamburger" onClick={() => setSidebarOpen(o => !o)}>
            <IconMenu />
          </button>
          <div className="topbar-breadcrumb">
            <span className="topbar-breadcrumb-root">MedBridge</span>
            <span className="topbar-breadcrumb-sep">/</span>
            <span className="topbar-title">Health Vault</span>
          </div>
          <div className="topbar-search" onClick={() => searchRef.current?.focus()}>
            <IconSearch />
            <input
              ref={searchRef}
              placeholder="Search records"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="topbar-right">
            <button className="topbar-icon-btn" title="Notifications">
              <IconBell />
            </button>
            <div className="topbar-avatar" onClick={() => navigate('/profile')}>
              {firstName[0]}
            </div>
          </div>
        </header>

        <div className="dash-body">

          {/* Audit toast */}
          {auditToast && (
            <div className="audit-toast" style={{ marginBottom: '16px' }}>
              <IconBell /> {auditToast}
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
              { label: 'Profiles',      value: profiles.length, delta: 'family care' },
              { label: 'AI Modules',    value: 5,                delta: 'active' },
              { label: 'Encryption',   value: '256',             delta: 'bit AES' },
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
                    <span className="ai-badge"><IconSpark /> AI-Processed</span>
                  </div>
                </div>
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} accept="image/*,.pdf" />
                <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
                  <div className="upload-zone-icon"><IconUpload /></div>
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
              <DoctorsBriefPanel records={records} brief={aiBrief} loading={loadingBrief} onGenerate={handleGenerateBrief} />

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
                        try { riskScore = JSON.parse(record.extracted_text)?.risk_score || 0; } catch {}
                        const riskClass = riskScore >= 7 ? 'risk-high' : riskScore >= 4 ? 'risk-medium' : riskScore > 0 ? 'risk-low' : '';
                        return (
                          <div key={record.id} className={`timeline-record-card${riskClass ? ` ${riskClass}` : ''}`}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', gap: '12px', flexWrap: 'wrap' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{record.file_name}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                  {new Date(record.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                  {record.document_type && <span style={{ marginLeft: '6px', fontWeight: 500 }}>· {record.document_type}</span>}
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                {riskScore > 0 && (
                                  <span className={`risk-score-badge ${riskScore <= 3 ? 'risk-score-low' : riskScore <= 6 ? 'risk-score-medium' : 'risk-score-high'}`}>
                                    Risk {riskScore}/10
                                  </span>
                                )}
                                <a href={record.file_url} target="_blank" rel="noreferrer" className="record-action">View</a>
                              </div>
                            </div>
                            <StructuredHealthCard textData={record.extracted_text} />
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

              {/* Module 5: AI Sentry */}
              <HealthSentryPanel records={records} />

              {/* Health Identity */}
              <div className="health-card">
                <div className="section-head" style={{ marginBottom: '14px' }}>
                  <span className="section-title">Health Identity</span>
                  <span className="section-link" onClick={() => navigate('/profile')}>Edit</span>
                </div>
                {[
                  { label: 'Blood Group', value: activeProfile.blood_group },
                  { label: 'Age',         value: activeProfile.age },
                  { label: 'Weight',      value: activeProfile.weight_kg ? `${activeProfile.weight_kg} kg` : null },
                  { label: 'Height',      value: activeProfile.height_cm ? `${activeProfile.height_cm} cm` : null },
                  { label: 'Phone',       value: activeProfile.phone },
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
                    <IconUpload /> Upload Document
                  </button>
                  <button
                    onClick={handleGenerateShareToken}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'var(--amber-50)', border: '1px solid var(--amber-100)', borderRadius: 'var(--r-md)', color: 'var(--amber-600)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'background var(--t)' }}
                  >
                    <IconShare /> Share with Doctor
                  </button>
                  <button onClick={() => navigate('/profile')} className="secondary-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-start' }}>
                    <IconUser /> Manage Profile
                  </button>
                </div>
              </div>

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
              <span className="ai-badge"><IconSpark /> AI</span>
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
                <IconClock /> {qrMins}:{qrSecs}
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
    </div>
  );
}