import React, { useState, useEffect } from 'react';
import {
  Cpu,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  Zap,
  Layers,
  Award,
  Sliders,
  BarChart2,
} from 'lucide-react';
import { api } from '../../services/api';

interface AdminModelsProps {
  showToast: (text: string, type?: 'success' | 'error') => void;
}

export const AdminModels: React.FC<AdminModelsProps> = ({ showToast }) => {
  const [modelsData, setModelsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [retrainingModel, setRetrainingModel] = useState<string | null>(null);
  const [switchingModel, setSwitchingModel] = useState(false);

  const loadModels = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminModels();
      setModelsData(data);
    } catch (err: any) {
      showToast('Failed to load ML model benchmarks.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModels();
  }, []);

  const handleRetrain = async (modelName: string) => {
    try {
      setRetrainingModel(modelName);
      const res = await api.adminRetrainModel(modelName);
      showToast(res.message, 'success');
      await loadModels();
    } catch (err: any) {
      showToast('Model retraining encountered an error.', 'error');
    } finally {
      setRetrainingModel(null);
    }
  };

  const handleSetActive = async (modelName: string) => {
    try {
      setSwitchingModel(true);
      await api.adminSetActiveModel(modelName);
      showToast(`Active production inference engine switched to ${modelName}.`, 'success');
      await loadModels();
    } catch (err: any) {
      showToast('Failed to switch active model.', 'error');
    } finally {
      setSwitchingModel(false);
    }
  };

  const models = modelsData?.models || [];
  const activeModel = modelsData?.active_model || 'Random Forest Classifier';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-600" />
            <span>Machine Learning Model Registry & Calibration</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluate cross-validation performance, calibrate hyper-parameters, trigger batch retraining, and switch production serving models.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Active Serving Model:</span>
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
            {activeModel}
          </span>
        </div>
      </div>

      {/* Model Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-3 bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
            Loading ML models architecture data...
          </div>
        ) : (
          models.map((m: any, idx: number) => {
            const modelName = m.name || m.model_name || `Model-${idx + 1}`;
            const modelSlug = String(modelName).replace(/\s+/g, '-').toLowerCase();
            const isActive = modelName === activeModel;
            const isRetraining = retrainingModel === modelName;

            return (
              <div
                key={modelName || idx}
                className={`bg-white rounded-xl p-5 border transition-all flex flex-col justify-between ${
                  isActive
                    ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {m.type || 'Supervised Learning'}
                    </span>
                    {isActive ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        In Production
                      </span>
                    ) : (
                      <button
                        id={`btn-set-active-${modelSlug}`}
                        onClick={() => handleSetActive(modelName)}
                        disabled={switchingModel}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 px-2 py-0.5 rounded hover:bg-indigo-50 border border-indigo-200 cursor-pointer"
                      >
                        Set as Active
                      </button>
                    )}
                  </div>

                  <h4 className="text-base font-bold text-slate-900">{modelName}</h4>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Trained: {m.last_trained || m.training_date || '2026-09-09'} • {(m.training_samples || m.training_data_size || 45)?.toLocaleString()} samples
                  </div>

                  {/* Benchmark Metrics Bar */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100">
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <div className="text-[11px] text-slate-500 font-medium">Accuracy</div>
                      <div className="text-lg font-bold text-slate-900">
                        {((m.accuracy ?? 0.9) * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <div className="text-[11px] text-slate-500 font-medium">F1-Score</div>
                      <div className="text-lg font-bold text-indigo-600">
                        {(m.f1_score ?? 0.89).toFixed(3)}
                      </div>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <div className="text-[11px] text-slate-500 font-medium">Precision</div>
                      <div className="text-sm font-bold text-slate-800">
                        {((m.precision ?? 0.88) * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <div className="text-[11px] text-slate-500 font-medium">Recall</div>
                      <div className="text-sm font-bold text-slate-800">
                        {((m.recall ?? 0.87) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">Status: {m.status || 'Active'}</span>
                  <button
                    id={`btn-retrain-${modelSlug}`}
                    onClick={() => handleRetrain(modelName)}
                    disabled={isRetraining}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRetraining ? 'animate-spin' : ''}`} />
                    <span>{isRetraining ? 'Retraining...' : 'Retrain Model'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
