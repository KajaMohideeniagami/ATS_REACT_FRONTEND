import React, { useEffect, useState, useCallback } from "react";
import { X } from "lucide-react";
import ProfileStatusTable from "./ProfileStatusTable";
import { getProfileStatusList } from "../../../services/profileStatusService";
import { toast } from "../../../components/toast/index";
import { API_BASE_URL, API_ENDPOINTS } from "../../../config/apiConfig";
import ProfileLogModal from "./ProfileLogModal";

const ProfileStatus = ({ customerId, customerName, isOpen, onClose }) => {
  const [demandId, setDemandId] = useState("");
  const [demands,  setDemands]  = useState([]);
  const [data,     setData]     = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchDemands = async () => {
      try {
        const res  = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CUSTOMER_DETAILS}${customerId}`);
        const json = await res.json();
        setDemands(json.demands || []);
      } catch {
        toast.error("Failed to load demands");
      }
    };
    fetchDemands();
  }, [isOpen, customerId]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  const loadData = useCallback(async () => {
    if (!demandId) return;
    try {
      setLoading(true);
      const res = await getProfileStatusList(demandId, customerId);
      setData(res.data.data || []);
    } catch {
      toast.error("Failed to load profiles");
    } finally {
      setLoading(false);
    }
  }, [demandId, customerId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleClose = () => {
    setDemandId("");
    setDemands([]);
    setData([]);
    onClose();
  };

if (!isOpen) return null;

return (
  <>
    {/* Backdrop */}
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
      }}
      onClick={handleClose}
    />

    {/* Modal */}
    <div
      style={{
        position: "fixed",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 1001,
        background: "#ffffff",
        borderRadius: "16px",
        width: "95%",
        maxWidth: "1400px",
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 24px 16px",
        borderBottom: "1px solid var(--ats-border)",
        flexShrink: 0,
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--ats-primary)", fontFamily: "Inter, sans-serif" }}>
            Profile Status
          </h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowLog(true)}
            style={{ height: 32, padding: "0 12px", fontSize: 12 }}
          >
            Profile Log
          </button>
          <button
            onClick={handleClose}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 32, height: 32, background: "none", border: "none",
              borderRadius: 8, cursor: "pointer", color: "var(--ats-secondary)",
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Demand Filter */}
      <div style={{
        padding: "14px 24px",
        borderBottom: "1px solid var(--ats-border)",
        flexShrink: 0,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <label style={{
          fontSize: 13, fontWeight: 600, color: "var(--ats-primary)",
          fontFamily: "Inter, sans-serif", whiteSpace: "nowrap",
        }}>
          Select Demand
        </label>
        <select
          className="form-select"
          style={{ maxWidth: 380 }}
          value={demandId}
          onChange={(e) => { setData([]); setDemandId(e.target.value); }}
        >
          <option value="">— Choose a demand —</option>
          {demands.map((d) => (
            <option key={d.demand_id} value={d.demand_id}>
              {d.demand_code} — {d.job_role}
            </option>
          ))}
        </select>
      </div>

      {/* Scrollable Table Body */}
      <div style={{ overflowY: "auto", flex: 1, padding: "0 24px 24px" }}>
        {demandId ? (
          <ProfileStatusTable data={data} reload={loadData} loading={loading} />
        ) : (
          <p style={{
            textAlign: "center", padding: "40px 0",
            color: "var(--ats-secondary)", fontFamily: "Inter, sans-serif", fontSize: 14,
          }}>
            Select a demand above to view profiles.
          </p>
        )}
      </div>
    </div>
    <ProfileLogModal
      isOpen={showLog}
      onClose={() => setShowLog(false)}
      customerId={customerId}
      demands={demands}
    />
  </>);
}

export default ProfileStatus;

