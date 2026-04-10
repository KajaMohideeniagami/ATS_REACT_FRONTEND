import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Filter, RefreshCw, X } from 'lucide-react';
import Loader from '../../common/Loader';
import { toast } from '../../toast/index';
import {
  getExecutiveDashboardCustomers,
  getExecutiveDashboardDemandTypes,
  getExecutiveDashboardYears,
  getExecutiveDashboardAnalysisData,
  getExecutiveDashboardDemandAgeingDetails,
  getExecutiveDashboardOpenDemandsData,
  getExecutiveDashboardSummaryData,
  getExecutiveDashboardTaData,
} from '../../../services/executiveDashboardService';
import '../../../global.css';

const DATA_TAB = 'data';
const TA_TAB = 'ta';
const OPEN_DEMANDS_PAGE_SIZE = 15;
const MONTH_OPTIONS = [
  { value: '01', label: 'January', key: 'jan' },
  { value: '02', label: 'February', key: 'feb' },
  { value: '03', label: 'March', key: 'mar' },
  { value: '04', label: 'April', key: 'apr' },
  { value: '05', label: 'May', key: 'may' },
  { value: '06', label: 'June', key: 'jun' },
  { value: '07', label: 'July', key: 'jul' },
  { value: '08', label: 'August', key: 'aug' },
  { value: '09', label: 'September', key: 'sep' },
  { value: '10', label: 'October', key: 'oct' },
  { value: '11', label: 'November', key: 'nov' },
  { value: '12', label: 'December', key: 'dec' },
];
const WEEK_OPTIONS = [
  { value: 'All', label: 'All Weeks' },
  { value: '1', label: 'Week 1', key: 'week1' },
  { value: '2', label: 'Week 2', key: 'week2' },
  { value: '3', label: 'Week 3', key: 'week3' },
  { value: '4', label: 'Week 4', key: 'week4' },
  { value: '5', label: 'Week 5', key: 'week5' },
];
const QUARTER_OPTIONS = [
  { value: '1', label: 'Q1', key: 'q1' },
  { value: '2', label: 'Q2', key: 'q2' },
  { value: '3', label: 'Q3', key: 'q3' },
  { value: '4', label: 'Q4', key: 'q4' },
];

const buildSingleYearOption = (yearValue) => [{
  value: String(yearValue || new Date().getFullYear()),
  label: String(yearValue || new Date().getFullYear()),
}];

const EMPTY_EXECUTIVE_DATA = {
  overallMetrics: [],
  currentMonthMetrics: [],
  currentWeekMetrics: [],
  demandAgeingMetrics: [],
  openDemandsSummary: [],
  availableYears: [],
  availableMonths: [],
  availableWeekMonths: [],
  availableWeeks: [],
  availableQuarters: [],
  monthlyAnalysis: [],
  weeklyAnalysis: [],
  quarterlyAnalysis: [],
  taPerformance: {
    profiles_sourced_current_month: 0,
    internal_interview_count: 0,
    customer_submitted_count: 0,
    customer_interview_count: 0,
    customer_select_count: 0,
    customer_reject_count: 0,
  },
  taPerformanceReport: [],
  taScoreReport: [],
};

const EMPTY_SECTION_LOADING = {
  summary: true,
  openDemands: true,
  analysis: true,
  ta: false,
};

const EMPTY_SECTION_ERRORS = {
  summary: '',
  openDemands: '',
  analysis: '',
  ta: '',
};

const buildYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years = [];

  for (let year = currentYear; year >= currentYear - 6; year -= 1) {
    years.push({ value: String(year), label: String(year) });
  }

  return years;
};

const getCurrentMonthValue = () => String(new Date().getMonth() + 1).padStart(2, '0');
const getCurrentQuarterValue = () => String(Math.floor(new Date().getMonth() / 3) + 1);

const METRIC_LABELS = {
  'Total Demands': 'Total Demands',
  'Total Demands Created': 'Total Demands Created',
  'Open Demands': 'Open Demands',
  'Closed Demands': 'Closed Demands',
  'Hold Demands': 'Hold Demands',
  'Lost Demands': 'Lost Demands',
  'Profiles Onboarded': 'Profiles Onboarded',
};

const formatMetricLabel = (value) => METRIC_LABELS[value] || value || '-';

const metricValue = (value) => Number(value ?? 0).toLocaleString('en-IN');
const safeText = (value) => String(value ?? '').trim() || '-';
const renderSummaryValue = (value) => {
  const numericValue = Number(value ?? 0);
  return numericValue === 0 ? '' : metricValue(numericValue);
};

