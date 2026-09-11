import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Project, ProjectMonitoringData, ValidationError, ValidationResult } from '../../src/types';

export const REQUIRED_COLUMNS = [
  'project_code',
  'project_name',
  'original_cost',
];

export interface ParsedRowData {
  project_code: string;
  project_name: string;
  sector: string;
  ministry?: string | null;
  agency?: string | null;
  implementing_agency?: string | null;
  state?: string | null;
  project_status?: string | null;
  update_date?: string | null;
  original_cost: number;
  revised_cost?: number | null;
  expenditure?: number | null;
  physical_progress?: number | null;
  financial_progress?: number | null;
  original_completion_date?: string | null;
  revised_completion_date?: string | null;
  date_of_approval?: string | null;
  sanction_date?: string | null;
  start_date?: string | null;
  actual_completion_date?: string | null;
  target_date?: string | null;
  data_source?: string;
  assigned_to?: string | null;
}

export const COLUMN_ALIASES: Record<string, string[]> = {
  project_code: [
    'project_code',
    'projectcode',
    'project_id',
    'projectid',
    'project code',
    'project id',
    'code',
  ],
  project_name: [
    'project_name',
    'projectname',
    'project name',
    'name',
    'title',
  ],
  sector: [
    'sector',
    'sector_name',
    'sectorname',
    'sector name',
  ],
  ministry: [
    'ministry',
    'line_ministry',
    'lineministry',
    'line ministry',
  ],
  implementing_agency: [
    'agency',
    'implementing_agency',
    'implementingagency',
    'implementing agency',
    'companyname',
    'company_name',
    'company name',
    'executing_agency',
  ],
  state: [
    'state',
    'states',
    'state_name',
    'statename',
    'statesuts',
    'states/uts',
    'states/ uts',
    'location',
  ],
  original_cost: [
    'original_cost_crore',
    'original_cost',
    'originalcostcrore',
    'originalcost',
    'original cost (cr)',
    'original cost (in cr.)',
    'original cost (rs. cr.)',
    'original cost',
    'originalcostcr',
    'sanctioned_cost',
  ],
  revised_cost: [
    'revised_cost_crore',
    'revised_cost',
    'revisedcostcrore',
    'revisedcost',
    'revised cost (cr)',
    'revised cost (in cr.)',
    'revised cost (rs. cr.)',
    'revised cost',
    'revisedcostcr',
    'anticipated_cost',
    'anticipated_cost_crore',
  ],
  expenditure: [
    'cumulative_expenditure_crore',
    'cumulativeexpenditurecrore',
    'expenditure',
    'expenditure (cr)',
    'expenditure (in cr.)',
    'expenditure (rs. cr.)',
    'cumulative_expenditure',
    'cumulative expenditure (cr)',
    'cumulative expenditure',
    'actual_expenditure',
  ],
  physical_progress: [
    'physical_progress_pct',
    'physicalprogresspct',
    'physical_progress',
    'physicalprogress',
    'physical progress (%)',
    'physical progress',
    'progress',
  ],
  original_completion_date: [
    'original_target_doc',
    'originaltargetdoc',
    'original_target_date',
    'original_completion_date',
    'originalcompletiondate',
    'original completion date',
    'original date of commissioning',
    'original_doc',
    'target_date',
    'targetdate',
    'target date',
  ],
  revised_completion_date: [
    'revised_doc',
    'reviseddoc',
    'revised_completion_date',
    'revisedcompletiondate',
    'revised completion date',
    'revised date of commissioning',
    'anticipated_doc',
    'revised_target_doc',
  ],
  sanction_date: [
    'date_of_approval',
    'dateofapproval',
    'sanction_date',
    'sanctiondate',
    'sanction date',
    'date of approval',
    'approval_date',
    'date_of_sanction',
  ],
  start_date: [
    'start_date',
    'startdate',
    'start date',
    'date_of_start',
    'commencement_date',
  ],
  actual_completion_date: [
    'actual_completion_date',
    'actualcompletiondate',
    'actual completion date',
    'actual_doc',
    'date_of_completion',
  ],
  financial_progress: [
    'financial_progress',
    'financialprogress',
    'financial progress (%)',
    'financial progress',
  ],
  project_status: [
    'project_status',
    'status',
    'project status',
  ],
};

export function normalizeKey(str: string): string {
  return String(str || '')
    .replace(/^\uFEFF/, '')
    .toLowerCase()
    .replace(/[\s\-_()\[\]/\\.]/g, '');
}

