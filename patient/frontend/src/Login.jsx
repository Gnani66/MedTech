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
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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

/* ─── Logo Mark ──────────────────────────────────────────── */
const MedixiaLogo = ({ size = 20, color = 'white' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <rect x="13" y="4" width="6" height="24" rx="3" fill={color}/>
    <rect x="4" y="13" width="24" height="6" rx="3" fill={color}/>
  </svg>
);

/* ─── Social icons ───────────────────────────────────────── */
const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);



/* ═══════════════════════════════════════════════════════════
   LOGIN PAGE
   ═══════════════════════════════════════════════════════════ */
const Login = () => {
  const [formData, setFormData]         = useState({ email: '', password: '' });
  const [showPass, setShowPass]         = useState(false);
  const [remember, setRemember]         = useState(false);
  const [loading, setLoading]           = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (error) {
        setErrorMessage(error.message);
      } else {
        navigate('/dashboard');
      }
    } catch {
      setErrorMessage('Connection failed. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) console.error('Google OAuth error:', error.message);
  };

  return (
    <div className="auth-root">

      {/* ── Hero Panel (left) ─────────────────────────── */}
      <div className="auth-hero">
        {/* Atmospheric orbs */}
        <div className="auth-hero-orb auth-hero-orb-1" />
        <div className="auth-hero-orb auth-hero-orb-2" />

        {/* Logo */}
        <div className="auth-hero-logo">
          <div className="auth-hero-logo-mark">
            <MedixiaLogo size={20} />
          </div>
          <div>
            <div className="auth-hero-logo-name">MedBridge</div>
            <div className="auth-hero-logo-tag">Patient Portal</div>
          </div>
        </div>

        {/* Center content */}
        <div className="auth-hero-content">
          <p className="auth-hero-eyebrow">Trusted Healthcare</p>
          <h1 className="auth-hero-title">
            Your health,<br/>
            <em>secured</em> &amp;<br/>
            always near.
          </h1>
          <p className="auth-hero-subtitle">
            Access your complete medical history, upcoming appointments, and health insights — all in one secure, private space.
          </p>
        </div>
      </div>

      {/* ── Form Panel (right) ────────────────────────── */}
      <div className="auth-panel">

        {/* Mobile logo */}
        <div className="auth-panel-logo">
          <div className="auth-panel-logo-mark">
            <MedixiaLogo size={18} />
          </div>
          <span className="auth-panel-logo-name">Medixia</span>
        </div>

        <div className="auth-panel-top">
          <p className="auth-panel-eyebrow">Welcome back</p>
          <h2 className="auth-panel-title">Sign in to your account</h2>
          <p className="auth-panel-sub">
            Enter your credentials to securely access your health portal.
          </p>
        </div>

        {/* Social sign-in */}
        <div className="auth-social-row">
          <button className="btn-outline" onClick={handleGoogleLogin} type="button" style={{ flex: '1 1 100%' }}>
            <GoogleIcon /> Continue with Google
          </button>
        </div>

        <div className="auth-divider">or continue with email</div>

        <form onSubmit={handleLogin} noValidate>

          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email address</label>
            <div className="input-wrap">
              <span className="input-icon"><IconMail /></span>
              <input
                id="email"
                name="email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="input-wrap">
              <span className="input-icon"><IconLock /></span>
              <input
                id="password"
                name="password"
                type={showPass ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••••"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="input-toggle-btn"
                onClick={() => setShowPass(p => !p)}
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? <IconEyeOff /> : <IconEye />}
              </button>
            </div>
          </div>

          {/* Remember / forgot */}
          <div className="form-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
              />
              Keep me signed in
            </label>
            <Link to="/forgot" className="link-inline">Forgot password?</Link>
          </div>

          {/* Error */}
          {errorMessage && (
            <div className="form-error">
              <IconAlert />
              {errorMessage}
            </div>
          )}

          {/* Submit */}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <><span className="btn-spinner" /> Signing in…</>
            ) : (
              <>Sign in <IconArrow /></>
            )}
          </button>
        </form>

        <p className="auth-footer">
          New to Medixia?{' '}
          <Link to="/signup">Create a free account</Link>
        </p>


      </div>

    </div>
  );
};

export default Login;