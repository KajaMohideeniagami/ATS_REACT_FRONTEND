import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { login, saveSession, isLoggedIn } from '../../../services/authService';
import '../../../global.css';

const LoginPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) navigate('/', { replace: true });
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!formData.username.trim()) nextErrors.username = 'Username is required';
    if (!formData.password.trim()) nextErrors.password = 'Password is required';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await login(formData.username.trim(), formData.password);

      if (response.success) {
        saveSession({
          username: response.username,
          full_name: response.full_name,
          email: response.email,
        });
        navigate('/', { replace: true });
      } else {
        setErrors({ general: response.message || 'Invalid username or password.' });
      }
    } catch {
      setErrors({ general: 'Unable to connect. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-page-overlay" />
      <div className="login-shell">
        <div className="login-hero-copy">
          <p className="login-banner-kicker">Applicant Tracking System</p>
          <h1>Iagami ATS</h1>
          <p>Track customers, demands, vendors, and candidate reports from one workspace.</p>
          <div className="login-hero-pills">
            <span>Fast access</span>
            <span>Secure login</span>
            <span>Workspace ready</span>
          </div>
        </div>

        <div className="form-container login-card">
          <div className="login-brand-block">
            {/* <div className="login-logo-box">IA</div> */}
            <h1 className="ats-heading-2">Welcome back</h1>
            <p className="ats-body-small">Sign in to continue to the ATS dashboard.</p>
          </div>

          <form onSubmit={handleSubmit}>
            {errors.general && (
              <div className="error-message">
                {errors.general}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                name="username"
                className={`form-input ${errors.username ? 'input-error' : ''}`}
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter your username"
                autoFocus
                autoComplete="username"
              />
              {errors.username && <span className="form-error">{errors.username}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="password-wrap">
                <input
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  className={`form-input ${errors.password ? 'input-error' : ''}`}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPass(!showPass)}
                  tabIndex={-1}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <div className="form-actions login-actions" style={{ borderTop: 'none', marginTop: 8, padding: 0 }}>
              <button type="submit" className="btn-primary login-submit" disabled={loading}>
                {loading ? <span className="login-spinner" /> : <LogIn size={16} />}
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          </form>

          <p className="ats-body-xs text-center login-footer">
            Only authorised workspace users can access this system.
          </p>
        </div>
      </div>

      <style>{`
        .login-page-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
          overflow: hidden;
          background:
            linear-gradient(135deg, rgba(6, 12, 24, 0.82), rgba(15, 23, 42, 0.58)),
            url('/login%20banner.png') center center / cover no-repeat;
        }
        .login-page-overlay {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.22), transparent 26%),
            radial-gradient(circle at 80% 30%, rgba(14, 165, 233, 0.14), transparent 20%),
            linear-gradient(135deg, rgba(6, 12, 24, 0.1), rgba(15, 23, 42, 0.2));
          pointer-events: none;
        }
        .login-shell {
          position: relative;
          z-index: 1;
          width: min(1200px, 100%);
          display: grid;
          grid-template-columns: 1.15fr 0.72fr;
          gap: 28px;
          align-items: stretch;
          backdrop-filter: blur(2px);
        }
        .login-hero-copy {
          align-self: center;
          max-width: 620px;
          color: #ffffff;
          padding: 20px 8px 20px 0;
          text-shadow: 0 4px 18px rgba(0, 0, 0, 0.25);
        }
        .login-banner-kicker {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #93c5fd;
          margin-bottom: 14px;
        }
        .login-hero-copy h1 {
          font-size: clamp(40px, 6vw, 64px);
          line-height: 1.1;
          margin: 0 0 14px;
          letter-spacing: -0.02em;
        }
        .login-hero-copy > p {
          font-size: 16px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.88);
          margin: 0;
          max-width: 44ch;
        }
        .login-hero-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 24px;
        }
        .login-hero-pills span {
          display: inline-flex;
          align-items: center;
          min-height: 36px;
          padding: 0 14px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.42);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: #e2e8f0;
          font-size: 13px;
          backdrop-filter: blur(10px);
        }
        .login-card {
          width: 100%;
          max-width: 440px;
          justify-self: end;
          align-self: center;
          border-radius: 26px;
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 30px 72px rgba(15, 23, 42, 0.28);
          border: 1px solid rgba(255, 255, 255, 0.32);
          backdrop-filter: blur(18px);
          padding: 28px 26px 24px;
        }
        .login-brand-block {
          text-align: center;
          margin-bottom: 20px;
        }
        .login-logo-box {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 68px;
          height: 68px;
          border-radius: 20px;
          background: linear-gradient(135deg, #0f172a, #2563eb 72%, #3b82f6);
          color: #ffffff;
          font-size: 23px;
          font-weight: 800;
          letter-spacing: 1px;
          margin-bottom: 18px;
          box-shadow: 0 16px 30px rgba(37,99,235,0.28);
        }
        .login-brand-block .ats-heading-2 {
          letter-spacing: -0.03em;
          margin-bottom: 4px;
          color: #0f172a;
        }
        .login-brand-block .ats-body-small {
          color: #64748b;
          font-size: 14px;
        }
        .login-card form {
          display: grid;
          gap: 12px;
        }
        .login-card .form-group {
          margin-bottom: 0;
        }
        .login-card .form-label {
          font-size: 13px;
          letter-spacing: 0.04em;
          color: #334155;
          margin-bottom: 6px;
        }
        .login-card .form-input {
          min-height: 48px;
          border-radius: 13px;
          background: rgba(248, 250, 252, 0.96);
          border: 1px solid #d9e2ef;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.82);
        }
        .login-card .form-input:focus {
          background: #ffffff;
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12);
        }
        .login-card .form-input::placeholder {
          color: #94a3b8;
        }
        .password-wrap {
          position: relative;
        }
        .password-wrap .form-input {
          padding-right: 44px;
        }
        .password-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #94a3b8;
          display: inline-flex;
          align-items: center;
          transition: color 0.15s;
        }
        .password-toggle:hover { color: #2563eb; }
        .input-error { border-color: #ef4444 !important; }
        .login-actions {
          margin-top: 8px;
        }
        .login-submit {
          width: 100%;
          justify-content: center;
          min-height: 48px;
          border-radius: 14px;
          box-shadow: 0 12px 26px rgba(30, 41, 59, 0.22);
          letter-spacing: 0.02em;
        }
        .login-footer {
          margin-top: 18px;
          color: #64748b;
        }
        .login-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @media (max-width: 980px) {
          .login-shell {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .login-hero-copy {
            max-width: none;
            padding: 24px 10px 4px;
            text-align: center;
          }
          .login-hero-copy > p {
            margin: 0 auto;
          }
          .login-hero-pills {
            justify-content: center;
          }
          .login-card {
            max-width: none;
            justify-self: stretch;
            padding: 24px 22px 22px;
          }
        }
        @media (max-width: 640px) {
          .login-page-wrapper {
            padding: 14px;
          }
          .login-hero-copy {
            padding: 8px 4px 0;
          }
          .login-hero-copy h1 {
            font-size: 34px;
          }
          .login-card {
            border-radius: 24px;
            padding: 20px 18px 18px;
          }
          .login-hero-pills span {
            font-size: 12px;
          }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default LoginPage;
