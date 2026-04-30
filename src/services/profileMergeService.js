import api from './api';
import { API_ENDPOINTS } from '../config/apiConfig';
import { getCandidateDatabaseRows } from './candidateDatabaseService';
import { getProfileReportCustomers } from './profileReportService';
import { getCustomerDetails } from './customerDetailService';

const getValue = (row, keys, fallback = '') => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return fallback;
};

const normalizeText = (value, fallback = '-') => {
  if (value === 0 || value === '0') return '0';
  const text = String(value ?? '').trim();
  return text || fallback;
};

const toIsoDate = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
};

const normalizeAtsProfile = (row) => ({
  id: String(getValue(row, ['profile_id', 'profileId', 'id'], '')),
  profile_id: getValue(row, ['profile_id', 'profileId', 'id'], ''),
  profile_code: normalizeText(getValue(row, ['profile_code', 'profileCode']), ''),
  profile_name: normalizeText(getValue(row, ['profile_name', 'profileName', 'candidate_name']), 'Untitled Profile'),
  profile_email: normalizeText(getValue(row, ['profile_email', 'profileEmail']), ''),
  profile_contact_no: normalizeText(getValue(row, ['profile_contact_no', 'profileContactNo']), ''),
  current_company: normalizeText(getValue(row, ['current_company', 'currentCompany']), ''),
  current_location: normalizeText(getValue(row, ['current_location', 'currentLocation']), ''),
  preferred_location: normalizeText(getValue(row, ['preferred_location', 'preferredLocation']), ''),
  work_exp_in_years: getValue(row, ['work_exp_in_years', 'workExpInYears'], ''),
  relevant_exp_in_years: getValue(row, ['relevant_exp_in_years', 'relevantExpInYears'], ''),
  profile_availability: normalizeText(getValue(row, ['profile_availability', 'profileAvailability']), ''),
  current_salary: normalizeText(getValue(row, ['current_salary', 'current_salary_pa', 'currentSalary']), ''),
  expected_salary: normalizeText(getValue(row, ['expected_salary', 'expected_salary_pa', 'expectedSalary']), ''),
  match_score: normalizeText(getValue(row, ['match_score', 'ai_profile_score', 'AI_PROFILE_SCORE']), ''),
  file_name: normalizeText(getValue(row, ['file_name', 'FILE_NAME']), ''),
  profile_url: normalizeText(getValue(row, ['profile_url', 'PROFILE_URL']), ''),
  upload_date: toIsoDate(
    getValue(row, ['profile_date', 'profileDate', 'profile_update_date', 'updated', 'created_at'], '')
  ),
  source: 'ATS',
  source_type: 'ATS',
  raw: row,
});

const normalizeUploadedProfile = (row) => ({
  id: String(getValue(row, ['upload_id', 'UPLOAD_ID', 'id', 'object_name', 'file_name', 'profile_name'], '')),
  upload_id: getValue(row, ['upload_id', 'UPLOAD_ID', 'id'], ''),
  profile_id: getValue(row, ['profile_id', 'profileId'], ''),
  profile_code: normalizeText(getValue(row, ['profile_code', 'profileCode']), ''),
  profile_name: normalizeText(
    getValue(row, ['profile_name', 'candidate_name', 'file_name', 'object_name'], ''),
    'Uploaded Profile'
  ),
  profile_email: normalizeText(getValue(row, ['profile_email', 'profileEmail']), ''),
  profile_contact_no: normalizeText(getValue(row, ['profile_contact_no', 'profileContactNo']), ''),
  current_company: normalizeText(getValue(row, ['current_company', 'currentCompany']), ''),
  current_location: normalizeText(getValue(row, ['current_location', 'currentLocation']), ''),
  preferred_location: normalizeText(getValue(row, ['preferred_location', 'preferredLocation']), ''),
  work_exp_in_years: getValue(row, ['work_exp_in_years', 'workExpInYears'], ''),
  relevant_exp_in_years: getValue(row, ['relevant_exp_in_years', 'relevantExpInYears'], ''),
  profile_availability: normalizeText(getValue(row, ['profile_availability', 'profileAvailability']), ''),
  current_salary: normalizeText(getValue(row, ['current_salary', 'current_salary_pa', 'currentSalary']), ''),
  expected_salary: normalizeText(getValue(row, ['expected_salary', 'expected_salary_pa', 'expectedSalary']), ''),
  match_score: normalizeText(getValue(row, ['match_score', 'ai_profile_score', 'AI_PROFILE_SCORE']), ''),
  file_name: normalizeText(getValue(row, ['file_name', 'object_name', 'OBJECT_NAME']), ''),
  profile_url: normalizeText(getValue(row, ['profile_url', 'download_url', 'url', 'object_url']), ''),
  upload_date: toIsoDate(getValue(row, ['upload_date', 'uploaded_at', 'created_at', 'last_modified'], '')),
  source: 'Uploaded',
  source_type: 'UPLOADED',
  raw: row,
});

