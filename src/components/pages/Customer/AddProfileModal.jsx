import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { X, Upload, FileText, Zap } from "lucide-react";
import { toast } from "../../toast/index";
import Loader from "../../common/Loader";
import AiLoader from "../../common/AiLoader";
import axios from "axios";
import { API_BASE_URL, API_ENDPOINTS, LOV_ENDPOINTS } from "../../../config/apiConfig";
import { getDemandDetails } from "../../../services/demandService";
import { analyzeProfile, parseResumeProfile } from "../../../services/profileAiService";
import { getProfileView } from "../../../services/profileViewService";
import { validateRequiredFields } from "../../../utils/formValidation";
import mammoth from "mammoth";

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
  } catch (err) {
    console.error('LOV request failed:', {
      path,
      status: err?.response?.status,
      data: err?.response?.data,
      message: err?.message,
    });
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

const loadPdfJs = () =>
  new Promise((resolve, reject) => {
    if (window.pdfjsLib) { resolve(window.pdfjsLib); return; }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
      resolve(window.pdfjsLib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });

const readAsArrayBuffer = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

const formatText = (content) =>
  content
    .replace(/\b(Salary|CTC|Compensation|Packages|Salary Range|Package|Remuneration):?\s*(INR)?\s*\d+(\.\d+)?\s*(LPA|lakhs|per annum|pa)?\b/gi, "")
    .replace(/\b(INR)?\s*\d+(\.\d+)?\s*(LPA|lakhs|per annum|pa)\b/gi, "")
    .replace(/\b([A-Z])\s+([a-z]+)/g, "$1$2")
    .replace(/\.\s*/g, ".\n")
    .replace(/(\s*)\*/g, "\n*")
    .replace(/(\s*)(\d+\.)\s+/g, "\n$2 ")
    .replace(/ {2,}/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();

const extractPDF = async (file) => {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await readAsArrayBuffer(file);
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map((item) => item.str).join(" ") + "\n\n";
  }
  return formatText(fullText);
};

const extractDOCX = async (file) => {
  const arrayBuffer = await readAsArrayBuffer(file);
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const htmlText = result.value
    .replace(/<p>/g, "\n")
    .replace(/<\/p>/g, "\n")
    .replace(/<br>/g, "\n")
    .replace(/<\/?[^>]+(>|$)/g, "");
  return formatText(htmlText);
};

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
  PROFILE_EXTRACTION:     "",
  AI_PROFILE_SUMMARY:     "",
  AI_PROFILE_MATCHING:    "",
  AI_PROFILE_SCORE:       "",
};

// ── Small helpers - defined OUTSIDE component so React never recreates them ──
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
      value={value ?? "-"}
      readOnly
      style={{ background: "#f1f5f9", color: "#64748b", cursor: "default" }}
    />
  </div>
);

const normalizeForMatch = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const firstMatch = (text, patterns) => {
  for (const pattern of patterns) {
    const match = String(text || "").match(pattern);
    if (match) return match[1] ?? match[0];
  }
  return "";
};

const parseYearsFromText = (text, patterns) => {
  const raw = firstMatch(text, patterns);
  if (!raw) return "";
  const cleaned = String(raw).replace(/[^\d.]/g, "");
  return cleaned || "";
};

const parseSalaryFromText = (text, patterns) => {
  const raw = firstMatch(text, patterns);
  if (!raw) return "";
  return String(raw)
    .replace(/\s+/g, " ")
    .replace(/^(?:current|expected|present|ctc|salary|package|compensation|remuneration)[\s:-]*/i, "")
    .trim();
};

const parseNoticeDays = (text) => {
  const noticeText = firstMatch(text, [
    /notice\s*period[^0-9a-zA-Z]*([^\n\r]+)/i,
    /available\s*after[^0-9a-zA-Z]*([^\n\r]+)/i,
    /serving\s*notice[^0-9a-zA-Z]*([^\n\r]+)/i,
  ]);
  if (!noticeText) return "";

  const daysMatch = String(noticeText).match(/(\d+(?:\.\d+)?)\s*(?:days?|d)\b/i);
  if (daysMatch) return daysMatch[1];

  const weeksMatch = String(noticeText).match(/(\d+(?:\.\d+)?)\s*(?:weeks?|w)\b/i);
  if (weeksMatch) return String(Math.round(Number(weeksMatch[1]) * 7));

  const monthsMatch = String(noticeText).match(/(\d+(?:\.\d+)?)\s*(?:months?|mo|m)\b/i);
  if (monthsMatch) return String(Math.round(Number(monthsMatch[1]) * 30));

  return "";
};

