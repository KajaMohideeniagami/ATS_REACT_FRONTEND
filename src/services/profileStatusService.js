import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../config/apiConfig';
import { attachGlobalLoaderInterceptors } from './httpLoader';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  withCredentials: false,
});
attachGlobalLoaderInterceptors(api);

export const getProfileStatusList = async (demandId, customerId) => api.post(API_ENDPOINTS.PROFILE_STATUS_LIST, {
  demand_id: Number(demandId),
  customer_id: Number(customerId),
});

export const getProfileDbData = async (profileId) => api.post(API_ENDPOINTS.PROFILE_STATUS_DB_DATA, {
  profile_id: Number(profileId),
});

export const updateProfileStatus = async (payload) => api.post(API_ENDPOINTS.PROFILE_STATUS_UPDATE, payload);
