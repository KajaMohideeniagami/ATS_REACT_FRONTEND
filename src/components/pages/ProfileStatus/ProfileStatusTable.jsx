import React, { useState, useEffect } from "react";
import { updateProfileStatus } from "../../../services/profileStatusService";
import { getProfileStatuses } from "../../../services/lovService";
import Loader from "../../common/Loader";
import { toast } from "../../toast/index";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 7;

const ProfileStatusTable = ({ data, reload, loading }) => {
  const [rows, setRows] = useState(data);
  const [statusOptions, setStatusOptions] = useState([]);
  const [lovLoading, setLovLoading] = useState(true);
  const [page, setPage] = useState(1);

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
    setPage(1);
  }, [data]);

  const handleChange = (index, field, value) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setRows(updated);
  };

  const handleUpdate = async (row) => {
    try {
      const requiresInterview = [32, 33, 35];
      if (requiresInterview.includes(Number(row.profile_status_id)) && !row.interview_datetime) {
        toast.error("Interview date is required for this status");
        return;
      }

      const formattedDatetime = row.interview_datetime
        ? row.interview_datetime.replace("T", " ").slice(0, 16)
        : null;

      const payload = {
        profile_id: row.profile_id,
        profile_status_id: Number(row.profile_status_id),
        notes: row.notes || null,
        interview_datetime: formattedDatetime,
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

  if (loading || lovLoading) {
    return (
      <div
        style={{
          padding: "32px 20px",
          background: "linear-gradient(180deg, rgba(239,246,255,0.7) 0%, #ffffff 100%)",
          border: "1px solid var(--ats-border)",
          borderRadius: 18,
          boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)",
        }}
      >
        <Loader inline message="Loading profiles..." />
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "48px 0",
          color: "var(--ats-secondary)",
          fontFamily: "Inter, sans-serif",
          fontSize: 14,
          background: "linear-gradient(180deg, rgba(248,250,252,0.9) 0%, #ffffff 100%)",
          border: "1px solid var(--ats-border)",
          borderRadius: 18,
          boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)",
        }}
      >
        No profiles found for this demand.
      </div>
    );
  }

  const totalRows = rows.length;
  const totalPages = Math.ceil(totalRows / PAGE_SIZE);
  const startIndex = (page - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalRows);
  const pagedRows = rows.slice(startIndex, endIndex);

  const cellStyle = {
    padding: "14px 14px",
    fontSize: 13,
    color: "var(--ats-neutral)",
    borderBottom: "1px solid var(--ats-border-light)",
    verticalAlign: "middle",
    fontFamily: "Inter, sans-serif",
    background: "transparent",
  };

  const inputStyle = {
    width: "100%",
    fontSize: 12,
    padding: "9px 11px",
    border: "1px solid var(--ats-border)",
    borderRadius: 10,
    fontFamily: "Inter, sans-serif",
    background: "#fff",
    color: "var(--ats-primary)",
    outline: "none",
    boxSizing: "border-box",
    boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.04)",
  };

  const thStyle = {
    padding: "14px 14px",
    fontSize: 12,
    fontWeight: 700,
    color: "var(--ats-primary)",
    textAlign: "left",
    borderBottom: "1px solid var(--ats-border)",
    fontFamily: "Inter, sans-serif",
    whiteSpace: "nowrap",
    letterSpacing: "0.3px",
    textTransform: "uppercase",
    background: "linear-gradient(180deg, #f8fbff 0%, #edf4ff 100%)",
  };

  const paginationButtonStyle = (active = false, disabled = false) => ({
    minWidth: 34,
    height: 34,
    padding: "0 8px",
    borderRadius: 10,
    border: `1px solid ${active ? "var(--ats-primary)" : "var(--ats-border)"}`,
    background: active
      ? "linear-gradient(135deg, var(--ats-primary) 0%, #2563eb 100%)"
      : "#ffffff",
    color: active ? "#ffffff" : "var(--ats-secondary)",
    fontFamily: "Inter, sans-serif",
    fontSize: 12,
    fontWeight: active ? 700 : 500,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: active ? "0 10px 18px rgba(37, 99, 235, 0.18)" : "none",
    transition: "all 0.15s ease",
  });

  const badgeStyle = {
    display: "inline-block",
    padding: "4px 10px",
    background: "var(--ats-bg-accent)",
    color: "var(--ats-primary)",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    border: "1px solid var(--ats-border)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
  };

  const matchStyle = {
    display: "inline-block",
    padding: "5px 10px",
    background: "rgba(5,150,105,0.1)",
    color: "#059669",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    border: "1px solid rgba(5,150,105,0.2)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
  };

  const updateButtonStyle = {
    padding: "8px 16px",
    fontSize: 12,
    fontWeight: 700,
    color: "#fff",
    background: "linear-gradient(135deg, var(--ats-primary) 0%, #2563eb 100%)",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontFamily: "Inter, sans-serif",
    whiteSpace: "nowrap",
    transition: "all 0.15s ease",
    boxShadow: "0 12px 20px rgba(37, 99, 235, 0.18)",
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px",
          fontFamily: "Inter, sans-serif",
          background: "linear-gradient(135deg, rgba(239,246,255,0.95) 0%, rgba(255,255,255,0.98) 100%)",
          border: "1px solid var(--ats-border)",
          borderRadius: "18px 18px 0 0",
          borderBottom: "none",
          boxShadow: "0 16px 32px rgba(15, 23, 42, 0.06)",
        }}
      >
        <span style={{ fontSize: 13, color: "var(--ats-secondary)", fontWeight: 500 }}>
          Showing <strong style={{ color: "var(--ats-primary)" }}>{startIndex + 1}-{endIndex}</strong> of{" "}
          <strong style={{ color: "var(--ats-primary)" }}>{totalRows}</strong> profiles
        </span>

        {totalRows > PAGE_SIZE && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              style={paginationButtonStyle(false, page === 1)}
            >
              <ChevronLeft size={13} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)} style={paginationButtonStyle(p === page)}>
                {p}
              </button>
            ))}

            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages}
              style={paginationButtonStyle(false, page === totalPages)}
            >
              <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>

      <div
        style={{
          overflowX: "auto",
          borderRadius: "0 0 18px 18px",
          border: "1px solid var(--ats-border)",
          background: "#ffffff",
          boxShadow: "0 18px 36px rgba(15, 23, 42, 0.08)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
            minWidth: 1100,
            tableLayout: "fixed",
          }}
        >
          <colgroup>
            <col style={{ width: "90px" }} />
            <col style={{ width: "95px" }} />
            <col style={{ width: "150px" }} />
            <col style={{ width: "185px" }} />
            <col style={{ width: "220px" }} />
            <col style={{ width: "65px" }} />
            <col style={{ width: "175px" }} />
            <col style={{ width: "120px" }} />
            <col style={{ width: "90px" }} />
          </colgroup>

          <thead>
            <tr>
              {["Date", "Profile Code", "Name", "Status", "Notes", "Match", "Interview Date", "Timezone", "Action"].map(
                (heading) => (
                  <th key={heading} style={thStyle}>
                    {heading}
                  </th>
                )
              )}
            </tr>
          </thead>

          <tbody>
            {pagedRows.map((row, i) => {
              const globalIndex = rows.findIndex((r) => r.profile_id === row.profile_id);
              const isEven = i % 2 === 0;

              return (
                <tr
                  key={row.profile_id}
                  style={{ background: isEven ? "#ffffff" : "#f8fbff" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#eef5ff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isEven ? "#ffffff" : "#f8fbff";
                  }}
                >
                  <td style={{ ...cellStyle, color: "var(--ats-secondary)", fontSize: 12, whiteSpace: "nowrap" }}>
                    {row.profile_date ? new Date(row.profile_date).toLocaleDateString("en-GB") : "-"}
                  </td>

                  <td style={cellStyle}>
                    <span style={badgeStyle}>{row.profile_code || "-"}</span>
                  </td>

                  <td
                    style={{
                      ...cellStyle,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {row.profile_name}
                  </td>

                  <td style={cellStyle}>
                    <select
                      style={inputStyle}
                      value={row.profile_status_id ? String(row.profile_status_id) : ""}
                      onChange={(e) => handleChange(globalIndex, "profile_status_id", e.target.value)}
                    >
                      <option value="">- Select -</option>
                      {statusOptions.map((status) => (
                        <option key={status.value} value={String(status.value)}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td style={cellStyle}>
                    <input
                      style={inputStyle}
                      value={row.notes || ""}
                      onChange={(e) => handleChange(globalIndex, "notes", e.target.value)}
                      placeholder="Add notes..."
                    />
                  </td>

                  <td style={{ ...cellStyle, textAlign: "center" }}>
                    {row.match_score ? <span style={matchStyle}>{row.match_score}</span> : "-"}
                  </td>

                  <td style={cellStyle}>
                    <input
                      type="datetime-local"
                      style={inputStyle}
                      value={row.interview_datetime || ""}
                      onChange={(e) => handleChange(globalIndex, "interview_datetime", e.target.value)}
                    />
                  </td>

                  <td style={cellStyle}>
                    <select
                      style={inputStyle}
                      value={row.interview_timezone || "Asia/Kolkata"}
                      onChange={(e) => handleChange(globalIndex, "interview_timezone", e.target.value)}
                    >
                      <option value="Asia/Kolkata">India (IST)</option>
                      <option value="America/New_York">USA (EST)</option>
                      <option value="America/Chicago">USA (CST)</option>
                      <option value="America/Los_Angeles">USA (PST)</option>
                    </select>
                  </td>

                  <td style={{ ...cellStyle, textAlign: "center" }}>
                    <button
                      onClick={() => handleUpdate(row)}
                      style={updateButtonStyle}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          "linear-gradient(135deg, var(--ats-primary) 0%, #2563eb 100%)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
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
