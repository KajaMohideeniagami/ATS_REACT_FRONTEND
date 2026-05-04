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
    const clientId = process.env.REACT_APP_ORDS_CLIENT_ID;
    const clientSecret = process.env.REACT_APP_ORDS_CLIENT_SECRET;
    const useOAuthTokenEndpoint = process.env.REACT_APP_USE_ORDS_OAUTH === 'true';

    if (useOAuthTokenEndpoint) {
      const body = new URLSearchParams();
      body.append('grant_type', 'password');
      body.append('username', username);
      body.append('password', password);

      const basicAuth = btoa(`${clientId || ''}:${clientSecret || ''}`);

      const response = await api.post('/oauth/token', body.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${basicAuth}`,
        },
      });
      return response.data;
    }

    const response = await api.post(API_ENDPOINTS.LOGIN, { username, password });
    return response.data;
  } catch (error) {
    console.error('Login Error:', error);
    throw error;
  }
};

export const saveSession = (userData) => {
  const normalizedUserData = {
    ...userData,
    token: userData?.token || userData?.access_token || '',
    token_type: userData?.token_type || 'bearer',
  };
  sessionStorage.setItem('ats_user', JSON.stringify(normalizedUserData));
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

export const getCurrentAuditUser = () => {
  const sessionUser = getSession();
  return (
    sessionUser?.username ||
    sessionUser?.full_name ||
    sessionUser?.email ||
    ''
  );
};