const ReportTable = ({ title, columns, rows, accentClass = '', loading = false, errorMessage = '' }) => (
  <section className={`executive-report-card ${accentClass}`.trim()}>
    <div className="executive-report-card-header">
      <h3>{title}</h3>
    </div>

    <div className="executive-report-table-wrap">
      <table className="executive-report-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td className="executive-report-empty" colSpan={columns.length}>
                <Loader inline message="Loading..." />
              </td>
            </tr>
          ) : errorMessage ? (
            <tr>
              <td className="executive-report-empty executive-report-error" colSpan={columns.length}>
                {errorMessage}
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td className="executive-report-empty" colSpan={columns.length}>
                No data available for the selected filters.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={`${title}-${index}`}>
                {columns.map((column) => (
                  <td key={column.key}>
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </section>
);

const MultiSelectDropdown = ({
  label,
  options,
  selectedValues,
  onChange,
  placeholder,
}) => {
  const [open, setOpen] = useState(false);

  const selectedLabels = options
    .filter((option) => selectedValues.includes(option.value))
    .map((option) => option.label);

  const displayText = selectedLabels.length ? selectedLabels.join(', ') : placeholder;

  const toggleValue = (value) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((item) => item !== value));
      return;
    }

    onChange([...selectedValues, value]);
  };

  return (
    <div className="executive-analysis-filter">
      <label className="form-label">{label}</label>
      <div className={`executive-multiselect ${open ? 'open' : ''}`}>
        <button
          type="button"
          className="executive-multiselect-trigger"
          onClick={() => setOpen((previous) => !previous)}
        >
          <span className="executive-multiselect-text">{displayText}</span>
          <span className="executive-multiselect-caret">▾</span>
        </button>

        {open ? (
          <div className="executive-multiselect-menu">
            {options.map((option) => (
              <label key={option.value} className="executive-multiselect-option">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option.value)}
                  onChange={() => toggleValue(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

const groupOpenDemandRows = (rows) => {
  const groups = [];
  let currentGroup = null;

  rows.forEach((row, index) => {
    if (!currentGroup || currentGroup.open_demands_list !== row.open_demands_list) {
      currentGroup = {
        id: `${row.open_demands_list}-${index}`,
        open_demands_list: row.open_demands_list,
        no_of_position: row.no_of_position,
        profiles_in_pipeline: row.profiles_in_pipeline,
        details: [],
      };
      groups.push(currentGroup);
    }

    currentGroup.details.push({
      no_of_profiles: row.no_of_profiles,
      profile_status: row.profile_status,
      ageing_days: row.ageing_days,
    });
  });

  return groups;
};

const OpenDemandSummaryTable = ({
  rows,
  currentPage,
  onPageChange,
  loading = false,
  errorMessage = '',
}) => {
  const groupedRows = groupOpenDemandRows(rows);
  const totalRecords = groupedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / OPEN_DEMANDS_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = totalRecords === 0 ? 0 : (safeCurrentPage - 1) * OPEN_DEMANDS_PAGE_SIZE;
  const pageEndIndex = Math.min(pageStartIndex + OPEN_DEMANDS_PAGE_SIZE, totalRecords);
  const paginatedGroups = groupedRows.slice(pageStartIndex, pageEndIndex);
  const paginationSummary = totalRecords === 0 ? '0 - 0 of 0' : `${pageStartIndex + 1} - ${pageEndIndex} of ${totalRecords}`;

  const renderPaginationBar = () => (
    <div className="executive-open-demand-pagination-bar">
      <span className="executive-open-demand-pagination-text">
        {paginationSummary}
      </span>
      <div className="executive-open-demand-pagination-actions">
        <button
          type="button"
          className="executive-open-demand-page-button"
          onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
          disabled={safeCurrentPage === 1 || totalRecords === 0}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          className="executive-open-demand-page-button"
          onClick={() => onPageChange(Math.min(totalPages, safeCurrentPage + 1))}
          disabled={safeCurrentPage === totalPages || totalRecords === 0}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <section className="executive-report-card accent-emerald executive-report-card-full">
      <div className="executive-report-card-header">
        <h3>Demand - Profile Summary (Open Demands)</h3>
      </div>

      {renderPaginationBar()}

      <div className="executive-report-table-wrap">
        <table className="executive-report-table executive-open-demand-table">
          <tbody>
            {loading ? (
              <tr>
                <td className="executive-report-empty" colSpan={5}>
                  <Loader inline message="Loading..." />
                </td>
              </tr>
            ) : errorMessage ? (
              <tr>
                <td className="executive-report-empty executive-report-error" colSpan={5}>
                  {errorMessage}
                </td>
              </tr>
            ) : groupedRows.length === 0 ? (
              <tr>
                <td className="executive-report-empty" colSpan={5}>
                  No data available for the selected filters.
                </td>
              </tr>
            ) : (
              paginatedGroups.map((group) => (
                <React.Fragment key={group.id}>
                  <tr>
                    <td className="executive-demand-group-title" colSpan={5}>
                      {safeText(group.open_demands_list)}
                    </td>
                  </tr>
                  <tr>
                    <th>No Of Profiles Submitted</th>
                    <th>Profile Status</th>
                    <th>Profile Status Ageing</th>
                    <th>No Of Position</th>
                    <th>Profiles In Pipeline</th>
                  </tr>
                  {group.details.length > 0 ? (
                    group.details.map((detail, detailIndex) => (
                      <tr key={`${group.id}-${detailIndex}`}>
                        <td className="executive-open-demand-count-cell">
                          {renderSummaryValue(detail.no_of_profiles)}
                        </td>
                        <td className="executive-open-demand-status-cell">
                          {safeText(detail.profile_status)}
                        </td>
                        <td className="executive-open-demand-ageing-cell">
                          {metricValue(detail.ageing_days)}
                        </td>
                        {detailIndex === 0 ? (
                          <td rowSpan={group.details.length} className="executive-open-demand-merged-cell">
                            {renderSummaryValue(group.no_of_position)}
                          </td>
                        ) : null}
                        {detailIndex === 0 ? (
                          <td rowSpan={group.details.length} className="executive-open-demand-merged-cell">
                            {renderSummaryValue(group.profiles_in_pipeline)}
                          </td>
                        ) : null}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="executive-report-empty" colSpan={5}>
                        No profile data available.
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {renderPaginationBar()}
    </section>
  );
};

const AnalysisTableCard = ({
  title,
  accentClass,
  filters,
  columns,
  rows,
  loading = false,
  errorMessage = '',
}) => (
  <section className={`executive-report-card ${accentClass} executive-analysis-card`.trim()}>
    <div className="executive-report-card-header">
      <h3>{title}</h3>
    </div>

    <div className="executive-analysis-controls">
      {filters}
    </div>

    <div className="executive-report-table-wrap">
      <table className="executive-report-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td className="executive-report-empty" colSpan={columns.length}>
                <Loader inline message="Loading..." />
              </td>
            </tr>
          ) : errorMessage ? (
            <tr>
              <td className="executive-report-empty executive-report-error" colSpan={columns.length}>
                {errorMessage}
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td className="executive-report-empty" colSpan={columns.length}>
                No data available for the selected filters.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={`${title}-${index}`}>
                {columns.map((column) => (
                  <td key={column.key}>
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </section>
);

const DemandAgeingDetailsModal = ({
  open,
  title,
  rows,
  loading,
  errorMessage,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div className="executive-modal-overlay" onClick={onClose}>
      <div
        className="executive-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="executive-demand-details-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="executive-modal-header">
          <h3 id="executive-demand-details-title">{title}</h3>
          <button type="button" className="executive-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="executive-modal-body">
          <div className="executive-report-table-wrap">
            <table className="executive-report-table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Demand Name</th>
                  <th>No Of Position</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="executive-report-empty" colSpan={3}>
                      <Loader inline message="Loading..." />
                    </td>
                  </tr>
                ) : errorMessage ? (
                  <tr>
                    <td className="executive-report-empty executive-report-error" colSpan={3}>{errorMessage}</td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td className="executive-report-empty" colSpan={3}>No demand found.</td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr key={`${row.customer_name}-${row.demand_name}-${index}`}>
                      <td>{safeText(row.customer_name)}</td>
                      <td>{safeText(row.demand_name)}</td>
                      <td>{row.no_of_position ? metricValue(row.no_of_position) : ''}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const ExecutiveDashboardPage = () => {
  const [activeTab, setActiveTab] = useState(DATA_TAB);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [customerOptions, setCustomerOptions] = useState([]);
  const [demandTypeOptions, setDemandTypeOptions] = useState([]);
  const [topYearOptions, setTopYearOptions] = useState([]);
  const [filters, setFilters] = useState({
    customer: 'All',
    demandType: 'All',
    year: String(new Date().getFullYear()),
  });
  const [analysisFilters, setAnalysisFilters] = useState({
    monthYear: String(new Date().getFullYear()),
    compareMonths: [],
    weekYear: String(new Date().getFullYear()),
    weekMonth: getCurrentMonthValue(),
    compareWeeks: [],
    quarterYear: String(new Date().getFullYear()),
    compareQuarters: [],
  });
  const [dashboardData, setDashboardData] = useState(EMPTY_EXECUTIVE_DATA);
  const [sectionLoading, setSectionLoading] = useState(EMPTY_SECTION_LOADING);
  const [sectionErrors, setSectionErrors] = useState(EMPTY_SECTION_ERRORS);
  const [openDemandPage, setOpenDemandPage] = useState(1);
  const [ageingDetailsOpen, setAgeingDetailsOpen] = useState(false);
  const [selectedAgeRange, setSelectedAgeRange] = useState('');
  const [ageingDetailRows, setAgeingDetailRows] = useState([]);
  const [ageingDetailsLoading, setAgeingDetailsLoading] = useState(false);
  const [ageingDetailsError, setAgeingDetailsError] = useState('');

  const fallbackYearOptions = useMemo(buildYearOptions, []);
  const yearOptions = topYearOptions.length ? topYearOptions : fallbackYearOptions;

  useEffect(() => {
    const loadFilters = async () => {
      try {
        setLoadingFilters(true);

        const [customers, demandTypes, years] = await Promise.all([
          getExecutiveDashboardCustomers(),
          getExecutiveDashboardDemandTypes(),
          getExecutiveDashboardYears(),
        ]);

        setCustomerOptions(customers);
        setDemandTypeOptions(demandTypes);
        setTopYearOptions(years);
      } catch (fetchError) {
        console.error('Executive dashboard filter load error:', fetchError);
        toast.error('Failed to load executive dashboard filters.');
      } finally {
        setLoadingFilters(false);
      }
    };

    loadFilters();
  }, []);

  useEffect(() => {
    if (activeTab !== DATA_TAB) return undefined;

    let cancelled = false;

    const loadSummarySection = async () => {
      try {
        setSectionLoading((previous) => ({ ...previous, summary: true }));
        setSectionErrors((previous) => ({ ...previous, summary: '' }));

        const data = await getExecutiveDashboardSummaryData(filters);
        if (cancelled) return;

        setDashboardData((previous) => ({
          ...previous,
          ...data,
        }));
      } catch (fetchError) {
        if (cancelled) return;
        console.error('Executive dashboard summary load error:', fetchError);
        setSectionErrors((previous) => ({ ...previous, summary: 'Failed to load summary data.' }));
      } finally {
        if (!cancelled) {
          setSectionLoading((previous) => ({ ...previous, summary: false }));
        }
      }
    };

    const loadOpenDemandSection = async () => {
      try {
        setSectionLoading((previous) => ({ ...previous, openDemands: true }));
        setSectionErrors((previous) => ({ ...previous, openDemands: '' }));

        const data = await getExecutiveDashboardOpenDemandsData(filters);
        if (cancelled) return;

        setDashboardData((previous) => ({
          ...previous,
          ...data,
        }));
      } catch (fetchError) {
        if (cancelled) return;
        console.error('Executive dashboard open demands load error:', fetchError);
        setSectionErrors((previous) => ({ ...previous, openDemands: 'Failed to load open demand data.' }));
      } finally {
        if (!cancelled) {
          setSectionLoading((previous) => ({ ...previous, openDemands: false }));
        }
      }
    };

    loadSummarySection();
    loadOpenDemandSection();

    return () => {
      cancelled = true;
    };
  }, [activeTab, filters.customer, filters.demandType, filters.year]);

  useEffect(() => {
    if (activeTab !== DATA_TAB) return undefined;

    let cancelled = false;

    const loadAnalysisSection = async () => {
      try {
        setSectionLoading((previous) => ({ ...previous, analysis: true }));
        setSectionErrors((previous) => ({ ...previous, analysis: '' }));

        const data = await getExecutiveDashboardAnalysisData({
          ...filters,
          analysisMonthYear: analysisFilters.monthYear,
          analysisWeekYear: analysisFilters.weekYear,
          analysisWeekMonth: analysisFilters.weekMonth,
          analysisQuarterYear: analysisFilters.quarterYear,
        });

        if (cancelled) return;

        setDashboardData((previous) => ({
          ...previous,
          ...data,
        }));
      } catch (fetchError) {
        if (cancelled) return;
        console.error('Executive dashboard analysis load error:', fetchError);
        setSectionErrors((previous) => ({ ...previous, analysis: 'Failed to load analysis data.' }));
      } finally {
        if (!cancelled) {
          setSectionLoading((previous) => ({ ...previous, analysis: false }));
        }
      }
    };

    loadAnalysisSection();

    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    filters.customer,
    filters.demandType,
    filters.year,
    analysisFilters.monthYear,
    analysisFilters.weekYear,
    analysisFilters.weekMonth,
    analysisFilters.quarterYear,
  ]);

  useEffect(() => {
    if (activeTab !== TA_TAB) return undefined;

    let cancelled = false;

    const loadTaSection = async () => {
      try {
        setSectionLoading((previous) => ({ ...previous, ta: true }));
        setSectionErrors((previous) => ({ ...previous, ta: '' }));

        const data = await getExecutiveDashboardTaData(filters);
        if (cancelled) return;

        setDashboardData((previous) => ({
          ...previous,
          ...data,
        }));
      } catch (fetchError) {
        if (cancelled) return;
        console.error('Executive dashboard TA load error:', fetchError);
        setSectionErrors((previous) => ({ ...previous, ta: 'Failed to load TA performance data.' }));
      } finally {
        if (!cancelled) {
          setSectionLoading((previous) => ({ ...previous, ta: false }));
        }
      }
    };

    loadTaSection();

    return () => {
      cancelled = true;
    };
  }, [activeTab, filters.customer, filters.demandType, filters.year]);

  useEffect(() => {
    setOpenDemandPage(1);
  }, [dashboardData.openDemandsSummary, activeTab]);

  const handleFilterChange = (key, value) => {
    setFilters((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleAnalysisFilterChange = (key, value) => {
    setAnalysisFilters((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleReset = () => {
    setFilters({
      customer: 'All',
      demandType: 'All',
      year: String(new Date().getFullYear()),
    });
    setAnalysisFilters({
      monthYear: String(new Date().getFullYear()),
      compareMonths: [],
      weekYear: String(new Date().getFullYear()),
      weekMonth: getCurrentMonthValue(),
      compareWeeks: [],
      quarterYear: String(new Date().getFullYear()),
      compareQuarters: [],
    });
    toast.success('Executive dashboard filters reset.');
  };

  const handleOpenAgeingDetails = async (ageRange, demandCount) => {
    if (!demandCount) return;

    setSelectedAgeRange(ageRange);
    setAgeingDetailsOpen(true);
    setAgeingDetailsLoading(true);
    setAgeingDetailsError('');

    try {
      const rows = await getExecutiveDashboardDemandAgeingDetails(filters, ageRange);
      setAgeingDetailRows(rows);
    } catch (fetchError) {
      console.error('Executive dashboard ageing details load error:', fetchError);
      setAgeingDetailsError('Failed to load demand details.');
      setAgeingDetailRows([]);
    } finally {
      setAgeingDetailsLoading(false);
    }
  };

  const handleCloseAgeingDetails = () => {
    setAgeingDetailsOpen(false);
    setSelectedAgeRange('');
    setAgeingDetailRows([]);
    setAgeingDetailsError('');
    setAgeingDetailsLoading(false);
  };

  const overallRows = useMemo(
    () =>
      dashboardData.overallMetrics.map((item) => ({
        metric: formatMetricLabel(item.metric),
        value: item.value,
      })),
    [dashboardData.overallMetrics]
  );

  const currentMonthRows = useMemo(
    () =>
      dashboardData.currentMonthMetrics.map((item) => ({
        metric: formatMetricLabel(item.metric),
        value: item.value,
      })),
    [dashboardData.currentMonthMetrics]
  );

  const currentWeekRows = useMemo(
    () =>
      dashboardData.currentWeekMetrics.map((item) => ({
        metric: formatMetricLabel(item.metric),
        value: item.value,
      })),
    [dashboardData.currentWeekMetrics]
  );

  const ageingRows = useMemo(
    () =>
      dashboardData.demandAgeingMetrics.map((item) => ({
        age_range: item.age_range || '-',
        demand_count: item.demand_count,
        total_positions: item.total_positions,
      })),
    [dashboardData.demandAgeingMetrics]
  );

  const taRows = useMemo(
    () => [
      {
        profiles_sourced_current_month: dashboardData.taPerformance.profiles_sourced_current_month,
        internal_interview_count: dashboardData.taPerformance.internal_interview_count,
        customer_submitted_count: dashboardData.taPerformance.customer_submitted_count,
        customer_interview_count: dashboardData.taPerformance.customer_interview_count,
        customer_select_count: dashboardData.taPerformance.customer_select_count,
        customer_reject_count: dashboardData.taPerformance.customer_reject_count,
      },
    ],
    [dashboardData.taPerformance]
  );

  const openDemandSummaryRows = useMemo(
    () =>
      dashboardData.openDemandsSummary.map((item) => ({
        open_demands_list: item.open_demands_list,
        no_of_position: item.no_of_position,
        no_of_profiles: item.no_of_profiles,
        profile_status: item.profile_status,
        profiles_in_pipeline: item.profiles_in_pipeline,
        total_profiles_except_pipeline: item.total_profiles_except_pipeline,
        ageing_days: item.ageing_days,
      })),
    [dashboardData.openDemandsSummary]
  );

  const availableAnalysisYearOptions = useMemo(() => {
    if (dashboardData.availableYears.length) return dashboardData.availableYears;
    return yearOptions;
  }, [dashboardData.availableYears, yearOptions]);

  const availableMonthOptions = useMemo(() => {
    if (dashboardData.availableMonths.length) {
      return dashboardData.availableMonths.map((item) => {
        const matched = MONTH_OPTIONS.find((option) => option.value === item.value);
        return matched || { value: item.value, label: item.label, key: item.value };
      });
    }

    const options = MONTH_OPTIONS.filter((option) =>
      dashboardData.monthlyAnalysis.some((item) => Number(item[option.key] ?? 0) > 0)
    );

    return options.length ? options : MONTH_OPTIONS;
  }, [dashboardData.availableMonths, dashboardData.monthlyAnalysis]);

  const availableWeekMonthOptions = useMemo(() => {
    if (dashboardData.availableWeekMonths.length) {
      return dashboardData.availableWeekMonths.map((item) => {
        const matched = MONTH_OPTIONS.find((option) => option.value === item.value);
        return matched || { value: item.value, label: item.label, key: item.value };
      });
    }

    const options = MONTH_OPTIONS.filter((option) =>
      option.value === analysisFilters.weekMonth
    );

    return options.length ? options : MONTH_OPTIONS;
  }, [analysisFilters.weekMonth, dashboardData.availableWeekMonths]);

  const availableWeekOptions = useMemo(() => {
    if (dashboardData.availableWeeks.length) {
      return dashboardData.availableWeeks.map((item) => {
        const matched = WEEK_OPTIONS.find((option) => option.value === item.value);
        return matched || { value: item.value, label: item.label, key: `week${item.value}` };
      });
    }

    const weekOptions = WEEK_OPTIONS.slice(1).filter((option) =>
      dashboardData.weeklyAnalysis.some((item) => Number(item[option.key] ?? 0) > 0)
    );

    return weekOptions.length ? weekOptions : WEEK_OPTIONS.slice(1);
  }, [dashboardData.availableWeeks, dashboardData.weeklyAnalysis]);

  const availableQuarterOptions = useMemo(() => {
    if (dashboardData.availableQuarters.length) {
      return dashboardData.availableQuarters.map((item) => {
        const matched = QUARTER_OPTIONS.find((option) => option.value === item.value);
        return matched || { value: item.value, label: item.label, key: `q${item.value}` };
      });
    }

    const options = QUARTER_OPTIONS.filter((option) =>
      dashboardData.quarterlyAnalysis.some((item) => Number(item[option.key] ?? 0) > 0)
    );

    return options.length ? options : QUARTER_OPTIONS;
  }, [dashboardData.availableQuarters, dashboardData.quarterlyAnalysis]);

  const availableMonthYearOptions = availableAnalysisYearOptions;

  const availableWeekYearOptions = availableAnalysisYearOptions;

  const availableQuarterYearOptions = availableAnalysisYearOptions;

  useEffect(() => {
    if (!availableMonthYearOptions.some((option) => option.value === analysisFilters.monthYear)) {
      setAnalysisFilters((previous) => ({
        ...previous,
        monthYear: availableMonthYearOptions[0]?.value ?? String(new Date().getFullYear()),
      }));
    }
  }, [analysisFilters.monthYear, availableMonthYearOptions]);

  useEffect(() => {
    if (!availableWeekYearOptions.some((option) => option.value === analysisFilters.weekYear)) {
      setAnalysisFilters((previous) => ({
        ...previous,
        weekYear: availableWeekYearOptions[0]?.value ?? String(new Date().getFullYear()),
      }));
    }
  }, [analysisFilters.weekYear, availableWeekYearOptions]);

  useEffect(() => {
    if (!availableQuarterYearOptions.some((option) => option.value === analysisFilters.quarterYear)) {
      setAnalysisFilters((previous) => ({
        ...previous,
        quarterYear: availableQuarterYearOptions[0]?.value ?? String(new Date().getFullYear()),
      }));
    }
  }, [analysisFilters.quarterYear, availableQuarterYearOptions]);

  useEffect(() => {
    const filteredValues = analysisFilters.compareMonths.filter((value) =>
      availableMonthOptions.some((option) => option.value === value)
    );

    if (filteredValues.length !== analysisFilters.compareMonths.length) {
      setAnalysisFilters((previous) => ({
        ...previous,
        compareMonths: filteredValues,
      }));
    }
  }, [analysisFilters.compareMonths, availableMonthOptions]);

  useEffect(() => {
    if (!availableWeekMonthOptions.some((option) => option.value === analysisFilters.weekMonth)) {
      setAnalysisFilters((previous) => ({
        ...previous,
        weekMonth: availableWeekMonthOptions[0]?.value ?? getCurrentMonthValue(),
      }));
    }
  }, [analysisFilters.weekMonth, availableWeekMonthOptions]);

  useEffect(() => {
    const filteredValues = analysisFilters.compareWeeks.filter((value) =>
      availableWeekOptions.some((option) => option.value === value)
    );

    if (filteredValues.length !== analysisFilters.compareWeeks.length) {
      setAnalysisFilters((previous) => ({
        ...previous,
        compareWeeks: filteredValues,
      }));
    }
  }, [analysisFilters.compareWeeks, availableWeekOptions]);

  useEffect(() => {
    const filteredValues = analysisFilters.compareQuarters.filter((value) =>
      availableQuarterOptions.some((option) => option.value === value)
    );

    if (filteredValues.length !== analysisFilters.compareQuarters.length) {
      setAnalysisFilters((previous) => ({
        ...previous,
        compareQuarters: filteredValues,
      }));
    }
  }, [analysisFilters.compareQuarters, availableQuarterOptions]);

  const selectedMonthOptions = useMemo(
    () => (
      analysisFilters.compareMonths.length
        ? availableMonthOptions.filter((option) => analysisFilters.compareMonths.includes(option.value))
        : availableMonthOptions
    ),
    [analysisFilters.compareMonths, availableMonthOptions]
  );

  const selectedWeekOptions = useMemo(
    () => (
      analysisFilters.compareWeeks.length
        ? availableWeekOptions.filter((option) => analysisFilters.compareWeeks.includes(option.value))
        : availableWeekOptions
    ),
    [analysisFilters.compareWeeks, availableWeekOptions]
  );

  const selectedQuarterOptions = useMemo(
    () => (
      analysisFilters.compareQuarters.length
        ? availableQuarterOptions.filter((option) => analysisFilters.compareQuarters.includes(option.value))
        : availableQuarterOptions
    ),
    [analysisFilters.compareQuarters, availableQuarterOptions]
  );

  const summaryPills = useMemo(() => {
    const totalDemands = dashboardData.overallMetrics.find((item) => item.metric === 'Total Demands')?.value ?? 0;
    const openDemands = dashboardData.overallMetrics.find((item) => item.metric === 'Open Demands')?.value ?? 0;
    const onboarded = dashboardData.overallMetrics.find((item) => item.metric === 'Profiles Onboarded')?.value ?? 0;

    return [
      { label: 'Total Demands', value: totalDemands },
      { label: 'Open Demands', value: openDemands },
      { label: 'Profiles Onboarded', value: onboarded },
    ];
  }, [dashboardData.overallMetrics]);

  const metricColumns = [
    { key: 'metric', label: 'Metric' },
    { key: 'value', label: 'Value', render: (value) => metricValue(value) },
  ];

  const ageingColumns = [
    { key: 'age_range', label: 'Age Range' },
    {
      key: 'demand_count',
      label: 'Demand Count',
      render: (value, row) => (
        Number(value ?? 0) > 0 ? (
          <button
            type="button"
            className="executive-link-button"
            onClick={() => handleOpenAgeingDetails(row.age_range, value)}
          >
            {metricValue(value)}
          </button>
        ) : metricValue(value)
      ),
    },
    { key: 'total_positions', label: 'Total Positions', render: (value) => metricValue(value) },
  ];

  const taColumns = [
    { key: 'profiles_sourced_current_month', label: 'Profiles Sourced Current Month', render: (value) => metricValue(value) },
    { key: 'internal_interview_count', label: 'Internal Interview Count', render: (value) => metricValue(value) },
    { key: 'customer_submitted_count', label: 'Customer Submitted Count', render: (value) => metricValue(value) },
    { key: 'customer_interview_count', label: 'Customer Interview Count', render: (value) => metricValue(value) },
    { key: 'customer_select_count', label: 'Customer Select Count', render: (value) => metricValue(value) },
    { key: 'customer_reject_count', label: 'Customer Reject Count', render: (value) => metricValue(value) },
  ];

  const taPerformanceColumns = [
    { key: 'ta', label: 'Ta', render: (value) => safeText(value) },
    { key: 'demands_worked', label: 'Demands Worked', render: (value) => metricValue(value) },
    { key: 'sourced_count', label: 'Sourced Count', render: (value) => metricValue(value) },
    { key: 'internal_evaluation', label: 'Internal Evaluation', render: (value) => metricValue(value) },
    { key: 'client_submission', label: 'Client Submission', render: (value) => metricValue(value) },
    { key: 'client_rejection', label: 'Client Rejection', render: (value) => metricValue(value) },
    { key: 'closure', label: 'Closure', render: (value) => metricValue(value) },
    { key: 'customer_pending', label: 'Customer Pending', render: (value) => metricValue(value) },
    { key: 'customer_hold', label: 'Customer Hold', render: (value) => metricValue(value) },
    { key: 'backout', label: 'Backout', render: (value) => metricValue(value) },
  ];

  const taScoreColumns = [
    { key: 'ta', label: 'Ta', render: (value) => safeText(value) },
    { key: 'internal_eval', label: 'Internal Eval', render: (value) => metricValue(value) },
    { key: 'client_submission', label: 'Client Submission', render: (value) => metricValue(value) },
    { key: 'client_rejection', label: 'Client Rejection', render: (value) => metricValue(value) },
    { key: 'closure', label: 'Closure', render: (value) => metricValue(value) },
    { key: 'rejection_rate', label: 'Rejection Rate %', render: (value) => safeText(value) },
    { key: 'quality_score', label: 'Quality Score %', render: (value) => safeText(value) },
    { key: 'submission_score', label: 'Submission Score %', render: (value) => safeText(value) },
    { key: 'closure_score', label: 'Closure Score %', render: (value) => safeText(value) },
    { key: 'final_score', label: 'Final Score %', render: (value) => safeText(value) },
  ];

  const monthlyAnalysisRows = useMemo(
    () =>
      dashboardData.monthlyAnalysis.map((item) => {
        const row = {
          metric: formatMetricLabel(item.metric),
        };

        selectedMonthOptions.forEach((option) => {
          row[option.value] = item[option.key] ?? 0;
        });

        return row;
      }),
    [dashboardData.monthlyAnalysis, selectedMonthOptions]
  );

  const weeklyAnalysisRows = useMemo(
    () =>
      dashboardData.weeklyAnalysis.map((item) => {
        const row = {
          metric: formatMetricLabel(item.metric),
        };

        selectedWeekOptions.forEach((option) => {
          row[option.value] = item[option.key] ?? 0;
        });

        return row;
      }),
    [dashboardData.weeklyAnalysis, selectedWeekOptions]
  );

  const quarterlyAnalysisRows = useMemo(
    () =>
      dashboardData.quarterlyAnalysis.map((item) => {
        const row = {
          metric: formatMetricLabel(item.metric),
        };

        selectedQuarterOptions.forEach((option) => {
          row[option.value] = item[option.key] ?? 0;
        });

        return row;
      }),
    [dashboardData.quarterlyAnalysis, selectedQuarterOptions]
  );

  const monthAnalysisColumns = useMemo(
    () => [
      { key: 'metric', label: 'Metric' },
      ...selectedMonthOptions.map((option) => ({
        key: option.value,
        label: option.label.slice(0, 3),
        render: (value) => metricValue(value),
      })),
    ],
    [selectedMonthOptions]
  );

  const weekAnalysisColumns = useMemo(
    () => [
      { key: 'metric', label: 'Metric' },
      ...selectedWeekOptions.map((option) => ({
        key: option.value,
        label: option.label.replace(/\s+/g, ''),
        render: (value) => metricValue(value),
      })),
    ],
    [selectedWeekOptions]
  );

  const quarterAnalysisColumns = useMemo(
    () => [
      { key: 'metric', label: 'Metric' },
      ...selectedQuarterOptions.map((option) => ({
        key: option.value,
        label: option.label,
        render: (value) => metricValue(value),
      })),
    ],
    [selectedQuarterOptions]
  );

  return (
    <div className="executive-dashboard-page">
      <div className="executive-dashboard-shell">
        <div className="executive-dashboard-panel">
          <div className="executive-dashboard-filter-bar">
            <div className="executive-dashboard-filter-title">
              <Filter size={16} />
              <span>Filters</span>
            </div>

            <div className="executive-dashboard-filters">
              <div className="filter-group">
                <label className="form-label">Customer</label>
                <select
                  className="form-select"
                  value={filters.customer}
                  onChange={(event) => handleFilterChange('customer', event.target.value)}
                  disabled={loadingFilters}
                >
                  <option value="All">All</option>
                  {customerOptions.map((customer) => (
                    <option key={customer.value} value={customer.value}>
                      {customer.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="form-label">Demand Type</label>
                <select
                  className="form-select"
                  value={filters.demandType}
                  onChange={(event) => handleFilterChange('demandType', event.target.value)}
                  disabled={loadingFilters}
                >
                  <option value="All">All</option>
                  {demandTypeOptions.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="form-label">Year</label>
                <select
                  className="form-select"
                  value={filters.year}
                  onChange={(event) => handleFilterChange('year', event.target.value)}
                >
                  <option value="All">All</option>
                  {yearOptions.map((year) => (
                    <option key={year.value} value={year.value}>
                      {year.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="executive-dashboard-actions">
              <button className="btn-secondary" onClick={handleReset}>
                <RefreshCw size={15} />
                Reset
              </button>
            </div>
          </div>

          <div className="executive-dashboard-tabs">
            <button
              type="button"
              className={`executive-dashboard-tab ${activeTab === DATA_TAB ? 'active' : ''}`}
              onClick={() => setActiveTab(DATA_TAB)}
            >
              Data Representation
            </button>
            <button
              type="button"
              className={`executive-dashboard-tab ${activeTab === TA_TAB ? 'active' : ''}`}
              onClick={() => setActiveTab(TA_TAB)}
            >
              TA Performance Report
            </button>
          </div>

          {activeTab === DATA_TAB ? (
            <>
              <div className="executive-dashboard-grid">
                <ReportTable
                  title="Over All Demand Metrics"
                  columns={metricColumns}
                  rows={overallRows}
                  accentClass="accent-amber"
                  loading={sectionLoading.summary}
                  errorMessage={sectionErrors.summary}
                />
                <ReportTable
                  title="Current Month Demand Metrics"
                  columns={metricColumns}
                  rows={currentMonthRows}
                  accentClass="accent-amber"
                  loading={sectionLoading.summary}
                  errorMessage={sectionErrors.summary}
                />
                <ReportTable
                  title="Current Week Demand Metrics"
                  columns={metricColumns}
                  rows={currentWeekRows}
                  accentClass="accent-amber"
                  loading={sectionLoading.summary}
                  errorMessage={sectionErrors.summary}
                />
                <ReportTable
                  title="Demand Ageing Metrics"
                  columns={ageingColumns}
                  rows={ageingRows}
                  accentClass="accent-amber"
                  loading={sectionLoading.summary}
                  errorMessage={sectionErrors.summary}
                />
              </div>

              <ReportTable
                title="Profile Interview Status Count - Current Month"
                columns={taColumns}
                rows={taRows}
                accentClass="accent-emerald executive-report-card-full"
                loading={sectionLoading.summary}
                errorMessage={sectionErrors.summary}
              />

              <OpenDemandSummaryTable
                rows={openDemandSummaryRows}
                currentPage={openDemandPage}
                onPageChange={setOpenDemandPage}
                loading={sectionLoading.openDemands}
                errorMessage={sectionErrors.openDemands}
              />

              <section className="executive-analysis-panel">
                <div className="executive-analysis-panel-header">
                  <h3>Analysis Report</h3>
                </div>

                <div className="executive-analysis-grid">
                  <AnalysisTableCard
                    title="Month Analysis"
                    accentClass="accent-violet"
                    columns={monthAnalysisColumns}
                    rows={monthlyAnalysisRows}
                    loading={sectionLoading.analysis}
                    errorMessage={sectionErrors.analysis}
                    filters={
                      <>
                        <div className="executive-analysis-filter">
                          <label className="form-label">Year</label>
                          <select
                            className="form-select"
                            value={analysisFilters.monthYear}
                            onChange={(event) => handleAnalysisFilterChange('monthYear', event.target.value)}
                          >
                            {availableMonthYearOptions.map((year) => (
                              <option key={year.value} value={year.value}>
                                {year.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <MultiSelectDropdown
                          label="Month"
                          options={availableMonthOptions}
                          selectedValues={analysisFilters.compareMonths}
                          onChange={(values) => handleAnalysisFilterChange('compareMonths', values)}
                          placeholder="Select months"
                        />
                      </>
                    }
                  />

                  <AnalysisTableCard
                    title="Week Analysis"
                    accentClass="accent-violet"
                    columns={weekAnalysisColumns}
                    rows={weeklyAnalysisRows}
                    loading={sectionLoading.analysis}
                    errorMessage={sectionErrors.analysis}
                    filters={
                      <>
                        <div className="executive-analysis-filter">
                          <label className="form-label">Year</label>
                          <select
                            className="form-select"
                            value={analysisFilters.weekYear}
                            onChange={(event) => handleAnalysisFilterChange('weekYear', event.target.value)}
                          >
                            {availableWeekYearOptions.map((year) => (
                              <option key={year.value} value={year.value}>
                                {year.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="executive-analysis-filter">
                          <label className="form-label">Month</label>
                          <select
                            className="form-select"
                            value={analysisFilters.weekMonth}
                            onChange={(event) => handleAnalysisFilterChange('weekMonth', event.target.value)}
                          >
                            {availableWeekMonthOptions.map((month) => (
                              <option key={month.value} value={month.value}>
                                {month.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <MultiSelectDropdown
                          label="Week"
                          options={availableWeekOptions}
                          selectedValues={analysisFilters.compareWeeks}
                          onChange={(values) => handleAnalysisFilterChange('compareWeeks', values)}
                          placeholder="Select weeks"
                        />
                      </>
                    }
                  />

                  <AnalysisTableCard
                    title="Quarter Analysis"
                    accentClass="accent-violet"
                    columns={quarterAnalysisColumns}
                    rows={quarterlyAnalysisRows}
                    loading={sectionLoading.analysis}
                    errorMessage={sectionErrors.analysis}
                    filters={
                      <>
                        <div className="executive-analysis-filter">
                          <label className="form-label">Year</label>
                          <select
                            className="form-select"
                            value={analysisFilters.quarterYear}
                            onChange={(event) => handleAnalysisFilterChange('quarterYear', event.target.value)}
                          >
                            {availableQuarterYearOptions.map((year) => (
                              <option key={year.value} value={year.value}>
                                {year.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <MultiSelectDropdown
                          label="Quarter"
                          options={availableQuarterOptions}
                          selectedValues={analysisFilters.compareQuarters}
                          onChange={(values) => handleAnalysisFilterChange('compareQuarters', values)}
                          placeholder="Select quarters"
                        />
                      </>
                    }
                  />
                </div>
              </section>
            </>
          ) : (
            <>
              <ReportTable
                title="TA Performance Report"
                columns={taPerformanceColumns}
                rows={dashboardData.taPerformanceReport}
                accentClass="accent-amber executive-report-card-full"
                loading={sectionLoading.ta}
                errorMessage={sectionErrors.ta}
              />

              <ReportTable
                title="TA Score Report"
                columns={taScoreColumns}
                rows={dashboardData.taScoreReport}
                accentClass="accent-amber executive-report-card-full"
                loading={sectionLoading.ta}
                errorMessage={sectionErrors.ta}
              />
            </>
          )}
        </div>
      </div>

      <style>{`
        .executive-dashboard-page {
          min-height: 100%;
          padding: 22px 18px 30px;
          background:
            radial-gradient(circle at top left, rgba(91, 110, 225, 0.1), transparent 22%),
            linear-gradient(180deg, #eef4fb 0%, #f8fafc 46%, #eef2f7 100%);
        }
        .executive-dashboard-shell {
          max-width: 1480px;
          margin: 0 auto;
        }
        .executive-dashboard-hero {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 18px;
          padding: 24px 26px;
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 28px;
          box-shadow: 0 22px 44px rgba(15, 23, 42, 0.08);
        }
        .executive-dashboard-kicker {
          margin-bottom: 8px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #5b6ee1;
        }
        .executive-dashboard-summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(140px, 1fr));
          gap: 12px;
          min-width: 420px;
        }
        .executive-summary-pill {
          padding: 14px 16px;
          border-radius: 20px;
          background: linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
          border: 1px solid rgba(148, 163, 184, 0.16);
        }
        .executive-summary-pill span {
          display: block;
          margin-bottom: 8px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          color: #64748b;
        }
        .executive-summary-pill strong {
          font-size: 28px;
          line-height: 1;
          color: #1e293b;
        }
        .executive-dashboard-panel {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(148, 163, 184, 0.16);
          border-radius: 28px;
          box-shadow: 0 20px 40px rgba(15, 23, 42, 0.06);
          padding: 20px;
        }
        .executive-dashboard-filter-bar {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 18px;
          padding-bottom: 18px;
          position: sticky;
          top: 0;
          z-index: 5;
          margin: -20px -20px 18px;
          padding: 20px 20px 18px;
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(148, 163, 184, 0.18);
        }
        .executive-dashboard-filter-title {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-width: 90px;
          font-size: 14px;
          font-weight: 700;
          color: #334155;
        }
        .executive-dashboard-filters {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(3, minmax(180px, 1fr));
          gap: 18px;
        }
        .executive-dashboard-actions {
          display: flex;
          justify-content: flex-end;
        }
        .executive-dashboard-tabs {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 18px;
          padding-top: 4px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.18);
        }
        .executive-dashboard-tab {
          border: none;
          border-bottom: 3px solid transparent;
          background: transparent;
          color: #475569;
          padding: 10px 12px 11px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s ease;
        }
        .executive-dashboard-tab.active {
          color: #2563eb;
          border-bottom-color: #2563eb;
        }
        .executive-dashboard-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(230px, 1fr));
          gap: 18px;
          margin-bottom: 18px;
        }
        .executive-report-card {
          overflow: hidden;
          border-radius: 22px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          background: #ffffff;
          box-shadow: 0 14px 26px rgba(15, 23, 42, 0.06);
        }
        .executive-report-card-header {
          padding: 14px 18px;
          color: #ffffff;
          font-size: 15px;
          font-weight: 700;
        }
        .executive-report-card-header h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          text-align: center;
        }
        .executive-report-card.accent-amber .executive-report-card-header {
          background: linear-gradient(135deg, #c89b00 0%, #d6aa00 100%);
        }
        .executive-report-card.accent-emerald .executive-report-card-header {
          background: linear-gradient(135deg, #4b9b74 0%, #5ca27f 100%);
        }
        .executive-report-card.accent-violet .executive-report-card-header {
          background: linear-gradient(135deg, #7c69c8 0%, #8a73d4 100%);
        }
        .executive-report-card-full {
          width: 100%;
          margin-top: 18px;
        }
        .executive-analysis-panel {
          margin-top: 18px;
          overflow: hidden;
          border-radius: 22px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          background: #ffffff;
          box-shadow: 0 14px 26px rgba(15, 23, 42, 0.06);
        }
        .executive-analysis-panel-header {
          padding: 14px 18px;
          color: #ffffff;
          background: linear-gradient(135deg, #e76f83 0%, #eb7487 100%);
        }
        .executive-analysis-panel-header h3 {
          margin: 0;
          text-align: center;
          font-size: 15px;
          font-weight: 700;
        }
        .executive-analysis-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(260px, 1fr));
          gap: 18px;
          padding: 20px;
        }
        .executive-analysis-card {
          margin-top: 0;
        }
        .executive-analysis-controls {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          padding: 14px 16px 12px;
        }
        .executive-analysis-filter {
          min-width: 0;
        }
        .executive-multiselect {
          position: relative;
        }
        .executive-multiselect-trigger {
          width: 100%;
          min-height: 46px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 14px;
          border: 1px solid rgba(203, 213, 225, 0.95);
          border-radius: 14px;
          background: #ffffff;
          color: #334155;
          cursor: pointer;
          text-align: left;
        }
        .executive-multiselect-text {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .executive-multiselect-caret {
          flex-shrink: 0;
          color: #64748b;
        }
        .executive-multiselect-menu {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          z-index: 10;
          max-height: 220px;
          overflow-y: auto;
          border: 1px solid rgba(203, 213, 225, 0.95);
          border-radius: 14px;
          background: #ffffff;
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.12);
        }
        .executive-multiselect-option {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          font-size: 14px;
          color: #334155;
          cursor: pointer;
        }
        .executive-multiselect-option + .executive-multiselect-option {
          border-top: 1px solid rgba(226, 232, 240, 0.9);
        }
        .executive-analysis-grid .executive-analysis-card:nth-child(2) .executive-analysis-controls {
          grid-template-columns: 0.95fr 0.95fr 1.1fr;
        }
        .executive-report-table-wrap {
          padding: 0;
          overflow-x: auto;
        }
        .executive-report-table {
          width: 100%;
          border-collapse: collapse;
        }
        .executive-report-table th,
        .executive-report-table td {
          padding: 12px 14px;
          border: 1px solid rgba(226, 232, 240, 0.9);
          font-size: 14px;
        }
        .executive-report-table th {
          background: #ffffff;
          color: #0f172a;
          font-weight: 700;
          text-align: left;
        }
        .executive-report-table td {
          color: #334155;
          background: #f8fafc;
        }
        .executive-demand-title-cell {
          white-space: pre-line;
          min-width: 260px;
          font-weight: 600;
          color: #1e293b !important;
        }
        .executive-demand-group-title {
          white-space: pre-line;
          padding: 14px 16px !important;
          font-weight: 700;
          color: #0f172a !important;
          background: #f8fafc !important;
        }
        .executive-open-demand-table th {
          text-align: center !important;
          color: #2563eb;
        }
        .executive-open-demand-pagination-bar {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(226, 232, 240, 0.9);
          background: #ffffff;
        }
        .executive-open-demand-pagination-text {
          font-size: 14px;
          color: #334155;
        }
        .executive-open-demand-pagination-actions {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .executive-open-demand-page-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: 1px solid rgba(203, 213, 225, 0.95);
          border-radius: 999px;
          background: #ffffff;
          color: #475569;
          cursor: pointer;
          transition: 0.2s ease;
        }
        .executive-open-demand-page-button:hover:not(:disabled) {
          border-color: #94a3b8;
          color: #1e293b;
          background: #f8fafc;
        }
        .executive-open-demand-page-button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .executive-open-demand-table td {
          text-align: center !important;
        }
        .executive-open-demand-table .executive-demand-group-title {
          text-align: left !important;
        }
        .executive-open-demand-merged-cell {
          vertical-align: middle;
          font-weight: 600;
          text-align: center !important;
        }
        .executive-open-demand-count-cell,
        .executive-open-demand-ageing-cell {
          text-align: center !important;
          vertical-align: middle;
        }
        .executive-open-demand-status-cell {
          text-align: center !important;
          vertical-align: middle;
        }
        .executive-open-demand-table th:first-child,
        .executive-open-demand-table td:first-child,
        .executive-open-demand-table th:last-child,
        .executive-open-demand-table td:last-child {
          text-align: center !important;
        }
        .executive-open-demand-table .executive-demand-group-title:first-child,
        .executive-open-demand-table .executive-demand-group-title:last-child {
          text-align: left !important;
        }
        .executive-report-table tbody tr:nth-child(even) td {
          background: #f1f5f9;
        }
        .executive-report-table td:last-child,
        .executive-report-table th:last-child {
          text-align: right;
        }
        .executive-report-table th:first-child,
        .executive-report-table td:first-child {
          text-align: left;
        }
        .executive-report-empty {
          text-align: center !important;
          color: #64748b;
          background: #f8fafc !important;
        }
        .executive-report-error {
          color: #b91c1c;
        }
        .executive-link-button {
          border: none;
          background: transparent;
          padding: 0;
          color: #2563eb;
          font: inherit;
          cursor: pointer;
          text-decoration: underline;
        }
        .executive-link-button:hover {
          color: #1d4ed8;
        }
        .executive-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1200;
          background: rgba(15, 23, 42, 0.42);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .executive-modal {
          width: min(760px, calc(100vw - 32px));
          max-height: min(80vh, 760px);
          display: flex;
          flex-direction: column;
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.2);
          overflow: hidden;
        }
        .executive-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 18px 20px;
          border-bottom: 1px solid rgba(226, 232, 240, 0.9);
        }
        .executive-modal-header h3 {
          margin: 0;
          font-size: 18px;
          color: #0f172a;
        }
        .executive-modal-close {
          width: 36px;
          height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(203, 213, 225, 0.95);
          border-radius: 10px;
          background: #ffffff;
          color: #334155;
          cursor: pointer;
        }
        .executive-modal-body {
          padding: 18px 20px 20px;
          overflow: auto;
        }
        .executive-dashboard-state {
          padding: 40px 24px;
          text-align: center;
          border-radius: 22px;
          background: #ffffff;
          border: 1px solid rgba(148, 163, 184, 0.18);
          color: #334155;
        }
        .executive-dashboard-state.error {
          color: #b91c1c;
          background: rgba(254, 242, 242, 0.92);
        }
        @media (max-width: 1280px) {
          .executive-dashboard-grid {
            grid-template-columns: repeat(2, minmax(260px, 1fr));
          }
          .executive-analysis-grid {
            grid-template-columns: 1fr;
          }
          .executive-dashboard-hero {
            flex-direction: column;
          }
          .executive-dashboard-summary {
            min-width: 0;
            width: 100%;
          }
        }
        @media (max-width: 980px) {
          .executive-dashboard-filter-bar {
            flex-direction: column;
            align-items: stretch;
          }
          .executive-dashboard-filters {
            grid-template-columns: 1fr;
          }
          .executive-dashboard-actions {
            justify-content: flex-start;
          }
        }
        @media (max-width: 760px) {
          .executive-dashboard-page {
            padding: 14px 10px 24px;
          }
          .executive-dashboard-panel,
          .executive-dashboard-hero {
            padding: 16px;
            border-radius: 22px;
          }
          .executive-dashboard-summary,
          .executive-dashboard-grid {
            grid-template-columns: 1fr;
          }
          .executive-analysis-grid {
            grid-template-columns: 1fr;
            padding: 14px;
          }
          .executive-analysis-controls,
          .executive-analysis-grid .executive-analysis-card:nth-child(2) .executive-analysis-controls {
            grid-template-columns: 1fr;
          }
          .executive-dashboard-tabs {
            overflow-x: auto;
          }
          .executive-dashboard-tab {
            white-space: nowrap;
          }
        }
      `}</style>

      <DemandAgeingDetailsModal
        open={ageingDetailsOpen}
        title={selectedAgeRange ? `Demand Details - ${selectedAgeRange}` : 'Demand Details'}
        rows={ageingDetailRows}
        loading={ageingDetailsLoading}
        errorMessage={ageingDetailsError}
        onClose={handleCloseAgeingDetails}
      />
    </div>
  );
};

export default ExecutiveDashboardPage;
