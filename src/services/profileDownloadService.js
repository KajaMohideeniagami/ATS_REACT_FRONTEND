import api from './api';
import { API_ENDPOINTS } from '../config/apiConfig';

export const getProfileDownloadUrl = async (profileId) => {
  try {
    const normalizedProfileId = Number.isFinite(Number(profileId)) ? Number(profileId) : profileId;

    const response = await api.get(API_ENDPOINTS.DOWNLOAD_PROFILE, {
      params: {
        profile_id: normalizedProfileId,
      },
      timeout: 60000,
    });

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
  } catch (error) {
    console.error('Profile Download Error:', error);
    throw error;
  }
};
