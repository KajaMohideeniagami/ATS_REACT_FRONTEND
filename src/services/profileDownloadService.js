import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../config/apiConfig';

const profileDownloadApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

export const getProfileDownloadUrl = async (profileId) => {
  try {
    const response = await profileDownloadApi.get(API_ENDPOINTS.DOWNLOAD_PROFILE, {
      params: {
        profile_id: profileId,
      },
    });

    const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

    return {
      success: Boolean(data?.success || data?.url || data?.download_url),
      download_url: data?.download_url || data?.url || '',
      message: data?.message || data?.error || '',
      raw: data,
    };
  } catch (error) {
    console.error('Profile Download Error:', error);
    throw error;
  }
};
