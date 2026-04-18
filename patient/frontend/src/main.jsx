import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import Dashboard from './Dashboard.jsx';
import Profile from './Profile.jsx'; // 👈 Import the Profile component
import SharedView from './SharedView.jsx'; // 👈 Import the Doctor's QR view
import Signup from './Signup.jsx';
import ForgotPassword from './ForgotPassword.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Home / Login Page */}
        <Route path="/" element={<App />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot" element={<ForgotPassword />} />
        
        {/* Main Patient Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Professional Health Profile / Family Vault */}
        <Route path="/profile" element={<Profile />} />

        {/* The "Doctor's View" - accessed via the Secure QR Link */}
        <Route path="/shared/token/:tokenId" element={<SharedView />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);