import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../config/apiConfig';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

export const addDemand = async (demandData) => {
  try {
    const response = await api.post(API_ENDPOINTS.ADD_DEMAND, demandData);
    console.log('Add Demand Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Add Demand Error:', error);
    throw error;
  }
};

export const updateDemand = async (demandData) => {
  try {
    const response = await api.post(API_ENDPOINTS.UPDATE_DEMAND, demandData);
    console.log('Update Demand Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Update Demand Error:', error);
    throw error;
  }
};

export const extractJD = async (jobDescription) => {
  try {
    const response = await api.post(API_ENDPOINTS.DEMAND_EXTRACT, { job_description: jobDescription });
    console.log('Extract JD Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Extract JD Error:', error);
    throw error;
  }
};

export const uploadDemandFiles = async (uploadData) => {
  try {
    const response = await api.post(API_ENDPOINTS.DEMAND_UPLOAD, uploadData);
    console.log('Upload Files Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Upload Files Error:', error);
    throw error;
  }
};

export const getDemandDetails = async (customerId, demandId) => {
  try {
    const response = await api.get(API_ENDPOINTS.DEMAND_DETAILS, {
      params: { customer_id: customerId, demand_id: demandId },
    });
    console.log('Demand Details Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Demand Details Error:', error);
    throw error;
  }
};

export const getDemandDownloadUrl = async (demandId, fileType = 'IQ') => {
  try {
    const response = await api.get(API_ENDPOINTS.DEMAND_DOWNLOAD, {
      params: {
        demand_id: demandId,
        file_type: fileType,
      },
    });
    console.log('Demand Download Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Demand Download Error:', error);
    throw error;
  }
};
