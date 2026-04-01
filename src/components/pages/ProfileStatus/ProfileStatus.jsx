import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ProfileStatusTable from "./ProfileStatusTable";
import { getProfileStatusList } from "../../../services/profileStatusService";
import { toast } from "../../../components/Toast";

const ProfileStatusPage = () => {
  const { id }     = useParams();   // customer id from URL
  const navigate   = useNavigate();

  const [demandId, setDemandId] = useState("");
  const [demands,  setDemands]  = useState([]);
  const [data,     setData]     = useState([]);
  const [loading,  setLoading]  = useState(false);

  // Load demands dropdown from already-fetched customer demands
  // We reuse the existing /customers_details/details/{id} endpoint
  useEffect(() => {
    const fetchDemands = async () => {
      try {
        const res = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/customers_details/details/${id}`
        );
        const json = await res.json();
        setDemands(json.demands || []);
      } catch (err) {
        toast.error("Failed to load demands");
      }
    };
    fetchDemands();
  }, [id]);

  const loadData = useCallback(async () => {
    if (!demandId) return;
    try {
      setLoading(true);
      const res = await getProfileStatusList(demandId, id);
      setData(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load profiles");
    } finally {
      setLoading(false);
    }
  }, [demandId, id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div style={{ padding: "24px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <button className="btn-icon" onClick={() => navigate(`/customers/${id}`)}>
          <ArrowLeft size={18} /> Back
        </button>
        <h2 className="ats-heading-1">Profile Status</h2>
      </div>

      {/* Demand filter */}
      <div style={{ marginBottom: 20, maxWidth: 360 }}>
        <label className="form-label">Select Demand</label>
        <select
          className="form-input"
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

      {/* Table */}
      {demandId ? (
        <ProfileStatusTable
          data={data}
          reload={loadData}
          loading={loading}
        />
      ) : (
        <p className="detail-empty">Select a demand above to view profiles.</p>
      )}

    </div>
  );
};

export default ProfileStatusPage;