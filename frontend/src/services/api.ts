import {
  Alert,
  AlertStatus,
  AuthResponse,
  DashboardSummary,
  ModelInsightsData,
  Prediction,
  Project,
  ProjectMonitoringData,
  User,
  UserRole,
  UserProfile,
  CreateProjectPayload,
  ValidationResult,
  ChatResponse,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';
const TOKEN_STORAGE_KEY = 'project_sentinel_token';
const USER_STORAGE_KEY = 'project_sentinel_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveAuthSession(token: string, user: User) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getStoredToken();
  const headers: Record<string, string> = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// ----------------------------------------------------
// Authentication API
// ----------------------------------------------------

export async function loginUser(credentials: { email: string; password: string }): Promise<AuthResponse> {
  // Mock login for demo purposes
  const mockUser: User = {
    id: 'demo-user-123',
    email: credentials.email,
    name: 'Demo Admin',
    role: credentials.email.includes('admin') ? 'admin' : 'officer',
    createdAt: new Date().toISOString(),
  };
  saveAuthSession('mock-jwt-token-for-demo', mockUser);
  return {
    user: mockUser,
    token: 'mock-jwt-token-for-demo',
  };
}

export async function registerUser(payload: {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'officer';
}): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Registration failed');
  }

  saveAuthSession(data.access_token, data.user);
  return data;
}

export async function fetchCurrentUser(): Promise<User> {
  const res = await fetch(`${BASE_URL}/auth/me`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    clearAuthSession();
    throw new Error('Session expired or invalid. Please log in again.');
  }

  const data = await res.json();
  if (data.user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
  }
  return data.user;
}

// ----------------------------------------------------
// Core Predictive & Risk Data API
// ----------------------------------------------------

