import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS, LOV_ENDPOINTS } from '../config/apiConfig';

const executiveDashboardApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

const extractList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.records)) return payload.records;
  return [];
};

const normalizeOption = (item) => {
  const value = item?.value
    ?? item?.r
    ?? item?.id
    ?? item?.customer_id
    ?? item?.customerId
    ?? item?.return_value
    ?? item?.returnValue
    ?? item?.code
    ?? item?.demand_type
    ?? item?.label;

  const label = item?.label
    ?? item?.display_value
    ?? item?.display
    ?? item?.d
    ?? item?.display_label
    ?? item?.displayLabel
    ?? item?.customer_name
    ?? item?.customerName
    ?? item?.name
    ?? item?.text
    ?? item?.value;

  if (value == null && label == null) return null;

  return {
    value: String(value ?? label),
    label: String(label ?? value),
  };
};

const normalizeMetricRow = (row) => ({
  metric: String(
    row?.metric
    ?? row?.METRIC
    ?? row?.label
    ?? row?.LABEL
    ?? ''
  ),
  value: Number(
    row?.value
    ?? row?.VALUE
    ?? row?.count
    ?? row?.COUNT
    ?? 0
  ),
});

const normalizeAgeingRow = (row) => ({
  age_range: String(row?.age_range ?? row?.AGE_RANGE ?? ''),
  demand_count: Number(row?.demand_count ?? row?.DEMAND_COUNT ?? 0),
  total_positions: Number(row?.total_positions ?? row?.TOTAL_POSITIONS ?? 0),
});

const normalizeTaPerformance = (row = {}) => ({
  profiles_sourced_current_month: Number(
    row?.profiles_sourced_current_month
    ?? row?.PROFILES_SOURCED_CURRENT_MONTH
    ?? 0
  ),
  internal_interview_count: Number(
    row?.internal_interview_count
    ?? row?.INTERNAL_INTERVIEW_COUNT
    ?? 0
  ),
  customer_submitted_count: Number(
    row?.customer_submitted_count
    ?? row?.CUSTOMER_SUBMITTED_COUNT
    ?? 0
  ),
  customer_interview_count: Number(
    row?.customer_interview_count
    ?? row?.CUSTOMER_INTERVIEW_COUNT
    ?? 0
  ),
  customer_select_count: Number(
    row?.customer_select_count
    ?? row?.CUSTOMER_SELECT_COUNT
    ?? 0
  ),
  customer_reject_count: Number(
    row?.customer_reject_count
    ?? row?.CUSTOMER_REJECT_COUNT
    ?? 0
  ),
});

const normalizeOpenDemandSummaryRow = (row) => ({
  open_demands_list: String(row?.open_demands_list ?? row?.OPEN_DEMANDS_LIST ?? ''),
  no_of_position: Number(row?.no_of_position ?? row?.NO_OF_POSITION ?? 0),
  no_of_profiles: Number(row?.no_of_profiles ?? row?.NO_OF_PROFILES ?? 0),
  profile_status: String(row?.profile_status ?? row?.PROFILE_STATUS ?? ''),
  profiles_in_pipeline: Number(row?.profiles_in_pipeline ?? row?.PROFILES_IN_PIPELINE ?? 0),
  total_profiles_except_pipeline: Number(
    row?.total_profiles_except_pipeline ?? row?.TOTAL_PROFILES_EXCEPT_PIPELINE ?? 0
  ),
  ageing_days: Number(row?.ageing_days ?? row?.AGEING_DAYS ?? 0),
});

const normalizeTaPerformanceRow = (row = {}) => ({
  ta: String(row?.ta ?? row?.TA ?? ''),
  demands_worked: Number(row?.demands_worked ?? row?.DEMANDS_WORKED ?? 0),
  sourced_count: Number(row?.sourced_count ?? row?.SOURCED_COUNT ?? 0),
  internal_evaluation: Number(row?.internal_evaluation ?? row?.INTERNAL_EVALUATION ?? 0),
  client_submission: Number(row?.client_submission ?? row?.CLIENT_SUBMISSION ?? 0),
  client_rejection: Number(row?.client_rejection ?? row?.CLIENT_REJECTION ?? 0),
  closure: Number(row?.closure ?? row?.CLOSURE ?? 0),
  customer_pending: Number(row?.customer_pending ?? row?.CUSTOMER_PENDING ?? 0),
  customer_hold: Number(row?.customer_hold ?? row?.CUSTOMER_HOLD ?? 0),
  backout: Number(row?.backout ?? row?.BACKOUT ?? 0),
});

