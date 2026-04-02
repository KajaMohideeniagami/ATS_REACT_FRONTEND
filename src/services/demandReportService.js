import axios from 'axios';

const normalizeReportPath = (path) => {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/ords/iagami_ops/')) return path;
  if (path.startsWith('/')) return `/ords/iagami_ops${path}`;
  return `/ords/iagami_ops/${path}`;
};

const CUSTOMER_LOV_URL = normalizeReportPath(process.env.REACT_APP_API_DEMAND_REPORT_CUSTOMERS);
const DEMAND_REPORT_URL = normalizeReportPath(process.env.REACT_APP_API_DEMAND_REPORT);

const demandReportApi = axios.create({
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

export const getDemandReportCustomers = async () => {
  const response = await demandReportApi.get(CUSTOMER_LOV_URL);

  return extractList(response.data)
    .map(normalizeCustomer)
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label));
};

const buildDemandReportParams = ({ customer, demandStatus, demandType } = {}) => {
  const params = {};

  if (customer && customer !== 'All') {
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

export const getDemandReportRows = async (filters = {}) => {
  const response = await demandReportApi.get(DEMAND_REPORT_URL, {
    params: buildDemandReportParams(filters),
  });

  return extractList(response.data);
};