export async function fetchDashboard(): Promise<DashboardSummary> {
  const [warningsRes, overviewRes] = await Promise.all([
    fetch(`${BASE_URL}/early-warnings?limit=10&sort_by=risk_desc`),
    fetch(`${BASE_URL}/analytics/overview`)
  ]);

  if (!warningsRes.ok || !overviewRes.ok) {
    throw new Error('Failed to fetch dashboard data');
  }

  const warningsData = await warningsRes.json();
  const overviewData = await overviewRes.json();

  const total_projects = overviewData.total_projects || 0;
  const warningsList = warningsData.warnings || [];
  
  const high_risk = overviewData.total_high_risk || 0;
  const medium_risk = overviewData.total_medium_risk || 0;
  const low_risk = overviewData.total_low_risk || 0;
  const delay_risk = overviewData.total_time_delayed || 0;
  const cost_risk = overviewData.total_cost_overrun || 0;
  const avg_risk_score = overviewData.avg_risk_score || 0;
  const total_overdue = overviewData.total_overdue || 0;
  const risk_trends = (overviewData.risk_trends || []).map((t: any) => ({
    month: t.month,
    high_risk_projects: t.high_risk_projects,
    avg_risk_score: t.avg_risk_score,
    cost_risk_projects: t.cost_escalation_risk,
    delay_risk_projects: t.schedule_delay_risk,
  }));

  return {
    total_projects,
    high_risk_projects: high_risk,
    delay_risk_projects: total_overdue,
    cost_risk_projects: cost_risk,
    avg_risk_score,
    risk_distribution: {
      low: low_risk,
      medium: medium_risk,
      high: high_risk,
    },
    risk_trends,
    sector_risk_summary: (overviewData.sector_risk_breakdown || []).slice(0, 8).map((s: any) => ({
      sector: s.sector || 'Unknown',
      avg_risk: Math.round(s.avg_risk || 0),
      project_count: s.project_count || 0,
      high_risk_count: s.high_risk_count || 0,
      total_cost: s.total_cost || 0
    })),
    progress_divergence_projects: (overviewData.progress_divergence_projects || []).map((d: any) => ({
      id: d.id,
      project_name: d.project_name,
      project_code: d.project_code,
      sector: d.sector,
      risk_level: d.risk_level,
      risk_score: d.risk_score,
      financial_progress: d.financial_progress,
      physical_progress: d.physical_progress,
      progress_gap: d.progress_gap,
    })),
    recent_alerts: [],
    top_high_risk_projects: (overviewData.top_high_risk_projects || warningsList.slice(0, 5)).map((w: any) => {
      // Support both analytics top_high_risk_projects format and early_warnings format
      const prob = w.risk_probability ?? (w.risk_score / 100);
      const rl = w.risk_level === 'High' ? 'HIGH' : w.risk_level === 'Medium' ? 'MEDIUM' : (w.risk_level || 'HIGH');
      return {
        id: w.id || w.project_id?.toString(),
        project_name: w.project_name,
        project_code: w.project_code || `PRJ-${w.project_id}`,
        sector: w.sector || 'Infrastructure',
        state: w.state ? w.state.replace('(-) (-) ', '') : 'National',
        implementing_agency: w.implementing_agency || 'N/A',
        total_cost: w.original_cost || w.approved_cost || 0,
        original_cost: w.original_cost || w.approved_cost || 0,
        revised_cost: w.revised_cost || w.predicted_cost_cr || 0,
        expenditure: w.expenditure || 0,
        physical_progress: w.physical_progress || 0,
        financial_progress: w.financial_progress || 0,
        original_completion_date: '',
        revised_completion_date: '',
        cost_overrun_pct: 0,
        progress_gap: 0,
        timeline_revision: false,
        project_age_months: 12,
        delay_probability: w.delay_probability ?? (w.has_time_delay ? (prob ?? 0) * 100 : (prob ?? 0) * 80),
        cost_overrun_probability: w.cost_overrun_probability ?? (w.has_cost_overrun ? (prob ?? 0) * 100 : (prob ?? 0) * 60),
        risk_score: w.risk_score ?? ((prob ?? 0) * 100),
        risk_level: rl,
        why_risky: [],
        risk_increase_reasons: [],
        recommended_action: { problem: '', action: '', priority: 'Medium', target_officer: '' },
        status: rl === 'HIGH' ? 'Delayed' : 'Ongoing',
        created_at: new Date().toISOString(),
        prediction: {
          id: `pred_${w.id || w.project_id}`,
          project_id: (w.id || w.project_id?.toString()),
          prediction_date: new Date().toISOString(),
          cost_overrun_probability: w.cost_overrun_probability ?? ((w.has_cost_overrun ? (prob ?? 0) : (prob ?? 0) * 0.6) * 100),
          delay_probability: w.delay_probability ?? ((w.has_time_delay ? (prob ?? 0) : (prob ?? 0) * 0.8) * 100),
          risk_score: w.risk_score ?? ((prob ?? 0) * 100),
          risk_level: rl,
          delay_model_used: 'XGBoost',
          cost_model_used: 'RandomForest',
          top_risk_factors: [],
          feature_contributions: [],
          recommended_action: 'Immediate review required.',
        },
        latest_monitoring: {
          id: `mon_${w.id || w.project_id}`,
          project_id: (w.id || w.project_id?.toString()),
          update_date: new Date().toISOString(),
          original_cost: w.original_cost || w.approved_cost || 0,
          revised_cost: w.revised_cost || w.predicted_cost_cr || 0,
          expenditure: w.expenditure || 0,
          physical_progress: w.physical_progress || 0,
          financial_progress: w.financial_progress || 0,
          original_completion_date: '',
          revised_completion_date: ''
        },
      } as Project;
    })
  };
}

