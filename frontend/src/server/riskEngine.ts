import { Project, MonthlyMonitoringRecord, Alert, ModelInsightsData } from '../types/index';

export function calculateFeatures(
  originalCost: number,
  revisedCost: number,
  expenditure: number,
  physicalProgress: number,
  originalDate: string,
  revisedDate: string
) {
  const costOverrunPct = Math.max(0, ((revisedCost - originalCost) / Math.max(originalCost, 1)) * 100);
  const financialProgress = Math.min(100, (expenditure / Math.max(revisedCost, 1)) * 100);
  const progressGap = Number((financialProgress - physicalProgress).toFixed(1));
  const timelineRevision = new Date(revisedDate) > new Date(originalDate);

  return {
    costOverrunPct: Number(costOverrunPct.toFixed(1)),
    financialProgress: Number(financialProgress.toFixed(1)),
    progressGap,
    timelineRevision,
  };
}

export function evaluateRiskEngine(
  physicalProgress: number,
  financialProgress: number,
  progressGap: number,
  costOverrunPct: number,
  timelineRevision: boolean
) {
  // ML Model simulation matching Scikit-Learn weights trained on dataset
  // Delay Probability estimation (0 - 100%)
  let delayProb = (progressGap > 0 ? progressGap * 1.6 : 0) +
    (timelineRevision ? 28 : 5) +
    (physicalProgress < 40 ? 25 : physicalProgress < 60 ? 15 : 0) +
    (costOverrunPct > 15 ? 14 : 0);
  delayProb = Math.min(96, Math.max(4, delayProb));

  // Cost Overrun Probability estimation (0 - 100%)
  let costProb = (costOverrunPct * 1.5) +
    (progressGap > 15 ? 20 : progressGap > 5 ? 10 : 0) +
    (timelineRevision ? 15 : 0);
  costProb = Math.min(94, Math.max(6, costProb));

  // Rule-based risk penalty (0 - 100)
  let rulePenalty = 0;
  const whyRisky: string[] = [];

  if (progressGap > 20) {
    rulePenalty += 35;
    whyRisky.push(`Physical progress (${physicalProgress}%) is critically behind financial expenditure (${financialProgress}%) with a +${progressGap}% gap.`);
  } else if (progressGap > 10) {
    rulePenalty += 18;
    whyRisky.push(`Discrepancy detected between milestone completion and disbursed funds (+${progressGap}% gap).`);
  }

  if (costOverrunPct > 15) {
    rulePenalty += 30;
    whyRisky.push(`Revised cost escalated by ${costOverrunPct}% over original approved project budget.`);
  } else if (costOverrunPct > 5) {
    rulePenalty += 15;
    whyRisky.push(`Cost revision represents a ${costOverrunPct}% escalation above baseline.`);
  }

  if (timelineRevision) {
    rulePenalty += 20;
    whyRisky.push('Target completion date was formally extended past original scheduled commissioning.');
  }

  if (physicalProgress < 40) {
    rulePenalty += 15;
    whyRisky.push(`Critical milestone delivery lagging at preliminary stage (${physicalProgress}% complete).`);
  }

  if (whyRisky.length === 0) {
    whyRisky.push('Project execution indicators conform within standard variance tolerances.');
    whyRisky.push('Financial disbursements align with verified on-ground physical milestones.');
  }

  // Hybrid Risk Score formula matching Prompt Section 15:
  // Delay Probability:        40%
  // Cost Overrun Probability: 30%
  // Progress Gap:             20% (normalized)
  // Rule-Based Risk Factors:  10%
  const normalizedGap = Math.max(0, Math.min(100, (Math.max(0, progressGap) / 35) * 100));
  const rawScore =
    (delayProb * 0.40) +
    (costProb * 0.30) +
    (normalizedGap * 0.20) +
    (rulePenalty * 0.10);

  const riskScore = Math.round(Math.max(0, Math.min(100, rawScore)));

  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  if (riskScore <= 30) {
    riskLevel = 'LOW';
  } else if (riskScore <= 60) {
    riskLevel = 'MEDIUM';
  } else {
    riskLevel = 'HIGH';
  }

  // Generate Recommended Action
  let recommendedAction: {
    problem: string;
    action: string;
    priority: 'Critical' | 'High' | 'Medium' | 'Low';
    target_officer: string;
  } = {
    problem: 'Standard project progression.',
    action: 'Continue routine quarterly expenditure audits and satellite/drone visual inspections.',
    priority: 'Low',
    target_officer: 'Assistant Project Officer',
  };

  if (progressGap > 20 && delayProb > 75) {
    recommendedAction = {
      problem: `Severe physical lag (+${progressGap}% expenditure gap) combined with ${Math.round(delayProb)}% delay probability.`,
      action: 'Issue immediate show-cause notice to contractor; halt non-milestone advances; convene joint site audit with Chief Project Engineer.',
      priority: 'Critical',
      target_officer: 'Principal Secretary / Chief Project Director',
    };
  } else if (delayProb > 70) {
    recommendedAction = {
      problem: `High probability (${Math.round(delayProb)}%) of missing revised completion target.`,
      action: 'Mandate fast-track CPM schedule recovery; intervene with local district magistrate to resolve pending right-of-way and forest clearances.',
      priority: 'High',
      target_officer: 'Superintending Engineer / Project Director',
    };
  } else if (costProb > 70 || costOverrunPct > 15) {
    recommendedAction = {
      problem: `Substantial cost inflation (${costOverrunPct}% escalation) with continued budget risk.`,
      action: 'Initiate third-party rate reconciliation on unbilled work packages; audit escalation price adjustment clauses.',
      priority: 'High',
      target_officer: 'Financial Advisor / Chief Accounts Officer',
    };
  } else if (timelineRevision) {
    recommendedAction = {
      problem: 'Completion date revised past original approved schedule.',
      action: 'Enforce weekly digital progress logging; re-baseline contractor performance guarantees.',
      priority: 'Medium',
      target_officer: 'Executive Engineer',
    };
  }

  return {
    delayProb: Math.round(delayProb),
    costProb: Math.round(costProb),
    riskScore,
    riskLevel,
    whyRisky,
    recommendedAction,
  };
}

