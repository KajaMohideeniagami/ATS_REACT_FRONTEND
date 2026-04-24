import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Database, Download, RefreshCw, Search } from 'lucide-react';
import Loader from '../../common/Loader';
import { toast } from '../../../components/toast/index';
import {
  getCandidateDatabaseRows,
  searchCandidateDatabaseRows,
} from '../../../services/candidateDatabaseService';
import { getProfileDownloadUrl } from '../../../services/profileDownloadService';

const PAGE_SIZE = 12;
const SEARCH_STORAGE_KEY = 'candidateDatabase.searchTerm';
const PAGE_STORAGE_KEY = 'candidateDatabase.page';
const EXPANDED_PROFILE_STORAGE_KEY = 'candidateDatabase.expandedProfileId';

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

const EllipsisText = ({ value, className = '' }) => {
  const text = displayText(value);
  return (
    <span className={`candidate-ellipsis-text${className ? ` ${className}` : ''}`} title={text}>
      {text}
    </span>
  );
};

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

const CandidateDatabasePage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState(() => getStoredValue(SEARCH_STORAGE_KEY));
  const [page, setPage] = useState(() => Number(getStoredValue(PAGE_STORAGE_KEY, '1')) || 1);
  const [expandedProfileId, setExpandedProfileId] = useState(() => getStoredValue(EXPANDED_PROFILE_STORAGE_KEY));

  const loadRows = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getCandidateDatabaseRows();
      setRows(data);
    } catch (loadError) {
      console.error('Candidate database row load error:', loadError);
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

  const filteredRows = useMemo(() => searchCandidateDatabaseRows(rows, searchTerm), [rows, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const startRow = filteredRows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(currentPage * PAGE_SIZE, filteredRows.length);

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

  const handleDownload = async (profileId) => {
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

  const resetSearch = () => {
    setSearchTerm('');
    setPage(1);
  };

  const toggleExpanded = (profileId) => {
    setExpandedProfileId((current) => (String(current) === String(profileId) ? '' : String(profileId)));
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
                placeholder='Search by candidate, location, availability, salary, job role, demand code, customer...'
                aria-label="Search candidate database"
              />
            </div>

            <div className="candidate-database-toolbar-actions">
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
              Showing <strong>{startRow}-{endRow}</strong> of <strong>{filteredRows.length}</strong> candidates
            </span>
          </div>

          {error ? <div className="error-message">{error}</div> : null}

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
                    <th>Location</th>
                    <th>Experience</th>
                    <th>Availability</th>
                    <th>Linked Demands</th>
                    <th>Match Score</th>
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
                          <td><EllipsisText value={candidate.current_location} /></td>
                          <td>{displayText(candidate.work_exp_in_years)}</td>
                          <td>
                            <span className={`candidate-pill candidate-pill-${getAvailabilityState(candidate.profile_availability)}`}>
                              {displayText(candidate.profile_availability)}
                            </span>
                          </td>
                          <td>{displayText(candidate.linked_demand_count || 1)}</td>
                          <td>
                            <span className={`candidate-pill candidate-pill-${getMatchScoreState(candidate.match_score)}`}>
                              {displayText(candidate.match_score)}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn-secondary btn-table-action"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDownload(candidate.profile_id);
                              }}
                            >
                              <Download size={14} />
                              Download
                            </button>
                          </td>
                        </tr>

                        <tr className={`candidate-expanded-row ${isExpanded ? 'is-open' : ''}`}>
                          <td colSpan="9" className="candidate-expanded-cell">
                            <div className="candidate-expanded-content">
                              <div className="candidate-inline-group">
                                <div className="candidate-inline-group-title">Candidate Details</div>
                                <div className="candidate-demand-inline-table-wrap">
                                  <table className="candidate-detail-inline-table candidate-detail-inline-table-compact">
                                    <tbody>
                                      <tr>
                                        <th>Candidate Name</th>
                                        <th>Profile Code</th>
                                        <th>Current Company</th>
                                        <th>Current Location</th>
                                        <th>Preferred Location</th>
                                        <th>Customer</th>
                                        <th>Vendor</th>
                                      </tr>
                                      <tr>
                                        <td className="candidate-detail-strong">{displayText(candidate.profile_name)}</td>
                                        <td><EllipsisText value={candidate.profile_code} /></td>
                                        <td><EllipsisText value={candidate.current_company} /></td>
                                        <td><EllipsisText value={candidate.current_location} /></td>
                                        <td><EllipsisText value={candidate.preferred_location} /></td>
                                        <td><EllipsisText value={candidate.customer_name} /></td>
                                        <td><EllipsisText value={candidate.vendor_name} /></td>
                                      </tr>
                                      <tr>
                                        <th>Profile Status</th>
                                        <th>Total Experience</th>
                                        <th>Availability</th>
                                        <th>Current Salary</th>
                                        <th>Expected Salary</th>
                                        <th>Match Score</th>
                                        <th className="candidate-detail-empty-header" />
                                      </tr>
                                      <tr>
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
                                        <td className="candidate-detail-empty-cell" />
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
        </div>
      </div>
    </div>
  );
};

export default CandidateDatabasePage;