export function extractField(
  row: Record<string, any>,
  canonicalField: string
): { value: any; headerName?: string } {
  const aliases = COLUMN_ALIASES[canonicalField] || [canonicalField];

  // 1. Direct match on row keys
  for (const alias of aliases) {
    if (row[alias] !== undefined) {
      return { value: row[alias], headerName: alias };
    }
  }

  // 2. Normalized match across all row keys
  const rowKeys = Object.keys(row);
  const rowKeyMap = new Map<string, string>();
  for (const k of rowKeys) {
    rowKeyMap.set(normalizeKey(k), k);
  }

  for (const alias of aliases) {
    const norm = normalizeKey(alias);
    const origKey = rowKeyMap.get(norm);
    if (origKey !== undefined && row[origKey] !== undefined) {
      return { value: row[origKey], headerName: origKey };
    }
  }

  return { value: undefined };
}

export function parseNullableNumber(
  raw: any,
  fieldName: string,
  columnName: string,
  rowNum: number,
  errors: ValidationError[],
  options: {
    required?: boolean;
    mustBePositive?: boolean;
    mustBeNonNegative?: boolean;
    min?: number;
    max?: number;
  } = {}
): number | null {
  if (raw === undefined || raw === null) {
    if (options.required) {
      errors.push({
        row: rowNum,
        field: fieldName,
        column: columnName,
        value: raw,
        message: `${fieldName} is required and must be a positive number`,
      });
    }
    return null;
  }

  const strVal = String(raw).trim();
  const lower = strVal.toLowerCase();

  // Handle empty / null / unset placeholders
  if (
    strVal === '' ||
    strVal === '-' ||
    strVal === '--' ||
    lower === 'na' ||
    lower === 'n/a' ||
    lower === 'null' ||
    lower === 'nil' ||
    lower === 'none'
  ) {
    if (options.required) {
      errors.push({
        row: rowNum,
        field: fieldName,
        column: columnName,
        value: raw,
        message: `${fieldName} is required and must be a positive number`,
      });
    }
    return null;
  }

  // Clean currency symbols, commas, whitespace
  const cleaned = strVal.replace(/[₹$,\s]/g, '').replace(/^(Rs|INR)\.?/i, '');
  const num = Number(cleaned);

  if (isNaN(num)) {
    errors.push({
      row: rowNum,
      field: fieldName,
      column: columnName,
      value: raw,
      message: `${fieldName} must be a valid number (received "${strVal}")`,
    });
    return null;
  }

  if (options.mustBePositive && num <= 0) {
    errors.push({
      row: rowNum,
      field: fieldName,
      column: columnName,
      value: raw,
      message: `${fieldName} must be a positive number (> 0)`,
    });
    return null;
  }

  if (options.mustBeNonNegative && num < 0) {
    errors.push({
      row: rowNum,
      field: fieldName,
      column: columnName,
      value: raw,
      message: `${fieldName} cannot be negative`,
    });
    return null;
  }

  if (options.min !== undefined && num < options.min) {
    errors.push({
      row: rowNum,
      field: fieldName,
      column: columnName,
      value: raw,
      message: `${fieldName} must be at least ${options.min}`,
    });
    return null;
  }

  if (options.max !== undefined && num > options.max) {
    errors.push({
      row: rowNum,
      field: fieldName,
      column: columnName,
      value: raw,
      message: `${fieldName} must be at most ${options.max}`,
    });
    return null;
  }

  return num;
}

