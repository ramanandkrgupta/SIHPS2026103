import React, { useState } from 'react';
import {
  X,
  Play,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Layers,
  Sparkles,
  ShieldCheck,
  Compass,
} from 'lucide-react';

interface DemoTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToProjectDetails: (projectId: string) => void;
  onGoToDashboard: () => void;
  onGoToAlerts: () => void;
  onGoToModelInsights: () => void;
}

export const DemoTourModal: React.FC<DemoTourModalProps> = ({
  isOpen,
  onClose,
  onGoToProjectDetails,
  onGoToDashboard,
  onGoToAlerts,
  onGoToModelInsights,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const tourSteps = [
    {
      title: 'Welcome to Project Sentinel AI',
      badge: 'Hackathon Demo Walkthrough',
      description:
        'Project Sentinel AI is an intelligent infrastructure early-warning command center. It answers: “Which project is likely to face delay or cost overrun, why is it risky, and what action should be taken now?”',
      highlights: [
        'Predict • Explain • Warn • Act architecture',
        '45 realistic infrastructure projects across 10 sectors',
        'Transparent hybrid risk engine formula (0-100 score)',
      ],
      actionLabel: 'Explore Live Dashboard',
      onAction: () => {
        onGoToDashboard();
        setCurrentStep(1);
      },
    },
    {
      title: 'The Standout Demo Project: Eastern Corridor Highway',
      badge: 'Project NHAI-ECH-2023-04',
      description:
        'Witness how Sentinel AI catches delayed projects before disaster strikes. Eastern Corridor Highway Package 4 currently displays a severe 82/100 HIGH RISK score.',
      highlights: [
        'Delay Probability: 88% | Cost Escalation Risk: 74%',
        'Critical Progress Gap: Physical (42%) vs Financial (76%)',
        'Risk accelerated +50 points over the last 3 months',
        'Prescriptive field action generated for Principal Secretary',
      ],
      actionLabel: 'Inspect Standout Project Details',
      onAction: () => {
        onGoToProjectDetails('1');
        setCurrentStep(2);
      },
    },
    {
      title: 'Active Early Warning Triage',
      badge: 'Early Warnings Command Center',
      description:
        'Government officers and project directors receive statutory early warning alerts before quarterly milestone reviews.',
      highlights: [
        'Classified by severity: Critical, High, and Medium',
        'Automated detection of expenditure-physical progress gaps',
        'Status triage: New → Reviewed → Resolved',
      ],
      actionLabel: 'Review Early Warning Alerts',
      onAction: () => {
        onGoToAlerts();
        setCurrentStep(3);
      },
    },
    {
      title: 'Empirical Machine Learning & Explainability',
      badge: 'Scikit-Learn Validation',
      description:
        'Proving real AI modeling to judges. Review empirical cross-validation metrics and feature importance weights.',
      highlights: [
        'Random Forest vs Logistic Regression benchmark',
        'Progress Gap identified as #1 feature (34.2% importance)',
        'Champion selection rationale: captures non-linear billing interactions',
      ],
      actionLabel: 'View Model Insights & Metrics',
      onAction: () => {
        onGoToModelInsights();
        onClose();
      },
    },
  ];

  const step = tourSteps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
      <div className="bg-slate-900 text-white rounded-2xl border border-slate-700 shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider font-mono">
                Judge Presentation Guide
              </div>
              <h3 className="text-sm font-bold text-white">
                Step {currentStep + 1} of {tourSteps.length}: {step.badge}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <h4 className="text-lg font-bold text-white tracking-tight">
            {step.title}
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            {step.description}
          </p>

          <div className="space-y-2 pt-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Demonstration Highlights:
            </div>
            {(step?.highlights || []).map((h, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{h}</span>
              </div>
            ))}
          </div>

          {/* Stepper Dots */}
          <div className="flex items-center justify-center gap-1.5 pt-4">
            {(tourSteps || []).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  i === currentStep ? 'w-6 bg-blue-500' : 'w-2 bg-slate-700 hover:bg-slate-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <button
            disabled={currentStep === 0}
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-30 flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <button
            onClick={step.onAction}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-900/40 flex items-center gap-1.5 cursor-pointer"
          >
            <span>{step.actionLabel}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
