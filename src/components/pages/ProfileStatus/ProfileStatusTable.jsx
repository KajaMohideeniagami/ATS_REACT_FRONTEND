import React, { useState, useEffect } from "react";
import { updateProfileStatus } from "../../../services/profileStatusService";
import { getProfileStatuses } from "../../../services/lovService";
import Loader from "../../common/Loader";
import { toast } from "../../toast/index";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 10;
const DEFAULT_TIMEZONE = "Asia/Kolkata";

const getMatchScoreValue = (row) => {
  if (!row) return "";

  const raw =
    row.match_score ??
    row.MATCH_SCORE ??
    row.ai_profile_score ??
    row.AI_PROFILE_SCORE ??
    "";

  if (raw && typeof raw === "object" && "v" in raw) {
    return String(raw.v || "").trim();
  }

  return String(raw || "").trim();
};

const getMatchScoreMeta = (value) => {
  const text = String(value || "").trim();
  const numericScore = Number.parseInt(text, 10);

  if (Number.isNaN(numericScore)) {
    return {
      scoreText: text,
      icon: "",
      background: "rgba(14,165,233,0.12)",
      color: "#0369a1",
      border: "1px solid rgba(14,165,233,0.22)",
    };
  }

  if (numericScore >= 75) {
    return {
      scoreText: `${numericScore}/100`,
      icon: "✓",
      background: "rgba(34,197,94,0.12)",
      color: "#15803d",
      border: "1px solid rgba(34,197,94,0.24)",
    };
  }

  if (numericScore >= 50) {
    return {
      scoreText: `${numericScore}/100`,
      icon: "!",
      background: "rgba(245,158,11,0.12)",
      color: "#b45309",
      border: "1px solid rgba(245,158,11,0.24)",
    };
  }

  return {
    scoreText: `${numericScore}/100`,
    icon: "✕",
    background: "rgba(239,68,68,0.12)",
    color: "#dc2626",
    border: "1px solid rgba(239,68,68,0.24)",
  };
};

const toDatetimeLocalInTimezone = (value, timeZone = DEFAULT_TIMEZONE) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type) => parts.find((part) => part.type === type)?.value || "";
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");

  if (!year || !month || !day || !hour || !minute) return "";
  return `${year}-${month}-${day}T${hour}:${minute}`;
};

const getCurrentDatetimeLocalInTimezone = (timeZone = DEFAULT_TIMEZONE) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type) => parts.find((part) => part.type === type)?.value || "";
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");

  if (!year || !month || !day || !hour || !minute) return "";
  return `${year}-${month}-${day}T${hour}:${minute}`;
};

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
    const normalizedRows = (data || []).map((row) => {
      const tz = row.interview_timezone || DEFAULT_TIMEZONE;
      return {
        ...row,
        interview_timezone: tz,
        interview_datetime: toDatetimeLocalInTimezone(row.interview_datetime, tz),
      };
    });

    setRows(normalizedRows);
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

      if (row.interview_datetime) {
        const minInterviewDatetime = getCurrentDatetimeLocalInTimezone(
          row.interview_timezone || DEFAULT_TIMEZONE
        );
        if (minInterviewDatetime && row.interview_datetime < minInterviewDatetime) {
          toast.error("Interview date must be current or future");
          return;
        }
      }

      const formattedDatetime = row.interview_datetime
        ? row.interview_datetime.replace("T", " ").slice(0, 16)
        : null;

      const payload = {
        profile_id: row.profile_id,
        profile_status_id: Number(row.profile_status_id),
        notes: row.notes || null,
        interview_datetime: formattedDatetime,
        interview_timezone: row.interview_timezone || DEFAULT_TIMEZONE,
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
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minWidth: 86,
    padding: "7px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1,
    whiteSpace: "nowrap",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
  };

  const updateButtonStyle = {
    minWidth: 92,
    justifyContent: "center",
    padding: "10px 16px",
    fontSize: 12,
    letterSpacing: "0.4px",
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
            <col style={{ width: "100px" }} />
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
              const matchScore = getMatchScoreValue(row);
              const matchMeta = matchScore ? getMatchScoreMeta(matchScore) : null;

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
                    {matchMeta ? (
                      <span
                        style={{
                          ...matchStyle,
                          background: matchMeta.background,
                          color: matchMeta.color,
                          border: matchMeta.border,
                        }}
                      >
                        <span>{matchMeta.scoreText}</span>
                        {matchMeta.icon ? (
                          <span style={{ fontSize: 14, fontWeight: 800, lineHeight: 1 }}>
                            {matchMeta.icon}
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>

                  <td style={cellStyle}>
                    <input
                      type="datetime-local"
                      style={inputStyle}
                      value={row.interview_datetime || ""}
                      min={getCurrentDatetimeLocalInTimezone(row.interview_timezone || DEFAULT_TIMEZONE)}
                      onChange={(e) => handleChange(globalIndex, "interview_datetime", e.target.value)}
                    />
                  </td>

                  <td style={cellStyle}>
                    <select
                      style={inputStyle}
                      value={row.interview_timezone || DEFAULT_TIMEZONE}
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
                      className="btn-primary"
                      onClick={() => handleUpdate(row)}
                      style={updateButtonStyle}
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
