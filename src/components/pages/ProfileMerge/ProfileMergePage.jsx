import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpFromLine, Combine, Download, RefreshCw, Search, Upload, X } from 'lucide-react';
import Loader from '../../common/Loader';
import AddProfileModal from '../Customer/AddProfileModal';
import { toast } from '../../toast/index';
import { getCurrentAuditUser } from '../../../services/authService';
import { getProfileDownloadUrl } from '../../../services/profileDownloadService';
import {
  getProfileMergeCustomers,
  getProfileMergeDownloadUrl,
  getProfileMergeDemands,
  getProfileMergeRows,
  uploadProfileToMergeBucket,
} from '../../../services/profileMergeService';

const displayText = (value, fallback = '-') => {
  if (value === 0 || value === '0') return '0';
  const text = String(value ?? '').trim();
  return text || fallback;
};

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const SourcePill = ({ source }) => (
  <span className={`profile-merge-source-pill ${String(source).toLowerCase() === 'ats' ? 'ats' : 'uploaded'}`}>
    {displayText(source)}
  </span>
);

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
      <div className="profile-merge-modal" role="dialog" aria-modal="true" aria-labelledby="profile-merge-modal-title">
        <div className="profile-merge-modal-header">
          <div>
            <h2 className="ats-heading-2" id="profile-merge-modal-title">Merge Profile to Demand</h2>
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

          <div className="profile-merge-note">
            Merge supports profiles even when some add-profile fields are missing. The backend can complete or map the remaining values during merge.
          </div>
        </div>

        <div className="profile-merge-modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={merging}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={onMerge} disabled={merging || !selectedCustomer || !selectedDemand}>
            <Combine size={15} />
            {merging ? 'Merging...' : 'Merge Profile'}
          </button>
        </div>
      </div>
    </>
  );
};

const ProfileMergePage = () => {
  const fileInputRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [loadingDemands, setLoadingDemands] = useState(false);
  const [merging, setMerging] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedDemand, setSelectedDemand] = useState('');
  const [mergeProfileDraft, setMergeProfileDraft] = useState(null);

  const loadPageData = useCallback(async () => {
    try {
      setLoading(true);
      const [profileRows, customerRows] = await Promise.all([
        getProfileMergeRows(),
        getProfileMergeCustomers(),
      ]);

      setRows(Array.isArray(profileRows) ? profileRows : []);
      setCustomers(Array.isArray(customerRows) ? customerRows : []);
    } catch (error) {
      console.error('Profile merge load error:', error);
      toast.error('Failed to load profile merge data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((row) =>
      [
        row.profile_name,
        row.profile_code,
        row.file_name,
        row.source,
        row.current_company,
        row.current_location,
      ]
        .map((value) => displayText(value, '').toLowerCase())
        .join(' ')
        .includes(query)
    );
  }, [rows, searchTerm]);

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
      await loadPageData();
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Profile upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (profile) => {
    try {
      if (String(profile?.source_type).toUpperCase() === 'ATS' && profile?.profile_id) {
        const response = await getProfileDownloadUrl(profile.profile_id);
        if (!response?.success || !response?.download_url) {
          throw new Error(response?.message || 'Profile download is not available.');
        }

        window.open(response.download_url, '_blank', 'noopener,noreferrer');
        return;
      }

      if (String(profile?.source_type).toUpperCase() === 'UPLOADED') {
        const response = await getProfileMergeDownloadUrl({
          upload_id: profile?.raw?.upload_id || profile?.raw?.id || profile?.id || null,
          file_name: profile?.file_name || null,
          object_name: profile?.raw?.object_name || profile?.raw?.OBJECT_NAME || profile?.file_name || null,
          profile_url: profile?.profile_url || null,
        });

        if (!response?.success || !response?.download_url) {
          throw new Error(response?.message || 'Profile download is not available.');
        }

        window.open(response.download_url, '_blank', 'noopener,noreferrer');
        return;
      }

      throw new Error('Profile download is not available.');
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Profile download failed.');
    }
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
            notes: 'Profile initiated from Profile Merge ATS flow.',
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

  const handleCustomerChange = async (customerId) => {
    setSelectedCustomer(customerId);
    setSelectedDemand('');
    setDemands([]);

    if (!customerId) return;

    try {
      setLoadingDemands(true);
      const demandRows = await getProfileMergeDemands(customerId);
      setDemands(Array.isArray(demandRows) ? demandRows : []);
    } catch (error) {
      console.error('Profile merge demand load error:', error);
      toast.error('Failed to load demands for the selected customer.');
    } finally {
      setLoadingDemands(false);
    }
  };

  const handleMerge = async () => {
    if (!selectedProfile || !selectedCustomer || !selectedDemand) {
      toast.error('Please select both customer and demand.');
      return;
    }

    try {
      setMerging(true);
      const demandRows = Array.isArray(demands) ? demands.map((demand) => demand?.raw || demand) : [];
      await openAddProfileFromMerge(selectedProfile, selectedCustomer, selectedDemand, demandRows);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Profile merge failed.');
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="profile-merge-page">
      <div className="profile-merge-shell">
        <div className="profile-merge-header">
          <div>
            <div className="demand-report-kicker">Operations</div>
            <h1 className="ats-heading-1">Profile Merge & Upload</h1>
            <p className="ats-body-small">
              Upload external profiles to OCI, review ATS and uploaded profiles together, and merge them into demands.
            </p>
          </div>

          <div className="profile-merge-summary">
            <span>{filteredRows.length} profiles</span>
          </div>
        </div>

        <div className="profile-merge-panel">
          <div className="profile-merge-toolbar">
            <div className="profile-merge-search">
              <Search size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search profile name, file name, company, source..."
              />
            </div>

            <div className="profile-merge-toolbar-actions">
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
              <button type="button" className="btn-secondary" onClick={loadPageData} disabled={loading}>
                <RefreshCw size={15} />
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <Loader message="Loading profile merge workspace..." />
          ) : (
            <div className="profile-merge-table-wrap">
              <table className="profile-merge-table">
                <thead>
                  <tr>
                    <th>Profile Name</th>
                    <th>Source</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="profile-merge-empty">
                        No profiles available for merge.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr key={`${row.source_type}-${row.id}`}>
                        <td>
                          <div className="profile-merge-name-cell">
                            <strong title={displayText(row.profile_name)}>{displayText(row.profile_name)}</strong>
                            <span title={displayText(row.profile_code, '')}>{displayText(row.profile_code, '')}</span>
                          </div>
                        </td>
                        <td><SourcePill source={row.source} /></td>
                        <td>
                          <div className="profile-merge-action-cell">
                            <button type="button" className="btn-secondary btn-table-action" onClick={() => handleDownload(row)}>
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
                    ))
                  )}
                </tbody>
              </table>
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
            await loadPageData();
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

export default ProfileMergePage;
