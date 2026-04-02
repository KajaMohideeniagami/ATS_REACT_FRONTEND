import React, { useState, useEffect } from "react";
import { updateProfileStatus } from "../../../services/profileStatusService";
import { getProfileStatuses } from "../../../services/lovService";
import { toast } from "../../Toast";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 7;

const ProfileStatusTable = ({ data, reload, loading }) => {
  const [rows,          setRows]          = useState(data);
  const [statusOptions, setStatusOptions] = useState([]);
  const [lovLoading,    setLovLoading]    = useState(true);
  const [page,          setPage]          = useState(1);

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        setLovLoading(true);
        const items = await getProfileStatuses();
        setStatusOptions(items);
      } catch {
        toast.error("Failed to load status options");
      } finally {
        setLovLoading(false);
      }
    };
    fetchStatuses();
  }, []);

  useEffect(() => {
    setRows(data);
    setPage(1); // reset to page 1 when data changes
  }, [data]);

  const handleChange = (index, field, value) => {
    // index here is the global index in rows, not page index
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setRows(updated);
  };

  const handleUpdate = async (row) => {
    try {
      const payload = {
        profile_id:         row.profile_id,
        profile_status_id:  Number(row.profile_status_id),
        notes:              row.notes,
        interview_datetime: row.interview_datetime,
        interview_timezone: row.interview_timezone || "Asia/Kolkata",
      };

      const res = await updateProfileStatus(payload);

      if (res.data.status === "success") {
        toast.success("Profile status updated");
        reload();
      } else {
        toast.error(res.data.message || "Update failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating profile status");
    }
  };

  if (loading || lovLoading) return <p className="loading-text">Loading...</p>;

  if (!rows || rows.length === 0)
    return <p className="empty-text">No profiles found for this demand.</p>;

  // ── Pagination ──────────────────────────────────────────────────────────
  const totalRows   = rows.length;
  const totalPages  = Math.ceil(totalRows / PAGE_SIZE);
  const startIndex  = (page - 1) * PAGE_SIZE;
  const endIndex    = Math.min(startIndex + PAGE_SIZE, totalRows);
  const pagedRows   = rows.slice(startIndex, endIndex);

  return (
    <>
      {/* Count + Pagination header */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 4px 10px",
        fontFamily: "Inter, sans-serif",
      }}>
        {/* Count */}
        <span style={{ fontSize: 13, color: "var(--ats-secondary)" }}>
          Showing{" "}
          <strong style={{ color: "var(--ats-primary)" }}>
            {startIndex + 1}–{endIndex}
          </strong>{" "}
          of{" "}
          <strong style={{ color: "var(--ats-primary)" }}>{totalRows}</strong>{" "}
          profiles
        </span>

        {/* Pagination — only show if more than PAGE_SIZE */}
        {totalRows > PAGE_SIZE && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 32, height: 32, borderRadius: 6,
                border: "1px solid var(--ats-border)", background: "#fff",
                cursor: page === 1 ? "not-allowed" : "pointer",
                opacity: page === 1 ? 0.4 : 1,
              }}
            >
              <ChevronLeft size={14} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  minWidth: 32, height: 32, padding: "0 6px", borderRadius: 6,
                  border: "1px solid var(--ats-border)",
                  background: p === page ? "var(--ats-primary)" : "#fff",
                  color: p === page ? "#fff" : "var(--ats-neutral)",
                  fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: p === page ? 600 : 400,
                  cursor: "pointer",
                }}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 32, height: 32, borderRadius: 6,
                border: "1px solid var(--ats-border)", background: "#fff",
                cursor: page === totalPages ? "not-allowed" : "pointer",
                opacity: page === totalPages ? 0.4 : 1,
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table className="ats-table" style={{ minWidth: "1200px", width: "100%" }}>
          <thead>
            <tr>
              <th style={{ width: "100px", minWidth: "100px" }}>Date</th>
              <th style={{ width: "100px", minWidth: "100px" }}>Profile Code</th>
              <th style={{ width: "180px", minWidth: "180px" }}>Name</th>
              <th style={{ width: "200px", minWidth: "200px" }}>Status</th>
              <th style={{ width: "180px", minWidth: "280px" }}>Notes</th>
              <th style={{ width: "70px",  minWidth: "90px"  }}>Match</th>
              <th style={{ width: "200px", minWidth: "200px" }}>Interview Date</th>
              <th style={{ width: "130px", minWidth: "150px" }}>Timezone</th>
              <th style={{ width: "100px", minWidth: "100px" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row) => {
              // get the real index in the full rows array for handleChange
              const globalIndex = rows.findIndex(r => r.profile_id === row.profile_id);
              return (
                <tr key={row.profile_id}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {row.profile_date
                      ? new Date(row.profile_date).toLocaleDateString('en-GB')
                      : "—"}
                  </td>
                  <td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>
                    {row.profile_code || "—"}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{row.profile_name}</td>

                  <td>
                    <select
                      className="form-input"
                      style={{ width: "100%", fontSize: 12 }}
                      value={row.profile_status_id ? String(row.profile_status_id) : ""}
                      onChange={(e) => handleChange(globalIndex, "profile_status_id", e.target.value)}
                    >
                      <option value="">Select</option>
                      {statusOptions.map((s) => (
                        <option key={s.value} value={String(s.value)}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td>
                    <input
                      className="form-input"
                      style={{ width: "100%", fontSize: 12 }}
                      value={row.notes || ""}
                      onChange={(e) => handleChange(globalIndex, "notes", e.target.value)}
                      placeholder="Add notes..."
                    />
                  </td>

                  <td style={{ textAlign: "center" }}>{row.match_score ?? "—"}</td>

                  <td>
                    <input
                      type="datetime-local"
                      className="form-input"
                      style={{ width: "100%", fontSize: 12 }}
                      value={row.interview_datetime || ""}
                      onChange={(e) => handleChange(globalIndex, "interview_datetime", e.target.value)}
                    />
                  </td>

                  <td>
                    <select
                      className="form-input"
                      style={{ width: "100%", fontSize: 12 }}
                      value={row.interview_timezone || "Asia/Kolkata"}
                      onChange={(e) => handleChange(globalIndex, "interview_timezone", e.target.value)}
                    >
                      <option value="Asia/Kolkata">India (IST)</option>
                      <option value="America/New_York">USA (EST)</option>
                      <option value="America/Chicago">USA (CST)</option>
                      <option value="America/Los_Angeles">USA (PST)</option>
                    </select>
                  </td>

                  <td>
                    <button
                      className="btn-primary"
                      style={{ whiteSpace: "nowrap", fontSize: 12 }}
                      onClick={() => handleUpdate(row)}
                    >
                      Update
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default ProfileStatusTable;