import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',  // ← this was missing
  },
  withCredentials: false,                   // ← this was missing
});

export const getProfileStatusList = async (demandId, customerId) => {
  return await api.post('/profile-status/list', {
    demand_id: Number(demandId),
    customer_id: Number(customerId),
  });
};

export const getProfileDbData = async (profileId) => {
  return await api.post('/profile-status/db-data', {
    profile_id: Number(profileId),
  });
};

export const updateProfileStatus = async (payload) => {
  return await api.post('/profile-status/update', payload);
};