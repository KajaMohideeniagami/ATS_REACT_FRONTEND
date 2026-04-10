import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS, LOV_ENDPOINTS } from '../config/apiConfig';
import { attachGlobalLoaderInterceptors } from './httpLoader';

const candidateReportApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});
attachGlobalLoaderInterceptors(candidateReportApi);

const extractList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.records)) return payload.data.records;
  return [];
};

const normalizeCustomer = (customer) => {
  const value = customer?.value
    ?? customer?.r
    ?? customer?.id
    ?? customer?.customer_id
    ?? customer?.customerId
    ?? customer?.cust_id
    ?? customer?.return_value
    ?? customer?.returnValue
    ?? customer?.customer_code
    ?? customer?.code;

  const label = customer?.label
    ?? customer?.display_value
    ?? customer?.display
    ?? customer?.d
    ?? customer?.display_label
    ?? customer?.displayLabel
    ?? customer?.customer_name
    ?? customer?.customerName
    ?? customer?.name
    ?? customer?.text;

  if (value == null && !label) return null;

  return {
    value: String(value ?? label),
    label: String(label ?? value),
    raw: customer,
  };
};

export const getCandidateReportCustomers = async () => {
  const response = await candidateReportApi.get(LOV_ENDPOINTS.CUSTOMERS);

  return extractList(response.data)
    .map(normalizeCustomer)
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label));
};

const buildCandidateReportParams = ({ customer, demandType } = {}) => {
  const params = {};

  if (customer && customer !== 'All') {
    params.customer = customer;
  }

  if (demandType && demandType !== 'All') {
    params.type = demandType;
  }

  return params;
};

export const getCandidateReportRows = async (endpoint, filters = {}) => {
  const response = await candidateReportApi.get(endpoint, {
    params: buildCandidateReportParams(filters),
  });

  return extractList(response.data);
};

export { API_ENDPOINTS };
