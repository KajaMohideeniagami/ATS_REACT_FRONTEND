import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import mammoth from 'mammoth';
import { Upload, X, Zap } from 'lucide-react';
import { API_BASE_URL, LOV_ENDPOINTS } from '../../../config/apiConfig';
import { extractJD, getDemandDetails, updateDemand, uploadDemandFiles } from '../../../services/demandService';
import { toast } from '../../Toast';

const api = axios.create({ baseURL: API_BASE_URL, timeout: 10000 });

const getLovData = async (path) => {
  try {
    const res = await api.get(path);
    return res.data?.items || res.data || [];
  } catch {
    return [];
  }
};

const loadPdfJs = () =>
  new Promise((resolve, reject) => {
    if (window.pdfjsLib) return resolve(window.pdfjsLib);
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });

const readAsArrayBuffer = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsArrayBuffer(file);
});

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result.split(',')[1]);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const extractPDF = async (file) => {
  const pdfjs = await loadPdfJs();
  const pdf = await pdfjs.getDocument({ data: await readAsArrayBuffer(file) }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => item.str).join(' ') + '\n\n';
  }
  return text.trim();
};

const extractDOCX = async (file) => {
  const result = await mammoth.convertToHtml({ arrayBuffer: await readAsArrayBuffer(file) });
  return result.value.replace(/<p>/g, '\n').replace(/<\/p>/g, '\n').replace(/<br>/g, '\n').replace(/<\/?[^>]+(>|$)/g, '').trim();
};

