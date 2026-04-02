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
    </Router>
  );
};

export default App;
