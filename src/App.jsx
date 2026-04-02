import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  BriefcaseBusiness,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  UserSearch,
  Users,
} from 'lucide-react';
import CustomerList from './components/pages/Customer/CustomerList';
import CustomerDetail from './components/pages/Customer/CustomerDetail';
import CustomerCreate from './components/pages/Customer/CustomerCreate';
import LoginPage from './components/pages/Auth/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import { isLoggedIn, clearSession, getSession } from './services/authService';
import ProfileStatusModal from './components/pages/ProfileStatus/ProfileStatus';
import DemandReportPage from './components/pages/DemandReport/DemandReportPage';
import ToastContainer from './components/Toast';
import './global.css';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: null },
  { label: 'Executive Dashboard', icon: BarChart3, path: null },
  { label: 'Customer', icon: Users, path: '/' },
  { label: 'Profile Report', icon: UserSearch, path: null },
  { label: 'Demand Report Data', icon: BriefcaseBusiness, path: '/demand-report' },
  { label: 'Vendor Report Data', icon: BriefcaseBusiness, path: null },
  { label: 'Candidate Report', icon: UserSearch, path: null },
  { label: 'Administration', icon: Settings, path: null },
];

const AppShell = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const sessionUser = getSession();
  const headerUserName = sessionUser?.username || sessionUser?.full_name || sessionUser?.email || 'Workspace User';

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  const handleNavClick = (item) => {
    if (!item.path) return;
    navigate(item.path);
  };

  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-header-brand">
            <button
              className="app-header-menu"
              type="button"
              aria-label={sidebarOpen ? 'Collapse navigation' : 'Expand navigation'}
              onClick={() => setSidebarOpen((previous) => !previous)}
            >
              <Menu size={20} />
            </button>
            <span className="app-header-title">Iagami - Applicant Tracking Software (ATS)</span>
          </div>

          {isLoggedIn() && (
            <div className="app-header-actions">
              <span className="app-header-user">{headerUserName}</span>
              <button className="app-header-logout" onClick={handleLogout}>
                <LogOut size={14} />
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="app-layout">
        <aside className={`app-sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
          <nav className="app-sidebar-nav">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = item.path ? location.pathname === item.path : false;

              return (
                <button
                  key={item.label}
                  type="button"
                  className={`app-sidebar-link ${active ? 'active' : ''} ${item.path ? '' : 'disabled'}`}
                  onClick={() => handleNavClick(item)}
                  disabled={!item.path}
                  title={item.label}
                >
                  <Icon size={18} />
                  <span className="app-sidebar-label">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="app-content">{children}</main>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppShell>
                <CustomerList />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/customers/create"
          element={
            <ProtectedRoute>
              <AppShell>
                <CustomerCreate />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/customers/:id"
          element={
            <ProtectedRoute>
              <AppShell>
                <CustomerDetail />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/customers/:id/profile-status"
          element={
            <ProtectedRoute>
              <AppShell>
                <ProfileStatusModal />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/demand-report"
          element={
            <ProtectedRoute>
              <AppShell>
                <DemandReportPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ToastContainer />

      <style>{`
        .app-shell {
          min-height: 100vh;
          background: #f8fafc;
        }

        .app-header {
          position: sticky;
          top: 0;
          z-index: 1000;
          background: #1769b7;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        }

        .app-header-inner {
          width: 100%;
          padding: 12px 18px;
          min-height: 58px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .app-header-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .app-header-menu {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 6px;
          color: #ffffff;
          flex-shrink: 0;
        }

        .app-header-actions {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .app-header-title {
          font-family: 'Inter', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: #f8fbff;
          letter-spacing: -0.2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .app-header-user {
          font-size: 14px;
          font-weight: 500;
          color: rgba(255,255,255,0.92);
        }

        .app-header-logout {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: #ffffff;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 8px;
          padding: 7px 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .app-header-logout:hover {
          background: rgba(255,255,255,0.16);
          border-color: rgba(255,255,255,0.28);
        }

        .app-layout {
          display: flex;
          min-height: calc(100vh - 58px);
          overflow: hidden;
        }

        .app-sidebar {
          width: 219px;
          flex-shrink: 0;
          background: #2f353a;
          border-right: 1px solid rgba(255,255,255,0.06);
          transition: width 0.22s ease, transform 0.22s ease;
          overflow: hidden;
          height: calc(100vh - 58px);
          position: sticky;
          top: 58px;
        }

        .app-sidebar-nav {
          display: flex;
          flex-direction: column;
          padding: 0;
          overflow: hidden;
        }

        .app-sidebar.collapsed {
          width: 78px;
        }

        .app-sidebar-link {
          display: flex;
          align-items: center;
          gap: 14px;
          width: 100%;
          padding: 16px 14px;
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          border-left: 4px solid transparent;
          color: #ffffff;
          font-size: 15px;
          font-weight: 500;
          text-align: left;
          cursor: pointer;
          transition: background 0.18s ease, border-left-color 0.18s ease;
        }

        .app-sidebar-label {
          white-space: nowrap;
          opacity: 1;
          transition: opacity 0.18s ease;
        }

        .sidebar-collapsed .app-sidebar-link {
          justify-content: center;
          padding-left: 10px;
          padding-right: 10px;
        }

        .sidebar-collapsed .app-sidebar-label {
          opacity: 0;
          width: 0;
          overflow: hidden;
        }

        .app-sidebar-link:hover:not(.disabled) {
          background: #383f45;
        }

        .app-sidebar-link.active {
          background: #23282d;
          border-left-color: #0d6ddf;
          font-weight: 700;
        }

        .app-sidebar-link.disabled {
          opacity: 0.9;
          cursor: default;
        }

        .app-content {
          flex: 1;
          min-width: 0;
          height: calc(100vh - 58px);
          overflow-y: auto;
        }

        @media (max-width: 980px) {
          .app-layout {
            flex-direction: column;
          }

          .app-sidebar {
            width: 100%;
            max-height: 480px;
            border-right: none;
            border-bottom: 1px solid rgba(255,255,255,0.08);
            height: auto;
            position: static;
          }

          .app-sidebar-nav {
            overflow-x: auto;
          }

          .app-sidebar-link {
            white-space: nowrap;
          }

          .app-sidebar.collapsed {
            width: 100%;
            max-height: 0;
            border-bottom: none;
          }

          .sidebar-collapsed .app-sidebar-link {
            justify-content: flex-start;
            padding-left: 14px;
            padding-right: 14px;
          }

          .sidebar-collapsed .app-sidebar-label {
            opacity: 1;
            width: auto;
          }

          .app-content {
            height: auto;
            overflow-y: visible;
          }
        }

        @media (max-width: 640px) {
          .app-header-inner {
            padding: 10px 0px;
          }

          .app-header-title {
            font-size: 15px;
          }

          .app-header-user {
            display: none;
          }
        }
      `}</style>
    </Router>
  );
};

export default App;
