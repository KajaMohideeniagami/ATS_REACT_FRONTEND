export const API_BASE_URL = (
  process.env.REACT_APP_API_BASE_URL || 'https://oracleapex.com/ords/iagami_ops'
).replace(/\/$/, '');

export const API_ENDPOINTS = Object.freeze({
  DASHBOARD: '/customers/dashboard',
  CUSTOMERS: '/customers/',
  LOVS_BASE: '/lovs/',
  ADD_CUSTOMER: '/addcustomers/addcustomer',
  CUSTOMER_DETAILS: '/customers_details/details/',
  ADD_CONTACT: '/contacts_api/add',
  UPDATE_CONTACT: '/contacts_api/update',
  DELETE_CONTACT: '/contacts_api/delete',
  ADD_DEMAND: '/demands_api/add',
  UPDATE_DEMAND: '/demands_api/update',
  DEMAND_EXTRACT: '/demands_api/extract',
  DEMAND_UPLOAD: '/demands_api/upload',
  DEMAND_DOWNLOAD: '/demands_api/download',
  LOGIN: '/auth/login',
  ADD_PROFILE: '/addprofile/add',
  DEMAND_DETAILS: '/demands_api/details',
  PROFILE_UPLOAD: '/addprofile/upload',
  PROFILE_STATUS_DB_DATA: '/profile-status/db-data',
  PROFILE_STATUS_LIST: '/profile-status/list',
  PROFILE_STATUS_UPDATE: '/profile-status/update',
  DEMAND_REPORT_CUSTOMERS: '/lovs/customers',
  DEMAND_REPORT: '/reports/demandreports',
  SEND_VENDOR_EMAIL: '/vendor-email/send',
});

export const LOV_ENDPOINTS = Object.freeze({
  INDUSTRIES: `${API_ENDPOINTS.LOVS_BASE}industries`,
  TYPES: `${API_ENDPOINTS.LOVS_BASE}types`,
  ENGAGEMENT_TYPES: `${API_ENDPOINTS.LOVS_BASE}engagement-types`,
  COUNTRIES: `${API_ENDPOINTS.LOVS_BASE}countries`,
  PROFILE_STATUSES: `${API_ENDPOINTS.LOVS_BASE}profile-statuses`,
  DEMAND_TYPES: `${API_ENDPOINTS.LOVS_BASE}demand-types`,
  JOB_TYPES: `${API_ENDPOINTS.LOVS_BASE}job-types`,
  WORK_MODES: `${API_ENDPOINTS.LOVS_BASE}work-modes`,
  DECISION_STATUSES: `${API_ENDPOINTS.LOVS_BASE}decision-statuses`,
  CURRENCIES: `${API_ENDPOINTS.LOVS_BASE}currencies`,
  PROFILE_AVAILABILITY: `${API_ENDPOINTS.LOVS_BASE}profile-availability`,
  TAX_TERMS: `${API_ENDPOINTS.LOVS_BASE}tax-terms`,
  VENDORS: `${API_ENDPOINTS.LOVS_BASE}vendors`,
  CUSTOMERS: API_ENDPOINTS.DEMAND_REPORT_CUSTOMERS,
});