export function parseNullableDate(
  raw: any,
  fieldName: string,
  columnName: string,
  rowNum: number,
  errors: ValidationError[],
  options: { required?: boolean } = {}
): string | null {
  if (raw === undefined || raw === null) {
    if (options.required) {
      errors.push({
        row: rowNum,
        field: fieldName,
        column: columnName,
        value: raw,
        message: `${fieldName} is required`,
      });
    }
    return null;
  }

  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return raw.toISOString().split('T')[0];
  }

  const strVal = String(raw).trim();
  const lower = strVal.toLowerCase();

  // Handle empty / null / unset placeholders
  if (
    strVal === '' ||
    strVal === '-' ||
    strVal === '--' ||
    lower === 'na' ||
    lower === 'n/a' ||
    lower === 'null' ||
    lower === 'nil' ||
    lower === 'none' ||
    strVal === '01/1900' ||
    strVal === '00/0000' ||
    strVal === '1900-01-01' ||
    /^0+[\/\-]0+$/.test(strVal)
  ) {
    if (options.required) {
      errors.push({
        row: rowNum,
        field: fieldName,
        column: columnName,
        value: raw,
        message: `${fieldName} is required`,
      });
    }
    return null;
  }

  // 1. Check MM/YYYY or MM-YYYY (PAIMANA standard format)
  const mmyyyy = strVal.match(/^(\d{1,2})[\/\-](\d{4})$/);
  if (mmyyyy) {
    const month = parseInt(mmyyyy[1], 10);
    const year = parseInt(mmyyyy[2], 10);
    if (year <= 1900) return null; // Unset placeholder
    if (month >= 1 && month <= 12 && year > 1900 && year < 2100) {
      const mm = String(month).padStart(2, '0');
      return `${year}-${mm}-01`;
    }
  }

  // 2. Check YYYY-MM or YYYY/MM
  const yyyymm = strVal.match(/^(\d{4})[\/\-](\d{1,2})$/);
  if (yyyymm) {
    const year = parseInt(yyyymm[1], 10);
    const month = parseInt(yyyymm[2], 10);
    if (year <= 1900) return null;
    if (month >= 1 && month <= 12 && year > 1900 && year < 2100) {
      const mm = String(month).padStart(2, '0');
      return `${year}-${mm}-01`;
    }
  }

  // 3. Check DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = strVal.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10);
    const year = parseInt(ddmmyyyy[3], 10);
    if (year <= 1900) return null;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const mm = String(month).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      return `${year}-${mm}-${dd}`;
    }
  }

  // 4. Check YYYY-MM-DD or YYYY/MM/DD
  const yyyymmdd = strVal.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (yyyymmdd) {
    const year = parseInt(yyyymmdd[1], 10);
    const month = parseInt(yyyymmdd[2], 10);
    const day = parseInt(yyyymmdd[3], 10);
    if (year <= 1900) return null;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const mm = String(month).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      return `${year}-${mm}-${dd}`;
    }
  }

  // 5. Excel serial date (e.g. 45123)
  if (/^\d{5}$/.test(strVal)) {
    const serial = Number(strVal);
    if (serial > 20000 && serial < 80000) {
      const excelEpoch = new Date(1899, 11, 30);
      const d = new Date(excelEpoch.getTime() + serial * 86400000);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    }
  }

  // 6. Native JS Date parsing fallback
  const d = new Date(strVal);
  if (!isNaN(d.getTime())) {
    if (d.getFullYear() <= 1900) return null;
    return d.toISOString().split('T')[0];
  }

  errors.push({
    row: rowNum,
    field: fieldName,
    column: columnName,
    value: raw,
    message: `Invalid date format for ${fieldName}: "${strVal}". Expected YYYY-MM-DD, MM/YYYY, or DD/MM/YYYY`,
  });
  return null;
}

/**
 * Validates parsed raw rows from CSV/XLSX
 */
