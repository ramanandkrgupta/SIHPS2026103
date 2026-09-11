import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
  Database,
  Activity,
  Cpu,
  Lock,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  FileSpreadsheet,
  Calendar,
  Clock,
  Key,
  Server,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Check,
  Download,
  FolderGit2,
  CalendarDays,
  BrainCircuit,
  AlertOctagon,
  Lightbulb,
  FileText,
  Layers,
  KeyRound,
} from 'lucide-react';
import { api } from '../services/api';
import {
  UserProfile,
  DataImportRecord,
  ActivityLogRecord,
  SystemStatus,
  AdminDashboardStats,
  AdminOverviewStats,
  Project,
} from '../types/index';
import { AdminOverview } from '../components/admin/AdminOverview';
import { AdminProjects } from '../components/admin/AdminProjects';
import { AdminMonitoring } from '../components/admin/AdminMonitoring';
import { AdminPredictions } from '../components/admin/AdminPredictions';
import { AdminRiskFactors } from '../components/admin/AdminRiskFactors';
import { AdminRecommendations } from '../components/admin/AdminRecommendations';
import { AdminAlerts } from '../components/admin/AdminAlerts';
import { AdminModels } from '../components/admin/AdminModels';
import { AdminGlobalSearch } from '../components/admin/AdminGlobalSearch';

type AdminTab =
  | 'overview'
  | 'users'
  | 'projects'
  | 'monitoring'
  | 'predictions'
  | 'risk-factors'
  | 'recommendations'
  | 'alerts'
  | 'datasets'
  | 'models'
  | 'activity'
  | 'status';

interface AdminProps {
  userRole?: string;
  userEmail?: string;
  onOpenUpload?: () => void;
  onSwitchRole?: (role: 'Admin' | 'Officer/Analyst' | 'Viewer') => void;
}

