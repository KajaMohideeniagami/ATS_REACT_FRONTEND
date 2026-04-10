import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { X } from "lucide-react";
import Loader from "../../common/Loader";
import { API_BASE_URL, LOV_ENDPOINTS } from "../../../config/apiConfig";
import { getDemandDetails } from "../../../services/demandService";
import { attachGlobalLoaderInterceptors } from "../../../services/httpLoader";
import { toast } from "../../toast/index";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

attachGlobalLoaderInterceptors(api);

const getLovData = async (path) => {
  try {
    const res = await api.get(path);
    if (res.data?.items) return res.data.items;
    if (Array.isArray(res.data)) return res.data;
    return [];
  } catch {
    return [];
  }
};

const ReadField = ({ label, value, textarea = false, rows = 4, fullWidth = false }) => (
  <div className={`form-group${fullWidth ? " vdr-full" : ""}`}>
    <label className="form-label vdr-label">{label}</label>
    {textarea ? (
      <textarea
        className="form-textarea vdr-readonly"
        readOnly
        rows={rows}
        value={value || ""}
      />
    ) : (
      <input className="form-input vdr-readonly" readOnly value={value || ""} />
    )}
  </div>
);

const getLabel = (options, value) =>
  options.find((option) => String(option.value) === String(value))?.label || value || "";

