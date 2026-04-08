import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../config/apiConfig';

const vendorMasterApi = axios.create({
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

const normalizeVendor = (vendor) => ({
  vendor_id: vendor?.vendor_id ?? vendor?.vendorId ?? vendor?.id ?? vendor?.value ?? '',
  vendor_name: vendor?.vendor_name ?? vendor?.vendorName ?? vendor?.name ?? vendor?.label ?? '',
  contact_no: vendor?.contact_no ?? vendor?.contactNo ?? vendor?.phone ?? vendor?.mobile ?? '',
  email_id: vendor?.email_id ?? vendor?.emailId ?? vendor?.email ?? '',
  contact_person: vendor?.contact_person ?? vendor?.contactPerson ?? vendor?.person_name ?? vendor?.personName ?? '',
  vendor_type: vendor?.vendor_type ?? vendor?.vendorType ?? vendor?.type_name ?? vendor?.typeName ?? vendor?.type ?? '',
  country_id: vendor?.country_id ?? vendor?.countryId ?? vendor?.country ?? '',
  country_name: vendor?.country_name ?? vendor?.countryName ?? vendor?.country_label ?? vendor?.countryLabel ?? '',
  raw: vendor,
});

export const getVendorMasterList = async () => {
  const response = await vendorMasterApi.get(API_ENDPOINTS.VENDOR_MASTER_LIST);

  return extractList(response.data).map(normalizeVendor);
};

export const createVendor = async (vendorData) => {
  const response = await vendorMasterApi.post(API_ENDPOINTS.ADD_VENDOR, vendorData);
  return response.data;
};