export const uploadProfileToMergeBucket = async (payload) => {
  const response = await api.post(API_ENDPOINTS.PROFILE_MERGE_UPLOAD, payload);
  return response.data;
};

export const getProfileMergeDownloadUrl = async (payload) => {
  const response = await api.post(API_ENDPOINTS.PROFILE_MERGE_DOWNLOAD, payload);
  const data =
    typeof response.data === 'string'
      ? JSON.parse(response.data)
      : response.data;

  return {
    success: Boolean(data?.success || data?.url || data?.download_url),
    download_url: data?.download_url || data?.url || '',
    message: data?.message || data?.error || '',
    raw: data,
  };
};

export const getProfileMergeCustomers = async () => getProfileReportCustomers();

export const getProfileMergeDemands = async (customerId) => {
  if (!customerId) return [];

  const data = await getCustomerDetails(customerId);
  const demands = Array.isArray(data?.demands) ? data.demands : [];

  return demands.map((demand) => ({
    value: String(getValue(demand, ['demand_id', 'demandId', 'id'])),
    label: getValue(
      demand,
      ['demand_display', 'demand_label'],
      `${normalizeText(getValue(demand, ['demand_code', 'demandCode']), 'Demand')} - ${normalizeText(getValue(demand, ['job_role', 'jobRole']), 'Untitled')}`
    ),
    raw: demand,
  }));
};

export const getProfileMergeRows = async () => {
  const [mergeResponse, atsRows] = await Promise.allSettled([
    api.get(API_ENDPOINTS.PROFILE_MERGE_LIST),
    getCandidateDatabaseRows(),
  ]);

  const mergeData =
    mergeResponse.status === 'fulfilled'
      ? (typeof mergeResponse.value.data === 'string'
          ? JSON.parse(mergeResponse.value.data)
          : mergeResponse.value.data) || {}
      : {};

  const atsProfilesFromApi = Array.isArray(mergeData?.ats_profiles)
    ? mergeData.ats_profiles
    : Array.isArray(mergeData?.ATS_PROFILES)
      ? mergeData.ATS_PROFILES
      : [];

  const uploadedProfiles = Array.isArray(mergeData?.uploaded_profiles)
    ? mergeData.uploaded_profiles
    : Array.isArray(mergeData?.UPLOADED_PROFILES)
      ? mergeData.UPLOADED_PROFILES
      : Array.isArray(mergeData?.items)
        ? mergeData.items
        : [];

  const normalizedAts = (
    atsProfilesFromApi.length
      ? atsProfilesFromApi
      : atsRows.status === 'fulfilled'
        ? atsRows.value
        : []
  ).map(normalizeAtsProfile);

  const normalizedUploaded = uploadedProfiles.map(normalizeUploadedProfile);

  return [...normalizedUploaded, ...normalizedAts].sort((left, right) => {
    const leftTime = new Date(left.upload_date || 0).getTime();
    const rightTime = new Date(right.upload_date || 0).getTime();
    return rightTime - leftTime;
  });
};

export const mergeProfileToDemand = async (payload) => {
  const response = await api.post(API_ENDPOINTS.PROFILE_MERGE_ACTION, payload);
  return response.data;
};