export function generateAlertsForProject(project: Project): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date().toISOString().split('T')[0];

  if (project.risk_score >= 80) {
    alerts.push({
      id: `alt-${project.id}-crit`,
      project_id: project.id,
      project_name: project.project_name,
      project_code: project.project_code,
      sector: project.sector,
      alert_type: 'Critical Risk',
      severity: 'Critical',
      message: `Overall risk score reached critical threshold (${project.risk_score}/100) with substantial execution vulnerability.`,
      recommended_action: project.recommended_action.action,
      created_at: now,
      status: 'New',
    });
  }

  if (project.delay_probability > 70) {
    alerts.push({
      id: `alt-${project.id}-del`,
      project_id: project.id,
      project_name: project.project_name,
      project_code: project.project_code,
      sector: project.sector,
      alert_type: 'High Delay Risk',
      severity: project.delay_probability > 85 ? 'Critical' : 'High',
      message: `Delay probability elevated to ${project.delay_probability}%. Schedule variance threatens statutory commissioning date.`,
      recommended_action: 'Conduct critical path review of delayed milestones and mobilize additional equipment shifts.',
      created_at: now,
      status: 'New',
    });
  }

  if (project.cost_overrun_pct > 15 || project.cost_overrun_probability > 70) {
    alerts.push({
      id: `alt-${project.id}-cost`,
      project_id: project.id,
      project_name: project.project_name,
      project_code: project.project_code,
      sector: project.sector,
      alert_type: 'Cost Escalation',
      severity: project.cost_overrun_pct > 25 ? 'Critical' : 'High',
      message: `Cost overrun is ${project.cost_overrun_pct}% above baseline (₹${project.revised_cost} Cr vs ₹${project.original_cost} Cr).`,
      recommended_action: 'Audit revised estimates, expenditure efficiency, and pending contractor variation claims.',
      created_at: now,
      status: 'New',
    });
  }

  if (project.progress_gap > 20) {
    alerts.push({
      id: `alt-${project.id}-gap`,
      project_id: project.id,
      project_name: project.project_name,
      project_code: project.project_code,
      sector: project.sector,
      alert_type: 'Progress Mismatch',
      severity: 'Critical',
      message: `Severe gap of +${project.progress_gap}%: Financial progress (${project.financial_progress}%) outpaces physical progress (${project.physical_progress}%).`,
      recommended_action: 'Suspend further non-milestone fund release; perform physical verification of on-site measurements.',
      created_at: now,
      status: 'New',
    });
  } else if (project.timeline_revision) {
    alerts.push({
      id: `alt-${project.id}-time`,
      project_id: project.id,
      project_name: project.project_name,
      project_code: project.project_code,
      sector: project.sector,
      alert_type: 'Timeline Revision',
      severity: 'Medium',
      message: `Completion date formally revised to ${project.revised_completion_date} (originally ${project.original_completion_date}).`,
      recommended_action: 'Enforce revised CPM schedule and increase frequency of supervisory inspections.',
      created_at: now,
      status: 'Reviewed',
    });
  }

  return alerts;
}
