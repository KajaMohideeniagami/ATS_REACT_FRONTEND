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

const aiApi = axios.create({
  baseURL: AI_GATEWAY_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(AI_GATEWAY_KEY ? { Authorization: `Bearer ${AI_GATEWAY_KEY}` } : {}),
  },
});

const extractPrompt = (data) =>
  data?.prompt_text ||
  data?.prompt ||
  data?.PROMPT_TEXT ||
  data?.items?.[0]?.prompt_text ||
  data?.items?.[0]?.PROMPT_TEXT ||
  '';

const getPromptText = async (promptType) => {
  const response = await api.get(API_ENDPOINTS.AI_PROMPT, {
    params: { prompt_type: promptType },
  });
  const promptText = extractPrompt(response.data || {});
  if (!String(promptText || '').trim()) {
    throw new Error(`Prompt text not found for ${promptType}.`);
  }
  return String(promptText).trim();
};

const callAi = async (messages) => {
  if (!AI_GATEWAY_URL) {
    throw new Error('AI gateway URL is missing. Set REACT_APP_AI_GATEWAY_URL in .env.');
  }
  const response = await aiApi.post('/chat/completions', {
    model: AI_MODEL,
    messages,
  });
  return (
    response.data?.choices?.[0]?.message?.content ||
    response.data?.choices?.[1]?.message?.content ||
    ''
  );
};

const parseScore = (text) => {
  const match = String(text || '').match(/Overall Match Score:\s*([0-9]{1,3})/i);
  const scoreNum = match ? Number(match[1]) : NaN;
  if (!Number.isFinite(scoreNum)) {
    return '/100 ❌';
  }
  const icon = scoreNum >= 70 ? '✅' : '❌';
  return `${scoreNum}/100 ${icon}`;
};

export const analyzeProfile = async ({ profileText, jdSummary, weights }) => {
  if (!profileText?.trim()) {
    throw new Error('Profile text is required.');
  }
  if (!jdSummary?.trim()) {
    throw new Error('JD summary is required.');
  }

  const promptSummary = await getPromptText('PROFILE_SUMMARY');
  let promptScoring = await getPromptText('PROFILE_SCORING');

  promptScoring = promptScoring
    .replace('{SKILLS_MATCH}', weights?.skills ?? 0)
    .replace('{EXPERIENCE_ALIGNMENT}', weights?.experience ?? 0)
    .replace('{CULTURE_SOFT_SKILL}', weights?.culture ?? 0)
    .replace('{GROWTH_POTENTIAL}', weights?.growth ?? 0);

  const profileSummary = await callAi([
    { role: 'user', content: promptSummary },
    { role: 'user', content: profileText },
  ]);

  const profileMatching = await callAi([
    { role: 'user', content: promptScoring },
    { role: 'user', content: profileText },
    { role: 'user', content: jdSummary },
  ]);

  return {
    success: true,
    profile_summary: String(profileSummary || '').replace(/```[a-z]*\n?/gi, ''),
    profile_matching: String(profileMatching || '').replace(/```[a-z]*\n?/gi, ''),
    match_score: parseScore(profileMatching),
  };
};
