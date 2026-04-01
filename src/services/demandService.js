import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// ── Add Demand ─────────────────────────────────────────────────────────────
export const addDemand = async (demandData) => {
  try {
    const response = await api.post(
      process.env.REACT_APP_API_ADD_DEMAND,
      demandData
    );
    console.log('Add Demand Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Add Demand Error:', error);
    throw error;
  }
};

// ── Extract JD via Gemini AI ───────────────────────────────────────────────
export const extractJD = async (jobDescription) => {
  try {
    const response = await api.post(
      process.env.REACT_APP_API_DEMAND_EXTRACT,
      { job_description: jobDescription }
    );
    console.log('Extract JD Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Extract JD Error:', error);
    throw error;
  }
};

// ── Upload Demand Files (JD + IQ) to OCI ──────────────────────────────────
export const uploadDemandFiles = async (uploadData) => {
  try {
    const response = await api.post(
      process.env.REACT_APP_API_DEMAND_UPLOAD,
      uploadData
    );
    console.log('Upload Files Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Upload Files Error:', error);
    throw error;
  }
};

// ── Get Demand Details by Customer ID + Demand ID ─────────────────────────
export const getDemandDetails = async (customerId, demandId) => {
  try {
const response = await api.get(
  process.env.REACT_APP_API_DEMAND_DETAILS || "/demands_api/details",
  { params: { customer_id: customerId, demand_id: demandId } }
);
    console.log('Demand Details Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Demand Details Error:', error);
    throw error;
  }
};