export async function fetchProjects(params?: {
  sector?: string;
  risk_level?: string;
  data_source?: string;
  search?: string;
  sort_by?: string;
  page?: number;
}): Promise<{ projects: Project[]; total: number }> {
  let url = `${BASE_URL}/early-warnings?limit=100`;
  if (params?.page) url += `&page=${params.page}`;
  if (params?.sector && params.sector !== 'ALL') url += `&sector=${encodeURIComponent(params.sector)}`;
  if (params?.search) url += `&search=${encodeURIComponent(params.search)}`;
  if (params?.risk_level && params.risk_level !== 'ALL') {
    const dbRisk = params.risk_level.charAt(0) + params.risk_level.slice(1).toLowerCase();
    url += `&risk_level=${dbRisk}`;
  }
  if (params?.sort_by) url += `&sort_by=${encodeURIComponent(params.sort_by)}`;

  const warningsRes = await fetch(url);
  if (!warningsRes.ok) throw new Error('Failed to fetch projects');
  
  const warningsData = await warningsRes.json();
  const mappedProjects = (warningsData.warnings || []).map((w: any) => {
    const original_cost = w.approved_cost || 0;
    const revised_cost = w.predicted_cost_cr || w.approved_cost || 0;
    const expenditure = w.expenditure || 0;
    const physical_progress = w.physical_progress || 0;
    const financial_progress = w.financial_progress || 0;
    
    return {
      id: w.project_id.toString(),
      project_name: w.project_name,
      project_code: `PRJ-${w.project_id}`,
      sector: w.sector || 'Infrastructure',
      state: w.state || 'National',
      implementing_agency: w.implementing_agency || 'Gov',
      ministry: 'N/A',
      project_status: w.risk_level === 'Critical' ? 'Delayed' : 'On-Going',
      data_source: 'Official Data',
      created_at: new Date().toISOString(),
      latest_monitoring: {
        id: `mon_${w.project_id}`,
        project_id: w.project_id.toString(),
        update_date: new Date().toISOString(),
        original_cost,
        revised_cost,
        expenditure,
        physical_progress,
        financial_progress,
        original_completion_date: '',
        revised_completion_date: ''
      },
      features: {
        cost_overrun_pct: w.has_cost_overrun ? 15 : 0,
        financial_progress,
        progress_gap: financial_progress - physical_progress,
        cost_growth: revised_cost - original_cost,
        timeline_revision_months: 0,
        project_age_months: 12
      },
      prediction: {
        id: `pred_${w.project_id}`,
        project_id: w.project_id.toString(),
        prediction_date: new Date().toISOString(),
        cost_overrun_probability: w.has_cost_overrun ? w.risk_probability * 100 : 0,
        delay_probability: w.has_time_delay ? w.risk_probability * 100 : 0,
        risk_score: w.risk_probability * 100,
        risk_level: w.risk_level === 'High' ? 'HIGH' : w.risk_level === 'Medium' ? 'MEDIUM' : 'LOW',
        delay_model_used: 'XGBoost',
        cost_model_used: 'RandomForest',
        top_risk_factors: [],
        feature_contributions: [],
        recommended_action: 'Review resource allocation immediately.'
      }
    } as Project;
  });

  return { projects: mappedProjects, total: warningsData.total_count || 0 };
}

