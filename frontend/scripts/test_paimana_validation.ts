import { parseCSVData, validateProjectRecords } from '../server/engine/dataValidation';
import { SentinelDatabase } from '../server/database/db';
import { calculateFeatures } from '../server/engine/featureEngineering';
import { runMLPredictions } from '../server/engine/mlEngine';
import { calculate_risk_score } from '../server/engine/riskEngine';

console.log('===============================================================');
console.log('PROJECT SENTINEL - PAIMANA CSV VALIDATION & INGESTION SUITE');
console.log('===============================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${testName}`);
  } else {
    console.error(`[FAIL] ${testName} ${detail ? '--> ' + detail : ''}`);
  }
}

// 1. Test A, B, C: Normal Row, Currency, Commas (properly CSV-quoted for embedded commas)
const csvAtoC = `ProjectId,Project Name,Sector Name,Original Cost,Revised Cost,Cumulative Expenditure (Cr),Physical Progress (%),Target Date,Line Ministry,States/ UTs,Date of Approval
PRJ-A,Highway Expansion A,Highways,"1,450.50","1,600.00","800.00",45.5,2026-12-31,Ministry of Road Transport and Highways,Maharashtra,2023-01-15
PRJ-B,Metro Corridor B,Metro Rail,"₹1,450.50","₹1,800.00","₹950.25",60.0,2027-03-31,Ministry of Housing and Urban Affairs,Delhi,2022-06-10
PRJ-C,Rail Line C,Railways,"Rs. 1,450.50","Rs. 1,500.00","Rs. 500.00",30.0,2026-09-30,Ministry of Railways,Karnataka,2023-05-20
`;

const rowsAtoC = parseCSVData(csvAtoC);
const resAtoC = validateProjectRecords(rowsAtoC);

assert(resAtoC.valid === true, 'Test A/B/C: Valid rows parse with commas and currencies', JSON.stringify(resAtoC.errors));
assert(resAtoC.valid_rows === 3, 'Test A/B/C: Exactly 3 valid rows');
assert(resAtoC.validRows?.[0].original_cost === 1450.5, 'Test A: Normal row with comma parsed to 1450.5');
assert(resAtoC.validRows?.[1].original_cost === 1450.5, 'Test B: Currency symbol ₹ parsed to 1450.5');
assert(resAtoC.validRows?.[2].original_cost === 1450.5, 'Test C: Currency symbol Rs. parsed to 1450.5');

// 2. Test D: Blank revised cost
const csvD = `project_code,project_name,sector,original_cost,revised_cost,physical_progress,original_target_doc,cumulative_expenditure_crore
PRJ-D,Solar Park D,Renewable Energy,2500,"",55.0,2026-10-31,1200
`;
const rowsD = parseCSVData(csvD);
const resD = validateProjectRecords(rowsD);

assert(resD.valid === true, 'Test D: Blank revised cost does NOT produce positive value error', JSON.stringify(resD.errors));
assert(resD.validRows?.[0].revised_cost === null, 'Test D: Blank revised cost remains null (unrevised)');
assert(resD.missing_optional_fields?.revised_cost === 1, 'Test D: Tracked in missing_optional_fields.revised_cost');

// 3. Test E: Blank date
const csvE = `project_code,project_name,sector,original_cost,revised_cost,physical_progress,original_target_doc,revised_doc
PRJ-E,Port Expansion E,Ports,4000,4200,40.0,2026-12-31,""
`;
const rowsE = parseCSVData(csvE);
const resE = validateProjectRecords(rowsE);

assert(resE.valid === true, 'Test E: Blank date does NOT produce error', JSON.stringify(resE.errors));
assert(resE.validRows?.[0].revised_completion_date === null, 'Test E: Blank date remains null');
assert(resE.missing_optional_fields?.revised_completion_date === 1, 'Test E: Tracked in missing_optional_fields.revised_completion_date');

// 4. Test F: Indian date format (DD/MM/YYYY and DD-MM-YYYY)
const csvF = `project_code,project_name,sector,original_cost,original_target_doc,date_of_approval
PRJ-F1,Bridge Project F1,Highways,850,15/08/2026,10/01/2023
PRJ-F2,Water Supply F2,Water,650,31-12-2026,05-06-2022
`;
const rowsF = parseCSVData(csvF);
const resF = validateProjectRecords(rowsF);

