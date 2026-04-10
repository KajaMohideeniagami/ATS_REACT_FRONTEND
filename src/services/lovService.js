import axios from 'axios';
import { API_BASE_URL, LOV_ENDPOINTS } from '../config/apiConfig';
import { attachGlobalLoaderInterceptors } from './httpLoader';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});
attachGlobalLoaderInterceptors(api);

// LOV Service functions
export const getIndustries = async () => {
  try {
    const response = await api.get(`${LOV_ENDPOINTS.INDUSTRIES}`);
    console.log('Industries API Response:', response.data);

    // Handle different API response structures
    let data = response.data;
    if (data.items && Array.isArray(data.items)) {
      return data.items;
    } else if (data.data && Array.isArray(data.data)) {
      return data.data;
    } else if (Array.isArray(data)) {
      return data;
    } else {
      console.warn('Unexpected industries API response structure:', data);
      // Return fallback data
      return [
        { value: '1', label: 'Technology' },
        { value: '2', label: 'Healthcare' },
        { value: '3', label: 'Finance' },
        { value: '4', label: 'Manufacturing' },
        { value: '5', label: 'Retail' }
      ];
    }
  } catch (error) {
    console.error('Industries API Error:', error);
    // Return fallback data on error
    return [
      { value: '1', label: 'Technology' },
      { value: '2', label: 'Healthcare' },
      { value: '3', label: 'Finance' },
      { value: '4', label: 'Manufacturing' },
      { value: '5', label: 'Retail' }
    ];
  }
};

export const getTypes = async () => {
  try {
    const response = await api.get(`${LOV_ENDPOINTS.TYPES}`);
    console.log('Types API Response:', response.data);

    // Handle different API response structures
    let data = response.data;
    if (data.items && Array.isArray(data.items)) {
      return data.items;
    } else if (data.data && Array.isArray(data.data)) {
      return data.data;
    } else if (Array.isArray(data)) {
      return data;
    } else {
      console.warn('Unexpected types API response structure:', data);
      // Return fallback data
      return [
        { value: '1', label: 'Enterprise' },
        { value: '2', label: 'SMB' },
        { value: '3', label: 'Startup' }
      ];
    }
  } catch (error) {
    console.error('Types API Error:', error);
    // Return fallback data on error
    return [
      { value: '1', label: 'Enterprise' },
      { value: '2', label: 'SMB' },
      { value: '3', label: 'Startup' }
    ];
  }
};

export const getEngagementTypes = async () => {
  try {
    const response = await api.get(`${LOV_ENDPOINTS.ENGAGEMENT_TYPES}`);
    console.log('Engagement Types API Response:', response.data);

    // Handle different API response structures
    let data = response.data;
    if (data.items && Array.isArray(data.items)) {
      return data.items;
    } else if (data.data && Array.isArray(data.data)) {
      return data.data;
    } else if (Array.isArray(data)) {
      return data;
    } else {
      console.warn('Unexpected engagement types API response structure:', data);
      // Return fallback data
      return [
        { value: '1', label: 'Direct' },
        { value: '2', label: 'Partner' },
        { value: '3', label: 'Reseller' }
      ];
    }
  } catch (error) {
    console.error('Engagement Types API Error:', error);
    // Return fallback data on error
    return [
      { value: '1', label: 'Direct' },
      { value: '2', label: 'Partner' },
      { value: '3', label: 'Reseller' }
    ];
  }
};

export const getCountries = async () => {
  try {
    const response = await api.get(`${LOV_ENDPOINTS.COUNTRIES}`);
    console.log('Countries API Response:', response.data);

    // Handle different API response structures
    let data = response.data;
    if (data.items && Array.isArray(data.items)) {
      return data.items;
    } else if (data.data && Array.isArray(data.data)) {
      return data.data;
    } else if (Array.isArray(data)) {
      return data;
    } else {
      console.warn('Unexpected countries API response structure:', data);
      // Return fallback data
      return [
        { value: '1', label: 'United States' },
        { value: '2', label: 'United Kingdom' },
        { value: '3', label: 'Canada' },
        { value: '4', label: 'Australia' },
        { value: '5', label: 'Germany' }
      ];
    }
  } catch (error) {
    console.error('Countries API Error:', error);
    // Return fallback data on error
    return [
      { value: '1', label: 'United States' },
      { value: '2', label: 'United Kingdom' },
      { value: '3', label: 'Canada' },
      { value: '4', label: 'Australia' },
      { value: '5', label: 'Germany' }
    ];
  }
};

export const getProfileStatuses = async () => {
  try {
    const response = await api.get(`${LOV_ENDPOINTS.PROFILE_STATUSES}`);
    console.log('Profile Statuses API Response:', response.data);

    let data = response.data;
    if (data.items && Array.isArray(data.items)) {
      return data.items;
    } else if (data.data && Array.isArray(data.data)) {
      return data.data;
    } else if (Array.isArray(data)) {
      return data;
    } else {
      console.warn('Unexpected profile statuses API response structure:', data);
      return [];
    }
  } catch (error) {
    console.error('Profile Statuses API Error:', error);
    return [];
  }
};
