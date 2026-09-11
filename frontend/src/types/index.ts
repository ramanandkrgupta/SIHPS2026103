export interface Project {
  id: string;
  project_code: string;
  project_name: string;
  sector: string;
  ministry: string;
  implementing_agency: string;
  state: string;
  project_status: 'Ongoing' | 'Delayed' | 'Critical' | 'Completed';
  created_at: string;
  data_source: 'Demo Data' | 'Imported Data' | 'Official Data';
  // Latest monitoring summary
  original_cost: number; // In Crores INR (₹)
  revised_cost: number;
  expenditure: number;
  physical_progress: number; // 0 - 100%
  financial_progress: number; // 0 - 100%
  original_completion_date: string;
  revised_completion_date: string;
  // Computed features
  cost_overrun_pct: number;
  progress_gap: number; // financial - physical
  timeline_revision: boolean;
  project_age_months: number;
  // Predictions & Risk
  delay_probability: number; // 0 - 100%
  cost_overrun_probability: number; // 0 - 100%
  risk_score: number; // 0 - 100
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  // Explainability & Actions
  why_risky: string[];
  risk_increase_reasons: string[];
  recommended_action: {
    problem: string;
    action: string;
    priority: 'Critical' | 'High' | 'Medium' | 'Low';
    target_officer: string;
  };
}

export interface MonthlyMonitoringRecord {
  id: string;
  project_id: string;
  month: string; // e.g., 'Jan 2026', 'Feb 2026'
  record_month?: string;
  date: string;
  physical_progress: number;
  financial_progress: number;
  progress_gap?: number;
  cost_overrun_pct?: number;
  revised_cost: number;
  expenditure: number;
  risk_score: number;
  delay_probability: number;
  cost_overrun_probability: number;
  timeline_revision?: boolean;
  key_milestone_note?: string;
}

export interface Alert {
  id: string;
  project_id: string;
  project_name: string;
  project_code: string;
  sector: string;
  alert_type: 'High Delay Risk' | 'Cost Escalation' | 'Progress Mismatch' | 'Timeline Revision' | 'Critical Risk';
  severity: 'Critical' | 'High' | 'Medium';
  message: string;
  recommended_action: string;
  suggested_action?: string;
  created_at: string;
  status: 'New' | 'Reviewed' | 'Resolved';
}

export interface DashboardStats {
  total_projects: number;
  high_risk_projects: number;
  delay_risk_projects: number;
  cost_risk_projects: number;
  risk_distribution: {
    low: number;
    medium: number;
    high: number;
  };
  sector_risk: {
    sector: string;
    avg_risk: number;
    project_count: number;
  }[];
  progress_gap_projects: {
    id: string;
    project_name: string;
    sector: string;
    physical_progress: number;
    financial_progress: number;
    gap: number;
    risk_score: number;
  }[];
  top_high_risk_projects: Project[];
}

export interface ModelComparison {
  model_name: string;
  task: 'Delay' | 'Cost';
  type: string;
  metric_name: string;
  metric_value: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  is_selected: boolean;
  selection_reason: string;
  selected?: boolean;
  target?: string;
}

export interface ModelInsightsData {
  models: ModelComparison[];
  models_comparison?: ModelComparison[];
  feature_importances: {
    feature: string;
    importance: number;
    description: string;
  }[];
  feature_importance?: {
    feature: string;
    importance: number;
    description: string;
  }[];
  dataset_summary: {
    total_samples: number;
    train_samples: number;
    test_samples: number;
    features_count: number;
    last_trained: string;
  };
  selection_rationale?: string;
}

export interface UserSession {
  email: string;
  name: string;
  role: 'Admin' | 'Officer/Analyst' | 'Viewer';
  department?: string;
  isAuthenticated: boolean;
  user_id?: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: 'Admin' | 'Officer/Analyst' | 'Viewer';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
  is_protected?: boolean; // True for the immutable constant admin: agrimsingh18@gmail.com
}

export interface DataImportRecord {
  id: string;
  file_name: string;
  file_type: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  data_source: string;
  uploaded_by: string;
  import_status: 'Imported' | 'Failed' | 'Pending';
  created_at: string;
}

export interface ActivityLogRecord {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  description: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface SystemStatus {
  database: {
    status: 'connected' | 'error';
    type: string;
    details: string;
    total_projects?: number;
  };
  ml_model: {
    status: 'ready' | 'degraded' | 'not_ready';
    name: string;
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    features_count: number;
    total_samples: number;
    last_trained: string;
  };
  gemini: {
    status: 'configured' | 'not_configured' | 'connection_failed';
    model?: string;
    notes?: string;
  };
  system_uptime: number;
  server_time: string;
}

export interface AdminDashboardStats {
  total_users: number;
  active_users: number;
  uploaded_datasets: number;
  latest_data_upload: string | null;
  role_distribution: {
    admin: number;
    officer: number;
    viewer: number;
  };
}

export interface PredictionRecord {
  id: string;
  project_id: string;
  project_name?: string;
  project_code?: string;
  delay_probability: number;
  cost_overrun_probability: number;
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  model_name: string;
  created_at: string;
}

export interface RiskFactorRecord {
  id: string;
  project_id: string;
  project_name?: string;
  factor: string;
  description: string;
  category?: string;
  impact: number;
  is_ai_generated: boolean;
  created_at: string;
}

export interface RecommendationRecord {
  id: string;
  project_id: string;
  project_name?: string;
  problem: string;
  recommended_action: string;
  expected_impact?: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  target_officer: string;
  created_at: string;
}

export interface AdminOverviewStats {
  total_users: number;
  total_projects: number;
  total_monitoring_records: number;
  total_predictions: number;
  total_alerts: number;
  total_datasets: number;
  total_recommendations: number;
  total_activity_logs: number;
}