assert(resF.valid === true, 'Test F: Indian date format DD/MM/YYYY and DD-MM-YYYY supported', JSON.stringify(resF.errors));
assert(resF.validRows?.[0].original_completion_date === '2026-08-15', 'Test F: 15/08/2026 parsed to 2026-08-15');
assert(resF.validRows?.[1].original_completion_date === '2026-12-31', 'Test F: 31-12-2026 parsed to 2026-12-31');

// 5. Test G: Negative cost
const csvG = `project_code,project_name,sector,original_cost
PRJ-G,Invalid Negative Cost,Highways,-1450
`;
const rowsG = parseCSVData(csvG);
const resG = validateProjectRecords(rowsG);

assert(resG.valid === false, 'Test G: Negative cost rejected');
assert(resG.errors.length > 0 && resG.errors[0].row === 2, 'Test G: Exact row identified (Row 2)');
assert(resG.errors[0].column === 'original_cost' || resG.errors[0].field === 'original_cost', 'Test G: Exact column identified');
assert(resG.errors[0].message.toLowerCase().includes('positive'), 'Test G: Reports positive requirement: ' + resG.errors[0].message);

// 6. Test H: Invalid number
const csvH = `project_code,project_name,sector,original_cost
PRJ-H,Invalid Number String,Highways,ABC
`;
const rowsH = parseCSVData(csvH);
const resH = validateProjectRecords(rowsH);

assert(resH.valid === false, 'Test H: Non-numeric cost rejected');
assert(resH.errors.length > 0 && resH.errors[0].row === 2, 'Test H: Exact row identified (Row 2)');
assert(resH.errors[0].message.toLowerCase().includes('not a valid number'), 'Test H: Reports invalid number: ' + resH.errors[0].message);

// 7. Test I: Invalid progress
const csvI = `project_code,project_name,sector,original_cost,physical_progress
PRJ-I,Invalid Progress,Highways,1000,145
`;
const rowsI = parseCSVData(csvI);
const resI = validateProjectRecords(rowsI);

assert(resI.valid === false, 'Test I: Progress > 100 rejected');
assert(resI.errors.length > 0 && resI.errors[0].row === 2, 'Test I: Exact row identified (Row 2)');
assert(resI.errors[0].message.includes('100'), 'Test I: Reports 0-100 requirement: ' + resI.errors[0].message);