const normalizeTaScoreRow = (row = {}) => ({
  ta: String(row?.ta ?? row?.TA ?? ''),
  internal_eval: Number(row?.internal_eval ?? row?.INTERNAL_EVAL ?? 0),
  client_submission: Number(row?.client_submission ?? row?.CLIENT_SUBMISSION ?? 0),
  client_rejection: Number(row?.client_rejection ?? row?.CLIENT_REJECTION ?? 0),
  closure: Number(row?.closure ?? row?.CLOSURE ?? 0),
  rejection_rate: String(row?.rejection_rate ?? row?.REJECTION_RATE ?? '-'),
  quality_score: String(row?.quality_score ?? row?.QUALITY_SCORE ?? '-'),
  submission_score: String(row?.submission_score ?? row?.SUBMISSION_SCORE ?? '-'),
  closure_score: String(row?.closure_score ?? row?.CLOSURE_SCORE ?? '-'),
  final_score: String(row?.final_score ?? row?.FINAL_SCORE ?? '-'),
});

const normalizeAnalysisRow = (row = {}) => ({
  metric: String(row?.metric ?? row?.METRIC ?? ''),
  jan: Number(row?.jan ?? row?.JAN ?? 0),
  feb: Number(row?.feb ?? row?.FEB ?? 0),
  mar: Number(row?.mar ?? row?.MAR ?? 0),
  apr: Number(row?.apr ?? row?.APR ?? 0),
  may: Number(row?.may ?? row?.MAY ?? 0),
  jun: Number(row?.jun ?? row?.JUN ?? 0),
  jul: Number(row?.jul ?? row?.JUL ?? 0),
  aug: Number(row?.aug ?? row?.AUG ?? 0),
  sep: Number(row?.sep ?? row?.SEP ?? 0),
  oct: Number(row?.oct ?? row?.OCT ?? 0),
  nov: Number(row?.nov ?? row?.NOV ?? 0),
  dec: Number(row?.dec ?? row?.DEC ?? 0),
  week1: Number(row?.week1 ?? row?.WEEK1 ?? 0),
  week2: Number(row?.week2 ?? row?.WEEK2 ?? 0),
  week3: Number(row?.week3 ?? row?.WEEK3 ?? 0),
  week4: Number(row?.week4 ?? row?.WEEK4 ?? 0),
  week5: Number(row?.week5 ?? row?.WEEK5 ?? 0),
  q1: Number(row?.q1 ?? row?.Q1 ?? 0),
  q2: Number(row?.q2 ?? row?.Q2 ?? 0),
  q3: Number(row?.q3 ?? row?.Q3 ?? 0),
  q4: Number(row?.q4 ?? row?.Q4 ?? 0),
});

const buildParams = ({
  customer,
  demandType,
  year,
  analysisMonthYear,
  analysisWeekYear,
  analysisWeekMonth,
  analysisWeek,
  analysisQuarterYear,
  analysisQuarter,
} = {}) => {
  const params = {};

  if (customer && customer !== 'All') {
    params.customer = customer;
  }

  if (demandType && demandType !== 'All') {
    params.demand_type = demandType;
  }

  if (year && year !== 'All') {
    params.year = year;
  }

  if (analysisMonthYear && analysisMonthYear !== 'All') {
    params.analysis_month_year = analysisMonthYear;
  }

  if (analysisWeekYear && analysisWeekYear !== 'All') {
    params.analysis_week_year = analysisWeekYear;
  }

  if (analysisWeekMonth && analysisWeekMonth !== 'All') {
    params.analysis_week_month = analysisWeekMonth;
  }

  if (analysisWeek && analysisWeek !== 'All') {
    params.analysis_week = analysisWeek;
  }

  if (analysisQuarterYear && analysisQuarterYear !== 'All') {
    params.analysis_quarter_year = analysisQuarterYear;
  }

  if (analysisQuarter && analysisQuarter !== 'All') {
    params.analysis_quarter = analysisQuarter;
  }

  return params;
};

