import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../config/apiConfig';
import { attachGlobalLoaderInterceptors } from './httpLoader';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

attachGlobalLoaderInterceptors(api);

export const getProfileView = async (profileId) => {
  const response = await api.get(API_ENDPOINTS.PROFILE_VIEW, {
    params: { profile_id: profileId },
  });
  return response.data;
};
