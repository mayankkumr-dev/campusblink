import React, { useState, useRef } from 'react';
import { Upload, AlertCircle, CheckCircle2, XCircle, ArrowUpCircle, Loader2, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ParsedRow {
  rollNumber: string;
  enrollmentNumber: string;
  collegeEmail: string;
}

interface UnmatchedRow extends ParsedRow {
  reason: string;
  detail?: string;
}

interface PromotionResult {
  matchedCount: number;
  unmatchedCount: number;
  unmatchedRows: UnmatchedRow[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function parseCSV(text: string): { rows: ParsedRow[]; errors: string[] } {
  const lines  = text.split(/\r?\n/).filter(l => l.trim() !== '');
  const rows: ParsedRow[]  = [];
  const errors: string[] = [];

  // Accept an optional header row
  const startIdx = lines[0]?.toLowerCase().includes('rollnumber') || lines[0]?.toLowerCase().includes('roll') ? 1 : 0;

  for (let i = startIdx; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.trim());
    if (parts.length < 3) {
      errors.push(`Line ${i + 1}: expected 3 columns (rollNumber, enrollmentNumber, collegeEmail), got ${parts.length}`);
      continue;
    }
    const [rollNumber, enrollmentNumber, collegeEmail] = parts;
    if (!rollNumber || !enrollmentNumber || !collegeEmail) {
      errors.push(`Line ${i + 1}: one or more columns is empty`);
      continue;
    }
    rows.push({ rollNumber, enrollmentNumber, collegeEmail });
  }

  return { rows, errors };
}

const REASON_LABELS: Record<string, string> = {
  no_match:                  'No matching active student',
  enrollment_number_conflict: 'Enrollment number already in use',
  college_email_conflict:     'College email already in use',
  missing_fields:             'Missing required fields',
  lookup_error:               'Database lookup error',
  update_failed:              'Profile update failed',
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const AdminBatchPromotionPage: React.FC = () => {
  const { user } = useAuthStore();

  // Promotion parameters
  const [branch,   setBranch]   = useState('');
  const [section,  setSection]  = useState('');
  const [fromYear, setFromYear] = useState('1');
  const [toYear,   setToYear]   = useState('2');

  // CSV state
  const fileInputRef             = useRef<HTMLInputElement>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [csvFileName, setCsvFileName] = useState('');

  // Promotion run state
  const [isRunning,  setIsRunning]  = useState(false);
  const [result,     setResult]     = useState<PromotionResult | null>(null);

  // ── CSV Handling ───────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { rows, errors } = parseCSV(text);
      setParsedRows(rows);
      setParseErrors(errors);
      if (errors.length > 0) {
        toast.error(`CSV has ${errors.length} parsing error(s). Review below.`);
      } else {
        toast.success(`Parsed ${rows.length} row(s) from ${file.name}`);
      }
    };
    reader.readAsText(file);

    // Reset the input so the same file can be re-selected after clearing
    e.target.value = '';
  };

  const handleClear = () => {
    setParsedRows([]);
    setParseErrors([]);
    setCsvFileName('');
    setResult(null);
  };

  // ── Promotion Run ──────────────────────────────────────────────────────────

  const handleRunPromotion = async () => {
    if (!branch.trim() || !section.trim()) {
      toast.error('Branch and section are required.');
      return;
    }
    if (parsedRows.length === 0) {
      toast.error('No rows to promote. Upload a CSV first.');
      return;
    }

    setIsRunning(true);
    setResult(null);

    try {
      const session = await supabase.auth.getSession();
      const token   = session.data.session?.access_token;

      const res = await fetch('/api/admin/promote-batch', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          branch:   branch.trim(),
          section:  section.trim(),
          fromYear: Number(fromYear),
          toYear:   Number(toYear),
          rows:     parsedRows,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error || 'Promotion failed.');
        return;
      }

      setResult(data);
      if (data.unmatchedCount === 0) {
        toast.success(`All ${data.matchedCount} students promoted successfully.`);
      } else {
        toast(`${data.matchedCount} matched · ${data.unmatchedCount} unmatched — review below.`, {
          icon: '⚠️',
          duration: 5000,
        });
      }
    } catch (err: any) {
      toast.error(err?.message || 'Network error. Please try again.');
    } finally {
      setIsRunning(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="font-syne text-base font-extrabold text-slate-900 dark:text-admin-text-primary tracking-tight transition-colors">
          Batch Promotion
        </h3>
        <p className="text-sm text-slate-500 dark:text-admin-text-secondary mt-0.5 transition-colors">
          Upload the official CSV to promote 1st-year students to 2nd year.
          Matched students receive their enrollment number and college email.
          Unmatched rows are flagged for manual review — no data is silently overwritten.
        </p>
      </div>

      {/* CSV format hint */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/5 px-4 py-3">
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
          Expected CSV format (one student per line):
        </p>
        <code className="text-xs text-amber-800 dark:text-amber-300 font-mono mt-1 block">
          rollNumber,enrollmentNumber,collegeEmail
        </code>
        <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
          An optional header row is allowed. Maximum 500 rows per run.
        </p>
      </div>

      {/* Promotion parameters */}
      <div className="rounded-2xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface p-5 space-y-4 shadow-sm dark:shadow-none transition-colors">
        <p className="text-sm font-semibold text-slate-700 dark:text-admin-text-primary">
          Promotion Parameters
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1 space-y-1">
            <label className="text-xs font-medium text-slate-500 dark:text-admin-text-secondary ml-1">Branch</label>
          <input
              id="bp-branch"
              type="text"
              placeholder="e.g. CS"
              value={branch}
              onChange={e => setBranch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface-elevated px-3 py-2 text-sm text-slate-800 dark:text-admin-text-primary placeholder:text-slate-300 dark:placeholder:text-admin-text-tertiary focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-colors"
            />
          </div>
          <div className="col-span-2 sm:col-span-1 space-y-1">
            <label className="text-xs font-medium text-slate-500 dark:text-admin-text-secondary ml-1">Section</label>
            <input
              id="bp-section"
              type="text"
              placeholder="e.g. A"
              value={section}
              onChange={e => setSection(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface-elevated px-3 py-2 text-sm text-slate-800 dark:text-admin-text-primary placeholder:text-slate-300 dark:placeholder:text-admin-text-tertiary focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 dark:text-admin-text-secondary ml-1">From Year</label>
            <select
              id="bp-from-year"
              value={fromYear}
              onChange={e => setFromYear(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface-elevated px-3 py-2 text-sm text-slate-800 dark:text-admin-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-colors"
            >
              {[1, 2, 3].map(y => <option key={y} value={y}>{y}st / {y}nd / {y}rd year</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 dark:text-admin-text-secondary ml-1">To Year</label>
            <select
              id="bp-to-year"
              value={toYear}
              onChange={e => setToYear(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface-elevated px-3 py-2 text-sm text-slate-800 dark:text-admin-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-colors"
            >
              {[2, 3, 4].map(y => <option key={y} value={y}>{y}nd / {y}rd / {y}th year</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* File upload area */}
      <div className="rounded-2xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface p-5 space-y-4 shadow-sm dark:shadow-none transition-colors">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm font-semibold text-slate-700 dark:text-admin-text-primary">
            Student CSV
          </p>
          {parsedRows.length > 0 && (
            <button
              type="button"
              id="bp-clear-csv"
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-admin-text-secondary hover:text-slate-700 dark:hover:text-admin-text-primary transition-colors"
            >
              <RotateCcw size={12} /> Clear
            </button>
          )}
        </div>

        {parsedRows.length === 0 ? (
          <button
            id="bp-upload-btn"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 dark:border-admin-border-subtle hover:border-amber-400 dark:hover:border-amber-500/50 py-10 transition-colors group"
          >
            <Upload className="w-6 h-6 text-slate-300 dark:text-admin-text-tertiary group-hover:text-amber-400 dark:group-hover:text-amber-500 transition-colors" />
            <span className="text-sm font-medium text-slate-400 dark:text-admin-text-secondary group-hover:text-slate-600 dark:group-hover:text-admin-text-primary transition-colors">
              Click to upload CSV
            </span>
            <span className="text-xs text-slate-300 dark:text-admin-text-tertiary">.csv files only</span>
          </button>
        ) : (
          <div className="space-y-3">
            {/* File info */}
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="font-medium text-slate-700 dark:text-admin-text-primary">{csvFileName}</span>
              <span className="text-slate-400 dark:text-admin-text-tertiary">·</span>
              <span className="text-slate-500 dark:text-admin-text-secondary">{parsedRows.length} rows parsed</span>
            </div>

            {/* Parse errors */}
            {parseErrors.length > 0 && (
              <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 px-4 py-3 space-y-1">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                  <AlertCircle size={12} /> {parseErrors.length} parse error(s)
                </p>
                {parseErrors.map((e, i) => (
                  <p key={i} className="text-xs text-red-600 dark:text-red-500 font-mono">{e}</p>
                ))}
              </div>
            )}

            {/* Preview table — first 10 rows */}
            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-admin-border-subtle">
              <table className="min-w-full text-xs divide-y divide-slate-100 dark:divide-admin-border-subtle">
                <thead>
                  <tr className="bg-slate-50 dark:bg-admin-bg-surface-hover">
                    <th className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-admin-text-secondary">#</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-admin-text-secondary">Roll No.</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-admin-text-secondary">Enrollment No.</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-admin-text-secondary">College Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-admin-border-subtle bg-white dark:bg-admin-bg-surface">
                  {parsedRows.slice(0, 10).map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-admin-bg-surface-hover transition-colors">
                      <td className="px-3 py-2 text-slate-400 dark:text-admin-text-tertiary">{i + 1}</td>
                      <td className="px-3 py-2 font-mono text-slate-700 dark:text-admin-text-primary">{row.rollNumber}</td>
                      <td className="px-3 py-2 font-mono text-slate-700 dark:text-admin-text-primary">{row.enrollmentNumber}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-admin-text-secondary">{row.collegeEmail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedRows.length > 10 && (
                <div className="px-3 py-2 bg-slate-50 dark:bg-admin-bg-surface-hover text-xs text-slate-400 dark:text-admin-text-tertiary">
                  … and {parsedRows.length - 10} more rows
                </div>
              )}
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          id="bp-file-input"
          onChange={handleFileChange}
        />
      </div>

      {/* Run button */}
      {parsedRows.length > 0 && (
        <div className="flex justify-end">
          <button
            id="bp-run-promotion"
            type="button"
            disabled={isRunning || parseErrors.length > 0}
            onClick={handleRunPromotion}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2.5 shadow-sm shadow-amber-200 dark:shadow-none transition-colors disabled:opacity-50"
          >
            {isRunning
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Running…</>
              : <><ArrowUpCircle className="w-4 h-4" /> Run Promotion ({parsedRows.length} students)</>
            }
          </button>
        </div>
      )}

      {/* Result summary */}
      {result !== null && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface px-4 py-3 shadow-sm dark:shadow-none transition-colors">
              <p className="text-xs font-medium text-slate-400 dark:text-admin-text-tertiary">Total rows</p>
              <p className="text-2xl font-extrabold text-slate-800 dark:text-admin-text-primary mt-0.5">{parsedRows.length}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5 px-4 py-3 transition-colors">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={11} /> Matched
              </p>
              <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">{result.matchedCount}</p>
            </div>
            <div className={`rounded-xl border px-4 py-3 transition-colors ${result.unmatchedCount > 0 ? 'border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5' : 'border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface'}`}>
              <p className={`text-xs font-medium flex items-center gap-1 ${result.unmatchedCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-admin-text-tertiary'}`}>
                <XCircle size={11} /> Unmatched
              </p>
              <p className={`text-2xl font-extrabold mt-0.5 ${result.unmatchedCount > 0 ? 'text-red-700 dark:text-red-300' : 'text-slate-500 dark:text-admin-text-secondary'}`}>
                {result.unmatchedCount}
              </p>
            </div>
          </div>

          {/* Unmatched review table */}
          {result.unmatchedRows.length > 0 && (
            <div className="rounded-2xl border border-red-100 dark:border-red-500/20 bg-white dark:bg-admin-bg-surface shadow-sm dark:shadow-none overflow-hidden transition-colors">
              <div className="px-4 py-3 border-b border-red-100 dark:border-red-500/10 bg-red-50 dark:bg-red-500/5">
                <p className="text-sm font-semibold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                  <AlertCircle size={14} /> Unmatched rows — manual review required
                </p>
                <p className="text-xs text-red-500 dark:text-red-500/70 mt-0.5">
                  These rows were not applied. No data was modified for them.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs divide-y divide-slate-100 dark:divide-admin-border-subtle">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-admin-bg-surface-hover">
                      <th className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-admin-text-secondary">Roll No.</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-admin-text-secondary">Enrollment No.</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-admin-text-secondary">College Email</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-admin-text-secondary">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-admin-border-subtle bg-white dark:bg-admin-bg-surface">
                    {result.unmatchedRows.map((row, i) => (
                      <tr key={i} className="hover:bg-red-50/50 dark:hover:bg-red-500/5 transition-colors">
                        <td className="px-3 py-2 font-mono text-slate-700 dark:text-admin-text-primary">{row.rollNumber}</td>
                        <td className="px-3 py-2 font-mono text-slate-700 dark:text-admin-text-primary">{row.enrollmentNumber}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-admin-text-secondary">{row.collegeEmail}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-red-100 dark:bg-red-500/10 px-2 py-0.5 text-red-700 dark:text-red-400 font-semibold">
                            {REASON_LABELS[row.reason] || row.reason}
                          </span>
                          {row.detail && (
                            <span className="ml-2 text-slate-400 dark:text-admin-text-tertiary">{row.detail}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
