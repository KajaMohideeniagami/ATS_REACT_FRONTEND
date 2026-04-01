import React, { useState, useEffect } from "react";
import { updateProfileStatus } from "../../../services/profileStatusService";
import { toast } from "../../../components/Toast";

const STATUS_OPTIONS = [
  { id: 1, name: "Submitted" },
  { id: 2, name: "Screening" },
  { id: 3, name: "Interview Scheduled" },
  { id: 4, name: "Interview Done" },
  { id: 5, name: "Selected" },
  { id: 6, name: "Rejected" },
  { id: 7, name: "On Hold" },
];

const ProfileStatusTable = ({ data, reload, loading }) => {
  const [rows, setRows] = useState(data);

  useEffect(() => {
    setRows(data);
  }, [data]);

  const handleChange = (index, field, value) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setRows(updated);
  };

  const handleUpdate = async (row) => {
    try {
      const payload = {
        profile_id: row.profile_id,
        profile_status_id: Number(row.profile_status_id),
        notes: row.notes,
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

  if (loading) return <p className="loading-text">Loading...</p>;

  if (!rows || rows.length === 0)
    return <p className="empty-text">No profiles found for this demand.</p>;

  return (
    <table className="ats-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Profile Code</th>
          <th>Name</th>
          <th>Status</th>
          <th>Notes</th>
          <th>Match</th>
          <th>Interview Date</th>
          <th>Timezone</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={row.profile_id}>
            <td>{row.profile_date}</td>
            <td>{row.profile_id}</td>
            <td>{row.profile_name}</td>

            <td>
              <select
                className="form-input"
                value={row.profile_status_id || ""}
                onChange={(e) =>
                  handleChange(index, "profile_status_id", e.target.value)
                }
              >
                <option value="">Select</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </td>

            <td>
              <input
                className="form-input"
                value={row.notes || ""}
                onChange={(e) => handleChange(index, "notes", e.target.value)}
                placeholder="Add notes..."
              />
            </td>

            <td>{row.match_score ?? "—"}</td>

            <td>
              <input
                type="datetime-local"
                className="form-input"
                value={row.interview_datetime || ""}
                onChange={(e) =>
                  handleChange(index, "interview_datetime", e.target.value)
                }
              />
            </td>

            <td>
              <select
                className="form-input"
                value={row.interview_timezone || "Asia/Kolkata"}
                onChange={(e) =>
                  handleChange(index, "interview_timezone", e.target.value)
                }
              >
                <option value="Asia/Kolkata">India (IST)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">USA Eastern</option>
                <option value="America/Chicago">USA Central</option>
                <option value="America/Los_Angeles">USA Pacific</option>
              </select>
            </td>

            <td>
              <button
                className="btn-primary"
                onClick={() => handleUpdate(row)}
              >
                Update
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ProfileStatusTable;