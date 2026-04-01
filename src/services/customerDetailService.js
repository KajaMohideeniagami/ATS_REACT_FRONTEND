import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

export const getCustomerDetails = async (customerId) => {
  try {
    const response = await api.get(
      `${process.env.REACT_APP_API_CUSTOMER_DETAILS}${customerId}`
    );
    console.log('Customer Detail Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Customer Detail Error:', error);
    throw error;
  }
};