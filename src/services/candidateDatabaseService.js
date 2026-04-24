import {
  getProfileReportCustomers,
  getProfileReportRows,
  getProfileReportVendors,
} from './profileReportService';

const normalize = (value) => String(value ?? '').trim().toLowerCase();
const normalizePhone = (value) => String(value ?? '').replace(/\D+/g, '').trim();
const normalizeNumberString = (value) => String(value ?? '').replace(/[^\d.]+/g, '').trim();

const getValue = (row, keys) => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return '';
};

const formatText = (value, fallback = '-') => {
  if (value === 0 || value === '0') return '0';
  const text = String(value ?? '').trim();
  return text || fallback;
};

export const getCandidateDatabaseFilters = async () => {
  const [customers, vendors] = await Promise.all([
    getProfileReportCustomers(),
    getProfileReportVendors(),
  ]);

  return { customers, vendors };
};

export const getCandidateDatabaseRows = async (filters = {}) => {
  const rows = await getProfileReportRows(filters);

  const normalizedRows = (Array.isArray(rows) ? rows : []).map((row) => ({
    ...row,
    profile_id: getValue(row, ['profile_id', 'profileId']),
    customer_id: getValue(row, ['customer_id', 'customerId']),
    demand_id: getValue(row, ['demand_id', 'demandId']),
    profile_email: formatText(getValue(row, ['profile_email', 'profileEmail']), ''),
    profile_contact_no: formatText(getValue(row, ['profile_contact_no', 'profileContactNo', 'contact_no', 'contactNo']), ''),
    profile_code: formatText(getValue(row, ['profile_code', 'profileCode'])),
    profile_name: formatText(getValue(row, ['profile_name', 'profileName', 'candidate_name', 'candidateName'])),
    work_exp_in_years: formatText(getValue(row, ['work_exp_in_years', 'workExpInYears', 'total_experience', 'totalExperience']), ''),
    profile_availability: formatText(getValue(row, ['profile_availability', 'profileAvailability', 'availability']), ''),
    current_salary: formatText(getValue(row, ['current_salary', 'current_salary_pa', 'currentSalary', 'currentSalaryPa']), ''),
    expected_salary: formatText(getValue(row, ['expected_salary', 'expected_salary_pa', 'expectedSalary', 'expectedSalaryPa']), ''),
    current_salary_numeric: normalizeNumberString(getValue(row, ['current_salary', 'current_salary_pa', 'currentSalary', 'currentSalaryPa'])),
    expected_salary_numeric: normalizeNumberString(getValue(row, ['expected_salary', 'expected_salary_pa', 'expectedSalary', 'expectedSalaryPa'])),
    job_role: formatText(getValue(row, ['job_role', 'jobRole'])),
    customer_name: formatText(getValue(row, ['customer_name', 'customerName'])),
    vendor_name: formatText(getValue(row, ['vendor_name', 'vendorName'])),
    current_company: formatText(getValue(row, ['current_company', 'currentCompany'])),
    current_location: formatText(getValue(row, ['current_location', 'currentLocation'])),
    preferred_location: formatText(getValue(row, ['preferred_location', 'preferredLocation'])),
    profile_status_name: formatText(getValue(row, ['profile_status_name', 'profileStatusName'])),
    match_score: formatText(getValue(row, ['match_score', 'MATCH_SCORE', 'ai_profile_score', 'AI_PROFILE_SCORE']), ''),
    source: formatText(getValue(row, ['source'])),
  }));

  const groupedProfiles = [];

  normalizedRows.forEach((row) => {
    const normalizedName = normalize(row.profile_name);
    const normalizedEmail = normalize(row.profile_email);
    const normalizedPhone = normalizePhone(row.profile_contact_no);
    const customerKey = String(row.customer_id || normalize(row.customer_name) || '').trim();
    if (!customerKey || !normalizedName) return;

    const existing = groupedProfiles.find((group) => {
      if (String(group.customer_match_key || '') !== String(customerKey)) {
        return false;
      }

      const emailMatches = normalizedEmail && group.normalized_email && group.normalized_email === normalizedEmail;
      const phoneMatches = normalizedPhone && group.normalized_phone && group.normalized_phone === normalizedPhone;
      const nameMatches = group.normalized_name === normalizedName;

      return emailMatches || phoneMatches || nameMatches;
    });

    if (!existing) {
      groupedProfiles.push({
        ...row,
        customer_match_key: customerKey,
        normalized_name: normalizedName,
        normalized_email: normalizedEmail,
        normalized_phone: normalizedPhone,
        profile_ids: [row.profile_id],
        linked_demands: [
          {
            profile_id: row.profile_id,
            customer_id: row.customer_id,
            customer_name: row.customer_name,
            demand_id: row.demand_id,
            demand_code: row.demand_code,
            demand_type: row.demand_type,
            demand_status: row.demand_status,
            demand_date: row.demand_date,
            billable_date: row.billable_date,
            job_role: row.job_role,
            vendor_name: row.vendor_name,
            work_mode_name: row.demand_work_mode_name || row.work_mode_name || '',
            match_score: row.match_score,
          },
        ],
      });
      return;
    }

    existing.profile_ids = [...new Set([...existing.profile_ids, row.profile_id].filter(Boolean))];

    const existingDate = new Date(existing.profile_date || existing.profile_update_date || 0).getTime();
    const currentDate = new Date(row.profile_date || row.profile_update_date || 0).getTime();
    if (currentDate > existingDate) {
      Object.assign(existing, {
        ...existing,
        ...row,
        normalized_name: existing.normalized_name,
        normalized_email: existing.normalized_email || normalizedEmail,
        normalized_phone: existing.normalized_phone || normalizedPhone,
        customer_match_key: existing.customer_match_key,
        profile_ids: existing.profile_ids,
        linked_demands: existing.linked_demands,
      });
    }

    const alreadyLinked = existing.linked_demands.some(
      (demand) =>
        String(demand.demand_id || '') === String(row.demand_id || '') &&
        String(demand.customer_id || '') === String(row.customer_id || '')
    );

    if (!alreadyLinked) {
      existing.linked_demands.push({
        profile_id: row.profile_id,
        customer_id: row.customer_id,
        customer_name: row.customer_name,
        demand_id: row.demand_id,
        demand_code: row.demand_code,
        demand_type: row.demand_type,
        demand_status: row.demand_status,
        demand_date: row.demand_date,
        billable_date: row.billable_date,
        job_role: row.job_role,
        vendor_name: row.vendor_name,
        work_mode_name: row.demand_work_mode_name || row.work_mode_name || '',
        match_score: row.match_score,
      });
    }
  });

  return groupedProfiles.map((row) => ({
    ...row,
    linked_demand_count: row.linked_demands.length,
  }));
};

