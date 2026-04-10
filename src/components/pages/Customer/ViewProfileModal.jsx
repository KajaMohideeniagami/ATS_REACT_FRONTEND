import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import Loader from "../../common/Loader";
import { getProfileView } from "../../../services/profileViewService";
import axios from "axios";
import { API_BASE_URL, LOV_ENDPOINTS } from "../../../config/apiConfig";

const EMPTY_CELL = "-";

const displayText = (value, fallback = EMPTY_CELL) => {
  if (value === 0 || value === "0") return "0";
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  return text;
};

const ReadField = ({ label, value }) => (
  <div className="form-group">
    {label && <label className="form-label">{label}</label>}
    <input
      className="form-input"
      value={displayText(value)}
      readOnly
      style={{ background: "#f1f5f9", color: "#64748b", cursor: "default" }}
    />
  </div>
);

const ViewProfileModal = ({ isOpen, onClose, profileId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [workModes, setWorkModes] = useState([]);
  const [availabilityOptions, setAvailabilityOptions] = useState([]);
  const [currencies, setCurrencies] = useState([]);

  const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
  });

  const getLovData = async (path) => {
    try {
      const res = await api.get(path);
      return res.data.items || [];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    if (!isOpen || !profileId) return;

    const loadProfile = async () => {
      setLoading(true);
      setError("");
      try {
        const [profile, wm, av, cu] = await Promise.all([
          getProfileView(profileId),
          getLovData(LOV_ENDPOINTS.WORK_MODES),
          getLovData(LOV_ENDPOINTS.PROFILE_AVAILABILITY),
          getLovData(LOV_ENDPOINTS.CURRENCIES),
        ]);
        if (profile?.success === false) {
          setError(profile?.message || "Failed to load profile.");
          setData(null);
          return;
        }
        setWorkModes(wm);
        setAvailabilityOptions(av);
        setCurrencies(cu);
        setData(profile || null);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load profile.");
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [isOpen, profileId]);

  if (!isOpen) return null;

  const workModeLabel = (() => {
    if (!data?.work_mode && data?.work_mode !== 0) return EMPTY_CELL;
    const found = workModes.find(
      (w) => String(w.value) === String(data.work_mode)
    );
    return found?.label || data.work_mode;
  })();

  const availabilityLabel = (() => {
    if (!data?.availability && data?.availability !== 0) return EMPTY_CELL;
    const found = availabilityOptions.find(
      (a) => String(a.value) === String(data.availability)
    );
    return found?.label || data.availability;
  })();

  const currencyLabel = (() => {
    if (!data?.currency && data?.currency !== 0) return EMPTY_CELL;
    const found = currencies.find(
      (c) => String(c.value) === String(data.currency)
    );
    return found?.label || data.currency;
  })();

  return (
    <>
      <div className="dm-backdrop" onClick={onClose} />
      <div className="dm-modal" role="dialog" aria-modal="true" aria-labelledby="view-profile-title">
        <div className="dm-header">
          <h2 className="ats-heading-2" id="view-profile-title">View Profile</h2>
          <button type="button" className="dm-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="dm-body">
          {loading ? (
            <Loader message="Loading profile..." inline />
          ) : error ? (
            <div className="error">{error}</div>
          ) : (
            <div className="dm-form-grid">
              <p className="dm-section-label">Demand</p>
              <div className="dm-row">
                <ReadField label="Demand" value={data?.demand_display} />
                <div />
              </div>

              <p className="dm-section-label">Basic Information</p>
              <div className="dm-row">
                <ReadField label="Name" value={data?.name} />
                <ReadField label="Current Company" value={data?.current_company} />
              </div>
              <div className="dm-row">
                <ReadField label="Current Location" value={data?.current_location} />
                <ReadField label="Preferred Location" value={data?.preferred_location} />
              </div>
              <div className="dm-row">
                <ReadField label="Contact No" value={data?.contact_no} />
                <ReadField label="Email" value={data?.email} />
              </div>
              <div className="dm-row">
                <ReadField label="Work Mode" value={workModeLabel} />
                <ReadField label="Availability" value={availabilityLabel} />
              </div>

              <p className="dm-section-label">Experience & Notice</p>
              <div className="dm-row">
                <ReadField label="Total Years of Exp" value={data?.total_exp} />
                <ReadField label="Relevant Exp" value={data?.relevant_exp} />
              </div>
              <div className="dm-row">
                <ReadField label="Notice Period (Days)" value={data?.notice_period} />
                <ReadField label="Currency" value={currencyLabel} />
              </div>
              <div className="dm-row">
                <ReadField label="Current Salary (PA)" value={data?.current_salary} />
                <ReadField label="Expected Salary (PA)" value={data?.expected_salary} />
              </div>

              <p className="dm-section-label">Vendor</p>
              <div className="dm-row">
                <ReadField label="Vendor" value={data?.vendor} />
                <div />
              </div>
            </div>
          )}
        </div>

        <div className="dm-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <style>{`
        .dm-backdrop {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          z-index: 1000;
          animation: dmFadeIn 0.2s ease;
        }
        .dm-modal {
          position: fixed;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1001;
          background: #ffffff;
          border-radius: 16px;
          width: 92%;
          max-width: 660px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 24px 64px rgba(0,0,0,0.2);
          animation: dmSlideUp 0.25s cubic-bezier(0.34,1.56,0.64,1);
        }
        .dm-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 20px 24px 16px;
          border-bottom: 1px solid var(--ats-border);
          flex-shrink: 0;
        }
        .dm-close {
          display: inline-flex; align-items: center; justify-content: center;
          width: 32px; height: 32px;
          background: none; border: none; border-radius: 8px;
          color: var(--ats-secondary); cursor: pointer; transition: all 0.15s ease;
        }
        .dm-close:hover { background: var(--ats-bg-accent); color: var(--ats-primary); }
        .dm-body { padding: 20px 24px; overflow-y: auto; flex: 1; }
        .dm-footer {
          display: flex; justify-content: flex-end; gap: 12px;
          padding: 16px 24px 20px;
          border-top: 1px solid var(--ats-border);
          flex-shrink: 0;
        }
        .dm-section-label {
          font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.08em;
          color: var(--ats-secondary);
          margin: 20px 0 12px; padding-bottom: 6px;
          border-bottom: 1px solid var(--ats-border);
        }
        .dm-row {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 16px; margin-bottom: 16px;
        }
        .form-group { display: flex; flex-direction: column; gap: 4px; }
        .form-label { font-size: 13px; font-weight: 500; color: var(--ats-primary); }
        .form-input {
          width: 100%; padding: 8px 12px;
          border: 1px solid var(--ats-border); border-radius: 8px;
          font-size: 14px; color: var(--ats-neutral);
          background: #fff;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          box-sizing: border-box;
          font-family: 'Inter', sans-serif;
        }
        @keyframes dmFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dmSlideUp {
          from { opacity: 0; transform: translate(-50%, -45%); }
          to   { opacity: 1; transform: translate(-50%, -50%); }
        }
        @media (max-width: 768px) {
          .dm-modal {
            width: 100%; max-width: 100%;
            top: auto; bottom: 0; left: 0; transform: none;
            border-radius: 16px 16px 0 0; max-height: 95vh;
          }
          .dm-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
};

export default ViewProfileModal;
