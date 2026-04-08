import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { ChevronDown, Paperclip, Send, Search, X } from "lucide-react";
import { toast } from "../../Toast";
import { API_BASE_URL, LOV_ENDPOINTS } from "../../../config/apiConfig";
import { getDemandDetails } from "../../../services/demandService";
import { sendVendorEmail } from "../../../services/vendorEmailService";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

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

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result || "";
      resolve(String(result).split(",")[1] || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const initialForm = {
  vendorType: "",
  demandId: "",
  type: "",
  currency: "",
  max: "",
  jobDescriptionUpload: null,
};

const emptyDemandDetails = {
  position: "",
  noOfPosition: "",
  workMode: "",
  billableDate: "",
  jobDescription: "",
};

const normalizeText = (value) => String(value || "").trim().toLowerCase();
const hasText = (value) => String(value || "").trim().length > 0;

const getOptionValue = (option) => String(option?.value ?? option?.id ?? option?.label ?? "");
const getOptionLabel = (option) => String(option?.label ?? option?.name ?? option?.value ?? "");

const getVendorType = (vendor) => vendor?.vendor_type || "";

const vendorMatchesType = (vendorType, selectedType) => {
  const normalizedVendorType = normalizeText(vendorType);
  const normalizedSelectedType = normalizeText(selectedType);

  if (!normalizedVendorType || !normalizedSelectedType) return false;
  if (normalizedVendorType === normalizedSelectedType) return true;

  if (normalizedVendorType === "offshore/onsite") {
    return normalizedSelectedType === "offshore" || normalizedSelectedType === "onsite";
  }

  return false;
};

const TYPE_OPTIONS_BY_LOCATION = {
  Offshore: [
    { value: "Contract", label: "Contract" },
    { value: "iAgami", label: "iAgami" },
  ],
  NearShore: [
    { value: "Contract", label: "Contract" },
    { value: "iAgami", label: "iAgami" },
  ],
  Onsite: [
    { value: "W2", label: "W2" },
    { value: "C2C", label: "C2C" },
    { value: "iAgami", label: "iAgami" },
  ],
  "Offshore/Onsite": [
    { value: "W2", label: "W2" },
    { value: "C2C", label: "C2C" },
    { value: "Contract", label: "Contract" },
    { value: "iAgami", label: "iAgami" },
  ],
};

const SearchableSelect = ({
  label,
  required = false,
  value,
  options,
  placeholder,
  searchable = false,
  error,
  onSelect,
  onClear,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);

  useEffect(() => {
    if (!isOpen) setQuery("");
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((option) => getOptionValue(option) === String(value));
  const filteredOptions = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const normalizedQuery = normalizeText(query);
    return options.filter((option) => normalizeText(getOptionLabel(option)).includes(normalizedQuery));
  }, [options, query, searchable]);

  return (
    <div className="form-group" ref={rootRef}>
      <label className="form-label">
        {label}
        {required ? " *" : ""}
      </label>
      <div className={`sev-select${isOpen ? " open" : ""}${error ? " input-error" : ""}${disabled ? " disabled" : ""}`}>
        <button
          type="button"
          className="sev-select-trigger"
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          disabled={disabled}
        >
          <span className={`sev-select-value${selectedOption ? "" : " placeholder"}`}>
            {selectedOption ? getOptionLabel(selectedOption) : placeholder}
          </span>
          <span className="sev-select-actions">
            {value ? (
              <span
                className="sev-clear-btn"
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  onClear?.();
                  setIsOpen(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onClear?.();
                    setIsOpen(false);
                  }
                }}
              >
                <X size={14} />
              </span>
            ) : null}
            <ChevronDown size={16} className={`sev-chevron${isOpen ? " rotated" : ""}`} />
          </span>
        </button>

        {isOpen && (
          <div className="sev-select-menu">
            {searchable ? (
              <div className="sev-search-box">
                <Search size={14} />
                <input
                  className="sev-search-input"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={`Search ${label.toLowerCase()}`}
                  autoFocus
                />
              </div>
            ) : null}
            <div className="sev-select-list">
              {filteredOptions.length ? (
                filteredOptions.map((option) => {
                  const optionValue = getOptionValue(option);
                  return (
                    <button
                      type="button"
                      key={optionValue}
                      className={`sev-select-option${String(value) === optionValue ? " selected" : ""}`}
                      onClick={() => {
                        onSelect(optionValue);
                        setIsOpen(false);
                      }}
                    >
                      {getOptionLabel(option)}
                    </button>
                  );
                })
              ) : (
                <div className="sev-empty-state">No options found</div>
              )}
            </div>
          </div>
        )}
      </div>
      {error ? <span className="form-error">{error}</span> : null}
    </div>
  );
};

