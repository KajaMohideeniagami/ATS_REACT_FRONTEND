import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../config/apiConfig';
import { attachGlobalLoaderInterceptors } from './httpLoader';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});
attachGlobalLoaderInterceptors(api);

const AI_GATEWAY_URL = process.env.REACT_APP_AI_GATEWAY_URL
  ? process.env.REACT_APP_AI_GATEWAY_URL.replace(/\/chat\/completions\/?$/, '')
  : '';
const AI_GATEWAY_KEY = process.env.REACT_APP_AI_GATEWAY_KEY;
const AI_MODEL = 'oci/xai.grok-3';
const PROMPT_TYPE_JD = 'JD_EXTRACTION';

const aiApi = axios.create({
  baseURL: AI_GATEWAY_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(AI_GATEWAY_KEY ? { Authorization: `Bearer ${AI_GATEWAY_KEY}` } : {}),
  },
});

const safeJsonParse = (value) => {
  if (!value || typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const normalizeOciSignedUrl = (value) => {
  if (!value) return '';

  try {
    const url = new URL(String(value));
    const customerHostMatch = url.hostname.match(/^objectstorage\.([^.]+)\.oci\.customer-oci\.com$/i);
    if (customerHostMatch) {
      url.hostname = `objectstorage.${customerHostMatch[1]}.oraclecloud.com`;
    }
    url.pathname = decodeURI(url.pathname);
    return url.toString();
  } catch {
    return String(value).trim();
  }
};

const normalizeDownloadResponse = (data) => {
  const parsedNested = typeof data?.response === 'string' ? safeJsonParse(data.response) : null;
  const source = parsedNested || data || {};
  const downloadUrl =
    source.download_url ||
    source.downloadUrl ||
    source.url ||
    source.fullPath ||
    source.full_path ||
    source.accessUri ||
    source.access_uri ||
    '';

  return {
    success: Boolean(source.success ?? downloadUrl),
    download_url: normalizeOciSignedUrl(downloadUrl),
    message: source.message || source.error || '',
    raw: source,
  };
};

export const addDemand = async (demandData) => {
  try {
    const response = await api.post(API_ENDPOINTS.ADD_DEMAND, demandData);
    console.log('Add Demand Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Add Demand Error:', error);
    throw error;
  }
};

export const updateDemand = async (demandData) => {
  try {
    const response = await api.post(API_ENDPOINTS.UPDATE_DEMAND, demandData);
    console.log('Update Demand Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Update Demand Error:', error);
    throw error;
  }
};

export const extractJD = async (jobDescription) => {
  try {
    if (!AI_GATEWAY_URL) {
      throw new Error('AI gateway URL is missing. Set REACT_APP_AI_GATEWAY_URL in .env.');
    }
    if (!jobDescription?.trim()) {
      throw new Error('Job description is required for AI extraction.');
    }

    let promptText = '';
    try {
      const promptRes = await api.get(API_ENDPOINTS.AI_PROMPT, {
        params: { prompt_type: PROMPT_TYPE_JD },
      });
      const data = promptRes.data || {};
      promptText =
        data.prompt_text ||
        data.prompt ||
        data.PROMPT_TEXT ||
        data.items?.[0]?.prompt_text ||
        data.items?.[0]?.PROMPT_TEXT ||
        '';
    } catch {}

    if (!promptText.trim()) {
      throw new Error('Prompt text not found for JD_EXTRACTION.');
    }

    const payload = {
      model: AI_MODEL,
      messages: [
        { role: 'user', content: String(promptText).trim() },
        { role: 'user', content: jobDescription.trim() },
      ],
    };

    const response = await aiApi.post('/chat/completions', payload);
    const content =
      response.data?.choices?.[0]?.message?.content ||
      response.data?.choices?.[1]?.message?.content ||
      '';

    if (!content) {
      return { success: false, message: 'AI returned empty response.' };
    }

    return { success: true, extraction: content };
  } catch (error) {
    console.error('Extract JD Error:', error);
    throw error;
  }
};

export const uploadDemandFiles = async (uploadData) => {
  try {
    const response = await api.post(API_ENDPOINTS.DEMAND_UPLOAD, uploadData);
    console.log('Upload Files Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Upload Files Error:', error);
    throw error;
  }
};

export const getDemandDetails = async (customerId, demandId) => {
  try {
    const response = await api.get(API_ENDPOINTS.DEMAND_DETAILS, {
      params: { customer_id: customerId, demand_id: demandId },
    });
    console.log('Demand Details Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Demand Details Error:', error);
    throw error;
  }
};

export const getDemandDownloadUrl = async (demandId, fileType = 'IQ') => {
  try {
    const response = await api.get(API_ENDPOINTS.DEMAND_DOWNLOAD, {
      params: {
        demand_id: demandId,
        file_type: fileType,
      },
    });
    const data = typeof response.data === 'string' ? safeJsonParse(response.data) || response.data : response.data;
    const normalized = normalizeDownloadResponse(data);
    console.log('Demand Download Response:', normalized);
    return normalized;
  } catch (error) {
    console.error('Demand Download Error:', error);
    throw error;
  }
};
