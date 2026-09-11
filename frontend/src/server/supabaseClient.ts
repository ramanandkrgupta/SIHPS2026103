/**
 * Project Sentinel AI - Supabase Server Client & Integration
 * Architecture: React Frontend -> FastAPI / Express Backend -> Supabase PostgreSQL
 * Project ID: cqbfcvxwbpqasfvuycge
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Strictly configure user's Supabase project credentials
export const SUPABASE_PROJECT_ID = 'cqbfcvxwbpqasfvuycge';
export const SUPABASE_URL = 'https://cqbfcvxwbpqasfvuycge.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_D6ZJL_wT4md_kTNvYOteOA_pN7m94gX';

let supabaseClientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClientInstance) {
    supabaseClientInstance = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseClientInstance;
}

export interface SupabaseHealthStatus {
  connected: boolean;
  project_id: string;
  url: string;
  tables_status: {
    profiles: boolean;
    projects: boolean;
    project_monitoring: boolean;
    predictions: boolean;
    risk_factors: boolean;
    recommendations: boolean;
    alerts: boolean;
    data_imports: boolean;
    activity_logs: boolean;
    model_results: boolean;
    login_history: boolean;
  };
  storage_status: {
    connected: boolean;
    buckets: string[];
  };
  details: string;
  last_checked: string;
}

/**
 * Validates Supabase PostgreSQL connectivity and checks table availability
 */
export async function testSupabaseConnection(): Promise<SupabaseHealthStatus> {
  const sb = getSupabaseClient();
  const tables = [
    'profiles',
    'projects',
    'project_monitoring',
    'predictions',
    'risk_factors',
    'recommendations',
    'alerts',
    'data_imports',
    'activity_logs',
    'model_results',
    'login_history',
  ] as const;

  const tablesStatus: Record<string, boolean> = {};
  let overallConnected = false;
  let errorCount = 0;

  for (const table of tables) {
    try {
      const { error } = await sb.from(table).select('id', { count: 'exact', head: true });
      if (!error) {
        tablesStatus[table] = true;
        overallConnected = true;
      } else {
        tablesStatus[table] = false;
        errorCount++;
      }
    } catch {
      tablesStatus[table] = false;
      errorCount++;
    }
  }

  // Check storage buckets
  let storageConnected = false;
  const storageBuckets: string[] = [];
  try {
    const { data: buckets, error: bError } = await sb.storage.listBuckets();
    if (!bError && Array.isArray(buckets)) {
      storageConnected = true;
      buckets.forEach((b) => storageBuckets.push(b.name));
    }
  } catch {}

  return {
    connected: overallConnected,
    project_id: SUPABASE_PROJECT_ID,
    url: SUPABASE_URL,
    tables_status: tablesStatus as any,
    storage_status: {
      connected: storageConnected,
      buckets: storageBuckets,
    },
    details: overallConnected
      ? `Successfully connected to Supabase (${SUPABASE_PROJECT_ID}). ${tables.length - errorCount}/${tables.length} tables verified.`
      : `Connected to Supabase endpoint (${SUPABASE_URL}). Run supabase/schema.sql in the Supabase SQL editor to create all 11 tables.`,
    last_checked: new Date().toISOString(),
  };
}

/**
 * 1. PROFILES: Save or update profile in Supabase
 */
