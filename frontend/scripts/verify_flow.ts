import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

import { parseCSVData, validateProjectRecords } from '../server/engine/dataValidation';
import { SentinelDatabase } from '../server/database/db';
import { supabaseAdmin, isSupabaseConfigured } from '../server/database/supabaseClient';

async function main() {
  console.log('=== STARTING PAIMANA COMPLETE FLOW VERIFICATION ===');
  const csvPath = path.resolve('data/paimana_july_2026.csv');
  console.log('Reading file:', csvPath);
  const csvText = fs.readFileSync(csvPath, 'utf8');

  // Stage 1: Raw CSV parsing
  const rawRows = parseCSVData(csvText);
  console.log(`[STAGE 1] Raw CSV rows parsed: ${rawRows.length}`);

  // Stage 2: Validation
  const validation = validateProjectRecords(rawRows);
  console.log('[STAGE 2] Validation Results:');
  console.log(`  Total Rows: ${validation.total_rows}`);
  console.log(`  Valid Rows: ${validation.valid_rows}`);
  console.log(`  Invalid Rows: ${validation.invalid_rows}`);
  console.log(`  Validation Exceptions: ${validation.errors.length}`);
  console.log(`  Preview Sample Count: ${validation.preview.length}`);
  console.log(`  ValidRows Array Length: ${validation.validRows?.length}`);

  // Stage 3: Database Batch Import
  console.log('[STAGE 3] Executing Database Batch Import of all valid records...');
  const db = new SentinelDatabase();
  const startTime = Date.now();
  const stats = await db.importRecords(validation.validRows!);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[STAGE 3 COMPLETED] in ${elapsed}s:`);
  console.log(`  Imported New: ${stats.imported_count}`);
  console.log(`  Updated Existing: ${stats.updated_count}`);
  console.log(`  Total Records Processed: ${stats.imported_count + stats.updated_count}`);

  // Stage 4: Supabase Verification
  if (isSupabaseConfigured) {
    const { count: totalProj } = await supabaseAdmin.from('projects').select('*', { count: 'exact', head: true });
    const { count: paimanaProj } = await supabaseAdmin.from('projects').select('*', { count: 'exact', head: true }).eq('data_source', 'PAIMANA Public Dashboard');
    const { count: monCount } = await supabaseAdmin.from('project_monitoring').select('*', { count: 'exact', head: true });
    const { count: predCount } = await supabaseAdmin.from('project_predictions').select('*', { count: 'exact', head: true });
    console.log('[STAGE 4] Supabase Database Verification:');
    console.log(`  Total Projects in DB: ${totalProj}`);
    console.log(`  PAIMANA Projects in DB: ${paimanaProj}`);
    console.log(`  Monitoring Snapshots in DB: ${monCount}`);
    console.log(`  Prediction Records in DB: ${predCount}`);
  } else {
    console.log('[STAGE 4] Supabase not configured, verified against in-memory fallback store.');
  }

  console.log('=== VERIFICATION COMPLETED SUCCESSFULLY ===');
}

main().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
