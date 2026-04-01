import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// ── Login ─────────────────────────────────────────────────────────────────
export const login = async (username, password) => {
  try {
    const response = await api.post(
      process.env.REACT_APP_API_LOGIN,
      { username, password }
    );
    return response.data;
  } catch (error) {
    console.error('Login Error:', error);
    throw error;
  }
};

// ── Session helpers ───────────────────────────────────────────────────────
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

export const isLoggedIn = () => {
  return getSession() !== null;
};