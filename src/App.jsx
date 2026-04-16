import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  FileCheck2,
  FileX2,
  LayoutDashboard,
  LogOut,
  Menu,
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
import DashboardPage from './components/pages/Dashboard/DashboardPage';
import ExecutiveDashboardPage from './components/pages/ExecutiveDashboard/ExecutiveDashboardPage';
import { ToastProvider } from './components/toast/index';
import ProfileReportPage from './components/pages/ProfileReport/ProfileReportPage';
import VendorReportPage from './components/pages/VendorReport/VendorReportPage';
import CandidateReportPage from './components/pages/CandidateReport/CandidateReportPage';
import VendorMasterPage from './components/pages/VendorMaster/VendorMasterPage';
import { LoaderProvider } from './context/LoaderContext';
import UserProfilePage from './components/pages/UserProfile/UserProfilePage';
import { UserCircle } from 'lucide-react';
import './global.css';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Executive Dashboard', icon: BarChart3, path: '/executive-dashboard' },
  { label: 'Customer', icon: Users, path: '/' },
  { label: 'Profile Report', icon: UserSearch, path: '/profile-report' },
  { label: 'Demand Report Data', icon: BriefcaseBusiness, path: '/demand-report' },
  { label: 'Vendor Report Data', icon: BriefcaseBusiness, path: '/vendor-report' },
  {
    label: 'Candidate Report',
    icon: UserSearch,
    children: [
      { label: 'Onboarded Report', path: '/candidate-report/onboarded', icon: FileCheck2 },
      { label: 'Onboarded Failed Report', path: '/candidate-report/onboarded-failed', icon: FileX2 },
      { label: 'Customer Rejected Report', path: '/candidate-report/customer-rejected', icon: FileX2 },
    ],
  },
  { label: 'Vendor Master', icon: Building2, path: '/vendor-master' },
];

// const BOTTOM_NAV_ITEM = { label: 'My Profile', icon: UserCircle, path: '/profile' };

const AppShell = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileNav, setIsMobileNav] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth <= 980 : false
  ));
  const [sidebarOpen, setSidebarOpen] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth > 980 : true
  ));
  const [candidateMenuOpen, setCandidateMenuOpen] = useState(() => location.pathname.startsWith('/candidate-report'));
  const sessionUser = getSession();
  const headerUserName = sessionUser?.username || sessionUser?.full_name || sessionUser?.email || 'Workspace User';

  useEffect(() => {
    if (location.pathname.startsWith('/candidate-report')) {
      setCandidateMenuOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 980;
      setIsMobileNav(mobile);
      if (mobile) {
        // Avoid a full-screen backdrop blocking interaction on small screens.
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  const handleNavClick = (item) => {
    if (!item.path) return;
    navigate(item.path);
    if (isMobileNav) setSidebarOpen(false);
  };

  const handleChildNavClick = (path) => {
    navigate(path);
    if (isMobileNav) setSidebarOpen(false);
  };

  return (
    <div
      className={`app-shell ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'} ${
        isMobileNav ? 'mobile-nav' : 'desktop-nav'
      } ${isMobileNav && sidebarOpen ? 'mobile-nav-open' : ''}`}
    >
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

      {isMobileNav && sidebarOpen && (
        <button
          type="button"
          className="app-sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="app-layout">
        <aside className={`app-sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
          <nav className="app-sidebar-nav">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = item.path ? location.pathname === item.path : false;
              const hasChildren = Array.isArray(item.children) && item.children.length > 0;
              const childActive = hasChildren
                ? item.children.some((child) => location.pathname === child.path)
                : false;

              if (hasChildren) {
                return (
                  <div key={item.label} className={`app-sidebar-group ${childActive ? 'active' : ''}`}>
                    <button
                      type="button"
                      className={`app-sidebar-link app-sidebar-parent ${childActive ? 'active' : ''}`}
                      onClick={() => setCandidateMenuOpen((previous) => !previous)}
                      title={item.label}
                    >
                      <span className="app-sidebar-link-main">
                        <Icon size={18} />
                        <span className="app-sidebar-label">{item.label}</span>
                      </span>
                      <span className={`app-sidebar-caret ${candidateMenuOpen ? 'open' : ''}`}>
                        <ChevronDown size={16} />
                      </span>
                    </button>

                      {candidateMenuOpen && (
                        <div className="app-sidebar-submenu">
                          {item.children.map((child) => (
                            <button
                              key={child.label}
                              type="button"
                              className={`app-sidebar-sublink ${location.pathname === child.path ? 'active' : ''}`}
                              onClick={() => handleChildNavClick(child.path)}
                              title={child.label}
                            >
                              <span className="app-sidebar-sublink-main">
                                {child.icon ? <child.icon size={15} /> : null}
                                <span className="app-sidebar-sublabel">{child.label}</span>
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

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
          {/* <div className="app-sidebar-footer">
            <button
              type="button"
              className={`app-sidebar-link ${location.pathname === BOTTOM_NAV_ITEM.path ? 'active' : ''}`}
              onClick={() => handleNavClick(BOTTOM_NAV_ITEM)}
              title={BOTTOM_NAV_ITEM.label}
            >
              <BOTTOM_NAV_ITEM.icon size={18} />
              <span className="app-sidebar-label">{BOTTOM_NAV_ITEM.label}</span>
            </button>
          </div> */}
        </aside>

        <main className="app-content">{children}</main>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <LoaderProvider>
      <ToastProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AppShell>
                  <DashboardPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/executive-dashboard"
            element={
              <ProtectedRoute>
                <AppShell>
                  <ExecutiveDashboardPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

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
            path="/customers/:id/edit"
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

          <Route
            path="/profile-report"
            element={
              <ProtectedRoute>
                <AppShell>
                  <ProfileReportPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/vendor-report"
            element={
              <ProtectedRoute>
                <AppShell>
                  <VendorReportPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/vendor-master"
            element={
              <ProtectedRoute>
                <AppShell>
                  <VendorMasterPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/candidate-report/onboarded"
            element={
              <ProtectedRoute>
                <AppShell>
                  <CandidateReportPage
                    title="Onboarded Report"
                    endpoint="/reports/onboardedreport"
                    storageKey="ats_onboarded_report_column_prefs"
                    description="Filter and review onboarded candidate records in one place."
                  />
                </AppShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/candidate-report/onboarded-failed"
            element={
              <ProtectedRoute>
                <AppShell>
                  <CandidateReportPage
                    title="Onboarded Failed Report"
                    endpoint="/reports/onboardedfailedreport"
                    storageKey="ats_onboarded_failed_report_column_prefs"
                    description="Filter and review failed onboarding records in one place."
                  />
                </AppShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/candidate-report/customer-rejected"
            element={
              <ProtectedRoute>
                <AppShell>
                  <CandidateReportPage
                    title="Customer Rejected Report"
                    endpoint="/reports/customerrejectedreport"
                    storageKey="ats_customer_rejected_report_column_prefs"
                    description="Filter and review customer rejected candidate records in one place."
                  />
                </AppShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <AppShell>
                  <UserProfilePage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

      </Router>
      </ToastProvider>
    </LoaderProvider>
  );
};

export default App;
