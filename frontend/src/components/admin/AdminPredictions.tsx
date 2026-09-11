import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  Play,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { PredictionRecord, Project } from '../../types/index';
import { api } from '../../services/api';

interface AdminPredictionsProps {
  projects: Project[];
  showToast: (text: string, type?: 'success' | 'error') => void;
  onRefreshProjects: () => Promise<void>;
}

export const AdminPredictions: React.FC<AdminPredictionsProps> = ({
  projects,
  showToast,
  onRefreshProjects,
}) => {
  const [predictions, setPredictions] = useState<PredictionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [isRunning, setIsRunning] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PredictionRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadPredictions = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminPredictions();
      setPredictions(data);
    } catch (err: any) {
      showToast('Failed to load prediction inference records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPredictions();
  }, []);

  const handleRunPrediction = async () => {
    if (!selectedProjectId) {
      showToast('Please select a project to run AI prediction.', 'error');
      return;
    }
    try {
      setIsRunning(true);
      const res = await api.adminRunPrediction(selectedProjectId);
      showToast(`Inference complete! ${res.message}`, 'success');
      await Promise.all([loadPredictions(), onRefreshProjects()]);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Inference pipeline failed.', 'error');
    } finally {
      setIsRunning(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.adminDeletePrediction(deleteTarget.id);
      showToast('Prediction inference record deleted.');
      setDeleteTarget(null);
      await loadPredictions();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to delete record.', 'error');
    }
  };

  const filteredPredictions = predictions.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.project_name?.toLowerCase().includes(q) ||
      p.project_code?.toLowerCase().includes(q) ||
      p.risk_level?.toLowerCase().includes(q) ||
      p.model_used?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Run Engine */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-indigo-600" />
            <span>AI Risk Prediction Engine Management</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Trigger on-demand multi-variable machine learning inference across national projects and inspect prediction logs.
          </p>
        </div>

        {/* Project Selector & Run Button */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            id="select-run-prediction-project"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-500 font-medium max-w-xs"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_code} - {p.project_name.slice(0, 32)}...
              </option>
            ))}
          </select>

          <button
            id="btn-run-ai-prediction"
            onClick={handleRunPrediction}
            disabled={isRunning || !selectedProjectId}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Inferring Risk Model...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Run Prediction</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search prediction history by project, risk level, model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          {filteredPredictions.length} prediction audits recorded
        </div>
      </div>

      {/* Predictions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Inference Timestamp</th>
                <th className="px-4 py-3">Risk Score & Level</th>
                <th className="px-4 py-3">Delay Probability</th>
                <th className="px-4 py-3">Cost Overrun Prob.</th>
                <th className="px-4 py-3">ML Model Architecture</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Loading ML predictions...
                  </td>
                </tr>
              ) : filteredPredictions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No prediction inferences logged yet. Click "Run Prediction" above to execute inference.
                  </td>
                </tr>
              ) : (
                filteredPredictions.map((pred) => {
                  const riskColor =
                    pred.risk_level === 'High'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : pred.risk_level === 'Medium'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                  return (
                    <tr key={pred.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{pred.project_name}</div>
                        <div className="text-[11px] font-mono text-indigo-600">{pred.project_code}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">
                        {new Date(pred.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${riskColor}`}>
                          Score: {pred.risk_score} / 100 ({pred.risk_level})
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 font-mono">
                          <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-amber-500 h-1.5 rounded-full"
                              style={{ width: `${pred.delay_probability}%` }}
                            />
                          </div>
                          <span className="font-semibold">{pred.delay_probability}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 font-mono">
                          <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-rose-500 h-1.5 rounded-full"
                              style={{ width: `${pred.cost_overrun_probability}%` }}
                            />
                          </div>
                          <span className="font-semibold">{pred.cost_overrun_probability}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {pred.model_used || 'RandomForestRegressor'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          id={`btn-delete-prediction-${pred.id}`}
                          onClick={() => setDeleteTarget(pred)}
                          title="Delete Inference Record"
                          className="p-1.5 rounded hover:bg-rose-50 text-rose-600 hover:text-rose-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-100 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Delete Prediction Audit?</h4>
                <p className="text-xs text-slate-500">The prediction record will be deleted from historical inference logs.</p>
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
                id="btn-confirm-delete-prediction"
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
