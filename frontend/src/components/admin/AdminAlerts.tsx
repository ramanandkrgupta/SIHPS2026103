import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { Alert, Project } from '../../types/index';
import { api } from '../../services/api';

interface AdminAlertsProps {
  projects: Project[];
  showToast: (text: string, type?: 'success' | 'error') => void;
}

export const AdminAlerts: React.FC<AdminAlertsProps> = ({
  projects,
  showToast,
}) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Alert | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formProjectId, setFormProjectId] = useState(projects[0]?.id || '');
  const [formType, setFormType] = useState('Critical Delay Imminent');
  const [formSeverity, setFormSeverity] = useState<'Critical' | 'Warning' | 'Watch'>('Critical');
  const [formStatus, setFormStatus] = useState<'New' | 'Reviewed' | 'Resolved'>('New');
  const [formMessage, setFormMessage] = useState('');
  const [formAction, setFormAction] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminAlerts();
      setAlerts(data);
    } catch (err: any) {
      showToast('Failed to load administrative alerts.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const openAddModal = () => {
    setFormProjectId(projects[0]?.id || '');
    setFormType('Milestone Delay Warning');
    setFormSeverity('Critical');
    setFormStatus('New');
    setFormMessage('');
    setFormAction('Convene urgent joint coordination review with executing agency.');
    setFormError(null);
    setIsAddOpen(true);
  };

  const openEditModal = (a: Alert) => {
    setEditingAlert(a);
    setFormProjectId(a.project_id);
    setFormType(a.alert_type);
    setFormSeverity(a.severity);
    setFormStatus(a.status);
    setFormMessage(a.message);
    setFormAction(a.suggested_action);
    setFormError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formMessage.trim()) {
      setFormError('Alert message is mandatory.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingAlert) {
        await api.adminUpdateAlert(editingAlert.id, {
          alert_type: formType,
          severity: formSeverity,
          status: formStatus,
          message: formMessage.trim(),
          suggested_action: formAction.trim(),
        });
        showToast('Early warning alert updated successfully.');
        setEditingAlert(null);
      } else {
        await api.adminCreateAlert({
          project_id: formProjectId,
          alert_type: formType,
          severity: formSeverity,
          status: formStatus,
          message: formMessage.trim(),
          suggested_action: formAction.trim(),
        });
        showToast('Early warning alert dispatched to executive dashboard.');
        setIsAddOpen(false);
      }
      await loadAlerts();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to save alert.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickStatusChange = async (alertId: string, newStatus: 'New' | 'Reviewed' | 'Resolved') => {
    try {
      await api.adminUpdateAlert(alertId, { status: newStatus });
      showToast(`Alert status updated to ${newStatus}.`);
      await loadAlerts();
    } catch (err: any) {
      showToast('Failed to update status.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsSubmitting(true);
      await api.adminDeleteAlert(deleteTarget.id);
      showToast('Alert deleted from registry.');
      setDeleteTarget(null);
      await loadAlerts();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to delete alert.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    const matchesQuery =
      !searchQuery ||
      a.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.project_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.alert_type.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity = severityFilter === 'all' || a.severity.toLowerCase() === severityFilter.toLowerCase();
    const matchesStatus = statusFilter === 'all' || a.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesQuery && matchesSeverity && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-indigo-600" />
            <span>Early Warning Alert System Management</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Administer threshold alert dispatches, triage unresolved escalation triggers, and configure warning severities.
          </p>
        </div>
        <button
          id="btn-admin-create-alert"
          onClick={openAddModal}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Alert</span>
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search alerts, project names, messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Severities</option>
          <option value="Critical">Critical</option>
          <option value="Warning">Warning</option>
          <option value="Watch">Watch</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Statuses</option>
          <option value="New">New</option>
          <option value="Reviewed">Reviewed</option>
          <option value="Resolved">Resolved</option>
        </select>

        <div className="text-xs text-slate-500 ml-auto font-medium">
          {filteredAlerts.length} of {alerts.length} alerts
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Severity / Type</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Alert Message</th>
                <th className="px-4 py-3">Suggested Remedial Action</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Loading early warning alerts...
                  </td>
                </tr>
              ) : filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No early warning alerts matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((a) => {
                  const severityBadge =
                    a.severity === 'Critical'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : a.severity === 'Warning'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200';

                  return (
                    <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${severityBadge}`}>
                          {a.severity}
                        </span>
                        <div className="text-[11px] font-medium text-slate-600 mt-1">{a.alert_type}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{a.project_name}</div>
                        <div className="text-[11px] font-mono text-indigo-600">{a.project_code}</div>
                      </td>
                      <td className="px-4 py-3 max-w-sm">
                        <div className="text-slate-800 line-clamp-2">{a.message}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">{a.date}</div>
                      </td>
                      <td className="px-4 py-3 max-w-xs text-slate-600">
                        {a.suggested_action || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={a.status}
                          onChange={(e) => handleQuickStatusChange(a.id, e.target.value as any)}
                          className={`text-[11px] font-semibold rounded-lg px-2 py-1 border ${
                            a.status === 'Resolved'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : a.status === 'Reviewed'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          <option value="New">New</option>
                          <option value="Reviewed">Reviewed</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            id={`btn-edit-alert-${a.id}`}
                            onClick={() => openEditModal(a)}
                            title="Edit Alert"
                            className="p-1.5 rounded hover:bg-indigo-50 text-indigo-600 hover:text-indigo-800"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`btn-delete-alert-${a.id}`}
                            onClick={() => setDeleteTarget(a)}
                            title="Delete Alert"
                            className="p-1.5 rounded hover:bg-rose-50 text-rose-600 hover:text-rose-800"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {(isAddOpen || editingAlert) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-indigo-600" />
                <span>{editingAlert ? 'Edit Alert Parameters' : 'Create Early Warning Alert'}</span>
              </h3>
              <button
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingAlert(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {!editingAlert && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Project *</label>
                  <select
                    value={formProjectId}
                    onChange={(e) => setFormProjectId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.project_code} - {p.project_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Alert Classification</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  >
                    <option value="Critical Delay Imminent">Critical Delay Imminent</option>
                    <option value="Cost Overrun Breach">Cost Overrun Breach</option>
                    <option value="Physical Milestone Lag">Physical Milestone Lag</option>
                    <option value="Expenditure Outlay Spike">Expenditure Outlay Spike</option>
                    <option value="Contractor Non-Performance">Contractor Non-Performance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Severity Level</label>
                  <select
                    value={formSeverity}
                    onChange={(e) => setFormSeverity(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  >
                    <option value="Critical">Critical</option>
                    <option value="Warning">Warning</option>
                    <option value="Watch">Watch</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alert Message *</label>
                <textarea
                  rows={2}
                  required
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value)}
                  placeholder="e.g. Schedule deviation exceeds 90 days on viaduct foundation work."
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Suggested Remedial Action</label>
                <input
                  type="text"
                  value={formAction}
                  onChange={(e) => setFormAction(e.target.value)}
                  placeholder="e.g. Deploy supplementary mobilization advance and add work shift"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alert Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                >
                  <option value="New">New</option>
                  <option value="Reviewed">Reviewed</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    setEditingAlert(null);
                  }}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-alert"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingAlert ? 'Save Changes' : 'Dispatch Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-100 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Delete Early Warning Alert?</h4>
                <p className="text-xs text-slate-500">This alert will be permanently removed from all alert channels.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete-alert"
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg"
              >
                Delete Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
