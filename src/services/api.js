import axios from 'axios';

// ─────────────────────────────────────────────
// ENV CONFIG
// ─────────────────────────────────────────────
const BASE_URL = process.env.REACT_APP_API_BASE_URL;

console.log('API BASE URL:', BASE_URL);

// ─────────────────────────────────────────────
// AXIOS INSTANCE
// ─────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// ─────────────────────────────────────────────
// REQUEST INTERCEPTOR (Token Support - future ready)
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// RESPONSE INTERCEPTOR (Global Error Handling)
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// GENERIC GET
// ─────────────────────────────────────────────
export const getRequest = async (url) => {
  const response = await api.get(url);
  return response.data;
};

// ─────────────────────────────────────────────
// 🔥 GENERIC POST (FIX FOR YOUR ERROR)
// ─────────────────────────────────────────────
export const postRequest = async (url, data) => {
  try {
    const response = await api.post(url, data);
    return response.data;
  } catch (error) {
    console.error('POST ERROR:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// GET PROFILES
// ─────────────────────────────────────────────
export const getProfiles = async () => {
  try {
    const data = await getRequest(process.env.REACT_APP_ENDPOINT);
    console.log('API Response:', data);
    return data.items || [];
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// MOCK CREATE CUSTOMER
// ─────────────────────────────────────────────
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
              message: 'Internal server error. Please try again.'
            }
          }
        });
        return;
      }

      if (customerData.CUSTOMER_CODE === 'ERROR') {
        reject({
          response: {
            status: 400,
            data: {
              message: 'Customer code already exists.'
            }
          }
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
          created_at: new Date().toISOString()
        }
      });
    }, delay);
  });
};

export default api;