// 8. Test J: Deduplication Test (Upload 25 projects, upload again -> 25 projects)
async function testDeduplicationAndSnapshots() {
  console.log('\n--- Running Deduplication & Historical Snapshot Tests ---');
  const db = new SentinelDatabase();

  const initialProjects = await db.getAllProjects();
  const initialPaimanaCount = initialProjects.filter(p => p.data_source === 'PAIMANA Public Dashboard').length;
  console.log(`Initial DB State: ${initialProjects.length} total projects, ${initialPaimanaCount} PAIMANA projects.`);

  // Create 25 sample projects with unique timestamp suffix to isolate run
  const runId = Math.random().toString(36).substring(2, 6).toUpperCase();
  const sample25Rows = [];
  for (let i = 1; i <= 25; i++) {
    sample25Rows.push({
      project_code: `PAIMANA-${runId}-${1000 + i}`,
      project_name: `Government Infrastructure Project ${i}`,
      sector: i % 2 === 0 ? 'Highways' : 'Railways',
      ministry: 'Ministry of Infrastructure',
      implementing_agency: 'National Authority',
      state: 'Maharashtra',
      original_cost: 1000 + i * 50,
      revised_cost: i % 3 === 0 ? 1100 + i * 50 : null, // some unrevised
      expenditure: 500 + i * 20,
      physical_progress: 40 + (i % 50),
      original_completion_date: '2026-12-31',
      revised_completion_date: i % 3 === 0 ? '2027-06-30' : null,
      data_source: 'PAIMANA Public Dashboard',
    });
  }

  const firstImport = await db.importRecords(sample25Rows as any);
  assert(firstImport.imported_count === 25, 'Test J: First upload imports 25 new projects');
  assert(firstImport.updated_count === 0, 'Test J: First upload has 0 updates');

  const allProjectsAfter1 = await db.getAllProjects();
  const paimanaCount1 = allProjectsAfter1.filter(p => p.project_code.startsWith(`PAIMANA-${runId}`)).length;
  assert(paimanaCount1 === 25, `Test J: Exactly 25 PAIMANA projects exist in run ${runId}`);

  // Upload same 25 rows again
  const secondImport = await db.importRecords(sample25Rows as any);
  assert(secondImport.imported_count === 0, 'Test J: Second upload imports 0 new projects');
  assert(secondImport.updated_count === 25, 'Test J: Second upload updates 25 existing projects');
  assert(secondImport.duplicates === 25, 'Test J: Second upload identifies 25 duplicates');

  const allProjectsAfter2 = await db.getAllProjects();
  const paimanaCount2 = allProjectsAfter2.filter(p => p.project_code.startsWith(`PAIMANA-${runId}`)).length;
  assert(paimanaCount2 === 25, `Test J: Project count remains exactly 25 (NOT 50!) after duplicate upload`);

  // 9. Historical Snapshot Test (Project 706718 with 4 observations)
  console.log('\n--- Running Historical Snapshot Test ---');
  const snapCode = `706718-${runId}`;
  const projectSnapshots = [
    {
      project_code: snapCode,
      project_name: 'Four-Laning of NH Section 706718',
      sector: 'Highways',
      original_cost: 3200,
      revised_cost: null,
      expenditure: 800,
      physical_progress: 25,
      update_date: '2025-07',
      original_completion_date: '2026-12-31',
      data_source: 'PAIMANA Public Dashboard',
    },
    {
      project_code: snapCode,
      project_name: 'Four-Laning of NH Section 706718',
      sector: 'Highways',
      original_cost: 3200,
      revised_cost: 3400,
      expenditure: 1400,
      physical_progress: 42,
      update_date: '2025-12',
      original_completion_date: '2026-12-31',
      data_source: 'PAIMANA Public Dashboard',
    },
    {
      project_code: snapCode,
      project_name: 'Four-Laning of NH Section 706718',
      sector: 'Highways',
      original_cost: 3200,
      revised_cost: 3600,
      expenditure: 2100,
      physical_progress: 58,
      update_date: '2026-03',
      original_completion_date: '2026-12-31',
      data_source: 'PAIMANA Public Dashboard',
    },
    {
      project_code: snapCode,
      project_name: 'Four-Laning of NH Section 706718',
      sector: 'Highways',
      original_cost: 3200,
      revised_cost: 3850,
      expenditure: 2900,
      physical_progress: 72,
      update_date: '2026-07',
      original_completion_date: '2026-12-31',
      data_source: 'PAIMANA Public Dashboard',
    },
  ];

  await db.importRecords(projectSnapshots as any);
  const project706718Detail = await db.getProjectByCode(snapCode);
  assert(project706718Detail !== null, 'Test K: Project 706718 exists');
  assert(project706718Detail?.history.length === 4, `Test K: Project 706718 has exactly 4 historical snapshots (got ${project706718Detail?.history.length})`);

  // 10. ML Compatibility Test
  console.log('\n--- Running ML Compatibility Test ---');
  const proj = project706718Detail!.project;
  const latestMon = project706718Detail!.history[project706718Detail!.history.length - 1];
  const features = calculateFeatures(latestMon);

  assert(!isNaN(features.cost_overrun_pct) && isFinite(features.cost_overrun_pct), 'Test L: cost_overrun_pct is valid finite number');
  assert(!isNaN(features.financial_progress) && isFinite(features.financial_progress), 'Test L: financial_progress is valid finite number');
  assert(!isNaN(features.progress_gap) && isFinite(features.progress_gap), 'Test L: progress_gap is valid finite number');
  assert(!isNaN(features.timeline_revision_months) && isFinite(features.timeline_revision_months), 'Test L: timeline_revision_months is valid finite number');

  const mlPreds = runMLPredictions(latestMon, features, proj.sector);
  assert(mlPreds.delay_probability >= 0 && mlPreds.delay_probability <= 100, 'Test L: delay_probability between 0-100');
  assert(mlPreds.cost_overrun_probability >= 0 && mlPreds.cost_overrun_probability <= 100, 'Test L: cost_overrun_probability between 0-100');

  const riskScoreRes = calculate_risk_score(proj, latestMon, features);
  assert(riskScoreRes.prediction.risk_score >= 0 && riskScoreRes.prediction.risk_score <= 100, 'Test L: risk_score between 0-100');
  assert(['LOW', 'MEDIUM', 'HIGH'].includes(riskScoreRes.prediction.risk_level), 'Test L: risk_level is LOW/MEDIUM/HIGH');
  assert(riskScoreRes.prediction.feature_contributions.length > 0, 'Test L: SHAP feature contributions generated');

  console.log('\n===============================================================');
  console.log(`TEST RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('===============================================================');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

testDeduplicationAndSnapshots().catch((err) => {
  console.error('Fatal error in test suite:', err);
  process.exit(1);
});