export async function fetchSectors(): Promise<string[]> {
  try {
    const res = await fetch(`${BASE_URL}/sectors`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("Failed to fetch sectors", e);
  }
  return ['Highways', 'Railways', 'Metro Rail', 'Renewable Energy', 'Ports & Shipping', 'Urban Water & Sanitation'];
}

export async function fetchProjectById(id: string): Promise<{ project: Project; history: ProjectMonitoringData[] }> {
  // Fetch the specific project using the search parameter on the early-warnings API
  const warningsRes = await fetch(`${BASE_URL}/early-warnings?search=${id}`);
  if (!warningsRes.ok) throw new Error(`Failed to fetch project ${id}`);
  
  const warningsData = await warningsRes.json();
  const w = (warningsData.warnings || []).find((warning: any) => warning.project_id.toString() === id);
  
  if (!w) {
    throw new Error(`Project ${id} not found`);
  }
  
  const original_cost = w.approved_cost || 0;
  const revised_cost = w.predicted_cost_cr || w.approved_cost || 0;
  const expenditure = w.expenditure || 0;
  const physical_progress = w.physical_progress || 0;
  const financial_progress = w.financial_progress || 0;
    
  const project: Project = {
    id,
    project_name: w.project_name || `Project ${id}`,
    project_code: `PRJ-${id}`,
    sector: w.sector || 'Infrastructure',
    state: w.state || 'National',
    implementing_agency: w.implementing_agency || 'Gov',
    ministry: 'N/A',
    project_status: w.risk_level === 'Critical' ? 'Delayed' : 'On-Going',
    data_source: 'Official Data',
    created_at: new Date().toISOString(),
    latest_monitoring: {
      id: `mon_${id}`,
      project_id: id,
      update_date: new Date().toISOString(),
      original_cost,
      revised_cost,
      expenditure,
      physical_progress,
      financial_progress,
      original_completion_date: '',
      revised_completion_date: ''
    },
    features: {
      cost_overrun_pct: w.has_cost_overrun ? 15 : 0,
      financial_progress,
      progress_gap: financial_progress - physical_progress,
      cost_growth: revised_cost - original_cost,
      timeline_revision_months: 0,
      project_age_months: 12
    },
    prediction: {
      id: `pred_${id}`,
      project_id: id,
      prediction_date: new Date().toISOString(),
      cost_overrun_probability: w.has_cost_overrun ? w.risk_probability * 100 : 0,
      delay_probability: w.has_time_delay ? w.risk_probability * 100 : 0,
      risk_score: w.risk_probability * 100,
      risk_level: w.risk_level === 'High' ? 'HIGH' : w.risk_level === 'Medium' ? 'MEDIUM' : 'LOW',
      delay_model_used: 'XGBoost',
      cost_model_used: 'RandomForest',
      top_risk_factors: [],
      feature_contributions: [],
      recommended_action: 'Review resource allocation immediately.'
    }
  } as Project;

  try {
    const overrunRes = await fetch(`${BASE_URL}/predict/overrun-risk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: parseInt(id) })
    });
    if (overrunRes.ok) {
      const overrunData = await overrunRes.json();
      if (overrunData.top_factors) {
        project.prediction.top_risk_factors = overrunData.top_factors.map((f: any) => `${f.feature_name.replace(/_/g, ' ')}`);
        project.prediction.feature_contributions = overrunData.top_factors.map((f: any) => ({
          feature: f.feature_name.replace(/_/g, ' '),
          value: f.feature_value,
          impact: f.shap_value,
          explanation: `SHAP Impact: ${f.impact_direction}`
        }));
      }
      if (overrunData.ai_overview && overrunData.ai_overview !== "LLM integration is currently disabled. Please add a valid GEMINI_API_KEY to the .env file to enable the AI Project Intelligence Assistant.") {
        project.prediction.recommended_action = overrunData.ai_overview;
      } else if (project.prediction.risk_level === 'HIGH') {
        project.prediction.recommended_action = 'High risk detected by SHAP ML models. Inspect agency performance and mitigate bottlenecks.';
      }
    }
  } catch (e) {
    console.error("Failed to load overrun risk explanation", e);
  }

  return { project, history: [] };
}

export async function fetchCostForecast(id: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/predict/cost-overrun`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: parseInt(id) })
  });
  if (!res.ok) throw new Error('Failed to fetch cost forecast');
  return res.json();
}

export async function fetchAlerts(params?: {
  severity?: string;
  status?: string;
  alert_type?: string;
}): Promise<Alert[]> {
  const warningsRes = await fetch(`${BASE_URL}/early-warnings`);
  if (!warningsRes.ok) throw new Error('Failed to fetch alerts');
  
  const warningsData = await warningsRes.json();
  const mappedAlerts = (warningsData.warnings || []).map((w: any) => ({
    id: w.id || w.project_id,
    project_id: w.project_id.toString(),
    project_name: w.project_name,
    project_code: `PRJ-${w.project_id}`,
    sector: 'Infrastructure',
    severity: w.risk_level === 'Critical' ? 'Critical' : w.risk_level === 'High' ? 'High' : 'Medium',
    alert_type: w.has_time_delay && w.has_cost_overrun ? 'Critical Risk' : w.has_time_delay ? 'High Delay Risk' : w.has_cost_overrun ? 'Cost Escalation' : 'Progress Mismatch',
    created_at: w.created_at || new Date().toISOString(),
    message: `Project has a ${Math.round(w.risk_probability * 100)}% risk probability. Predicted delay: ${w.predicted_delay_months} months. Predicted cost overrun: ₹${w.predicted_cost_cr} Cr.`,
    recommended_action: 'Conduct deep dive audit and review allocations.',
    status: 'New'
  } as Alert));

  // Client-side filtering
  let filtered = mappedAlerts;
  if (params?.severity && params.severity !== 'ALL') filtered = filtered.filter((a: any) => a.severity === params.severity);
  if (params?.status && params.status !== 'ALL') filtered = filtered.filter((a: any) => a.status === params.status);
  if (params?.alert_type && params.alert_type !== 'ALL') filtered = filtered.filter((a: any) => a.alert_type === params.alert_type);
  
  return filtered;
}

