import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../config/apiConfig';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

export const sendVendorEmail = async (payload) => {
  try {
    const response = await api.post(API_ENDPOINTS.SEND_VENDOR_EMAIL, payload);
    return response.data;
  } catch (error) {
    console.error('Send Vendor Email Error:', error);
    throw error;
  }
};