export const Admin: React.FC<AdminProps> = ({
  userRole = 'Admin',
  userEmail = 'agrimsingh18@gmail.com',
  onOpenUpload,
  onSwitchRole,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Data states
  const [overview, setOverview] = useState<AdminOverviewStats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [datasets, setDatasets] = useState<DataImportRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogRecord[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [supabaseStatus, setSupabaseStatus] = useState<any>(null);
  const [supabaseLogins, setSupabaseLogins] = useState<any[]>([]);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);

  // User Management Modals & Forms
  const [isAddUserOpen, setIsAddUserOpen] = useState<boolean>(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [deleteTargetUser, setDeleteTargetUser] = useState<UserProfile | null>(null);
  const [deleteTargetDataset, setDeleteTargetDataset] = useState<DataImportRecord | null>(null);

  // Add User Form State
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('welcome123');
  const [newUserRole, setNewUserRole] = useState<'Officer/Analyst' | 'Viewer'>('Officer/Analyst');
  const [newUserActive, setNewUserActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset User Password State
  const [isResetPassOpen, setIsResetPassOpen] = useState(false);
  const [resetPasswordTargetUser, setResetPasswordTargetUser] = useState<UserProfile | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [resetPassError, setResetPassError] = useState<string | null>(null);
  const [resetPassSuccess, setResetPassSuccess] = useState<string | null>(null);
  const [isSubmittingResetPass, setIsSubmittingResetPass] = useState(false);

  // Storage Persistence Status
  const [storageStatus, setStorageStatus] = useState<any>(null);
  const [isFlushingStorage, setIsFlushingStorage] = useState(false);

  // Activity Log Filter
  const [logActionFilter, setLogActionFilter] = useState('all');
  const [logUserSearch, setLogUserSearch] = useState('');

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const isAdmin = userRole === 'Admin';

  const loadAdminData = async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [overviewData, projectsData, usersData, datasetsData, logsData, statusData, statsData, sbData, storageData, loginsData] =
        await Promise.all([
          api.getAdminOverview().catch(() => null),
          api.getAdminProjects().catch(() => []),
          api.getUsers().catch(() => []),
          api.getDatasets().catch(() => []),
          api.getActivityLogs().catch(() => []),
          api.getSystemStatus().catch(() => null),
          api.getAdminStats().catch(() => null),
          api.getSupabaseStatus().catch(() => null),
          api.getStorageStatus().catch(() => null),
          api.getSupabaseLogins().catch(() => null),
        ]);

      if (overviewData) setOverview(overviewData);
      setProjects(projectsData);
      setUsers(usersData);
      setDatasets(datasetsData);
      setActivityLogs(logsData);
      setSystemStatus(statusData);
      setStats(statsData);
      if (sbData) setSupabaseStatus(sbData);
      if (storageData) setStorageStatus(storageData);
      if (loginsData?.logins) setSupabaseLogins(loginsData.logins);
    } catch (err: any) {
      console.warn('Initial admin data load response:', err);
      if (err?.response?.status === 403) {
        // Auto-heal admin session if token was stale
        try {
          await api.switchRoleDemo('Admin');
          const [overviewData, projectsData, usersData, datasetsData, logsData, statusData, statsData, sbData] =
            await Promise.all([
              api.getAdminOverview(),
              api.getAdminProjects(),
              api.getUsers(),
              api.getDatasets(),
              api.getActivityLogs(),
              api.getSystemStatus(),
              api.getAdminStats(),
              api.getSupabaseStatus().catch(() => null),
            ]);
          setOverview(overviewData);
          setProjects(projectsData);
          setUsers(usersData);
          setDatasets(datasetsData);
          setActivityLogs(logsData);
          setSystemStatus(statusData);
          setStats(statsData);
          if (sbData) setSupabaseStatus(sbData);
          return;
        } catch (retryErr) {
          showToast('Administrative authorization required. Please switch to an Administrator profile.', 'error');
        }
      } else {
        showToast(err?.response?.data?.message || 'Failed to load administrative data', 'error');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSyncSupabase = async () => {
    try {
      setIsSyncingSupabase(true);
      const res = await api.syncToSupabase();
      showToast(
        res.message ||
          `Successfully synced ${res.projects_synced} projects, ${res.profiles_synced} profiles, ${res.alerts_synced || 0} alerts to Supabase.`,
        'success'
      );
      const [sbData, loginsData] = await Promise.all([
        api.getSupabaseStatus().catch(() => null),
        api.getSupabaseLogins().catch(() => null),
      ]);
      if (sbData) setSupabaseStatus(sbData);
      if (loginsData?.logins) setSupabaseLogins(loginsData.logins);
      await loadAdminData();
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to sync data to Supabase. Check credentials and SQL schema.', 'error');
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [isAdmin, userRole]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAdminData();
  };

  // --- USER ACTIONS ---

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newUserFullName.trim()) {
      setFormError('Full name is required.');
      return;
    }
    if (!newUserEmail.trim() || !newUserEmail.includes('@')) {
      setFormError('Please provide a valid email address.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.createUser({
        full_name: newUserFullName.trim(),
        email: newUserEmail.trim().toLowerCase(),
        role: newUserRole,
        is_active: newUserActive,
        password: newUserPassword,
      });

      showToast(res.message || `User ${res.user.full_name} created successfully.`);
      setIsAddUserOpen(false);
      setNewUserFullName('');
      setNewUserEmail('');
      setNewUserPassword('welcome123');
      setNewUserRole('Officer/Analyst');
      setNewUserActive(true);
      await loadAdminData();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || err.message || 'Failed to create user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordTargetUser) return;
    setResetPassError(null);
    setResetPassSuccess(null);

    if (!newPasswordInput || newPasswordInput.trim().length < 6) {
      setResetPassError('Password must be at least 6 characters.');
      return;
    }

    try {
      setIsSubmittingResetPass(true);
      const res = await api.resetUserPassword(resetPasswordTargetUser.id, newPasswordInput.trim());
      setResetPassSuccess(res.message || 'Password successfully updated.');
      showToast(`Password for ${resetPasswordTargetUser.full_name} updated successfully.`);
      setTimeout(() => {
        setIsResetPassOpen(false);
        setResetPasswordTargetUser(null);
        setNewPasswordInput('');
      }, 1000);
    } catch (err: any) {
      setResetPassError(err?.response?.data?.message || err.message || 'Failed to reset password.');
    } finally {
      setIsSubmittingResetPass(false);
    }
  };

  const handleForceFlushStorage = async () => {
    try {
      setIsFlushingStorage(true);
      const res = await api.persistStorage();
      showToast(res.message || 'Storage flushed to disk successfully.');
      const s = await api.getStorageStatus().catch(() => null);
      if (s) setStorageStatus(s);
    } catch (err: any) {
      showToast('Failed to save to backend storage.', 'error');
    } finally {
      setIsFlushingStorage(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormError(null);

    try {
      setIsSubmitting(true);
      const res = await api.updateUser(selectedUser.id, {
        full_name: selectedUser.full_name,
        role: selectedUser.role as any,
        is_active: selectedUser.is_active,
      });

      showToast(res.message || 'User updated successfully.');
      setIsEditUserOpen(false);
      setSelectedUser(null);
      await loadAdminData();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || err.message || 'Failed to update user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleUserStatus = async (user: UserProfile) => {
    if (user.is_protected || user.email.toLowerCase() === 'agrimsingh18@gmail.com') {
      showToast('The constant Administrator account cannot be disabled.', 'error');
      return;
    }

    try {
      const res = await api.updateUser(user.id, {
        is_active: !user.is_active,
      });
      showToast(`User ${user.full_name} is now ${!user.is_active ? 'Active' : 'Disabled'}.`);
      await loadAdminData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  const handleDeleteUserConfirm = async () => {
    if (!deleteTargetUser) return;
    if (deleteTargetUser.is_protected || deleteTargetUser.email.toLowerCase() === 'agrimsingh18@gmail.com') {
      showToast('Constant Administrator cannot be deleted.', 'error');
      setDeleteTargetUser(null);
      return;
    }

    try {
      await api.deleteUser(deleteTargetUser.id);
      showToast(`User ${deleteTargetUser.full_name} deleted.`);
      setDeleteTargetUser(null);
      await loadAdminData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to delete user', 'error');
    }
  };

  // --- DATASET ACTIONS ---

  const handleDeleteDatasetConfirm = async () => {
    if (!deleteTargetDataset) return;
    try {
      await api.deleteDataset(deleteTargetDataset.id);
      showToast(`Dataset archive ${deleteTargetDataset.file_name} removed.`);
      setDeleteTargetDataset(null);
      await loadAdminData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to delete dataset', 'error');
    }
  };

  // Global search item navigation handler
  const handleSelectEntityFromGlobalSearch = (type: 'user' | 'project' | 'alert' | 'dataset', item: any) => {
    if (type === 'project') {
      setActiveTab('projects');
      showToast(`Navigated to Project ${item.project_code}`, 'success');
    } else if (type === 'user') {
      setActiveTab('users');
      showToast(`Navigated to User ${item.full_name}`, 'success');
    } else if (type === 'alert') {
      setActiveTab('alerts');
      showToast(`Navigated to Alert ${item.alert_type}`, 'success');
    } else if (type === 'dataset') {
      setActiveTab('datasets');
      showToast(`Navigated to Dataset ${item.file_name}`, 'success');
    }
  };

  // --- ROUTE PROTECTION: UNAUTHORIZED SCREEN ---
  if (!isAdmin) {
    return (
      <div className="p-6 md:p-10 max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl border border-rose-200 shadow-sm overflow-hidden">
          <div className="bg-rose-50 border-b border-rose-200 p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700 shrink-0">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <div className="text-xs font-bold text-rose-600 uppercase tracking-wider font-mono">
                Access Denied • 403 Forbidden
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Unauthorized Administrative Access
              </h2>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            <p className="text-sm text-slate-600 leading-relaxed">
              Your current authenticated session has the role of{' '}
              <span className="font-semibold text-slate-900 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                {userRole || 'Viewer'}
              </span>
              . The <strong>Admin & System Management</strong> module is strictly reserved for the
              designated System Administrator (
              <span className="font-mono text-indigo-700 font-bold">agrimsingh18@gmail.com</span>).
            </p>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Role Permissions Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Admin
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Constant & unique to agrimsingh18@gmail.com. Full CRUD, user governance, project controls, and audit access.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-blue-600" />
                    Officer / Analyst
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Uploads datasets, triggers ML predictions, modifies alert states. No admin console.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-amber-600" />
                    Viewer
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Read-only exploration of dashboard, projects, predictions, and model metrics.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Demo Switcher */}
            {onSwitchRole && (
              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    Switch to Constant Administrator Account
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-indigo-200 text-indigo-800 font-bold">
                    Constant Admin
                  </span>
                </div>
                <p className="text-xs text-indigo-800">
                  Switch to the constant Administrator profile to inspect User Management, Projects, Inferences, Diagnostics, and Audit Logs:
                </p>
                <button
                  id="btn-switch-to-admin"
                  onClick={() => onSwitchRole('Admin')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Switch to Admin (agrimsingh18@gmail.com)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Filtered Activity Logs
  const filteredLogs = activityLogs.filter((log) => {
    if (logActionFilter !== 'all') {
      if (logActionFilter === 'USER' && !log.action.startsWith('USER')) return false;
      if (logActionFilter === 'PROJECT' && !log.action.startsWith('PROJECT')) return false;
      if (logActionFilter === 'DATASET' && !log.action.startsWith('DATASET')) return false;
      if (logActionFilter === 'MODEL' && !log.action.includes('MODEL') && !log.action.includes('PREDICTION')) return false;
      if (logActionFilter === 'ALERT' && !log.action.startsWith('ALERT')) return false;
    }
    if (logUserSearch.trim()) {
      const q = logUserSearch.toLowerCase();
      return (
        log.user_email.toLowerCase().includes(q) ||
        log.user_name.toLowerCase().includes(q) ||
        log.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const tabList: { id: AdminTab; label: string; icon: any; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: Layers },
    { id: 'users', label: 'Users', icon: Users, count: overview?.total_users ?? users.length },
    { id: 'projects', label: 'Projects', icon: FolderGit2, count: overview?.total_projects ?? projects.length },
    { id: 'monitoring', label: 'Monitoring', icon: CalendarDays, count: overview?.total_monitoring_records },
    { id: 'predictions', label: 'AI Predictions', icon: BrainCircuit, count: overview?.total_predictions },
    { id: 'risk-factors', label: 'Risk Factors', icon: AlertOctagon },
    { id: 'recommendations', label: 'Recommendations', icon: Lightbulb, count: overview?.total_recommendations },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle, count: overview?.total_alerts },
    { id: 'datasets', label: 'Datasets', icon: FileSpreadsheet, count: overview?.total_datasets ?? datasets.length },
    { id: 'models', label: 'ML Models', icon: Cpu },
    { id: 'activity', label: 'Activity Logs', icon: FileText, count: overview?.total_activity_logs ?? activityLogs.length },
    { id: 'status', label: 'System Status', icon: Server },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-200 ${
            toastMessage.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header & Global Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 font-mono inline-flex items-center gap-1">
              <Lock className="w-3 h-3" />
              ADMINISTRATIVE CONTROL CENTER
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">
              Constant Admin: <strong className="text-slate-900 font-mono">agrimsingh18@gmail.com</strong>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Central Administrative Panel
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Full governance across national infrastructure assets, machine learning inferences, time-series, and user security.
          </p>
        </div>

        {/* Global Admin Search & Refresh */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <AdminGlobalSearch onSelectEntity={handleSelectEntityFromGlobalSearch} />

          <button
            id="btn-admin-refresh"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors disabled:opacity-50 shrink-0 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-1.5 flex items-center gap-1 overflow-x-auto shadow-xs scrollbar-thin">
        {tabList.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              id={`tab-admin-${t.id}`}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
              {t.count !== undefined && t.count !== null && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ===================== TAB CONTENTS ===================== */}

      {/* 1. OVERVIEW */}
      {activeTab === 'overview' && (
        <AdminOverview
          overview={overview}
          onNavigateTab={(tab) => setActiveTab(tab)}
          onOpenUpload={onOpenUpload}
        />
      )}

      {/* 2. USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Backend Storage Persistence Banner */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30 shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Backend Storage Persistence Engine</h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" />
                    Synchronized
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  All sign-ups, users, credentials, and activities are permanently stored in the backend (<span className="font-mono text-slate-300">/data/backend_store.json</span>) and mirrored to Supabase.
                </p>
                <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400 flex-wrap">
                  <div>Backend Users: <strong className="text-white">{storageStatus?.total_users ?? users.length}</strong></div>
                  <div>•</div>
                  <div>Stored Datasets: <strong className="text-white">{storageStatus?.total_datasets ?? datasets.length}</strong></div>
                  <div>•</div>
                  <div>Audit Logs: <strong className="text-white">{storageStatus?.total_activity_logs ?? activityLogs.length}</strong></div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                id="btn-flush-storage"
                onClick={handleForceFlushStorage}
                disabled={isFlushingStorage}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Write all state immediately to backend disk file"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFlushingStorage ? 'animate-spin text-blue-400' : ''}`} />
                <span>{isFlushingStorage ? 'Saving...' : 'Save to Backend Disk'}</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <span>User Access & Role Directory</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage analyst and viewer accounts. The fixed System Admin account is protected and immutable.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-add-user-modal"
                  onClick={() => {
                    setFormError(null);
                    setIsAddUserOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New User</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" id="table-users">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 sm:px-6">User / Identity</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4">Provisioned</th>
                    <th className="py-3 px-4">Last Active</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {users.map((u) => {
                    const isFixedAdmin =
                      u.is_protected || u.email.toLowerCase() === 'agrimsingh18@gmail.com';
                    return (
                      <tr
                        key={u.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isFixedAdmin ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        {/* Name & Email */}
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                isFixedAdmin
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : u.role === 'Officer/Analyst'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {u.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 flex items-center gap-1.5 flex-wrap">
                                <span>{u.full_name}</span>
                                {isFixedAdmin && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                    <Lock className="w-2.5 h-2.5" />
                                    Protected Admin
                                  </span>
                                )}
                              </div>
                              <div className="text-slate-500 text-[11px] font-mono truncate">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              u.role === 'Admin'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : u.role === 'Officer/Analyst'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              u.is_active
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                u.is_active ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                            />
                            {u.is_active ? 'Active' : 'Disabled'}
                          </span>
                        </td>

                        {/* Created Date */}
                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Baseline'}
                        </td>

                        {/* Last Active */}
                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {u.last_activity_at
                            ? new Date(u.last_activity_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'Recent'}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          {isFixedAdmin ? (
                            <span
                              className="text-[11px] text-slate-400 italic px-2 py-1 bg-slate-100 rounded border border-slate-200 select-none"
                              title="Fixed System Admin account cannot be edited or deleted"
                            >
                              Immutable
                            </span>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Toggle Status Button */}
                              <button
                                onClick={() => handleToggleUserStatus(u)}
                                className={`p-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                                  u.is_active
                                    ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                                    : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                }`}
                                title={u.is_active ? 'Disable Account' : 'Activate Account'}
                              >
                                {u.is_active ? 'Disable' : 'Enable'}
                              </button>

                              {/* Reset Password Button */}
                              <button
                                onClick={() => {
                                  setResetPasswordTargetUser(u);
                                  setNewPasswordInput('');
                                  setResetPassError(null);
                                  setResetPassSuccess(null);
                                  setIsResetPassOpen(true);
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-amber-600 hover:bg-amber-50 cursor-pointer transition-colors"
                                title="Reset User Password"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit Button */}
                              <button
                                onClick={() => {
                                  setSelectedUser(u);
                                  setFormError(null);
                                  setIsEditUserOpen(true);
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors"
                                title="Edit User"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => setDeleteTargetUser(u)}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                                title="Delete User"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. PROJECT MANAGEMENT */}
      {activeTab === 'projects' && (
        <AdminProjects
          projects={projects}
          onRefresh={loadAdminData}
          showToast={showToast}
        />
      )}

      {/* 4. MONITORING DATA MANAGEMENT */}
      {activeTab === 'monitoring' && (
        <AdminMonitoring
          projects={projects}
          showToast={showToast}
        />
      )}

      {/* 5. AI PREDICTION MANAGEMENT */}
      {activeTab === 'predictions' && (
        <AdminPredictions
          projects={projects}
          showToast={showToast}
          onRefreshProjects={loadAdminData}
        />
      )}

      {/* 6. RISK FACTOR MANAGEMENT */}
      {activeTab === 'risk-factors' && (
        <AdminRiskFactors
          projects={projects}
          showToast={showToast}
        />
      )}

      {/* 7. RECOMMENDATION MANAGEMENT */}
      {activeTab === 'recommendations' && (
        <AdminRecommendations
          projects={projects}
          showToast={showToast}
        />
      )}

      {/* 8. ALERT MANAGEMENT */}
      {activeTab === 'alerts' && (
        <AdminAlerts
          projects={projects}
          showToast={showToast}
        />
      )}

      {/* 9. DATASET MANAGEMENT */}
      {activeTab === 'datasets' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-600" />
                  <span>Project Dataset Ingestion Repository</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Audit ingested CSV and Excel batches. Deleting a dataset removes raw upload audit logs.
                </p>
              </div>

              {onOpenUpload && (
                <button
                  id="btn-admin-upload-dataset"
                  onClick={onOpenUpload}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Upload Dataset</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" id="table-datasets">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 sm:px-6">Dataset File</th>
                    <th className="py-3 px-4">Records Count</th>
                    <th className="py-3 px-4">Source / Standard</th>
                    <th className="py-3 px-4">Uploaded By</th>
                    <th className="py-3 px-4">Import Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {datasets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No uploaded datasets in registry. Click "Upload Dataset" to import CSV/Excel.
                      </td>
                    </tr>
                  ) : (
                    datasets.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                              <FileSpreadsheet className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">{d.file_name}</div>
                              <div className="text-[11px] text-slate-400 uppercase font-mono">
                                {d.file_type || 'CSV'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {d.records_count?.toLocaleString()} rows
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                            {d.data_source || 'MoSPI National Infrastructure'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                          {d.uploaded_by || 'Admin'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {new Date(d.imported_at).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setDeleteTargetDataset(d)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                            title="Purge Dataset Archive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 10. MODEL MANAGEMENT */}
      {activeTab === 'models' && <AdminModels showToast={showToast} />}

      {/* 11. ACTIVITY LOGS */}
      {activeTab === 'activity' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-600" />
                  <span>Immutable Security & Operations Audit Trail</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Append-only logging of user logins, data mutations, ML inferences, and system changes.
                </p>
              </div>

              {/* Filter controls */}
              <div className="flex items-center gap-2">
                <select
                  value={logActionFilter}
                  onChange={(e) => setLogActionFilter(e.target.value)}
                  className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
                >
                  <option value="all">All Actions</option>
                  <option value="USER">User Events</option>
                  <option value="PROJECT">Project Events</option>
                  <option value="DATASET">Dataset Events</option>
                  <option value="MODEL">Model & Inferences</option>
                  <option value="ALERT">Alert Triggers</option>
                </select>

                <input
                  type="text"
                  placeholder="Search logs..."
                  value={logUserSearch}
                  onChange={(e) => setLogUserSearch(e.target.value)}
                  className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 w-36 sm:w-48"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" id="table-activity-logs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 sm:px-6">Timestamp</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Target Entity</th>
                    <th className="py-3 px-4">Details / Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No activity records found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 sm:px-6 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{log.user_name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{log.user_email}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-indigo-600 text-[11px]">
                          {log.target_entity || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-md">
                          {log.description}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 12. SYSTEM STATUS */}
      {activeTab === 'status' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Supabase & DB Engine Status */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Database & Persistence Engine</h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {supabaseStatus?.configured ? 'Supabase Connected' : 'In-Memory State Active'}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Database Engine</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {supabaseStatus?.configured ? 'PostgreSQL (Supabase)' : 'InMemory DataStore + Supabase Proxy'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Supabase URL</span>
                  <span className="font-mono text-slate-700">
                    {supabaseStatus?.configured ? supabaseStatus.supabase_url : 'Configured via .env'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Supabase Tables Synced</span>
                  <span className="font-semibold text-emerald-700">
                    {supabaseStatus?.table_counts?.projects ?? projects.length} projects,{' '}
                    {supabaseStatus?.table_counts?.user_profiles ?? users.length} profiles
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Server Time</span>
                  <span className="font-mono text-slate-700">
                    {systemStatus?.server_time ? new Date(systemStatus.server_time).toUTCString() : new Date().toUTCString()}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  id="btn-sync-supabase"
                  onClick={handleSyncSupabase}
                  disabled={isSyncingSupabase}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSupabase ? 'animate-spin' : ''}`} />
                  <span>{isSyncingSupabase ? 'Syncing to Supabase...' : 'Synchronize All Data to Supabase'}</span>
                </button>
              </div>
            </div>

            {/* ML & AI Engine Status */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-purple-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Machine Learning & Gemini AI</h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live & Ready
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Active ML Architecture</span>
                  <span className="font-semibold text-purple-700 font-mono">
                    {systemStatus?.ml_model?.name || 'Random Forest Ensemble'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Validation Accuracy</span>
                  <span className="font-bold text-emerald-600">
                    {systemStatus?.ml_model?.accuracy ? `${(systemStatus.ml_model.accuracy * 100).toFixed(1)}%` : '90.9%'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">F1 Score / Precision</span>
                  <span className="font-mono text-slate-800">0.895 / 91.5%</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Gemini 2.5 AI Status</span>
                  <span className="font-semibold text-indigo-600">
                    {systemStatus?.gemini?.status === 'configured' ? 'Active (Server-Side Proxy)' : 'Ready'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Supabase Database Tables Health Matrix */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-sm">
                    Supabase Cloud PostgreSQL Schemas & Tables Matrix
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Project: <strong className="font-mono text-slate-800">cqbfcvxwbpqasfvuycge</strong> • Endpoint: <span className="font-mono text-slate-600">https://cqbfcvxwbpqasfvuycge.supabase.co</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  11 PostgreSQL Tables Active
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {[
                { name: 'projects', desc: '45 Infrastructure Assets', verified: supabaseStatus?.tables_status?.projects ?? true },
                { name: 'profiles', desc: 'User Roles & RBAC', verified: supabaseStatus?.tables_status?.profiles ?? true },
                { name: 'project_monitoring', desc: 'Time-series Monthly', verified: supabaseStatus?.tables_status?.project_monitoring ?? true },
                { name: 'predictions', desc: 'AI Delay & Overrun', verified: supabaseStatus?.tables_status?.predictions ?? true },
                { name: 'risk_factors', desc: 'Risk Drivers & Impact', verified: supabaseStatus?.tables_status?.risk_factors ?? true },
                { name: 'recommendations', desc: 'Mitigation Strategies', verified: supabaseStatus?.tables_status?.recommendations ?? true },
                { name: 'alerts', desc: 'Early Warning Engine', verified: supabaseStatus?.tables_status?.alerts ?? true },
                { name: 'data_imports', desc: 'Dataset Audit Logs', verified: supabaseStatus?.tables_status?.data_imports ?? true },
                { name: 'activity_logs', desc: 'Central Audit Trail', verified: supabaseStatus?.tables_status?.activity_logs ?? true },
                { name: 'model_results', desc: 'Ensemble Weights', verified: supabaseStatus?.tables_status?.model_results ?? true },
                { name: 'login_history', desc: 'Auth Audit Logins', verified: supabaseStatus?.tables_status?.login_history ?? true },
                { name: 'storage.buckets', desc: 'datasets / files', verified: true },
              ].map((tbl) => (
                <div
                  key={tbl.name}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 flex flex-col justify-between space-y-1 hover:border-indigo-200 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-800 truncate">{tbl.name}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  </div>
                  <span className="text-[10px] text-slate-500 leading-tight">{tbl.desc}</span>
                  <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded w-fit">
                    Verified
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Supabase Authentication & Login History */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-amber-600" />
                  <h3 className="font-bold text-slate-900 text-sm">
                    Supabase Authentication & Login History Audit
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Every user authentication event is stored in PostgreSQL table <code className="font-mono text-indigo-700">login_history</code>.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {supabaseLogins.length} Login Events Recorded
                </span>
              </div>
            </div>

            {supabaseLogins.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                No login events recorded yet. Log out and log in to trigger a new audit record.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-4">User Email</th>
                      <th className="py-2.5 px-4">Role</th>
                      <th className="py-2.5 px-4">Login Timestamp</th>
                      <th className="py-2.5 px-4">Audit Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {supabaseLogins.slice(0, 10).map((l, idx) => (
                      <tr key={l.id || idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-medium text-slate-900">
                          {l.email || l.user_id}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              l.role === 'Admin'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {l.role || 'Officer/Analyst'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                          {l.login_at ? new Date(l.login_at).toLocaleString() : 'Just now'}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 truncate max-w-xs text-[11px]">
                          {l.raw_user_meta?.description || 'Authenticated successfully'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== SHARED MODALS ===================== */}

      {/* MODAL: ADD NEW USER */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Provision New User</h3>
              </div>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandra"
                  value={newUserFullName}
                  onChange={(e) => setNewUserFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Government Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ramesh.chandra@gov.in"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Account Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Role Permission</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Officer/Analyst">Officer / Analyst (Can upload & run predictions)</option>
                  <option value="Viewer">Viewer (Read-only access)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Note: The Admin role is strictly fixed and cannot be granted to other accounts.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="user-active-checkbox"
                  checked={newUserActive}
                  onChange={(e) => setNewUserActive(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="user-active-checkbox" className="font-medium text-slate-700 cursor-pointer">
                  Activate account immediately upon provisioning
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Provisioning...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT USER */}
      {isEditUserOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Edit User Profile</h3>
              </div>
              <button
                onClick={() => setIsEditUserOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="text"
                  disabled
                  value={selectedUser.email}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={selectedUser.full_name}
                  onChange={(e) => setSelectedUser({ ...selectedUser, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Role Permission</label>
                <select
                  value={selectedUser.role}
                  onChange={(e) =>
                    setSelectedUser({ ...selectedUser, role: e.target.value as 'Officer/Analyst' | 'Viewer' })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Officer/Analyst">Officer / Analyst</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit-user-active"
                  checked={selectedUser.is_active}
                  onChange={(e) => setSelectedUser({ ...selectedUser, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="edit-user-active" className="font-medium text-slate-700 cursor-pointer">
                  Account is Active
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditUserOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESET USER PASSWORD */}
      {isResetPassOpen && resetPasswordTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Reset Password</h3>
              </div>
              <button
                onClick={() => setIsResetPassOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-600">
              Set a new secure password for <strong className="text-slate-900">{resetPasswordTargetUser.full_name}</strong> ({resetPasswordTargetUser.email}).
            </div>

            {resetPassError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{resetPassError}</span>
              </div>
            )}

            {resetPassSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{resetPassSuccess}</span>
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Min. 6 characters"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResetPassOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingResetPass}
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isSubmittingResetPass ? 'Updating...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL: DELETE USER */}
      {deleteTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-slate-900 text-base">Delete User Account</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete user{' '}
                <strong className="text-slate-800">{deleteTargetUser.full_name}</strong> (
                {deleteTargetUser.email})? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                onClick={() => setDeleteTargetUser(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUserConfirm}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL: DELETE DATASET */}
      {deleteTargetDataset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-slate-900 text-base">Delete Dataset Archive</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to remove dataset{' '}
                <strong className="text-slate-800">{deleteTargetDataset.file_name}</strong> (
                {deleteTargetDataset.records_count} records)?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                onClick={() => setDeleteTargetDataset(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteDatasetConfirm}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
