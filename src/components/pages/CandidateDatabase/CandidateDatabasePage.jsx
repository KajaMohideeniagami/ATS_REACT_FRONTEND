import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpFromLine,
  ChevronDown,
  ChevronUp,
  Database,
  Download,
  RefreshCw,
  Search,
  Upload,
  X,
} from 'lucide-react';
import Loader from '../../common/Loader';
import AddProfileModal from '../Customer/AddProfileModal';
import { toast } from '../../../components/toast/index';
import { getCurrentAuditUser } from '../../../services/authService';
import {
  getCandidateDatabaseRows,
  searchCandidateDatabaseRows,
} from '../../../services/candidateDatabaseService';
import { getProfileDownloadUrl } from '../../../services/profileDownloadService';
import {
  getProfileMergeCustomers,
  getProfileMergeDemands,
  getProfileMergeDownloadUrl,
  getUploadedProfileMergeRows,
  uploadProfileToMergeBucket,
} from '../../../services/profileMergeService';

const PAGE_SIZE = 15;
const SEARCH_STORAGE_KEY = 'candidateDatabase.searchTerm';
const PAGE_STORAGE_KEY = 'candidateDatabase.page';
const EXPANDED_PROFILE_STORAGE_KEY = 'candidateDatabase.expandedProfileId';
const TAB_STORAGE_KEY = 'candidateDatabase.activeTab';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-US');
};

const displayText = (value, fallback = '-') => {
  if (value === 0 || value === '0') return '0';
  const text = String(value ?? '').trim();
  return text || fallback;
};

const formatSalaryDisplay = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw || raw === '-') return '-';

  const numeric = raw.replace(/[^\d.]+/g, '');
  if (!numeric) return raw;

  const [whole, decimal] = numeric.split('.');
  const formattedWhole = Number(whole || 0).toLocaleString('en-IN');
  return `${/inr/i.test(raw) ? 'INR ' : ''}${decimal ? `${formattedWhole}.${decimal}` : formattedWhole}`.trim();
};

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const EllipsisText = ({ value, className = '' }) => {
  const text = displayText(value);
  return (
    <span className={`candidate-ellipsis-text${className ? ` ${className}` : ''}`} title={text}>
      {text}
    </span>
  );
};

const SourcePill = ({ source }) => (
  <span className={`profile-merge-source-pill ${String(source).toLowerCase() === 'ats' ? 'ats' : 'uploaded'}`}>
    {displayText(source)}
  </span>
);

const getMatchScoreState = (value) => {
  const text = String(value ?? '').trim();
  const numeric = Number.parseFloat(text.replace(/[^\d.]+/g, ''));
  if (Number.isNaN(numeric)) return 'neutral';
  if (numeric >= 80) return 'good';
  if (numeric >= 60) return 'medium';
  return 'low';
};

const getAvailabilityState = (value) => {
  const text = String(value ?? '').toLowerCase();
  if (text.includes('immediate')) return 'good';
  if (text.includes('serving')) return 'medium';
  return 'neutral';
};

const getDemandStatusState = (value) => {
  const text = String(value ?? '').toLowerCase();
  if (text.includes('open')) return 'good';
  if (text.includes('closed')) return 'muted';
  return 'neutral';
};

const getStoredValue = (key, fallback = '') => {
  if (typeof window === 'undefined') return fallback;
  return window.sessionStorage.getItem(key) ?? fallback;
};

const filterUploadedRows = (rows, keyword) => {
  const query = String(keyword ?? '').trim().toLowerCase();
  if (!query) return rows;

  return rows.filter((row) =>
    [
      row?.profile_name,
      row?.file_name,
      row?.source,
      row?.profile_email,
      row?.current_company,
      row?.current_location,
    ]
      .map((value) => String(value ?? '').toLowerCase())
      .join(' ')
      .includes(query)
  );
};

