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

api.interceptors.request.use((config) => {
  const session = sessionStorage.getItem('ats_user');

  if (session) {
    const user = JSON.parse(session);
    if (user?.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API ERROR:', error?.response || error.message);

    if (error.response?.status === 401) {
      sessionStorage.removeItem('ats_user');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export const getRequest = async (url) => {
  const response = await api.get(url);
  return response.data;
};

export const postRequest = async (url, data) => {
  try {
    const response = await api.post(url, data);
    return response.data;
  } catch (error) {
    console.error('POST ERROR:', error);
    throw error;
  }
};

export const getProfiles = async () => {
  try {
    const data = await getRequest(API_ENDPOINTS.DASHBOARD);
    return data.items || [];
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export const createCustomer = async (customerData) => {
  console.log('Mock API Call - Creating customer:', customerData);

  const delay = Math.random() * 500 + 500;

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.1) {
        reject({
          response: {
            status: 500,
            data: {
              message: 'Internal server error. Please try again.',
            },
          },
        });
        return;
      }

      if (customerData.CUSTOMER_CODE === 'ERROR') {
        reject({
          response: {
            status: 400,
            data: {
              message: 'Customer code already exists.',
            },
          },
        });
        return;
      }

      const customerId = Math.floor(Math.random() * 10000) + 100;

      resolve({
        status: 200,
        message: 'Customer created successfully',
        customer_id: customerId,
        data: {
          ...customerData,
          customer_id: customerId,
          created_at: new Date().toISOString(),
        },
      });
    }, delay);
  });
};

export default api;
