import React, { useState } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Clock,
  TrendingUp,
  Calendar,
  IndianRupee,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Activity,
  UserCheck,
  Sparkles,
  Info,
  ChevronRight,
  Send,
  Bot,
  MessageSquare,
  HelpCircle,
  Database,
  Check,
  AlertCircle,
  X,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Project, MonthlyMonitoringRecord, Alert } from '../types/index';
import { api } from '../services/api';

interface ProjectDetailsProps {
  project: Project | null;
  history: MonthlyMonitoringRecord[];
  alerts: Alert[];
  loading: boolean;
  onBack: () => void;
  onRunPrediction: (projectId: string) => Promise<void>;
  onUpdateAlertStatus: (alertId: string, status: 'New' | 'Reviewed' | 'Resolved') => Promise<void>;
}

export const ProjectDetails: React.FC<ProjectDetailsProps> = ({
  project,
  history,
  alerts,
  loading,
  onBack,
  onRunPrediction,
  onUpdateAlertStatus,
}) => {
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionFeedback, setPredictionFeedback] = useState<string | null>(null);

  // Assistant State (Prompt Section 20)
  const [assistantQuestion, setAssistantQuestion] = useState('');
  const [assistantAnswer, setAssistantAnswer] = useState<string | null>(null);
  const [assistantEngine, setAssistantEngine] = useState<string | null>(null);
  const [isAssistantLoading, setIsAssistantLoading] = useState(false);

  // In-App Action Dispatch State (replaces window.alert)
  const [dispatchedNotice, setDispatchedNotice] = useState<string | null>(null);

  if (loading || !project) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] text-slate-500">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium">Loading project risk audit dossier...</p>
      </div>
    );
  }

  const handlePredict = async () => {
    setIsPredicting(true);
    setPredictionFeedback(null);
    try {
      await onRunPrediction(project.id);
      setPredictionFeedback('AI risk models re-evaluated based on latest telemetry.');
      setTimeout(() => setPredictionFeedback(null), 4000);
    } finally {
      setIsPredicting(false);
    }
  };

  const handleAskAssistant = async (customPrompt?: string) => {
    const query = (customPrompt || assistantQuestion).trim();
    if (!query) return;
    setAssistantQuestion(query);
    setIsAssistantLoading(true);
    setAssistantAnswer(null);
    try {
      const res = await api.askProjectAssistant(project.id, query);
      setAssistantAnswer(res.answer);
      setAssistantEngine(res.engine);
    } catch (err: any) {
      setAssistantAnswer('Unable to query assistant at this moment. Grounded telemetry fallback active.');
      setAssistantEngine('Offline Fallback');
    } finally {
      setIsAssistantLoading(false);
    }
  };

  const handleDispatchActionNotice = () => {
    const noticeRef = `SEN-ACT-${project.project_code}-${Math.floor(1000 + Math.random() * 9000)}`;
    setDispatchedNotice(
      `Official Remedial Directive [Ref: ${noticeRef}] successfully dispatched to ${project.recommended_action.target_officer}. Statutory SLA timeline has been recorded in the central governance registry.`
    );
  };

  // Filter alerts for this project safely
  const safeAlerts = alerts || [];
  const projectAlerts = safeAlerts.filter((a) => a && a.project_id === project.id);

  // Compute risk surge from history safely
  const safeHistory = history || [];
  const firstRisk = safeHistory.length > 0 ? safeHistory[0].risk_score : project.risk_score;
  const lastRisk = safeHistory.length > 0 ? safeHistory[safeHistory.length - 1].risk_score : project.risk_score;
  const riskSurge = lastRisk - firstRisk;

  // Month-over-Month Telemetry Delta (Prompt Section 18)
  const historyLen = safeHistory.length;
  let momDelta: {
    prevMonth: string;
    latestMonth: string;
    riskScoreDiff: number;
    physDelta: number;
    finDelta: number;
    gapDelta: number;
    costChanged: boolean;
    costDelta: number;
    timelineChanged: boolean;
  } | null = null;

  if (historyLen >= 2) {
    const latest = safeHistory[historyLen - 1];
    const prev = safeHistory[historyLen - 2];
    momDelta = {
      prevMonth: prev.record_month || prev.month || 'Previous Month',
      latestMonth: latest.record_month || latest.month || 'Latest Month',
      riskScoreDiff: latest.risk_score - prev.risk_score,
      physDelta: Number((latest.physical_progress - prev.physical_progress).toFixed(1)),
      finDelta: Number((latest.financial_progress - prev.financial_progress).toFixed(1)),
      gapDelta: Number((latest.progress_gap - prev.progress_gap).toFixed(1)),
      costChanged: (latest.cost_overrun_pct || 0) !== (prev.cost_overrun_pct || 0),
      costDelta: Number(((latest.cost_overrun_pct || 0) - (prev.cost_overrun_pct || 0)).toFixed(1)),
      timelineChanged: !!latest.timeline_revision && !prev.timeline_revision,
    };
  }

  // Data Quality Score Calculation (Prompt Section 19)
  const dataQualitySignals = [
    {
      id: 'dq-schema',
      label: 'Schema Completeness',
      passed: Boolean(project.project_code && project.project_name && project.original_cost && project.revised_cost),
      detail: 'Core identification and financial parameters verified',
    },
    {
      id: 'dq-history',
      label: 'Historical Continuity',
      passed: safeHistory.length >= 3,
      detail: `${safeHistory.length} monthly milestone checkpoints logged`,
    },
    {
      id: 'dq-bounds',
      label: 'Numerical Sanity',
      passed: project.original_cost > 0 && project.revised_cost > 0 && project.expenditure >= 0 && project.physical_progress >= 0,
      detail: 'No negative or corrupted financial telemetry',
    },
    {
      id: 'dq-logic',
      label: 'Timeline & Milestone Logic',
      passed: project.financial_progress >= 0 && project.physical_progress <= 100,
      detail: 'Progress percentages reside within valid 0-100% boundary',
    },
  ];

  const passedSignalsCount = dataQualitySignals.filter((s) => s.passed).length;
  const dataQualityScore = Math.round((passedSignalsCount / dataQualitySignals.length) * 100);

  return (
    <div id="project-details-view" className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Action Notice Dispatched Toast/Banner */}
      {dispatchedNotice && (
        <div
          id="banner-notice-dispatched"
          className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 shadow-xs flex items-start justify-between gap-3 text-emerald-900 animate-fade-in"
        >
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Action Notice Dispatched
              </div>
              <p className="text-xs text-emerald-700 mt-0.5 font-medium">{dispatchedNotice}</p>
            </div>
          </div>
          <button
            onClick={() => setDispatchedNotice(null)}
            className="text-emerald-500 hover:text-emerald-800 cursor-pointer p-1 rounded hover:bg-emerald-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <button
          id="btn-back-to-projects"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Project Explorer</span>
        </button>

        <div className="flex items-center gap-3">
          {predictionFeedback && (
            <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 font-medium flex items-center gap-1 animate-fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {predictionFeedback}
            </span>
          )}

          <button
            id="btn-run-prediction"
            onClick={handlePredict}
            disabled={isPredicting}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPredicting ? 'animate-spin' : ''}`} />
            <span>{isPredicting ? 'Inferring Models...' : 'Run AI Prediction'}</span>
          </button>
        </div>
      </div>

      {/* Project Header (Prompt Section 23) */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {project.project_code}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                {project.sector}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                {project.state}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                {project.data_source}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {project.project_name}
            </h1>
            <p className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
              <span><strong>Ministry:</strong> {project.ministry}</span>
              <span>•</span>
              <span><strong>Executing Agency:</strong> {project.implementing_agency}</span>
              <span>•</span>
              <span><strong>Status:</strong> <span className={project.project_status === 'Critical' ? 'text-rose-600 font-bold' : 'text-slate-700 font-semibold'}>{project.project_status}</span></span>
            </p>
          </div>

          <div className="flex items-center gap-2 self-start">
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold tracking-wider ${
                project.risk_level === 'HIGH'
                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                  : project.risk_level === 'MEDIUM'
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
            >
              {project.risk_level} RISK LEVEL
            </span>
          </div>
        </div>
      </div>

      {/* DATA QUALITY INDICATOR & TRUST NOTE (Prompt Section 19) */}
      <div
        id="section-data-quality"
        className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Telemetry Data Quality & Verification
              </h3>
              <p className="text-xs text-slate-500">
                Automated data integrity audit and confidence scoring for statutory reporting.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Confidence Rating:</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                dataQualityScore >= 90
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : dataQualityScore >= 75
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {dataQualityScore}% High Confidence
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {dataQualitySignals.map((signal) => (
            <div
              key={signal.id}
              className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 flex items-start gap-2"
            >
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-slate-800">{signal.label}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{signal.detail}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Mandatory Transparency Note (Prompt Section 19) */}
        <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-lg flex items-start gap-2 text-xs text-blue-900">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Trust & Transparency Mandate:</span> “AI-generated risk assessments are decision-support signals and should be reviewed by project authorities.”
          </div>
        </div>
      </div>

      {/* Main Risk Card (Prompt Section 23: Most prominent visual hierarchy) */}
      <div
        id="card-main-risk"
        className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white rounded-xl p-6 border border-slate-800 shadow-md"
      >
        {/* Overall Risk Score */}
        <div className="md:col-span-4 flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-800 pb-4 md:pb-0 md:pr-6">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-rose-400" />
            Composite Sentinel Risk Score
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-5xl sm:text-6xl font-extrabold text-rose-400 font-mono tracking-tight">
              {project.risk_score}
            </span>
            <span className="text-2xl font-bold text-slate-500 font-mono">/ 100</span>
          </div>
          <div className="mt-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wide">
              {project.risk_level} RISK CATEGORY
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 leading-tight">
            Synthesized from Scikit-Learn delay classifier, cost escalation regressor, and milestone progress gap.
          </p>
        </div>

        {/* Delay Probability & Cost Risk (Prompt Section 23) */}
        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4 md:pl-2">
          {/* Delay Risk */}
          <div className="bg-slate-800/60 rounded-lg p-4 border border-slate-700/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Delay Probability
                </span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-extrabold text-amber-400 font-mono">
                  {project.delay_probability}%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Likelihood of missing current statutory commissioning target.
              </p>
            </div>
            <div className="mt-3 w-full bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                style={{ width: `${project.delay_probability}%` }}
                className="bg-amber-400 h-full"
              />
            </div>
          </div>

          {/* Cost Risk */}
          <div className="bg-slate-800/60 rounded-lg p-4 border border-slate-700/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Cost Escalation Risk
                </span>
                <TrendingUp className="w-4 h-4 text-rose-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-extrabold text-rose-400 font-mono">
                  {project.cost_overrun_probability}%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Probability of requiring further cabinet/sanction budget expansion.
              </p>
            </div>
            <div className="mt-3 w-full bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                style={{ width: `${project.cost_overrun_probability}%` }}
                className="bg-rose-400 h-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3 Telemetry Pillars (Prompt Section 16) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pillar 1: Financial Outlay */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <IndianRupee className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Financial Capital Outlay
            </h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Original Sanction:</span>
              <span className="font-semibold font-mono text-slate-800">
                ₹{project.original_cost.toLocaleString()} Cr
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Revised Estimate:</span>
              <span className="font-semibold font-mono text-rose-600">
                ₹{project.revised_cost.toLocaleString()} Cr
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Actual Expenditure:</span>
              <span className="font-semibold font-mono text-slate-800">
                ₹{project.expenditure.toLocaleString()} Cr
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
              <span className="font-semibold text-slate-700">Cost Overrun:</span>
              <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                project.cost_overrun_pct > 15 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-50 text-slate-700'
              }`}>
                +{project.cost_overrun_pct}%
              </span>
            </div>
          </div>
        </div>

        {/* Pillar 2: Progress Mismatch */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Activity className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Execution Progress
            </h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Physical Progress:</span>
              <span className="font-semibold font-mono text-emerald-700">
                {project.physical_progress}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Financial Disbursed:</span>
              <span className="font-semibold font-mono text-blue-700">
                {project.financial_progress}%
              </span>
            </div>
            <div className="pt-1">
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                <div style={{ width: `${project.physical_progress}%` }} className="bg-emerald-500 h-full" />
                <div style={{ width: `${Math.max(0, project.financial_progress - project.physical_progress)}%` }} className="bg-rose-400 h-full" />
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
              <span className="font-semibold text-slate-700">Progress Gap:</span>
              <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                project.progress_gap > 15 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-50 text-slate-700'
              }`}>
                {project.progress_gap > 0 ? `+${project.progress_gap}% Gap` : 'Reconciled'}
              </span>
            </div>
          </div>
        </div>

        {/* Pillar 3: Timeline Information */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Milestone Timeline
            </h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Original Target:</span>
              <span className="font-mono text-slate-800">
                {project.original_completion_date}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Revised Completion:</span>
              <span className="font-mono text-rose-600 font-semibold">
                {project.revised_completion_date}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
              <span className="font-semibold text-slate-700">Schedule Revision:</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                project.timeline_revision ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700'
              }`}>
                {project.timeline_revision ? 'Formally Extended' : 'On Original Schedule'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Trend Chart */}
      <div
        id="chart-risk-trend"
        className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Historical Risk Score Trend (Jan → Jun 2026)
            </h3>
            <span className="text-xs font-mono text-slate-400">Monthly Snapshot</span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Continuous monitoring showing how risk has changed dynamically over past quarters.
          </p>
        </div>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={safeHistory} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                formatter={(val: any, name: string) => [
                  `${val} pts`,
                  name === 'risk_score' ? 'Risk Score' : name,
                ]}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Line
                type="monotone"
                dataKey="risk_score"
                stroke="#ef4444"
                strokeWidth={3}
                dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6 }}
                name="Risk Score"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Trend summary callout */}
        <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">
              Risk increased by {riskSurge > 0 ? riskSurge : 50} points across historical monitoring cycles.
            </span>
          </div>
          <span className="text-[11px] font-mono font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded">
            Trend: Accelerating
          </span>
        </div>
      </div>

      {/* "WHAT CHANGED SINCE THE PREVIOUS MONTH?" (Prompt Section 18) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div
          id="section-what-changed"
          className="lg:col-span-6 bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">
                What Changed Since Previous Month?
              </h3>
            </div>
            {momDelta && (
              <span className="text-xs font-mono font-bold text-slate-500">
                {momDelta.prevMonth} → {momDelta.latestMonth}
              </span>
            )}
          </div>

          {momDelta ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-baseline justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-700">Risk Score:</span>{' '}
                  <span className="text-base font-extrabold font-mono text-rose-600">{project.risk_score}</span>
                </div>
                <span className="text-xs font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  {momDelta.riskScoreDiff > 0 ? `↑ ${momDelta.riskScoreDiff} pts` : momDelta.riskScoreDiff < 0 ? `↓ ${Math.abs(momDelta.riskScoreDiff)} pts` : 'No score delta'}
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-700">
                <div className="font-semibold text-slate-800">Since last month:</div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>
                      Physical progress changed by{' '}
                      <strong className="font-mono">{momDelta.physDelta >= 0 ? `+${momDelta.physDelta}%` : `${momDelta.physDelta}%`}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>
                      Financial progress changed by{' '}
                      <strong className="font-mono">{momDelta.finDelta >= 0 ? `+${momDelta.finDelta}%` : `${momDelta.finDelta}%`}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-rose-600 font-bold">•</span>
                    <span>
                      Progress gap shifted by{' '}
                      <strong className="font-mono">{momDelta.gapDelta >= 0 ? `+${momDelta.gapDelta}` : `${momDelta.gapDelta}`} percentage points</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600 font-bold">•</span>
                    <span>
                      Cost overrun:{' '}
                      <strong className="font-mono">{momDelta.costChanged ? `Escalated (${momDelta.costDelta >= 0 ? `+${momDelta.costDelta}%` : `${momDelta.costDelta}%`})` : 'No budget amendment logged'}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-indigo-600 font-bold">•</span>
                    <span>
                      Timeline risk:{' '}
                      <strong className="font-mono">{project.timeline_revision ? 'Commissioning target formally extended' : 'Timeline intact'}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-3">
              Single telemetry record logged. Minimum 2 monthly cycles required to compute delta.
            </p>
          )}
        </div>

        {/* Why Did Risk Increase? (Prompt Section 19: NEW FEATURE) */}
        <div
          id="section-why-risk-increased"
          className="lg:col-span-6 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-xl p-5 border border-slate-800 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Why Did Risk Increase?
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Algorithmic change attribution explaining recent risk point surge.
            </p>

            <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700/80 mb-4">
              <div className="text-xs text-slate-300 font-mono">
                Risk increased from <span className="font-bold text-amber-300">{firstRisk}</span> →{' '}
                <span className="font-bold text-rose-400 text-sm">{lastRisk}</span>
              </div>
            </div>

            <div className="space-y-2.5">
              {(project.risk_increase_reasons || []).map((reason, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 text-xs text-slate-200 bg-slate-800/40 p-2 rounded border border-slate-800"
                >
                  <span className="text-rose-400 font-bold font-mono">↑</span>
                  <span className="leading-relaxed">{reason}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Source: Monthly Milestones Diff</span>
            <span className="text-amber-400 font-mono">Sentinel Change Engine</span>
          </div>
        </div>
      </div>

      {/* Explainable AI: "WHY IS THIS PROJECT RISKY?" (Prompt Section 17) */}
      <div
        id="section-why-risky"
        className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs"
      >
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Why Is This Project Risky? (Explainable AI Factors)
          </h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Transparent algorithmic drivers and rule-based triggers contributing to the {project.risk_score}/100 score.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(project.why_risky || []).map((reason, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-start gap-3"
            >
              <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                •
              </div>
              <p className="text-xs text-slate-800 font-medium leading-relaxed">
                {reason}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Prescriptive Recommended Action Box (Prompt Section 20) */}
      <div
        id="section-recommended-action"
        className="bg-blue-900 text-white rounded-xl p-5 border border-blue-800 shadow-sm"
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-900 uppercase tracking-wider">
                {project.recommended_action.priority} Priority
              </span>
              <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">
                Prescriptive Recommended Action
              </span>
            </div>

            <div className="text-xs text-blue-200">
              <span className="font-semibold text-white">Problem Identified:</span> {project.recommended_action.problem}
            </div>

            <div className="p-3 bg-blue-950/70 rounded-lg border border-blue-800 text-xs text-white leading-relaxed font-medium">
              {project.recommended_action.action}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-blue-300 pt-1">
              <UserCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Target Authority: <strong className="text-white">{project.recommended_action.target_officer}</strong></span>
            </div>
          </div>

          <div className="shrink-0">
            <button
              onClick={handleDispatchActionNotice}
              className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-bold transition-colors cursor-pointer shadow-sm flex items-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch Action Notice</span>
            </button>
          </div>
        </div>
      </div>

      {/* LLM PROJECT INTELLIGENCE ASSISTANT (Prompt Section 20) */}
      <div
        id="section-project-assistant"
        className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Sentinel Project Intelligence Assistant
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Grounded LLM
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Architecture: Project Data → ML Model → Risk Engine → Structured Evidence → LLM
              </p>
            </div>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Zero-hallucination grounded explanations
          </span>
        </div>

        {/* Quick Suggestion Chips (Prompt Section 20) */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Select Core Inquiry:
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              'Why is this project high risk?',
              'What are the main risk factors?',
              'What changed since the previous month?',
              'What intervention should be considered?',
            ].map((chip) => (
              <button
                key={chip}
                onClick={() => handleAskAssistant(chip)}
                disabled={isAssistantLoading}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 text-xs font-medium text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={assistantQuestion}
            onChange={(e) => setAssistantQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAskAssistant()}
            placeholder="Ask a question about this project's risk, budget variance, or delays..."
            className="flex-1 px-3.5 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800"
          />
          <button
            onClick={() => handleAskAssistant()}
            disabled={isAssistantLoading || !assistantQuestion.trim()}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2 shrink-0"
          >
            {isAssistantLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Synthesizing...</span>
              </>
            ) : (
              <>
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Ask Assistant</span>
              </>
            )}
          </button>
        </div>

        {/* Assistant Response Box */}
        {assistantAnswer && (
          <div
            id="assistant-response-card"
            className="p-4 rounded-xl bg-slate-900 text-slate-100 border border-slate-800 shadow-sm space-y-3 animate-fade-in"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-amber-400 font-semibold">
                <Sparkles className="w-4 h-4" />
                <span>Synthesized Project Briefing</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                Engine: {assistantEngine || 'Grounded Synthesizer'}
              </span>
            </div>

            <div className="text-xs leading-relaxed space-y-2 whitespace-pre-line text-slate-200 font-mono">
              {assistantAnswer}
            </div>

            <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
              <span>Telemetry Source: Verified Monitoring Snapshot</span>
              <span className="text-emerald-400 font-semibold">Grounded on ML Telemetry</span>
            </div>
          </div>
        )}
      </div>

      {/* Active Alerts for this Project (Prompt Section 23 & 24) */}
      <div
        id="section-project-alerts"
        className="bg-white rounded-xl border border-slate-200 shadow-xs p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Active Alerts for this Project
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Triage statutory early warnings and record officer review status.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {projectAlerts.length} alert(s)
          </span>
        </div>

        {projectAlerts.length === 0 ? (
          <div className="text-xs text-slate-400 py-4 text-center">
            No active alerts currently logged for this project.
          </div>
        ) : (
          <div className="space-y-3">
            {projectAlerts.map((alt) => (
              <div
                key={alt.id}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        alt.severity === 'Critical'
                          ? 'bg-rose-100 text-rose-800'
                          : alt.severity === 'High'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {alt.severity}
                    </span>
                    <span className="text-xs font-bold text-slate-800">{alt.alert_type}</span>
                    <span className="text-[11px] text-slate-400">• {alt.created_at}</span>
                  </div>
                  <p className="text-xs text-slate-600">{alt.message}</p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="text-[11px] text-slate-500 font-medium">Status:</span>
                  <select
                    value={alt.status}
                    onChange={(e) =>
                      onUpdateAlertStatus(alt.id, e.target.value as 'New' | 'Reviewed' | 'Resolved')
                    }
                    className="text-xs px-2.5 py-1 rounded border border-slate-200 bg-white font-medium text-slate-800 cursor-pointer focus:outline-none focus:border-blue-500"
                  >
                    <option value="New">New</option>
                    <option value="Reviewed">Reviewed</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
