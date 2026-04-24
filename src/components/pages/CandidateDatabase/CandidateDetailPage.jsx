import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BriefcaseBusiness, Download, MapPin, UserRound } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import Loader from '../../common/Loader';
import { toast } from '../../../components/toast/index';
import { getCandidateDatabaseRecord } from '../../../services/candidateDatabaseService';
import { getProfileDownloadUrl } from '../../../services/profileDownloadService';
import { getProfileView } from '../../../services/profileViewService';
import { getDemandDetails } from '../../../services/demandService';

const displayText = (value, fallback = '-') => {
  if (value === 0 || value === '0') return '0';
  const text = String(value ?? '').trim();
  return text || fallback;
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-US');
};

const DetailTable = ({ title, icon: Icon, rows }) => (
  <section className="candidate-detail-card candidate-detail-section">
    <div className="candidate-detail-card-title">
      <Icon size={18} />
      {title}
    </div>
    <div className="candidate-detail-table-wrap">
      <table className="candidate-detail-table">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              <td>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

const CandidateDetailPage = () => {
  const navigate = useNavigate();
  const { profileId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [candidateRecord, setCandidateRecord] = useState(null);
  const [profileView, setProfileView] = useState(null);
  const [demandRows, setDemandRows] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');

        const record = await getCandidateDatabaseRecord(profileId);
        const profile = await getProfileView(profileId);

        setCandidateRecord(record);
        setProfileView(profile || null);

        const linkedDemands = Array.isArray(record?.linked_demands) ? record.linked_demands : [];
        const demandDetailsList = await Promise.all(
          linkedDemands.map(async (demand) => {
            try {
              if (!demand.customer_id || !demand.demand_id) {
                return demand;
              }
              const detail = await getDemandDetails(demand.customer_id, demand.demand_id);
              return {
                ...demand,
                customer_name: detail?.customer_name || demand.customer_name,
                demand_code: detail?.demand_code || demand.demand_code,
                job_role: detail?.job_role || demand.job_role,
                demand_type: detail?.demand_type || demand.demand_type,
                work_mode_name: detail?.work_mode_name || demand.work_mode_name,
                demand_status: detail?.demand_status || demand.demand_status,
                demand_date: detail?.demand_date || demand.demand_date,
                billable_date: detail?.billable_date || demand.billable_date,
                vendor_name: detail?.vendor_name || demand.vendor_name,
                match_score: demand.match_score,
              };
            } catch {
              return demand;
            }
          })
        );

        setDemandRows(demandDetailsList);
      } catch (loadError) {
        console.error('Candidate detail load error:', loadError);
        setError(loadError?.response?.data?.message || 'Failed to load candidate details.');
      } finally {
        setLoading(false);
      }
    };

    if (profileId) {
      loadData();
    }
  }, [profileId]);

  const handleDownload = async () => {
    try {
      const response = await getProfileDownloadUrl(profileId);
      if (!response.success || !response.download_url) {
        toast.error(response.message || 'Failed to generate profile download link.');
        return;
      }
      window.open(response.download_url, '_blank', 'noopener,noreferrer');
    } catch (downloadError) {
      toast.error(downloadError.response?.data?.message || 'Failed to download profile.');
    }
  };

  const overviewRows = useMemo(
    () => [
      { label: 'Candidate Name', value: displayText(profileView?.name || candidateRecord?.profile_name) },
      { label: 'Profile Code', value: displayText(candidateRecord?.profile_code || profileView?.profile_code) },
      { label: 'Email', value: displayText(profileView?.email) },
      { label: 'Contact Number', value: displayText(profileView?.contact_no) },
      { label: 'Current Company', value: displayText(profileView?.current_company || candidateRecord?.current_company) },
      { label: 'Current Location', value: displayText(profileView?.current_location || candidateRecord?.current_location) },
      { label: 'Preferred Location', value: displayText(profileView?.preferred_location || candidateRecord?.preferred_location) },
      { label: 'Profile Status', value: displayText(candidateRecord?.profile_status_name) },
    ],
    [candidateRecord, profileView]
  );

  const experienceRows = useMemo(
    () => [
      { label: 'Total Experience', value: displayText(profileView?.total_exp || profileView?.work_exp_in_years) },
      { label: 'Relevant Experience', value: displayText(profileView?.relevant_exp || profileView?.relevant_exp_in_years) },
      { label: 'Availability', value: displayText(profileView?.availability || profileView?.profile_availability) },
      { label: 'Notice Period', value: displayText(profileView?.notice_period || profileView?.notice_period_days) },
      { label: 'Current Salary', value: displayText(profileView?.current_salary || profileView?.current_salary_pa) },
      { label: 'Expected Salary', value: displayText(profileView?.expected_salary || profileView?.expected_salary_pa) },
      { label: 'Currency', value: displayText(profileView?.currency || profileView?.salary_currency) },
      { label: 'Match Score', value: displayText(candidateRecord?.match_score || profileView?.ai_profile_score) },
    ],
    [candidateRecord, profileView]
  );

  if (loading) {
    return (
      <div className="candidate-detail-page">
        <Loader message="Loading candidate details..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="candidate-detail-page">
        <div className="candidate-detail-shell">
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="candidate-detail-page">
      <div className="candidate-detail-shell compact-candidate-detail-shell">
        <div className="candidate-detail-header compact-candidate-detail-header">
          <div className="candidate-detail-header-main">
            <button
              type="button"
              className="btn-secondary candidate-detail-back"
              onClick={() => navigate('/candidate-database')}
            >
              <ArrowLeft size={15} />
              Back To Database
            </button>
            <div className="candidate-detail-hero compact-candidate-detail-hero">
              <div className="candidate-detail-avatar">
                <UserRound size={22} />
              </div>
              <div>
                <span className="candidate-detail-code">
                  {displayText(candidateRecord?.profile_code || profileView?.profile_code)}
                </span>
                <h1 className="ats-heading-2">
                  {displayText(profileView?.name || candidateRecord?.profile_name)}
                </h1>
                <p className="candidate-detail-subtitle">
                  {displayText(candidateRecord?.job_role)} | {displayText(profileView?.current_location || candidateRecord?.current_location)} | Linked Demands {demandRows.length || 1}
                </p>
              </div>
            </div>
          </div>

          <button type="button" className="btn-primary" onClick={handleDownload}>
            <Download size={15} />
            Download Profile
          </button>
        </div>

        <div className="candidate-detail-top-grid">
          <DetailTable title="Candidate Overview" icon={UserRound} rows={overviewRows} />
          <DetailTable title="Experience & Compensation" icon={MapPin} rows={experienceRows} />
        </div>

        <section className="candidate-detail-card candidate-detail-section">
          <div className="candidate-detail-card-title">
            <BriefcaseBusiness size={18} />
            Demand Information
          </div>
          <div className="candidate-detail-table-wrap">
            <table className="candidate-detail-demand-table">
              <thead>
                <tr>
                  <th>Demand Code</th>
                  <th>Customer</th>
                  <th>Job Role</th>
                  <th>Type</th>
                  <th>Work Mode</th>
                  <th>Status</th>
                  <th>Vendor</th>
                  <th>Demand Date</th>
                  <th>Billable Date</th>
                  <th>Match Score</th>
                </tr>
              </thead>
              <tbody>
                {demandRows.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="candidate-detail-empty-cell">
                      No linked demand information available.
                    </td>
                  </tr>
                ) : (
                  demandRows.map((demand, index) => (
                    <tr key={`${demand.customer_id || 'customer'}-${demand.demand_id || index}`}>
                      <td>{displayText(demand.demand_code)}</td>
                      <td>{displayText(demand.customer_name)}</td>
                      <td>{displayText(demand.job_role)}</td>
                      <td>{displayText(demand.demand_type)}</td>
                      <td>{displayText(demand.work_mode_name)}</td>
                      <td>{displayText(demand.demand_status)}</td>
                      <td>{displayText(demand.vendor_name)}</td>
                      <td>{formatDate(demand.demand_date)}</td>
                      <td>{formatDate(demand.billable_date)}</td>
                      <td>{displayText(demand.match_score)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default CandidateDetailPage;
