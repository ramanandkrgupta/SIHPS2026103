import React, { useState } from 'react';
import {
  FolderGit2,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  AlertTriangle,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Building2,
  MapPin,
  Calendar,
} from 'lucide-react';
import { Project } from '../../types/index';
import { api } from '../../services/api';

interface AdminProjectsProps {
  projects: Project[];
  onRefresh: () => Promise<void>;
  showToast: (text: string, type?: 'success' | 'error') => void;
}

export const AdminProjects: React.FC<AdminProjectsProps> = ({
  projects,
  onRefresh,
  showToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [inspectingProject, setInspectingProject] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formSector, setFormSector] = useState('Highways');
  const [formMinistry, setFormMinistry] = useState('');
  const [formAgency, setFormAgency] = useState('');
  const [formState, setFormState] = useState('');
  const [formStatus, setFormStatus] = useState<'Ongoing' | 'Delayed' | 'Critical' | 'Completed'>('Ongoing');
  const [formOrigCost, setFormOrigCost] = useState<number | ''>('');
  const [formRevCost, setFormRevCost] = useState<number | ''>('');
  const [formExpenditure, setFormExpenditure] = useState<number | ''>('');
  const [formProgress, setFormProgress] = useState<number | ''>('');
  const [formOrigDate, setFormOrigDate] = useState('');
  const [formRevDate, setFormRevDate] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const openAddModal = () => {
    setFormCode(`PRJ-${Date.now().toString().slice(-4)}`);
    setFormName('');
    setFormSector('Highways');
    setFormMinistry('Ministry of Road Transport & Highways');
    setFormAgency('NHAI');
    setFormState('National');
    setFormStatus('Ongoing');
    setFormOrigCost('');
    setFormRevCost('');
    setFormExpenditure('');
    setFormProgress('');
    setFormOrigDate(new Date().toISOString().split('T')[0]);
    setFormRevDate(new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0]);
    setFormError(null);
    setIsAddOpen(true);
  };

  const openEditModal = (proj: Project) => {
    setEditingProject(proj);
    setFormCode(proj.project_code);
    setFormName(proj.project_name);
    setFormSector(proj.sector);
    setFormMinistry(proj.ministry || '');
    setFormAgency(proj.implementing_agency || '');
    setFormState(proj.state || '');
    setFormStatus(proj.project_status || 'Ongoing');
    setFormOrigCost(proj.original_cost);
    setFormRevCost(proj.revised_cost);
    setFormExpenditure(proj.expenditure);
    setFormProgress(proj.physical_progress);
    setFormOrigDate(proj.original_completion_date);
    setFormRevDate(proj.revised_completion_date);
    setFormError(null);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formCode.trim() || !formName.trim() || !formSector.trim()) {
      setFormError('Project Code, Name, and Sector are mandatory.');
      return;
    }
    const origCostNum = Number(formOrigCost);
    if (!formOrigCost || isNaN(origCostNum) || origCostNum <= 0) {
      setFormError('Original Cost must be a positive number in ₹ Crores.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        project_code: formCode.trim(),
        project_name: formName.trim(),
        sector: formSector.trim(),
        ministry: formMinistry.trim() || 'Ministry of Infrastructure',
        implementing_agency: formAgency.trim() || 'Central Implementing Agency',
        state: formState.trim() || 'National',
        project_status: formStatus,
        original_cost: origCostNum,
        revised_cost: formRevCost ? Number(formRevCost) : origCostNum,
        expenditure: formExpenditure ? Number(formExpenditure) : 0,
        physical_progress: formProgress ? Number(formProgress) : 0,
        original_completion_date: formOrigDate || '2026-12-31',
        revised_completion_date: formRevDate || formOrigDate || '2026-12-31',
      };

      if (editingProject) {
        await api.adminUpdateProject(editingProject.id, payload);
        showToast(`Project "${formName}" updated successfully.`);
        setEditingProject(null);
      } else {
        await api.adminCreateProject(payload);
        showToast(`Project "${formName}" created and added to tracking registry.`);
        setIsAddOpen(false);
      }
      await onRefresh();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Operation failed. Check inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteTarget) return;
    try {
      setIsSubmitting(true);
      await api.adminDeleteProject(deleteTarget.id);
      showToast(`Project "${deleteTarget.project_name}" deleted.`);
      setDeleteTarget(null);
      await onRefresh();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to delete project.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter & search logic
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.project_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.implementing_agency.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.state.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSector = sectorFilter === 'all' || p.sector.toLowerCase() === sectorFilter.toLowerCase();
    const matchesStatus = statusFilter === 'all' || p.project_status.toLowerCase() === statusFilter.toLowerCase();
    const matchesRisk = riskFilter === 'all' || p.risk_level.toLowerCase() === riskFilter.toLowerCase();

    return matchesSearch && matchesSector && matchesStatus && matchesRisk;
  });

  const sectors = Array.from(new Set(projects.map((p) => p.sector))).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-indigo-600" />
            <span>National Infrastructure Projects Management</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Full administrative authority over project attributes, timelines, cost revisions, and ML risk triggers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="btn-admin-add-project"
            onClick={openAddModal}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Project</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            id="input-admin-search-projects"
            type="text"
            placeholder="Search code, name, agency, state..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          id="select-admin-filter-sector"
          value={sectorFilter}
          onChange={(e) => setSectorFilter(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Sectors</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          id="select-admin-filter-status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Statuses</option>
          <option value="Ongoing">Ongoing</option>
          <option value="Delayed">Delayed</option>
          <option value="Critical">Critical</option>
          <option value="Completed">Completed</option>
        </select>

        <select
          id="select-admin-filter-risk"
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Risk Levels</option>
          <option value="High">High Risk (&gt;60)</option>
          <option value="Medium">Medium Risk (30-60)</option>
          <option value="Low">Low Risk (&lt;30)</option>
        </select>

        {(searchQuery || sectorFilter !== 'all' || statusFilter !== 'all' || riskFilter !== 'all') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSectorFilter('all');
              setStatusFilter('all');
              setRiskFilter('all');
            }}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1"
          >
            Clear Filters
          </button>
        )}

        <div className="text-xs text-slate-500 ml-auto font-medium">
          Showing {filteredProjects.length} of {projects.length} projects
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Code / Project</th>
                <th className="px-4 py-3">Sector & State</th>
                <th className="px-4 py-3">Cost (Orig / Rev)</th>
                <th className="px-4 py-3">Expenditure</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Risk Assessment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No infrastructure projects found matching current criteria.
                  </td>
                </tr>
              ) : (
                filteredProjects.map((p) => {
                  const riskColor =
                    p.risk_level === 'High'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : p.risk_level === 'Medium'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                  const statusColor =
                    p.project_status === 'Critical'
                      ? 'bg-rose-100 text-rose-800'
                      : p.project_status === 'Delayed'
                      ? 'bg-amber-100 text-amber-800'
                      : p.project_status === 'Completed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-100 text-blue-800';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 line-clamp-1">{p.project_name}</div>
                        <div className="text-[11px] font-mono text-indigo-600 font-medium">{p.project_code}</div>
                        <div className="text-[11px] text-slate-400">{p.implementing_agency}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{p.sector}</div>
                        <div className="text-[11px] text-slate-500">{p.state}</div>
                      </td>
                      <td className="px-4 py-3 font-mono">
                        <div>₹{p.original_cost?.toLocaleString()} Cr</div>
                        {p.revised_cost > p.original_cost && (
                          <div className="text-[11px] text-rose-600 font-semibold">
                            Rev: ₹{p.revised_cost?.toLocaleString()} Cr
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        <div>₹{p.expenditure?.toLocaleString()} Cr</div>
                        <div className="text-[11px] text-slate-500">{p.financial_progress}% Fin</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-indigo-600 h-2 rounded-full"
                              style={{ width: `${Math.min(100, p.physical_progress)}%` }}
                            />
                          </div>
                          <span className="font-semibold">{p.physical_progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${riskColor}`}>
                          Score: {p.risk_score} ({p.risk_level})
                        </span>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Delay: {p.delay_probability}% | Cost: {p.cost_overrun_probability}%
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${statusColor}`}>
                          {p.project_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            id={`btn-view-project-${p.id}`}
                            onClick={() => setInspectingProject(p)}
                            title="Inspect Project Details"
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`btn-edit-project-${p.id}`}
                            onClick={() => openEditModal(p)}
                            title="Edit Project"
                            className="p-1.5 rounded hover:bg-indigo-50 text-indigo-600 hover:text-indigo-800"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`btn-delete-project-${p.id}`}
                            onClick={() => setDeleteTarget(p)}
                            title="Delete Project"
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

      {/* Add / Edit Project Modal */}
      {(isAddOpen || editingProject) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-indigo-600" />
                <span>{editingProject ? 'Edit Project Parameters' : 'Add New Infrastructure Project'}</span>
              </h3>
              <button
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingProject(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Project Code *</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="e.g. NHAI-2026-09"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sector *</label>
                  <select
                    value={formSector}
                    onChange={(e) => setFormSector(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Highways">Highways</option>
                    <option value="Railways">Railways</option>
                    <option value="Metro">Metro</option>
                    <option value="Power">Power</option>
                    <option value="Petroleum">Petroleum</option>
                    <option value="Ports & Shipping">Ports & Shipping</option>
                    <option value="Renewable Energy">Renewable Energy</option>
                    <option value="Urban Infrastructure">Urban Infrastructure</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Western Dedicated Freight Corridor Section B"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ministry</label>
                  <input
                    type="text"
                    value={formMinistry}
                    onChange={(e) => setFormMinistry(e.target.value)}
                    placeholder="e.g. Ministry of Railways"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Agency</label>
                  <input
                    type="text"
                    value={formAgency}
                    onChange={(e) => setFormAgency(e.target.value)}
                    placeholder="e.g. DFCCIL"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={formState}
                    onChange={(e) => setFormState(e.target.value)}
                    placeholder="e.g. Gujarat / Maharashtra"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Original Cost (₹ Cr) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formOrigCost}
                    onChange={(e) => setFormOrigCost(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 4200"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Revised Cost (₹ Cr)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formRevCost}
                    onChange={(e) => setFormRevCost(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 5100"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expenditure (₹ Cr)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formExpenditure}
                    onChange={(e) => setFormExpenditure(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 3850"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Progress (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formProgress}
                    onChange={(e) => setFormProgress(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 64.5"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Original Completion Date</label>
                  <input
                    type="date"
                    value={formOrigDate}
                    onChange={(e) => setFormOrigDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Revised Completion Date</label>
                  <input
                    type="date"
                    value={formRevDate}
                    onChange={(e) => setFormRevDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Project Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                >
                  <option value="Ongoing">Ongoing</option>
                  <option value="Delayed">Delayed</option>
                  <option value="Critical">Critical</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    setEditingProject(null);
                  }}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-project"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingProject ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Project Drawer / Modal */}
      {inspectingProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-600">{inspectingProject.project_code}</span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">{inspectingProject.project_name}</h3>
              </div>
              <button onClick={() => setInspectingProject(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-slate-500 font-medium">Sector & Ministry</div>
                <div className="font-semibold text-slate-800 mt-1">{inspectingProject.sector}</div>
                <div className="text-slate-600 text-[11px]">{inspectingProject.ministry}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-slate-500 font-medium">Agency & State</div>
                <div className="font-semibold text-slate-800 mt-1">{inspectingProject.implementing_agency}</div>
                <div className="text-slate-600 text-[11px]">{inspectingProject.state}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg font-mono">
                <div className="text-slate-500 font-medium font-sans">Cost Escalation</div>
                <div className="font-semibold text-slate-900 mt-1">Orig: ₹{inspectingProject.original_cost} Cr</div>
                <div className="text-rose-600">Rev: ₹{inspectingProject.revised_cost} Cr (+{inspectingProject.cost_overrun_pct}%)</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg font-mono">
                <div className="text-slate-500 font-medium font-sans">Expenditure & Progress</div>
                <div className="font-semibold text-slate-900 mt-1">Spent: ₹{inspectingProject.expenditure} Cr</div>
                <div className="text-indigo-600">Physical: {inspectingProject.physical_progress}%</div>
              </div>
            </div>

            <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 text-xs">
              <div className="font-semibold text-indigo-950 flex items-center justify-between">
                <span>AI Risk Assessment Output</span>
                <span className="font-bold text-indigo-700">Risk Score: {inspectingProject.risk_score} / 100</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-[11px]">
                <div>Delay Probability: <span className="font-bold">{inspectingProject.delay_probability}%</span></div>
                <div>Cost Escalation: <span className="font-bold">{inspectingProject.cost_overrun_probability}%</span></div>
              </div>
            </div>

            {inspectingProject.recommended_action && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs">
                <div className="font-semibold text-amber-900">Recommended Action:</div>
                <div className="text-amber-800 mt-1">{inspectingProject.recommended_action.action}</div>
                <div className="text-amber-700 text-[11px] mt-1">Target: {inspectingProject.recommended_action.target_officer}</div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInspectingProject(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-100 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Delete Project & Cascading Data?</h4>
                <p className="text-xs text-slate-500">This action will delete the project record and its associated history.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg text-xs font-mono border border-slate-200">
              <div className="font-bold text-slate-900">{deleteTarget.project_name}</div>
              <div className="text-indigo-600 mt-0.5">{deleteTarget.project_code}</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete-project"
                onClick={handleDeleteProject}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Delete Project Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