export function validateProjectRecords(rawRows: Record<string, any>[]): ValidationResult {
  const errors: ValidationError[] = [];
  const validRows: ParsedRowData[] = [];
  const preview: any[] = [];
  const missing_optional_fields: Record<string, number> = {};

  rawRows.forEach((row, index) => {
    const rowNum = index + 2; // account for header (1-indexed)
    const rowErrors: string[] = [];

    // 1. Required identity checks
    const codeRes = extractField(row, 'project_code');
    const project_code = String(codeRes.value !== undefined && codeRes.value !== null ? codeRes.value : '').trim();
    if (!project_code) {
      rowErrors.push('Missing project_code');
      errors.push({
        row: rowNum,
        field: 'project_code',
        column: codeRes.headerName || 'project_code',
        value: codeRes.value,
        message: 'Project code is required',
      });
    }

    const nameRes = extractField(row, 'project_name');
    const project_name = String(nameRes.value !== undefined && nameRes.value !== null ? nameRes.value : '').trim();
    if (!project_name) {
      rowErrors.push('Missing project_name');
      errors.push({
        row: rowNum,
        field: 'project_name',
        column: nameRes.headerName || 'project_name',
        value: nameRes.value,
        message: 'Project name is required',
      });
    }

    // 2. Descriptive fields (No invented fabrications)
    const secRes = extractField(row, 'sector');
    const sector = String(secRes.value !== undefined && secRes.value !== null ? secRes.value : '').trim() || 'Unclassified';

    const minRes = extractField(row, 'ministry');
    const ministry = minRes.value !== undefined && minRes.value !== null && String(minRes.value).trim() !== ''
      ? String(minRes.value).trim()
      : null;

    const agRes = extractField(row, 'implementing_agency');
    const implementing_agency = agRes.value !== undefined && agRes.value !== null && String(agRes.value).trim() !== ''
      ? String(agRes.value).trim()
      : null;

    const stRes = extractField(row, 'state');
    const state = stRes.value !== undefined && stRes.value !== null && String(stRes.value).trim() !== ''
      ? String(stRes.value).trim()
      : null;

    // 3. Numeric and Cost Validation
    const origCostRes = extractField(row, 'original_cost');
    const original_cost = parseNullableNumber(
      origCostRes.value,
      'original_cost',
      origCostRes.headerName || 'original_cost',
      rowNum,
      errors,
      { required: true, mustBePositive: true }
    );

    // Temporary server-side logging for first row inspection
    if (index === 0) {
      const rawHeaders = Object.keys(row);
      const normHeaders = rawHeaders.map((h) => normalizeKey(h));
      console.log('====================================================');
      console.log('[PAIMANA UPLOAD DEBUG — FIRST ROW INSPECTION]');
      console.log('raw header names:', rawHeaders);
      console.log('normalized header names:', normHeaders);
      console.log('resolved mapping for original_cost_crore:', origCostRes.headerName || 'NOT_FOUND');
      console.log('raw value:', origCostRes.value);
      console.log('parsed original_cost:', original_cost);
      console.log('====================================================');
    }

    if (original_cost === null && origCostRes.value !== undefined) {
      rowErrors.push('Invalid/Missing original_cost');
    }

    const revCostRes = extractField(row, 'revised_cost');
    const revised_cost = parseNullableNumber(
      revCostRes.value,
      'revised_cost',
      revCostRes.headerName || 'revised_cost',
      rowNum,
      errors,
      { required: false, mustBePositive: true }
    );
    if (revCostRes.value !== undefined && revCostRes.value !== null && String(revCostRes.value).trim() !== '' && String(revCostRes.value).trim() !== '-' && revised_cost === null) {
      rowErrors.push('Invalid revised_cost');
    }

    const expRes = extractField(row, 'expenditure');
    const expenditure = parseNullableNumber(
      expRes.value,
      'expenditure',
      expRes.headerName || 'expenditure',
      rowNum,
      errors,
      { required: false, mustBeNonNegative: true }
    );
    if (expRes.value !== undefined && expRes.value !== null && String(expRes.value).trim() !== '' && String(expRes.value).trim() !== '-' && expenditure === null) {
      rowErrors.push('Invalid expenditure');
    }

    // 4. Physical Progress checks (0 - 100%)
    const physRes = extractField(row, 'physical_progress');
    const physical_progress = parseNullableNumber(
      physRes.value,
      'physical_progress',
      physRes.headerName || 'physical_progress',
      rowNum,
      errors,
      { required: false, min: 0, max: 100 }
    );
    if (physRes.value !== undefined && physRes.value !== null && String(physRes.value).trim() !== '' && String(physRes.value).trim() !== '-' && physical_progress === null) {
      rowErrors.push('Invalid physical_progress');
    }

    // 5. Financial Progress computation
    const finRes = extractField(row, 'financial_progress');
    let financial_progress: number | null = null;
    if (finRes.value !== undefined && finRes.value !== null && String(finRes.value).trim() !== '') {
      financial_progress = parseNullableNumber(
        finRes.value,
        'financial_progress',
        finRes.headerName || 'financial_progress',
        rowNum,
        errors,
        { required: false, min: 0, max: 200 }
      );
    } else if (expenditure !== null) {
      const baseCost = revised_cost !== null && revised_cost > 0 ? revised_cost : original_cost;
      if (baseCost && baseCost > 0) {
        financial_progress = Number(((expenditure / baseCost) * 100).toFixed(2));
      }
    }

    // 6. Dates Validation
    const origDocRes = extractField(row, 'original_completion_date');
    const original_completion_date = parseNullableDate(
      origDocRes.value,
      'original_completion_date',
      origDocRes.headerName || 'original_completion_date',
      rowNum,
      errors
    );

    const revDocRes = extractField(row, 'revised_completion_date');
    const revised_completion_date = parseNullableDate(
      revDocRes.value,
      'revised_completion_date',
      revDocRes.headerName || 'revised_completion_date',
      rowNum,
      errors
    );

    const sancRes = extractField(row, 'sanction_date');
    const sanction_date = parseNullableDate(
      sancRes.value,
      'sanction_date',
      sancRes.headerName || 'sanction_date',
      rowNum,
      errors
    );

    const startRes = extractField(row, 'start_date');
    const start_date = parseNullableDate(
      startRes.value,
      'start_date',
      startRes.headerName || 'start_date',
      rowNum,
      errors
    );

    const actDocRes = extractField(row, 'actual_completion_date');
    const actual_completion_date = parseNullableDate(
      actDocRes.value,
      'actual_completion_date',
      actDocRes.headerName || 'actual_completion_date',
      rowNum,
      errors
    );

    // Track missing optional fields across dataset
    if (revised_cost === null) {
      missing_optional_fields['revised_cost_crore'] = (missing_optional_fields['revised_cost_crore'] || 0) + 1;
    }
    if (expenditure === null) {
      missing_optional_fields['cumulative_expenditure_crore'] = (missing_optional_fields['cumulative_expenditure_crore'] || 0) + 1;
    }
    if (physical_progress === null) {
      missing_optional_fields['physical_progress_pct'] = (missing_optional_fields['physical_progress_pct'] || 0) + 1;
    }
    if (original_completion_date === null) {
      missing_optional_fields['original_target_doc'] = (missing_optional_fields['original_target_doc'] || 0) + 1;
    }
    if (revised_completion_date === null) {
      missing_optional_fields['revised_doc'] = (missing_optional_fields['revised_doc'] || 0) + 1;
    }
    if (sanction_date === null) {
      missing_optional_fields['date_of_approval'] = (missing_optional_fields['date_of_approval'] || 0) + 1;
    }
    if (start_date === null) {
      missing_optional_fields['start_date'] = (missing_optional_fields['start_date'] || 0) + 1;
    }
    if (implementing_agency === null) {
      missing_optional_fields['agency'] = (missing_optional_fields['agency'] || 0) + 1;
    }
    if (state === null) {
      missing_optional_fields['state'] = (missing_optional_fields['state'] || 0) + 1;
    }

    const hasRowError = errors.some((e) => e.row === rowNum);
    const isValid = !hasRowError && original_cost !== null && project_code !== '' && project_name !== '';

    const parsedItem: ParsedRowData = {
      project_code,
      project_name,
      sector,
      ministry,
      agency: implementing_agency,
      implementing_agency,
      state,
      project_status: (row.project_status || row['Status'] || (physical_progress !== null && physical_progress >= 100 ? 'Completed' : 'On-Going')) as any,
      update_date: new Date().toISOString().slice(0, 7),
      original_cost: original_cost ?? 0,
      revised_cost,
      expenditure,
      physical_progress,
      financial_progress,
      original_completion_date,
      revised_completion_date,
      date_of_approval: sanction_date,
      sanction_date,
      start_date,
      actual_completion_date,
      target_date: original_completion_date,
      data_source: row.data_source || 'PAIMANA Public Dashboard',
    };

    if (isValid) {
      validRows.push(parsedItem);
    }

    if (preview.length < 100) {
      preview.push({
        row: rowNum,
        ...parsedItem,
        status: isValid ? 'VALID' : 'INVALID',
        validationErrors: rowErrors,
      });
    }
  });

  return {
    valid: errors.length === 0,
    total_rows: rawRows.length,
    valid_rows: validRows.length,
    invalid_rows: rawRows.length - validRows.length,
    totalRows: rawRows.length,
    validRowsCount: validRows.length,
    errors,
    preview,
    validRows,
    missing_optional_fields,
  };
}

/**
 * Parse CSV text
 */
export function parseCSVData(csvText: string): Record<string, any>[] {
  const cleanCsvText = csvText.replace(/^\uFEFF/, '');
  const result = Papa.parse(cleanCsvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    transformHeader: (header: string) => header.replace(/^\uFEFF/, '').trim(),
  });
  return (result.data as Record<string, any>[]) || [];
}

/**
 * Parse Excel buffer
 */
export function parseExcelBuffer(buffer: Buffer | ArrayBuffer): Record<string, any>[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const worksheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(worksheet);
}