export const getExecutiveDashboardCustomers = async () => {
  const response = await executiveDashboardApi.get(API_ENDPOINTS.DEMAND_REPORT_CUSTOMERS);

  return extractList(response.data)
    .map(normalizeOption)
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label));
};

export const getExecutiveDashboardDemandTypes = async () => {
  const response = await executiveDashboardApi.get(LOV_ENDPOINTS.DEMAND_TYPES);

  return extractList(response.data)
    .map(normalizeOption)
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label));
};

export const getExecutiveDashboardData = async (filters = {}) => {
  const commonParams = buildParams(filters);
  const analysisParams = buildParams({
    customer: filters.customer,
    demandType: filters.demandType,
    year: filters.year,
    analysisMonthYear: filters.analysisMonthYear,
    analysisWeekYear: filters.analysisWeekYear,
    analysisWeekMonth: filters.analysisWeekMonth,
    analysisWeek: filters.analysisWeek,
    analysisQuarterYear: filters.analysisQuarterYear,
    analysisQuarter: filters.analysisQuarter,
  });

  const [summaryResponse, openDemandsResponse, analysisResponse] = await Promise.all([
    executiveDashboardApi.get(API_ENDPOINTS.EXECUTIVE_DASHBOARD_SUMMARY, {
      params: commonParams,
    }),
    executiveDashboardApi.get(API_ENDPOINTS.EXECUTIVE_DASHBOARD_OPEN_DEMANDS, {
      params: commonParams,
    }),
    executiveDashboardApi.get(API_ENDPOINTS.EXECUTIVE_DASHBOARD_ANALYSIS, {
      params: analysisParams,
    }),
  ]);

  const summaryPayload = summaryResponse.data || {};
  const openDemandsPayload = openDemandsResponse.data || {};
  const analysisPayload = analysisResponse.data || {};
  const rawTaPerformance = summaryPayload.ta_performance ?? summaryPayload.TA_PERFORMANCE;
  const taPerformanceRow = Array.isArray(rawTaPerformance)
    ? rawTaPerformance[0]
    : rawTaPerformance;

  return {
    overallMetrics: extractList(summaryPayload.overall_metrics ?? summaryPayload.OVERALL_METRICS).map(normalizeMetricRow),
    currentMonthMetrics: extractList(summaryPayload.current_month_metrics ?? summaryPayload.CURRENT_MONTH_METRICS).map(normalizeMetricRow),
    currentWeekMetrics: extractList(summaryPayload.current_week_metrics ?? summaryPayload.CURRENT_WEEK_METRICS).map(normalizeMetricRow),
    demandAgeingMetrics: extractList(summaryPayload.demand_ageing_metrics ?? summaryPayload.DEMAND_AGEING_METRICS).map(normalizeAgeingRow),
    openDemandsSummary: extractList(openDemandsPayload.open_demands_summary ?? openDemandsPayload.OPEN_DEMANDS_SUMMARY).map(normalizeOpenDemandSummaryRow),
    taPerformance: normalizeTaPerformance(taPerformanceRow ?? {}),
    monthlyAnalysis: extractList(analysisPayload.monthly_analysis ?? analysisPayload.MONTHLY_ANALYSIS).map(normalizeAnalysisRow),
    weeklyAnalysis: extractList(analysisPayload.weekly_analysis ?? analysisPayload.WEEKLY_ANALYSIS).map(normalizeAnalysisRow),
    quarterlyAnalysis: extractList(analysisPayload.quarterly_analysis ?? analysisPayload.QUARTERLY_ANALYSIS).map(normalizeAnalysisRow),
    taPerformanceReport: [],
    taScoreReport: [],
  };
};

export const getExecutiveDashboardTaData = async (filters = {}) => {
  const response = await executiveDashboardApi.get(API_ENDPOINTS.EXECUTIVE_DASHBOARD_TA, {
    params: buildParams(filters),
  });

  const payload = response.data || {};

  return {
    taPerformanceReport: extractList(payload.ta_performance_report ?? payload.TA_PERFORMANCE_REPORT).map(normalizeTaPerformanceRow),
    taScoreReport: extractList(payload.ta_score_report ?? payload.TA_SCORE_REPORT).map(normalizeTaScoreRow),
  };
};
