import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../config/apiConfig';
import { attachGlobalLoaderInterceptors } from './httpLoader';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});
attachGlobalLoaderInterceptors(api);

export const login = async (username, password) => {
  try {
    const response = await api.post(API_ENDPOINTS.LOGIN, { username, password });
    return response.data;
  } catch (error) {
    console.error('Login Error:', error);
    throw error;
  }
};

export const saveSession = (userData) => {
  sessionStorage.setItem('ats_user', JSON.stringify(userData));
};

export const getSession = () => {
  try {
    const data = sessionStorage.getItem('ats_user');
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const clearSession = () => {
  sessionStorage.removeItem('ats_user');
};

export const isLoggedIn = () => getSession() !== null;
