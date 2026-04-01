import axios from 'axios';

// Debug environment variables
console.log('Customer Service - Environment Variables:', {
  REACT_APP_API_BASE_URL: process.env.REACT_APP_API_BASE_URL,
  REACT_APP_API_ADD_CUSTOMER: process.env.REACT_APP_API_ADD_CUSTOMER
});

// Create axios instance with base URL
const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL, 
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  withCredentials: false,
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', {
      method: config.method,
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      headers: config.headers,
      data: config.data
    });
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('API Response Error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers
    });
    return Promise.reject(error);
  }
);

// Customer Service functions
export const createCustomer = async (customerData) => {
  try {
    // Correct Oracle APEX endpoint: /addcustomers/addcustomer
    const endpoint = '/addcustomers/addcustomer';

    console.log('Customer Service - Sending POST request to:', endpoint);
    console.log('Customer Service - Payload:', customerData);
    console.log('Customer Service - Full URL:', `${process.env.REACT_APP_API_BASE_URL}${endpoint}`);

    const response = await api.post(endpoint, customerData);

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
