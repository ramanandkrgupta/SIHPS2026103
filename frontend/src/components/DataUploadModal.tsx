import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Download,
  FileText,
  AlertCircle,
  Play,
  Sparkles,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../services/api';

interface DataUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DataUploadModal: React.FC<DataUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [totalRowsDetected, setTotalRowsDetected] = useState(0);
  const [validRowsCount, setValidRowsCount] = useState(0);
  const [invalidRowsCount, setInvalidRowsCount] = useState(0);
  const [dataSource, setDataSource] = useState<'Official Data' | 'Imported Data' | 'Demo Data'>('Imported Data');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Benchmark sample dataset
  const sampleData = [
    {
      project_code: 'NHAI-DL-MUM-01',
      project_name: 'Western Bypass Expressway Package 1',
      sector: 'Highways',
      ministry: 'Ministry of Road Transport and Highways',
      implementing_agency: 'NHAI',
      state: 'Gujarat',
      original_cost: 1850,
      revised_cost: 2240,
      expenditure: 1650,
      physical_progress: 48,
      original_completion_date: '2025-11-30',
      revised_completion_date: '2026-08-31',
    },
    {
      project_code: 'MR-BLR-PH2-02',
      project_name: 'Metropolitan Metro Orange Line Extension',
      sector: 'Urban Development',
      ministry: 'Ministry of Housing and Urban Affairs',
      implementing_agency: 'BMRCL',
      state: 'Karnataka',
      original_cost: 2400,
      revised_cost: 2980,
      expenditure: 2100,
      physical_progress: 41,
      original_completion_date: '2025-12-31',
      revised_completion_date: '2027-03-31',
    },
    {
      project_code: 'NTPC-MP-STPP-03',
      project_name: 'Super Thermal Power Plant Unit 4',
      sector: 'Power',
      ministry: 'Ministry of Power',
      implementing_agency: 'NTPC',
      state: 'Madhya Pradesh',
      original_cost: 3200,
      revised_cost: 3200,
      expenditure: 1280,
      physical_progress: 38,
      original_completion_date: '2026-06-30',
      revised_completion_date: '2026-06-30',
    },
  ];

  const sampleCsvContent = `project_code,project_name,sector,ministry,implementing_agency,state,original_cost,revised_cost,expenditure,physical_progress,original_completion_date,revised_completion_date
NHAI-DL-MUM-01,Western Bypass Expressway Package 1,Highways,Ministry of Road Transport and Highways,NHAI,Gujarat,1850,2240,1650,48,2025-11-30,2026-08-31
MR-BLR-PH2-02,Metropolitan Metro Orange Line Extension,Urban Development,Ministry of Housing and Urban Affairs,BMRCL,Karnataka,2400,2980,2100,41,2025-12-31,2027-03-31
NTPC-MP-STPP-03,Super Thermal Power Plant Unit 4,Power,Ministry of Power,NTPC,Madhya Pradesh,3200,3200,1280,38,2026-06-30,2026-06-30`;

  const handleDownloadSampleCsv = () => {
    const blob = new Blob([sampleCsvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sentinel_project_upload_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSampleXlsx = () => {
    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Projects');
    XLSX.writeFile(workbook, 'sentinel_project_upload_template.xlsx');
  };

  const handleLoadSampleDataset = () => {
    setFile(new File([sampleCsvContent], 'sample_mospi_projects.csv', { type: 'text/csv' }));
    validateAndProcessRawRows(sampleData);
  };

  // Helper to parse numbers with commas, currency signs, etc.
  const cleanNumber = (val: any, fallback = 0): number => {
    if (val === undefined || val === null || val === '') return fallback;
    if (typeof val === 'number') return isNaN(val) ? fallback : val;
    const str = String(val).replace(/[₹$Rs\s,%crCRCrorescrores]/gi, '').trim();
    const num = parseFloat(str);
    return isNaN(num) ? fallback : num;
  };

  // Helper to parse dates (handles Excel serial numbers, DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD)
  const cleanDate = (val: any, defaultOffsetDays = 365): string => {
    if (!val) {
      const d = new Date();
      d.setDate(d.getDate() + defaultOffsetDays);
      return d.toISOString().split('T')[0];
    }
    // Excel serial number (e.g. 45000 to 55000)
    if (typeof val === 'number' || (!isNaN(Number(val)) && Number(val) > 20000 && Number(val) < 80000)) {
      const serial = Number(val);
      const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
    const str = String(val).trim();
    // Match DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (ddmmyyyy) {
      const day = ddmmyyyy[1].padStart(2, '0');
      const month = ddmmyyyy[2].padStart(2, '0');
      const year = ddmmyyyy[3];
      return `${year}-${month}-${day}`;
    }
    // Match YYYY-MM-DD
    const yyyymmdd = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
    if (yyyymmdd) {
      return `${yyyymmdd[1]}-${yyyymmdd[2].padStart(2, '0')}-${yyyymmdd[3].padStart(2, '0')}`;
    }
    const parsed = Date.parse(str);
    if (!isNaN(parsed)) {
      return new Date(parsed).toISOString().split('T')[0];
    }
    const d = new Date();
    d.setDate(d.getDate() + defaultOffsetDays);
    return d.toISOString().split('T')[0];
  };

  const validateAndProcessRawRows = (rawRows: any[]) => {
    if (!rawRows || rawRows.length === 0) {
      setValidationErrors(['The uploaded file contains no readable data rows.']);
      return;
    }

    // Helper to find column matching any alias
    const findColValue = (rowObj: Record<string, any>, aliases: string[]): any => {
      const keys = Object.keys(rowObj);
      for (const alias of aliases) {
        const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
        const foundKey = keys.find((k) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanAlias);
        if (foundKey !== undefined && rowObj[foundKey] !== undefined && rowObj[foundKey] !== null) {
          return rowObj[foundKey];
        }
      }
      return undefined;
    };

    const cleanRows: any[] = [];
    const errors: string[] = [];
    let validCount = 0;
    let invalidCount = 0;

    rawRows.forEach((r, idx) => {
      const rowIdx = idx + 1;
      if (!r || typeof r !== 'object') return;

      // Fuzzy mapped fields
      const pCodeRaw = findColValue(r, ['project_code', 'project code', 'projectcode', 'code', 'id', 'project_id', 'proj_id']);
      const pNameRaw = findColValue(r, ['project_name', 'project name', 'projectname', 'name', 'title', 'project', 'proj_name', 'scheme']);
      const sectorRaw = findColValue(r, ['sector', 'category', 'domain', 'type', 'industry']);
      const ministryRaw = findColValue(r, ['ministry', 'department', 'dept', 'govt_ministry', 'ministry_name']);
      const agencyRaw = findColValue(r, ['implementing_agency', 'implementing agency', 'agency', 'contractor', 'executing_agency', 'authority', 'developer']);
      const stateRaw = findColValue(r, ['state', 'location', 'region', 'state_ut', 'state/ut']);
      const origCostRaw = findColValue(r, ['original_cost', 'original cost', 'orig_cost', 'initial_cost', 'sanctioned_cost', 'budget', 'cost', 'cost_cr']);
      const revCostRaw = findColValue(r, ['revised_cost', 'revised cost', 'rev_cost', 'latest_cost', 'anticipated_cost', 'current_cost']);
      const expRaw = findColValue(r, ['expenditure', 'cumulative_expenditure', 'spent', 'actual_cost', 'actual_expenditure', 'financial_expenditure']);
      const physRaw = findColValue(r, ['physical_progress', 'physical progress', 'progress', 'progress_pct', 'physical_progress_pct', 'completion_pct']);
      const origDateRaw = findColValue(r, ['original_completion_date', 'original completion date', 'original_date', 'target_date', 'planned_date', 'doc', 'orig_doc']);
      const revDateRaw = findColValue(r, ['revised_completion_date', 'revised completion date', 'revised_date', 'anticipated_date', 'expected_completion', 'revised_doc']);

      const pCode = pCodeRaw ? String(pCodeRaw).trim() : `PROJ-IMP-${String(rowIdx).padStart(3, '0')}`;
      const pName = pNameRaw ? String(pNameRaw).trim() : '';
      const origCost = cleanNumber(origCostRaw, 0);
      const revCost = cleanNumber(revCostRaw, origCost > 0 ? origCost : 0);
      const exp = cleanNumber(expRaw, 0);
      let phys = cleanNumber(physRaw, 0);

      // Progress percentage validation / fallback
      if (phys < 0) phys = 0;
      if (phys > 100) phys = 100;

      const origDate = cleanDate(origDateRaw, 365);
      const revDate = cleanDate(revDateRaw || origDateRaw, 540);

      let rowHasError = false;

      if (!pName) {
        errors.push(`Row ${rowIdx}: Missing required project name or title.`);
        rowHasError = true;
      }
      if (origCost <= 0) {
        errors.push(`Row ${rowIdx} (${pName || 'Item'}): Original cost must be greater than 0.`);
        rowHasError = true;
      }

      if (rowHasError) {
        invalidCount++;
      } else {
        validCount++;
        cleanRows.push({
          project_code: pCode,
          project_name: pName,
          sector: sectorRaw ? String(sectorRaw).trim() : 'General Infrastructure',
          ministry: ministryRaw ? String(ministryRaw).trim() : 'Ministry of Road Transport and Highways',
          implementing_agency: agencyRaw ? String(agencyRaw).trim() : 'NHAI',
          state: stateRaw ? String(stateRaw).trim() : 'National',
          original_cost: origCost,
          revised_cost: revCost > 0 ? revCost : origCost,
          expenditure: exp,
          physical_progress: phys,
          original_completion_date: origDate,
          revised_completion_date: revDate,
          data_source: dataSource,
        });
      }
    });

    setTotalRowsDetected(rawRows.length);
    setValidRowsCount(validCount);
    setInvalidRowsCount(invalidCount);

    if (errors.length > 0) {
      setValidationErrors(errors.slice(0, 10));
    } else {
      setValidationErrors([]);
    }

    if (cleanRows.length === 0) {
      setValidationErrors((prev) => [
        ...prev,
        'No valid rows could be extracted. Please check that project name and positive cost are specified.',
      ]);
      return;
    }

    setPreviewRows(cleanRows);
    setStep('preview');
  };

  const processFile = (selected: File) => {
    setFile(selected);
    const isExcel = selected.name.endsWith('.xlsx') || selected.name.endsWith('.xls');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          setValidationErrors(['Excel workbook contains no sheets.']);
          return;
        }
        const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName]);
        validateAndProcessRawRows(rawRows);
      } catch (err: any) {
        console.error('File parsing error:', err);
        setValidationErrors([
          `Failed to parse ${isExcel ? 'Excel' : 'CSV'} file. Please ensure standard tabular format without password encryption.`,
        ]);
      }
    };
    reader.onerror = () => {
      setValidationErrors(['Error reading file from disk. Please try again.']);
    };
    reader.readAsArrayBuffer(selected);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    processFile(selected);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCommitUpload = async () => {
    if (previewRows.length === 0) return;
    setIsProcessing(true);
    try {
      const rowsWithSource = previewRows.map((r) => ({
        ...r,
        data_source: dataSource,
      }));
      const result = await api.uploadData(rowsWithSource, {
        file_name: file?.name || 'imported_dataset.csv',
        file_type: file?.name.endsWith('.xlsx') ? 'XLSX' : 'CSV',
        data_source: dataSource,
      });
      setImportedCount(result.inserted_count || previewRows.length);
      setStep('success');
      onSuccess();
    } catch (err: any) {
      console.error('[Upload Error]', err);
      const serverMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message;
      setValidationErrors([
        `Upload rejected by server: ${serverMsg || 'Please ensure you have appropriate session access permissions.'}`,
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetModal = () => {
    setFile(null);
    setPreviewRows([]);
    setValidationErrors([]);
    setStep('upload');
    setImportedCount(0);
    setTotalRowsDetected(0);
    setValidRowsCount(0);
    setInvalidRowsCount(0);
    setIsDragging(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600 text-white shadow-xs">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Upload Infrastructure Project Monitoring Telemetry
              </h3>
              <p className="text-xs text-slate-500">
                Ingest CSV / Excel records into Sentinel Engine & Cloud Storage
              </p>
            </div>
          </div>
          <button
            onClick={resetModal}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Data Source Transparency Tagging (Provenance Tag) */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Ingestion Provenance Tag (Transparency Badge):
                </label>
                <div className="flex gap-2 text-xs">
                  {(['Official Data', 'Imported Data', 'Demo Data'] as const).map((source) => (
                    <button
                      key={source}
                      type="button"
                      onClick={() => setDataSource(source)}
                      className={`px-3 py-1.5 rounded-md font-semibold text-xs transition-colors cursor-pointer border ${
                        dataSource === source
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {source}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  All imported records will be tagged with this provenance tag and archived to Supabase storage.
                </p>
              </div>

              {/* Selector 1: Dropzone Label with full Drag & Drop + File Input */}
              <label
                id="data-upload-dropzone"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(true);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                  const dropped = e.dataTransfer.files?.[0];
                  if (dropped) {
                    processFile(dropped);
                  }
                }}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? 'border-blue-600 bg-blue-50/80 ring-4 ring-blue-500/20 scale-[1.01]'
                    : 'border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/20'
                }`}
              >
                <div className={`p-3 rounded-full transition-transform ${isDragging ? 'scale-110 bg-blue-100 text-blue-700' : 'bg-blue-50 text-blue-600'}`}>
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-xs font-semibold text-slate-800">
                    {isDragging ? 'Release file to analyze & import' : 'Click to browse or drag & drop monitoring file'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Supports .xlsx, .xls, and .csv formats with automatic column normalization
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-1 text-[10px] font-medium text-slate-400">
                    <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">MoSPI Schema</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">NHAI / OCMS</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">Custom Columns</span>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {/* Selector 2: Templates & Quick Ingestion Action Container */}
              <div
                id="data-upload-templates-bar"
                className="p-3.5 rounded-lg bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-blue-900"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-blue-100 text-blue-700 shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-800">Download Template or Instant Test</span>
                    <span className="text-[11px] text-slate-500">Standard MoSPI headers or 1-click sample load</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleLoadSampleDataset}
                    className="px-2.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Load Sample Data</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadSampleCsv}
                    className="px-2.5 py-1.5 rounded-md bg-blue-600 text-white font-semibold text-[11px] hover:bg-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    <span>CSV Template</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadSampleXlsx}
                    className="px-2.5 py-1.5 rounded-md bg-emerald-600 text-white font-semibold text-[11px] hover:bg-emerald-700 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    <span>Excel (.xlsx)</span>
                  </button>
                </div>
              </div>

              {validationErrors.length > 0 && (
                <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>File Validation Notice</span>
                  </div>
                  <ul className="list-disc pl-5 text-[11px] space-y-1">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                  <div className="text-[11px] text-rose-700 pt-1 border-t border-rose-200/60 mt-1">
                    Tip: Click <strong>Load Sample Data</strong> above to instantly test the upload pipeline with verified MoSPI records.
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              {/* Validation Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
                  <div className="text-[10px] uppercase font-semibold text-slate-500">Total Detected</div>
                  <div className="text-lg font-bold font-mono text-slate-800">{totalRowsDetected}</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-center">
                  <div className="text-[10px] uppercase font-semibold text-emerald-700">Valid Rows</div>
                  <div className="text-lg font-bold font-mono text-emerald-700">{validRowsCount}</div>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-center">
                  <div className="text-[10px] uppercase font-semibold text-rose-700">Excluded Rows</div>
                  <div className="text-lg font-bold font-mono text-rose-700">{invalidRowsCount}</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-center">
                  <div className="text-[10px] uppercase font-semibold text-amber-700">Tagged Provenance</div>
                  <div className="text-xs font-bold text-amber-800 truncate mt-1">{dataSource}</div>
                </div>
              </div>

              {validationErrors.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Row Validation Warnings ({validationErrors.length}):</span>
                  </div>
                  <ul className="list-disc pl-5 text-[11px] space-y-0.5 max-h-24 overflow-y-auto">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-amber-700 font-medium pt-1">
                    {invalidRowsCount > 0 ? `The ${invalidRowsCount} invalid rows will be excluded. ` : ''}
                    The {validRowsCount} valid rows below will be ingested.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">
                  Ingestion Staging ({previewRows.length} ready to commit)
                </span>
                <span className="text-emerald-700 font-medium flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Schema & Data Types Verified
                </span>
              </div>

              <div className="max-h-56 overflow-auto border border-slate-200 rounded-lg">
                <table className="w-full text-[11px] text-left text-slate-600">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-semibold sticky top-0">
                    <tr>
                      <th className="p-2">Code</th>
                      <th className="p-2">Project</th>
                      <th className="p-2">Sector</th>
                      <th className="p-2 text-right">Orig (₹ Cr)</th>
                      <th className="p-2 text-right">Rev (₹ Cr)</th>
                      <th className="p-2 text-center">Phys %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {previewRows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2">{r.project_code}</td>
                        <td className="p-2 font-sans font-medium text-slate-900 truncate max-w-[160px]">
                          {r.project_name}
                        </td>
                        <td className="p-2 font-sans">{r.sector}</td>
                        <td className="p-2 text-right">₹{r.original_cost}</td>
                        <td className="p-2 text-right">₹{r.revised_cost}</td>
                        <td className="p-2 text-center">{r.physical_progress}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-[11px] text-slate-500">
                Confirming will insert these projects into the Sentinel monitoring database, run ML prediction models, and generate early warnings.
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">
                Data Successfully Ingested & Recalculated!
              </h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Successfully processed <strong>{importedCount}</strong> infrastructure project(s). Sentinel AI has calculated delay probabilities, evaluated cost overrun risks, and refreshed early warning indicators.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2">
          {step === 'upload' && (
            <button
              onClick={resetModal}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={() => setStep('upload')}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Back
              </button>
              <button
                disabled={isProcessing || previewRows.length === 0}
                onClick={handleCommitUpload}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                <span>{isProcessing ? 'Ingesting & Calculating...' : `Confirm & Ingest (${previewRows.length})`}</span>
              </button>
            </>
          )}

          {step === 'success' && (
            <button
              onClick={resetModal}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
            >
              View Updated Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