export async function persistProfileToSupabase(profile: {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at?: string;
}): Promise<boolean> {
  try {
    const sb = getSupabaseClient();
    const { error } = await sb.from('profiles').upsert(
      {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        status: profile.status,
        created_at: profile.created_at || new Date().toISOString(),
      },
      { onConflict: 'email' }
    );
    if (error) {
      console.warn('[Supabase persistProfile warning]', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase persistProfile error]', err.message);
    return false;
  }
}

/**
 * 2. PROJECTS: Save or update project in Supabase
 */
export async function persistProjectToSupabase(project: {
  id: string;
  project_code: string;
  project_name: string;
  sector: string;
  ministry: string;
  agency?: string;
  implementing_agency?: string;
  state: string;
  status?: string;
  project_status?: string;
  data_source?: string;
  created_at?: string;
}): Promise<boolean> {
  try {
    const sb = getSupabaseClient();
    const agencyName = project.agency || project.implementing_agency || 'Unassigned Agency';
    const statusVal = project.status || project.project_status || 'Ongoing';

    const { error } = await sb.from('projects').upsert(
      {
        id: String(project.id),
        project_code: project.project_code,
        project_name: project.project_name,
        sector: project.sector,
        ministry: project.ministry,
        agency: agencyName,
        state: project.state,
        status: statusVal,
        data_source: project.data_source || 'MoSPI Infrastructure Monitor',
        created_at: project.created_at || new Date().toISOString(),
      },
      { onConflict: 'project_code' }
    );
    if (error) {
      console.warn('[Supabase persistProject warning]', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase persistProject error]', err.message);
    return false;
  }
}

/**
 * 3. PROJECT MONITORING: Save monitoring record
 */
export async function persistMonitoringRecordToSupabase(record: {
  id: string;
  project_id: string;
  update_date?: string;
  original_cost: number;
  revised_cost: number;
  expenditure: number;
  physical_progress: number;
  financial_progress?: number;
  original_completion_date: string;
  revised_completion_date: string;
}): Promise<boolean> {
  try {
    const sb = getSupabaseClient();
    const financialProg =
      record.financial_progress !== undefined
        ? record.financial_progress
        : Math.round((record.expenditure / (record.revised_cost || 1)) * 100);

    const { error } = await sb.from('project_monitoring').upsert({
      id: String(record.id),
      project_id: String(record.project_id),
      update_date: record.update_date || new Date().toISOString(),
      original_cost: record.original_cost,
      revised_cost: record.revised_cost,
      expenditure: record.expenditure,
      physical_progress: record.physical_progress,
      financial_progress: financialProg,
      original_completion_date: record.original_completion_date,
      revised_completion_date: record.revised_completion_date,
    });
    if (error) {
      console.warn('[Supabase persistMonitoringRecord warning]', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase persistMonitoringRecord error]', err.message);
    return false;
  }
}

/**
 * 4. PREDICTIONS, 5. RISK FACTORS, 6. RECOMMENDATIONS
 */
export async function persistPredictionToSupabase(
  prediction: {
    id: string;
    project_id: string;
    prediction_date?: string;
    delay_probability: number;
    cost_overrun_probability: number;
    risk_score: number;
    risk_level: string;
    model_name?: string;
  },
  riskFactors?: Array<{ factor: string; description: string; impact: number }>,
  recommendation?: { problem: string; recommended_action: string; priority: string }
): Promise<boolean> {
  try {
    const sb = getSupabaseClient();
    const { error: predErr } = await sb.from('predictions').upsert({
      id: String(prediction.id),
      project_id: String(prediction.project_id),
      prediction_date: prediction.prediction_date || new Date().toISOString(),
      delay_probability: prediction.delay_probability,
      cost_overrun_probability: prediction.cost_overrun_probability,
      risk_score: prediction.risk_score,
      risk_level: prediction.risk_level,
      model_name: prediction.model_name || 'Sentinel-Ensemble-XGB',
    });

    if (predErr) {
      console.warn('[Supabase persistPrediction warning]', predErr.message);
      return false;
    }

    // Save risk factors if provided
    if (riskFactors && riskFactors.length > 0) {
      const rows = riskFactors.map((rf, idx) => ({
        id: `rf-${prediction.id}-${idx}`,
        prediction_id: String(prediction.id),
        factor: rf.factor,
        description: rf.description,
        impact: rf.impact,
      }));
      await sb.from('risk_factors').upsert(rows);
    }

    // Save recommendation if provided
    if (recommendation) {
      await sb.from('recommendations').upsert({
        id: `rec-${prediction.id}`,
        project_id: String(prediction.project_id),
        prediction_id: String(prediction.id),
        problem: recommendation.problem,
        recommended_action: recommendation.recommended_action,
        priority: recommendation.priority || 'Medium',
      });
    }

    return true;
  } catch (err: any) {
    console.warn('[Supabase persistPrediction error]', err.message);
    return false;
  }
}

/**
 * 7. ALERTS: Save or update early warning alert
 */
export async function persistAlertToSupabase(alert: {
  id: string;
  project_id: string;
  prediction_id?: string;
  alert_type: string;
  severity: string;
  message: string;
  recommended_action: string;
  status: string;
  created_at?: string;
}): Promise<boolean> {
  try {
    const sb = getSupabaseClient();
    const { error } = await sb.from('alerts').upsert({
      id: String(alert.id),
      project_id: String(alert.project_id),
      prediction_id: alert.prediction_id ? String(alert.prediction_id) : null,
      alert_type: alert.alert_type,
      severity: alert.severity,
      message: alert.message,
      recommended_action: alert.recommended_action,
      status: alert.status || 'New',
      created_at: alert.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.warn('[Supabase persistAlert warning]', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase persistAlert error]', err.message);
    return false;
  }
}

/**
 * Update alert status in Supabase
 */
export async function updateAlertStatusInSupabase(alertId: string, status: string): Promise<boolean> {
  try {
    const sb = getSupabaseClient();
    const { error } = await sb
      .from('alerts')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', String(alertId));
    if (error) {
      console.warn('[Supabase updateAlertStatus warning]', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase updateAlertStatus error]', err.message);
    return false;
  }
}

/**
 * 8. DATA IMPORTS: Save dataset import record
 */
export async function persistDataImportToSupabase(importRecord: {
  id: string;
  file_name: string;
  file_type: string;
  uploaded_by: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  import_status: string;
  created_at?: string;
}): Promise<boolean> {
  try {
    const sb = getSupabaseClient();
    const { error } = await sb.from('data_imports').upsert({
      id: String(importRecord.id),
      file_name: importRecord.file_name,
      file_type: importRecord.file_type,
      uploaded_by: importRecord.uploaded_by,
      total_rows: importRecord.total_rows,
      valid_rows: importRecord.valid_rows,
      invalid_rows: importRecord.invalid_rows,
      import_status: importRecord.import_status,
      created_at: importRecord.created_at || new Date().toISOString(),
    });
    if (error) {
      console.warn('[Supabase persistDataImport warning]', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase persistDataImport error]', err.message);
    return false;
  }
}

/**
 * 9. ACTIVITY LOGS: Save audit activity log
 */
export async function persistActivityLogToSupabase(log: {
  id: string;
  user_id: string;
  action: string;
  description: string;
  entity_type: string;
  entity_id: string;
  created_at?: string;
}): Promise<boolean> {
  try {
    const sb = getSupabaseClient();
    const { error } = await sb.from('activity_logs').upsert({
      id: String(log.id),
      user_id: log.user_id,
      action: log.action,
      description: log.description,
      entity_type: log.entity_type,
      entity_id: String(log.entity_id),
      created_at: log.created_at || new Date().toISOString(),
    });
    if (error) {
      console.warn('[Supabase persistActivityLog warning]', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase persistActivityLog error]', err.message);
    return false;
  }
}

/**
 * 10. MODEL RESULTS: Save model evaluation results
 */
export async function persistModelResultToSupabase(mr: {
  id: string;
  model_name: string;
  prediction_type: string;
  training_data_size: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  mae: number;
  rmse: number;
  training_date?: string;
}): Promise<boolean> {
  try {
    const sb = getSupabaseClient();
    const { error } = await sb.from('model_results').upsert({
      id: String(mr.id),
      model_name: mr.model_name,
      prediction_type: mr.prediction_type,
      training_data_size: mr.training_data_size,
      accuracy: mr.accuracy,
      precision: mr.precision,
      recall: mr.recall,
      f1_score: mr.f1_score,
      mae: mr.mae,
      rmse: mr.rmse,
      training_date: mr.training_date || new Date().toISOString(),
    });
    if (error) {
      console.warn('[Supabase persistModelResult warning]', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase persistModelResult error]', err.message);
    return false;
  }
}

/**
 * Fetch projects from Supabase
 */
export async function fetchProjectsFromSupabase(): Promise<any[] | null> {
  try {
    const sb = getSupabaseClient();
    const { data, error } = await sb.from('projects').select('*').order('created_at', { ascending: false });
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Fetch monitoring history from Supabase for a project
 */
export async function fetchMonitoringFromSupabase(projectId: string): Promise<any[] | null> {
  try {
    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('project_monitoring')
      .select('*')
      .eq('project_id', String(projectId))
      .order('update_date', { ascending: true });
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Fetch early warning alerts from Supabase
 */
export async function fetchAlertsFromSupabase(): Promise<any[] | null> {
  try {
    const sb = getSupabaseClient();
    const { data, error } = await sb.from('alerts').select('*').order('created_at', { ascending: false });
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Fetch profiles from Supabase
 */
export async function fetchProfilesFromSupabase(): Promise<any[] | null> {
  try {
    const sb = getSupabaseClient();
    const { data, error } = await sb.from('profiles').select('*').order('created_at', { ascending: false });
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Delete profile from Supabase
 */
export async function deleteProfileFromSupabase(id: string): Promise<boolean> {
  try {
    const sb = getSupabaseClient();
    const { error } = await sb.from('profiles').delete().eq('id', String(id));
    if (error) {
      console.warn('[Supabase deleteProfile warning]', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase deleteProfile error]', err.message);
    return false;
  }
}

/**
 * Delete project and associated records from Supabase
 */
export async function deleteProjectFromSupabase(id: string): Promise<boolean> {
  try {
    const sb = getSupabaseClient();
    await sb.from('project_monitoring').delete().eq('project_id', String(id));
    await sb.from('alerts').delete().eq('project_id', String(id));
    await sb.from('predictions').delete().eq('project_id', String(id));
    await sb.from('risk_factors').delete().eq('project_id', String(id));
    await sb.from('recommendations').delete().eq('project_id', String(id));
    const { error } = await sb.from('projects').delete().eq('id', String(id));
    if (error) {
      console.warn('[Supabase deleteProject warning]', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase deleteProject error]', err.message);
    return false;
  }
}

/**
 * Delete monitoring record from Supabase
 */
export async function deleteMonitoringFromSupabase(id: string): Promise<boolean> {
  try {
    const sb = getSupabaseClient();
    const { error } = await sb.from('project_monitoring').delete().eq('id', String(id));
    if (error) {
      console.warn('[Supabase deleteMonitoring warning]', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase deleteMonitoring error]', err.message);
    return false;
  }
}

/**
 * Delete prediction from Supabase
 */
export async function deletePredictionFromSupabase(id: string): Promise<boolean> {
  try {
    const sb = getSupabaseClient();
    await sb.from('risk_factors').delete().eq('prediction_id', String(id));
    await sb.from('recommendations').delete().eq('prediction_id', String(id));
    const { error } = await sb.from('predictions').delete().eq('id', String(id));
    if (error) {
      console.warn('[Supabase deletePrediction warning]', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase deletePrediction error]', err.message);
    return false;
  }
}

/**
 * Delete risk factor from Supabase
 */
export async function deleteRiskFactorFromSupabase(id: string): Promise<boolean> {
  try {
    const sb = getSupabaseClient();
    const { error } = await sb.from('risk_factors').delete().eq('id', String(id));
    if (error) {
      console.warn('[Supabase deleteRiskFactor warning]', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase deleteRiskFactor error]', err.message);
    return false;
  }
}

/**
 * Delete recommendation from Supabase
 */
export async function deleteRecommendationFromSupabase(id: string): Promise<boolean> {
  try {
    const sb = getSupabaseClient();
    const { error } = await sb.from('recommendations').delete().eq('id', String(id));
    if (error) {
      console.warn('[Supabase deleteRecommendation warning]', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase deleteRecommendation error]', err.message);
    return false;
  }
}

/**
 * Delete alert from Supabase
 */
export async function deleteAlertFromSupabase(id: string): Promise<boolean> {
  try {
    const sb = getSupabaseClient();
    const { error } = await sb.from('alerts').delete().eq('id', String(id));
    if (error) {
      console.warn('[Supabase deleteAlert warning]', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase deleteAlert error]', err.message);
    return false;
  }
}

/**
 * Delete dataset import record from Supabase
 */
export async function deleteDataImportFromSupabase(id: string): Promise<boolean> {
  try {
    const sb = getSupabaseClient();
    const { error } = await sb.from('data_imports').delete().eq('id', String(id));
    if (error) {
      console.warn('[Supabase deleteDataImport warning]', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase deleteDataImport error]', err.message);
    return false;
  }
}

/**
 * 11. SUPABASE AUTH: Register / Sign up a user in Supabase Authentication
 */
export async function signUpUserWithSupabase(params: {
  email: string;
  password?: string;
  full_name: string;
  role: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const sb = getSupabaseClient();
    const cleanEmail = params.email.trim().toLowerCase();
    const userPass = params.password && params.password.length >= 6 ? params.password : 'Sentinel2026!';

    const { data, error } = await sb.auth.signUp({
      email: cleanEmail,
      password: userPass,
      options: {
        data: {
          full_name: params.full_name,
          role: params.role,
        },
      },
    });

    if (error) {
      console.warn(`[Supabase Auth signUp warning for ${cleanEmail}]:`, error.message);
      return { success: false, error: error.message };
    }

    // Also persist profile record into Supabase PostgreSQL 'profiles' table
    if (data?.user?.id) {
      await persistProfileToSupabase({
        id: data.user.id,
        name: params.full_name,
        email: cleanEmail,
        role: params.role,
        status: 'Active',
      });
    }

    return { success: true, data };
  } catch (err: any) {
    console.warn('[Supabase Auth signUp error]:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 12. SUPABASE AUTH: Verify user login credentials with Supabase Authentication
 */
export async function signInUserWithSupabase(
  email: string,
  password?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const sb = getSupabaseClient();
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await sb.auth.signInWithPassword({
      email: cleanEmail,
      password: password || '',
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 13. SUPABASE LOGIN EVENT: Persist every login audit event to Supabase
 */
export async function persistLoginEventToSupabase(event: {
  userId?: string;
  email: string;
  role: string;
  fullName?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}): Promise<boolean> {
  const sb = getSupabaseClient();
  const cleanEmail = event.email.trim().toLowerCase();
  const nowIso = new Date().toISOString();
  let anySuccess = false;

  // 1. Log to activity_logs table
  try {
    const { error: actError } = await sb.from('activity_logs').insert({
      id: `login-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      user_id: event.userId || cleanEmail,
      action: 'USER_LOGIN',
      description: `${event.role} ${event.fullName || cleanEmail} (${cleanEmail}) authenticated successfully`,
      entity_type: 'AUTH',
      entity_id: cleanEmail,
      created_at: nowIso,
    });
    if (!actError) {
      anySuccess = true;
    }
  } catch (err: any) {
    console.warn('[Supabase activity_logs login write error]', err.message);
  }

  // 2. Log to login_history table
  try {
    const { error: lhError } = await sb.from('login_history').insert({
      id: `lh-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      email: cleanEmail,
      role: event.role,
      login_at: nowIso,
      raw_user_meta: {
        full_name: event.fullName || 'User',
        ip_address: event.ipAddress || '127.0.0.1',
        user_agent: event.userAgent || 'Web Client',
        ...(event.metadata || {}),
      },
      created_at: nowIso,
    });
    if (!lhError) {
      anySuccess = true;
    }
  } catch (err: any) {
    // Non-fatal if RLS restricts table before policy execution
  }

  return anySuccess;
}

/**
 * 14. Fetch recent login events from Supabase
 */
export async function fetchLoginEventsFromSupabase(limit = 20): Promise<any[]> {
  try {
    const sb = getSupabaseClient();
    // Try login_history first
    const { data: lhData, error: lhErr } = await sb
      .from('login_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!lhErr && Array.isArray(lhData) && lhData.length > 0) {
      return lhData;
    }

    // Fallback to activity_logs with action = 'USER_LOGIN'
    const { data: actData, error: actErr } = await sb
      .from('activity_logs')
      .select('*')
      .eq('action', 'USER_LOGIN')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!actErr && Array.isArray(actData)) {
      return actData.map((a) => ({
        id: a.id,
        email: a.user_id || a.entity_id,
        role: a.description?.includes('Admin') ? 'Admin' : 'Officer/Analyst',
        login_at: a.created_at,
        raw_user_meta: { description: a.description },
      }));
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * 15. SUPABASE STORAGE: Upload dataset or project file to Supabase Storage
 */
export async function uploadFileToSupabaseStorage(
  bucketName: string,
  filePath: string,
  fileData: Buffer | Uint8Array | string,
  contentType = 'application/octet-stream'
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  try {
    const sb = getSupabaseClient();

    // Upload to Supabase Storage bucket
    const { data, error } = await sb.storage.from(bucketName).upload(filePath, fileData, {
      contentType,
      upsert: true,
    });

    if (error) {
      console.warn(`[Supabase Storage upload warning in ${bucketName}]:`, error.message);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: urlData } = sb.storage.from(bucketName).getPublicUrl(filePath);

    return {
      success: true,
      publicUrl: urlData?.publicUrl || `${SUPABASE_URL}/storage/v1/object/public/${bucketName}/${filePath}`,
    };
  } catch (err: any) {
    console.warn('[Supabase Storage upload error]:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 16. SUPABASE STORAGE: List files stored in a Supabase bucket
 */
export async function listSupabaseStorageFiles(bucketName: string, folder = ''): Promise<any[]> {
  try {
    const sb = getSupabaseClient();
    const { data, error } = await sb.storage.from(bucketName).list(folder, {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    });

    if (error || !data) {
      return [];
    }
    return data;
  } catch {
    return [];
  }
}

/**
 * 17. SUPABASE STORAGE: Get public URL for a stored file
 */
export function getSupabaseStorageFileUrl(bucketName: string, filePath: string): string {
  const sb = getSupabaseClient();
  const { data } = sb.storage.from(bucketName).getPublicUrl(filePath);
  return data?.publicUrl || `${SUPABASE_URL}/storage/v1/object/public/${bucketName}/${filePath}`;
}
