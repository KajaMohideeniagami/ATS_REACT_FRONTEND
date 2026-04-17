import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole } from 'lucide-react';
import { getSession, saveSession } from '../../../services/authService';
import { resetPassword } from '../../../services/userProfileService';
import { toast } from '../../toast/index';

const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const sessionUser = getSession();

  const [form, setForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [loading, setLoading] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.old_password) errs.old_password = 'Current password is required';
    if (!form.new_password || form.new_password.length < 6) {
      errs.new_password = 'New password must be at least 6 characters';
    }
    if (!form.confirm_password) {
      errs.confirm_password = 'Please confirm the new password';
    } else if (form.new_password !== form.confirm_password) {
      errs.confirm_password = 'Passwords do not match';
    }
    return errs;
  };

  const handleChange = (e) => {
    setForm((previous) => ({ ...previous, [e.target.name]: e.target.value }));
    setErrors((previous) => ({ ...previous, [e.target.name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const username = sessionUser?.username || sessionUser?.email;
      await resetPassword(username, form.old_password, form.new_password);
      saveSession({
        ...sessionUser,
        must_change_password: false,
      });
      toast.success('Password updated successfully!');
      navigate('/', { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to update password';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-page">
      <div className="change-password-overlay" />
      <div className="change-password-shell">
        <div className="change-password-copy">
          <p className="change-password-kicker">Security check</p>
          <h1>Set your first password</h1>
          <p>
            Your account was created manually, so this first login requires you to replace the temporary password
            before entering the application.
          </p>
          <div className="change-password-pills">
            <span>Forced first login reset</span>
            <span>Outside app shell</span>
            <span>Secure sign-in flow</span>
          </div>
        </div>

        <div className="form-container change-password-card">
          <div className="change-password-header">
            <div className="change-password-icon">
              <KeyRound size={22} />
            </div>
            <div>
              <h2 className="ats-heading-2">Change Password</h2>
              <p className="ats-body-small">Set a new password to continue to the ATS workspace.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="change-password-form">
            <PasswordField
              label="Current Password"
              name="old_password"
              value={form.old_password}
              onChange={handleChange}
              error={errors.old_password}
              visible={showOld}
              onToggle={() => setShowOld((v) => !v)}
            />

            <PasswordField
              label="New Password"
              name="new_password"
              value={form.new_password}
              onChange={handleChange}
              error={errors.new_password}
              visible={showNew}
              onToggle={() => setShowNew((v) => !v)}
            />

            <PasswordField
              label="Confirm New Password"
              name="confirm_password"
              value={form.confirm_password}
              onChange={handleChange}
              error={errors.confirm_password}
              visible={showConfirm}
              onToggle={() => setShowConfirm((v) => !v)}
            />

            <div className="change-password-tips">
              <div className="change-password-tip">
                <CheckCircle2 size={15} />
                <span>Use at least 6 characters</span>
              </div>
              <div className="change-password-tip">
                <CheckCircle2 size={15} />
                <span>Choose something only you know</span>
              </div>
            </div>

            <button type="submit" className="btn-primary change-password-submit" disabled={loading}>
              <LockKeyhole size={16} />
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        .change-password-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
          overflow: hidden;
          background:
            linear-gradient(135deg, rgba(6, 12, 24, 0.84), rgba(15, 23, 42, 0.62)),
            url('/login%20banner.png') center center / cover no-repeat;
        }
        .change-password-overlay {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 15% 20%, rgba(59, 130, 246, 0.2), transparent 24%),
            radial-gradient(circle at 80% 25%, rgba(34, 197, 94, 0.12), transparent 22%);
          pointer-events: none;
        }
        .change-password-shell {
          position: relative;
          z-index: 1;
          width: min(1160px, 100%);
          display: grid;
          grid-template-columns: 1.1fr 0.82fr;
          gap: 28px;
          align-items: center;
        }
        .change-password-copy {
          color: #ffffff;
          max-width: 620px;
          padding: 10px 6px 10px 0;
          text-shadow: 0 4px 18px rgba(0, 0, 0, 0.24);
        }
        .change-password-kicker {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #93c5fd;
          margin-bottom: 14px;
        }
        .change-password-copy h1 {
          font-size: clamp(40px, 6vw, 62px);
          line-height: 1.08;
          margin: 0 0 14px;
          letter-spacing: -0.03em;
        }
        .change-password-copy > p {
          font-size: 16px;
          line-height: 1.65;
          margin: 0;
          max-width: 46ch;
          color: rgba(255, 255, 255, 0.88);
        }
        .change-password-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 24px;
        }
        .change-password-pills span {
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
        .change-password-card {
          width: 100%;
          max-width: 460px;
          justify-self: end;
          border-radius: 26px;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 30px 72px rgba(15, 23, 42, 0.28);
          border: 1px solid rgba(255, 255, 255, 0.32);
          backdrop-filter: blur(18px);
          padding: 28px 26px 24px;
        }
        .change-password-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 18px;
        }
        .change-password-icon {
          width: 54px;
          height: 54px;
          border-radius: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f172a, #2563eb 72%, #3b82f6);
          color: #ffffff;
          box-shadow: 0 16px 30px rgba(37, 99, 235, 0.28);
          flex-shrink: 0;
        }
        .change-password-header .ats-heading-2 {
          margin: 0 0 4px;
          color: #0f172a;
        }
        .change-password-header .ats-body-small {
          margin: 0;
          color: #64748b;
          font-size: 14px;
        }
        .change-password-form {
          display: grid;
          gap: 12px;
        }
        .password-field {
          display: grid;
          gap: 6px;
        }
        .password-label {
          font-size: 13px;
          letter-spacing: 0.04em;
          color: #334155;
          font-weight: 600;
        }
        .password-wrap {
          position: relative;
        }
        .password-input {
          width: 100%;
          min-height: 48px;
          border-radius: 13px;
          background: rgba(248, 250, 252, 0.96);
          border: 1px solid #d9e2ef;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.82);
          padding: 0 44px 0 14px;
          box-sizing: border-box;
        }
        .password-input:focus {
          background: #ffffff;
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12);
          outline: none;
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
        }
        .password-toggle:hover {
          color: #2563eb;
        }
        .password-error {
          font-size: 12px;
          color: #dc2626;
          font-weight: 500;
        }
        .change-password-tips {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 2px;
        }
        .change-password-tip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 999px;
          background: #f1f5f9;
          color: #475569;
          font-size: 13px;
          font-weight: 500;
        }
        .change-password-submit {
          width: 100%;
          justify-content: center;
          min-height: 48px;
          margin-top: 6px;
          border-radius: 14px;
          box-shadow: 0 12px 26px rgba(30, 41, 59, 0.22);
        }
        @media (max-width: 980px) {
          .change-password-shell {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .change-password-copy {
            text-align: center;
            max-width: none;
          }
          .change-password-copy > p {
            margin: 0 auto;
          }
          .change-password-pills {
            justify-content: center;
          }
          .change-password-card {
            justify-self: stretch;
            max-width: none;
          }
        }
        @media (max-width: 640px) {
          .change-password-page {
            padding: 14px;
          }
          .change-password-card {
            padding: 20px 18px 18px;
            border-radius: 24px;
          }
          .change-password-copy h1 {
            font-size: 34px;
          }
          .change-password-pills span {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};

const PasswordField = ({ label, name, value, onChange, error, visible, onToggle }) => (
  <div className="password-field">
    <label className="password-label" htmlFor={name}>
      {label}
    </label>
    <div className="password-wrap">
      <input
        id={name}
        type={visible ? 'text' : 'password'}
        name={name}
        value={value}
        onChange={onChange}
        className="password-input"
        autoComplete={name === 'old_password' ? 'current-password' : 'new-password'}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={onToggle}
        aria-label={visible ? `Hide ${label}` : `Show ${label}`}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
    {error ? <span className="password-error">{error}</span> : null}
  </div>
);

export default ChangePasswordPage;
