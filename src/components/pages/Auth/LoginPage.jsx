import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { login, saveSession, isLoggedIn } from '../../../services/authService';
import '../../../global.css';

const LoginPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ username: '', password: '' });
  const [errors,   setErrors]   = useState({});
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Already logged in → redirect
  useEffect(() => {
    if (isLoggedIn()) navigate('/', { replace: true });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!formData.username.trim()) e.username = 'Username is required';
    if (!formData.password.trim()) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await login(formData.username.trim(), formData.password);

      if (response.success) {
        saveSession({
          username:  response.username,
          full_name: response.full_name,
          email:     response.email,
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

      {/* Card */}
      <div className="form-container">

        {/* Brand */}
        <div className="login-brand-block">
          <div className="login-logo-box">IA</div>
          <h1 className="ats-heading-2">Iagami ATS</h1>
          <p className="ats-body-small">Applicant Tracking Software</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>

          {/* General error */}
          {errors.general && (
            <div className="error-message">
              {errors.general}
            </div>
          )}

          {/* Username */}
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

          {/* Password */}
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
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <span className="form-error">{errors.password}</span>}
          </div>

          {/* Submit */}
          <div className="form-actions" style={{ borderTop: 'none', marginTop: 8, padding: 0 }}>
            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? <span className="login-spinner" /> : <LogIn size={16} />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>

        </form>

        {/* Footer */}
        <p className="ats-body-xs text-center" style={{ marginTop: 24 }}>
          Only authorised workspace users can access this system.
        </p>

      </div>

      {/* Minimal scoped styles — only what global.css does not cover */}
      <style>{`
        .login-page-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #1e3a5f 100%);
          padding: 24px;
        }
        .login-brand-block {
          text-align: center;
          margin-bottom: 28px;
        }
        .login-logo-box {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 60px;
          height: 60px;
          border-radius: 16px;
          background: linear-gradient(135deg, #1e293b, #2563eb);
          color: #ffffff;
          font-size: 22px;
          font-weight: 800;
          letter-spacing: 1px;
          margin-bottom: 14px;
          box-shadow: 0 8px 24px rgba(37,99,235,0.3);
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
        .login-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

    </div>
  );
};

export default LoginPage;