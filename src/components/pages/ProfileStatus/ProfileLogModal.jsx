import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import Loader from "../../common/Loader";
import { getProfileStatusList } from "../../../services/profileStatusService";
import { getProfileLog } from "../../../services/profileLogService";
import { toast } from "../../../components/toast/index";

const EMPTY_CELL = "-";

const displayText = (value, fallback = EMPTY_CELL) => {
  if (value === 0 || value === "0") return "0";
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  return text;
};

const ProfileLogModal = ({ isOpen, onClose, customerId, demands }) => {
  const [demandId, setDemandId] = useState("");
  const [profiles, setProfiles] = useState([]);
  const [profileId, setProfileId] = useState("");
  const [logs, setLogs] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDemandId("");
    setProfiles([]);
    setProfileId("");
    setLogs([]);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !demandId) return;

    const loadProfiles = async () => {
      setLoadingProfiles(true);
      try {
        const res = await getProfileStatusList(demandId, customerId);
        const list = res?.data?.data || [];
        setProfiles(list);
      } catch {
        toast.error("Failed to load profiles");
        setProfiles([]);
      } finally {
        setLoadingProfiles(false);
      }
    };

    setProfileId("");
    setLogs([]);
    loadProfiles();
  }, [isOpen, demandId, customerId]);

  useEffect(() => {
    if (!isOpen || !profileId) return;

    const loadLogs = async () => {
      setLoadingLogs(true);
      try {
        const res = await getProfileLog(profileId);
        const rows = res?.data || res?.logs || res || [];
        setLogs(Array.isArray(rows) ? rows : []);
      } catch {
        toast.error("Failed to load profile logs");
        setLogs([]);
      } finally {
        setLoadingLogs(false);
      }
    };

    loadLogs();
  }, [isOpen, profileId]);

  const demandOptions = useMemo(() => demands || [], [demands]);

  if (!isOpen) return null;

  return (
    <>
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
        }}
        onClick={onClose}
      />

      <div
        style={{
          position: "fixed",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1001,
          background: "#ffffff",
          borderRadius: "16px",
          width: "95%",
          maxWidth: "900px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px 16px", borderBottom: "1px solid var(--ats-border)",
        }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--ats-primary)", fontFamily: "Inter, sans-serif" }}>
            Profile Log
          </h2>
          <button
            onClick={onClose}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 32, height: 32, background: "none", border: "none",
              borderRadius: 8, cursor: "pointer", color: "var(--ats-secondary)",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{
          padding: "14px 24px",
          borderBottom: "1px solid var(--ats-border)",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}>
          <div className="form-group">
            <label className="form-label">Demand Code</label>
            <select
              className="form-select"
              value={demandId}
              onChange={(e) => setDemandId(e.target.value)}
            >
              <option value="">— Choose demand —</option>
              {demandOptions.map((d) => (
                <option key={d.demand_id} value={d.demand_id}>
                  {d.demand_code ? `${d.demand_code} - ${d.job_role}` : d.job_role}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Profile Code</label>
            <select
              className="form-select"
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              disabled={!demandId || loadingProfiles}
            >
              <option value="">— Choose profile —</option>
              {profiles.map((p) => (
                <option key={p.profile_id} value={p.profile_id}>
                  {p.profile_code
                    ? `${p.profile_code} - ${p.profile_name || "Unnamed"}`
                    : (p.profile_name || `Profile #${p.profile_id}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ overflowY: "auto", padding: "0 24px 24px", flex: 1 }}>
          {loadingLogs ? (
            <Loader message="Loading profile logs..." inline />
          ) : logs.length === 0 ? (
            <p style={{
              textAlign: "center", padding: "32px 0",
              color: "var(--ats-secondary)", fontFamily: "Inter, sans-serif", fontSize: 14,
            }}>
              {profileId ? "No log entries found." : "Select demand and profile to view log."}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
              {logs.map((row, idx) => (
                <div
                  key={`${row.profile_id}-${idx}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "36px 1fr",
                    gap: 16,
                    padding: "12px 0",
                    borderBottom: "1px solid var(--ats-border)",
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "var(--ats-primary)", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 12, fontWeight: 600,
                  }}>
                    {idx + 1}
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <strong style={{ fontSize: 14 }}>{displayText(row.status_name)}</strong>
                      <span style={{ fontSize: 12, color: "var(--ats-secondary)" }}>
                        {displayText(row.status_change_date)}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ats-secondary)", marginTop: 4 }}>
                      {displayText(row.recruiter_name)}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 13 }}>
                      {displayText(row.days_to_change)}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 13, color: "var(--ats-neutral)" }}>
                      {displayText(row.notes, "Status Change Information not provided")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ProfileLogModal;
