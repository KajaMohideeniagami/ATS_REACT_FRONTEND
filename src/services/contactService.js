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
