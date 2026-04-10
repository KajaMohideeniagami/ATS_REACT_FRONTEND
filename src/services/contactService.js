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

export const addContact = async (contactData) => {
  try {
    const response = await api.post(API_ENDPOINTS.ADD_CONTACT, contactData);
    console.log('Add Contact Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Add Contact Error:', error);
    throw error;
  }
};

export const updateContact = async (contactData) => {
  const response = await api.post(API_ENDPOINTS.UPDATE_CONTACT, contactData);
  return response.data;
};

export const deleteContact = async (contactData) => {
  const response = await api.post(API_ENDPOINTS.DELETE_CONTACT, contactData);
  return response.data;
};
