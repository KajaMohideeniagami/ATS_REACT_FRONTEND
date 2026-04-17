import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS, LOV_ENDPOINTS } from '../config/apiConfig';
import { attachGlobalLoaderInterceptors } from './httpLoader';

const profileReportApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});
attachGlobalLoaderInterceptors(profileReportApi);

const extractList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.records)) return payload.data.records;
  return [];
};

const normalizeVendor = (vendor) => {
  const value = vendor?.value
    ?? vendor?.r
    ?? vendor?.id
    ?? vendor?.vendor_id
    ?? vendor?.vendorId
    ?? vendor?.vend_id
    ?? vendor?.return_value
    ?? vendor?.returnValue
    ?? vendor?.vendor_code
    ?? vendor?.code;

  const label = vendor?.label
    ?? vendor?.display_value
    ?? vendor?.display
    ?? vendor?.d
    ?? vendor?.display_label
    ?? vendor?.displayLabel
    ?? vendor?.vendor_name
    ?? vendor?.vendorName
    ?? vendor?.name
    ?? vendor?.text;

  if (value == null && !label) return null;

  return {
    value: String(value ?? label),
    label: String(label ?? value),
    raw: vendor,
  };
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

export const getProfileReportCustomers = async () => {
  const response = await profileReportApi.get(LOV_ENDPOINTS.CUSTOMERS);

  return extractList(response.data)
    .map(normalizeCustomer)
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label));
};

export const getProfileReportVendors = async () => {
  const response = await profileReportApi.get(LOV_ENDPOINTS.VENDORS);

  return extractList(response.data)
    .map(normalizeVendor)
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label));
};

const buildProfileReportParams = ({ vendor, customer, demandStatus, demandType } = {}) => {
  const params = {};

  if (vendor && vendor !== 'All') {
    params.vendor_id = vendor;
    params.vendor = vendor;
  }

  if (customer && customer !== 'All') {
    params.customer_id = customer;
    params.customer = customer;
  }

  if (demandStatus && demandStatus !== 'All') {
    params.status = demandStatus;
  }

  if (demandType && demandType !== 'All') {
    params.type = demandType;
  }

  return params;
};

export const getProfileReportRows = async (filters = {}) => {
  const response = await profileReportApi.get(API_ENDPOINTS.PROFILE_REPORT, {
    params: buildProfileReportParams(filters),
  });

  return extractList(response.data);
};