const toInputDate = (value) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}` : '';
};

const getFileDisplayName = (...values) => {
  const candidate = values.find((value) => value !== null && value !== undefined && String(value).trim() !== '');
  if (!candidate) return '';
  const text = String(candidate).trim();
  try {
    const lastSegment = decodeURIComponent(text.split('/').pop() || text);
    return lastSegment || text;
  } catch {
    return text.split('/').pop() || text;
  }
};

const initialForm = {
  LOCATION_TYPE: '', COUNTRY_ID: '', DEMAND_TYPE: '', WORK_MODE_ID: '', DEMAND_DATE: '', BILLABLE_DATE: '',
  JOB_ROLE: '', NO_OF_POSITION: '', DURATION_NO: '', SALARY_CURRENCY_ID: '', SALARY_RANGE_PA_MIN: '',
  SALARY_RANGE_PA_MAX: '', YEAR_OF_EXP_FROM: '', YEAR_OF_EXP_TO: '', JOB_DESCRIPTION: '', AI_EXTRACTION: '',
  AI_SKILLS_MATCH: '40', AI_EXPERIENCE_ALIGNMENT: '25', AI_CULTURE_SOFT_SKILL: '20', AI_GROWTH_POTENTIAL: '15',
  PROFILE_KEYWORDS: '', END_CLIENT_NAME: '', RESOURCE_LOCATION: '', STANDARD_TIME: '1', COMMENTS: '',
  DES_STATUS_ID: '', ASSIGNED_TO: '', NO_OF_LOST_POSITION: '0', STATUS_HOLD: false, STATUS_LOST: false,
};

const Field = ({ label, error, children }) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    {children}
    {error ? <span className="form-error">{error}</span> : null}
  </div>
);

const EditDemandModal = ({ isOpen, onClose, onSuccess, customerId, demandId }) => {
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [lovLoading, setLovLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [jdParsing, setJdParsing] = useState(false);
  const [jdFile, setJdFile] = useState(null);
  const [iqFile, setIqFile] = useState(null);
  const [existingJd, setExistingJd] = useState('');
  const [existingIq, setExistingIq] = useState('');
  const [locationTypes, setLocationTypes] = useState([]);
  const [jobTypes, setJobTypes] = useState([]);
  const [workModes, setWorkModes] = useState([]);
  const [desStatuses, setDesStatuses] = useState([]);
  const [countries, setCountries] = useState([]);
  const [currencies, setCurrencies] = useState([]);

  const resetForm = useCallback(() => {
    setFormData(initialForm);
    setErrors({});
    setJdFile(null);
    setIqFile(null);
    setExistingJd('');
    setExistingIq('');
  }, []);

  const handleClose = useCallback(() => { resetForm(); onClose(); }, [onClose, resetForm]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') handleClose(); };
    if (isOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleClose, isOpen]);

  useEffect(() => {
    if (!isOpen || !customerId || !demandId) return;
    let cancelled = false;
    (async () => {
      setLovLoading(true);
      try {
        const [details, lt, jt, wm, ds, cn, cu] = await Promise.all([
          getDemandDetails(customerId, demandId),
          getLovData(LOV_ENDPOINTS.DEMAND_TYPES),
          getLovData(LOV_ENDPOINTS.JOB_TYPES),
          getLovData(LOV_ENDPOINTS.WORK_MODES),
          getLovData(LOV_ENDPOINTS.DECISION_STATUSES),
          getLovData(LOV_ENDPOINTS.COUNTRIES),
          getLovData(LOV_ENDPOINTS.CURRENCIES),
        ]);
        if (cancelled) return;
        setLocationTypes(lt); setJobTypes(jt); setWorkModes(wm); setDesStatuses(ds); setCountries(cn); setCurrencies(cu);
        const demandStatus = String(
          details.demand_status
          || details.DEMAND_STATUS
          || ''
        ).toLowerCase();

        setFormData({
          LOCATION_TYPE: details.demand_type || '', COUNTRY_ID: String(details.country_id || ''), DEMAND_TYPE: String(details.job_type_id || ''),
          WORK_MODE_ID: String(details.work_mode_id || ''), DEMAND_DATE: toInputDate(details.demand_date), BILLABLE_DATE: toInputDate(details.billable_date),
          JOB_ROLE: details.job_role || '', NO_OF_POSITION: String(details.no_of_position ?? ''), DURATION_NO: String(details.duration_no ?? ''),
          SALARY_CURRENCY_ID: String(details.salary_currency_id || ''), SALARY_RANGE_PA_MIN: String(details.salary_range_pa_min ?? ''),
          SALARY_RANGE_PA_MAX: String(details.salary_range_pa_max ?? ''), YEAR_OF_EXP_FROM: String(details.year_of_exp_from ?? ''),
          YEAR_OF_EXP_TO: String(details.year_of_exp_to ?? ''), JOB_DESCRIPTION: details.job_description || '', AI_EXTRACTION: details.ai_jd_summary || '',
          AI_SKILLS_MATCH: String(details.ai_skills_match ?? '40'), AI_EXPERIENCE_ALIGNMENT: String(details.ai_experience_alignment ?? '25'),
          AI_CULTURE_SOFT_SKILL: String(details.ai_culture_soft_skill ?? '20'), AI_GROWTH_POTENTIAL: String(details.ai_growth_potential ?? '15'),
          PROFILE_KEYWORDS: details.profile_keywords || '', END_CLIENT_NAME: details.end_client_name || '', RESOURCE_LOCATION: details.resource_location || '',
          STANDARD_TIME: String(details.standard_time ?? '1'), COMMENTS: details.comments || '', DES_STATUS_ID: String(details.des_status_id || ''),
          ASSIGNED_TO: details.assigned_to || '', NO_OF_LOST_POSITION: String(details.no_of_lost_position ?? 0),
          STATUS_HOLD: demandStatus === 'hold',
          STATUS_LOST: demandStatus === 'lost',
        });
        setExistingJd(getFileDisplayName(
          details.jd_filename,
          details.JD_FILENAME,
          details.attached_job_description,
          details.jd_url,
          details.JD_URL,
        ));
        setExistingIq(getFileDisplayName(
          details.file_name,
          details.FILE_NAME,
          details.iq_filename,
          details.IQ_FILENAME,
          details.attached_interview_question,
          details.iq_url,
          details.IQ_URL,
        ));
      } catch {
        toast.error('Failed to load demand for editing.');
        handleClose();
      } finally {
        if (!cancelled) setLovLoading(false);
      }
    })();
    loadPdfJs().catch(() => {});
    return () => { cancelled = true; };
  }, [customerId, demandId, handleClose, isOpen]);

  const filteredJobTypes = useMemo(() => {
    const onsite = formData.LOCATION_TYPE === 'Onsite';
    return jobTypes.filter((jobType) => onsite ? jobType.condition_check === 'US' : jobType.condition_check !== 'US');
  }, [formData.LOCATION_TYPE, jobTypes]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      if (name === 'STATUS_HOLD') return { ...prev, STATUS_HOLD: checked, STATUS_LOST: checked ? false : prev.STATUS_LOST };
      if (name === 'STATUS_LOST') return { ...prev, STATUS_LOST: checked, STATUS_HOLD: checked ? false : prev.STATUS_HOLD };
      return { ...prev, [name]: type === 'checkbox' ? checked : value };
    });
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleJdFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext)) return toast.error('Unsupported file type. Please upload PDF or DOCX.');
    setJdFile(file);
    setJdParsing(true);
    try {
      const text = ext === 'pdf' ? await extractPDF(file) : ext === 'docx' ? await extractDOCX(file) : null;
      if (!text) return toast.error('DOC format not supported for extraction. Please use PDF or DOCX.');
      setFormData((prev) => ({ ...prev, JOB_DESCRIPTION: text }));
      toast.success('Job Description extracted from file!');
    } catch {
      toast.error('Failed to extract text from file.');
    } finally {
      setJdParsing(false);
    }
  };

  const handleExtract = async () => {
    if (!formData.JOB_DESCRIPTION.trim()) return toast.error('Please enter or upload a Job Description first.');
    setExtracting(true);
    try {
      const response = await extractJD(formData.JOB_DESCRIPTION);
      if (!response.success) return toast.error(response.message || 'Extraction failed.');
      setFormData((prev) => ({ ...prev, AI_EXTRACTION: response.extraction || response.message || '' }));
      toast.success('AI extraction completed!');
    } catch {
      toast.error('Failed to connect to AI service.');
    } finally {
      setExtracting(false);
    }
  };

  const validate = () => {
    const next = {};
    if (!formData.LOCATION_TYPE) next.LOCATION_TYPE = 'Location Type is required';
    if (!formData.COUNTRY_ID) next.COUNTRY_ID = 'Country is required';
    if (!formData.DEMAND_TYPE) next.DEMAND_TYPE = 'Demand Type is required';
    if (!formData.WORK_MODE_ID) next.WORK_MODE_ID = 'Work Mode is required';
    if (!formData.BILLABLE_DATE) next.BILLABLE_DATE = 'Billing Date is required';
    if (!formData.JOB_ROLE.trim()) next.JOB_ROLE = 'Role is required';
    if (!formData.NO_OF_POSITION) next.NO_OF_POSITION = 'No of Positions is required';
    if (!formData.SALARY_CURRENCY_ID) next.SALARY_CURRENCY_ID = 'Currency is required';
    if (!formData.DES_STATUS_ID) next.DES_STATUS_ID = 'Decision is required';
    if (!formData.ASSIGNED_TO.trim()) next.ASSIGNED_TO = 'Assigned To is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        demand_id: demandId,
        customer_id: customerId,
        demand_type: formData.LOCATION_TYPE,
        job_type_id: formData.DEMAND_TYPE || null,
        country_id: formData.COUNTRY_ID || null,
        work_mode_id: formData.WORK_MODE_ID || null,
        demand_date: formData.DEMAND_DATE || null,
        billable_date: formData.BILLABLE_DATE || null,
        job_role: formData.JOB_ROLE.trim(),
        no_of_position: formData.NO_OF_POSITION || null,
        duration_no: formData.DURATION_NO || null,
        duration_type: 'Years',
        salary_currency_id: formData.SALARY_CURRENCY_ID || null,
        salary_range_pa_min: formData.SALARY_RANGE_PA_MIN || null,
        salary_range_pa_max: formData.SALARY_RANGE_PA_MAX || null,
        year_of_exp_from: formData.YEAR_OF_EXP_FROM || null,
        year_of_exp_to: formData.YEAR_OF_EXP_TO || null,
        job_description: formData.JOB_DESCRIPTION || null,
        ai_jd_summary: formData.AI_EXTRACTION || null,
        ai_skills_match: formData.AI_SKILLS_MATCH || null,
        ai_experience_alignment: formData.AI_EXPERIENCE_ALIGNMENT || null,
        ai_culture_soft_skill: formData.AI_CULTURE_SOFT_SKILL || null,
        ai_growth_potential: formData.AI_GROWTH_POTENTIAL || null,
        profile_keywords: formData.PROFILE_KEYWORDS || null,
        end_client_name: formData.END_CLIENT_NAME || null,
        resource_location: formData.RESOURCE_LOCATION || null,
        standard_time: formData.STANDARD_TIME,
        comments: formData.COMMENTS || null,
        des_status_id: formData.DES_STATUS_ID || null,
        assigned_to: formData.ASSIGNED_TO.trim(),
        no_of_lost_position: formData.NO_OF_LOST_POSITION || 0,
        demand_status: formData.STATUS_LOST ? 'Lost' : formData.STATUS_HOLD ? 'Hold' : null,
      };
      const response = await updateDemand(payload);
      if (!response.success) return toast.error(response.message || 'Failed to update demand.');
      if (jdFile) await uploadDemandFiles({ demand_id: demandId, jd_file_name: jdFile.name, jd_mime_type: jdFile.type || 'application/octet-stream', jd_file_base64: await fileToBase64(jdFile), job_description: formData.JOB_DESCRIPTION || null }).catch(() => toast.error('Demand updated but JD upload failed.'));
      if (iqFile) await uploadDemandFiles({ demand_id: demandId, iq_file_name: iqFile.name, iq_mime_type: iqFile.type || 'application/octet-stream', iq_file_base64: await fileToBase64(iqFile) }).catch(() => toast.error('Demand updated but interview question upload failed.'));
      toast.success('Demand updated successfully!');
      handleClose();
      onSuccess?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update demand.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="edm-backdrop" onClick={handleClose} />
      <div className="edm-modal" role="dialog" aria-modal="true" aria-labelledby="edit-demand-title">
        <div className="edm-header">
          <h2 className="ats-heading-2" id="edit-demand-title">Edit Demand Request</h2>
          <button type="button" className="edm-close" onClick={handleClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="edm-body">
          {lovLoading ? <div className="loading-message">Loading demand details...</div> : (
            <form id="edit-demand-form" onSubmit={handleSubmit}>
              <div className="edm-row">
                <Field label="Location Type *" error={errors.LOCATION_TYPE}><select name="LOCATION_TYPE" className={`form-select ${errors.LOCATION_TYPE ? 'input-error' : ''}`} value={formData.LOCATION_TYPE} onChange={handleChange}><option value="">Select Location Type</option>{locationTypes.map((item) => <option key={item.value} value={item.label || item.value}>{item.label}</option>)}</select></Field>
                <Field label="Country *" error={errors.COUNTRY_ID}><select name="COUNTRY_ID" className={`form-select ${errors.COUNTRY_ID ? 'input-error' : ''}`} value={formData.COUNTRY_ID} onChange={handleChange}><option value="">Select Country</option>{countries.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
              </div>
              <div className="edm-row">
                <Field label="Demand Type *" error={errors.DEMAND_TYPE}><select name="DEMAND_TYPE" className={`form-select ${errors.DEMAND_TYPE ? 'input-error' : ''}`} value={formData.DEMAND_TYPE} onChange={handleChange}><option value="">Select Demand Type</option>{filteredJobTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
                <Field label="Work Mode *" error={errors.WORK_MODE_ID}><select name="WORK_MODE_ID" className={`form-select ${errors.WORK_MODE_ID ? 'input-error' : ''}`} value={formData.WORK_MODE_ID} onChange={handleChange}><option value="">Select Work Mode</option>{workModes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
              </div>
              <div className="edm-row">
                <Field label="Demand Date *"><input type="date" name="DEMAND_DATE" className="form-input" value={formData.DEMAND_DATE} onChange={handleChange} /></Field>
                <Field label="Billing Date *" error={errors.BILLABLE_DATE}><input type="date" name="BILLABLE_DATE" className={`form-input ${errors.BILLABLE_DATE ? 'input-error' : ''}`} value={formData.BILLABLE_DATE} onChange={handleChange} /></Field>
              </div>
              <div className="edm-row">
                <Field label="Role *" error={errors.JOB_ROLE}><input type="text" name="JOB_ROLE" className={`form-input ${errors.JOB_ROLE ? 'input-error' : ''}`} value={formData.JOB_ROLE} onChange={handleChange} /></Field>
                <Field label="No Of Position *" error={errors.NO_OF_POSITION}><input type="number" name="NO_OF_POSITION" className={`form-input ${errors.NO_OF_POSITION ? 'input-error' : ''}`} value={formData.NO_OF_POSITION} onChange={handleChange} min="1" /></Field>
              </div>
              <div className="edm-row">
                <Field label="Duration (Years)"><input type="number" name="DURATION_NO" className="form-input" value={formData.DURATION_NO} onChange={handleChange} min="0" /></Field>
                <Field label="Currency *" error={errors.SALARY_CURRENCY_ID}><select name="SALARY_CURRENCY_ID" className={`form-select ${errors.SALARY_CURRENCY_ID ? 'input-error' : ''}`} value={formData.SALARY_CURRENCY_ID} onChange={handleChange}><option value="">Select Currency</option>{currencies.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
              </div>
              <div className="edm-row">
                <Field label="Salary Min *"><input type="number" name="SALARY_RANGE_PA_MIN" className="form-input" value={formData.SALARY_RANGE_PA_MIN} onChange={handleChange} min="0" /></Field>
                <Field label="Salary Max *"><input type="number" name="SALARY_RANGE_PA_MAX" className="form-input" value={formData.SALARY_RANGE_PA_MAX} onChange={handleChange} min="0" /></Field>
              </div>
              <div className="edm-row">
                <Field label="Year Of Exp (From) *"><input type="number" name="YEAR_OF_EXP_FROM" className="form-input" value={formData.YEAR_OF_EXP_FROM} onChange={handleChange} min="0" /></Field>
                <Field label="Year Of Exp (To) *"><input type="number" name="YEAR_OF_EXP_TO" className="form-input" value={formData.YEAR_OF_EXP_TO} onChange={handleChange} min="0" /></Field>
              </div>
              <Field label="Job Description"><textarea name="JOB_DESCRIPTION" className="form-textarea" value={formData.JOB_DESCRIPTION} onChange={handleChange} rows="5" /></Field>
              <div className="edm-row">
                <Field label="Job Description Upload">
                  <div className="file-upload-wrap">
                    <label className="file-upload-btn">
                      <Upload size={14} />
                      {jdFile ? jdFile.name : 'Choose File'}
                      <input type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={handleJdFileChange} />
                    </label>
                    {jdParsing ? <span className="file-parsing-tag">Extracting text...</span> : null}
                  </div>
                </Field>
                <Field label="Attached Job Description"><input className="form-input edm-readonly-file" readOnly value={existingJd || ''} /></Field>
              </div>
              <div className="form-group"><button type="button" className="btn-extract" onClick={handleExtract} disabled={extracting || !formData.JOB_DESCRIPTION.trim()}><Zap size={14} />{extracting ? 'Extracting...' : 'Extract'}</button></div>
              <Field label="AI Extraction"><textarea name="AI_EXTRACTION" className="form-textarea" value={formData.AI_EXTRACTION} onChange={handleChange} rows="4" /></Field>
              <div className="edm-score-section">
                <h4 className="edm-score-title">Profile Score Configuration</h4>
                <div className="edm-score-grid">
                  <Field label="Skills Match %"><input type="number" name="AI_SKILLS_MATCH" className="form-input" value={formData.AI_SKILLS_MATCH} onChange={handleChange} min="0" max="100" /></Field>
                  <Field label="Experience Alignment %"><input type="number" name="AI_EXPERIENCE_ALIGNMENT" className="form-input" value={formData.AI_EXPERIENCE_ALIGNMENT} onChange={handleChange} min="0" max="100" /></Field>
                  <Field label="Culture & Soft Skill %"><input type="number" name="AI_CULTURE_SOFT_SKILL" className="form-input" value={formData.AI_CULTURE_SOFT_SKILL} onChange={handleChange} min="0" max="100" /></Field>
                  <Field label="Growth Potential %"><input type="number" name="AI_GROWTH_POTENTIAL" className="form-input" value={formData.AI_GROWTH_POTENTIAL} onChange={handleChange} min="0" max="100" /></Field>
                </div>
              </div>
              <Field label="Keywords"><textarea name="PROFILE_KEYWORDS" className="form-textarea" value={formData.PROFILE_KEYWORDS} onChange={handleChange} rows="3" /></Field>
              <div className="edm-row">
                <Field label="End Client"><input type="text" name="END_CLIENT_NAME" className="form-input" value={formData.END_CLIENT_NAME} onChange={handleChange} /></Field>
                <Field label="Resource Location"><input type="text" name="RESOURCE_LOCATION" className="form-input" value={formData.RESOURCE_LOCATION} onChange={handleChange} /></Field>
              </div>
              <Field label="Standard Work Timing"><select name="STANDARD_TIME" className="form-select" value={formData.STANDARD_TIME} onChange={handleChange}><option value="1">Yes</option><option value="0">No</option></select></Field>
              <Field label="Additional Notes"><textarea name="COMMENTS" className="form-textarea" value={formData.COMMENTS} onChange={handleChange} rows="4" /></Field>
              <Field label="Decision *" error={errors.DES_STATUS_ID}><select name="DES_STATUS_ID" className={`form-select ${errors.DES_STATUS_ID ? 'input-error' : ''}`} value={formData.DES_STATUS_ID} onChange={handleChange}><option value="">Select Decision</option>{desStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
              <div className="edm-status-row">
                <label className="edm-checkbox"><input type="checkbox" name="STATUS_HOLD" checked={formData.STATUS_HOLD} onChange={handleChange} /><span>Status-Hold</span></label>
                <label className="edm-checkbox"><input type="checkbox" name="STATUS_LOST" checked={formData.STATUS_LOST} onChange={handleChange} /><span>Status - Lost</span></label>
              </div>
              <div className="edm-row">
                <Field label="No Of Lost Position"><input type="number" name="NO_OF_LOST_POSITION" className="form-input" value={formData.NO_OF_LOST_POSITION} onChange={handleChange} min="0" /></Field>
                <div />
              </div>
              <div className="edm-row">
                <Field label="Interview Question Upload">
                  <div className="file-upload-wrap">
                    <label className="file-upload-btn">
                      <Upload size={14} />
                      {iqFile ? iqFile.name : 'Choose File'}
                      <input type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={(e) => setIqFile(e.target.files[0])} />
                    </label>
                  </div>
                </Field>
                <Field label="Attached Interview Question"><input className="form-input edm-readonly-file" readOnly value={existingIq || ''} /></Field>
              </div>
              <Field label="Assigned To *" error={errors.ASSIGNED_TO}><input type="text" name="ASSIGNED_TO" className={`form-input ${errors.ASSIGNED_TO ? 'input-error' : ''}`} value={formData.ASSIGNED_TO} onChange={handleChange} /></Field>
            </form>
          )}
        </div>
        {!lovLoading ? (
          <div className="edm-footer">
            <button type="button" className="btn-secondary" onClick={handleClose}>Cancel</button>
            <button type="submit" form="edit-demand-form" className="btn-primary" disabled={loading}>{loading ? 'Updating...' : 'Update'}</button>
          </div>
        ) : null}
      </div>

      <style>{`
        .edm-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 1000; }
        .edm-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1001; width: min(900px, calc(100vw - 24px)); max-height: 90vh; background: #fff; border-radius: 16px; box-shadow: 0 24px 64px rgba(0,0,0,0.2); display: flex; flex-direction: column; overflow: hidden; }
        .edm-header, .edm-footer { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 16px; border-bottom: 1px solid var(--ats-border); flex-shrink: 0; }
        .edm-footer { border-bottom: none; border-top: 1px solid var(--ats-border); justify-content: flex-end; gap: 12px; padding: 16px 24px 20px; }
        .edm-close { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: none; border: none; border-radius: 8px; color: var(--ats-secondary); cursor: pointer; }
        .edm-close:hover { background: var(--ats-bg-accent); color: var(--ats-primary); }
        .edm-body { padding: 20px 24px; overflow-y: auto; flex: 1; }
        .form-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px; }
        .form-label { font-size: 14px; font-weight: 600; color: var(--ats-neutral); }
        .form-input, .form-select, .form-textarea {
          width: 100%;
          min-height: 44px;
          border: 1px solid var(--ats-border);
          border-radius: 10px;
          background: #fff;
          color: var(--ats-primary);
          padding: 10px 14px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          box-sizing: border-box;
        }
        .form-textarea { min-height: 120px; resize: vertical; }
        .form-input:focus, .form-select:focus, .form-textarea:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }
        .input-error { border-color: #dc2626 !important; box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.08); }
        .form-error { font-size: 12px; color: #dc2626; }
        .file-upload-wrap { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .file-upload-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 42px;
          padding: 10px 14px;
          border: 1px solid var(--ats-border);
          border-radius: 10px;
          background: #f8fafc;
          color: var(--ats-primary);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
        }
        .file-upload-btn:hover { background: #eff6ff; border-color: #93c5fd; color: #1d4ed8; }
        .file-parsing-tag {
          display: inline-flex;
          align-items: center;
          min-height: 28px;
          padding: 4px 10px;
          border-radius: 999px;
          background: #dbeafe;
          color: #1d4ed8;
          font-size: 12px;
          font-weight: 600;
        }
        .btn-primary, .btn-secondary, .btn-extract {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 44px;
          padding: 10px 18px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          border: 1px solid transparent;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease;
        }
        .btn-primary {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: #fff;
          box-shadow: 0 10px 20px rgba(37, 99, 235, 0.18);
        }
        .btn-primary:hover:not(:disabled), .btn-extract:hover:not(:disabled) { transform: translateY(-1px); }
        .btn-primary:disabled, .btn-secondary:disabled, .btn-extract:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        .btn-secondary {
          background: #fff;
          border-color: var(--ats-border);
          color: var(--ats-neutral);
        }
        .btn-secondary:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; }
        .btn-extract {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: #fff;
          box-shadow: 0 10px 20px rgba(37, 99, 235, 0.16);
        }
        .edm-row, .edm-score-grid, .edm-status-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .edm-score-section { border: 1px solid var(--ats-border); border-radius: 12px; background: var(--ats-bg-secondary); padding: 16px; margin-bottom: 24px; }
        .edm-score-title { margin: 0 0 16px; font-size: 14px; font-weight: 700; color: var(--ats-primary); }
        .edm-status-row { margin-bottom: 18px; }
        .edm-checkbox { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; color: var(--ats-neutral); }
        .edm-checkbox input { width: 16px; height: 16px; accent-color: #2563eb; }
        .edm-readonly-file { background: #f8fafc; color: var(--ats-neutral); cursor: default; }
        @media (max-width: 768px) { .edm-modal { width: 100%; max-width: 100%; top: auto; bottom: 0; left: 0; transform: none; border-radius: 16px 16px 0 0; max-height: 95vh; } .edm-row, .edm-score-grid, .edm-status-row { grid-template-columns: 1fr; } }
      `}</style>
    </>
  );
};

export default EditDemandModal;
