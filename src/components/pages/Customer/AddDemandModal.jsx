import React, { useState, useEffect } from 'react';
import { X, Upload, Zap } from 'lucide-react';
import { addDemand, extractJD, uploadDemandFiles } from '../../../services/demandService';
import Loader from '../../common/Loader';
import AiLoader from '../../common/AiLoader';
import { toast } from '../../toast/index';
import axios from 'axios';
import { API_BASE_URL, LOV_ENDPOINTS } from '../../../config/apiConfig';
import { attachGlobalLoaderInterceptors } from '../../../services/httpLoader';
import { validateRequiredFields } from '../../../utils/formValidation';
import mammoth from 'mammoth';

// ── Load pdf.js from CDN dynamically ─────────────────────────────────────
const loadPdfJs = () =>
  new Promise((resolve, reject) => {
    if (window.pdfjsLib) { resolve(window.pdfjsLib); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });

// ── Fetch LOV data ────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

attachGlobalLoaderInterceptors(api);

const getLovData = async (path) => {
  try {
    const res = await api.get(path);
    const data = res.data;
    if (data.items) return data.items;
    if (Array.isArray(data)) return data;
    return [];
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

// ── Read file as ArrayBuffer ──────────────────────────────────────────────
const readAsArrayBuffer = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

// ── Format extracted text ─────────────────────────────────────────────────
const formatText = (content) =>
  content
    .replace(/\b(Salary|CTC|Compensation|Pakages|Salary Range|Package|Remuneration):?\s*₹?\s*\d+(\.\d+)?\s*(LPA|lakhs|per annum|pa)?\b/gi, '')
    .replace(/\b(₹|INR)?\s*\d+(\.\d+)?\s*(LPA|lakhs|per annum|pa)\b/gi, '')
    .replace(/\b([A-Z])\s+([a-z]+)/g, '$1$2')
    .replace(/\.\s*/g, '.\n')
    .replace(/(\s*)•/g, '\n•')
    .replace(/(\s*)(\d+\.)\s+/g, '\n$2 ')
    .replace(/ {2,}/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();

// ── Extract text from PDF ─────────────────────────────────────────────────
const extractPDF = async (file) => {
  const pdfjsLib    = await loadPdfJs();
  const arrayBuffer = await readAsArrayBuffer(file);
  const pdf         = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map(item => item.str).join(' ') + '\n\n';
  }
  return formatText(fullText);
};

// ── Extract text from DOCX ────────────────────────────────────────────────
const extractDOCX = async (file) => {
  const arrayBuffer = await readAsArrayBuffer(file);
  const result      = await mammoth.convertToHtml({ arrayBuffer });
  const htmlText    = result.value
    .replace(/<p>/g, '\n')
    .replace(/<\/p>/g, '\n')
    .replace(/<br>/g, '\n')
    .replace(/<\/?[^>]+(>|$)/g, '');
  return formatText(htmlText);
};

// ── US Country ID ─────────────────────────────────────────────────────────
const US_COUNTRY_ID = '1';

// ═════════════════════════════════════════════════════════════════════════
const AddDemandModal = ({ isOpen, onClose, onSuccess, customerId }) => {

  const initialForm = {
    LOCATION_TYPE:            '',
    COUNTRY_ID:               '',
    DEMAND_TYPE:              '',
    WORK_MODE_ID:             '',
    DEMAND_DATE:              new Date().toISOString().split('T')[0],
    BILLABLE_DATE:            new Date().toISOString().split('T')[0],
    JOB_ROLE:                 '',
    NO_OF_POSITION:           '',
    DURATION_NO:              '',
    SALARY_CURRENCY_ID:       '',
    SALARY_RANGE_PA_MIN:      '',
    SALARY_RANGE_PA_MAX:      '',
    YEAR_OF_EXP_FROM:         '',
    YEAR_OF_EXP_TO:           '',
    JOB_DESCRIPTION:          '',
    AI_EXTRACTION:            '',
    AI_SKILLS_MATCH:          '40',
    AI_EXPERIENCE_ALIGNMENT:  '25',
    AI_CULTURE_SOFT_SKILL:    '20',
    AI_GROWTH_POTENTIAL:      '15',
    PROFILE_KEYWORDS:         '',
    END_CLIENT_NAME:          '',
    RESOURCE_LOCATION:        '',
    STANDARD_TIME:            '1',
    COMMENTS:                 '',
    DES_STATUS_ID:            '',
    ASSIGNED_TO:              '',
  };

  const [formData,    setFormData]    = useState(initialForm);
  const [errors,      setErrors]      = useState({});
  const [loading,     setLoading]     = useState(false);
  const [extracting,  setExtracting]  = useState(false);
  const [jdParsing,   setJdParsing]   = useState(false);
  const [lovLoading,  setLovLoading]  = useState(true);
  const [jdFile,      setJdFile]      = useState(null);
  const [iqFile,      setIqFile]      = useState(null);

  // LOV states
  const [locationTypes, setLocationTypes] = useState([]);
  const [jobTypes,      setJobTypes]      = useState([]);
  const [workModes,     setWorkModes]     = useState([]);
  const [desStatuses,   setDesStatuses]   = useState([]);
  const [countries,     setCountries]     = useState([]);
  const [currencies,    setCurrencies]    = useState([]);

  // ── Load LOVs ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const loadLovs = async () => {
      setLovLoading(true);
      const [lt, jt, wm, ds, cn, cu] = await Promise.all([
        getLovData(LOV_ENDPOINTS.DEMAND_TYPES),
        getLovData(LOV_ENDPOINTS.JOB_TYPES),
        getLovData(LOV_ENDPOINTS.WORK_MODES),
        getLovData(LOV_ENDPOINTS.DECISION_STATUSES),
        getLovData(LOV_ENDPOINTS.COUNTRIES),
        getLovData(LOV_ENDPOINTS.CURRENCIES),
      ]);
      setLocationTypes(lt);
      setJobTypes(jt);
      setWorkModes(wm);
      setDesStatuses(ds);
      setCountries(cn);
      setCurrencies(cu);
      setLovLoading(false);
    };

    loadLovs();
    // Pre-load pdf.js so it's ready when needed
    loadPdfJs().catch(() => {});
  }, [isOpen]);

  // ── Escape key ────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') handleClose(); };
    if (isOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  // ── Body scroll lock ──────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // ── Reset Demand Type if C2C/W2 selected but Location changes ─────────
  useEffect(() => {
    const selectedType = jobTypes.find(j => String(j.value) === String(formData.DEMAND_TYPE));
    if (!selectedType) return;
    const isC2CW2 = selectedType.condition_check === 'US';
    if (isC2CW2 && formData.LOCATION_TYPE !== 'Onsite') {
      setFormData(prev => ({ ...prev, DEMAND_TYPE: '' }));
    }
    if (!isC2CW2 && formData.LOCATION_TYPE === 'Onsite') {
      setFormData(prev => ({ ...prev, DEMAND_TYPE: '' }));
    }
  }, [formData.LOCATION_TYPE]);

  const resetForm = () => {
    setFormData(initialForm);
    setErrors({});
    setJdFile(null);
    setIqFile(null);
  };

  const handleClose = () => { resetForm(); onClose(); };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  // ── C2C / W2 filter ───────────────────────────────────────────────────
  const filteredJobTypes = jobTypes.filter(j => {
    if (formData.LOCATION_TYPE === 'Onsite') {
      return j.condition_check === 'US';
    } else {
      return j.condition_check !== 'US';
    }
  });

  // ── JD File Upload ────────────────────────────────────────────────────
  const handleJdFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();

    if (!['pdf', 'doc', 'docx'].includes(ext)) {
      toast.error('Unsupported file type. Please upload PDF or DOCX.');
      return;
    }

    setJdFile(file);
    setJdParsing(true);

    try {
      let extractedText = '';

      if (ext === 'pdf') {
        extractedText = await extractPDF(file);
      } else if (ext === 'docx') {
        extractedText = await extractDOCX(file);
      } else {
        toast.error('DOC format not supported for extraction. Please use PDF or DOCX.');
        setJdParsing(false);
        return;
      }

      if (!extractedText.trim()) {
        toast.error('No text could be extracted from the file. It may be a scanned image PDF.');
        setJdParsing(false);
        return;
      }

      setFormData(prev => ({ ...prev, JOB_DESCRIPTION: extractedText }));
      toast.success('Job Description extracted from file!');
    } catch (err) {
      console.error('JD file extraction error:', err);
      toast.error('Failed to extract text from file.');
    } finally {
      setJdParsing(false);
    }
  };

  // ── AI Extract ────────────────────────────────────────────────────────
  const handleExtract = async () => {
    if (!formData.JOB_DESCRIPTION.trim()) {
      toast.error('Please enter or upload a Job Description first.');
      return;
    }
    setExtracting(true);
    try {
      const response = await extractJD(formData.JOB_DESCRIPTION);
      if (response.success) {
        setFormData(prev => ({ ...prev, AI_EXTRACTION: response.extraction }));
        toast.success('AI extraction completed!');
      } else {
        toast.error(response.message || 'Extraction failed.');
      }
    } catch {
      toast.error('Failed to connect to AI service.');
    } finally {
      setExtracting(false);
    }
  };

  // ── Validation ────────────────────────────────────────────────────────
  const validate = () => {
    const result = validateRequiredFields(
      {
        LOCATION_TYPE: formData.LOCATION_TYPE,
        COUNTRY_ID: formData.COUNTRY_ID,
        DEMAND_TYPE: formData.DEMAND_TYPE,
        WORK_MODE_ID: formData.WORK_MODE_ID,
        BILLABLE_DATE: formData.BILLABLE_DATE,
        JOB_ROLE: formData.JOB_ROLE,
        NO_OF_POSITION: formData.NO_OF_POSITION,
        END_CLIENT_NAME: formData.END_CLIENT_NAME,
        RESOURCE_LOCATION: formData.RESOURCE_LOCATION,
        DES_STATUS_ID: formData.DES_STATUS_ID,
        ASSIGNED_TO: formData.ASSIGNED_TO,
      },
      { toastKey: 'add-demand-form', formId: 'add-demand-form' }
    );

    const e = { ...result.errors };
    if (e.NO_OF_POSITION) e.NO_OF_POSITION = 'No of Positions is required';
    if (e.DES_STATUS_ID) e.DES_STATUS_ID = 'Decision is required';

    setErrors(e);
    return result.isValid;
  };

  // ── Submit ────────────────────────────────────────────────────────────
  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        customer_id:             customerId,
        demand_type:             formData.LOCATION_TYPE,
        job_type_id:             formData.DEMAND_TYPE             || null,
        country_id:              formData.COUNTRY_ID              || null,
        work_mode_id:            formData.WORK_MODE_ID            || null,
        demand_date:             formData.DEMAND_DATE             || null,
        billable_date:           formData.BILLABLE_DATE           || null,
        job_role:                formData.JOB_ROLE.trim(),
        no_of_position:          formData.NO_OF_POSITION          || null,
        duration_no:             formData.DURATION_NO             || null,
        duration_type:           'Years',
        salary_currency_id:      formData.SALARY_CURRENCY_ID      || null,
        salary_range_pa_min:     formData.SALARY_RANGE_PA_MIN     || null,
        salary_range_pa_max:     formData.SALARY_RANGE_PA_MAX     || null,
        year_of_exp_from:        formData.YEAR_OF_EXP_FROM        || null,
        year_of_exp_to:          formData.YEAR_OF_EXP_TO          || null,
        job_description:         formData.JOB_DESCRIPTION         || null,
        ai_jd_summary:           formData.AI_EXTRACTION           || null,
        ai_skills_match:         formData.AI_SKILLS_MATCH         || null,
        ai_experience_alignment: formData.AI_EXPERIENCE_ALIGNMENT || null,
        ai_culture_soft_skill:   formData.AI_CULTURE_SOFT_SKILL   || null,
        ai_growth_potential:     formData.AI_GROWTH_POTENTIAL     || null,
        profile_keywords:        formData.PROFILE_KEYWORDS        || null,
        end_client_name:         formData.END_CLIENT_NAME.trim(),
        resource_location:       formData.RESOURCE_LOCATION.trim(),
        standard_time:           formData.STANDARD_TIME,
        comments:                formData.COMMENTS                || null,
        des_status_id:           formData.DES_STATUS_ID           || null,
        assigned_to:             formData.ASSIGNED_TO.trim()      || null,
        demand_status:           'Open',
      };

      const response = await addDemand(payload);

      if (!response.success) {
        toast.error(response.message || 'Failed to create demand.');
        return;
      }

      const demandId = response.demand_id;
      toast.success('Demand created successfully!');

      // Upload IQ file if selected
      if (iqFile) {
        try {
          const uploadPayload = {
            demand_id:      demandId,
            iq_file_name:   iqFile.name,
            iq_mime_type:   iqFile.type || 'application/octet-stream',
            iq_file_base64: await fileToBase64(iqFile),
          };
          const uploadResponse = await uploadDemandFiles(uploadPayload);
          if (uploadResponse.success) {
            toast.success('Interview Questions uploaded successfully!');
          } else {
            toast.error('Demand created but IQ upload failed: ' + (uploadResponse.message || ''));
          }
        } catch {
          toast.error('Demand created but IQ upload encountered an error.');
        }
      }

      resetForm();
      onClose();
      if (onSuccess) onSuccess();

    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to create demand.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="dm-backdrop" onClick={handleClose} />

      <div className="dm-modal" role="dialog" aria-modal="true">

        {/* Header */}
        <div className="dm-header">
          <h2 className="ats-heading-2">Add Demand</h2>
          <button type="button" className="dm-close" onClick={handleClose}><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="dm-body">
          {loading ? <Loader inline message="Saving demand..." /> : null}
          {lovLoading ? (
            <Loader inline message="Loading form data..." />
          ) : (
            <form id="add-demand-form" onSubmit={handleSubmit}>

              {/* ── Row 1: Location Type + Country ── */}
              <div className="dm-row">
                <div className="form-group">
                  <label className="form-label">Location Type *</label>
                  <select
                    name="LOCATION_TYPE"
                    className={`form-select ${errors.LOCATION_TYPE ? 'input-error' : ''}`}
                    value={formData.LOCATION_TYPE}
                    onChange={handleChange}
                  >
                    <option value="">Select Location Type</option>
                    {locationTypes.map(lt => (
                      <option key={lt.value} value={lt.value}>{lt.label}</option>
                    ))}
                  </select>
                  {errors.LOCATION_TYPE && <span className="form-error">{errors.LOCATION_TYPE}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Country *</label>
                  <select
                    name="COUNTRY_ID"
                    className={`form-select ${errors.COUNTRY_ID ? 'input-error' : ''}`}
                    value={formData.COUNTRY_ID}
                    onChange={handleChange}
                  >
                    <option value="">Select Country</option>
                    {countries.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  {errors.COUNTRY_ID && <span className="form-error">{errors.COUNTRY_ID}</span>}
                </div>
              </div>

              {/* ── Row 2: Demand Type + Work Mode ── */}
              <div className="dm-row">
                <div className="form-group">
                  <label className="form-label">Demand Type *</label>
                  <select
                    name="DEMAND_TYPE"
                    className={`form-select ${errors.DEMAND_TYPE ? 'input-error' : ''}`}
                    value={formData.DEMAND_TYPE}
                    onChange={handleChange}
                  >
                    <option value="">Select Demand Type</option>
                    {filteredJobTypes.map(j => (
                      <option key={j.value} value={j.value}>{j.label}</option>
                    ))}
                  </select>
                  {errors.DEMAND_TYPE && <span className="form-error">{errors.DEMAND_TYPE}</span>}
                  {formData.LOCATION_TYPE === 'Onsite' && String(formData.COUNTRY_ID) === US_COUNTRY_ID && (
                    <span className="field-hint" style={{ color: '#7c3aed' }}>C2C and W2 available for US Onsite</span>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Work Mode *</label>
                  <select
                    name="WORK_MODE_ID"
                    className={`form-select ${errors.WORK_MODE_ID ? 'input-error' : ''}`}
                    value={formData.WORK_MODE_ID}
                    onChange={handleChange}
                  >
                    <option value="">Select Work Mode</option>
                    {workModes.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                  </select>
                  {errors.WORK_MODE_ID && <span className="form-error">{errors.WORK_MODE_ID}</span>}
                </div>
              </div>

              {/* ── Row 3: Demand Date + Billing Date ── */}
              <div className="dm-row">
                <div className="form-group">
                  <label className="form-label">Demand Date *</label>
                  <input type="date" name="DEMAND_DATE" className="form-input" value={formData.DEMAND_DATE} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Billing Date *</label>
                  <input
                    type="date" name="BILLABLE_DATE"
                    className={`form-input ${errors.BILLABLE_DATE ? 'input-error' : ''}`}
                    value={formData.BILLABLE_DATE} onChange={handleChange}
                  />
                  {errors.BILLABLE_DATE && <span className="form-error">{errors.BILLABLE_DATE}</span>}
                </div>
              </div>

              {/* ── Row 4: Role + No Of Position ── */}
              <div className="dm-row">
                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <input
                    type="text" name="JOB_ROLE"
                    className={`form-input ${errors.JOB_ROLE ? 'input-error' : ''}`}
                    value={formData.JOB_ROLE} onChange={handleChange}
                    placeholder="Enter job role" autoFocus
                  />
                  {errors.JOB_ROLE && <span className="form-error">{errors.JOB_ROLE}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">No Of Position *</label>
                  <input
                    type="number" name="NO_OF_POSITION"
                    className={`form-input ${errors.NO_OF_POSITION ? 'input-error' : ''}`}
                    value={formData.NO_OF_POSITION} onChange={handleChange}
                    placeholder="0" min="1"
                  />
                  {errors.NO_OF_POSITION && <span className="form-error">{errors.NO_OF_POSITION}</span>}
                </div>
              </div>

              {/* ── Row 5: Duration + Currency ── */}
              <div className="dm-row">
                <div className="form-group">
                  <label className="form-label">Duration (Years)</label>
                  <input type="number" name="DURATION_NO" className="form-input" value={formData.DURATION_NO} onChange={handleChange} placeholder="e.g. 2" min="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Currency</label>
                  <select name="SALARY_CURRENCY_ID" className="form-select" value={formData.SALARY_CURRENCY_ID} onChange={handleChange}>
                    <option value="">Select Currency</option>
                    {currencies.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              {/* ── Row 6: Salary Min + Max ── */}
              <div className="dm-row">
                <div className="form-group">
                  <label className="form-label">Salary Min</label>
                  <input type="number" name="SALARY_RANGE_PA_MIN" className="form-input" value={formData.SALARY_RANGE_PA_MIN} onChange={handleChange} placeholder="Min" min="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Salary Max</label>
                  <input type="number" name="SALARY_RANGE_PA_MAX" className="form-input" value={formData.SALARY_RANGE_PA_MAX} onChange={handleChange} placeholder="Max" min="0" />
                </div>
              </div>

              {/* ── Row 7: Exp From + To ── */}
              <div className="dm-row">
                <div className="form-group">
                  <label className="form-label">Year Of Exp (From)</label>
                  <input type="number" name="YEAR_OF_EXP_FROM" className="form-input" value={formData.YEAR_OF_EXP_FROM} onChange={handleChange} placeholder="e.g. 2" min="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Year Of Exp (To)</label>
                  <input type="number" name="YEAR_OF_EXP_TO" className="form-input" value={formData.YEAR_OF_EXP_TO} onChange={handleChange} placeholder="e.g. 5" min="0" />
                </div>
              </div>

              {/* ── JD File Upload ── */}
              <div className="form-group">
                <label className="form-label">Job Description Upload</label>
                <div className="file-upload-wrap">
                  <label className="file-upload-btn">
                    <Upload size={14} />
                    {jdFile ? jdFile.name : 'Choose File'}
                    <input type="file" accept=".pdf,.docx" style={{ display: 'none' }} onChange={handleJdFileChange} />
                  </label>
                  {jdFile && <span className="file-name-tag">{jdFile.name}</span>}
                  {jdParsing && <span className="file-parsing-tag">Extracting text...</span>}
                </div>
              </div>

              {/* ── Job Description ── */}
              <div className="form-group">
                <label className="form-label">Job Description</label>
                <textarea
                  name="JOB_DESCRIPTION"
                  className="form-textarea"
                  value={formData.JOB_DESCRIPTION}
                  onChange={handleChange}
                  rows="6"
                  placeholder="Enter job description or upload a file above to auto-fill..."
                />
              </div>

              {/* ── Extract Button ── */}
              <div className="form-group">
                <button
                  type="button"
                  className="btn-ai"
                  onClick={handleExtract}
                  disabled={extracting || !formData.JOB_DESCRIPTION.trim()}
                >
                  <Zap size={14} />
                  {extracting ? 'Analyzing...' : 'Analyze'}
                </button>
                {!formData.JOB_DESCRIPTION.trim() && (
                  <span className="extract-hint"></span>
                )}
              </div>
              {extracting ? <AiLoader mode="demand" /> : null}

              {/* ── AI Extraction ── */}
              <div className="form-group">
                <label className="form-label">AI Extraction</label>
                <textarea
                  name="AI_EXTRACTION"
                  className="form-textarea"
                  value={formData.AI_EXTRACTION}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Click Analyze to generate AI summary..."
                  style={{ background: '#f8fafc' }}
                />
              </div>

              {/* ── Profile Score Configuration ── */}
              <div className="dm-score-section">
                <h4 className="dm-score-title">Profile Score Configuration</h4>
                <div className="dm-score-grid">
                  <div className="form-group">
                    <label className="form-label">Skills Match %</label>
                    <input type="number" name="AI_SKILLS_MATCH" className="form-input" value={formData.AI_SKILLS_MATCH} onChange={handleChange} min="0" max="100" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Experience Alignment %</label>
                    <input type="number" name="AI_EXPERIENCE_ALIGNMENT" className="form-input" value={formData.AI_EXPERIENCE_ALIGNMENT} onChange={handleChange} min="0" max="100" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Culture & Soft Skill %</label>
                    <input type="number" name="AI_CULTURE_SOFT_SKILL" className="form-input" value={formData.AI_CULTURE_SOFT_SKILL} onChange={handleChange} min="0" max="100" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Growth Potential %</label>
                    <input type="number" name="AI_GROWTH_POTENTIAL" className="form-input" value={formData.AI_GROWTH_POTENTIAL} onChange={handleChange} min="0" max="100" />
                  </div>
                </div>
              </div>

              {/* ── Keywords ── */}
              <div className="form-group">
                <label className="form-label">Keywords</label>
                <textarea name="PROFILE_KEYWORDS" className="form-textarea" value={formData.PROFILE_KEYWORDS} onChange={handleChange} rows="2" placeholder="e.g. React, Node.js, Oracle..." />
              </div>

              {/* ── End Client + Resource Location ── */}
              <div className="dm-row">
                <div className="form-group">
                  <label className="form-label">End Client *</label>
                  <input
                    type="text" name="END_CLIENT_NAME"
                    className={`form-input ${errors.END_CLIENT_NAME ? 'input-error' : ''}`}
                    value={formData.END_CLIENT_NAME} onChange={handleChange}
                    placeholder="Enter end client name"
                  />
                  {errors.END_CLIENT_NAME && <span className="form-error">{errors.END_CLIENT_NAME}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Resource Location *</label>
                  <input
                    type="text" name="RESOURCE_LOCATION"
                    className={`form-input ${errors.RESOURCE_LOCATION ? 'input-error' : ''}`}
                    value={formData.RESOURCE_LOCATION} onChange={handleChange}
                    placeholder="Enter resource location"
                  />
                  {errors.RESOURCE_LOCATION && <span className="form-error">{errors.RESOURCE_LOCATION}</span>}
                </div>
              </div>

              {/* ── Standard Work Timing ── */}
              <div className="form-group" style={{ maxWidth: 220 }}>
                <label className="form-label">Standard Work Timing</label>
                <select name="STANDARD_TIME" className="form-select" value={formData.STANDARD_TIME} onChange={handleChange}>
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </div>

              {/* ── Additional Notes ── */}
              <div className="form-group">
                <label className="form-label">Additional Notes</label>
                <textarea name="COMMENTS" className="form-textarea" value={formData.COMMENTS} onChange={handleChange} rows="3" placeholder="Any additional notes..." />
              </div>

              {/* ── Decision + Assigned To ── */}
              <div className="dm-row">
                <div className="form-group">
                  <label className="form-label">Decision *</label>
                  <select
                    name="DES_STATUS_ID"
                    className={`form-select ${errors.DES_STATUS_ID ? 'input-error' : ''}`}
                    value={formData.DES_STATUS_ID} onChange={handleChange}
                  >
                    <option value="">Select Decision</option>
                    {desStatuses.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                  {errors.DES_STATUS_ID && <span className="form-error">{errors.DES_STATUS_ID}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Assigned To *</label>
                  <input
                    type="text" name="ASSIGNED_TO"
                    className={`form-input ${errors.ASSIGNED_TO ? 'input-error' : ''}`}
                    value={formData.ASSIGNED_TO} onChange={handleChange}
                    placeholder="Enter assignee name"
                  />
                  {errors.ASSIGNED_TO && <span className="form-error">{errors.ASSIGNED_TO}</span>}
                </div>
              </div>

              {/* ── Interview Questions Upload ── */}
              <div className="form-group">
                <label className="form-label">Interview Questions Upload</label>
                <div className="file-upload-wrap">
                  <label className="file-upload-btn">
                    <Upload size={14} />
                    {iqFile ? iqFile.name : 'Choose File'}
                    <input type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={(e) => setIqFile(e.target.files[0])} />
                  </label>
                  {iqFile && <span className="file-name-tag">{iqFile.name}</span>}
                </div>
              </div>

            </form>
          )}
        </div>

        {/* Footer */}
        {!lovLoading && (
          <div className="dm-footer">
            <button type="button" className="btn-secondary" onClick={handleClose}>Cancel</button>
            <button type="submit" form="add-demand-form" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Demand'}
            </button>
          </div>
        )}

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
          max-width: 780px;
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
        .dm-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 0; }
        .dm-score-section {
          border: 1px solid var(--ats-border); border-radius: 10px;
          padding: 16px; margin-bottom: 20px; background: var(--ats-bg-secondary);
        }
        .dm-score-title {
          font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 700;
          color: var(--ats-primary); margin: 0 0 14px 0;
          padding-bottom: 10px; border-bottom: 1px solid var(--ats-border);
        }
        .dm-score-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .dm-score-grid .form-group { margin-bottom: 0; }
        .file-upload-wrap { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .file-upload-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 16px; border-radius: 6px;
          border: 2px solid var(--ats-border); background: #ffffff;
          font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500;
          color: var(--ats-primary); cursor: pointer; transition: all 0.15s ease;
        }
        .file-upload-btn:hover { border-color: var(--ats-primary); background: var(--ats-bg-accent); }
        .file-name-tag {
          font-size: 12px; color: var(--ats-secondary);
          background: var(--ats-bg-accent); padding: 4px 8px; border-radius: 6px;
          max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .file-parsing-tag {
          font-size: 12px; color: #7c3aed;
          background: rgba(124,58,237,0.08); padding: 4px 10px; border-radius: 6px;
          font-weight: 500; animation: pulse 1s infinite;
        }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        .field-hint {
          font-size: 11px; color: var(--ats-secondary);
          margin: 6px 0 0; font-family: 'Inter', sans-serif;
        }
        .btn-extract {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 20px; font-family: 'Inter', sans-serif;
          font-size: 13px; font-weight: 600; color: #ffffff;
          background: linear-gradient(135deg, #7c3aed, #2563eb);
          border: none; border-radius: 8px; cursor: pointer; transition: all 0.2s ease;
        }
        .btn-extract:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(124,58,237,0.4);
        }
        .btn-extract:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
        .extract-hint {
          margin-left: 12px; font-size: 12px;
          color: var(--ats-secondary); font-family: 'Inter', sans-serif;
        }
        .input-error { border-color: var(--ats-error) !important; }
        .form-error { font-size: 11px; color: var(--ats-error, #ef4444); margin-top: 3px; display: block; }
        .loading-message {
          text-align: center; padding: 40px;
          color: var(--ats-secondary); font-size: 14px;
        }
        @keyframes dmFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dmSlideUp {
          from { opacity: 0; transform: translate(-50%, -45%); }
          to   { opacity: 1; transform: translate(-50%, -50%); }
        }
        @media (max-width: 768px) {
          .dm-modal { width: 100%; max-width: 100%; top: auto; bottom: 0; left: 0; transform: none; border-radius: 16px 16px 0 0; max-height: 95vh; }
          .dm-row, .dm-score-grid { grid-template-columns: 1fr; }
          .extract-hint { display: block; margin-left: 0; margin-top: 6px; }
        }
      `}</style>
    </>
  );
};

export default AddDemandModal;

