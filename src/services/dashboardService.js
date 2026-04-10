import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../config/apiConfig';
import { attachGlobalLoaderInterceptors } from './httpLoader';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});
attachGlobalLoaderInterceptors(api);

const normalizeItems = (payload) => {
  const rawItems = payload?.items || payload || [];
  if (!Array.isArray(rawItems)) return [];

  return rawItems.map((item) => ({
    total_count: Number(item.total_count ?? item.TOTAL_COUNT ?? 0),
    card_label:
      item.card_label ||
      item.CARD_LABEL ||
      item.cardLabel ||
      '',
  }));
};

export const getDashboardSummary = async () => {
  try {
    const response = await api.get(API_ENDPOINTS.DASHBOARD);
    return normalizeItems(response.data);
  } catch (error) {
    console.error('Dashboard Service Error:', error);
    throw error;
  }
};
