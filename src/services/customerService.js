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

export const createCustomer = async (customerData) => {
  try {
    console.log('Customer Service - Sending POST request to:', API_ENDPOINTS.ADD_CUSTOMER);
    console.log('Customer Service - Payload:', customerData);

    const response = await api.post(API_ENDPOINTS.ADD_CUSTOMER, customerData);

    console.log('Customer Service - Response Status:', response.status);
    console.log('Customer Service - Response Data:', response.data);

    return response.data;
  } catch (error) {
    console.error('Customer Service - API Error:', error);
    console.error('Customer Service - Error Response:', error.response);
    console.error('Customer Service - Error Status:', error.response?.status);
    console.error('Customer Service - Error Data:', error.response?.data);
    throw error;
  }
};

export const updateCustomer = async (customerId, customerData) => {
  try {
    const payload = {
      CUSTOMER_ID: Number(customerId),
      ...customerData,
    };

    console.log('Customer Service - Sending update request to:', API_ENDPOINTS.UPDATE_CUSTOMER);
    console.log('Customer Service - Update Payload:', payload);

    const response = await api.post(API_ENDPOINTS.UPDATE_CUSTOMER, payload);

    console.log('Customer Service - Update Response Status:', response.status);
    console.log('Customer Service - Update Response Data:', response.data);

    return response.data;
  } catch (error) {
    console.error('Customer Service - Update API Error:', error);
    console.error('Customer Service - Update Error Response:', error.response);
    console.error('Customer Service - Update Error Status:', error.response?.status);
    console.error('Customer Service - Update Error Data:', error.response?.data);
    throw error;
  }
};