export const searchCandidateDatabaseRows = (rows, keyword) => {
  const query = normalize(keyword);
  if (!query) return rows;

  const normalizedNumericQuery = normalizeNumberString(keyword);

  return rows.filter((row) => {
    const candidateText = [
      row?.profile_code,
      row?.profile_name,
      row?.profile_email,
      row?.profile_contact_no,
      row?.current_company,
      row?.current_location,
      row?.preferred_location,
      row?.work_exp_in_years,
      row?.profile_availability,
      row?.current_salary,
      row?.expected_salary,
      row?.customer_name,
      row?.vendor_name,
      row?.profile_status_name,
      row?.source,
      row?.match_score,
    ]
      .map((value) => formatText(value, ''))
      .join(' ')
      .toLowerCase();

    const demandText = (Array.isArray(row?.linked_demands) ? row.linked_demands : [])
      .map((demand) =>
        [
          demand?.demand_code,
          demand?.job_role,
          demand?.demand_type,
          demand?.demand_status,
          demand?.customer_name,
          demand?.vendor_name,
          demand?.work_mode_name,
          demand?.match_score,
        ]
          .map((value) => formatText(value, ''))
          .join(' ')
          .toLowerCase()
      )
      .join(' ');

    const textMatches = `${candidateText} ${demandText}`.includes(query);
    const numericMatches = normalizedNumericQuery
      ? [
          row?.current_salary_numeric,
          row?.expected_salary_numeric,
          normalizeNumberString(row?.work_exp_in_years),
          normalizeNumberString(row?.match_score),
        ].some((value) => String(value || '').includes(normalizedNumericQuery))
      : false;

    return textMatches || numericMatches;
  });
};

export const searchCandidateDatabaseRowsByDemand = (rows, demandKeyword) => {
  const query = normalize(demandKeyword);
  if (!query) return rows;

  return rows.filter((row) =>
    (Array.isArray(row?.linked_demands) ? row.linked_demands : []).some((demand) =>
      [
        demand?.demand_code,
        demand?.job_role,
        demand?.demand_type,
        demand?.demand_status,
        demand?.customer_name,
        demand?.vendor_name,
        demand?.work_mode_name,
      ]
        .map((value) => formatText(value, ''))
        .join(' ')
        .toLowerCase()
        .includes(query)
    )
  );
};

export const getCandidateDatabaseRecord = async (profileId) => {
  if (!profileId) return null;

  const rows = await getCandidateDatabaseRows();
  return rows.find((row) => String(row.profile_id) === String(profileId)) || null;
};