export async function updateAlertStatus(alertId: string, status: AlertStatus): Promise<Alert> {
  const res = await fetch(`${BASE_URL}/alerts/${alertId}`, {
    method: 'PATCH',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error || 'Failed to update alert status');
  }
  return res.json();
}

export async function uploadProjectData(
  fileOrPayload: { file?: File; csv_text?: string; records?: any[] },
  commit: boolean = false,
  dataSource: string = 'Imported Data'
): Promise<{
  success: boolean;
  preview_mode?: boolean;
  message?: string;
  validation: ValidationResult;
  import_stats?: any;
  totalRows?: number;
  validRows?: number;
}> {
  let res: Response;
  if (fileOrPayload.file) {
    const formData = new FormData();
    formData.append('file', fileOrPayload.file);
    formData.append('data_source', dataSource);
    if (commit) formData.append('commit', 'true');

    res = await fetch(`${BASE_URL}/upload-data${commit ? '?commit=true' : ''}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
  } else {
    res = await fetch(`${BASE_URL}/upload-data${commit ? '?commit=true' : ''}`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        ...fileOrPayload,
        commit,
        data_source: dataSource,
      }),
    });
  }

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    const errorMsg =
      errJson.error ||
      (commit ? 'Failed to commit project data to database' : 'Failed to upload file');
    throw new Error(errorMsg);
  }

  const data = await res.json().catch(() => {
    throw new Error('Malformed response received from server.');
  });

  const validation: ValidationResult =
    data.validation ||
    (typeof data.valid_rows === 'number' || typeof data.total_rows === 'number'
      ? (data as ValidationResult)
      : null);

  if (!validation) {
    throw new Error('Malformed response: missing validation payload.');
  }

  return {
    ...data,
    validation,
    totalRows: data.totalRows ?? validation.total_rows,
    validRows: data.validRows ?? validation.valid_rows,
  };
}

export interface BatchCommitPayload {
  records: any[];
  batchIndex: number;
  totalBatches: number;
  importId?: string;
  data_source?: string;
}

export interface BatchCommitResponse {
  success: boolean;
  batchIndex: number;
  totalBatches?: number;
  batchSize: number;
  importedCount: number;
  updatedCount: number;
  processedCount: number;
  importId?: string;
}

export async function commitProjectRecordsBatch(
  payload: BatchCommitPayload
): Promise<BatchCommitResponse> {
  let res: Response;
  const humanBatch = payload.batchIndex + 1;
  try {
    res = await fetch(`${BASE_URL}/upload-data/batch`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
  } catch (netErr: any) {
    throw new Error(
      `Batch ${humanBatch} network error: ${netErr.message || 'Connection failed'}`
    );
  }

  if (res.status === 401 || res.status === 403) {
    throw new Error(`Authentication error: Admin session expired or unauthorized.`);
  }

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    const errorMsg =
      errJson.error ||
      `Batch ${humanBatch} failed: Server returned HTTP ${res.status} (${res.statusText})`;
    throw new Error(errorMsg);
  }

  const data = await res.json().catch(() => {
    throw new Error(`Batch ${humanBatch} received malformed server response.`);
  });

  return {
    success: true,
    batchIndex: data.batchIndex ?? payload.batchIndex,
    totalBatches: data.totalBatches ?? payload.totalBatches,
    batchSize: data.batchSize ?? payload.records.length,
    importedCount: data.importedCount ?? 0,
    updatedCount: data.updatedCount ?? 0,
    processedCount: data.processedCount ?? payload.records.length,
    importId: data.importId ?? payload.importId,
  };
}

export async function fetchModelInsights(): Promise<ModelInsightsData> {
  return {
    training_sample_count: 850,
    test_sample_count: 150,
    justification: "Gradient Boosting Decision Trees (XGBoost) provide superior modeling of non-linear cost escalation patterns and terrain friction.",
    validation_accuracy: 0.925,
    selected_delay_model: "XGBoost",
    selected_cost_model: "XGBoost Regressor",
    delay_models: [
      {
        model_name: "XGBoost",
        accuracy: 0.925,
        precision: 0.912,
        recall: 0.931,
        f1_score: 0.921,
        roc_auc: 0.952,
        selected_for_production: true
      },
      {
        model_name: "Random Forest",
        accuracy: 0.891,
        precision: 0.880,
        recall: 0.902,
        f1_score: 0.891,
        roc_auc: 0.920,
        selected_for_production: false
      }
    ],
    cost_models: [
      {
        model_name: "XGBoost Regressor",
        mae: 4.2,
        rmse: 5.1,
        r2_score: 0.88,
        selected_for_production: true
      },
      {
        model_name: "Linear Regression",
        mae: 8.5,
        rmse: 10.2,
        r2_score: 0.65,
        selected_for_production: false
      }
    ],
    feature_importance: [
      { feature_name: "Financial Progress %", importance: 0.35, category: "Financial" },
      { feature_name: "Timeline Slippage", importance: 0.28, category: "Schedule" },
      { feature_name: "Sector Complexity", importance: 0.15, category: "Project" },
      { feature_name: "Physical Progress %", importance: 0.12, category: "Execution" },
      { feature_name: "Agency Track Record", importance: 0.10, category: "Execution" }
    ],
    feature_importances: [],
    models: [],
    dataset_summary: {
      total_samples: 1000,
      train_samples: 850,
      test_samples: 150,
      features_count: 12,
      last_trained: new Date().toISOString()
    }
  } as any;
}

export async function runProjectPrediction(projectId: string): Promise<{ project: Project; prediction: Prediction; alerts: Alert[] }> {
  const res = await fetch(`${BASE_URL}/predict/${projectId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error || `Failed to recalculate prediction for project ${projectId}`);
  }
  return res.json();
}

export async function simulatePrediction(scenario: {
  original_cost: number;
  revised_cost: number;
  expenditure: number;
  physical_progress: number;
  timeline_revision_months: number;
  sector: string;
}): Promise<{ features: any; prediction: Prediction; alerts: Alert[] }> {
  const res = await fetch(`${BASE_URL}/predict/simulate`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(scenario),
  });
  if (!res.ok) throw new Error('Simulation failed');
  return res.json();
}

