import React, { useState, useEffect, useCallback, useRef } from "react";
import { X, Upload, FileText } from "lucide-react";
import { toast } from "../../Toast";
import axios from "axios";
import { API_BASE_URL, API_ENDPOINTS, LOV_ENDPOINTS } from "../../../config/apiConfig";
import { getDemandDetails } from "../../../services/demandService";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
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

// ── Convert File to base64 ────────────────────────────────────────────────
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const AVAILABILITY_FALLBACK = [
  { value: "Serving Notice", label: "Serving Notice" },
  { value: "Immediate",      label: "Immediate"      },
  { value: "Working",        label: "Working"        },
];

const initialForm = {
  PROFILE_NAME:           "",
  PROFILE_EMAIL:          "",
  PROFILE_CONTACT_NO:     "",
  CURRENT_LOCATION:       "",
  CURRENT_COMPANY:        "",
  PREFERRED_LOCATION:     "",
  WORK_MODE_ID:           "",
  WORK_EXP_IN_YEARS:      "",
  RELEVANT_EXP_IN_YEARS:  "",
  SALARY_CURRENCY_ID:     "",
  CURRENT_SALARY_PA:      "",
  EXPECTED_SALARY_PA:     "",
  PROFILE_AVAILABILITY:   "Serving Notice",
  NOTICE_PERIOD_DAYS:     "",
  NEGOTIABLE_DAYS:        "",
  TAX_TERMS:              "",
  VENDOR_ID:              "",
  NOTES:                  "",
  FILE_NAME:              "",
  PROFILE_URL:            "",
};

// ── Small helpers — defined OUTSIDE component so React never recreates them ──
const Field = ({ label, required, error, children }) => (
  <div className="form-group">
    {label && <label className="form-label">{label}{required && " *"}</label>}
    {children}
    {error && <span className="form-error">{error}</span>}
  </div>
);

const ReadField = ({ label, value }) => (
  <div className="form-group">
    {label && <label className="form-label">{label}</label>}
    <input
      className="form-input"
      value={value ?? "—"}
      readOnly
      style={{ background: "#f1f5f9", color: "#64748b", cursor: "default" }}
    />
  </div>
);