const parseTaxTermsFromText = (text) => {
  const upper = String(text || "").toUpperCase();
  const options = ["C2C", "W2", "1099", "FTE", "FULL TIME", "FULL-TIME", "CORP-CORP"];
  const found = options.filter((opt) => upper.includes(opt.replace(/[^A-Z0-9]+/g, "")) || upper.includes(opt));
  if (!found.length) return "";
  const unique = [...new Set(found)];
  return unique.join(" / ");
};

const pickLovValue = (lovs, candidate) => {
  const normalizedCandidate = normalizeForMatch(candidate);
  if (!normalizedCandidate) return "";

  const exact = lovs.find((item) => {
    const value = normalizeForMatch(item.value);
    const label = normalizeForMatch(item.label);
    return value === normalizedCandidate || label === normalizedCandidate;
  });
  if (exact) return String(exact.value);

  const partial = lovs.find((item) => {
    const value = normalizeForMatch(item.value);
    const label = normalizeForMatch(item.label);
    if (!value && !label) return false;
    return value.includes(normalizedCandidate) || label.includes(normalizedCandidate) || normalizedCandidate.includes(label);
  });
  return partial ? String(partial.value) : "";
};

const parseResumeLocally = (text) => {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const email = firstMatch(text, [/([^\s@]+@[^\s@]+\.[^\s@]+)/i]);
  const phone = firstMatch(text, [
    /(\+?\d[\d\s().-]{7,}\d)/,
  ]);

  const nameLine = lines.find((line) => {
    const normalized = normalizeForMatch(line);
    if (!normalized) return false;
    if (line.includes("@")) return false;
    if (/resume|curriculum vitae|cv\b|profile\b/i.test(line)) return false;
    if (/experience|skills|education|summary|projects|employment|contact/i.test(line)) return false;
    return /^[a-z][a-z\s.'-]{2,}$/i.test(line) && line.split(/\s+/).length <= 5;
  }) || "";

  const location = firstMatch(text, [
    /current\s*location[:\s-]*([^\n\r]+)/i,
    /location[:\s-]*([^\n\r]+)/i,
    /based\s+in[:\s-]*([^\n\r]+)/i,
    /present\s*location[:\s-]*([^\n\r]+)/i,
  ]);

  const preferredLocation = firstMatch(text, [
    /preferred\s*location[:\s-]*([^\n\r]+)/i,
    /location\s*preference[:\s-]*([^\n\r]+)/i,
    /willing\s+to\s+relocate(?:\s+to)?[:\s-]*([^\n\r]+)/i,
  ]);

  const currentCompany = firstMatch(text, [
    /current\s*company[:\s-]*([^\n\r]+)/i,
    /currently\s+at[:\s-]*([^\n\r]+)/i,
    /working\s+at[:\s-]*([^\n\r]+)/i,
    /employer[:\s-]*([^\n\r]+)/i,
  ]);

  const workExp = parseYearsFromText(text, [
    /(?:total\s*)?(?:work\s*)?(?:experience|exp)[^\d]{0,20}(\d+(?:\.\d+)?)/i,
    /(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)\b/i,
  ]);

  const relevantExp = parseYearsFromText(text, [
    /relevant\s*(?:experience|exp)[^\d]{0,20}(\d+(?:\.\d+)?)/i,
    /(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?relevant\s*(?:experience|exp)\b/i,
  ]);

  const currentSalary = parseSalaryFromText(text, [
    /(?:current|present)\s*(?:salary|ctc|compensation|package|remuneration)[^\n\r]*([^\n\r]+)/i,
    /\b(?:current|present)\s*ctc[^\n\r]*([^\n\r]+)/i,
  ]);

  const expectedSalary = parseSalaryFromText(text, [
    /expected\s*(?:salary|ctc|compensation|package|remuneration)[^\n\r]*([^\n\r]+)/i,
    /\bexpected\s*ctc[^\n\r]*([^\n\r]+)/i,
  ]);

  const availability = firstMatch(text, [
    /availability[:\s-]*([^\n\r]+)/i,
    /notice\s*period[:\s-]*([^\n\r]+)/i,
    /immediate\s*joiner/i,
    /serving\s*notice/i,
  ]);

  return {
    PROFILE_NAME: nameLine,
    PROFILE_EMAIL: email,
    PROFILE_CONTACT_NO: phone,
    CURRENT_LOCATION: location,
    CURRENT_COMPANY: currentCompany,
    PREFERRED_LOCATION: preferredLocation,
    WORK_EXP_IN_YEARS: workExp,
    RELEVANT_EXP_IN_YEARS: relevantExp,
    CURRENT_SALARY_PA: currentSalary,
    EXPECTED_SALARY_PA: expectedSalary,
    PROFILE_AVAILABILITY: availability,
    NOTICE_PERIOD_DAYS: parseNoticeDays(text),
    TAX_TERMS: parseTaxTermsFromText(text),
  };
};

const mapParsedResumeToForm = (parsed, lookups) => {
  const profile = parsed?.parsed || parsed || {};
  const mapped = { ...profile };

  if (profile.work_mode && !mapped.WORK_MODE_ID) {
    mapped.WORK_MODE_ID = pickLovValue(lookups.workModes, profile.work_mode);
  }

  if (profile.salary_currency && !mapped.SALARY_CURRENCY_ID) {
    mapped.SALARY_CURRENCY_ID = pickLovValue(lookups.currencies, profile.salary_currency);
  }

  if (profile.profile_availability) {
    const availabilityValue = pickLovValue(lookups.availabilityOpts, profile.profile_availability);
    mapped.PROFILE_AVAILABILITY = availabilityValue || profile.profile_availability;
  }

  if (profile.tax_terms) {
    const taxTermsValue = pickLovValue(lookups.taxTermsOpts, profile.tax_terms);
    mapped.TAX_TERMS = taxTermsValue || profile.tax_terms;
  }

  return {
    PROFILE_NAME: mapped.PROFILE_NAME || profile.profile_name || "",
    PROFILE_EMAIL: mapped.PROFILE_EMAIL || profile.profile_email || "",
    PROFILE_CONTACT_NO: mapped.PROFILE_CONTACT_NO || profile.profile_contact_no || "",
    CURRENT_LOCATION: mapped.CURRENT_LOCATION || profile.current_location || "",
    CURRENT_COMPANY: mapped.CURRENT_COMPANY || profile.current_company || "",
    PREFERRED_LOCATION: mapped.PREFERRED_LOCATION || profile.preferred_location || "",
    WORK_MODE_ID: mapped.WORK_MODE_ID || "",
    WORK_EXP_IN_YEARS: mapped.WORK_EXP_IN_YEARS || profile.work_exp_in_years || "",
    RELEVANT_EXP_IN_YEARS: mapped.RELEVANT_EXP_IN_YEARS || profile.relevant_exp_in_years || "",
    SALARY_CURRENCY_ID: mapped.SALARY_CURRENCY_ID || "",
    CURRENT_SALARY_PA: mapped.CURRENT_SALARY_PA || profile.current_salary_pa || "",
    EXPECTED_SALARY_PA: mapped.EXPECTED_SALARY_PA || profile.expected_salary_pa || "",
    PROFILE_AVAILABILITY: mapped.PROFILE_AVAILABILITY || profile.profile_availability || "",
    NOTICE_PERIOD_DAYS: mapped.NOTICE_PERIOD_DAYS || profile.notice_period_days || "",
    NEGOTIABLE_DAYS: mapped.NEGOTIABLE_DAYS || profile.negotiable_days || "",
    TAX_TERMS: mapped.TAX_TERMS || profile.tax_terms || "",
    NOTES: mapped.NOTES || profile.notes || "",
  };
};

// ═════════════════════════════════════════════════════════════════════════════
const AddProfileModal = ({ isOpen, onClose, onSuccess, demandId, demandType, demands = [], customerId, editProfile = null }) => {
  const [formData,           setFormData]          = useState(initialForm);
  const [errors,             setErrors]            = useState({});
  const [loading,            setLoading]           = useState(false);
  const [uploadingFile,      setUploadingFile]     = useState(false);
  const [analyzing,          setAnalyzing]         = useState(false);
  const [profileParsing,     setProfileParsing]    = useState(false);
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

  const openDemands = useMemo(() => {
    const isOpenStatus = (d) => {
      const status = String(d?.demand_status ?? d?.DEMAND_STATUS ?? "").toLowerCase();
      return status === "open";
    };

    const openOnly = demands.filter(isOpenStatus);
    if (!editProfile?.profile_id) return openOnly;

    const selected = demands.find(d => String(d.demand_id) === String(selectedDemandId));
    if (!selected || openOnly.some(d => String(d.demand_id) === String(selected.demand_id))) {
      return openOnly;
    }
    return [selected, ...openOnly];
  }, [demands, editProfile?.profile_id, selectedDemandId]);

  const applyParsedResumeData = useCallback((parsed) => {
    if (!parsed) return;

    const merged = mapParsedResumeToForm(parsed, {
      workModes,
      currencies,
      availabilityOpts,
      taxTermsOpts,
    });

    setFormData((prev) => {
      const next = { ...prev };
      Object.entries(merged).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        const text = String(value).trim();
        if (!text) return;
        next[key] = text;
      });
      return next;
    });
  }, [availabilityOpts, currencies, taxTermsOpts, workModes]);

  const fileInputRef = useRef(null);
  const isAnalysisComplete = Boolean(
    formData.AI_PROFILE_SUMMARY?.trim()
    && formData.AI_PROFILE_MATCHING?.trim()
    && formData.AI_PROFILE_SCORE?.trim()
  );

  // ── Reset ────────────────────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setFormData(initialForm);
    setErrors({});
    setSelectedFileName("");
    setSelectedFile(null);
    setProfileParsing(false);
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
    loadPdfJs().catch(() => {});
  }, [isOpen]);

  // ── Handle demand selection ──────────────────────────────────────────────
  const handleDemandChange = async (e) => {
    const val = e.target.value;
    setSelectedDemandId(val);
    if (errors.DEMAND_ID) setErrors(p => ({ ...p, DEMAND_ID: "" }));
    setFormData((p) => ({
      ...p,
      AI_PROFILE_SUMMARY: "",
      AI_PROFILE_MATCHING: "",
      AI_PROFILE_SCORE: "",
    }));

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

  // Pre-fill form when editing
  useEffect(() => {
    if (!isOpen || !editProfile?.profile_id) return;

    const fillFromProfile = async () => {
      try {
        const view = await getProfileView(editProfile.profile_id);
        const source = view?.success === false ? editProfile : { ...editProfile, ...view };

        const demandValue = source.demand_id || editProfile.demand_id || "";
        setSelectedDemandId(demandValue ? String(demandValue) : "");
        const found = demands.find(d => String(d.demand_id) === String(demandValue));
        setSelectedDemandInfo(found || null);

        if (customerId && demandValue) {
          try {
            const details = await getDemandDetails(customerId, demandValue);
            setDemandDetails(details);
          } catch {
            setDemandDetails(null);
          }
        }

        setFormData((p) => ({
          ...p,
          PROFILE_NAME:          source.name || source.profile_name || "",
          PROFILE_EMAIL:         source.email || source.profile_email || "",
          PROFILE_CONTACT_NO:    source.contact_no || source.profile_contact_no || "",
          CURRENT_LOCATION:      source.current_location || "",
          CURRENT_COMPANY:       source.current_company || "",
          PREFERRED_LOCATION:    source.preferred_location || "",
          WORK_MODE_ID:          source.work_mode || source.work_mode_id ? String(source.work_mode || source.work_mode_id) : "",
          WORK_EXP_IN_YEARS:     source.total_exp || source.work_exp_in_years || "",
          RELEVANT_EXP_IN_YEARS: source.relevant_exp || source.relevant_exp_in_years || "",
          SALARY_CURRENCY_ID:    source.salary_currency_id || source.SALARY_CURRENCY_ID || source.currency_id
            ? String(source.salary_currency_id || source.SALARY_CURRENCY_ID || source.currency_id)
            : "",
          CURRENT_SALARY_PA:     source.current_salary || source.current_salary_pa || "",
          EXPECTED_SALARY_PA:    source.expected_salary || source.expected_salary_pa || "",
          PROFILE_AVAILABILITY:  source.availability || source.profile_availability || "Serving Notice",
          NOTICE_PERIOD_DAYS:    source.notice_period || source.notice_period_days || "",
          NEGOTIABLE_DAYS:       source.negotiable_days || "",
          TAX_TERMS:             source.tax_terms || "",
          VENDOR_ID:             source.vendor_id ? String(source.vendor_id) : "",
          NOTES:                 source.notes || "",
          FILE_NAME:             source.file_name || "",
          PROFILE_URL:           source.profile_url || "",
          AI_PROFILE_SUMMARY:    source.ai_profile_summary || "",
          AI_PROFILE_MATCHING:   source.ai_profile_matching || "",
          AI_PROFILE_SCORE:      source.ai_profile_score || "",
        }));
      } catch {
        setFormData((p) => ({
          ...p,
          PROFILE_NAME:          editProfile.profile_name || "",
          PROFILE_EMAIL:         editProfile.profile_email || "",
          PROFILE_CONTACT_NO:    editProfile.profile_contact_no || "",
          CURRENT_LOCATION:      editProfile.current_location || "",
          CURRENT_COMPANY:       editProfile.current_company || "",
          PREFERRED_LOCATION:    editProfile.preferred_location || "",
          WORK_MODE_ID:          editProfile.work_mode_id ? String(editProfile.work_mode_id) : "",
          WORK_EXP_IN_YEARS:     editProfile.work_exp_in_years || "",
          RELEVANT_EXP_IN_YEARS: editProfile.relevant_exp_in_years || "",
          SALARY_CURRENCY_ID:    editProfile.salary_currency_id || editProfile.SALARY_CURRENCY_ID || editProfile.currency_id
            ? String(editProfile.salary_currency_id || editProfile.SALARY_CURRENCY_ID || editProfile.currency_id)
            : "",
          CURRENT_SALARY_PA:     editProfile.current_salary_pa || "",
          EXPECTED_SALARY_PA:    editProfile.expected_salary_pa || "",
          PROFILE_AVAILABILITY:  editProfile.profile_availability || "Serving Notice",
          NOTICE_PERIOD_DAYS:    editProfile.notice_period_days || "",
          NEGOTIABLE_DAYS:       editProfile.negotiable_days || "",
          TAX_TERMS:             editProfile.tax_terms || "",
          VENDOR_ID:             editProfile.vendor_id ? String(editProfile.vendor_id) : "",
          NOTES:                 editProfile.notes || "",
          FILE_NAME:             editProfile.file_name || "",
          PROFILE_URL:           editProfile.profile_url || "",
          AI_PROFILE_SUMMARY:    editProfile.ai_profile_summary || "",
          AI_PROFILE_MATCHING:   editProfile.ai_profile_matching || "",
          AI_PROFILE_SCORE:      editProfile.ai_profile_score || "",
        }));
      }
    };

    fillFromProfile();
  }, [isOpen, editProfile, demands, customerId]);

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

    setProfileParsing(true);
    (async () => {
      try {
        let extractedText = "";
        if (ext === "pdf") {
          extractedText = await extractPDF(file);
        } else if (ext === "docx") {
          extractedText = await extractDOCX(file);
        } else {
          toast.error("DOC format not supported for extraction. Please use PDF or DOCX.");
          return;
        }

        if (!extractedText.trim()) {
          toast.error("No text could be extracted from the file.");
          return;
        }

        applyParsedResumeData(parseResumeLocally(extractedText));

        const parsedResume = await parseResumeProfile({ profileText: extractedText });
        if (parsedResume.success && parsedResume.parsed) {
          applyParsedResumeData(parsedResume.parsed);
        }

        setFormData((p) => ({
          ...p,
          PROFILE_EXTRACTION: extractedText,
          AI_PROFILE_SUMMARY: "",
          AI_PROFILE_MATCHING: "",
          AI_PROFILE_SCORE: "",
        }));
      } catch (err) {
        console.error("Profile extraction error:", err);
        toast.error("Failed to extract text from resume.");
      } finally {
        setProfileParsing(false);
      }
    })();
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    const endAnalyzeWithError = (message) => {
      toast.error(message);
      setAnalyzing(false);
    };
    try {
      if (!formData.PROFILE_EXTRACTION?.trim()) {
        endAnalyzeWithError("Please upload a resume for AI analyzing.");
        return;
      }
      if (!selectedDemandId) {
        endAnalyzeWithError("Please select a demand to analyze.");
        return;
      }

      let details = demandDetails;
      if (!details && customerId) {
        try {
          details = await getDemandDetails(customerId, selectedDemandId);
          setDemandDetails(details);
        } catch {
          details = null;
        }
      }
      const normalizedDetails =
        details?.demand ||
        details?.data ||
        details?.result?.[0] ||
        details?.items?.[0] ||
        details?.[0] ||
        details;

      if (!normalizedDetails) {
        endAnalyzeWithError("Demand details not found for the selected demand.");
        return;
      }

      const weights = {
        skills: Number(normalizedDetails?.ai_skills_match ?? normalizedDetails?.AI_SKILLS_MATCH ?? 0),
        experience: Number(normalizedDetails?.ai_experience_alignment ?? normalizedDetails?.AI_EXPERIENCE_ALIGNMENT ?? 0),
        culture: Number(normalizedDetails?.ai_culture_soft_skill ?? normalizedDetails?.AI_CULTURE_SOFT_SKILL ?? 0),
        growth: Number(normalizedDetails?.ai_growth_potential ?? normalizedDetails?.AI_GROWTH_POTENTIAL ?? 0),
      };
      const jdSummary =
        normalizedDetails?.ai_jd_summary ??
        normalizedDetails?.AI_JD_SUMMARY ??
        normalizedDetails?.aiJdSummary ??
        "";

      if (!jdSummary.trim()) {
        endAnalyzeWithError("JD summary is missing for the selected demand.");
        return;
      }
      if (!(weights.skills || weights.experience || weights.culture || weights.growth)) {
        endAnalyzeWithError("Scoring weights are missing for the selected demand.");
        return;
      }

      toast.info("Running AI analysis...");

      const response = await analyzeProfile({
        profileText: formData.PROFILE_EXTRACTION,
        jdSummary,
        weights,
      });

      if (!response.success) {
        endAnalyzeWithError(response.message || "Analysis failed.");
        return;
      }

      setFormData((p) => ({
        ...p,
        AI_PROFILE_SUMMARY: response.profile_summary || response.ai_profile_summary || "",
        AI_PROFILE_MATCHING: response.profile_matching || response.ai_profile_matching || "",
        AI_PROFILE_SCORE: response.match_score || response.ai_profile_score || "",
      }));

      toast.success("Profile analysis completed.");
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Validation ───────────────────────────────────────────────────────────
  const validate = () => {
    const result = validateRequiredFields(
      {
        DEMAND_ID: selectedDemandId,
        PROFILE_NAME: formData.PROFILE_NAME,
        PROFILE_EMAIL: formData.PROFILE_EMAIL,
        CURRENT_LOCATION: formData.CURRENT_LOCATION,
        CURRENT_COMPANY: formData.CURRENT_COMPANY,
        PREFERRED_LOCATION: formData.PREFERRED_LOCATION,
        WORK_MODE_ID: formData.WORK_MODE_ID,
        WORK_EXP_IN_YEARS: formData.WORK_EXP_IN_YEARS,
        RELEVANT_EXP_IN_YEARS: formData.RELEVANT_EXP_IN_YEARS,
        SALARY_CURRENCY_ID: formData.SALARY_CURRENCY_ID,
        CURRENT_SALARY_PA: formData.CURRENT_SALARY_PA,
        EXPECTED_SALARY_PA: formData.EXPECTED_SALARY_PA,
        PROFILE_AVAILABILITY: formData.PROFILE_AVAILABILITY,
        TAX_TERMS: formData.TAX_TERMS,
      },
      { toastKey: 'add-profile-form', formId: 'add-profile-form' }
    );

    const e = { ...result.errors };
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (e.DEMAND_ID) e.DEMAND_ID = "Please select a demand";
    if (e.PROFILE_NAME) e.PROFILE_NAME = "Name is required";
    if (e.PROFILE_EMAIL) e.PROFILE_EMAIL = "Email is required";
    if (formData.PROFILE_EMAIL.trim() && !emailRe.test(formData.PROFILE_EMAIL)) {
      e.PROFILE_EMAIL = "Invalid email format";
    }
    if (e.CURRENT_LOCATION) e.CURRENT_LOCATION = "Required";
    if (e.CURRENT_COMPANY) e.CURRENT_COMPANY = "Required";
    if (e.PREFERRED_LOCATION) e.PREFERRED_LOCATION = "Required";
    if (e.WORK_MODE_ID) e.WORK_MODE_ID = "Required";
    if (e.WORK_EXP_IN_YEARS) e.WORK_EXP_IN_YEARS = "Required";
    if (e.RELEVANT_EXP_IN_YEARS) e.RELEVANT_EXP_IN_YEARS = "Required";
    if (e.SALARY_CURRENCY_ID) e.SALARY_CURRENCY_ID = "Required";
    if (e.CURRENT_SALARY_PA) e.CURRENT_SALARY_PA = "Required";
    if (e.EXPECTED_SALARY_PA) e.EXPECTED_SALARY_PA = "Required";
    if (e.PROFILE_AVAILABILITY) e.PROFILE_AVAILABILITY = "Required";
    if (e.TAX_TERMS) e.TAX_TERMS = "Required";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (!isAnalysisComplete) {
      toast.error("Please complete AI analysis before saving the profile.");
      return;
    }

    const isEdit = Boolean(editProfile?.profile_id);
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
        VENDOR_ID:             formData.VENDOR_ID ? Number(formData.VENDOR_ID) : 401,
        FILE_NAME:             formData.FILE_NAME          || null,
        PROFILE_URL:           formData.PROFILE_URL        || null,
        NOTES:                 formData.NOTES              || null,
        AI_PROFILE_SUMMARY:    formData.AI_PROFILE_SUMMARY || null,
        AI_PROFILE_MATCHING:   formData.AI_PROFILE_MATCHING || null,
        AI_PROFILE_SCORE:      formData.AI_PROFILE_SCORE || null,
      };
      if (isEdit) {
        payload.PROFILE_ID = Number(editProfile.profile_id);
      }

      const response = await api.post(
        isEdit ? API_ENDPOINTS.UPDATE_PROFILE : API_ENDPOINTS.ADD_PROFILE,
        payload
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to add profile');
      }

      const profileId = editProfile?.profile_id || response.data.profile_id;

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

      toast.success(isEdit ? 'Profile updated successfully!' : 'Profile added successfully!');
      handleClose();
      onSuccess?.();

    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || (isEdit ? 'Failed to update profile.' : 'Failed to add profile.'));
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
          <h2 className="ats-heading-2" id="modal-title">
            {editProfile?.profile_id ? "Edit Profile" : "Add Profile"}
          </h2>
          <button type="button" className="dm-close" onClick={handleClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="dm-body">
          {loading ? (
            <Loader inline message={uploadingFile ? "Uploading resume..." : "Saving profile..."} />
          ) : null}
          <form id="add-profile-form" onSubmit={handleSubmit} noValidate>

            {/* ── Demand ── */}
            <p className="dm-section-label">Demand</p>
            <div className="dm-row">
              <Field label="Select Demand" required error={errors.DEMAND_ID}>
                <select
                  className={`form-select${errors.DEMAND_ID ? " input-error" : ""}`}
                  value={selectedDemandId}
                  onChange={handleDemandChange}
                  disabled={Boolean(editProfile?.profile_id)}
                >
                  <option value="">Select demand</option>
                  {openDemands.map(d => (
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
                    || demandDetails.work_mode_name || "-"
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
              <Field label="Vendor" error={errors.VENDOR_ID}>
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
            <div className="dm-row">
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
                {profileParsing ? (
                  <span className="dm-upload-hint">Extracting and pre-filling...</span>
                ) : uploadingFile ? (
                  <span className="dm-upload-hint">Uploading...</span>
                ) : selectedFileName ? (
                  <span className="dm-upload-selected">
                    <FileText size={16} /> {selectedFileName}
                  </span>
                ) : (
                  <>
                    <Upload size={20} className="dm-upload-icon" />
                    <span className="dm-upload-hint">Click to upload PDF or DOCX</span>
                  </>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Attached File</label>
                <input
                  className="form-input"
                  value={formData.FILE_NAME || "-"}
                  readOnly
                  style={{ background: "#f1f5f9", color: "#64748b", cursor: "default" }}
                />
              </div>
            </div>

            {/* ── Profile Analysis ── */}
            <p className="dm-section-label">Profile Analysis</p>
            <div className="dm-row">
              <div className="form-group">
                <button
                  type="button"
                  className="btn-ai"
                  onClick={() => {
                    handleAnalyze();
                  }}
                  disabled={analyzing}
                >
                  <Zap size={16} />
                  {analyzing ? "Analyzing..." : "Analyze"}
                </button>
              </div>
              <div />
            </div>
            {analyzing ? <AiLoader mode="profile" /> : null}
            <div style={{ gridColumn: "1 / -1" }} className="form-group">
              <label className="form-label">Profile Summary</label>
              <textarea
                name="AI_PROFILE_SUMMARY"
                className="form-textarea"
                placeholder="Profile summary will appear here after analysis."
                value={formData.AI_PROFILE_SUMMARY}
                onChange={handleChange}
                readOnly
                rows={3}
                style={{ background: "#f1f5f9", color: "#64748b", cursor: "default" }}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }} className="form-group">
              <label className="form-label">Profile Matching</label>
              <textarea
                name="AI_PROFILE_MATCHING"
                className="form-textarea"
                placeholder="Profile matching details will appear here after analysis."
                value={formData.AI_PROFILE_MATCHING}
                onChange={handleChange}
                readOnly
                rows={4}
                style={{ background: "#f1f5f9", color: "#64748b", cursor: "default" }}
              />
            </div>
            <div className="dm-row">
              <Field label="Match Score">
                <input
                  name="AI_PROFILE_SCORE"
                  className="form-input"
                  value={formData.AI_PROFILE_SCORE}
                  onChange={handleChange}
                  readOnly
                  placeholder="e.g. 78/100"
                  style={{ background: "#f1f5f9", color: "#64748b", cursor: "default" }}
                />
              </Field>
              <div />
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
              disabled={loading || uploadingFile || analyzing || !isAnalysisComplete}
            >
              {analyzing ? "Analyzing..." : (loading ? "Saving..." : (editProfile?.profile_id ? "Update" : "Save Profile"))}
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
        .form-hint { font-size: 11px; color: var(--ats-secondary); margin-top: 6px; }
        .dm-upload-zone {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          border: 2px dashed var(--ats-border); border-radius: 10px;
          padding: 18px 16px; cursor: pointer; margin-bottom: 16px;
          transition: border-color 0.15s, background 0.15s;
        }
        .dm-upload-zone:hover,
        .dm-upload-zone:focus { outline: none; border-color: var(--ats-primary); background: var(--ats-bg-accent, #f5f9ff); }
        .dm-upload-icon { color: var(--ats-secondary); }
        .dm-upload-selected {
          display: flex; align-items: center; gap: 6px;
          font-size: 13px; color: var(--ats-primary); font-weight: 500;
        }
        .dm-upload-hint { font-size: 13px; color: var(--ats-secondary); }
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



