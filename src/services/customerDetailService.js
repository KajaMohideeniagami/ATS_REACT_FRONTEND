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

export const getCustomerDetails = async (customerId) => {
  try {
    const response = await api.get(`${API_ENDPOINTS.CUSTOMER_DETAILS}${customerId}`);
    console.log('Customer Detail Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Customer Detail Error:', error);
    throw error;
  }
};