// ═════════════════════════════════════════════════════════════════════════════
const AddProfileModal = ({ isOpen, onClose, onSuccess, demandId, demandType, demands = [], customerId }) => {
  const [formData,           setFormData]          = useState(initialForm);
  const [errors,             setErrors]            = useState({});
  const [loading,            setLoading]           = useState(false);
  const [uploadingFile,      setUploadingFile]     = useState(false);
  const [selectedFileName,   setSelectedFileName]  = useState("");
  const [selectedFile,       setSelectedFile]      = useState(null);
  const [selectedDemandId,   setSelectedDemandId]  = useState(demandId ? String(demandId) : "");
  const [selectedDemandInfo, setSelectedDemandInfo]= useState(null);
  const [demandDetails,      setDemandDetails]     = useState(null);

  const [workModes,          setWorkModes]         = useState([]);
  const [currencies,         setCurrencies]        = useState([]);
  const [availabilityOpts,   setAvailabilityOpts]  = useState([]);
  const [taxTermsOpts,       setTaxTermsOpts]      = useState([]);
  const [vendors,            setVendors]           = useState([]);

  const fileInputRef = useRef(null);

  // ── Reset ────────────────────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setFormData(initialForm);
    setErrors({});
    setSelectedFileName("");
    setSelectedFile(null);
    setSelectedDemandId(demandId ? String(demandId) : "");
    setSelectedDemandInfo(null);
    setDemandDetails(null);
  }, [demandId]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  // ── Load LOVs ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const loadLovs = async () => {
      const [wm, cu, av, tx, vd] = await Promise.all([
        getLovData(LOV_ENDPOINTS.WORK_MODES),
        getLovData(LOV_ENDPOINTS.CURRENCIES),
        getLovData(LOV_ENDPOINTS.PROFILE_AVAILABILITY),
        getLovData(LOV_ENDPOINTS.TAX_TERMS),
        getLovData(LOV_ENDPOINTS.VENDORS),
      ]);
      setWorkModes(wm);
      setCurrencies(cu);
      setAvailabilityOpts(av.length ? av : AVAILABILITY_FALLBACK);
      setTaxTermsOpts(tx);
      setVendors(vd);
    };

    loadLovs();
  }, [isOpen]);

  // ── Handle demand selection ──────────────────────────────────────────────
  const handleDemandChange = async (e) => {
    const val = e.target.value;
    setSelectedDemandId(val);
    if (errors.DEMAND_ID) setErrors(p => ({ ...p, DEMAND_ID: "" }));

    if (!val) {
      setSelectedDemandInfo(null);
      setDemandDetails(null);
      return;
    }

    const found = demands.find(d => String(d.demand_id) === String(val));
    setSelectedDemandInfo(found || null);

    try {
      const details = await getDemandDetails(customerId, val);
      setDemandDetails(details);
    } catch {
      setDemandDetails(null);
      toast.error("Could not load demand details");
    }
  };

  // ── Pre-select demand when demandId prop is passed ───────────────────────
  useEffect(() => {
    if (!isOpen || !demandId || !demands.length) return;
    const found = demands.find(d => String(d.demand_id) === String(demandId));
    if (found) {
      setSelectedDemandId(String(demandId));
      setSelectedDemandInfo(found);
    }
  }, [isOpen, demandId, demands]);

  // ── Escape key ───────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") handleClose(); };
    if (isOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, handleClose]);

  // ── Body scroll lock ─────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // ── Field change ─────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: "" }));
  };

  // ── File selection ───────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext)) {
      toast.error('Only PDF, DOC, DOCX files allowed.');
      return;
    }

    setSelectedFile(file);
    setSelectedFileName(file.name);
  };

  // ── Validation ───────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!selectedDemandId)                          e.DEMAND_ID             = "Please select a demand";
    if (!formData.PROFILE_NAME.trim())              e.PROFILE_NAME          = "Name is required";
    if (!formData.PROFILE_EMAIL.trim())             e.PROFILE_EMAIL         = "Email is required";
    else if (!emailRe.test(formData.PROFILE_EMAIL)) e.PROFILE_EMAIL         = "Invalid email format";
    if (!formData.CURRENT_LOCATION.trim())          e.CURRENT_LOCATION      = "Required";
    if (!formData.CURRENT_COMPANY.trim())           e.CURRENT_COMPANY       = "Required";
    if (!formData.PREFERRED_LOCATION.trim())        e.PREFERRED_LOCATION    = "Required";
    if (!formData.WORK_MODE_ID)                     e.WORK_MODE_ID          = "Required";
    if (!formData.WORK_EXP_IN_YEARS)                e.WORK_EXP_IN_YEARS     = "Required";
    if (!formData.RELEVANT_EXP_IN_YEARS)            e.RELEVANT_EXP_IN_YEARS = "Required";
    if (!formData.SALARY_CURRENCY_ID)               e.SALARY_CURRENCY_ID    = "Required";
    if (!formData.CURRENT_SALARY_PA)                e.CURRENT_SALARY_PA     = "Required";
    if (!formData.EXPECTED_SALARY_PA)               e.EXPECTED_SALARY_PA    = "Required";
    if (!formData.PROFILE_AVAILABILITY)             e.PROFILE_AVAILABILITY  = "Required";
    if (!formData.TAX_TERMS)                        e.TAX_TERMS             = "Required";
    if (!formData.VENDOR_ID)                        e.VENDOR_ID             = "Required";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        DEMAND_ID:             Number(selectedDemandId),
        PROFILE_NAME:          formData.PROFILE_NAME.trim(),
        PROFILE_EMAIL:         formData.PROFILE_EMAIL.trim(),
        PROFILE_CONTACT_NO:    formData.PROFILE_CONTACT_NO    || null,
        CURRENT_LOCATION:      formData.CURRENT_LOCATION.trim(),
        CURRENT_COMPANY:       formData.CURRENT_COMPANY.trim(),
        PREFERRED_LOCATION:    formData.PREFERRED_LOCATION.trim(),
        WORK_MODE_ID:          Number(formData.WORK_MODE_ID),
        WORK_EXP_IN_YEARS:     Number(formData.WORK_EXP_IN_YEARS),
        RELEVANT_EXP_IN_YEARS: Number(formData.RELEVANT_EXP_IN_YEARS),
        SALARY_CURRENCY_ID:    Number(formData.SALARY_CURRENCY_ID),
        CURRENT_SALARY_PA:     Number(formData.CURRENT_SALARY_PA),
        EXPECTED_SALARY_PA:    Number(formData.EXPECTED_SALARY_PA),
        PROFILE_AVAILABILITY:  formData.PROFILE_AVAILABILITY,
        NOTICE_PERIOD_DAYS:    formData.NOTICE_PERIOD_DAYS ? Number(formData.NOTICE_PERIOD_DAYS) : null,
        NEGOTIABLE_DAYS:       formData.NEGOTIABLE_DAYS    || null,
        TAX_TERMS:             formData.TAX_TERMS,
        VENDOR_ID:             Number(formData.VENDOR_ID),
        FILE_NAME:             formData.FILE_NAME          || null,
        PROFILE_URL:           formData.PROFILE_URL        || null,
        NOTES:                 formData.NOTES              || null,
      };

      const response = await api.post(
        API_ENDPOINTS.ADD_PROFILE,
        payload
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to add profile');
      }

      const profileId = response.data.profile_id;

      // ✅ Upload file after profile is saved
      if (selectedFile) {
        setUploadingFile(true);

        const base64 = await fileToBase64(selectedFile);

        const uploadRes = await api.post(
          API_ENDPOINTS.PROFILE_UPLOAD,
          {
            profile_id:     profileId,
            file_name:      selectedFile.name,
            file_base64:    base64,
            file_mime_type: selectedFile.type || 'application/octet-stream',
          }
        );

        setUploadingFile(false);

        if (!uploadRes.data.success) {
          throw new Error(uploadRes.data.message || 'Upload failed');
        }

        setFormData((p) => ({
          ...p,
          FILE_NAME:   uploadRes.data.file_name,
          PROFILE_URL: uploadRes.data.profile_url,
        }));
      }

      toast.success('Profile added successfully!');
      handleClose();
      onSuccess?.();

    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to add profile.');
    } finally {
      setLoading(false);
      setUploadingFile(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="dm-backdrop" onClick={handleClose} />

      <div className="dm-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">

        {/* Header */}
        <div className="dm-header">
          <h2 className="ats-heading-2" id="modal-title">Add Profile</h2>
          <button type="button" className="dm-close" onClick={handleClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="dm-body">
          <form id="add-profile-form" onSubmit={handleSubmit} noValidate>

            {/* ── Demand ── */}
            <p className="dm-section-label">Demand</p>
            <div className="dm-row">
              <Field label="Select Demand" required error={errors.DEMAND_ID}>
                <select
                  className={`form-select${errors.DEMAND_ID ? " input-error" : ""}`}
                  value={selectedDemandId}
                  onChange={handleDemandChange}
                >
                  <option value="">Select demand</option>
                  {demands.map(d => (
                    <option key={d.demand_id} value={d.demand_id}>
                      {d.demand_code
                        ? `${d.demand_code} - ${d.job_role || "Untitled"}`
                        : d.job_role || `Demand #${d.demand_id}`}
                    </option>
                  ))}
                </select>
              </Field>
              <div />
            </div>

            {/* Demand details (read-only) */}
            {demandDetails && (
              <>
                <div style={{ gridColumn: '1 / -1' }} className="form-group">
                  <label className="form-label">Job Description</label>
                  <textarea
                    className="form-textarea"
                    value={demandDetails.job_description || ""}
                    readOnly
                    rows={4}
                    style={{ background: "#f1f5f9", color: "#64748b", cursor: "default" }}
                  />
                </div>
                <div className="dm-row">
                  <ReadField label="Demand Type" value={demandDetails.demand_type} />
                  <ReadField label="Work Mode"   value={
                    workModes.find(w => String(w.value) === String(demandDetails.work_mode_id))?.label
                    || demandDetails.work_mode_name || "—"
                  } />
                </div>
                <div className="dm-row">
                  <ReadField label="Billable Date"    value={demandDetails.billable_date} />
                  <ReadField label="No. of Positions" value={demandDetails.no_of_position} />
                </div>
                <div className="dm-row">
                  <ReadField label="Salary Min (PA)" value={demandDetails.salary_range_pa_min} />
                  <ReadField label="Salary Max (PA)" value={demandDetails.salary_range_pa_max} />
                </div>
                <div className="dm-row">
                  <ReadField label="Exp (From)" value={demandDetails.year_of_exp_from} />
                  <ReadField label="Exp (To)"   value={demandDetails.year_of_exp_to} />
                </div>
              </>
            )}

            {/* ── Basic Info ── */}
            <p className="dm-section-label">Basic Information</p>
            <div className="dm-row">
              <Field label="Full Name" required error={errors.PROFILE_NAME}>
                <input
                  name="PROFILE_NAME"
                  className={`form-input${errors.PROFILE_NAME ? " input-error" : ""}`}
                  value={formData.PROFILE_NAME}
                  onChange={handleChange}
                  placeholder="Full name"
                />
              </Field>
              <Field label="Email" required error={errors.PROFILE_EMAIL}>
                <input
                  name="PROFILE_EMAIL"
                  type="email"
                  className={`form-input${errors.PROFILE_EMAIL ? " input-error" : ""}`}
                  value={formData.PROFILE_EMAIL}
                  onChange={handleChange}
                  placeholder="email@example.com"
                />
              </Field>
            </div>
            <div className="dm-row">
              <Field label="Contact No.">
                <input
                  name="PROFILE_CONTACT_NO"
                  className="form-input"
                  value={formData.PROFILE_CONTACT_NO}
                  onChange={handleChange}
                  placeholder="+91 99999 00000"
                />
              </Field>
              <Field label="Current Company" required error={errors.CURRENT_COMPANY}>
                <input
                  name="CURRENT_COMPANY"
                  className={`form-input${errors.CURRENT_COMPANY ? " input-error" : ""}`}
                  value={formData.CURRENT_COMPANY}
                  onChange={handleChange}
                  placeholder="Company name"
                />
              </Field>
            </div>
            <div className="dm-row">
              <Field label="Current Location" required error={errors.CURRENT_LOCATION}>
                <input
                  name="CURRENT_LOCATION"
                  className={`form-input${errors.CURRENT_LOCATION ? " input-error" : ""}`}
                  value={formData.CURRENT_LOCATION}
                  onChange={handleChange}
                  placeholder="City, Country"
                />
              </Field>
              <Field label="Preferred Location" required error={errors.PREFERRED_LOCATION}>
                <input
                  name="PREFERRED_LOCATION"
                  className={`form-input${errors.PREFERRED_LOCATION ? " input-error" : ""}`}
                  value={formData.PREFERRED_LOCATION}
                  onChange={handleChange}
                  placeholder="City, Country"
                />
              </Field>
            </div>

            {/* ── Experience ── */}
            <p className="dm-section-label">Experience</p>
            <div className="dm-row">
              <Field label="Work Mode" required error={errors.WORK_MODE_ID}>
                <select
                  name="WORK_MODE_ID"
                  className={`form-select${errors.WORK_MODE_ID ? " input-error" : ""}`}
                  value={formData.WORK_MODE_ID}
                  onChange={handleChange}
                >
                  <option value="">Select work mode</option>
                  {workModes.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                </select>
              </Field>
              <Field label="Total Experience (Yrs)" required error={errors.WORK_EXP_IN_YEARS}>
                <input
                  name="WORK_EXP_IN_YEARS"
                  type="number"
                  step="0.5"
                  min="0"
                  className={`form-input${errors.WORK_EXP_IN_YEARS ? " input-error" : ""}`}
                  value={formData.WORK_EXP_IN_YEARS}
                  onChange={handleChange}
                  placeholder="e.g. 5.5"
                />
              </Field>
            </div>
            <div className="dm-row">
              <Field label="Relevant Experience (Yrs)" required error={errors.RELEVANT_EXP_IN_YEARS}>
                <input
                  name="RELEVANT_EXP_IN_YEARS"
                  type="number"
                  step="0.5"
                  min="0"
                  className={`form-input${errors.RELEVANT_EXP_IN_YEARS ? " input-error" : ""}`}
                  value={formData.RELEVANT_EXP_IN_YEARS}
                  onChange={handleChange}
                  placeholder="e.g. 3"
                />
              </Field>
              <div />
            </div>

            {/* ── Compensation ── */}
            <p className="dm-section-label">Compensation</p>
            <div className="dm-row">
              <Field label="Currency" required error={errors.SALARY_CURRENCY_ID}>
                <select
                  name="SALARY_CURRENCY_ID"
                  className={`form-select${errors.SALARY_CURRENCY_ID ? " input-error" : ""}`}
                  value={formData.SALARY_CURRENCY_ID}
                  onChange={handleChange}
                >
                  <option value="">Select currency</option>
                  {currencies.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Tax Terms" required error={errors.TAX_TERMS}>
                <select
                  name="TAX_TERMS"
                  className={`form-select${errors.TAX_TERMS ? " input-error" : ""}`}
                  value={formData.TAX_TERMS}
                  onChange={handleChange}
                >
                  <option value="">Select tax terms</option>
                  {taxTermsOpts.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
            </div>
            <div className="dm-row">
              <Field label="Current Salary (PA)" required error={errors.CURRENT_SALARY_PA}>
                <input
                  name="CURRENT_SALARY_PA"
                  type="number"
                  min="0"
                  className={`form-input${errors.CURRENT_SALARY_PA ? " input-error" : ""}`}
                  value={formData.CURRENT_SALARY_PA}
                  onChange={handleChange}
                  placeholder="Annual salary"
                />
              </Field>
              <Field label="Expected Salary (PA)" required error={errors.EXPECTED_SALARY_PA}>
                <input
                  name="EXPECTED_SALARY_PA"
                  type="number"
                  min="0"
                  className={`form-input${errors.EXPECTED_SALARY_PA ? " input-error" : ""}`}
                  value={formData.EXPECTED_SALARY_PA}
                  onChange={handleChange}
                  placeholder="Annual salary"
                />
              </Field>
            </div>

            {/* ── Availability ── */}
            <p className="dm-section-label">Availability</p>
            <div className="dm-row">
              <Field label="Availability" required error={errors.PROFILE_AVAILABILITY}>
                <select
                  name="PROFILE_AVAILABILITY"
                  className={`form-select${errors.PROFILE_AVAILABILITY ? " input-error" : ""}`}
                  value={formData.PROFILE_AVAILABILITY}
                  onChange={handleChange}
                >
                  <option value="">Select availability</option>
                  {availabilityOpts.map(a => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Notice Period (Days)">
                <input
                  name="NOTICE_PERIOD_DAYS"
                  type="number"
                  min="0"
                  className="form-input"
                  value={formData.NOTICE_PERIOD_DAYS}
                  onChange={handleChange}
                  placeholder="e.g. 30"
                />
              </Field>
            </div>
            <div className="dm-row">
              <Field label="Negotiable Days">
                <input
                  name="NEGOTIABLE_DAYS"
                  className="form-input"
                  value={formData.NEGOTIABLE_DAYS}
                  onChange={handleChange}
                  placeholder="e.g. Up to 15 days"
                />
              </Field>
              <div />
            </div>

            {/* ── Vendor ── */}
            <p className="dm-section-label">Vendor</p>
            <div className="dm-row">
              <Field label="Vendor" required error={errors.VENDOR_ID}>
                <select
                  name="VENDOR_ID"
                  className={`form-select${errors.VENDOR_ID ? " input-error" : ""}`}
                  value={formData.VENDOR_ID}
                  onChange={handleChange}
                >
                  <option value="">Select vendor</option>
                  {vendors.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                </select>
              </Field>
              <div />
            </div>

            {/* ── Resume Upload ── */}
            <p className="dm-section-label">Resume</p>
            <div
              className="dm-upload-zone"
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              {uploadingFile ? (
                <span className="dm-upload-hint">Uploading...</span>
              ) : selectedFileName ? (
                <span className="dm-upload-selected">
                  <FileText size={16} /> {selectedFileName}
                </span>
              ) : (
                <>
                  <Upload size={20} className="dm-upload-icon" />
                  <span className="dm-upload-hint">Click to upload PDF, DOC or DOCX</span>
                </>
              )}
            </div>

            {/* ── Notes ── */}
            <p className="dm-section-label">Notes</p>
            <textarea
              name="NOTES"
              className="form-textarea"
              placeholder="Additional notes about this profile..."
              value={formData.NOTES}
              onChange={handleChange}
              rows={3}
            />

          </form>
        </div>

        {/* Footer */}
        <div className="dm-footer">
          <button type="button" className="btn-secondary" onClick={handleClose}>Cancel</button>
          <button
            form="add-profile-form"
            type="submit"
            className="btn-primary"
            disabled={loading || uploadingFile}
          >
            {loading ? "Saving..." : "Save Profile"}
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
        .form-input, .form-select, .form-textarea {
          width: 100%; padding: 8px 12px;
          border: 1px solid var(--ats-border); border-radius: 8px;
          font-size: 14px; color: var(--ats-neutral);
          background: #fff;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          box-sizing: border-box;
          font-family: 'Inter', sans-serif;
        }
        .form-input:focus, .form-select:focus, .form-textarea:focus {
          outline: none; border-color: var(--ats-primary);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
        }
        .form-textarea { resize: vertical; min-height: 80px; }
        .input-error { border-color: #ef4444 !important; }
        .form-error { font-size: 11px; color: #ef4444; margin-top: 2px; }
        .dm-upload-zone {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          border: 2px dashed var(--ats-border); border-radius: 10px;
          padding: 18px 16px; cursor: pointer; margin-bottom: 16px;
          transition: border-color 0.15s, background 0.15s;
        }
        .dm-upload-zone:hover,
        .dm-upload-zone:focus { outline: none; border-color: var(--ats-primary); background: var(--ats-bg-accent, #f5f9ff); }
        .dm-upload-icon { color: var(--ats-secondary); }
        .dm-upload-hint { font-size: 13px; color: var(--ats-secondary); }
        .dm-upload-selected {
          display: flex; align-items: center; gap: 6px;
          font-size: 13px; color: var(--ats-primary); font-weight: 500;
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

export default AddProfileModal;



