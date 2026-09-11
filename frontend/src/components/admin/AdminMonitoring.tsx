import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { MonthlyMonitoringRecord, Project } from '../../types/index';
import { api } from '../../services/api';

interface AdminMonitoringProps {
  projects: Project[];
  showToast: (text: string, type?: 'success' | 'error') => void;
}

export const AdminMonitoring: React.FC<AdminMonitoringProps> = ({
  projects,
  showToast,
}) => {
  const [records, setRecords] = useState<(MonthlyMonitoringRecord & { project_name?: string; project_code?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<(MonthlyMonitoringRecord & { project_name?: string }) | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MonthlyMonitoringRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form
  const [formProjectId, setFormProjectId] = useState(projects[0]?.id || '');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formPhysProgress, setFormPhysProgress] = useState<number | ''>('');
  const [formExpenditure, setFormExpenditure] = useState<number | ''>('');
  const [formRevCost, setFormRevCost] = useState<number | ''>('');
  const [formNote, setFormNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminMonitoring(selectedProjectId === 'all' ? undefined : selectedProjectId);
      setRecords(data);
    } catch (err: any) {
      showToast('Failed to load monitoring records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [selectedProjectId]);

  const openAddModal = () => {
    const defaultProj = projects[0];
    setFormProjectId(defaultProj?.id || '');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormPhysProgress(defaultProj?.physical_progress || 50);
    setFormExpenditure(defaultProj?.expenditure || 100);
    setFormRevCost(defaultProj?.revised_cost || defaultProj?.original_cost || 500);
    setFormNote('Monthly progress audit checkpoint');
    setFormError(null);
    setIsAddOpen(true);
  };

  const openEditModal = (rec: MonthlyMonitoringRecord & { project_name?: string }) => {
    setEditingRecord(rec);
    setFormProjectId(rec.project_id);
    setFormDate(rec.date);
    setFormPhysProgress(rec.physical_progress);
    setFormExpenditure(rec.expenditure);
    setFormRevCost(rec.revised_cost);
    setFormNote(rec.key_milestone_note || '');
    setFormError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (formPhysProgress === '' || isNaN(Number(formPhysProgress))) {
      setFormError('Physical progress percentage is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingRecord) {
        await api.adminUpdateMonitoring(editingRecord.id, {
          date: formDate,
          physical_progress: Number(formPhysProgress),
          expenditure: formExpenditure === '' ? undefined : Number(formExpenditure),
          revised_cost: formRevCost === '' ? undefined : Number(formRevCost),
          key_milestone_note: formNote.trim(),
        });
        showToast('Monitoring record updated successfully.');
        setEditingRecord(null);
      } else {
        await api.adminCreateMonitoring({
          project_id: formProjectId,
          date: formDate,
          physical_progress: Number(formPhysProgress),
          expenditure: formExpenditure === '' ? undefined : Number(formExpenditure),
          revised_cost: formRevCost === '' ? undefined : Number(formRevCost),
        });
        showToast('New monthly monitoring entry recorded & project state updated.');
        setIsAddOpen(false);
      }
      await loadRecords();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to save monitoring record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsSubmitting(true);
      await api.adminDeleteMonitoring(deleteTarget.id);
      showToast('Monitoring record deleted.');
      setDeleteTarget(null);
      await loadRecords();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to delete record.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRecords = records.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.project_name && r.project_name.toLowerCase().includes(q)) ||
      (r.project_code && r.project_code.toLowerCase().includes(q)) ||
      (r.month && r.month.toLowerCase().includes(q)) ||
      (r.date && r.date.includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-600" />
            <span>Monthly Monitoring Time-Series Registry</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Record, audit, and calibrate time-stamped milestone progress and financial outlay for all projects.
          </p>
        </div>
        <button
          id="btn-admin-add-monitoring"
          onClick={openAddModal}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Monitoring Record</span>
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search project name, month, date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          id="select-filter-monitoring-project"
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
          {filteredRecords.length} records found
        </div>
      </div>

      {/* Monitoring Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Project / Month</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Physical Progress</th>
                <th className="px-4 py-3">Financial Progress</th>
                <th className="px-4 py-3">Expenditure</th>
                <th className="px-4 py-3">Calculated Risk</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Loading time-series monitoring records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No monitoring records match your query.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 line-clamp-1">{r.project_name}</div>
                      <div className="text-[11px] font-mono text-indigo-600">{r.project_code}</div>
                      <div className="text-[11px] font-medium text-slate-500">{r.month}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">{r.date}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-2 rounded-full"
                            style={{ width: `${Math.min(100, r.physical_progress)}%` }}
                          />
                        </div>
                        <span className="font-semibold">{r.physical_progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-slate-800">
                      {r.financial_progress}%
                    </td>
                    <td className="px-4 py-3 font-mono">
                      <div>₹{r.expenditure?.toLocaleString()} Cr</div>
                      <div className="text-[11px] text-slate-400">Rev: ₹{r.revised_cost?.toLocaleString()} Cr</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                        Score: {r.risk_score}
                      </span>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Delay: {r.delay_probability}% | Cost: {r.cost_overrun_probability}%
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          id={`btn-edit-monitoring-${r.id}`}
                          onClick={() => openEditModal(r)}
                          title="Edit Monitoring Record"
                          className="p-1.5 rounded hover:bg-indigo-50 text-indigo-600 hover:text-indigo-800"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`btn-delete-monitoring-${r.id}`}
                          onClick={() => setDeleteTarget(r)}
                          title="Delete Record"
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

      {/* Add / Edit Record Modal */}
      {(isAddOpen || editingRecord) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-600" />
                <span>{editingRecord ? 'Edit Monitoring Record' : 'Record Monthly Progress Checkpoint'}</span>
              </h3>
              <button
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingRecord(null);
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

              {!editingRecord && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Project *</label>
                  <select
                    value={formProjectId}
                    onChange={(e) => {
                      setFormProjectId(e.target.value);
                      const sel = projects.find((p) => p.id === e.target.value);
                      if (sel) {
                        setFormPhysProgress(sel.physical_progress);
                        setFormExpenditure(sel.expenditure);
                        setFormRevCost(sel.revised_cost);
                      }
                    }}
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Record Date *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Progress (%) *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                    value={formPhysProgress}
                    onChange={(e) => setFormPhysProgress(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 58.2"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expenditure (₹ Cr)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formExpenditure}
                    onChange={(e) => setFormExpenditure(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 4200"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Revised Cost Baseline (₹ Cr)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formRevCost}
                    onChange={(e) => setFormRevCost(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 5376"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Key Milestone Note</label>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="e.g. Tunnel excavation package 3 commissioned"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    setEditingRecord(null);
                  }}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-monitoring"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingRecord ? 'Save Changes' : 'Record Entry'}
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
                <h4 className="font-bold text-slate-900 text-sm">Delete Monitoring Record?</h4>
                <p className="text-xs text-slate-500">This time-series record will be removed from project history.</p>
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
                id="btn-confirm-delete-monitoring"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Delete Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
