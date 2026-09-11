import React, { useState, useEffect } from 'react';
import {
  Lightbulb,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  UserCheck,
  Zap,
} from 'lucide-react';
import { RecommendationRecord, Project } from '../../types/index';
import { api } from '../../services/api';

interface AdminRecommendationsProps {
  projects: Project[];
  showToast: (text: string, type?: 'success' | 'error') => void;
}

export const AdminRecommendations: React.FC<AdminRecommendationsProps> = ({
  projects,
  showToast,
}) => {
  const [recommendations, setRecommendations] = useState<RecommendationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingRec, setEditingRec] = useState<RecommendationRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecommendationRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formProjectId, setFormProjectId] = useState(projects[0]?.id || '');
  const [formProblem, setFormProblem] = useState('');
  const [formAction, setFormAction] = useState('');
  const [formTargetOfficer, setFormTargetOfficer] = useState('');
  const [formExpectedImpact, setFormExpectedImpact] = useState('');
  const [formPriority, setFormPriority] = useState<'High' | 'Medium' | 'Low'>('High');
  const [formError, setFormError] = useState<string | null>(null);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminRecommendations(selectedProjectId === 'all' ? undefined : selectedProjectId);
      setRecommendations(data);
    } catch (err: any) {
      showToast('Failed to load recommendations.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, [selectedProjectId]);

  const openAddModal = () => {
    setFormProjectId(projects[0]?.id || '');
    setFormProblem('');
    setFormAction('');
    setFormTargetOfficer('Principal Secretary, Infrastructure Department');
    setFormExpectedImpact('Reduce project delay timeline by 45-60 days');
    setFormPriority('High');
    setFormError(null);
    setIsAddOpen(true);
  };

  const openEditModal = (rec: RecommendationRecord) => {
    setEditingRec(rec);
    setFormProjectId(rec.project_id);
    setFormProblem(rec.problem);
    setFormAction(rec.recommended_action);
    setFormTargetOfficer(rec.target_officer || '');
    setFormExpectedImpact(rec.expected_impact || '');
    setFormPriority(rec.priority || 'High');
    setFormError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formProblem.trim() || !formAction.trim()) {
      setFormError('Problem diagnosis and Recommended Action are mandatory.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingRec) {
        await api.adminUpdateRecommendation(editingRec.id, {
          problem: formProblem.trim(),
          recommended_action: formAction.trim(),
          target_officer: formTargetOfficer.trim(),
          expected_impact: formExpectedImpact.trim(),
          priority: formPriority,
        });
        showToast('Prescriptive intervention updated successfully.');
        setEditingRec(null);
      } else {
        await api.adminCreateRecommendation({
          project_id: formProjectId,
          problem: formProblem.trim(),
          recommended_action: formAction.trim(),
          target_officer: formTargetOfficer.trim(),
          expected_impact: formExpectedImpact.trim(),
          priority: formPriority,
        });
        showToast('New remedial recommendation registered.');
        setIsAddOpen(false);
      }
      await loadRecommendations();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to save recommendation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsSubmitting(true);
      await api.adminDeleteRecommendation(deleteTarget.id);
      showToast('Recommendation deleted.');
      setDeleteTarget(null);
      await loadRecommendations();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to delete recommendation.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRecs = recommendations.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.problem.toLowerCase().includes(q) ||
      r.recommended_action.toLowerCase().includes(q) ||
      (r.project_name && r.project_name.toLowerCase().includes(q)) ||
      (r.target_officer && r.target_officer.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-indigo-600" />
            <span>Prescriptive Remedial Recommendations Management</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit, edit, and disburse actionable AI-engineered remedial guidance mapped to specific officers and bottlenecks.
          </p>
        </div>
        <button
          id="btn-admin-add-recommendation"
          onClick={openAddModal}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Recommendation</span>
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search problems, actions, target officers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-xs"
        >
          <option value="all">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.project_code} - {p.project_name.slice(0, 30)}...
            </option>
          ))}
        </select>

        <div className="text-xs text-slate-500 ml-auto font-medium">
          {filteredRecs.length} recommendations in registry
        </div>
      </div>

      {/* Recommendations Cards List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
            Loading recommendations...
          </div>
        ) : filteredRecs.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
            No recommendations found for this project selection.
          </div>
        ) : (
          filteredRecs.map((rec) => {
            const priorityBadge =
              rec.priority === 'High'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : rec.priority === 'Medium'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-blue-50 text-blue-700 border-blue-200';

            return (
              <div
                key={rec.id}
                className="bg-white p-5 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${priorityBadge}`}>
                      {rec.priority || 'High'} Priority
                    </span>
                    <span className="text-xs font-mono font-semibold text-indigo-600">
                      {rec.project_code}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs font-medium text-slate-700">{rec.project_name}</span>
                  </div>

                  <div className="text-xs font-bold text-slate-900 mt-1">
                    Obstacle: <span className="font-normal text-slate-700">{rec.problem}</span>
                  </div>

                  <div className="text-xs text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-100 mt-1">
                    <span className="font-semibold text-indigo-900">Remedial Action: </span>
                    {rec.recommended_action}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                    {rec.target_officer && (
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-slate-400" />
                        Target: <strong className="text-slate-700">{rec.target_officer}</strong>
                      </span>
                    )}
                    {rec.expected_impact && (
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-500" />
                        Impact: <strong className="text-slate-700">{rec.expected_impact}</strong>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <button
                    id={`btn-edit-rec-${rec.id}`}
                    onClick={() => openEditModal(rec)}
                    title="Edit Recommendation"
                    className="p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    id={`btn-delete-rec-${rec.id}`}
                    onClick={() => setDeleteTarget(rec)}
                    title="Delete Recommendation"
                    className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Modal */}
      {(isAddOpen || editingRec) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-indigo-600" />
                <span>{editingRec ? 'Edit Remedial Recommendation' : 'Create Remedial Recommendation'}</span>
              </h3>
              <button
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingRec(null);
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

              {!editingRec && (
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Problem / Root-Cause Diagnosis *</label>
                <input
                  type="text"
                  required
                  value={formProblem}
                  onChange={(e) => setFormProblem(e.target.value)}
                  placeholder="e.g. Critical 45-day lag in Package 4 signaling installation"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Recommended Remedial Action *</label>
                <textarea
                  rows={3}
                  required
                  value={formAction}
                  onChange={(e) => setFormAction(e.target.value)}
                  placeholder="Detail step-by-step administrative directives, additional work fronts, or contractor notices..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Executive / Officer</label>
                  <input
                    type="text"
                    value={formTargetOfficer}
                    onChange={(e) => setFormTargetOfficer(e.target.value)}
                    placeholder="e.g. Chief Project Manager (CPM)"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Projected Quantitative Impact</label>
                <input
                  type="text"
                  value={formExpectedImpact}
                  onChange={(e) => setFormExpectedImpact(e.target.value)}
                  placeholder="e.g. Compress critical path schedule by 30 days"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    setEditingRec(null);
                  }}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-recommendation"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingRec ? 'Save Changes' : 'Publish Recommendation'}
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
                <h4 className="font-bold text-slate-900 text-sm">Delete Recommendation?</h4>
                <p className="text-xs text-slate-500">This remedial recommendation will be permanently withdrawn.</p>
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
                id="btn-confirm-delete-rec"
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
