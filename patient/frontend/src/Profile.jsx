import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

/* ─── Logo ─────────────────────────────────────────────── */
const MedBridgeLogo = ({ size = 18, color = 'white' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <rect x="13" y="4" width="6" height="24" rx="3" fill={color}/>
    <rect x="4" y="13" width="24" height="6" rx="3" fill={color}/>
  </svg>
);

const IconBack = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
  </svg>
);
const IconSave = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
);
const IconFamily = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [profile, setProfile] = useState({
    full_name: '', phone: '', age: '', gender: '',
    blood_group: '', weight_kg: '', height_cm: '',
    allergies: [], chronic_conditions: [],
    emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: ''
  });
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [addingMember, setAddingMember]       = useState(false);
  const [newMember, setNewMember]             = useState({ full_name: '', age: '', gender: '' });
  
  const [otherAllergy, setOtherAllergy] = useState('');
  const [otherCondition, setOtherCondition] = useState('');

  const commonAllergies = ["Penicillin", "Sulfa Drugs", "Peanuts", "Latex", "Pollen", "Dust Mites", "Animal Dander", "None"];
  const commonConditions = ["Hypertension", "Type 1 Diabetes", "Type 2 Diabetes", "Asthma", "Thyroid Disorder", "None"];

  const toggleArrayItem = (field, item) => {
    setProfile(p => {
      const arr = p[field] || [];
      if (item === "None") return { ...p, [field]: ["None"] };
      const newArr = arr.includes(item) ? arr.filter(i => i !== item) : [...arr.filter(i => i !== "None"), item];
      return { ...p, [field]: newArr };
    });
  };

  const handleAddOther = (field, value, setter) => {
    if (!value.trim()) return;
    setProfile(p => {
      const arr = p[field] || [];
      const newArr = arr.includes(value.trim()) ? arr : [...arr.filter(i => i !== "None"), value.trim()];
      return { ...p, [field]: newArr };
    });
    setter('');
  };

  const navigate = useNavigate();

  const handleAddMember = async () => {
    if (!newMember.full_name) return alert('Name is required');
    setAddingMember(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Don't set 'id' explicitly — the table's `id` column references auth.users(id)
      // so a random UUID will cause a 409 FK conflict. Let Supabase auto-generate it.
      const { data: inserted, error } = await supabase.from('user_profiles').insert([{
        parent_id: user.id,
        full_name: newMember.full_name,
        age: newMember.age === '' || newMember.age == null ? null : parseInt(newMember.age, 10),
        gender: newMember.gender,
        updated_at: new Date().toISOString(),
      }]).select();
      
      if (error) throw error;
      
      alert(`Successfully added ${newMember.full_name} to your Family Vault.`);
      setShowFamilyModal(false);
      setNewMember({ full_name: '', age: '', gender: '' });
      // Dashboard will auto-fetch the updated profiles on mount.
    } catch (err) {
      alert("Failed to add family member: " + err.message);
    } finally {
      setAddingMember(false);
    }
  };

  useEffect(() => {
    async function loadProfileData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle(); // 👈 Fixes 406 Not Acceptable when 0 rows are found
          if (error && error.code !== 'PGRST116') throw error;
          if (data) {
            setProfile({
              ...data,
              allergies: data.allergies || [],
              chronic_conditions: data.chronic_conditions || [],
              emergency_contact_name: data.emergency_contact_name || '',
              emergency_contact_phone: data.emergency_contact_phone || '',
              emergency_contact_relation: data.emergency_contact_relation || ''
            });
          }
        }
      } catch (err) {
        console.error("Error loading profile:", err.message);
      } finally {
        setLoading(false);
      }
    }
    loadProfileData();
  }, []);

  const updateProfile = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from('user_profiles').upsert({
        id: user.id,
        ...profile,
        age: profile.age === '' || profile.age == null ? null : parseInt(profile.age, 10),
        weight_kg: profile.weight_kg === '' || profile.weight_kg == null ? null : parseInt(profile.weight_kg, 10),
        height_cm: profile.height_cm === '' || profile.height_cm == null ? null : parseInt(profile.height_cm, 10),
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      alert("Medical Profile Synchronized!");
    } catch (err) {
      alert("Update failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-canvas)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        fontFamily: 'var(--font-body)'
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
          Accessing Secure Medical Vault…
        </p>
      </div>
    );
  }

  const fieldStyle = {
    width: '100%',
    padding: '12px 16px',
    marginTop: '7px',
    borderRadius: '9999px',
    border: '1.5px solid var(--border)',
    background: 'rgba(255,255,255,0.7)',
    boxSizing: 'border-box',
    fontSize: '14px',
    fontFamily: 'var(--font-body)',
    fontWeight: 500,
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'border-color 280ms, box-shadow 280ms'
  };

  const selectStyle = {
    ...fieldStyle,
    borderRadius: '9999px',
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239A9A8C' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 16px center',
    paddingRight: '40px'
  };

  const labelStyle = {
    fontSize: '10.5px',
    color: 'var(--text-muted)',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em'
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-canvas)',
      fontFamily: 'var(--font-body)',
      padding: '0 0 60px'
    }}>

      {/* ── Top bar ── */}
      <div style={{
        background: 'rgba(253,252,248,0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(222,216,207,0.5)',
        padding: '0 24px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px',
            background: 'var(--bg-subtle)',
            border: '1.5px solid var(--border-soft)',
            borderRadius: '9999px',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 280ms'
          }}
          onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--moss-300)'; e.currentTarget.style.color = 'var(--moss-600)'; }}
          onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border-soft)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <IconBack /> Dashboard
        </button>

        {/* Centered brand */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px',
            background: 'linear-gradient(135deg, var(--moss-500), var(--clay-500))',
            borderRadius: '60% 40% 55% 45% / 45% 55% 40% 60%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-soft)'
          }}>
            <MedBridgeLogo size={14} />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            MedBridge
          </span>
        </div>

        <div style={{ width: '100px' }} /> {/* spacer balance */}
      </div>

      {/* ── Main content ── */}
      <div style={{ maxWidth: '640px', margin: '36px auto 0', padding: '0 20px' }}>

        {/* Hero header */}
        <div style={{
          background: 'var(--moss-800)',
          borderRadius: '28px',
          padding: '32px 36px',
          marginBottom: '24px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse 400px 300px at 10% -10%, rgba(93,112,82,0.4) 0%, transparent 60%), radial-gradient(ellipse 300px 300px at 100% 100%, rgba(193,140,93,0.15) 0%, transparent 60%)',
            pointerEvents: 'none'
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{
              fontSize: '10.5px', fontWeight: 700, color: 'var(--moss-300)',
              letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '10px',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <span style={{ width: '18px', height: '1.5px', background: 'var(--moss-400)', display: 'inline-block', borderRadius: '999px' }} />
              Health Identity
            </p>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.5rem, 3vw, 2rem)',
              fontWeight: 700,
              color: '#FDFCF8',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              marginBottom: '8px'
            }}>
              Patient Clinical Profile
            </h1>
            <p style={{ fontSize: '13.5px', color: 'rgba(253,252,248,0.48)', lineHeight: 1.65 }}>
              Your secure medical identity — shared only when you choose.
            </p>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(253,252,248,0.07)',
              border: '1px solid rgba(253,252,248,0.12)',
              borderRadius: '9999px',
              padding: '5px 14px',
              fontSize: '11.5px', fontWeight: 600,
              color: 'rgba(253,252,248,0.60)',
              marginTop: '16px',
              fontFamily: 'var(--font-mono)', letterSpacing: '0.06em'
            }}>
              Universal Health ID: {profile.id?.substring(0, 8) || 'Pending…'}
            </div>
          </div>
        </div>

        {/* Form card */}
        <div style={{
          background: 'var(--bg-surface)',
          borderRadius: '28px',
          padding: '36px',
          boxShadow: 'var(--shadow-soft)',
          border: '1px solid rgba(222,216,207,0.5)',
          marginBottom: '20px'
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            marginBottom: '28px', paddingBottom: '20px',
            borderBottom: '1px solid var(--border-ghost)'
          }}>
            <div style={{
              width: '38px', height: '38px',
              background: 'var(--moss-50)',
              border: '1.5px solid var(--moss-200)',
              borderRadius: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--moss-500)'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                Personal Information
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>
                Used for clinical identification
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

            {/* Full Name — full width */}
            <div style={{ gridColumn: '1 / span 2' }}>
              <label style={labelStyle}>Full Legal Name</label>
              <input
                type="text"
                value={profile.full_name || ''}
                onChange={e => setProfile({ ...profile, full_name: e.target.value })}
                style={fieldStyle}
                placeholder="Name as per Aadhaar / ID"
                onFocus={e => { e.target.style.borderColor = 'var(--moss-400)'; e.target.style.boxShadow = '0 0 0 4px rgba(93,112,82,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Phone */}
            <div>
              <label style={labelStyle}>Primary Contact</label>
              <input
                type="text"
                value={profile.phone || ''}
                onChange={e => setProfile({ ...profile, phone: e.target.value })}
                style={fieldStyle}
                placeholder="+91 98765 43210"
                onFocus={e => { e.target.style.borderColor = 'var(--moss-400)'; e.target.style.boxShadow = '0 0 0 4px rgba(93,112,82,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Age */}
            <div>
              <label style={labelStyle}>Age</label>
              <input
                type="number"
                value={profile.age || ''}
                onChange={e => setProfile({ ...profile, age: e.target.value })}
                style={fieldStyle}
                placeholder="e.g. 28"
                onFocus={e => { e.target.style.borderColor = 'var(--moss-400)'; e.target.style.boxShadow = '0 0 0 4px rgba(93,112,82,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Blood Group */}
            <div>
              <label style={labelStyle}>Blood Group</label>
              <select
                value={profile.blood_group || ''}
                onChange={e => setProfile({ ...profile, blood_group: e.target.value })}
                style={selectStyle}
                onFocus={e => { e.target.style.borderColor = 'var(--moss-400)'; e.target.style.boxShadow = '0 0 0 4px rgba(93,112,82,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
              >
                <option value="">Select type</option>
                <option value="A+">A+</option>
                <option value="B+">B+</option>
                <option value="O+">O+</option>
                <option value="AB+">AB+</option>
                <option value="A-">A-</option>
                <option value="B-">B-</option>
                <option value="O-">O-</option>
                <option value="AB-">AB-</option>
              </select>
            </div>

            {/* Gender */}
            <div>
              <label style={labelStyle}>Biological Gender</label>
              <select
                value={profile.gender || ''}
                onChange={e => setProfile({ ...profile, gender: e.target.value })}
                style={selectStyle}
                onFocus={e => { e.target.style.borderColor = 'var(--moss-400)'; e.target.style.boxShadow = '0 0 0 4px rgba(93,112,82,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Weight */}
            <div>
              <label style={labelStyle}>Weight (kg)</label>
              <input
                type="number"
                value={profile.weight_kg || ''}
                onChange={e => setProfile({ ...profile, weight_kg: e.target.value })}
                style={fieldStyle}
                placeholder="e.g. 70"
                onFocus={e => { e.target.style.borderColor = 'var(--moss-400)'; e.target.style.boxShadow = '0 0 0 4px rgba(93,112,82,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Height */}
            <div>
              <label style={labelStyle}>Height (cm)</label>
              <input
                type="number"
                value={profile.height_cm || ''}
                onChange={e => setProfile({ ...profile, height_cm: e.target.value })}
                style={fieldStyle}
                placeholder="e.g. 170"
                onFocus={e => { e.target.style.borderColor = 'var(--moss-400)'; e.target.style.boxShadow = '0 0 0 4px rgba(93,112,82,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          {/* ── Advanced Form Sections ── */}
          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(222,216,207,0.5)' }}>
            
            {/* Allergies */}
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Allergies</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                {commonAllergies.map(item => {
                  const isSelected = (profile.allergies || []).includes(item);
                  return (
                    <div
                      key={item}
                      onClick={() => toggleArrayItem('allergies', item)}
                      style={{
                        padding: '6px 12px', borderRadius: 'var(--r-full)', fontSize: '13px', fontWeight: 600,
                        cursor: 'pointer', border: '1px solid',
                        background: isSelected ? 'var(--moss-600)' : 'var(--bg-subtle)',
                        color: isSelected ? '#fff' : 'var(--text-secondary)',
                        borderColor: isSelected ? 'var(--moss-600)' : 'var(--border)'
                      }}
                    >
                      {item}
                    </div>
                  );
                })}
                {/* Render any non-common custom allergies the user added */}
                {(profile.allergies || []).filter(a => !commonAllergies.includes(a)).map(item => (
                  <div
                    key={item}
                    onClick={() => toggleArrayItem('allergies', item)}
                    style={{
                      padding: '6px 12px', borderRadius: 'var(--r-full)', fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer', border: '1px solid var(--moss-600)', background: 'var(--moss-600)', color: '#fff'
                    }}
                  >
                    {item} ✕
                  </div>
                ))}
              </div>
              <input
                type="text"
                placeholder="Other allergy (press enter to add)"
                value={otherAllergy}
                onChange={e => setOtherAllergy(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddOther('allergies', otherAllergy, setOtherAllergy); }}
                style={{ ...fieldStyle, marginTop: '8px' }}
                onFocus={e => { e.target.style.borderColor = 'var(--moss-400)'; e.target.style.boxShadow = '0 0 0 4px rgba(93,112,82,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Chronic Conditions */}
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Chronic Conditions</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                {commonConditions.map(item => {
                  const isSelected = (profile.chronic_conditions || []).includes(item);
                  return (
                    <div
                      key={item}
                      onClick={() => toggleArrayItem('chronic_conditions', item)}
                      style={{
                        padding: '6px 12px', borderRadius: 'var(--r-full)', fontSize: '13px', fontWeight: 600,
                        cursor: 'pointer', border: '1px solid',
                        background: isSelected ? 'var(--moss-600)' : 'var(--bg-subtle)',
                        color: isSelected ? '#fff' : 'var(--text-secondary)',
                        borderColor: isSelected ? 'var(--moss-600)' : 'var(--border)'
                      }}
                    >
                      {item}
                    </div>
                  );
                })}
                {(profile.chronic_conditions || []).filter(c => !commonConditions.includes(c)).map(item => (
                  <div
                    key={item}
                    onClick={() => toggleArrayItem('chronic_conditions', item)}
                    style={{
                      padding: '6px 12px', borderRadius: 'var(--r-full)', fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer', border: '1px solid var(--moss-600)', background: 'var(--moss-600)', color: '#fff'
                    }}
                  >
                    {item} ✕
                  </div>
                ))}
              </div>
              <input
                type="text"
                placeholder="Other condition (press enter to add)"
                value={otherCondition}
                onChange={e => setOtherCondition(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddOther('chronic_conditions', otherCondition, setOtherCondition); }}
                style={{ ...fieldStyle, marginTop: '8px' }}
                onFocus={e => { e.target.style.borderColor = 'var(--moss-400)'; e.target.style.boxShadow = '0 0 0 4px rgba(93,112,82,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Emergency Contact */}
            <h3 style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '12px' }}>Emergency Contact</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Contact Name</label>
                <input
                  type="text"
                  value={profile.emergency_contact_name || ''}
                  onChange={e => setProfile({ ...profile, emergency_contact_name: e.target.value })}
                  style={fieldStyle}
                  placeholder="e.g. Jane Doe"
                  onFocus={e => { e.target.style.borderColor = 'var(--moss-400)'; e.target.style.boxShadow = '0 0 0 4px rgba(93,112,82,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              <div>
                <label style={labelStyle}>Phone Number</label>
                <input
                  type="text"
                  value={profile.emergency_contact_phone || ''}
                  onChange={e => setProfile({ ...profile, emergency_contact_phone: e.target.value })}
                  style={fieldStyle}
                  placeholder="e.g. 9876543210"
                  onFocus={e => { e.target.style.borderColor = 'var(--moss-400)'; e.target.style.boxShadow = '0 0 0 4px rgba(93,112,82,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              <div>
                <label style={labelStyle}>Relation</label>
                <input
                  type="text"
                  value={profile.emergency_contact_relation || ''}
                  onChange={e => setProfile({ ...profile, emergency_contact_relation: e.target.value })}
                  style={fieldStyle}
                  placeholder="e.g. Spouse"
                  onFocus={e => { e.target.style.borderColor = 'var(--moss-400)'; e.target.style.boxShadow = '0 0 0 4px rgba(93,112,82,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={updateProfile}
            disabled={saving}
            style={{
              marginTop: '32px',
              width: '100%',
              padding: '15px 28px',
              background: saving ? 'var(--moss-400)' : 'var(--moss-500)',
              color: '#FDFCF8',
              border: 'none',
              borderRadius: '9999px',
              fontFamily: 'var(--font-body)',
              fontWeight: 700,
              fontSize: '15px',
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: 'var(--shadow-soft)',
              transition: 'all 280ms'
            }}
            onMouseOver={e => { if (!saving) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px -4px rgba(93,112,82,0.38)'; } }}
            onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-soft)'; }}
          >
            {saving ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '14px', height: '14px',
                  border: '2px solid rgba(253,252,248,0.3)',
                  borderTopColor: '#FDFCF8',
                  borderRadius: '50%',
                  animation: 'spin 0.65s linear infinite',
                  display: 'inline-block'
                }} />
                Saving…
              </span>
            ) : (
              <><IconSave /> Update Clinical Identity</>
            )}
          </button>
        </div>

        {/* Family Dependents Card */}
        <div style={{
          background: 'var(--bg-surface)',
          borderRadius: '28px',
          padding: '30px 36px',
          boxShadow: 'var(--shadow-soft)',
          border: '1px solid rgba(222,216,207,0.5)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Subtle organic blob decoration */}
          <div style={{
            position: 'absolute',
            width: '180px', height: '180px',
            background: 'radial-gradient(circle, rgba(93,112,82,0.07) 0%, transparent 70%)',
            borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
            right: '-40px', top: '-40px',
            pointerEvents: 'none'
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{
                width: '38px', height: '38px',
                background: 'var(--clay-100)',
                border: '1.5px solid var(--clay-300)',
                borderRadius: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--clay-600)'
              }}>
                <IconFamily />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                  Manage Dependents
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>
                  Family Health Vault
                </div>
              </div>
            </div>

            <p style={{
              fontSize: '13.5px', color: 'var(--text-tertiary)',
              lineHeight: '1.7', marginBottom: '20px'
            }}>
              Add family members — children or elderly parents — to manage their health records under one unified, secure vault.
            </p>

            <button
              onClick={() => setShowFamilyModal(true)}
              style={{
                padding: '12px 24px',
                borderRadius: '9999px',
                border: '1.5px solid var(--clay-300)',
                background: 'var(--clay-100)',
                color: 'var(--clay-700)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 700,
                fontFamily: 'var(--font-body)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 280ms'
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'var(--clay-200)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'var(--clay-100)'; e.currentTarget.style.transform = 'none'; }}
            >
              <IconFamily /> + Add New Family Member
            </button>
          </div>
        </div>

      </div>

      {/* ── Family Modal ── */}
      {showFamilyModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,15,12,0.50)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200, padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-surface)',
            borderRadius: '24px',
            width: '100%', maxWidth: '440px',
            padding: '32px',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border)',
            position: 'relative'
          }}>
            <button
               onClick={() => setShowFamilyModal(false)}
               style={{ position: 'absolute', top: '24px', right: '28px', color: 'var(--text-muted)', fontSize: '24px', cursor: 'pointer' }}
            >×</button>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Add Family Member</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Creates a dependent profile linked to your vault.</p>

            <label style={labelStyle}>Full Name</label>
            <input type="text" style={{...fieldStyle, marginBottom: '16px'}} value={newMember.full_name} onChange={e => setNewMember({...newMember, full_name: e.target.value})} placeholder="Dependent's Name" />
            
            <label style={labelStyle}>Age</label>
            <input type="number" style={{...fieldStyle, marginBottom: '16px'}} value={newMember.age} onChange={e => setNewMember({...newMember, age: e.target.value})} placeholder="e.g. 8" />

            <label style={labelStyle}>Gender</label>
            <select style={{...selectStyle, marginBottom: '24px'}} value={newMember.gender} onChange={e => setNewMember({...newMember, gender: e.target.value})}>
               <option value="">Select</option>
               <option value="Male">Male</option>
               <option value="Female">Female</option>
               <option value="Other">Other</option>
            </select>

            <button
               onClick={handleAddMember}
               disabled={addingMember}
               style={{
                  width: '100%', padding: '14px', borderRadius: '9999px',
                  background: addingMember ? 'var(--moss-400)' : 'var(--moss-500)',
                  color: 'white', fontWeight: 700, fontSize: '14px', cursor: addingMember ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none'
               }}
            >
               {addingMember ? 'Adding...' : 'Add Dependent Profile'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}