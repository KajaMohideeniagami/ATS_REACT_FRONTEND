import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

export const addContact = async (contactData) => {
  try {
    const response = await api.post(
      process.env.REACT_APP_API_ADD_CONTACT,
      contactData
    );
    console.log('Add Contact Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Add Contact Error:', error);
    throw error;
  }
};