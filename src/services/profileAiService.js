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
const PROMPT_TYPE_PROFILE_PARSE = 'PROFILE_PARSING';
const PROFILE_PARSE_FALLBACK_PROMPT = `
`;

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

const cleanAiContent = (content) =>
  String(content || '')
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

const safeJsonParse = (content) => {
  const text = cleanAiContent(content);
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {}

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
};

const normalizeParsedProfile = (data) => {
  if (!data || typeof data !== 'object') return null;

  return {
    profile_name:
      data.profile_name ||
      data.name ||
      data.full_name ||
      data.fullName ||
      data.candidate_name ||
      data.candidateName ||
      '',
    profile_email:
      data.profile_email ||
      data.email ||
      data.email_id ||
      data.emailId ||
      '',
    profile_contact_no:
      data.profile_contact_no ||
      data.contact_no ||
      data.contactNo ||
      data.phone ||
      data.mobile ||
      '',
    current_location:
      data.current_location ||
      data.location ||
      data.currentLocation ||
      '',
    current_company:
      data.current_company ||
      data.company ||
      data.currentCompany ||
      data.employer ||
      '',
    preferred_location:
      data.preferred_location ||
      data.preferredLocation ||
      data.location_preference ||
      '',
    work_mode:
      data.work_mode ||
      data.work_mode_label ||
      data.workMode ||
      data.workModeLabel ||
      '',
    work_exp_in_years:
      data.work_exp_in_years ||
      data.total_experience ||
      data.totalExperience ||
      data.experience_years ||
      data.experienceYears ||
      '',
    relevant_exp_in_years:
      data.relevant_exp_in_years ||
      data.relevant_experience ||
      data.relevantExperience ||
      data.relevant_exp_years ||
      '',
    salary_currency:
      data.salary_currency ||
      data.currency ||
      data.currency_code ||
      data.salaryCurrency ||
      '',
    current_salary_pa:
      data.current_salary_pa ||
      data.current_salary ||
      data.currentCtc ||
      data.current_ctc ||
      '',
    expected_salary_pa:
      data.expected_salary_pa ||
      data.expected_salary ||
      data.expectedCtc ||
      data.expected_ctc ||
      '',
    profile_availability:
      data.profile_availability ||
      data.availability ||
      data.availability_status ||
      '',
    notice_period_days:
      data.notice_period_days ||
      data.notice_period ||
      data.noticePeriodDays ||
      '',
    negotiable_days:
      data.negotiable_days ||
      data.negotiable ||
      data.negotiableDays ||
      '',
    tax_terms:
      data.tax_terms ||
      data.taxTerms ||
      data.tax_term ||
      '',
    notes:
      data.notes ||
      data.summary ||
      data.profile_summary ||
      '',
  };
};

export const parseResumeProfile = async ({ profileText }) => {
  if (!profileText?.trim()) {
    return { success: false, message: 'Profile text is required.' };
  }

  try {
    if (!AI_GATEWAY_URL) {
      return { success: false, message: 'AI gateway URL is missing. Set REACT_APP_AI_GATEWAY_URL in .env.' };
    }

    let promptText = PROFILE_PARSE_FALLBACK_PROMPT;
    try {
      const dbPrompt = await getPromptText(PROMPT_TYPE_PROFILE_PARSE);
      if (String(dbPrompt || '').trim()) {
        promptText = String(dbPrompt).trim();
      }
    } catch {}

    const content = await callAi([
      { role: 'user', content: String(promptText).trim() },
      { role: 'user', content: String(profileText).trim() },
    ]);

    const parsed = safeJsonParse(content);
    if (!parsed) {
      return {
        success: false,
        message: 'AI returned an unparseable profile response.',
        raw: cleanAiContent(content),
      };
    }

    return {
      success: true,
      parsed: normalizeParsedProfile(parsed),
      raw: cleanAiContent(content),
    };
  } catch (error) {
    return {
      success: false,
      message: error?.response?.data?.message || error?.message || 'Profile parsing failed.',
    };
  }
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
