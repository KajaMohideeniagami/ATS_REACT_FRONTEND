import React, { useEffect, useMemo, useState } from 'react';
import { Filter, RefreshCw } from 'lucide-react';
import { toast } from '../../toast/index';
import {
  getExecutiveDashboardCustomers,
  getExecutiveDashboardDemandTypes,
  getExecutiveDashboardData,
  getExecutiveDashboardTaData,
} from '../../../services/executiveDashboardService';
import '../../../global.css';

const DATA_TAB = 'data';
const TA_TAB = 'ta';
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

const EMPTY_EXECUTIVE_DATA = {
  overallMetrics: [],
  currentMonthMetrics: [],
  currentWeekMetrics: [],
  demandAgeingMetrics: [],
  openDemandsSummary: [],
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

const ReportTable = ({ title, columns, rows, accentClass = '' }) => (
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
          {rows.length === 0 ? (
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

const OpenDemandSummaryTable = ({ rows }) => (
  <section className="executive-report-card accent-emerald executive-report-card-full">
    <div className="executive-report-card-header">
      <h3>Demand - Profile Summary (Open Demands)</h3>
    </div>

    <div className="executive-report-table-wrap">
      <table className="executive-report-table">
        <thead>
          <tr>
            <th>Open Demands List</th>
            <th>No Of Position</th>
            <th>No Of Profiles Submitted</th>
            <th>Profile Status</th>
            <th>Profiles In Pipeline</th>
            <th>Total Profiles Except Pipeline</th>
            <th>Profile Status Ageing</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="executive-report-empty" colSpan={7}>
                No data available for the selected filters.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={`open-demand-${index}`}>
                <td className="executive-demand-title-cell">{safeText(row.open_demands_list)}</td>
                <td>{metricValue(row.no_of_position)}</td>
                <td>{metricValue(row.no_of_profiles)}</td>
                <td>{safeText(row.profile_status)}</td>
                <td>{metricValue(row.profiles_in_pipeline)}</td>
                <td>{metricValue(row.total_profiles_except_pipeline)}</td>
                <td>{metricValue(row.ageing_days)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </section>
);

const AnalysisTableCard = ({
  title,
  accentClass,
  filters,
  columns,
  rows,
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
          {rows.length === 0 ? (
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

const ExecutiveDashboardPage = () => {
  const [activeTab, setActiveTab] = useState(DATA_TAB);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  const [customerOptions, setCustomerOptions] = useState([]);
  const [demandTypeOptions, setDemandTypeOptions] = useState([]);
  const [filters, setFilters] = useState({
    customer: 'All',
    demandType: 'All',
    year: String(new Date().getFullYear()),
  });
  const [analysisFilters, setAnalysisFilters] = useState({
    monthYear: String(new Date().getFullYear()),
    month: getCurrentMonthValue(),
    weekYear: String(new Date().getFullYear()),
    weekMonth: getCurrentMonthValue(),
    week: 'All',
    quarterYear: String(new Date().getFullYear()),
    quarter: getCurrentQuarterValue(),
  });
  const [dashboardData, setDashboardData] = useState(EMPTY_EXECUTIVE_DATA);

  const yearOptions = useMemo(buildYearOptions, []);
  const activeRequestKey = activeTab === DATA_TAB
    ? JSON.stringify({ filters, analysisFilters, activeTab })
    : JSON.stringify({ filters, activeTab });

  useEffect(() => {
    const loadFilters = async () => {
      try {
        setLoadingFilters(true);

        const [customers, demandTypes] = await Promise.all([
          getExecutiveDashboardCustomers(),
          getExecutiveDashboardDemandTypes(),
        ]);

        setCustomerOptions(customers);
        setDemandTypeOptions(demandTypes);
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
    const loadDashboard = async () => {
      try {
        setLoadingData(true);
        setError('');
        if (activeTab === DATA_TAB) {
          const data = await getExecutiveDashboardData({
            ...filters,
            analysisMonthYear: analysisFilters.monthYear,
            analysisWeekYear: analysisFilters.weekYear,
            analysisWeekMonth: analysisFilters.weekMonth,
            analysisWeek: analysisFilters.week,
            analysisQuarterYear: analysisFilters.quarterYear,
            analysisQuarter: analysisFilters.quarter,
          });

          setDashboardData((previous) => ({
            ...previous,
            ...data,
          }));
        } else {
          const data = await getExecutiveDashboardTaData(filters);

          setDashboardData((previous) => ({
            ...previous,
            ...data,
          }));
        }
      } catch (fetchError) {
        console.error('Executive dashboard data load error:', fetchError);
        setError(
          activeTab === DATA_TAB
            ? 'Failed to load executive dashboard data.'
            : 'Failed to load TA performance data.'
        );
        toast.error(
          activeTab === DATA_TAB
            ? 'Failed to load executive dashboard data.'
            : 'Failed to load TA performance data.'
        );
      } finally {
        setLoadingData(false);
      }
    };

    loadDashboard();
  }, [activeRequestKey]);

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
      month: getCurrentMonthValue(),
      weekYear: String(new Date().getFullYear()),
      weekMonth: getCurrentMonthValue(),
      week: 'All',
      quarterYear: String(new Date().getFullYear()),
      quarter: getCurrentQuarterValue(),
    });
    toast.success('Executive dashboard filters reset.');
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

  const selectedMonthMeta = useMemo(
    () => MONTH_OPTIONS.find((option) => option.value === analysisFilters.month) || MONTH_OPTIONS[0],
    [analysisFilters.month]
  );

  const selectedWeekMeta = useMemo(
    () => WEEK_OPTIONS.find((option) => option.value === analysisFilters.week) || WEEK_OPTIONS[0],
    [analysisFilters.week]
  );

  const selectedQuarterMeta = useMemo(
    () => QUARTER_OPTIONS.find((option) => option.value === analysisFilters.quarter) || QUARTER_OPTIONS[0],
    [analysisFilters.quarter]
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
    { key: 'demand_count', label: 'Demand Count', render: (value) => metricValue(value) },
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
      dashboardData.monthlyAnalysis.map((item) => ({
        metric: formatMetricLabel(item.metric),
        value: item[selectedMonthMeta.key] ?? 0,
      })),
    [dashboardData.monthlyAnalysis, selectedMonthMeta]
  );

  const weeklyAnalysisRows = useMemo(
    () =>
      dashboardData.weeklyAnalysis.map((item) => ({
        metric: formatMetricLabel(item.metric),
        value:
          selectedWeekMeta.value === 'All'
            ? [item.week1, item.week2, item.week3, item.week4, item.week5].reduce((sum, current) => sum + Number(current || 0), 0)
            : item[selectedWeekMeta.key] ?? 0,
      })),
    [dashboardData.weeklyAnalysis, selectedWeekMeta]
  );

  const quarterlyAnalysisRows = useMemo(
    () =>
      dashboardData.quarterlyAnalysis.map((item) => ({
        metric: formatMetricLabel(item.metric),
        value: item[selectedQuarterMeta.key] ?? 0,
      })),
    [dashboardData.quarterlyAnalysis, selectedQuarterMeta]
  );

  const monthAnalysisColumns = useMemo(
    () => [
      { key: 'metric', label: 'Metric' },
      { key: 'value', label: selectedMonthMeta.label.slice(0, 3), render: (value) => metricValue(value) },
    ],
    [selectedMonthMeta]
  );

  const weekAnalysisColumns = useMemo(
    () => [
      { key: 'metric', label: 'Metric' },
      { key: 'value', label: selectedWeekMeta.label.replace('All ', ''), render: (value) => metricValue(value) },
    ],
    [selectedWeekMeta]
  );

  const quarterAnalysisColumns = useMemo(
    () => [
      { key: 'metric', label: 'Metric' },
      { key: 'value', label: selectedQuarterMeta.label, render: (value) => metricValue(value) },
    ],
    [selectedQuarterMeta]
  );

  return (
    <div className="executive-dashboard-page">
      <div className="executive-dashboard-shell">
        {/* <div className="executive-dashboard-hero">
          <div className="executive-dashboard-hero-copy">
            <h1 className="ats-heading-1">Executive Dashboard</h1>
            <p className="ats-body-small">
              Review demand health, delivery movement, ageing, and TA activity from one place.
            </p>
          </div>

          <div className="executive-dashboard-summary">
            {summaryPills.map((item) => (
              <div key={item.label} className="executive-summary-pill">
                <span>{item.label}</span>
                <strong>{metricValue(item.value)}</strong>
              </div>
            ))}
          </div>
        </div> */}

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

          {loadingData ? (
            <div className="executive-dashboard-state">Loading executive dashboard...</div>
          ) : error ? (
            <div className="executive-dashboard-state error">{error}</div>
          ) : activeTab === DATA_TAB ? (
            <>
              <div className="executive-dashboard-grid">
                <ReportTable
                  title="Over All Demand Metrics"
                  columns={metricColumns}
                  rows={overallRows}
                  accentClass="accent-amber"
                />
                <ReportTable
                  title="Current Month Demand Metrics"
                  columns={metricColumns}
                  rows={currentMonthRows}
                  accentClass="accent-amber"
                />
                <ReportTable
                  title="Current Week Demand Metrics"
                  columns={metricColumns}
                  rows={currentWeekRows}
                  accentClass="accent-amber"
                />
                <ReportTable
                  title="Demand Ageing Metrics"
                  columns={ageingColumns}
                  rows={ageingRows}
                  accentClass="accent-amber"
                />
              </div>

              <ReportTable
                title="Profile Interview Status Count - Current Month"
                columns={taColumns}
                rows={taRows}
                accentClass="accent-emerald executive-report-card-full"
              />

              <OpenDemandSummaryTable rows={openDemandSummaryRows} />

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
                    filters={
                      <>
                        <div className="executive-analysis-filter">
                          <label className="form-label">Year</label>
                          <select
                            className="form-select"
                            value={analysisFilters.monthYear}
                            onChange={(event) => handleAnalysisFilterChange('monthYear', event.target.value)}
                          >
                            {yearOptions.map((year) => (
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
                            value={analysisFilters.month}
                            onChange={(event) => handleAnalysisFilterChange('month', event.target.value)}
                          >
                            {MONTH_OPTIONS.map((month) => (
                              <option key={month.value} value={month.value}>
                                {month.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    }
                  />

                  <AnalysisTableCard
                    title="Week Analysis"
                    accentClass="accent-violet"
                    columns={weekAnalysisColumns}
                    rows={weeklyAnalysisRows}
                    filters={
                      <>
                        <div className="executive-analysis-filter">
                          <label className="form-label">Year</label>
                          <select
                            className="form-select"
                            value={analysisFilters.weekYear}
                            onChange={(event) => handleAnalysisFilterChange('weekYear', event.target.value)}
                          >
                            {yearOptions.map((year) => (
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
                            {MONTH_OPTIONS.map((month) => (
                              <option key={month.value} value={month.value}>
                                {month.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="executive-analysis-filter">
                          <label className="form-label">Week</label>
                          <select
                            className="form-select"
                            value={analysisFilters.week}
                            onChange={(event) => handleAnalysisFilterChange('week', event.target.value)}
                          >
                            {WEEK_OPTIONS.map((week) => (
                              <option key={week.value} value={week.value}>
                                {week.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    }
                  />

                  <AnalysisTableCard
                    title="Quarter Analysis"
                    accentClass="accent-violet"
                    columns={quarterAnalysisColumns}
                    rows={quarterlyAnalysisRows}
                    filters={
                      <>
                        <div className="executive-analysis-filter">
                          <label className="form-label">Year</label>
                          <select
                            className="form-select"
                            value={analysisFilters.quarterYear}
                            onChange={(event) => handleAnalysisFilterChange('quarterYear', event.target.value)}
                          >
                            {yearOptions.map((year) => (
                              <option key={year.value} value={year.value}>
                                {year.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="executive-analysis-filter">
                          <label className="form-label">Quarter</label>
                          <select
                            className="form-select"
                            value={analysisFilters.quarter}
                            onChange={(event) => handleAnalysisFilterChange('quarter', event.target.value)}
                          >
                            {QUARTER_OPTIONS.map((quarter) => (
                              <option key={quarter.value} value={quarter.value}>
                                {quarter.label}
                              </option>
                            ))}
                          </select>
                        </div>
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
              />

              <ReportTable
                title="TA Score Report"
                columns={taScoreColumns}
                rows={dashboardData.taScoreReport}
                accentClass="accent-amber executive-report-card-full"
              />
            </>
          )}
        </div>
      </div>

      <style>{`
        .executive-dashboard-page {
          min-height: 100vh;
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
    </div>
  );
};

export default ExecutiveDashboardPage;
