import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './App.css';

/* ─── Icons ──────────────────────────────────────────────── */
const IconMail = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);
const IconLock = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const IconEye = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const IconEyeOff = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
    <line x1="2" y1="2" x2="22" y2="22"/>
  </svg>
);
const IconArrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/>
    <path d="m12 5 7 7-7 7"/>
  </svg>
);
const IconAlert = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);
const IconShield = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const MedixiaLogo = ({ size = 20, color = 'white' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <rect x="13" y="4" width="6" height="24" rx="3" fill={color}/>
    <rect x="4" y="13" width="24" height="6" rx="3" fill={color}/>
  </svg>
);

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const AppleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.14-2.17 1.27-2.14 3.79.03 3.01 2.62 4.01 2.65 4.02l-.06.24-.2.57zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
);

export default function Signup() {
  const [formData, setFormData]         = useState({ email: '', password: '' });
  const [showPass, setShowPass]         = useState(false);
  const [loading, setLoading]           = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess]           = useState('');
  const navigate = useNavigate();

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSignup = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccess('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });
      if (error) {
        setErrorMessage(error.message);
      } else {
        setSuccess('Account created successfully! Check your email or try signing in.');
        setTimeout(() => navigate('/'), 3000);
      }
    } catch {
      setErrorMessage('Connection failed. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };
  const handleAppleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'apple' });
  };

  return (
    <div className="auth-root">
      <div className="auth-hero">
        <div className="auth-hero-orb auth-hero-orb-1" />
        <div className="auth-hero-orb auth-hero-orb-2" />
        <svg className="auth-hero-wave" viewBox="0 0 800 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polyline
            points="0,50 60,50 80,20 100,80 120,50 160,50 180,10 200,90 220,50 280,50 300,30 320,70 340,50 400,50 420,15 440,85 460,50 540,50 560,35 580,65 600,50 680,50 700,25 720,75 740,50 800,50"
            stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
        <div className="auth-hero-logo">
          <div className="auth-hero-logo-mark"><MedixiaLogo size={20} /></div>
          <div>
            <div className="auth-hero-logo-name">MedBridge</div>
            <div className="auth-hero-logo-tag">Patient Portal</div>
          </div>
        </div>
        <div className="auth-hero-content">
          <p className="auth-hero-eyebrow">Start your journey</p>
          <h1 className="auth-hero-title">Create a secure<br/>Health Identity.</h1>
          <p className="auth-hero-subtitle">
            Take full ownership of your medical records and securely share them with your doctors, instantly.
          </p>
        </div>
      </div>
      <div className="auth-panel">
        <div className="auth-panel-top">
          <p className="auth-panel-eyebrow">Join MedBridge</p>
          <h2 className="auth-panel-title">Create an account</h2>
          <p className="auth-panel-sub">It only takes a minute to secure your health data.</p>
        </div>
        <div className="auth-social-row">
          <button className="btn-outline" onClick={handleGoogleLogin} type="button">
            <GoogleIcon /> Sign up with Google
          </button>
          <button className="btn-outline" onClick={handleAppleLogin} type="button">
            <AppleIcon /> Apple
          </button>
        </div>
        <div className="auth-divider">or continue with email</div>

        {success ? (
          <div style={{ padding: '20px', background: 'var(--mint-50)', color: 'var(--moss-700)', borderRadius: '12px', border: '1px solid var(--mint-200)', textAlign: 'center', fontWeight: '500' }}>
            {success}
          </div>
        ) : (
          <form onSubmit={handleSignup} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email address</label>
              <div className="input-wrap">
                <span className="input-icon"><IconMail /></span>
                <input id="email" name="email" type="email" className="form-input" placeholder="you@example.com" value={formData.email} onChange={handleChange} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password (min 6 characters)</label>
              <div className="input-wrap">
                <span className="input-icon"><IconLock /></span>
                <input id="password" name="password" type={showPass ? 'text' : 'password'} className="form-input" placeholder="••••••••••" value={formData.password} onChange={handleChange} required minLength={6} />
                <button type="button" className="input-toggle-btn" onClick={() => setShowPass(p => !p)}>
                  {showPass ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </div>
            {errorMessage && (
              <div className="form-error"><IconAlert /> {errorMessage}</div>
            )}
            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '20px' }}>
              {loading ? <><span className="btn-spinner" /> Creating account…</> : <>Create Account <IconArrow /></>}
            </button>
          </form>
        )}

        <p className="auth-footer">Already have an account? <Link to="/">Sign in here</Link></p>
      </div>
    </div>
  );
}