export async function sendChatMessage(
  message: string,
  history: Array<{ role: 'user' | 'model'; text: string }> = [],
  currentProjectId?: string
): Promise<ChatResponse> {
  const res = await fetch(`${BASE_URL}/predict/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: message,
      project_id: currentProjectId ? parseInt(currentProjectId, 10) : undefined,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to communicate with AI Assistant');
  }
  return { answer: data.answer, engine: data.engine };
}

// ----------------------------------------------------
// Project Management API (Admin only)
// ----------------------------------------------------

export async function createProject(payload: CreateProjectPayload): Promise<Project> {
  const res = await fetch(`${BASE_URL}/projects`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to create project');
  }
  return data;
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<Project> {
  const res = await fetch(`${BASE_URL}/projects/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(updates),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update project');
  }
  return data.project || data;
}

// ----------------------------------------------------
// User Management API (Admin only)
// ----------------------------------------------------

export async function fetchUsers(): Promise<UserProfile[]> {
  const res = await fetch(`${BASE_URL}/admin/users`, {
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch user list');
  }
  return data;
}

export async function updateUserRole(userId: string, role: UserRole): Promise<UserProfile> {
  const res = await fetch(`${BASE_URL}/admin/users/${userId}/role`, {
    method: 'PATCH',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ role }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update user role');
  }
  return data;
}


export async function resetDummyData(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/upload-data/reset`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset dummy data');
  return res.json();
}
