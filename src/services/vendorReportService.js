import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS, LOV_ENDPOINTS } from '../config/apiConfig';

const vendorReportApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

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

export const getVendorReportCustomers = async () => {
  const response = await vendorReportApi.get(LOV_ENDPOINTS.CUSTOMERS);

  return extractList(response.data)
    .map(normalizeCustomer)
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label));
};

export const getVendorReportVendors = async () => {
  const response = await vendorReportApi.get(LOV_ENDPOINTS.VENDORS);

  return extractList(response.data)
    .map(normalizeVendor)
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label));
};

const buildVendorReportParams = ({ customer, vendor, demandStatus } = {}) => {
  const params = {};

  if (customer && customer !== 'All') {
    params.customer = customer;
  }

  if (vendor && vendor !== 'All') {
    params.vendor = vendor;
    params.vendor_id = vendor;
  }

  if (demandStatus && demandStatus !== 'All') {
    params.status = demandStatus;
  }

  return params;
};

export const getVendorReportRows = async (filters = {}) => {
  const response = await vendorReportApi.get(API_ENDPOINTS.VENDOR_REPORT, {
    params: buildVendorReportParams(filters),
  });

  return extractList(response.data);
};