const ReadOnlyField = ({ label, value, rows = 1, textarea = false }) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    {textarea ? (
      <textarea
        className="form-textarea sev-readonly"
        value={value || ""}
        readOnly
        rows={rows}
      />
    ) : (
      <input className="form-input sev-readonly" value={value || ""} readOnly />
    )}
  </div>
);

const SendEmailToVendorsModal = ({ isOpen, onClose, onSuccess, customerId, demands = [] }) => {
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [demandDetails, setDemandDetails] = useState(emptyDemandDetails);
  const [vendors, setVendors] = useState([]);
  const [vendorTypeOptions, setVendorTypeOptions] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);
  const fileInputRef = useRef(null);

  const resetForm = useCallback(() => {
    setFormData(initialForm);
    setErrors({});
    setDemandDetails(emptyDemandDetails);
    setSelectedVendorIds([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  useEffect(() => {
    if (!isOpen) return;

    const loadLovs = async () => {
      const [vendorTypeItems, vendorItems, currencyItems] = await Promise.all([
        getLovData(LOV_ENDPOINTS.DEMAND_TYPES),
        getLovData(LOV_ENDPOINTS.VENDORS),
        getLovData(LOV_ENDPOINTS.CURRENCIES),
      ]);

      setVendorTypeOptions(vendorTypeItems);
      setVendors(vendorItems);
      setCurrencies(currencyItems);
    };

    loadLovs();
  }, [isOpen]);

  const selectedVendorTypeLabel = useMemo(() => {
    const selected = vendorTypeOptions.find(
      (option) => getOptionValue(option) === String(formData.vendorType)
    );
    return getOptionLabel(selected) || formData.vendorType;
  }, [formData.vendorType, vendorTypeOptions]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") handleClose();
    };

    if (isOpen) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleClose, isOpen]);

  const filteredDemands = useMemo(() => {
    const normalizedSelectedVendorType = normalizeText(selectedVendorTypeLabel);

    return demands.filter((demand) => {
      const isOpen = normalizeText(demand?.demand_status) === "open";
      const hasJobDescriptionField = Object.prototype.hasOwnProperty.call(demand || {}, "job_description");
      const hasJobDescription = !hasJobDescriptionField || hasText(demand?.job_description);
      const isCurrentCustomer =
        !demand?.customer_id || String(demand.customer_id) === String(customerId);

      if (!isOpen || !hasJobDescription || !isCurrentCustomer) return false;

      if (!normalizedSelectedVendorType) return false;

      const demandType = normalizeText(
        demand?.demand_type ||
        demand?.DEMAND_TYPE ||
        demand?.demand_type_name
      );

      if (normalizedSelectedVendorType === "offshore/onsite") {
        return demandType === "onsite" || demandType === "offshore";
      }

      return demandType === normalizedSelectedVendorType;
    });
  }, [customerId, demands, selectedVendorTypeLabel]);

  const demandOptions = useMemo(
    () =>
      filteredDemands
        .slice()
        .sort((a, b) => String(a?.demand_code || "").localeCompare(String(b?.demand_code || "")))
        .map((demand) => ({
        value: String(demand.demand_id),
        label: demand.demand_code
          ? `${demand.demand_code} - ${demand.job_role || "Untitled"}`
          : demand.job_role || `Demand #${demand.demand_id}`,
      })),
    [filteredDemands]
  );

  const filteredVendors = useMemo(() => {
    if (!selectedVendorTypeLabel) return [];

    return vendors.filter((vendor) => {
      return vendorMatchesType(getVendorType(vendor), selectedVendorTypeLabel);
    });
  }, [selectedVendorTypeLabel, vendors]);

  useEffect(() => {
    setSelectedVendorIds((prev) =>
      prev.filter((vendorId) =>
        filteredVendors.some((vendor) => getOptionValue(vendor) === String(vendorId))
      )
    );
  }, [filteredVendors]);

  const allVisibleVendorIds = useMemo(
    () => filteredVendors.map((vendor) => getOptionValue(vendor)),
    [filteredVendors]
  );

  const allSelected =
    allVisibleVendorIds.length > 0 &&
    allVisibleVendorIds.every((vendorId) => selectedVendorIds.includes(vendorId));

  const selectedDemandSummary = useMemo(
    () => filteredDemands.find((demand) => String(demand.demand_id) === String(formData.demandId)) || null,
    [filteredDemands, formData.demandId]
  );

  useEffect(() => {
    if (!formData.demandId) return;
    const stillValid = filteredDemands.some(
      (demand) => String(demand.demand_id) === String(formData.demandId)
    );
    if (!stillValid) {
      setFormData((prev) => ({ ...prev, demandId: "" }));
      setDemandDetails(emptyDemandDetails);
    }
  }, [filteredDemands, formData.demandId]);

  const typeOptions = useMemo(
    () => TYPE_OPTIONS_BY_LOCATION[selectedVendorTypeLabel] || [],
    [selectedVendorTypeLabel]
  );

  useEffect(() => {
    if (!selectedVendorTypeLabel) return;
    if (!typeOptions.some((option) => option.value === formData.type)) {
      setFormData((prev) => ({ ...prev, type: "" }));
    }
  }, [formData.type, selectedVendorTypeLabel, typeOptions]);

  useEffect(() => {
    setFormData((prev) => {
      if (!prev.vendorType) return prev;
      return { ...prev, demandId: "" };
    });
    setDemandDetails(emptyDemandDetails);
    setSelectedVendorIds([]);
  }, [selectedVendorTypeLabel]);

  useEffect(() => {
    if (!isOpen || !formData.demandId) {
      setDemandDetails(emptyDemandDetails);
      return;
    }

    let cancelled = false;

    const loadDemandDetails = async () => {
      try {
        const details = await getDemandDetails(customerId, formData.demandId);
        if (cancelled) return;

        setDemandDetails({
          position: details?.job_role || selectedDemandSummary?.job_role || "",
          noOfPosition: details?.no_of_position ?? selectedDemandSummary?.no_of_position ?? "",
          workMode:
            details?.work_mode_name ||
            selectedDemandSummary?.work_mode_name ||
            details?.work_mode_id ||
            selectedDemandSummary?.work_mode_id ||
            "",
          billableDate: details?.billable_date || selectedDemandSummary?.billable_date || "",
          jobDescription: details?.job_description || selectedDemandSummary?.job_description || "",
        });
      } catch {
        if (cancelled) return;

        setDemandDetails({
          position: selectedDemandSummary?.job_role || "",
          noOfPosition: selectedDemandSummary?.no_of_position ?? "",
          workMode: selectedDemandSummary?.work_mode_name || selectedDemandSummary?.work_mode_id || "",
          billableDate: selectedDemandSummary?.billable_date || "",
          jobDescription: selectedDemandSummary?.job_description || "",
        });
        toast.error("Could not load full demand details.");
      }
    };

    loadDemandDetails();

    return () => {
      cancelled = true;
    };
  }, [customerId, formData.demandId, isOpen, selectedDemandSummary]);

  const handleFieldChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleVendorToggle = (vendorId) => {
    setSelectedVendorIds((prev) => {
      const next = prev.includes(vendorId)
        ? prev.filter((id) => id !== vendorId)
        : [...prev, vendorId];
      return next;
    });

    if (errors.selectedVendorIds) {
      setErrors((prev) => ({ ...prev, selectedVendorIds: "" }));
    }
  };

  const handleSelectAll = () => {
    setSelectedVendorIds((prev) => (allSelected ? prev.filter((id) => !allVisibleVendorIds.includes(id)) : allVisibleVendorIds));
    if (errors.selectedVendorIds) {
      setErrors((prev) => ({ ...prev, selectedVendorIds: "" }));
    }
  };

  const handleDemandClear = () => {
    setFormData((prev) => ({ ...prev, demandId: "" }));
    setDemandDetails(emptyDemandDetails);
    if (errors.demandId) {
      setErrors((prev) => ({ ...prev, demandId: "" }));
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.vendorType) nextErrors.vendorType = "Vendor type is required";
    if (!formData.demandId) nextErrors.demandId = "Demand is required";
    if (!formData.type) nextErrors.type = "Type is required";
    if (!formData.currency) nextErrors.currency = "Currency is required";
    if (!String(formData.max).trim()) nextErrors.max = "Max is required";
    else if (Number(formData.max) <= 0) nextErrors.max = "Max must be greater than 0";
    if (!selectedVendorIds.length) nextErrors.selectedVendorIds = "Select at least one vendor";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const attachmentFile = formData.jobDescriptionUpload;
      const payload = {
        customer_id: Number(customerId),
        vendor_type: selectedVendorTypeLabel,
        demand_id: Number(formData.demandId),
        position: demandDetails.position,
        no_of_position: demandDetails.noOfPosition ? Number(demandDetails.noOfPosition) : null,
        work_mode: demandDetails.workMode,
        billable_date: demandDetails.billableDate,
        type: formData.type,
        currency: formData.currency,
        max: Number(formData.max),
        job_description: demandDetails.jobDescription,
        jd_source: attachmentFile ? "FILE" : "TEXT",
        pdf_base64: attachmentFile ? await fileToBase64(attachmentFile) : null,
        attachment_file_name: attachmentFile?.name || null,
        vendor_ids: selectedVendorIds.map((vendorId) => Number(vendorId)),
      };

      const response = await sendVendorEmail(payload);
      if (response?.success === false) {
        throw new Error(response?.message || "Failed to send vendor emails.");
      }

      toast.success(response?.message || "Vendor emails sent successfully!");
      handleClose();
      onSuccess?.();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
        error?.message ||
        "Failed to send vendor emails."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="dm-backdrop" onClick={handleClose} />

      <div className="sev-modal" role="dialog" aria-modal="true" aria-labelledby="send-email-to-vendors-title">
        <div className="sev-header">
          <h2 className="ats-heading-2" id="send-email-to-vendors-title">
            Send Email To Vendors
          </h2>
          <button type="button" className="sev-close" onClick={handleClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="sev-body">
          <form id="send-email-vendors-form" onSubmit={handleSubmit} noValidate>
            <div className="sev-grid sev-grid-upto-billable">
              <SearchableSelect
                label="Vendor Type"
                required
                value={formData.vendorType}
                options={vendorTypeOptions}
                placeholder="Select vendor type"
                error={errors.vendorType}
                onSelect={(value) => handleFieldChange("vendorType", value)}
                onClear={() => handleFieldChange("vendorType", "")}
              />

              <SearchableSelect
                label="Demand"
                required
                value={formData.demandId}
                options={demandOptions}
              placeholder="Search demand"
              searchable
              error={errors.demandId}
              onSelect={(value) => handleFieldChange("demandId", value)}
              onClear={handleDemandClear}
              disabled={!selectedVendorTypeLabel}
            />

              <ReadOnlyField label="Position" value={demandDetails.position} />
              <ReadOnlyField label="No of Position" value={demandDetails.noOfPosition} />
              <ReadOnlyField label="Work Mode" value={demandDetails.workMode} />
              <ReadOnlyField label="Billable Date" value={demandDetails.billableDate} />
            </div>

            <div className="sev-row">
              <div className="form-group">
                <label className="form-label">Type *</label>
                <select
                  className={`form-select${errors.type ? " input-error" : ""}`}
                  value={formData.type}
                  onChange={(event) => handleFieldChange("type", event.target.value)}
                >
                  <option value="">Select type</option>
                  {typeOptions.map((option) => (
                    <option key={getOptionValue(option)} value={getOptionValue(option)}>
                      {getOptionLabel(option)}
                    </option>
                  ))}
                </select>
                {errors.type ? <span className="form-error">{errors.type}</span> : null}
              </div>

              <div className="form-group">
                <label className="form-label">Currency *</label>
                <select
                  className={`form-select${errors.currency ? " input-error" : ""}`}
                  value={formData.currency}
                  onChange={(event) => handleFieldChange("currency", event.target.value)}
                >
                  <option value="">Select currency</option>
                  {currencies.map((currency) => (
                    <option key={getOptionValue(currency)} value={getOptionValue(currency)}>
                      {getOptionLabel(currency)}
                    </option>
                  ))}
                </select>
                {errors.currency ? <span className="form-error">{errors.currency}</span> : null}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Max *</label>
              <input
                type="number"
                min="0"
                className={`form-input${errors.max ? " input-error" : ""}`}
                value={formData.max}
                onChange={(event) => handleFieldChange("max", event.target.value)}
                placeholder="Enter max value"
              />
              {errors.max ? <span className="form-error">{errors.max}</span> : null}
            </div>

            <ReadOnlyField label="Job Description" value={demandDetails.jobDescription} rows={6} textarea />

            <div className="form-group">
              <label className="form-label">Job Description Upload</label>
              <div className="sev-upload-row">
                <button
                  type="button"
                  className="sev-upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip size={14} />
                  Choose File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  style={{ display: "none" }}
                  onChange={(event) => handleFieldChange("jobDescriptionUpload", event.target.files?.[0] || null)}
                />
                {formData.jobDescriptionUpload ? (
                  <span className="sev-file-pill">{formData.jobDescriptionUpload.name}</span>
                ) : (
                  <span className="sev-upload-hint">Optional override</span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Select Vendor *</label>
              <div className={`sev-vendor-box${errors.selectedVendorIds ? " input-error" : ""}`}>
                <label className="sev-checkbox">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                  disabled={!allVisibleVendorIds.length}
                  />
                  <span>Select All</span>
                </label>

                {filteredVendors.length ? (
                  <div className="sev-vendor-list">
                    {filteredVendors.map((vendor) => {
                      const vendorId = getOptionValue(vendor);
                      return (
                        <label key={vendorId} className="sev-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedVendorIds.includes(vendorId)}
                            onChange={() => handleVendorToggle(vendorId)}
                          />
                          <span>{getOptionLabel(vendor)}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="sev-empty-vendors">No vendors available for the selected vendor type.</p>
                )}
              </div>
              {errors.selectedVendorIds ? <span className="form-error">{errors.selectedVendorIds}</span> : null}
            </div>
          </form>
        </div>

        <div className="sev-footer">
          <button type="submit" form="send-email-vendors-form" className="sev-send-btn" disabled={loading}>
            <Send size={15} />
            {loading ? "Sending..." : "Send Email"}
          </button>
        </div>
      </div>

      <style>{`
        .dm-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 1000;
          animation: sevFadeIn 0.2s ease;
        }
        .sev-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1001;
          display: flex;
          flex-direction: column;
          width: min(760px, calc(100vw - 24px));
          max-width: 760px;
          max-height: 88vh;
          border-radius: 16px;
          background: #ffffff;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.2);
          overflow: hidden;
        }
        .sev-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 20px 24px 16px;
          border-bottom: 1px solid var(--ats-border);
          background: #ffffff;
          flex-shrink: 0;
        }
        .sev-body {
          padding: 18px 24px 20px;
          flex: 1;
          overflow-y: auto;
        }
        .sev-footer {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          padding: 16px 24px 20px;
          border-top: 1px solid var(--ats-border);
          background: #ffffff;
          flex-shrink: 0;
        }
        .sev-close {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: var(--ats-secondary);
          cursor: pointer;
          transition: var(--ats-transition);
          flex-shrink: 0;
        }
        .sev-close:hover {
          background: var(--ats-bg-accent);
          color: var(--ats-primary);
        }
        .sev-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .sev-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0 16px;
        }
        .sev-grid-upto-billable .form-group {
          margin-bottom: 20px;
        }
        .sev-readonly {
          background: #f8fafc;
          color: #64748b;
          cursor: default;
        }
        .sev-select {
          position: relative;
        }
        .sev-select.disabled {
          opacity: 0.7;
          pointer-events: none;
        }
        .sev-select-trigger {
          width: 100%;
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 14px;
          background: #ffffff;
          border: 2px solid var(--ats-border);
          border-radius: 8px;
          cursor: pointer;
          transition: var(--ats-transition);
        }
        .sev-select.open .sev-select-trigger {
          border-color: var(--ats-primary);
          box-shadow: 0 0 0 3px rgba(30, 41, 59, 0.1);
        }
        .sev-select.input-error .sev-select-trigger,
        .sev-vendor-box.input-error {
          border-color: var(--ats-error);
        }
        .sev-select-value {
          color: var(--ats-neutral);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sev-select-value.placeholder {
          color: var(--ats-secondary);
        }
        .sev-select-actions {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--ats-secondary);
          flex-shrink: 0;
        }
        .sev-clear-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border-radius: 999px;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .sev-clear-btn:hover {
          background: var(--ats-bg-accent);
        }
        .sev-chevron {
          transition: transform 0.2s ease;
        }
        .sev-chevron.rotated {
          transform: rotate(180deg);
        }
        .sev-select-menu {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: #ffffff;
          border: 1px solid var(--ats-border);
          border-radius: 12px;
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.16);
          overflow: hidden;
          z-index: 8;
        }
        .sev-search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 14px;
          border-bottom: 1px solid var(--ats-border);
          color: var(--ats-secondary);
        }
        .sev-search-input {
          width: 100%;
          border: none;
          outline: none;
          font: inherit;
          color: var(--ats-neutral);
          background: transparent;
        }
        .sev-select-list {
          max-height: 220px;
          overflow-y: auto;
          padding: 6px;
        }
        .sev-select-option,
        .sev-empty-state {
          width: 100%;
          text-align: left;
          border: none;
          background: transparent;
          border-radius: 8px;
          padding: 10px 12px;
          font: inherit;
        }
        .sev-select-option {
          cursor: pointer;
          color: var(--ats-neutral);
        }
        .sev-select-option:hover,
        .sev-select-option.selected {
          background: #eff6ff;
          color: #2563eb;
        }
        .sev-empty-state {
          color: var(--ats-secondary);
        }
        .sev-upload-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .sev-upload-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 2px solid var(--ats-border);
          background: #ffffff;
          color: var(--ats-primary);
          border-radius: 8px;
          padding: 10px 14px;
          font: inherit;
          font-weight: 500;
          cursor: pointer;
          transition: var(--ats-transition);
        }
        .sev-upload-btn:hover {
          border-color: #2563eb;
          background: #eff6ff;
        }
        .sev-file-pill,
        .sev-upload-hint {
          font-size: 12px;
          color: var(--ats-secondary);
        }
        .sev-file-pill {
          background: #eff6ff;
          color: #2563eb;
          padding: 4px 10px;
          border-radius: 999px;
          max-width: 260px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sev-vendor-box {
          border: 2px solid var(--ats-border);
          border-radius: 10px;
          padding: 14px;
          background: #ffffff;
        }
        .sev-vendor-list {
          display: flex;
          flex-wrap: wrap;
          gap: 10px 16px;
          margin-top: 12px;
        }
        .sev-checkbox {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--ats-neutral);
          font-size: 14px;
        }
        .sev-checkbox input {
          width: 16px;
          height: 16px;
          accent-color: #2563eb;
        }
        .sev-empty-vendors {
          margin-top: 12px;
          color: var(--ats-secondary);
          font-size: 13px;
        }
        .sev-send-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: none;
          border-radius: 8px;
          padding: 12px 20px;
          color: #ffffff;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          box-shadow: 0 8px 18px rgba(37, 99, 235, 0.24);
          font: inherit;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .sev-send-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 12px 24px rgba(37, 99, 235, 0.3);
        }
        .sev-send-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        @keyframes sevFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (max-width: 640px) {
          .sev-modal {
            top: auto;
            bottom: 8px;
            left: 50%;
            transform: translateX(-50%);
            width: calc(100vw - 16px);
            max-height: 92vh;
          }
          .sev-row {
            grid-template-columns: 1fr;
          }
          .sev-grid {
            grid-template-columns: 1fr;
          }
          .sev-header,
          .sev-body,
          .sev-footer {
            padding-left: 16px;
            padding-right: 16px;
          }
        }
      `}</style>
    </>
  );
};

export default SendEmailToVendorsModal;
