import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './App.css';

const IconMail = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
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
const MedixiaLogo = ({ size = 20, color = 'white' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <rect x="13" y="4" width="6" height="24" rx="3" fill={color}/>
    <rect x="4" y="13" width="24" height="6" rx="3" fill={color}/>
  </svg>
);

export default function ForgotPassword() {
  const [email, setEmail]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess]           = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) {
        setErrorMessage(error.message);
      } else {
        setSuccess(true);
      }
    } catch {
      setErrorMessage('Connection failed. Please check your network.');
    } finally {
      setLoading(false);
    }
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
          <p className="auth-hero-eyebrow">Account Recovery</p>
          <h1 className="auth-hero-title">Reset your<br/>password securely.</h1>
        </div>
      </div>
      <div className="auth-panel">
        <div className="auth-panel-top">
          <h2 className="auth-panel-title">Forgot Password</h2>
          <p className="auth-panel-sub">Enter your email address and we'll send you a link to reset your password.</p>
        </div>

        {success ? (
          <div style={{ padding: '20px', background: 'var(--mint-50)', color: 'var(--moss-700)', borderRadius: '12px', border: '1px solid var(--mint-200)', textAlign: 'center', fontWeight: '500' }}>
            Password reset link sent to {email}. Check your inbox!
          </div>
        ) : (
          <form onSubmit={handleReset} noValidate>
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label" htmlFor="email">Registered Email</label>
              <div className="input-wrap">
                <span className="input-icon"><IconMail /></span>
                <input id="email" type="email" className="form-input" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} required />
              </div>
            </div>
            {errorMessage && (
              <div className="form-error"><IconAlert /> {errorMessage}</div>
            )}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <><span className="btn-spinner" /> Sending link…</> : <>Send Reset Link <IconArrow /></>}
            </button>
          </form>
        )}

        <p className="auth-footer" style={{ marginTop: '32px' }}>Remembered your password? <Link to="/">Sign in here</Link></p>
      </div>
    </div>
  );
}
