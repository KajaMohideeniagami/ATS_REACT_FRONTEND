import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import CustomerList   from './components/pages/Customer/CustomerList';
import CustomerDetail from './components/pages/Customer/CustomerDetail';
import CustomerCreate from './components/pages/Customer/CustomerCreate';
import LoginPage      from './components/pages/Auth/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import { isLoggedIn, clearSession } from './services/authService';
import ProfileStatusPage from './components/pages/ProfileStatus/ProfileStatus';
import {LogOut } from 'lucide-react';
import './global.css';

// ── App Header ─────────────────────────────────────────────────────────────
const AppHeader = () => {
  const location = useLocation();
  const navigate  = useNavigate();
  const isLogin   = location.pathname === '/login';

  if (isLogin) return null;

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <header className="app-header">
      <div className="app-header-inner">

        {/* Brand */}
        <div className="app-header-brand">
          <span className="app-header-title">Iagami</span>
          <span className="app-header-divider">|</span>
          <span className="app-header-subtitle">Applicant Tracking Software (ATS)</span>
        </div>

        {/* Logout */}
        {isLoggedIn() && (
          <button className="app-header-logout" onClick={handleLogout}>
            <LogOut size={14} />
            Logout
          </button>
        )}

      </div>
    </header>
  );
};

const App = () => {
  return (
    <Router>
      <AppHeader />
      <Routes>

        {/* ── Public Route ── */}
        <Route path="/login" element={<LoginPage />} />

        {/* ── Protected Routes ── */}
        <Route path="/" element={
          <ProtectedRoute>
            <CustomerList />
          </ProtectedRoute>
        } />

        <Route path="/customers/create" element={
          <ProtectedRoute>
            <CustomerCreate />
          </ProtectedRoute>
        } />

        <Route path="/customers/:id" element={
          <ProtectedRoute>
            <CustomerDetail />
          </ProtectedRoute>
        } />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />

        <Route path="/customers/:id/profile-status" element={<ProfileStatusPage />} />


      </Routes>

      <style>{`
        .app-header {
          position: sticky;
          top: 0;
          z-index: 1000;
          background: #1e293b;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .app-header-inner {
          max-width: 1440px;
          margin: 0 auto;
          padding: 0 24px;
          height: 25px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .app-header-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .app-header-icon {
          color: #60a5fa;
          flex-shrink: 0;
        }
        .app-header-title {
          font-family: 'Inter', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: #f1f5f9;
          letter-spacing: -0.3px;
        }
        .app-header-divider {
          color: rgba(255,255,255,0.2);
          font-size: 18px;
          font-weight: 300;
        }
        .app-header-subtitle {
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 400;
          color: #94a3b8;
          letter-spacing: 0.1px;
        }
        .app-header-logout {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: #fca5a5;
          background: rgba(220,38,38,0.12);
          border: 1px solid rgba(220,38,38,0.25);
          border-radius: 8px;
          padding: 7px 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .app-header-logout:hover {
          background: rgba(220,38,38,0.25);
          border-color: rgba(220,38,38,0.5);
          color: #fecaca;
        }

        @media (max-width: 600px) {
          .app-header-subtitle { display: none; }
          .app-header-divider  { display: none; }
          .app-header-inner    { padding: 0 16px; }
        }
      `}</style>
    </Router>
  );
};

export default App;