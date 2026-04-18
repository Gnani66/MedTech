import React, { useEffect, useState, useRef } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import StructuredHealthCard from './StructuredHealthCard';
import './Dashboard.css';

/* ─── Inline SVG icons ─────────────────────────────────── */
const IconUpload = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const IconShare = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
);
const IconUser = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconLogout = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IconSpark = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
  </svg>
);
const IconMenu = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="12" x2="20" y2="12"/>
    <line x1="4" y1="6" x2="20" y2="6"/>
    <line x1="4" y1="18" x2="20" y2="18"/>
  </svg>
);

/* ─── Logo Mark ─────────────────────────────────────────── */
const MedBridgeLogo = ({ size = 18, color = 'white' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <rect x="13" y="4" width="6" height="24" rx="3" fill={color}/>
    <rect x="4" y="13" width="24" height="6" rx="3" fill={color}/>
  </svg>
);

function Dashboard() {
  const [user, setUser] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null);
  const [records, setRecords] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [aiBrief, setAiBrief] = useState("");
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [pendingRecord, setPendingRecord] = useState(null);
  const [editedText, setEditedText] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeToken, setActiveToken] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // --- 1. Load User and Profiles (Stable Implementation) ---
  useEffect(() => {
    async function initDashboard() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        navigate('/');
        return;
      }
      setUser(authUser);

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .or(`id.eq.${authUser.id},parent_id.eq.${authUser.id}`);

        if (error) throw error;

        if (data && data.length > 0) {
          setProfiles(data);
          const main = data.find(p => p.id === authUser.id);
          setActiveProfile(main || data[0]);
        } else {
          const fallback = { id: authUser.id, full_name: 'Patient' };
          setProfiles([fallback]);
          setActiveProfile(fallback);
        }
      } catch (err) {
        console.error("Dashboard init error:", err.message);
      }
    }
    initDashboard();
  }, [navigate]);

  // --- 2. Load Records for the Active Profile ---
  useEffect(() => {
    if (activeProfile) {
      async function fetchRecords() {
        const { data } = await supabase
          .from('medical_records')
          .select('*')
          .eq('patient_id', activeProfile.id)
          .order('created_at', { ascending: false });
        setRecords(data || []);
      }
      fetchRecords();
    }
  }, [activeProfile]);

  const groupRecordsByYear = (records) => {
    return records.reduce((groups, record) => {
      let dateObj;
      try {
        const parsed = JSON.parse(record.extracted_text);
        dateObj = parsed.date ? new Date(parsed.date) : new Date(record.created_at);
      } catch {
        dateObj = new Date(record.created_at);
      }
      const year = isNaN(dateObj.getFullYear()) ? new Date().getFullYear() : dateObj.getFullYear();
      if (!groups[year]) groups[year] = [];
      groups[year].push(record);
      return groups;
    }, {});
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !user) return;
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      await supabase.storage.from('medical_records').upload(filePath, file);
      const { data: { publicUrl } } = supabase.storage.from('medical_records').getPublicUrl(filePath);

      const aiResponse = await fetch('http://localhost:5001/api/analyze-prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: publicUrl })
      });
      const aiData = await aiResponse.json();

      setEditedText(aiData.extracted_text || "Analysis failed.");
      setPendingRecord({
        file_name: file.name,
        file_url: publicUrl,
        document_type: file.type.includes('pdf') ? 'PDF' : 'Image'
      });
    } catch (err) {
      console.error("AI Error:", err);
      alert("AI Processing Error.");
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmSave = async () => {
    try {
      const { data: newRecord, error: insertError } = await supabase
        .from('medical_records')
        .insert([{
          patient_id: activeProfile.id,
          file_name: pendingRecord.file_name,
          file_url: pendingRecord.file_url,
          document_type: pendingRecord.document_type,
          extracted_text: editedText
        }])
        .select();

      if (insertError) throw insertError;

      if (newRecord) {
        await supabase.from('audit_logs').insert([{
          record_id: newRecord[0].id,
          patient_id: activeProfile.id,
          action: 'patient_verified'
        }]);
        setRecords([newRecord[0], ...records]);
      }
      setPendingRecord(null);
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save.");
    }
  };

  const handleGenerateBrief = async () => {
    setLoadingBrief(true);
    try {
      const response = await fetch('http://localhost:5001/api/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records,
          patientName: activeProfile.full_name
        })
      });
      const data = await response.json();
      setAiBrief(data.summary);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBrief(false);
    }
  };

  const handleGenerateShareToken = async () => {
    try {
      const expires = new Date(Date.now() + 15 * 60000).toISOString();
      const { data, error: tokenError } = await supabase
        .from('share_tokens')
        .insert([{ patient_id: activeProfile.id, expires_at: expires }])
        .select();

      if (tokenError) throw tokenError;

      setActiveToken(data[0].id);
      setShowShareModal(true);
    } catch (err) {
      console.error(err);
      alert("Error sharing profile.");
    }
  };

  if (!user || !activeProfile) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-canvas)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px'
      }}>
        <div style={{
          width: '52px', height: '52px',
          background: 'linear-gradient(135deg, var(--moss-500), var(--clay-500))',
          borderRadius: '60% 40% 55% 45% / 45% 55% 40% 60%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'breathe 2s ease-in-out infinite',
          boxShadow: 'var(--shadow-soft)'
        }}>
          <MedBridgeLogo size={22} />
        </div>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '15px', color: 'var(--moss-600)', fontWeight: 600 }}>
          Initializing your vault…
        </p>
      </div>
    );
  }

  const groupedRecords = groupRecordsByYear(records);

  return (
    <div className="dash-root">

      {/* ── Sidebar overlay (mobile) ── */}
      <div
        className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ══════════════════════════════════════════
          SIDEBAR
          ══════════════════════════════════════════ */}
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">
            <MedBridgeLogo size={18} />
          </div>
          <div>
            <div className="sidebar-logo-name">MedBridge</div>
            <div className="sidebar-logo-sub">Health Vault</div>
          </div>
        </div>

        {/* Navigation */}
        <div className="sidebar-section">
          <div className="sidebar-section-label">Navigation</div>
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-item active">
            <span className="sidebar-item-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
            </span>
            Vault Dashboard
          </div>
          <div className="sidebar-item" onClick={() => navigate('/profile')}>
            <span className="sidebar-item-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </span>
            Health Profile
          </div>
          <div className="sidebar-item" onClick={handleGenerateShareToken}>
            <span className="sidebar-item-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            Secure Share QR
          </div>
        </nav>

        <div className="sidebar-section" style={{ marginTop: '12px' }}>
          <div className="sidebar-section-label">Profiles</div>
        </div>

        {/* Profile switcher in sidebar */}
        <div style={{ padding: '0 12px', position: 'relative', zIndex: 1 }}>
          {profiles.map(p => (
            <div
              key={p.id}
              className={`sidebar-item${activeProfile.id === p.id ? ' active' : ''}`}
              onClick={() => { setActiveProfile(p); setAiBrief(""); }}
            >
              <div style={{
                width: '26px', height: '26px', borderRadius: '60% 40% 55% 45% / 45% 55% 40% 60%',
                background: activeProfile.id === p.id
                  ? 'linear-gradient(135deg, var(--moss-400), var(--clay-400))'
                  : 'rgba(253,252,248,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '11px',
                color: 'white', flexShrink: 0
              }}>
                {p.full_name ? p.full_name[0] : 'P'}
              </div>
              {p.id === user.id ? 'Me' : p.full_name?.split(' ')[0]}
            </div>
          ))}
          <div className="sidebar-item" onClick={() => navigate('/profile')}>
            <div style={{
              width: '26px', height: '26px', borderRadius: '60% 40% 55% 45% / 45% 55% 40% 60%',
              border: '1.5px dashed rgba(253,252,248,0.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(253,252,248,0.4)', fontSize: '16px', flexShrink: 0
            }}>+</div>
            Add Family Member
          </div>
        </div>

        {/* Bottom: user + logout */}
        <div style={{ marginTop: 'auto', position: 'relative', zIndex: 1 }}>
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {activeProfile.full_name ? activeProfile.full_name[0] : 'P'}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{activeProfile.full_name || 'Patient'}</div>
              <div className="sidebar-user-role">{user.email}</div>
            </div>
          </div>
          <div style={{ padding: '4px 12px 16px' }}>
            <button
              className="logout-btn"
              onClick={() => { supabase.auth.signOut(); navigate('/'); }}
            >
              <IconLogout /> Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* ══════════════════════════════════════════
          MAIN CONTENT
          ══════════════════════════════════════════ */}
      <main className="dash-main">

        {/* ── Topbar ── */}
        <header className="topbar">
          <button className="topbar-hamburger" onClick={() => setSidebarOpen(o => !o)}>
            <IconMenu />
          </button>

          <div className="topbar-breadcrumb">
            <span className="topbar-breadcrumb-root">MedBridge</span>
            <span className="topbar-breadcrumb-sep">›</span>
            <span className="topbar-title">Health Vault</span>
          </div>

          <div className="topbar-search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            Search records…
          </div>

          <div className="topbar-right">
            <button className="topbar-icon-btn" title="Notifications">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span className="topbar-notif-dot" />
            </button>
            <button className="topbar-icon-btn" onClick={() => navigate('/profile')} title="Profile">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4"/>
                <path d="M20 21a8 8 0 1 0-16 0"/>
              </svg>
            </button>
            <div className="topbar-avatar" onClick={() => navigate('/profile')}>
              {activeProfile.full_name ? activeProfile.full_name[0] : 'P'}
            </div>
          </div>
        </header>

        {/* ── Page Body ── */}
        <div className="dash-body">

          {/* ── Welcome Hero ── */}
          <section className="dash-hero">
            <div className="dash-hero-text">
              <p className="dash-hero-eyebrow">Health Vault</p>
              <h1 className="dash-hero-title">
                Good to see you,<br/>
                {activeProfile.full_name?.split(' ')[0] || 'Patient'} 👋
              </h1>
              <p className="dash-hero-sub">
                {records.length} record{records.length !== 1 ? 's' : ''} in your vault · Keep it updated for the best care.
              </p>
              <div className="dash-hero-id">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                ID: {activeProfile.id?.substring(0, 12) || '—'}…
              </div>
            </div>
            <div className="dash-hero-actions">
              <button
                className="dash-hero-btn dash-hero-btn-primary"
                onClick={() => fileInputRef.current.click()}
              >
                <IconUpload /> Upload Record
              </button>
              <button
                className="dash-hero-btn dash-hero-btn-ghost"
                onClick={handleGenerateShareToken}
              >
                <IconShare /> Share QR
              </button>
            </div>
          </section>

          {/* ── Stats Strip ── */}
          <div className="stat-strip">
            <div className="stat-card">
              <div className="stat-icon stat-icon-navy">📋</div>
              <div className="stat-body">
                <div className="stat-label">Total Records</div>
                <div className="stat-value">{records.length}</div>
                <div className="stat-delta">in your vault</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-sage">👤</div>
              <div className="stat-body">
                <div className="stat-label">Profiles</div>
                <div className="stat-value">{profiles.length}</div>
                <div className="stat-delta stat-delta-up">family members</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-gold">🔒</div>
              <div className="stat-body">
                <div className="stat-label">Security</div>
                <div className="stat-value">256</div>
                <div className="stat-delta">bit encrypted</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-rose">✅</div>
              <div className="stat-body">
                <div className="stat-label">Verified</div>
                <div className="stat-value">{records.length}</div>
                <div className="stat-delta stat-delta-up">patient-verified</div>
              </div>
            </div>
          </div>

          {/* ── Profile Strip ── */}
          <div className="profile-strip">
            {profiles.map(p => (
              <div
                key={p.id}
                className="profile-avatar-wrap"
                onClick={() => { setActiveProfile(p); setAiBrief(""); }}
              >
                <div className={`profile-avatar${activeProfile.id === p.id ? ' active' : ''}`}>
                  {p.full_name ? p.full_name[0] : 'P'}
                </div>
                <span className="profile-avatar-label">
                  {p.id === user.id ? 'Me' : p.full_name?.split(' ')[0]}
                </span>
              </div>
            ))}
            <div className="profile-avatar-wrap" onClick={() => navigate('/profile')}>
              <div className="profile-add-btn">+</div>
              <span className="profile-avatar-label">Add</span>
            </div>
          </div>

          {/* ── Main Grid ── */}
          <div className="dash-grid">

            {/* ── Left: Records ── */}
            <div>
              {/* Upload zone */}
              <div className="records-card" style={{ marginBottom: '18px' }}>
                <div className="records-card-head">
                  <div className="section-head">
                    <span className="section-title">Upload a Document</span>
                  </div>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                  accept="image/*,.pdf"
                />
                <div
                  className="upload-zone"
                  onClick={() => fileInputRef.current.click()}
                >
                  <div className="upload-zone-icon">
                    <IconUpload />
                  </div>
                  {uploading ? (
                    <>
                      <div className="upload-zone-title">AI is reading your document…</div>
                      <div className="upload-zone-sub">Extracting medical data with care</div>
                    </>
                  ) : (
                    <>
                      <div className="upload-zone-title">
                        Drop a file for {activeProfile.full_name?.split(' ')[0]}
                      </div>
                      <div className="upload-zone-sub">
                        Prescriptions, lab reports, scans ·{' '}
                        <span>click to browse</span>
                      </div>
                    </>
                  )}
                </div>
                {uploading && (
                  <div className="upload-progress">
                    <div className="upload-progress-bar" style={{ width: '65%' }} />
                  </div>
                )}
                <div style={{ height: '16px' }} />
              </div>

              {/* AI Briefing */}
              <div className="ai-brief-panel" style={{ marginBottom: '18px' }}>
                <h4>
                  <IconSpark />
                  MedBridge AI Briefing
                </h4>
                {aiBrief ? (
                  <div className="ai-brief-result">{aiBrief}</div>
                ) : (
                  <button
                    onClick={handleGenerateBrief}
                    disabled={records.length === 0 || loadingBrief}
                    className="primary-btn"
                    style={{ fontSize: '13px', padding: '10px 22px' }}
                  >
                    {loadingBrief ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="btn-spinner" style={{
                          width: '13px', height: '13px',
                          border: '2px solid rgba(253,252,248,0.3)',
                          borderTopColor: '#FDFCF8',
                          borderRadius: '50%',
                          animation: 'spin 0.65s linear infinite',
                          display: 'inline-block'
                        }} />
                        Synthesizing…
                      </span>
                    ) : 'Generate Doctor Briefing'}
                  </button>
                )}
              </div>

              {/* Timeline */}
              <div className="section-head">
                <span className="section-title">Clinical Timeline</span>
                <span className="section-link">{records.length} records</span>
              </div>

              <div className="timeline-wrapper">
                {Object.entries(groupedRecords)
                  .sort(([a], [b]) => b - a)
                  .map(([year, yearRecords]) => (
                    <div key={year} style={{ marginBottom: '36px', position: 'relative' }}>
                      <div className="timeline-dot" />
                      <div className="timeline-year">{year}</div>
                      {yearRecords.map(record => (
                        <div key={record.id} className="timeline-record-card">
                          <div style={{
                            display: 'flex', justifyContent: 'space-between',
                            alignItems: 'center', marginBottom: '14px'
                          }}>
                            <div>
                              <div style={{
                                fontSize: '14px', fontWeight: 700,
                                color: 'var(--text-primary)',
                                fontFamily: 'var(--font-display)'
                              }}>
                                {record.file_name}
                              </div>
                              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {new Date(record.created_at).toLocaleDateString('en-IN', {
                                  day: 'numeric', month: 'long', year: 'numeric'
                                })}
                              </div>
                            </div>
                            <a
                              href={record.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="record-action"
                            >
                              Original ↗
                            </a>
                          </div>
                          <StructuredHealthCard textData={record.extracted_text} />
                        </div>
                      ))}
                    </div>
                  ))
                }
                {records.length === 0 && (
                  <div className="empty-state">
                    <div className="empty-state-icon">🌿</div>
                    <div className="empty-state-title">Your vault is empty</div>
                    <div className="empty-state-sub">
                      Upload your first medical record to begin building your health timeline.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Right Column ── */}
            <div className="right-col">

              {/* Health Profile Summary */}
              <div className="health-card">
                <div className="section-head" style={{ marginBottom: '14px' }}>
                  <span className="section-title">Health Identity</span>
                  <span className="section-link" onClick={() => navigate('/profile')}>Edit</span>
                </div>
                <div className="health-row">
                  <div className="health-row-label"><span className="health-row-icon">🩸</span> Blood Group</div>
                  <div className="health-row-value">{activeProfile.blood_group || '—'}</div>
                </div>
                <div className="health-row">
                  <div className="health-row-label"><span className="health-row-icon">🎂</span> Age</div>
                  <div className="health-row-value">{activeProfile.age || '—'}</div>
                </div>
                <div className="health-row">
                  <div className="health-row-label"><span className="health-row-icon">⚖️</span> Weight</div>
                  <div className="health-row-value">{activeProfile.weight_kg ? `${activeProfile.weight_kg} kg` : '—'}</div>
                </div>
                <div className="health-row">
                  <div className="health-row-label"><span className="health-row-icon">📏</span> Height</div>
                  <div className="health-row-value">{activeProfile.height_cm ? `${activeProfile.height_cm} cm` : '—'}</div>
                </div>
                <div className="health-row">
                  <div className="health-row-label"><span className="health-row-icon">📞</span> Contact</div>
                  <div className="health-row-value">{activeProfile.phone || '—'}</div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="health-card">
                <div className="section-head" style={{ marginBottom: '14px' }}>
                  <span className="section-title">Quick Actions</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    onClick={() => fileInputRef.current.click()}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '12px 16px',
                      background: 'var(--moss-50)',
                      border: '1.5px solid var(--moss-200)',
                      borderRadius: 'var(--r-full)',
                      color: 'var(--moss-600)',
                      fontWeight: 700, fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all var(--t)'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--moss-100)'}
                    onMouseOut={e => e.currentTarget.style.background = 'var(--moss-50)'}
                  >
                    <IconUpload /> Upload Document
                  </button>
                  <button
                    onClick={handleGenerateShareToken}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '12px 16px',
                      background: 'var(--clay-100)',
                      border: '1.5px solid var(--clay-300)',
                      borderRadius: 'var(--r-full)',
                      color: 'var(--clay-700)',
                      fontWeight: 700, fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all var(--t)'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--clay-200)'}
                    onMouseOut={e => e.currentTarget.style.background = 'var(--clay-100)'}
                  >
                    <IconShare /> Share with Doctor
                  </button>
                  <button
                    onClick={() => navigate('/profile')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '12px 16px',
                      background: 'var(--bg-subtle)',
                      border: '1.5px solid var(--border-soft)',
                      borderRadius: 'var(--r-full)',
                      color: 'var(--text-secondary)',
                      fontWeight: 700, fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all var(--t)'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--bg-muted)'}
                    onMouseOut={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                  >
                    <IconUser /> Manage Profile
                  </button>
                </div>
              </div>

              {/* Trust & Security */}
              <div style={{
                background: 'linear-gradient(135deg, var(--moss-800) 0%, var(--moss-700) 100%)',
                borderRadius: 'var(--r-xl)',
                padding: '22px 20px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'radial-gradient(ellipse 200px 200px at 100% 100%, rgba(193,140,93,0.15), transparent)',
                  pointerEvents: 'none'
                }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--moss-300)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
                    Security Status
                  </div>
                  {[
                    { icon: '🔐', label: '256-bit AES encryption' },
                    { icon: '✅', label: 'HIPAA compliant storage' },
                    
                  ].map(item => (
                    <div key={item.label} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '8px 0',
                      borderBottom: '1px solid rgba(253,252,248,0.07)',
                      fontSize: '12.5px', color: 'rgba(253,252,248,0.65)', fontWeight: 500
                    }}>
                      <span style={{ fontSize: '14px' }}>{item.icon}</span>
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* ══════════════════════════════════════════
          VERIFY EXTRACTION MODAL
          ══════════════════════════════════════════ */}
      {pendingRecord && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Verify Medical Extraction</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px', marginBottom: '16px' }}>
              Review and correct the AI-extracted text before saving to your vault.
            </p>
            <textarea
              className="textarea-field"
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
            />
            <div className="button-group">
              <button onClick={() => setPendingRecord(null)} className="secondary-btn">
                Cancel
              </button>
              <button onClick={handleConfirmSave} className="primary-btn" style={{ flex: 1 }}>
                Confirm &amp; Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          SHARE QR MODAL
          ══════════════════════════════════════════ */}
      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <div style={{
              width: '48px', height: '48px',
              background: 'linear-gradient(135deg, var(--moss-500), var(--clay-500))',
              borderRadius: '60% 40% 55% 45% / 45% 55% 40% 60%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px', boxShadow: 'var(--shadow-soft)'
            }}>
              <MedBridgeLogo size={18} />
            </div>
            <h3>Secure Sharing QR</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '6px 0 20px' }}>
              Valid for 15 minutes · Share with your doctor
            </p>
            <div style={{
              padding: '24px',
              background: 'var(--bg-subtle)',
              borderRadius: 'var(--r-lg)',
              border: '1.5px solid var(--border-soft)',
              display: 'inline-block',
              marginBottom: '20px'
            }}>
              <QRCodeSVG value={`${window.location.origin}/shared/token/${activeToken}`} size={180} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowShareModal(false)} className="secondary-btn">
                Close
              </button>
              <button
                onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/shared/token/${activeToken}`)}
                className="primary-btn"
                style={{ flex: 1 }}
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

export default Dashboard;