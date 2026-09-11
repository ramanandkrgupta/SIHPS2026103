import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  FileText,
  Download,
  ArrowRight,
  Database,
  Sparkles,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { uploadProjectData, commitProjectRecordsBatch, resetDummyData } from '../services/api';
import { ValidationResult } from '../types';

export type JobState =
  | 'IDLE'
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'ERROR';

export const DataUpload: React.FC = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [dataSource, setDataSource] = useState<string>('PAIMANA Public Dashboard');
  const [validating, setValidating] = useState<boolean>(false);
  const [jobState, setJobState] = useState<JobState>('IDLE');
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [processedRecords, setProcessedRecords] = useState<number>(0);
  const [importedCount, setImportedCount] = useState<number>(0);
  const [updatedCount, setUpdatedCount] = useState<number>(0);
  const [currentBatchIndex, setCurrentBatchIndex] = useState<number>(0);
  const [totalBatches, setTotalBatches] = useState<number>(0);
  const [batches, setBatches] = useState<any[][]>([]);
  const [failedBatchIndex, setFailedBatchIndex] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importId, setImportId] = useState<string>('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [previewPageSize, setPreviewPageSize] = useState<number>(10);
  const activeUploadIdRef = useRef<number>(0);

  const sampleCSVTemplate = `project_code,project_name,sector,ministry,implementing_agency,state,original_cost,revised_cost,expenditure,physical_progress,financial_progress,original_completion_date,revised_completion_date
NHAI-NH48-CORR,Six-Lane Highway Expansion (Surat-Mumbai NH-48),Highways,Ministry of Road Transport and Highways,NHAI,Gujarat,4200,5350,3900,45.0,72.8,2025-12-31,2027-03-31
IR-DEDICATED-EDFC,Eastern Dedicated Freight Corridor (Sonnagar-Dankuni),Railways,Ministry of Railways,DFCCIL,West Bengal,12500,16800,14100,62.0,83.9,2024-12-31,2026-11-30
DMRC-PH4-AEROCITY,Delhi Metro Phase 4 (Aerocity to Tughlakabad Line),Metro Rail,Ministry of Housing and Urban Affairs,DMRC,Delhi-NCR,9500,10200,6800,52.0,66.6,2026-06-30,2027-08-31
SECI-SOLAR-PARK,750 MW Pavagada Solar Grid Interconnection,Renewable Energy,Ministry of New and Renewable Energy,SECI,Karnataka,3100,3180,2950,88.0,92.7,2026-05-31,2026-07-31
JJM-WATER-GRID,Rural Piped Drinking Water Pipeline Mission (Phase 3),Urban Water & Sanitation,Ministry of Jal Shakti,National Jal Jeevan Mission,Rajasthan,1850,2300,1650,38.0,71.7,2025-09-30,2026-12-31`;

  const handleDownloadSample = () => {
    const blob = new Blob([sampleCSVTemplate], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'project_sentinel_sample_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetJobState = () => {
    setJobState('IDLE');
    setTotalRecords(0);
    setProcessedRecords(0);
    setImportedCount(0);
    setUpdatedCount(0);
    setCurrentBatchIndex(0);
    setTotalBatches(0);
    setBatches([]);
    setFailedBatchIndex(null);
    setErrorMessage(null);
    setImportId('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setValidationResult(null);
      setUploadError(null);
      setCommitError(null);
      resetJobState();
      setPreviewPage(1);
      // Automatically run validation preview
      validateFile(selected, dataSource);
    }
    // Clear input value so selecting the same file again triggers onChange
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      setFile(selected);
      setValidationResult(null);
      setUploadError(null);
      setCommitError(null);
      resetJobState();
      setPreviewPage(1);
      validateFile(selected, dataSource);
    }
  };

  const validateFile = async (targetFile: File, source: string) => {
    const uploadId = ++activeUploadIdRef.current;

    // Clear previous errors and set validating state immediately before upload starts
    setUploadError(null);
    setCommitError(null);
    setValidating(true);
    setPreviewPage(1);

    try {
      const res = await uploadProjectData({ file: targetFile }, false, source);

      // Race condition guard: ignore if a newer upload request was initiated
      if (uploadId !== activeUploadIdRef.current) {
        return;
      }

      if (res && res.validation && typeof res.validation.valid_rows === 'number') {
        // Explicitly clear any upload error upon successful response
        setUploadError(null);
        setCommitError(null);
        setValidationResult(res.validation);
      } else {
        throw new Error('Response is malformed and cannot be interpreted.');
      }
    } catch (err: any) {
      // Race condition guard: ignore stale error from an older request
      if (uploadId !== activeUploadIdRef.current) {
        return;
      }

      // Only show error when upload genuinely fails
      setUploadError(err.message || 'Failed to upload file');
      setValidationResult(null);
    } finally {
      if (uploadId === activeUploadIdRef.current) {
        setValidating(false);
      }
    }
  };

  const handleLoadSampleQuick = async () => {
    const uploadId = ++activeUploadIdRef.current;
    setFile(null);
    setValidationResult(null);
    setUploadError(null);
    setCommitError(null);
    resetJobState();
    setPreviewPage(1);
    setValidating(true);

    try {
      const res = await uploadProjectData({ csv_text: sampleCSVTemplate }, false, 'Official Data');
      if (uploadId !== activeUploadIdRef.current) return;

      if (res && res.validation && typeof res.validation.valid_rows === 'number') {
        setUploadError(null);
        setCommitError(null);
        setValidationResult(res.validation);
      } else {
        throw new Error('Response is malformed and cannot be interpreted.');
      }
    } catch (err: any) {
      if (uploadId !== activeUploadIdRef.current) return;
      setUploadError(err.message || 'Failed to load sample dataset');
      setValidationResult(null);
    } finally {
      if (uploadId === activeUploadIdRef.current) {
        setValidating(false);
      }
    }
  };

  const handleResetDummyData = async () => {
    if (!window.confirm("Are you sure you want to delete all demo dummy data?")) return;
    
    setUploadError(null);
    setCommitError(null);
    setValidating(true);
    
    try {
      await resetDummyData();
      alert("Dummy data reset successfully!");
      resetJobState();
      setValidationResult(null);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to reset dummy data');
    } finally {
      setValidating(false);
    }
  };

  const runBatchQueue = async (
    startIndex: number,
    chunksToRun: any[][],
    totalCount: number,
    idOfImport: string,
    initialImported: number,
    initialUpdated: number
  ) => {
    setJobState('PROCESSING');
    let curImported = initialImported;
    let curUpdated = initialUpdated;
    let curProcessed = 0;
    for (let i = 0; i < startIndex; i++) {
      curProcessed += chunksToRun[i]?.length ?? 0;
    }
    setProcessedRecords(curProcessed);

    for (let b = startIndex; b < chunksToRun.length; b++) {
      setCurrentBatchIndex(b);
      try {
        const res = await commitProjectRecordsBatch({
          records: chunksToRun[b],
          batchIndex: b,
          totalBatches: chunksToRun.length,
          importId: idOfImport,
          data_source: dataSource,
        });
        curImported += res.importedCount;
        curUpdated += res.updatedCount;
        curProcessed += res.processedCount;
        setImportedCount(curImported);
        setUpdatedCount(curUpdated);
        setProcessedRecords(curProcessed);
      } catch (err: any) {
        setFailedBatchIndex(b);
        setErrorMessage(err.message || `Batch ${b + 1} failed`);
        setJobState('ERROR');
        return;
      }
    }

    setJobState('COMPLETED');
    setFailedBatchIndex(null);
    setErrorMessage(null);
  };

  const handleConfirmImport = async () => {
    try {
      const validRowsToCommit = validationResult?.validRows;

      if (validRowsToCommit && validRowsToCommit.length > 0) {
        const BATCH_SIZE = 100;
        const totalRows = validRowsToCommit.length;
        const recordChunks: any[][] = [];
        for (let i = 0; i < totalRows; i += BATCH_SIZE) {
          recordChunks.push(validRowsToCommit.slice(i, i + BATCH_SIZE));
        }

        const newImportId = `imp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
        setImportId(newImportId);
        setBatches(recordChunks);
        setTotalRecords(totalRows);
        setTotalBatches(recordChunks.length);
        setProcessedRecords(0);
        setImportedCount(0);
        setUpdatedCount(0);
        setCurrentBatchIndex(0);
        setFailedBatchIndex(null);
        setErrorMessage(null);

        // Immediate transition to QUEUED
        setJobState('QUEUED');

        // Allow UI to render the "QUEUED" state, then start processing Batch 1
        setTimeout(() => {
          runBatchQueue(0, recordChunks, totalRows, newImportId, 0, 0);
        }, 150);
      } else {
        setJobState('PROCESSING');
        const res = await uploadProjectData(
          file ? { file } : { csv_text: sampleCSVTemplate },
          true,
          dataSource
        );
        setTotalRecords(res.totalRows || 0);
        setProcessedRecords(res.totalRows || 0);
        setImportedCount(res.import_stats?.imported_count || 0);
        setUpdatedCount(res.import_stats?.updated_count || 0);
        setJobState('COMPLETED');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to import projects to database');
      setJobState('ERROR');
    }
  };

  const handleRetryBatch = () => {
    if (failedBatchIndex === null || batches.length === 0) return;
    setErrorMessage(null);
    runBatchQueue(
      failedBatchIndex,
      batches,
      totalRecords,
      importId,
      importedCount,
      updatedCount
    );
  };

  return (
    <div id="data-upload-page" className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200">
              Data Ingestion & Integrity Engine
            </span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Data Upload & Ingestion Pipeline
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Ingest official PAIMANA/MoSPI spreadsheets with strict schema verification and automatic model recalibration
          </p>
        </div>

        <button
          onClick={handleDownloadSample}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Download CSV Template</span>
        </button>
      </div>

      {/* Success Confirmation Banner */}
      {jobState === 'COMPLETED' && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-emerald-600 p-2.5 text-white">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-emerald-950">
                ✓ Import complete — {processedRecords.toLocaleString()} records processed
              </h3>
              <div className="flex flex-wrap gap-4 text-xs font-semibold text-emerald-800">
                <span>New projects: <strong className="font-bold">{importedCount.toLocaleString()}</strong></span>
                <span>•</span>
                <span>Projects updated: <strong className="font-bold">{updatedCount.toLocaleString()}</strong></span>
                <span>•</span>
                <span>Total processed: <strong className="font-bold">{processedRecords.toLocaleString()}</strong></span>
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed">
                All records successfully committed to Supabase. Machine learning models recalibrated, risk predictions updated, and early warning alerts refreshed.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition-colors"
                >
                  <span>View Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => navigate('/projects')}
                  className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
                >
                  View Projects
                </button>
                <button
                  onClick={() => navigate('/alerts')}
                  className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
                >
                  View Alerts
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload & Configuration Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-6">
        {/* Step 1: Metadata & Data Source Selection */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Step 1: Provenance Tagging
            </span>
            <h2 className="text-sm font-bold text-slate-900">Select Project Data Source</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {['PAIMANA Public Dashboard', 'Official Data', 'Imported Data', 'Demo Data'].map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => setDataSource(src)}
                className={`rounded-xl px-3.5 py-1.5 font-bold transition-all border ${
                  dataSource === src
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {src}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: File Dropzone */}
        <div>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-8 text-center transition-all hover:border-blue-500 hover:bg-blue-50/20"
          >
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-600 mb-3">
              <UploadCloud className="h-8 w-8" />
            </div>

            <h3 className="text-sm font-bold text-slate-900">
              Drag & Drop your infrastructure CSV or XLSX spreadsheet here
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              Supports MoSPI monitoring formats, NHAI project sheets, and custom ministry records
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <label className="cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors">
                <span>Browse Files</span>
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileChange}
                  onClick={(e) => {
                    (e.target as HTMLInputElement).value = '';
                  }}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleLoadSampleQuick}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Load Pre-Configured MoSPI Benchmark (5 Projects)
              </button>
              
              <button
                type="button"
                onClick={handleResetDummyData}
                className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
              >
                Reset / Delete Demo Data
              </button>
            </div>

            {file && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">
                <FileSpreadsheet className="h-4 w-4" />
                <span>Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}
          </div>
        </div>

        {/* Upload error notification - only shown when upload genuinely failed and no valid validation result */}
        {uploadError && !validationResult && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800 flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      {/* Step 3 & 4: Validation Engine & Preview Table */}
      {validating ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center shadow-xs">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-600 mb-3" />
          <p className="text-sm font-bold text-slate-800">
            Running 6-Point Data Quality & Integrity Checks...
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Checking missing columns, date formats, negative cost values, and physical progress bounds (&lt;=100%)
          </p>
        </div>
      ) : validationResult ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-md px-2.5 py-0.5 text-xs font-bold ${
                    validationResult.valid
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {validationResult.valid ? '✓ Schema Verification Passed' : '⚠ Validation Warnings Found'}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-1">
                Data Ingestion Preview ({validationResult.valid_rows} Valid Rows of {validationResult.total_rows})
              </h2>
            </div>

            <button
              onClick={handleConfirmImport}
              disabled={jobState === 'QUEUED' || jobState === 'PROCESSING' || validationResult.valid_rows === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 transition-all disabled:opacity-50"
            >
              {jobState === 'QUEUED' || jobState === 'PROCESSING' ? (
                <RefreshCw className="h-4 w-4 animate-spin text-white" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              <span>
                {jobState === 'QUEUED'
                  ? 'Queueing Records...'
                  : jobState === 'PROCESSING'
                  ? `Importing... (${totalRecords > 0 ? Math.round((processedRecords / totalRecords) * 100) : 0}%)`
                  : jobState === 'COMPLETED'
                  ? '✓ Ingestion Complete'
                  : 'Confirm & Commit to Database'}
              </span>
            </button>
          </div>

          {/* QUEUED State Banner */}
          {jobState === 'QUEUED' && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/90 p-4 space-y-1.5 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-950">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                <span>Import started — {totalRecords.toLocaleString()} records queued</span>
              </div>
              <p className="text-[11px] text-blue-700 font-medium">
                Slicing dataset into {totalBatches} sequential batches (100 records each). Initializing Batch 1...
              </p>
            </div>
          )}

          {/* PROCESSING State Progress Bar */}
          {jobState === 'PROCESSING' && (() => {
            const pct = totalRecords > 0 ? Math.round((processedRecords / totalRecords) * 100) : 0;
            return (
              <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-4 space-y-2.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs font-bold text-blue-950">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                    <span>Importing PAIMANA Data</span>
                  </span>
                  <span className="font-mono text-blue-800 text-sm font-extrabold">{pct}%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-blue-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-blue-700 font-medium">
                  <span className="font-mono font-semibold">
                    {processedRecords.toLocaleString()} / {totalRecords.toLocaleString()} records
                  </span>
                  <span className="font-bold">
                    Batch {currentBatchIndex + 1} of {totalBatches}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* ERROR State / Resume Retry UI */}
          {jobState === 'ERROR' && (() => {
            const failedBatchNum = (failedBatchIndex ?? 0) + 1;
            const remainingRecords = Math.max(0, totalRecords - processedRecords);
            return (
              <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-start gap-3">
                  <AlertOctagon className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-rose-950">
                      Batch {failedBatchNum} of {totalBatches} failed. {remainingRecords.toLocaleString()} records remain.
                    </h4>
                    <p className="text-xs text-rose-700">
                      {errorMessage || 'A network or server error occurred while processing this batch.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleRetryBatch}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-800 transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Retry Batch {failedBatchNum}</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Validation Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Records</span>
              <p className="text-lg font-extrabold text-slate-900 mt-0.5">{validationResult.total_rows.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Valid Rows</span>
              <p className="text-lg font-extrabold text-emerald-800 mt-0.5">{validationResult.valid_rows.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Invalid Rows</span>
              <p className="text-lg font-extrabold text-rose-800 mt-0.5">{validationResult.invalid_rows.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Total Exceptions</span>
              <p className="text-lg font-extrabold text-blue-800 mt-0.5">{validationResult.errors.length.toLocaleString()}</p>
            </div>
          </div>

          {/* Missing Optional Fields Summary */}
          {validationResult.missing_optional_fields && Object.keys(validationResult.missing_optional_fields).length > 0 && (
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                Legitimate Optional Fields Summary (Handled as Null / Unrevised):
              </span>
              <div className="flex flex-wrap gap-2 pt-0.5">
                {Object.entries(validationResult.missing_optional_fields).map(([field, count]) => (
                  <span
                    key={field}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700"
                  >
                    <span className="font-bold text-slate-900">{field}:</span>
                    <span>{count.toLocaleString()} unset/empty</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Validation Errors List if any */}
          {validationResult.errors.length > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block mb-2">
                Row-Level Validation Exceptions ({validationResult.errors.length}):
              </span>
              <ul className="space-y-1 text-xs text-rose-700 max-h-48 overflow-y-auto pr-2">
                {validationResult.errors.slice(0, 15).map((e, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="font-bold shrink-0">Row {e.row}:</span>
                    <span>
                      [Column: <strong className="font-mono">{e.column || e.field}</strong>] — {e.message}
                      {e.value !== undefined && e.value !== null && e.value !== '' ? ` (value: "${e.value}")` : ''}
                    </span>
                  </li>
                ))}
                {validationResult.errors.length > 15 && (
                  <li className="text-slate-500 font-medium italic pt-1">
                    ...and {validationResult.errors.length - 15} more validation exceptions
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Step 4: Preview Table with Pagination & Full-Dataset Ingestion Guarantee */}
          {(() => {
            const totalPreviewRows = validationResult.preview ? validationResult.preview.length : 0;
            const totalPages = Math.ceil(totalPreviewRows / previewPageSize) || 1;
            const currentPage = Math.min(Math.max(1, previewPage), totalPages);
            const startIndex = (currentPage - 1) * previewPageSize;
            const endIndex = Math.min(startIndex + previewPageSize, totalPreviewRows);
            const currentRows = validationResult.preview.slice(startIndex, endIndex);

            return (
              <div className="space-y-3">
                {/* Pagination bar & Explanation Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900">
                      Showing {totalPreviewRows > 0 ? startIndex + 1 : 0}–{endIndex} of {validationResult.total_rows.toLocaleString()} records
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-500">
                      Preview sample: {totalPreviewRows} rows
                    </span>
                    <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200">
                      All {validationResult.valid_rows.toLocaleString()} Valid Records Queued for Ingestion
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className="text-slate-500 font-medium">Rows per page:</span>
                    <select
                      value={previewPageSize}
                      onChange={(e) => {
                        setPreviewPageSize(Number(e.target.value));
                        setPreviewPage(1);
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs focus:border-blue-500 focus:outline-none"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Project Code</th>
                        <th className="py-2.5 px-3">Project Name</th>
                        <th className="py-2.5 px-3">Sector</th>
                        <th className="py-2.5 px-3">Agency</th>
                        <th className="py-2.5 px-3 text-right">Original Cost</th>
                        <th className="py-2.5 px-3 text-right">Revised Cost</th>
                        <th className="py-2.5 px-3 text-right">Phys %</th>
                        <th className="py-2.5 px-3 text-right">Target Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentRows.map((row, i) => (
                        <tr key={startIndex + i} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3">
                            <span
                              className={`rounded-sm px-2 py-0.5 text-[10px] font-bold ${
                                row.status === 'VALID'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {row.project_code}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800 max-w-xs truncate" title={row.project_name}>
                            {row.project_name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{row.sector}</td>
                          <td className="py-2.5 px-3 text-slate-600 max-w-[150px] truncate" title={row.implementing_agency || '—'}>
                            {row.implementing_agency || '—'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-right font-medium">
                            {row.original_cost != null && !isNaN(row.original_cost) ? `₹${row.original_cost} Cr` : '—'}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-right">
                            {row.revised_cost != null && !isNaN(row.revised_cost) ? `₹${row.revised_cost} Cr` : <span className="text-slate-400 font-normal">Unrevised</span>}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-emerald-700 text-right">
                            {row.physical_progress != null && !isNaN(row.physical_progress) ? `${row.physical_progress}%` : '—'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 text-right whitespace-nowrap">
                            {row.revised_completion_date || row.original_completion_date || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs text-slate-500">
                  <span>
                    Page {currentPage} of {totalPages} &bull; Showing {currentRows.length} rows (out of {validationResult.valid_rows.toLocaleString()} total valid projects ready for database commit)
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Previous</span>
                    </button>

                    <div className="flex items-center gap-1 font-mono font-semibold text-slate-700">
                      <span>{currentPage}</span>
                      <span>/</span>
                      <span>{totalPages}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPreviewPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <span>Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      ) : null}
    </div>
  );
};
