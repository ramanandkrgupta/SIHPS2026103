import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  TrendingDown,
  Tag,
} from 'lucide-react';
import { RiskFactorRecord, Project } from '../../types/index';
import { api } from '../../services/api';

interface AdminRiskFactorsProps {
  projects: Project[];
  showToast: (text: string, type?: 'success' | 'error') => void;
}

export const AdminRiskFactors: React.FC<AdminRiskFactorsProps> = ({
  projects,
  showToast,
}) => {
  const [factors, setFactors] = useState<RiskFactorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingFactor, setEditingFactor] = useState<RiskFactorRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RiskFactorRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formProjectId, setFormProjectId] = useState(projects[0]?.id || '');
  const [formFactor, setFormFactor] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formImpact, setFormImpact] = useState<number>(50);
  const [formCategory, setFormCategory] = useState('Land Acquisition');
  const [formError, setFormError] = useState<string | null>(null);

  const loadFactors = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminRiskFactors(selectedProjectId === 'all' ? undefined : selectedProjectId);
      setFactors(data);
    } catch (err: any) {
      showToast('Failed to load risk factors.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFactors();
  }, [selectedProjectId]);

  const openAddModal = () => {
    setFormProjectId(projects[0]?.id || '');
    setFormFactor('');
    setFormDesc('');
    setFormImpact(60);
    setFormCategory('Land Acquisition');
    setFormError(null);
    setIsAddOpen(true);
  };

  const openEditModal = (rf: RiskFactorRecord) => {
    setEditingFactor(rf);
    setFormProjectId(rf.project_id);
    setFormFactor(rf.factor);
    setFormDesc(rf.description || '');
    setFormImpact(rf.impact);
    setFormCategory(rf.category || 'Statutory Clearance');
    setFormError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formFactor.trim()) {
      setFormError('Risk factor title is mandatory.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingFactor) {
        await api.adminUpdateRiskFactor(editingFactor.id, {
          factor: formFactor.trim(),
          description: formDesc.trim(),
          impact: Number(formImpact),
          category: formCategory,
        });
        showToast('Risk factor calibrated successfully.');
        setEditingFactor(null);
      } else {
        await api.adminCreateRiskFactor({
          project_id: formProjectId,
          factor: formFactor.trim(),
          description: formDesc.trim(),
          impact: Number(formImpact),
          category: formCategory,
        });
        showToast('New risk factor added to project taxonomy.');
        setIsAddOpen(false);
      }
      await loadFactors();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to save risk factor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsSubmitting(true);
      await api.adminDeleteRiskFactor(deleteTarget.id);
      showToast('Risk factor removed.');
      setDeleteTarget(null);
      await loadFactors();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to delete risk factor.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredFactors = factors.filter((f) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      f.factor.toLowerCase().includes(q) ||
      (f.project_name && f.project_name.toLowerCase().includes(q)) ||
      (f.description && f.description.toLowerCase().includes(q)) ||
      (f.category && f.category.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-indigo-600" />
            <span>Root-Cause Risk Factor Calibration</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit, weigh, and curate empirical obstacles driving delay and cost inflation across projects.
          </p>
        </div>
        <button
          id="btn-admin-add-risk-factor"
          onClick={openAddModal}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Risk Factor</span>
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search risk factors, categories, projects..."
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
          {filteredFactors.length} risk factors tracked
        </div>
      </div>

      {/* Risk Factors Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Risk Factor</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Assessed Impact</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Loading risk factors...
                  </td>
                </tr>
              ) : filteredFactors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No risk factors found matching current selection.
                  </td>
                </tr>
              ) : (
                filteredFactors.map((rf) => (
                  <tr key={rf.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{rf.project_name}</div>
                      <div className="text-[11px] font-mono text-indigo-600">{rf.project_code}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {rf.factor}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                        {rf.category || 'Operational'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full ${
                              rf.impact >= 70
                                ? 'bg-rose-600'
                                : rf.impact >= 40
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, rf.impact)}%` }}
                          />
                        </div>
                        <span className="font-bold">{rf.impact}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                      {rf.description || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          id={`btn-edit-risk-${rf.id}`}
                          onClick={() => openEditModal(rf)}
                          title="Edit Risk Factor"
                          className="p-1.5 rounded hover:bg-indigo-50 text-indigo-600 hover:text-indigo-800"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`btn-delete-risk-${rf.id}`}
                          onClick={() => setDeleteTarget(rf)}
                          title="Delete Risk Factor"
                          className="p-1.5 rounded hover:bg-rose-50 text-rose-600 hover:text-rose-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {(isAddOpen || editingFactor) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-indigo-600" />
                <span>{editingFactor ? 'Edit Risk Factor' : 'Add Project Risk Factor'}</span>
              </h3>
              <button
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingFactor(null);
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

              {!editingFactor && (
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Risk Factor Title *</label>
                <input
                  type="text"
                  required
                  value={formFactor}
                  onChange={(e) => setFormFactor(e.target.value)}
                  placeholder="e.g. Forest Clearance Delayed in Western Ghats Section"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  >
                    <option value="Land Acquisition">Land Acquisition</option>
                    <option value="Statutory Clearance">Statutory Clearance</option>
                    <option value="Contractor Dispute">Contractor Dispute</option>
                    <option value="Geotechnical Impediment">Geotechnical Impediment</option>
                    <option value="Funding Constraints">Funding Constraints</option>
                    <option value="Right of Way (RoW)">Right of Way (RoW)</option>
                    <option value="Utility Shifting">Utility Shifting</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assessed Impact ({formImpact}%)
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={formImpact}
                    onChange={(e) => setFormImpact(Number(e.target.value))}
                    className="w-full mt-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Explanation</label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Describe root cause, impacted chainage/milestone, and status..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    setEditingFactor(null);
                  }}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-risk-factor"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingFactor ? 'Save Changes' : 'Save Risk Factor'}
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
                <h4 className="font-bold text-slate-900 text-sm">Delete Risk Factor?</h4>
                <p className="text-xs text-slate-500">This risk parameter will be deleted from the project's risk profile.</p>
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
                id="btn-confirm-delete-risk"
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg"
              >
                Delete Factor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