const ViewDemandRequestModal = ({ isOpen, onClose, customerId, demandId }) => {
  const [loading, setLoading] = useState(false);
  const [demandDetails, setDemandDetails] = useState(null);
  const [lovs, setLovs] = useState({
    countries: [],
    jobTypes: [],
    workModes: [],
    currencies: [],
    decisions: [],
  });

  const handleClose = useCallback(() => {
    setDemandDetails(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") handleClose();
    };
    if (isOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleClose, isOpen]);

  useEffect(() => {
    if (!isOpen || !customerId || !demandId) return;

    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      try {
        const [details, countries, jobTypes, workModes, currencies, decisions] = await Promise.all([
          getDemandDetails(customerId, demandId),
          getLovData(LOV_ENDPOINTS.COUNTRIES),
          getLovData(LOV_ENDPOINTS.JOB_TYPES),
          getLovData(LOV_ENDPOINTS.WORK_MODES),
          getLovData(LOV_ENDPOINTS.CURRENCIES),
          getLovData(LOV_ENDPOINTS.DECISION_STATUSES),
        ]);

        if (cancelled) return;

        setDemandDetails(details);
        setLovs({ countries, jobTypes, workModes, currencies, decisions });
      } catch {
        if (!cancelled) {
          toast.error("Failed to load demand details.");
          handleClose();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [customerId, demandId, handleClose, isOpen]);

  const mapped = useMemo(() => {
    if (!demandDetails) return null;

    return {
      demandType: getLabel(lovs.jobTypes, demandDetails.job_type_id) || demandDetails.job_type_name || demandDetails.job_type || "",
      locationType: demandDetails.demand_type || demandDetails.location_type || "",
      country: getLabel(lovs.countries, demandDetails.country_id) || demandDetails.country_name || "",
      workMode: getLabel(lovs.workModes, demandDetails.work_mode_id) || demandDetails.work_mode_name || "",
      demandDate: demandDetails.demand_date || "",
      billingDate: demandDetails.billable_date || "",
      role: demandDetails.job_role || "",
      noOfPosition: demandDetails.no_of_position || "",
      duration: demandDetails.duration_no || "",
      currency: getLabel(lovs.currencies, demandDetails.salary_currency_id) || demandDetails.currency || "",
      salaryMin: demandDetails.salary_range_pa_min || "",
      salaryMax: demandDetails.salary_range_pa_max || "",
      yearFrom: demandDetails.year_of_exp_from || "",
      yearTo: demandDetails.year_of_exp_to || "",
      jobDescription: demandDetails.job_description || "",
      keywords: demandDetails.profile_keywords || "",
      endClient: demandDetails.end_client_name || "",
      resourceLocation: demandDetails.resource_location || "",
      standardWorkTiming:
        String(demandDetails.standard_time) === "1" ? "Yes" :
        String(demandDetails.standard_time) === "0" ? "No" :
        demandDetails.standard_time || "",
      additionalNotes: demandDetails.comments || "",
      decision: getLabel(lovs.decisions, demandDetails.des_status_id) || demandDetails.decision_status_name || "",
      noOfLostPosition: demandDetails.no_of_lost_position || demandDetails.lost_position || "0",
    };
  }, [demandDetails, lovs]);

  if (!isOpen) return null;

  return (
    <>
      <div className="vdr-backdrop" onClick={handleClose} />
      <div className="vdr-modal" role="dialog" aria-modal="true" aria-labelledby="view-demand-title">
        <div className="vdr-header">
          <h2 className="ats-heading-2" id="view-demand-title">View Demand Request</h2>
          <button type="button" className="vdr-close" onClick={handleClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="vdr-body">
          {loading || !mapped ? (
            <Loader inline message="Loading demand details..." />
          ) : (
            <div className="vdr-grid">
              <ReadField label="Demand Type" value={mapped.demandType} />
              <ReadField label="Location Type" value={mapped.locationType} />
              <ReadField label="Country" value={mapped.country} />
              <ReadField label="Work Mode" value={mapped.workMode} />
              <ReadField label="Demand Date" value={mapped.demandDate} />
              <ReadField label="Billing Date" value={mapped.billingDate} />
              <ReadField label="Role" value={mapped.role} />
              <ReadField label="No Of Position" value={mapped.noOfPosition} />
              <ReadField label="Duration" value={mapped.duration} />
              <ReadField label="Currency" value={mapped.currency} />
              <ReadField label="Salary Min" value={mapped.salaryMin} />
              <ReadField label="Salary Max" value={mapped.salaryMax} />
              <ReadField label="Year Of Exp (From)" value={mapped.yearFrom} />
              <ReadField label="Year Of Exp (To)" value={mapped.yearTo} />
              <ReadField label="Job Description" value={mapped.jobDescription} textarea rows={5} fullWidth />
              <ReadField label="Keywords" value={mapped.keywords} textarea rows={4} fullWidth />
              <ReadField label="End Client" value={mapped.endClient} />
              <ReadField label="Resource Location" value={mapped.resourceLocation} />
              <ReadField label="Standard Work Timing" value={mapped.standardWorkTiming} />
              <div />
              <ReadField label="Additional Notes" value={mapped.additionalNotes} textarea rows={4} fullWidth />
              <ReadField label="Decision" value={mapped.decision} />
              <ReadField label="No Of Lost Position" value={mapped.noOfLostPosition} />
            </div>
          )}
        </div>
        <div className="vdr-footer">
          <button type="button" className="btn-secondary" onClick={handleClose}>Close</button>
        </div>
      </div>

      <style>{`
        .vdr-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          z-index: 1000;
        }
        .vdr-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1001;
          width: min(900px, calc(100vw - 24px));
          max-height: 88vh;
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.2);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .vdr-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px 16px;
          border-bottom: 1px solid var(--ats-border);
          flex-shrink: 0;
        }
        .vdr-close {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: none;
          border: none;
          border-radius: 8px;
          color: var(--ats-secondary);
          cursor: pointer;
        }
        .vdr-close:hover {
          background: var(--ats-bg-accent);
          color: var(--ats-primary);
        }
        .vdr-body {
          padding: 20px 24px;
          overflow-y: auto;
          flex: 1;
        }
        .vdr-footer {
          display: flex;
          justify-content: flex-end;
          padding: 16px 24px 20px;
          border-top: 1px solid var(--ats-border);
          flex-shrink: 0;
        }
        .vdr-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0 20px;
        }
        .vdr-grid .form-group {
          margin-bottom: 18px;
        }
        .vdr-full {
          grid-column: 1 / -1;
        }
        .vdr-label {
          text-transform: none;
          letter-spacing: 0;
          font-size: 13px;
          font-weight: 600;
        }
        .vdr-readonly {
          background: #fbfdff;
          color: var(--ats-neutral);
          border-style: dashed;
          cursor: default;
        }
        @media (max-width: 768px) {
          .vdr-modal {
            width: calc(100vw - 12px);
            max-height: 92vh;
          }
          .vdr-grid {
            grid-template-columns: 1fr;
          }
          .vdr-full {
            grid-column: auto;
          }
        }
      `}</style>
    </>
  );
};

export default ViewDemandRequestModal;