const MergeModal = ({
  open,
  profile,
  customers,
  demands,
  loadingDemands,
  merging,
  selectedCustomer,
  selectedDemand,
  onClose,
  onCustomerChange,
  onDemandChange,
  onMerge,
}) => {
  if (!open || !profile) return null;

  return (
    <>
      <div className="profile-merge-modal-backdrop" onClick={onClose} />
      <div className="profile-merge-modal" role="dialog" aria-modal="true" aria-labelledby="candidate-database-merge-title">
        <div className="profile-merge-modal-header">
          <div>
            <h2 className="ats-heading-2" id="candidate-database-merge-title">Merge Profile to Demand</h2>
            <p className="ats-body-small">
              {displayText(profile.profile_name)} · {displayText(profile.source)}
            </p>
          </div>
          <button type="button" className="profile-merge-modal-close" onClick={onClose} aria-label="Close merge dialog">
            <X size={18} />
          </button>
        </div>

        <div className="profile-merge-modal-body">
          <div className="profile-merge-summary-grid">
            <div className="profile-merge-summary-item">
              <span>Profile Name</span>
              <strong title={displayText(profile.profile_name)}>{displayText(profile.profile_name)}</strong>
            </div>
            <div className="profile-merge-summary-item">
              <span>Source</span>
              <strong>{displayText(profile.source)}</strong>
            </div>
          </div>

          <div className="profile-merge-form-grid">
            <div className="form-group">
              <label className="form-label">Customer</label>
              <select className="form-select" value={selectedCustomer} onChange={(event) => onCustomerChange(event.target.value)}>
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.value} value={customer.value}>
                    {customer.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Demand</label>
              <select
                className="form-select"
                value={selectedDemand}
                onChange={(event) => onDemandChange(event.target.value)}
                disabled={!selectedCustomer || loadingDemands}
              >
                <option value="">{loadingDemands ? 'Loading demands...' : 'Select demand'}</option>
                {demands.map((demand) => (
                  <option key={demand.value} value={demand.value}>
                    {demand.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="profile-merge-modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={merging}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={onMerge} disabled={merging || !selectedCustomer || !selectedDemand}>
            <ArrowUpFromLine size={15} />
            {merging ? 'Preparing...' : 'Merge Profile'}
          </button>
        </div>
      </div>
    </>
  );
};

const CandidateDatabasePage = () => {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [loadingDemands, setLoadingDemands] = useState(false);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState('');
  const [candidateRows, setCandidateRows] = useState([]);
  const [uploadedRows, setUploadedRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [demands, setDemands] = useState([]);
  const [searchTerm, setSearchTerm] = useState(() => getStoredValue(SEARCH_STORAGE_KEY));
  const [page, setPage] = useState(() => Number(getStoredValue(PAGE_STORAGE_KEY, '1')) || 1);
  const [uploadedPage, setUploadedPage] = useState(1);
  const [expandedProfileId, setExpandedProfileId] = useState(() => getStoredValue(EXPANDED_PROFILE_STORAGE_KEY));
  const [activeTab, setActiveTab] = useState(() => getStoredValue(TAB_STORAGE_KEY, 'candidate') || 'candidate');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedDemand, setSelectedDemand] = useState('');
  const [mergeProfileDraft, setMergeProfileDraft] = useState(null);

  const loadRows = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [candidateData, uploadedData, customerRows] = await Promise.all([
        getCandidateDatabaseRows(),
        getUploadedProfileMergeRows(),
        getProfileMergeCustomers(),
      ]);

      setCandidateRows(Array.isArray(candidateData) ? candidateData : []);
      setUploadedRows(Array.isArray(uploadedData) ? uploadedData : []);
      setCustomers(Array.isArray(customerRows) ? customerRows : []);
    } catch (loadError) {
      console.error('Candidate database load error:', loadError);
      setError('Failed to load candidate profiles.');
      toast.error('Failed to load candidate profiles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setPage(1);
    setUploadedPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(SEARCH_STORAGE_KEY, searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(PAGE_STORAGE_KEY, String(page));
  }, [page]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (expandedProfileId) {
      window.sessionStorage.setItem(EXPANDED_PROFILE_STORAGE_KEY, String(expandedProfileId));
    } else {
      window.sessionStorage.removeItem(EXPANDED_PROFILE_STORAGE_KEY);
    }
  }, [expandedProfileId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  const filteredCandidateRows = useMemo(
    () => searchCandidateDatabaseRows(candidateRows, searchTerm),
    [candidateRows, searchTerm]
  );

  const filteredUploadedRows = useMemo(
    () => filterUploadedRows(uploadedRows, searchTerm),
    [uploadedRows, searchTerm]
  );

  const totalPages = Math.max(1, Math.ceil(filteredCandidateRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = filteredCandidateRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const startRow = filteredCandidateRows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(currentPage * PAGE_SIZE, filteredCandidateRows.length);

  const uploadedTotalPages = Math.max(1, Math.ceil(filteredUploadedRows.length / PAGE_SIZE));
  const currentUploadedPage = Math.min(uploadedPage, uploadedTotalPages);
  const pagedUploadedRows = filteredUploadedRows.slice(
    (currentUploadedPage - 1) * PAGE_SIZE,
    currentUploadedPage * PAGE_SIZE
  );

  useEffect(() => {
    if (pagedRows.length === 0) {
      setExpandedProfileId('');
      return;
    }

    const expandedStillVisible = pagedRows.some((row) => String(row.profile_id) === String(expandedProfileId));
    if (!expandedStillVisible && expandedProfileId) {
      setExpandedProfileId('');
    }
  }, [pagedRows, expandedProfileId]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(extension || '')) {
      toast.error('Only PDF, DOC, and DOCX files are allowed.');
      return;
    }

    try {
      setUploading(true);
      const auditUser = getCurrentAuditUser();
      const fileBase64 = await fileToBase64(file);

      const response = await uploadProfileToMergeBucket({
        file_name: file.name,
        file_mime_type: file.type || 'application/octet-stream',
        file_base64: fileBase64,
        folder_name: 'InterviewQuestions',
        uploaded_by: auditUser || null,
        UPLOADED_BY: auditUser || null,
      });

      if (!response?.success) {
        throw new Error(response?.message || 'Profile upload failed.');
      }

      toast.success('Profile uploaded successfully.');
      await loadRows();
    } catch (uploadError) {
      toast.error(uploadError?.response?.data?.message || uploadError?.message || 'Profile upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (profile, sourceType = 'ATS') => {
    try {
      if (String(sourceType).toUpperCase() === 'ATS') {
        const response = await getProfileDownloadUrl(profile.profile_id);
        if (!response?.success || !response?.download_url) {
          throw new Error(response?.message || 'Profile download is not available.');
        }
        window.open(response.download_url, '_blank', 'noopener,noreferrer');
        return;
      }

      const response = await getProfileMergeDownloadUrl({
        upload_id: profile?.upload_id || profile?.raw?.upload_id || profile?.raw?.UPLOAD_ID || profile?.id || null,
        file_name: profile?.file_name || null,
        object_name: profile?.raw?.object_name || profile?.raw?.OBJECT_NAME || profile?.file_name || null,
        profile_url: profile?.profile_url || null,
      });

      if (!response?.success || !response?.download_url) {
        throw new Error(response?.message || 'Profile download is not available.');
      }

      window.open(response.download_url, '_blank', 'noopener,noreferrer');
    } catch (downloadError) {
      toast.error(downloadError?.response?.data?.message || downloadError?.message || 'Failed to download profile.');
    }
  };

  const resetSearch = () => {
    setSearchTerm('');
    setPage(1);
    setUploadedPage(1);
  };

  const toggleExpanded = (profileId) => {
    setExpandedProfileId((current) => (String(current) === String(profileId) ? '' : String(profileId)));
  };

  const openMergeModal = (profile) => {
    setSelectedProfile(profile);
    setSelectedCustomer('');
    setSelectedDemand('');
    setDemands([]);
  };

  const closeMergeModal = () => {
    setSelectedProfile(null);
    setSelectedCustomer('');
    setSelectedDemand('');
    setDemands([]);
  };

  const handleCustomerChange = async (customerId) => {
    setSelectedCustomer(customerId);
    setSelectedDemand('');
    setDemands([]);

    if (!customerId) return;

    try {
      setLoadingDemands(true);
      const demandRows = await getProfileMergeDemands(customerId);
      setDemands(Array.isArray(demandRows) ? demandRows : []);
    } catch (demandError) {
      console.error('Demand load error:', demandError);
      toast.error('Failed to load demands for the selected customer.');
    } finally {
      setLoadingDemands(false);
    }
  };

  const openAddProfileFromMerge = useCallback(async (profile, customerId, demandId, demandRows) => {
    const sourceType = String(profile?.source_type).toUpperCase();

    let downloadUrl = '';
    if (sourceType === 'ATS' && profile?.profile_id) {
      const response = await getProfileDownloadUrl(profile.profile_id);
      if (!response?.success || !response?.download_url) {
        throw new Error(response?.message || 'ATS profile could not be prepared for Add Profile.');
      }
      downloadUrl = response.download_url;
    } else if (sourceType === 'UPLOADED') {
      const response = await getProfileMergeDownloadUrl({
        upload_id: profile?.upload_id || profile?.raw?.upload_id || profile?.raw?.UPLOAD_ID || profile?.id || null,
        file_name: profile?.file_name || null,
        object_name: profile?.raw?.object_name || profile?.raw?.OBJECT_NAME || profile?.file_name || null,
        profile_url: profile?.profile_url || null,
      });
      if (!response?.success || !response?.download_url) {
        throw new Error(response?.message || 'Uploaded profile could not be prepared for Add Profile.');
      }
      downloadUrl = response.download_url;
    } else {
      throw new Error('Profile source is not supported for merge.');
    }

    const fileResponse = await fetch(downloadUrl);
    if (!fileResponse.ok) {
      throw new Error('Failed to load profile file.');
    }

    const fileBlob = await fileResponse.blob();
    const fileName = profile?.file_name || profile?.profile_name || 'profile';
    const fileMimeType =
      fileBlob.type ||
      profile?.raw?.mime_type ||
      profile?.raw?.MIME_TYPE ||
      'application/octet-stream';
    const hydratedFile = new File([fileBlob], fileName, {
      type: fileMimeType,
      lastModified: Date.now(),
    });

    const prefillProfileData =
      sourceType === 'ATS'
        ? {
            id: profile?.id || profile?.profile_id || fileName,
            source_type: profile?.source_type || 'ATS',
            file_name: profile?.file_name || fileName,
            profile_url: profile?.profile_url || '',
            notes: 'Profile initiated from Candidate Database ATS merge flow.',
          }
        : profile;

    setMergeProfileDraft({
      customerId: String(customerId),
      demandId: String(demandId),
      demands: demandRows,
      profile: prefillProfileData,
      file: hydratedFile,
    });
    closeMergeModal();
  }, []);

  const handleMerge = async () => {
    if (!selectedProfile || !selectedCustomer || !selectedDemand) {
      toast.error('Please select both customer and demand.');
      return;
    }

    try {
      setMerging(true);
      const demandRows = Array.isArray(demands) ? demands.map((demand) => demand?.raw || demand) : [];
      await openAddProfileFromMerge(selectedProfile, selectedCustomer, selectedDemand, demandRows);
    } catch (mergeError) {
      toast.error(mergeError?.response?.data?.message || mergeError?.message || 'Profile merge failed.');
    } finally {
      setMerging(false);
    }
  };

  if (loading) {
    return (
      <div className="candidate-database-page">
        <Loader message="Loading candidate database..." />
      </div>
    );
  }

  return (
    <div className="candidate-database-page">
      <div className="candidate-database-shell candidate-database-shell-wide">
        <div className="candidate-database-header">
          <div className="header-title-wrapper">
            <Database className="header-icon" size={36} strokeWidth={1.5} />
            <div>
              <h1 className="ats-heading-1">Candidate Database</h1>
            </div>
          </div>
        </div>

        <div className="candidate-database-panel candidate-grid-workspace">
          <div className="candidate-database-toolbar candidate-database-toolbar-sticky">
            <div className="candidate-database-search candidate-database-search-full">
              <Search size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by candidate, location, availability, salary, job role, demand code, customer..."
                aria-label="Search candidate database"
              />
            </div>

            <div className="candidate-database-toolbar-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="profile-merge-file-input"
                onChange={handleFileChange}
              />
              <button type="button" className="btn-primary" onClick={handleUploadClick} disabled={uploading}>
                <Upload size={15} />
                {uploading ? 'Uploading...' : 'Upload Profile'}
              </button>
              <button type="button" className="btn-secondary" onClick={loadRows}>
                <RefreshCw size={15} />
                Refresh
              </button>
              <button type="button" className="btn-secondary" onClick={resetSearch}>
                Clear Search
              </button>
            </div>
          </div>

          <div className="candidate-database-meta">
            <span>
              {activeTab === 'candidate' ? (
                <>
                  Showing <strong>{startRow}-{endRow}</strong> of <strong>{filteredCandidateRows.length}</strong> candidates
                </>
              ) : (
                <>
                  Showing <strong>{filteredUploadedRows.length}</strong> uploaded profiles
                </>
              )}
            </span>
          </div>

          <div className="candidate-database-tabs" role="tablist" aria-label="Candidate database views">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'candidate'}
              className={`candidate-database-tab ${activeTab === 'candidate' ? 'active' : ''}`}
              onClick={() => setActiveTab('candidate')}
            >
              Candidate Database
              <span className="candidate-database-tab-count">{filteredCandidateRows.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'uploaded'}
              className={`candidate-database-tab ${activeTab === 'uploaded' ? 'active' : ''}`}
              onClick={() => setActiveTab('uploaded')}
            >
              Uploaded Profiles
              <span className="candidate-database-tab-count">{filteredUploadedRows.length}</span>
            </button>
          </div>

          {error ? <div className="error-message">{error}</div> : null}

          {activeTab === 'candidate' ? (
            <>
              {pagedRows.length === 0 ? (
                <div className="candidate-database-empty">
                  No candidate profiles matched this search.
                </div>
              ) : (
                <div className="candidate-unified-table-wrap">
                  <table className="candidate-unified-table">
                    <thead>
                      <tr>
                        <th aria-label="Expand row" />
                        <th>Candidate Name</th>
                        <th>Customer</th>
                        <th>Experience</th>
                        <th>Linked Demands</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedRows.map((candidate) => {
                        const isExpanded = String(expandedProfileId) === String(candidate.profile_id);

                        return (
                          <React.Fragment key={candidate.profile_id}>
                            <tr
                              className={`candidate-unified-row ${isExpanded ? 'is-expanded' : ''}`}
                              onClick={() => toggleExpanded(candidate.profile_id)}
                            >
                              <td className="candidate-expand-cell">
                                <button
                                  type="button"
                                  className="candidate-expand-trigger"
                                  aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    toggleExpanded(candidate.profile_id);
                                  }}
                                >
                                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                              </td>
                              <td>
                                <div className="candidate-row-primary">
                                  <strong>{displayText(candidate.profile_name)}</strong>
                                  <span title={displayText(candidate.profile_code)}>{displayText(candidate.profile_code)}</span>
                                </div>
                              </td>
                              <td><EllipsisText value={candidate.customer_name} /></td>
                              <td>{displayText(candidate.work_exp_in_years)}</td>
                              <td>{displayText(candidate.linked_demand_count || 1)}</td>
                              <td>
                                <div className="profile-merge-action-cell">
                                  <button
                                    type="button"
                                    className="btn-secondary btn-table-action"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleDownload(candidate, 'ATS');
                                    }}
                                  >
                                    <Download size={14} />
                                    Download
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-secondary btn-table-action"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      openMergeModal({ ...candidate, source: 'ATS', source_type: 'ATS' });
                                    }}
                                  >
                                    <ArrowUpFromLine size={14} />
                                    Merge
                                  </button>
                                </div>
                              </td>
                            </tr>

                            <tr className={`candidate-expanded-row ${isExpanded ? 'is-open' : ''}`}>
                              <td colSpan="6" className="candidate-expanded-cell">
                                <div className="candidate-expanded-content">
                                  <div className="candidate-inline-group">
                                    <div className="candidate-inline-group-title">Candidate Details</div>
                                    <div className="candidate-demand-inline-table-wrap">
                                      <table className="candidate-detail-inline-table candidate-detail-inline-table-single-row">
                                        <thead>
                                          <tr>
                                            <th>Candidate Name</th>
                                            <th>Profile Code</th>
                                            <th>Current Company</th>
                                            <th>Current Location</th>
                                            <th>Preferred Location</th>
                                            <th>Customer</th>
                                            <th>Vendor</th>
                                            <th>Profile Status</th>
                                            <th>Total Experience</th>
                                            <th>Availability</th>
                                            <th>Current Salary</th>
                                            <th>Expected Salary</th>
                                            <th>Match Score</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          <tr>
                                            <td className="candidate-detail-strong"><EllipsisText value={candidate.profile_name} /></td>
                                            <td><EllipsisText value={candidate.profile_code} /></td>
                                            <td><EllipsisText value={candidate.current_company} /></td>
                                            <td><EllipsisText value={candidate.current_location} /></td>
                                            <td><EllipsisText value={candidate.preferred_location} /></td>
                                            <td><EllipsisText value={candidate.customer_name} /></td>
                                            <td><EllipsisText value={candidate.vendor_name} /></td>
                                            <td><EllipsisText value={candidate.profile_status_name} /></td>
                                            <td className="candidate-detail-strong">{displayText(candidate.work_exp_in_years)}</td>
                                            <td>
                                              <span className={`candidate-pill candidate-pill-${getAvailabilityState(candidate.profile_availability)}`}>
                                                {displayText(candidate.profile_availability)}
                                              </span>
                                            </td>
                                            <td className="candidate-detail-strong">{formatSalaryDisplay(candidate.current_salary)}</td>
                                            <td className="candidate-detail-strong">{formatSalaryDisplay(candidate.expected_salary)}</td>
                                            <td>
                                              <span className={`candidate-pill candidate-pill-${getMatchScoreState(candidate.match_score)}`}>
                                                {displayText(candidate.match_score)}
                                              </span>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>

                                  <div className="candidate-inline-group">
                                    <div className="candidate-inline-group-title">Demand Information</div>
                                    <div className="candidate-demand-inline-table-wrap">
                                      <table className="candidate-demand-inline-table">
                                        <thead>
                                          <tr>
                                            <th>Demand Code</th>
                                            <th>Job Role</th>
                                            <th>Customer</th>
                                            <th>Status</th>
                                            <th>Work Mode</th>
                                            <th>Dates</th>
                                            <th>Match Score</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {(candidate.linked_demands || []).map((demand, index) => (
                                            <tr key={`${demand.demand_id || 'demand'}-${index}`}>
                                              <td>{displayText(demand.demand_code)}</td>
                                              <td><EllipsisText value={demand.job_role} /></td>
                                              <td><EllipsisText value={demand.customer_name} /></td>
                                              <td>
                                                <span className={`candidate-pill candidate-pill-${getDemandStatusState(demand.demand_status)}`}>
                                                  {displayText(demand.demand_status)}
                                                </span>
                                              </td>
                                              <td><EllipsisText value={demand.work_mode_name} /></td>
                                              <td><EllipsisText value={`${formatDate(demand.demand_date)} / ${formatDate(demand.billable_date)}`} /></td>
                                              <td>
                                                <span className={`candidate-pill candidate-pill-${getMatchScoreState(demand.match_score)}`}>
                                                  {displayText(demand.match_score)}
                                                </span>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {totalPages > 1 ? (
                <div className="candidate-database-pagination">
                  <button type="button" className="btn-secondary" disabled={currentPage === 1} onClick={() => setPage((value) => value - 1)}>
                    Previous
                  </button>
                  <span>Page {currentPage} of {totalPages}</span>
                  <button type="button" className="btn-secondary" disabled={currentPage === totalPages} onClick={() => setPage((value) => value + 1)}>
                    Next
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="candidate-uploaded-section">
              {filteredUploadedRows.length === 0 ? (
                <div className="candidate-database-empty candidate-uploaded-empty">
                  No uploaded profiles available.
                </div>
              ) : (
                <div className="profile-merge-table-wrap">
                  <table className="profile-merge-table">
                    <thead>
                      <tr>
                        <th>Profile Name</th>
                        <th>Source</th>
                        <th>Uploaded By</th>
                        <th>Upload Date</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedUploadedRows.map((row) => (
                        <tr key={`uploaded-${row.id}`}>
                          <td>
                            <div className="profile-merge-name-cell">
                              <strong title={displayText(row.profile_name)}>{displayText(row.profile_name)}</strong>
                              <span title={displayText(row.file_name, '')}>{displayText(row.file_name, '')}</span>
                            </div>
                          </td>
                          <td><SourcePill source={row.source} /></td>
                          <td><EllipsisText value={row.raw?.uploaded_by || row.raw?.UPLOADED_BY || row.uploaded_by} /></td>
                          <td>{formatDate(row.upload_date)}</td>
                          <td>
                            <div className="profile-merge-action-cell">
                              <button type="button" className="btn-secondary btn-table-action" onClick={() => handleDownload(row, 'UPLOADED')}>
                                <Download size={14} />
                                Download
                              </button>
                              <button type="button" className="btn-secondary btn-table-action" onClick={() => openMergeModal(row)}>
                                <ArrowUpFromLine size={14} />
                                Merge
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {uploadedTotalPages > 1 ? (
                <div className="candidate-database-pagination">
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={currentUploadedPage === 1}
                    onClick={() => setUploadedPage((value) => value - 1)}
                  >
                    Previous
                  </button>
                  <span>Page {currentUploadedPage} of {uploadedTotalPages}</span>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={currentUploadedPage === uploadedTotalPages}
                    onClick={() => setUploadedPage((value) => value + 1)}
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <MergeModal
        open={Boolean(selectedProfile)}
        profile={selectedProfile}
        customers={customers}
        demands={demands}
        loadingDemands={loadingDemands}
        merging={merging}
        selectedCustomer={selectedCustomer}
        selectedDemand={selectedDemand}
        onClose={closeMergeModal}
        onCustomerChange={handleCustomerChange}
        onDemandChange={setSelectedDemand}
        onMerge={handleMerge}
      />

      {mergeProfileDraft ? (
        <AddProfileModal
          isOpen={Boolean(mergeProfileDraft)}
          onClose={() => setMergeProfileDraft(null)}
          onSuccess={async () => {
            setMergeProfileDraft(null);
            await loadRows();
          }}
          demandId={mergeProfileDraft.demandId}
          demands={mergeProfileDraft.demands}
          customerId={mergeProfileDraft.customerId}
          prefillProfile={mergeProfileDraft.profile}
          prefillFile={mergeProfileDraft.file}
          lockDemandSelection
        />
      ) : null}
    </div>
  );
};

export default CandidateDatabasePage;
