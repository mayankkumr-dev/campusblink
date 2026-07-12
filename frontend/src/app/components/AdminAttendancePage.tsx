import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  AlertTriangle,
  Download,
  History,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  Ban,
  RefreshCw,
  Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAdminDefaulters,
  getAdminAuditLog,
  voidAttendanceSession
} from '../../api/attendance';

interface Defaulter {
  studentId: string;
  name: string;
  rollNumber: string;
  email?: string;
  classesHeld: number;
  classesAttended: number;
  percentage: number;
}

interface AuditLogEntry {
  recordId: string;
  studentId: string;
  editedBy: string;
  previousStatus: string;
  newStatus: string;
  timestamp: string;
  reason: string;
}

export const AdminAttendancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'defaulters' | 'audit' | 'void'>('defaulters');

  // Defaulters list filters
  const [subjectFilter, setSubjectFilter] = useState<string>('ALL');
  const [sectionFilter, setSectionFilter] = useState<string>('ALL');
  const [thresholdFilter, setThresholdFilter] = useState<number>(75);
  const [defaulters, setDefaulters] = useState<Defaulter[]>([]);
  const [defaultersLoading, setDefaultersLoading] = useState<boolean>(false);

  // Audit log viewer state
  const [auditSessionId, setAuditSessionId] = useState<string>('');
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState<boolean>(false);

  // Bulk void session state
  const [voidSessionIdInput, setVoidSessionIdInput] = useState<string>('');
  const [voiding, setVoiding] = useState<boolean>(false);

  const loadDefaulters = async () => {
    setDefaultersLoading(true);
    try {
      const res = await getAdminDefaulters({
        subjectId: subjectFilter,
        sectionId: sectionFilter,
        threshold: thresholdFilter,
      });
      setDefaulters(res.defaulters || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch defaulters');
    } finally {
      setDefaultersLoading(false);
    }
  };

  useEffect(() => {
    loadDefaulters();
  }, [subjectFilter, sectionFilter, thresholdFilter]);

  // CSV Export for Defaulters
  const handleExportCSV = () => {
    if (defaulters.length === 0) {
      toast.error('No defaulters to export');
      return;
    }

    const headers = ['Roll Number', 'Student Name', 'Email', 'Classes Held', 'Classes Attended', 'Attendance %'];
    const rows = defaulters.map(d => [
      d.rollNumber,
      `"${d.name.replace(/"/g, '""')}"`,
      d.email || '',
      d.classesHeld,
      d.classesAttended,
      `${d.percentage}%`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `campus_blink_attendance_defaulters_${thresholdFilter}pct.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Defaulters CSV exported!');
  };

  const handleFetchAuditLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditSessionId.trim()) {
      toast.error('Please enter a Session ID to view its audit log');
      return;
    }
    setAuditLoading(true);
    try {
      const res = await getAdminAuditLog(auditSessionId.trim());
      setAuditLogs(res.auditLog || []);
      toast.success(`Loaded ${res.auditLog?.length || 0} audit entries`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load session audit log');
    } finally {
      setAuditLoading(false);
    }
  };

  const handleAdminBulkVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidSessionIdInput.trim()) {
      toast.error('Please enter the Session ID to void');
      return;
    }
    setVoiding(true);
    try {
      await voidAttendanceSession(voidSessionIdInput.trim());
      toast.success('Session voided successfully! All student denominators updated.');
      setVoidSessionIdInput('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to void session');
    } finally {
      setVoiding(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-admin-bg p-4 md:p-8 transition-colors pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-admin-text-primary flex items-center gap-2.5">
              <ClipboardCheck className="w-8 h-8 text-blue-600 dark:text-admin-accent" />
              Attendance Administration Console
            </h1>
            <p className="text-sm text-slate-500 dark:text-admin-text-secondary mt-1">
              Filterable defaulter reports, session audit trail logs, and administrative corrections
            </p>
          </div>

          {/* Export CSV button */}
          {activeTab === 'defaulters' && (
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center gap-2 shadow-md transition-all self-start sm:self-auto"
            >
              <Download className="w-4 h-4" />
              <span>Export Defaulters CSV</span>
            </button>
          )}
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-admin-border-subtle pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('defaulters')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'defaulters'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 dark:text-admin-text-secondary hover:bg-slate-100 dark:hover:bg-admin-bg-surface'
            }`}
          >
            Attendance Defaulters List
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'audit'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 dark:text-admin-text-secondary hover:bg-slate-100 dark:hover:bg-admin-bg-surface'
            }`}
          >
            Session Audit Log Viewer
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('void')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'void'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 dark:text-admin-text-secondary hover:bg-slate-100 dark:hover:bg-admin-bg-surface'
            }`}
          >
            Bulk Void Tool
          </button>
        </div>

        {/* TAB 1: DEFAULTERS LIST */}
        {activeTab === 'defaulters' && (
          <div className="space-y-4">
            
            {/* Filters */}
            <div className="bg-white dark:bg-admin-bg-surface rounded-2xl p-4 border border-slate-200 dark:border-admin-border-subtle grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-admin-text-secondary mb-1">
                  Subject Filter
                </label>
                <select
                  value={subjectFilter}
                  onChange={e => setSubjectFilter(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-admin-border bg-white dark:bg-admin-bg-surface text-sm text-slate-800 dark:text-admin-text-primary"
                >
                  <option value="ALL">All Subjects</option>
                  <option value="CS301">CS301 — Data Structures</option>
                  <option value="CS302">CS302 — Database Management</option>
                  <option value="CS303">CS303 — Operating Systems</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-admin-text-secondary mb-1">
                  Section Filter
                </label>
                <select
                  value={sectionFilter}
                  onChange={e => setSectionFilter(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-admin-border bg-white dark:bg-admin-bg-surface text-sm text-slate-800 dark:text-admin-text-primary"
                >
                  <option value="ALL">All Sections</option>
                  <option value="CS-A">CS-A</option>
                  <option value="CS-B">CS-B</option>
                  <option value="CS-C">CS-C</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-admin-text-secondary mb-1">
                  Defaulter Threshold (%)
                </label>
                <select
                  value={thresholdFilter}
                  onChange={e => setThresholdFilter(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-admin-border bg-white dark:bg-admin-bg-surface text-sm text-slate-800 dark:text-admin-text-primary font-bold"
                >
                  <option value={75}>Below 75%</option>
                  <option value={80}>Below 80%</option>
                  <option value={65}>Below 65%</option>
                </select>
              </div>

              <div>
                <button
                  type="button"
                  onClick={loadDefaulters}
                  className="w-full h-10 mt-5 rounded-xl bg-slate-900 dark:bg-admin-accent hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${defaultersLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh Defaulters</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-admin-bg-surface rounded-2xl border border-slate-200 dark:border-admin-border-subtle overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-admin-bg border-b border-slate-200 dark:border-admin-border-subtle text-xs font-bold text-slate-500 dark:text-admin-text-secondary uppercase">
                    <th className="p-4">Roll Number</th>
                    <th className="p-4">Student Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4 text-center">Classes Held</th>
                    <th className="p-4 text-center">Classes Attended</th>
                    <th className="p-4 text-right">Attendance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-admin-border-subtle text-sm">
                  {defaulters.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 dark:text-admin-text-secondary">
                        {defaultersLoading ? 'Loading defaulters...' : 'No students found below this attendance threshold.'}
                      </td>
                    </tr>
                  ) : (
                    defaulters.map((d, idx) => (
                      <tr key={d.studentId || idx} className="hover:bg-slate-50/60 dark:hover:bg-admin-bg-surface-hover">
                        <td className="p-4 font-mono font-bold text-slate-900 dark:text-admin-text-primary">
                          {d.rollNumber}
                        </td>
                        <td className="p-4 font-bold text-slate-900 dark:text-admin-text-primary">
                          {d.name}
                        </td>
                        <td className="p-4 text-slate-500 dark:text-admin-text-secondary">
                          {d.email || 'N/A'}
                        </td>
                        <td className="p-4 text-center font-semibold">{d.classesHeld}</td>
                        <td className="p-4 text-center font-semibold">{d.classesAttended}</td>
                        <td className="p-4 text-right">
                          <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-extrabold">
                            {d.percentage}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* TAB 2: AUDIT LOG VIEWER */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <form onSubmit={handleFetchAuditLog} className="bg-white dark:bg-admin-bg-surface rounded-2xl p-4 border border-slate-200 dark:border-admin-border-subtle flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Enter Session ID to view full edit history (who edited what, when, and stated reason)..."
                value={auditSessionId}
                onChange={e => setAuditSessionId(e.target.value)}
                className="flex-1 h-10 px-4 rounded-xl border border-slate-300 dark:border-admin-border bg-white dark:bg-admin-bg-surface text-sm text-slate-800 dark:text-admin-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={auditLoading}
                className="px-6 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2"
              >
                <History className="w-4 h-4" />
                <span>View Audit Trail</span>
              </button>
            </form>

            <div className="bg-white dark:bg-admin-bg-surface rounded-2xl border border-slate-200 dark:border-admin-border-subtle overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-admin-bg border-b border-slate-200 dark:border-admin-border-subtle text-xs font-bold text-slate-500 dark:text-admin-text-secondary uppercase">
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Edited By</th>
                    <th className="p-4">Student ID</th>
                    <th className="p-4">Prev Status</th>
                    <th className="p-4">New Status</th>
                    <th className="p-4">Stated Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-admin-border-subtle text-sm">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 dark:text-admin-text-secondary">
                        {auditLoading ? 'Loading audit trail...' : 'Enter a valid Session ID above to inspect edit logs.'}
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((entry, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-admin-bg-surface-hover">
                        <td className="p-4 font-mono text-xs text-slate-500 dark:text-admin-text-secondary">
                          {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'N/A'}
                        </td>
                        <td className="p-4 font-bold text-slate-900 dark:text-admin-text-primary">
                          {entry.editedBy}
                        </td>
                        <td className="p-4 font-mono text-xs text-slate-600 dark:text-admin-text-secondary">
                          {entry.studentId}
                        </td>
                        <td className="p-4 uppercase font-semibold text-slate-500">
                          {entry.previousStatus}
                        </td>
                        <td className="p-4 uppercase font-bold text-blue-600 dark:text-blue-400">
                          {entry.newStatus}
                        </td>
                        <td className="p-4 text-slate-600 dark:text-admin-text-secondary">
                          {entry.reason}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: BULK VOID TOOL */}
        {activeTab === 'void' && (
          <div className="bg-white dark:bg-admin-bg-surface rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-admin-border-subtle max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-admin-text-primary">
                  Administrative Bulk Void Tool
                </h3>
                <p className="text-xs text-slate-500 dark:text-admin-text-secondary">
                  Void college-wide cancelled or holiday classes so they are excluded from student denominators
                </p>
              </div>
            </div>

            <form onSubmit={handleAdminBulkVoid} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-admin-text-primary mb-1">
                  Session ID to Void
                </label>
                <input
                  type="text"
                  placeholder="Enter Session ID..."
                  value={voidSessionIdInput}
                  onChange={e => setVoidSessionIdInput(e.target.value)}
                  className="w-full h-10 px-4 rounded-xl border border-slate-300 dark:border-admin-border bg-white dark:bg-admin-bg text-sm text-slate-800 dark:text-admin-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={voiding}
                className="w-full h-11 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <Ban className="w-4 h-4" />
                <span>{voiding ? 'Voiding Session...' : 'Confirm & Void Session'}</span>
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
