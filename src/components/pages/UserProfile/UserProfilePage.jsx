import React, { useState } from 'react';
import { CheckCircle2, KeyRound, LockKeyhole, Mail, ShieldCheck, User, UserRound } from 'lucide-react';
import { getSession } from '../../../services/authService';
import { resetPassword } from '../../../services/userProfileService';
import { toast } from '../../toast/index';

const UserProfilePage = () => {
  const sessionUser = getSession();

  const [form, setForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const username = sessionUser?.username || sessionUser?.email;
      await resetPassword(username, form.old_password, form.new_password);
      toast.success('Password updated successfully!');
      setForm({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to update password';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const profileItems = [
    { label: 'Username', value: sessionUser?.username || '-', icon: UserRound },
    { label: 'Full Name', value: sessionUser?.full_name || '-', icon: User },
    { label: 'Email Address', value: sessionUser?.email || '-', icon: Mail },
  ];

  return (
    <>
      <div className="profile-page">
        <section className="profile-hero">
          <div className="profile-hero-copy">
            <span className="profile-kicker">Account Center</span>
            <h1 className="profile-title">My Profile</h1>
            <p className="profile-subtitle">
              Review your account details and keep your password updated in one clean workspace.
            </p>
          </div>

          <div className="profile-hero-card">
            <div className="profile-avatar">{(sessionUser?.username || 'U').slice(0, 1).toUpperCase()}</div>
            <div>
              <div className="profile-hero-name">{sessionUser?.full_name || sessionUser?.username || 'Workspace User'}</div>
              <div className="profile-hero-meta">{sessionUser?.email || 'No email available'}</div>
            </div>
          </div>
        </section>

        <section className="profile-grid">
          <div className="profile-card profile-summary-card">
            <div className="profile-card-header">
              <div className="profile-card-icon">
                <User size={18} />
              </div>
              <div>
                <h2 className="profile-card-title">Profile Overview</h2>
                <p className="profile-card-text">Your basic account information as currently stored.</p>
              </div>
            </div>

            <div className="profile-info-list">
              {profileItems.map(({ label, value, icon: Icon }) => (
                <div key={label} className="profile-info-item">
                  <div className="profile-info-icon">
                    <Icon size={16} />
                  </div>
                  <div className="profile-info-copy">
                    <span className="profile-info-label">{label}</span>
                    <strong className="profile-info-value">{value}</strong>
                  </div>
                </div>
              ))}
            </div>

            <div className="profile-note">
              <ShieldCheck size={16} />
              <span>Your account details are visible here for quick review.</span>
            </div>
          </div>

          <div className="profile-card">
            <div className="profile-card-header">
              <div className="profile-card-icon profile-card-icon-accent">
                <KeyRound size={18} />
              </div>
              <div>
                <h2 className="profile-card-title">Update Password</h2>
                <p className="profile-card-text">Choose a secure password with at least 6 characters.</p>
              </div>
            </div>

            <div className="profile-form">
              <FormField
                label="Current Password"
                name="old_password"
                value={form.old_password}
                onChange={handleChange}
                error={errors.old_password}
              />
              <FormField
                label="New Password"
                name="new_password"
                value={form.new_password}
                onChange={handleChange}
                error={errors.new_password}
              />
              <FormField
                label="Confirm New Password"
                name="confirm_password"
                value={form.confirm_password}
                onChange={handleChange}
                error={errors.confirm_password}
              />

              <div className="profile-password-tips">
                <div className="profile-tip">
                  <CheckCircle2 size={15} />
                  <span>Use at least 6 characters</span>
                </div>
                <div className="profile-tip">
                  <CheckCircle2 size={15} />
                  <span>Avoid reusing your old password</span>
                </div>
              </div>

              <button
                type="button"
                className="btn-primary profile-submit"
                onClick={handleSubmit}
                disabled={loading}
              >
                <LockKeyhole size={16} />
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        </section>
      </div>

      <style>{`
        .profile-page {
          min-height: 100%;
          padding: 28px;
          background:
            radial-gradient(circle at top right, rgba(14, 165, 233, 0.12), transparent 28%),
            linear-gradient(180deg, #f8fbff 0%, #f3f7fc 100%);
        }
        .profile-hero {
          display: flex;
          justify-content: space-between;
          align-items: stretch;
          gap: 20px;
          margin-bottom: 24px;
          padding: 28px 30px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 24px;
          background: linear-gradient(135deg, #123a67 0%, #1f5fa4 55%, #4f9cf4 100%);
          color: #ffffff;
          box-shadow: 0 24px 48px rgba(15, 23, 42, 0.12);
        }
        .profile-hero-copy {
          max-width: 560px;
        }
        .profile-kicker {
          display: inline-flex;
          align-items: center;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.14);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .profile-title {
          margin: 14px 0 8px;
          font-size: 34px;
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -0.03em;
        }
        .profile-subtitle {
          margin: 0;
          max-width: 520px;
          font-size: 15px;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.84);
        }
        .profile-hero-card {
          min-width: 260px;
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.14);
          backdrop-filter: blur(6px);
        }
        .profile-avatar {
          width: 58px;
          height: 58px;
          border-radius: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.18);
          font-size: 24px;
          font-weight: 800;
        }
        .profile-hero-name {
          font-size: 18px;
          font-weight: 700;
          line-height: 1.35;
        }
        .profile-hero-meta {
          margin-top: 4px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.8);
          word-break: break-word;
        }
        .profile-grid {
          display: grid;
          grid-template-columns: minmax(300px, 0.95fr) minmax(420px, 1.25fr);
          gap: 24px;
          align-items: start;
        }
        .profile-card {
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
        }
        .profile-summary-card {
          position: sticky;
          top: 20px;
        }
        .profile-card-header {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 22px;
        }
        .profile-card-icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.12) 0%, rgba(14, 165, 233, 0.16) 100%);
          color: #1d4ed8;
          flex-shrink: 0;
        }
        .profile-card-icon-accent {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.14) 0%, rgba(45, 212, 191, 0.16) 100%);
          color: #0f766e;
        }
        .profile-card-title {
          margin: 0;
          color: #123253;
          font-size: 22px;
          font-weight: 700;
          line-height: 1.2;
        }
        .profile-card-text {
          margin: 6px 0 0;
          color: #5b7088;
          font-size: 14px;
          line-height: 1.6;
        }
        .profile-info-list {
          display: grid;
          gap: 14px;
        }
        .profile-info-item {
          display: flex;
          gap: 14px;
          align-items: center;
          padding: 15px 16px;
          border: 1px solid rgba(226, 232, 240, 0.95);
          border-radius: 18px;
          background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
        }
        .profile-info-icon {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #eff6ff;
          color: #1d4ed8;
          flex-shrink: 0;
        }
        .profile-info-copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .profile-info-label {
          color: #6b7280;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .profile-info-value {
          color: #102a43;
          font-size: 15px;
          font-weight: 600;
          word-break: break-word;
        }
        .profile-note {
          margin-top: 18px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 14px;
          background: #edfdf6;
          color: #166534;
          font-size: 13px;
          font-weight: 500;
        }
        .profile-form {
          display: grid;
          gap: 16px;
        }
        .profile-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .profile-field-label {
          color: #1f3b57;
          font-size: 14px;
          font-weight: 600;
        }
        .profile-field-input {
          width: 100%;
          min-height: 48px;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid #d8e1eb;
          background: #fbfdff;
          color: #102a43;
          font-size: 14px;
          outline: none;
          transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
          box-sizing: border-box;
        }
        .profile-field-input:focus {
          border-color: #2563eb;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
        }
        .profile-field-input.error {
          border-color: #ef4444;
          box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.08);
        }
        .profile-field-error {
          color: #dc2626;
          font-size: 12px;
          font-weight: 500;
        }
        .profile-password-tips {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 2px;
        }
        .profile-tip {
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
        .profile-submit {
          width: 100%;
          justify-content: center;
          min-height: 50px;
          margin-top: 6px;
          border-radius: 14px;
        }
        @media (max-width: 1024px) {
          .profile-page {
            padding: 22px;
          }
          .profile-hero {
            flex-direction: column;
          }
          .profile-grid {
            grid-template-columns: 1fr;
          }
          .profile-summary-card {
            position: static;
          }
          .profile-hero-card {
            min-width: 100%;
          }
        }
        @media (max-width: 768px) {
          .profile-page {
            padding: 16px;
          }
          .profile-hero,
          .profile-card {
            padding: 20px;
            border-radius: 20px;
          }
          .profile-title {
            font-size: 28px;
          }
        }
      `}</style>
    </>
  );
};

const FormField = ({ label, name, value, onChange, error }) => (
  <div className="profile-field">
    <label className="profile-field-label" htmlFor={name}>
      {label}
    </label>
    <input
      id={name}
      type="password"
      name={name}
      value={value}
      onChange={onChange}
      className={`profile-field-input ${error ? 'error' : ''}`}
    />
    {error ? <span className="profile-field-error">{error}</span> : null}
  </div>
);

export default UserProfilePage;
