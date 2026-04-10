import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../config/apiConfig';

const profileDownloadApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
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

    return response.data;
  } catch (error) {
    console.error('Profile Download Error:', error);
    throw error;
  }
};
