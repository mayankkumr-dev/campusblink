import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import {
  Calendar as CalendarIcon,
  Clock,
  BookOpen,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Copy,
  Ban,
  AlertTriangle,
  Send,
  RefreshCw,
  WifiOff,
  Edit3,
  Lock,
  ArrowRight,
  Plus,
  Trash2,
  Edit,
  Settings,
  UserPlus,
  X,
  Check,
  Undo2,
  Redo2,
  Table,
  FileSpreadsheet,
  ArrowLeft,
  ChevronRight,
  Play,
  BarChart3,
  Filter,
  Download,
  Save,
  AlertCircle,
  ChevronLeft
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createAttendanceSession,
  getAttendanceSessionRoster,
  bulkUpdateAttendanceRecords,
  submitAttendanceSession,
  voidAttendanceSession,
  copyPreviousAttendanceSession
} from '../../api/attendance';

interface StudentTile {
  studentId: string;
  rollNumber: string;
  name: string;
  firstName: string;
  email?: string;
  status: 'present' | 'absent';
  recordId?: string | null;
}

interface ClassSessionRecord {
  sessionId: string;
  date: string;
  timeSlot: string;
  status: 'submitted' | 'voided';
  records: Array<{
    studentId: string;
    rollNumber: string;
    name: string;
    status: 'present' | 'absent';
  }>;
}

interface ClassCourse {
  id: string;
  className: string;      // e.g. "B.Tech Computer Science"
  academicYear: string;   // e.g. "3rd Year" or "2025-2026"
  subjectCode: string;    // e.g. "CS301"
  subjectName: string;    // e.g. "Data Structures & Algorithms"
  groupName?: string;     // e.g. "Group A"
  roster: StudentTile[];
  sessionHistory?: ClassSessionRecord[];
}

interface SessionData {
  _id?: string;
  id?: string;
  subjectId: string;
  sectionId: string;
  date: string;
  timeSlot: string;
  status: 'draft' | 'submitted' | 'locked' | 'voided';
  submittedAt?: string;
  editableUntil?: string;
}

const DEFAULT_TIMESLOTS = ['09:00-10:00', '10:00-11:00', '11:00-12:00', '14:00-15:00', '15:00-16:00'];

const INITIAL_CLASSES: ClassCourse[] = [
  {
    id: 'class_cs301_a',
    className: 'B.Tech CS Engineering',
    academicYear: '3rd Year (Semester 5)',
    subjectCode: 'CS301',
    subjectName: 'Data Structures & Algorithms',
    groupName: 'Group A',
    roster: [
      { studentId: 's1', rollNumber: '21CS001', name: 'Aarav Sharma', firstName: 'Aarav', status: 'present' },
      { studentId: 's2', rollNumber: '21CS002', name: 'Diya Patel', firstName: 'Diya', status: 'present' },
      { studentId: 's3', rollNumber: '21CS003', name: 'Ishaan Verma', firstName: 'Ishaan', status: 'present' },
      { studentId: 's4', rollNumber: '21CS004', name: 'Ananya Gupta', firstName: 'Ananya', status: 'present' },
      { studentId: 's5', rollNumber: '21CS005', name: 'Rohan Nair', firstName: 'Rohan', status: 'present' },
    ],
    sessionHistory: [
      {
        sessionId: 'sim_hist_1',
        date: new Date().toISOString().split('T')[0],
        timeSlot: '10:00-11:00',
        status: 'submitted',
        records: [
          { studentId: 's1', rollNumber: '21CS001', name: 'Aarav Sharma', status: 'present' },
          { studentId: 's2', rollNumber: '21CS002', name: 'Diya Patel', status: 'present' },
          { studentId: 's3', rollNumber: '21CS003', name: 'Ishaan Verma', status: 'absent' },
          { studentId: 's4', rollNumber: '21CS004', name: 'Ananya Gupta', status: 'present' },
          { studentId: 's5', rollNumber: '21CS005', name: 'Rohan Nair', status: 'present' },
        ],
      },
      {
        sessionId: 'sim_hist_2',
        date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
        timeSlot: '10:00-11:00',
        status: 'submitted',
        records: [
          { studentId: 's1', rollNumber: '21CS001', name: 'Aarav Sharma', status: 'present' },
          { studentId: 's2', rollNumber: '21CS002', name: 'Diya Patel', status: 'absent' },
          { studentId: 's3', rollNumber: '21CS003', name: 'Ishaan Verma', status: 'present' },
          { studentId: 's4', rollNumber: '21CS004', name: 'Ananya Gupta', status: 'present' },
          { studentId: 's5', rollNumber: '21CS005', name: 'Rohan Nair', status: 'absent' },
        ],
      },
      {
        sessionId: 'sim_hist_3',
        date: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0],
        timeSlot: '10:00-11:00',
        status: 'submitted',
        records: [
          { studentId: 's1', rollNumber: '21CS001', name: 'Aarav Sharma', status: 'present' },
          { studentId: 's2', rollNumber: '21CS002', name: 'Diya Patel', status: 'present' },
          { studentId: 's3', rollNumber: '21CS003', name: 'Ishaan Verma', status: 'present' },
          { studentId: 's4', rollNumber: '21CS004', name: 'Ananya Gupta', status: 'present' },
          { studentId: 's5', rollNumber: '21CS005', name: 'Rohan Nair', status: 'present' },
        ],
      },
    ],
  },
  {
    id: 'class_cs302_all',
    className: 'B.Tech CS Engineering',
    academicYear: '3rd Year (Semester 5)',
    subjectCode: 'CS302',
    subjectName: 'Database Management Systems',
    groupName: '',
    roster: [
      { studentId: 's101', rollNumber: '21CS010', name: 'Kabir Mehta', firstName: 'Kabir', status: 'present' },
      { studentId: 's102', rollNumber: '21CS011', name: 'Sanya Kapoor', firstName: 'Sanya', status: 'present' },
      { studentId: 's103', rollNumber: '21CS012', name: 'Vikram Singh', firstName: 'Vikram', status: 'present' },
    ],
    sessionHistory: [],
  },
];

export const ProfessorAttendancePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const todayStr = new Date().toISOString().split('T')[0];

  // Persistent Classes ecosystem
  const [classes, setClasses] = useState<ClassCourse[]>(() => {
    const saved = localStorage.getItem('prof_classes_ecosystem_v4');
    return saved ? JSON.parse(saved) : INITIAL_CLASSES;
  });

  // URL-driven View Mode ('hub' | 'add_students' | 'rollcall' | 'analytics')
  const paramView = searchParams.get('view') as 'hub' | 'add_students' | 'rollcall' | 'analytics' | null;
  const viewMode = paramView || 'hub';
  const selectedClassId = searchParams.get('classId') || classes[0]?.id || null;

  // Undo / Redo Stacks
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);

  // Roll-Call Session state
  const [date, setDate] = useState<string>(todayStr);
  const [timeSlot, setTimeSlot] = useState<string>('10:00-11:00');
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  // Unsaved Changes Tracking & Instant Auto-Save
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<string | null>(null);
  const [backWarningModalOpen, setBackWarningModalOpen] = useState<boolean>(false);
  const [pendingNavigateUrl, setPendingNavigateUrl] = useState<{ view?: string; classId?: string } | null>(null);

  // Modals
  const [summaryModalOpen, setSummaryModalOpen] = useState<boolean>(false);
  const [dateWarningModalOpen, setDateWarningModalOpen] = useState<boolean>(false);
  const [voidConfirmOpen, setVoidConfirmOpen] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);

  // Create/Edit Class Modal
  const [classModalOpen, setClassModalOpen] = useState<boolean>(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [inputClassName, setInputClassName] = useState<string>('');
  const [inputAcademicYear, setInputAcademicYear] = useState<string>('3rd Year');
  const [inputSubjCode, setInputSubjCode] = useState<string>('');
  const [inputSubjName, setInputSubjName] = useState<string>('');
  const [inputGroupName, setInputGroupName] = useState<string>('');

  // Add Students (Bulk Spreadsheet & Copy-Paste) state
  const [bulkPasteText, setBulkPasteText] = useState<string>('');
  const [sheetRows, setSheetRows] = useState<Array<{ rollNumber: string; name: string }>>([
    { rollNumber: '', name: '' },
    { rollNumber: '', name: '' },
    { rollNumber: '', name: '' },
  ]);

  // Analytics & Dates view state
  const [reportRangeType, setReportRangeType] = useState<
    'all' | 'single_date' | 'last_15_days' | 'last_1_month' | 'last_2_months' | 'last_3_months' | 'last_4_months'
  >('all');
  const [reportSingleDate, setReportSingleDate] = useState<string>(todayStr);
  const [reportStudentFilter, setReportStudentFilter] = useState<string>('');
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  // Offline Pending Sync state
  const [pendingSyncQueue, setPendingSyncQueue] = useState<any[]>([]);

  // Refs
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Persist classes ecosystem
  useEffect(() => {
    localStorage.setItem('prof_classes_ecosystem_v4', JSON.stringify(classes));
  }, [classes]);

  // Prevent closing browser tab if unsaved changes exist
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Record snapshot for Undo/Redo
  const pushHistorySnapshot = useCallback((stateSnapshot: any) => {
    setUndoStack(prev => [...prev.slice(-30), stateSnapshot]);
    setRedoStack([]);
  }, []);

  // Global Undo/Redo handlers
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) {
      toast.error('Nothing left to undo');
      return;
    }
    const previousState = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, { classes }]);
    setUndoStack(prev => prev.slice(0, -1));

    if (previousState.classes) setClasses(previousState.classes);
    toast.success('Undone last action');
  }, [classes, undoStack]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) {
      toast.error('Nothing to redo');
      return;
    }
    const nextState = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, { classes }]);
    setRedoStack(prev => prev.slice(0, -1));

    if (nextState.classes) setClasses(nextState.classes);
    toast.success('Redone action');
  }, [classes, redoStack]);

  // Keyboard shortcut listener for Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const handleKeyDownGlobal = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDownGlobal);
    return () => window.removeEventListener('keydown', handleKeyDownGlobal);
  }, [handleUndo, handleRedo]);

  const selectedClass = classes.find(c => c.id === selectedClassId) || classes[0] || null;
  const activeRoster = selectedClass?.roster || [];
  const filteredRoster = activeRoster.filter(s =>
    s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Navigate to separate page / view safely
  const navigateToPage = (targetView: 'hub' | 'add_students' | 'rollcall' | 'analytics', classId?: string) => {
    const cid = classId || selectedClassId || classes[0]?.id;
    if (hasUnsavedChanges && targetView !== viewMode) {
      setPendingNavigateUrl({ view: targetView, classId: cid });
      setBackWarningModalOpen(true);
      return;
    }

    if (targetView === 'hub') {
      setSearchParams({});
    } else {
      setSearchParams({ view: targetView, classId: cid || '' });
    }
  };

  const confirmLeaveWithoutSubmitting = () => {
    setHasUnsavedChanges(false);
    setBackWarningModalOpen(false);
    if (pendingNavigateUrl) {
      if (!pendingNavigateUrl.view || pendingNavigateUrl.view === 'hub') {
        setSearchParams({});
      } else {
        setSearchParams({ view: pendingNavigateUrl.view, classId: pendingNavigateUrl.classId || '' });
      }
    }
  };

  // Start Roll-Call Page
  const handleStartRollCallPage = async (classObj: ClassCourse) => {
    navigateToPage('rollcall', classObj.id);
    setDate(todayStr);
    setHasUnsavedChanges(false);
    setLoading(true);

    try {
      const sessionRes = await createAttendanceSession({
        subjectId: classObj.subjectCode,
        sectionId: classObj.groupName || 'ENTIRE_CLASS',
        date: todayStr,
        timeSlot,
      });

      const session = sessionRes.session;
      setCurrentSession(session);
      setFocusedIndex(0);
      setEditMode(session.status !== 'submitted' && session.status !== 'locked');
      toast.success(`Roll-Call Ready: ${classObj.subjectCode} (${classObj.roster.length} students)`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to initialize roll call');
    } finally {
      setLoading(false);
    }
  };

  // Open Add Students Page
  const handleOpenAddStudentsPage = (classObj: ClassCourse) => {
    navigateToPage('add_students', classObj.id);
    setHasUnsavedChanges(false);

    const existingRows = classObj.roster.map(s => ({
      rollNumber: s.rollNumber,
      name: s.name,
    }));
    while (existingRows.length < 5) {
      existingRows.push({ rollNumber: '', name: '' });
    }
    setSheetRows(existingRows);
  };

  // Open Analytics & Date Page
  const handleOpenAnalyticsPage = (classObj: ClassCourse) => {
    navigateToPage('analytics', classObj.id);
    setReportRangeType('all');
    setReportStudentFilter('');
  };

  // Toggle student Present / Absent
  const toggleStudentStatus = useCallback((index: number) => {
    if (!currentSession || !selectedClassId) return;
    if (currentSession.status === 'voided') {
      toast.error('This session has been voided.');
      return;
    }
    if ((currentSession.status === 'submitted' || currentSession.status === 'locked') && !editMode) {
      toast.error('Session is submitted. Enable Edit Mode to make corrections.');
      return;
    }

    pushHistorySnapshot({ classes });

    setClasses(prevClasses =>
      prevClasses.map(c => {
        if (c.id !== selectedClassId) return c;
        const updatedRoster = [...c.roster];
        const targetStudent = filteredRoster[index];
        const realIndex = updatedRoster.findIndex(s => s.studentId === targetStudent.studentId);
        if (realIndex !== -1) {
          updatedRoster[realIndex] = {
            ...updatedRoster[realIndex],
            status: updatedRoster[realIndex].status === 'present' ? 'absent' : 'present',
          };
        }
        return { ...c, roster: updatedRoster };
      })
    );

    setHasUnsavedChanges(true);
    setLastAutoSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }, [classes, currentSession, editMode, filteredRoster, pushHistorySnapshot, selectedClassId]);

  // Vertical keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredRoster.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(i => Math.min(i + 1, filteredRoster.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggleStudentStatus(focusedIndex);
    }
  };

  useEffect(() => {
    const el = rowRefs.current[focusedIndex];
    if (el && viewMode === 'rollcall') {
      el.focus();
    }
  }, [focusedIndex, viewMode]);

  const markAll = (status: 'present' | 'absent') => {
    if (!selectedClassId) return;
    pushHistorySnapshot({ classes });
    setClasses(prev =>
      prev.map(c => {
        if (c.id !== selectedClassId) return c;
        return { ...c, roster: c.roster.map(s => ({ ...s, status })) };
      })
    );
    setHasUnsavedChanges(true);
    setLastAutoSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    toast.success(`Marked all students ${status.toUpperCase()} (Auto-saved draft)`);
  };

  const handlePreSubmitCheck = () => {
    if (date !== todayStr) {
      setDateWarningModalOpen(true);
    } else {
      setSummaryModalOpen(true);
    }
  };

  const handleFinalSubmit = async () => {
    if (!currentSession || !selectedClass) return;
    const sessionId = currentSession._id || currentSession.id!;
    const payloadRecords = selectedClass.roster.map(s => ({
      studentId: s.studentId,
      rollNumber: s.rollNumber,
      name: s.name,
      status: s.status,
    }));

    try {
      await bulkUpdateAttendanceRecords(sessionId, payloadRecords, editMode ? 'Post-submission correction' : 'Final classroom submission');
      const submitRes = await submitAttendanceSession(sessionId);
      setCurrentSession(submitRes.session);

      setClasses(prev =>
        prev.map(c => {
          if (c.id !== selectedClass.id) return c;
          const hist = c.sessionHistory || [];
          const existingIdx = hist.findIndex(h => h.date === date);
          const newHistRecord: ClassSessionRecord = {
            sessionId,
            date,
            timeSlot,
            status: 'submitted',
            records: payloadRecords,
          };
          if (existingIdx !== -1) {
            const updatedHist = [...hist];
            updatedHist[existingIdx] = newHistRecord;
            return { ...c, sessionHistory: updatedHist };
          }
          return { ...c, sessionHistory: [newHistRecord, ...hist] };
        })
      );

      setSummaryModalOpen(false);
      setDateWarningModalOpen(false);
      setEditMode(false);
      setHasUnsavedChanges(false);
      toast.success('Attendance locked & submitted! Live push sent to students.');
    } catch (error: any) {
      if (!navigator.onLine || error.message?.includes('Failed to fetch')) {
        const queuedItem = {
          sessionId,
          records: payloadRecords,
          reason: 'Offline queue submission',
          action: 'submit',
          timestamp: new Date().toISOString()
        };
        const existing = JSON.parse(localStorage.getItem('pending_attendance_sync') || '[]');
        existing.push(queuedItem);
        localStorage.setItem('pending_attendance_sync', JSON.stringify(existing));
        setPendingSyncQueue(existing);
        setSummaryModalOpen(false);
        setDateWarningModalOpen(false);
        setHasUnsavedChanges(false);
        toast('Offline mode: queued locally and will sync on reconnect.', { icon: '📡' });
      } else {
        toast.error(error.message || 'Failed to submit attendance');
      }
    }
  };

  const handleVoidClass = async () => {
    if (!currentSession) return;
    try {
      const res = await voidAttendanceSession(currentSession._id || currentSession.id!);
      setCurrentSession(res.session);
      setVoidConfirmOpen(false);
      toast.success('Class marked as void/cancelled. Excluded from student denominators.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to void class');
    }
  };

  // Class CRUD
  const handleOpenAddClass = () => {
    setEditingClassId(null);
    setInputClassName('');
    setInputAcademicYear('3rd Year');
    setInputSubjCode('');
    setInputSubjName('');
    setInputGroupName('');
    setClassModalOpen(true);
  };

  const handleOpenEditClass = (classObj: ClassCourse) => {
    setEditingClassId(classObj.id);
    setInputClassName(classObj.className);
    setInputAcademicYear(classObj.academicYear);
    setInputSubjCode(classObj.subjectCode);
    setInputSubjName(classObj.subjectName);
    setInputGroupName(classObj.groupName || '');
    setClassModalOpen(true);
  };

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputClassName.trim() || !inputSubjCode.trim() || !inputSubjName.trim()) {
      toast.error('Class Name, Academic Year, Subject Code, and Subject Name are required');
      return;
    }

    pushHistorySnapshot({ classes });

    if (editingClassId) {
      setClasses(prev =>
        prev.map(c =>
          c.id === editingClassId
            ? {
                ...c,
                className: inputClassName.trim(),
                academicYear: inputAcademicYear.trim(),
                subjectCode: inputSubjCode.trim().toUpperCase(),
                subjectName: inputSubjName.trim(),
                groupName: inputGroupName.trim() || undefined,
              }
            : c
        )
      );
      toast.success('Class details updated!');
    } else {
      const newClass: ClassCourse = {
        id: `class_${Date.now()}`,
        className: inputClassName.trim(),
        academicYear: inputAcademicYear.trim(),
        subjectCode: inputSubjCode.trim().toUpperCase(),
        subjectName: inputSubjName.trim(),
        groupName: inputGroupName.trim() || undefined,
        roster: [],
        sessionHistory: [],
      };
      setClasses(prev => [...prev, newClass]);
      toast.success('New class created!');
    }
    setClassModalOpen(false);
  };

  const handleDeleteClass = (idToRemove: string) => {
    if (classes.length <= 1) {
      toast.error('At least one class must remain on your dashboard');
      return;
    }
    pushHistorySnapshot({ classes });
    setClasses(prev => prev.filter(c => c.id !== idToRemove));
    navigateToPage('hub');
    toast.success('Class removed');
  };

  // Add Students (Sheet Editor & Copy-Paste) Handlers
  const handleAddSheetRows = (count = 5) => {
    const more = Array.from({ length: count }, () => ({ rollNumber: '', name: '' }));
    setSheetRows(prev => [...prev, ...more]);
    setHasUnsavedChanges(true);
  };

  const handleSheetRowChange = (index: number, field: 'rollNumber' | 'name', value: string) => {
    setSheetRows(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    setHasUnsavedChanges(true);
    setLastAutoSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  };

  const handleRemoveSheetRow = (index: number) => {
    setSheetRows(prev => prev.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  };

  const handleBulkPasteImport = () => {
    if (!bulkPasteText.trim()) {
      toast.error('Paste student data first (e.g. Roll Number followed by Name)');
      return;
    }

    const lines = bulkPasteText.split(/\r?\n/).filter(line => line.trim().length > 0);
    const importedRows: Array<{ rollNumber: string; name: string }> = [];

    lines.forEach(line => {
      const parts = line.split(/\t|,|\s{2,}/).map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        importedRows.push({ rollNumber: parts[0].toUpperCase(), name: parts[1] });
      } else if (parts.length === 1) {
        const spaceIdx = line.trim().indexOf(' ');
        if (spaceIdx > 0) {
          const roll = line.trim().substring(0, spaceIdx).trim().toUpperCase();
          const name = line.trim().substring(spaceIdx).trim();
          importedRows.push({ rollNumber: roll, name });
        }
      }
    });

    if (importedRows.length === 0) {
      toast.error('Could not parse rows. Format: RollNumber [tab or comma] Name');
      return;
    }

    setSheetRows(prev => {
      const nonEmpties = prev.filter(r => r.rollNumber.trim() || r.name.trim());
      return [...nonEmpties, ...importedRows];
    });
    setBulkPasteText('');
    setHasUnsavedChanges(true);
    toast.success(`Imported ${importedRows.length} students into sheet!`);
  };

  const handleSaveAddStudentsPage = () => {
    if (!selectedClassId) return;
    pushHistorySnapshot({ classes });

    const validRows = sheetRows.filter(r => r.rollNumber.trim() && r.name.trim());

    const newRoster: StudentTile[] = validRows.map((r, i) => ({
      studentId: `std_${r.rollNumber.trim().toLowerCase()}_${i}`,
      rollNumber: r.rollNumber.trim().toUpperCase(),
      name: r.name.trim(),
      firstName: r.name.trim().split(' ')[0],
      status: 'present',
    }));

    setClasses(prev =>
      prev.map(c => (c.id === selectedClassId ? { ...c, roster: newRoster } : c))
    );

    setHasUnsavedChanges(false);
    toast.success(`Roster saved! (${newRoster.length} students enrolled)`);
    navigateToPage('hub');
  };

  // Compute recorded session dates map for the green calendar highlighting
  const recordedDatesSet = useMemo(() => {
    const set = new Set<string>();
    if (selectedClass?.sessionHistory) {
      selectedClass.sessionHistory.forEach(s => {
        if (s.status !== 'voided') {
          set.add(s.date);
        }
      });
    }
    return set;
  }, [selectedClass]);

  // Update / Toggle student attendance status for a specific historical date after submission
  const handleToggleHistoricalAttendance = useCallback((targetDate: string, studentId: string) => {
    if (!selectedClassId) return;
    pushHistorySnapshot({ classes });

    setClasses(prev =>
      prev.map(c => {
        if (c.id !== selectedClassId) return c;
        const hist = [...(c.sessionHistory || [])];
        const sessionIdx = hist.findIndex(s => s.date === targetDate && s.status !== 'voided');

        if (sessionIdx !== -1) {
          const session = { ...hist[sessionIdx] };
          const updatedRecords = [...session.records];
          const recIdx = updatedRecords.findIndex(r => r.studentId === studentId);
          if (recIdx !== -1) {
            const currentStatus = updatedRecords[recIdx].status;
            updatedRecords[recIdx] = {
              ...updatedRecords[recIdx],
              status: currentStatus === 'present' ? 'absent' : 'present',
            };
            session.records = updatedRecords;
            hist[sessionIdx] = session;
          } else {
            const studentObj = c.roster.find(st => st.studentId === studentId);
            if (studentObj) {
              updatedRecords.push({
                studentId: studentObj.studentId,
                rollNumber: studentObj.rollNumber,
                name: studentObj.name,
                status: 'present',
              });
              session.records = updatedRecords;
              hist[sessionIdx] = session;
            }
          }
          return { ...c, sessionHistory: hist };
        } else {
          // If no session existed yet for targetDate, create one with all students absent except target marked present
          const newRecords = c.roster.map(st => ({
            studentId: st.studentId,
            rollNumber: st.rollNumber,
            name: st.name,
            status: (st.studentId === studentId ? 'present' : 'absent') as 'present' | 'absent',
          }));
          const newSession: ClassSessionRecord = {
            sessionId: `hist_upd_${Date.now()}`,
            date: targetDate,
            timeSlot: '10:00-11:00',
            status: 'submitted',
            records: newRecords,
          };
          return { ...c, sessionHistory: [newSession, ...hist] };
        }
      })
    );
    toast.success(`Updated attendance record for ${targetDate}`);
  }, [classes, pushHistorySnapshot, selectedClassId]);

  // Compute single date availability inspection for selected single date
  const singleDateInspectionList = useMemo(() => {
    if (!selectedClass) return [];
    const targetSession = selectedClass.sessionHistory?.find(h => h.date === reportSingleDate && h.status !== 'voided');

    return selectedClass.roster.map(st => {
      if (targetSession) {
        const rec = targetSession.records.find(r => r.studentId === st.studentId || r.rollNumber === st.rollNumber);
        const status = rec ? rec.status : 'absent';
        return {
          ...st,
          isAvailable: status === 'present',
          sessionRecorded: true,
        };
      }
      return {
        ...st,
        isAvailable: false,
        sessionRecorded: false,
      };
    });
  }, [selectedClass, reportSingleDate]);

  // Generate interactive calendar grid for selected calendarMonth
  const calendarDaysList = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Array<{ dayNum: number; dateStr: string; hasAttendance: boolean; isToday: boolean; isSelected: boolean }> = [];

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNum: d,
        dateStr,
        hasAttendance: recordedDatesSet.has(dateStr),
        isToday: dateStr === todayStr,
        isSelected: dateStr === reportSingleDate,
      });
    }
    return days;
  }, [calendarMonth, recordedDatesSet, todayStr, reportSingleDate]);

  // Compute filtered historical sessions for analytics table
  const filteredSessions = useMemo(() => {
    if (!selectedClass || !selectedClass.sessionHistory) return [];
    const now = new Date();

    return selectedClass.sessionHistory.filter(session => {
      const sessDate = new Date(session.date);
      if (reportRangeType === 'single_date') {
        return session.date === reportSingleDate;
      }
      if (reportRangeType === 'last_15_days') {
        const diffDays = (now.getTime() - sessDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 15;
      }
      if (reportRangeType === 'last_1_month') {
        const diffDays = (now.getTime() - sessDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 30;
      }
      if (reportRangeType === 'last_2_months') {
        const diffDays = (now.getTime() - sessDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 60;
      }
      if (reportRangeType === 'last_3_months') {
        const diffDays = (now.getTime() - sessDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 90;
      }
      if (reportRangeType === 'last_4_months') {
        const diffDays = (now.getTime() - sessDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 120;
      }
      return true; // all time
    });
  }, [selectedClass, reportRangeType, reportSingleDate]);

  const studentReportStats = useMemo(() => {
    if (!selectedClass) return [];
    return selectedClass.roster
      .filter(st =>
        !reportStudentFilter.trim() ||
        st.rollNumber.toLowerCase().includes(reportStudentFilter.toLowerCase()) ||
        st.name.toLowerCase().includes(reportStudentFilter.toLowerCase())
      )
      .map(st => {
        let attended = 0;
        let held = 0;

        filteredSessions.forEach(sess => {
          if (sess.status !== 'voided') {
            held++;
            const rec = sess.records.find(r => r.studentId === st.studentId || r.rollNumber === st.rollNumber);
            if (rec && rec.status === 'present') {
              attended++;
            }
          }
        });

        const pct = held > 0 ? Math.round((attended / held) * 100) : 100;
        return {
          ...st,
          attended,
          held,
          percentage: pct,
        };
      });
  }, [selectedClass, filteredSessions, reportStudentFilter]);

  const presentCount = activeRoster.filter(r => r.status === 'present').length;
  const absentCount = activeRoster.filter(r => r.status === 'absent').length;
  const totalCount = activeRoster.length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-prof-bg p-4 md:p-8 transition-colors pb-28">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* TOP NAVBAR WITH PAGE TITLE & UNDO/REDO */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-prof-bg-surface p-4 rounded-2xl border border-slate-200 dark:border-prof-border-subtle shadow-sm">
          <div className="flex items-center gap-3">
            {viewMode !== 'hub' && (
              <button
                type="button"
                onClick={() => navigateToPage('hub')}
                className="p-2 rounded-xl border border-slate-300 dark:border-prof-border text-slate-700 dark:text-prof-text-primary hover:bg-slate-100 dark:hover:bg-prof-bg transition-all"
                title="Back to Classes Hub"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-prof-text-primary flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-blue-600 dark:text-prof-accent-blue" />
                <span>
                  {viewMode === 'hub' && 'Classroom Attendance Hub'}
                  {viewMode === 'add_students' && `Add Students — ${selectedClass?.className} (${selectedClass?.subjectCode})`}
                  {viewMode === 'rollcall' && `Take Roll-Call — ${selectedClass?.className} (${selectedClass?.subjectCode})`}
                  {viewMode === 'analytics' && `Analytics & Date Availability — ${selectedClass?.subjectCode}`}
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-prof-text-secondary mt-0.5">
                {viewMode === 'hub' && 'Select a class to add students, view attendance analytics, or record physical roll-call'}
                {viewMode === 'add_students' && 'Spreadsheet bulk student adder with instant Excel copy-paste support'}
                {viewMode === 'rollcall' && 'Vertical roll-number tiles with keyboard navigation and date verification'}
                {viewMode === 'analytics' && 'Interactive green calendar dates showing student availability on any recorded date'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasUnsavedChanges && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-800 dark:bg-amber-950/40 dark:border-amber-700/60 dark:text-amber-300 text-xs font-semibold">
                <Save className="w-3.5 h-3.5 animate-pulse" />
                <span>Unsubmitted Draft (Auto-saved {lastAutoSavedAt || 'just now'})</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-prof-border bg-white dark:bg-prof-bg-surface text-slate-700 dark:text-prof-text-primary text-xs font-bold flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-prof-bg transition-all disabled:opacity-40"
              title="Undo last action (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4 text-blue-600 dark:text-prof-accent-blue" />
              <span>Undo</span>
            </button>

            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-prof-border bg-white dark:bg-prof-bg-surface text-slate-700 dark:text-prof-text-primary text-xs font-bold flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-prof-bg transition-all disabled:opacity-40"
              title="Redo action (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4 text-blue-600 dark:text-prof-accent-blue" />
              <span>Redo</span>
            </button>

            {viewMode === 'hub' && (
              <button
                type="button"
                onClick={handleOpenAddClass}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Class / Subject</span>
              </button>
            )}
          </div>
        </div>

        {/* PAGE 1: CLASSES & SUBJECTS HUB */}
        {viewMode === 'hub' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classes.map(classObj => (
                <div
                  key={classObj.id}
                  className="bg-white dark:bg-prof-bg-surface rounded-3xl p-6 border border-slate-200 dark:border-prof-border-subtle shadow-sm flex flex-col justify-between space-y-5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-prof-bg text-blue-700 dark:text-prof-accent-blue text-xs font-mono font-extrabold border border-blue-200 dark:border-prof-border">
                          {classObj.subjectCode}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 text-xs font-bold">
                          Year: {classObj.academicYear}
                        </span>
                        {classObj.groupName && (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                            Group: {classObj.groupName}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-prof-text-primary mt-2">
                        {classObj.subjectName}
                      </h3>
                      <p className="text-xs font-semibold text-slate-500 dark:text-prof-text-secondary mt-0.5">
                        Class: <span className="text-slate-700 dark:text-prof-text-primary">{classObj.className}</span> • Enrolled: <span className="font-extrabold">{classObj.roster.length} students</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditClass(classObj)}
                        className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-prof-bg"
                        title="Edit Class details"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClass(classObj.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Delete Class"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Primary 3 Action Buttons -> Separate Pages */}
                  <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-slate-100 dark:border-prof-border-subtle">
                    <button
                      type="button"
                      onClick={() => handleOpenAddStudentsPage(classObj)}
                      className="px-3 py-2.5 rounded-2xl border border-slate-300 dark:border-prof-border bg-slate-50 dark:bg-prof-bg hover:bg-slate-100 dark:hover:bg-prof-bg-surface-hover text-slate-800 dark:text-prof-text-primary text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-blue-600 dark:text-prof-accent-blue" />
                      <span>Add Students</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenAnalyticsPage(classObj)}
                      className="px-3 py-2.5 rounded-2xl border border-slate-300 dark:border-prof-border bg-slate-50 dark:bg-prof-bg hover:bg-slate-100 dark:hover:bg-prof-bg-surface-hover text-slate-800 dark:text-prof-text-primary text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Analytics & Dates</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartRollCallPage(classObj)}
                      className="px-3 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Take Roll-Call</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PAGE 2: ADD STUDENTS (SPREADSHEET & COPY-PASTE EDITOR) */}
        {viewMode === 'add_students' && selectedClass && (
          <div className="bg-white dark:bg-prof-bg-surface rounded-3xl p-6 border border-slate-200 dark:border-prof-border-subtle space-y-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-prof-border-subtle">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-prof-text-primary flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-600 dark:text-prof-accent-blue" />
                  <span>Add Students — Bulk Spreadsheet & Excel Import</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-prof-text-secondary mt-0.5">
                  Type student Roll Numbers and Names across rows or copy-paste directly from Excel / Google Sheets
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAddSheetRows(5)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-prof-border text-slate-700 dark:text-prof-text-primary text-xs font-bold flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-prof-bg"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add 5 Blank Rows</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAddStudentsPage}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md"
                >
                  Save & Enrol Students
                </button>
              </div>
            </div>

            {/* Instant Copy-Paste Box */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-prof-bg border border-slate-200 dark:border-prof-border space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-prof-text-primary">
                Instant Excel / Google Sheets Copy-Paste Import
              </label>
              <textarea
                rows={2}
                placeholder="Paste lines formatted as: 21CS001 [tab or comma] Aarav Sharma"
                value={bulkPasteText}
                onChange={e => setBulkPasteText(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-prof-border bg-white dark:bg-prof-bg-surface text-sm font-mono text-slate-800 dark:text-prof-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleBulkPasteImport}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                >
                  Import Pasted Rows Into Sheet
                </button>
              </div>
            </div>

            {/* Multi-Row Spreadsheet Table */}
            <div className="border border-slate-200 dark:border-prof-border rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-prof-bg border-b border-slate-200 dark:border-prof-border text-xs font-bold uppercase text-slate-600 dark:text-prof-text-secondary">
                    <th className="p-3 w-16 text-center">#</th>
                    <th className="p-3 w-1/3">Roll Number</th>
                    <th className="p-3">Full Student Name</th>
                    <th className="p-3 w-16 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-prof-border-subtle">
                  {sheetRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-prof-bg-surface-hover">
                      <td className="p-3 text-center text-xs font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-2">
                        <input
                          type="text"
                          placeholder="e.g. 21CS042"
                          value={row.rollNumber}
                          onChange={e => handleSheetRowChange(idx, 'rollNumber', e.target.value)}
                          className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-prof-border bg-white dark:bg-prof-bg text-sm font-mono font-bold text-slate-900 dark:text-prof-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          placeholder="e.g. Aarav Sharma"
                          value={row.name}
                          onChange={e => handleSheetRowChange(idx, 'name', e.target.value)}
                          className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-prof-border bg-white dark:bg-prof-bg text-sm font-semibold text-slate-900 dark:text-prof-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveSheetRow(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PAGE 3: TAKE ROLL-CALL PAGE */}
        {viewMode === 'rollcall' && selectedClass && (
          <div className="space-y-4">
            
            {/* Toolbar with Date Selector & Non-Today Warning Notice */}
            <div className="bg-white dark:bg-prof-bg-surface rounded-2xl p-4 border border-slate-200 dark:border-prof-border-subtle flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase text-slate-500 dark:text-prof-text-secondary">
                    Class Date:
                  </span>
                  <input
                    type="date"
                    value={date}
                    onChange={e => {
                      setDate(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className={`h-9 px-2.5 rounded-xl border text-xs font-bold ${
                      date !== todayStr
                        ? 'border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300'
                        : 'border-slate-300 dark:border-prof-border bg-white dark:bg-prof-bg text-slate-800 dark:text-prof-text-primary'
                    }`}
                  />
                  {date !== todayStr && (
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Different Date</span>
                    </span>
                  )}
                </div>

                <span className="text-sm font-semibold text-slate-700 dark:text-prof-text-primary">
                  Present: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{presentCount}</span>
                </span>
                <span className="text-sm font-semibold text-slate-700 dark:text-prof-text-primary">
                  Absent: <span className="text-rose-600 dark:text-rose-400 font-bold">{absentCount}</span>
                </span>
                <span className="text-sm font-semibold text-slate-700 dark:text-prof-text-primary">
                  Total: <span className="font-bold">{totalCount}</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => markAll('present')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 dark:text-emerald-300 text-xs font-bold"
                >
                  Mark All Present
                </button>
                <button
                  type="button"
                  onClick={() => markAll('absent')}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 dark:text-rose-300 text-xs font-bold"
                >
                  Mark All Absent
                </button>
                <button
                  type="button"
                  onClick={() => setVoidConfirmOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Void Class</span>
                </button>

                <button
                  type="button"
                  onClick={handlePreSubmitCheck}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Lock & Submit</span>
                </button>
              </div>
            </div>

            {/* Search + Keyboard navigation help */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter student list by roll number or full name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-300 dark:border-prof-border bg-white dark:bg-prof-bg-surface text-sm text-slate-800 dark:text-prof-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="text-xs text-slate-500 dark:text-prof-text-secondary flex items-center gap-1.5 font-medium">
                <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-prof-bg font-mono">↑ / ↓</span>
                <span>Move focus</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-prof-bg font-mono ml-1">Space / Enter</span>
                <span>Toggle attendance status</span>
              </div>
            </div>

            {/* Vertical Stacked Student Roster */}
            <div onKeyDown={handleKeyDown} tabIndex={0} className="space-y-2.5 focus:outline-none">
              {filteredRoster.map((student, index) => {
                const isPresent = student.status === 'present';
                const isFocused = focusedIndex === index;

                return (
                  <div
                    key={student.studentId}
                    ref={(el) => { rowRefs.current[index] = el; }}
                    tabIndex={-1}
                    onClick={() => toggleStudentStatus(index)}
                    className={`cursor-pointer select-none rounded-2xl p-4 border-2 transition-all duration-150 flex items-center justify-between shadow-sm ${
                      isPresent
                        ? 'bg-white border-emerald-500/40 hover:border-emerald-500 dark:bg-prof-bg-surface dark:border-emerald-600/50'
                        : 'bg-rose-50/70 border-rose-500 hover:border-rose-600 dark:bg-rose-950/30 dark:border-rose-500'
                    } ${isFocused ? 'ring-4 ring-blue-400 dark:ring-blue-500' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-xs md:text-sm font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-prof-bg text-slate-700 dark:text-prof-text-primary border border-slate-200 dark:border-prof-border">
                        {student.rollNumber}
                      </span>
                      <div>
                        <p className="font-extrabold text-base text-slate-900 dark:text-prof-text-primary">
                          {student.name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStudentStatus(index);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                          isPresent
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : 'bg-rose-600 text-white shadow-sm'
                        }`}
                      >
                        {isPresent ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>PRESENT</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" />
                            <span>ABSENT</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PAGE 4: ANALYTICS & DATES (WITH GREEN CALENDAR DATES SHOWING RECORDED SESSIONS & STUDENT AVAILABILITY) */}
        {viewMode === 'analytics' && selectedClass && (
          <div className="bg-white dark:bg-prof-bg-surface rounded-3xl p-6 border border-slate-200 dark:border-prof-border-subtle space-y-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-prof-border-subtle">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-prof-text-primary flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>Calendar Dates & Student Availability Inspector</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-prof-text-secondary mt-0.5">
                  Dates shown in green indicate recorded classroom attendance. Click any green date to check individual student availability on that specific day
                </p>
              </div>

              {/* Time Range Filter Bar */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={reportRangeType}
                  onChange={e => {
                    setReportRangeType(e.target.value as any);
                  }}
                  className="h-9 px-3 rounded-xl border border-slate-300 dark:border-prof-border bg-white dark:bg-prof-bg text-xs font-bold text-slate-800 dark:text-prof-text-primary focus:outline-none"
                >
                  <option value="all">Full Attendance Data (All Time)</option>
                  <option value="single_date">Single Specific Date</option>
                  <option value="last_15_days">Last 15 Days</option>
                  <option value="last_1_month">Last 1 Month</option>
                  <option value="last_2_months">Last 2 Months</option>
                  <option value="last_3_months">Last 3 Months</option>
                  <option value="last_4_months">Last 4 Months</option>
                </select>
              </div>
            </div>

            {/* INTERACTIVE CALENDAR WITH GREEN RECORDED DATES */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-prof-bg border border-slate-200 dark:border-prof-border space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-prof-text-primary uppercase tracking-wider flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-emerald-600" />
                  <span>Recorded Attendance Calendar — {calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                </h3>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                    className="p-1.5 rounded-lg border border-slate-300 dark:border-prof-border hover:bg-slate-200 dark:hover:bg-prof-bg-surface text-slate-700 dark:text-prof-text-primary"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarMonth(new Date())}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-prof-border text-xs font-bold text-slate-700 dark:text-prof-text-primary hover:bg-slate-200"
                  >
                    Current Month
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                    className="p-1.5 rounded-lg border border-slate-300 dark:border-prof-border hover:bg-slate-200 dark:hover:bg-prof-bg-surface text-slate-700 dark:text-prof-text-primary"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Calendar Days Strip / Grid */}
              <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-15 gap-2">
                {calendarDaysList.map(d => {
                  const isGreen = d.hasAttendance;
                  const isSelected = reportRangeType === 'single_date' && reportSingleDate === d.dateStr;

                  return (
                    <button
                      key={d.dateStr}
                      type="button"
                      onClick={() => {
                        setReportRangeType('single_date');
                        setReportSingleDate(d.dateStr);
                      }}
                      className={`p-2 rounded-xl text-center flex flex-col items-center justify-center border transition-all ${
                        isGreen
                          ? 'bg-emerald-500 text-white font-extrabold border-emerald-600 shadow-sm hover:bg-emerald-600'
                          : 'bg-white dark:bg-prof-bg-surface text-slate-600 dark:text-prof-text-secondary border-slate-200 dark:border-prof-border hover:border-slate-400'
                      } ${isSelected ? 'ring-4 ring-blue-500' : ''}`}
                    >
                      <span className="text-[10px] uppercase font-bold opacity-80">
                        {d.dayNum}
                      </span>
                      {isGreen && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white mt-1" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-prof-text-secondary">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
                  <span>Attendance Recorded (Click to Inspect Student Availability)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-white dark:bg-prof-bg-surface border border-slate-300 inline-block" />
                  <span>No Attendance Taken</span>
                </div>
              </div>
            </div>

            {/* SINGLE DATE AVAILABILITY / OR ANALYTICS TABLE */}
            {reportRangeType === 'single_date' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-prof-text-primary">
                    Student Availability on Selected Date: <span className="text-emerald-600 dark:text-emerald-400">{reportSingleDate}</span>
                  </h4>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-3.5 rounded-2xl">
                  <span className="text-xs font-semibold text-blue-900 dark:text-blue-300">
                    💡 <span className="font-bold">Post-Submission Update Mode:</span> Click any student's status button below to change them between PRESENT and ABSENT for {reportSingleDate}.
                  </span>
                  <span className="text-xs font-bold text-slate-600 dark:text-prof-text-secondary">
                    {recordedDatesSet.has(reportSingleDate)
                      ? 'Attendance Session Recorded'
                      : 'No session taken yet on this date'}
                  </span>
                </div>

                <div className="border border-slate-200 dark:border-prof-border rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-prof-bg border-b border-slate-200 dark:border-prof-border text-xs font-bold uppercase text-slate-600 dark:text-prof-text-secondary">
                        <th className="p-3 w-32">Roll Number</th>
                        <th className="p-3">Student Name</th>
                        <th className="p-3 text-right">Status on {reportSingleDate} (Click to Update)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-prof-border-subtle">
                      {singleDateInspectionList.map(item => (
                        <tr key={item.studentId} className="hover:bg-slate-50/60 dark:hover:bg-prof-bg-surface-hover">
                          <td className="p-3 font-mono font-bold text-xs text-slate-800 dark:text-prof-text-primary">
                            {item.rollNumber}
                          </td>
                          <td className="p-3 font-semibold text-sm text-slate-900 dark:text-prof-text-primary">
                            {item.name}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleToggleHistoricalAttendance(reportSingleDate, item.studentId)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                              title="Click to update / toggle attendance for this date"
                            >
                              {!item.sessionRecorded ? (
                                <span className="bg-slate-200 text-slate-700 dark:bg-prof-bg dark:text-prof-text-primary px-2.5 py-1 rounded-lg">
                                  NOT RECORDED (Click to Mark Present)
                                </span>
                              ) : item.isAvailable ? (
                                <span className="bg-emerald-500 text-white px-3 py-1 rounded-lg flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>PRESENT (Click to Mark Absent)</span>
                                </span>
                              ) : (
                                <span className="bg-rose-600 text-white px-3 py-1 rounded-lg flex items-center gap-1">
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>ABSENT (Click to Mark Present)</span>
                                </span>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* Multi-Date Analytics Table */
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filter report for any single student (roll no or name)..."
                      value={reportStudentFilter}
                      onChange={e => setReportStudentFilter(e.target.value)}
                      className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-300 dark:border-prof-border bg-white dark:bg-prof-bg text-sm text-slate-800 dark:text-prof-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <span className="text-xs font-semibold text-slate-500 dark:text-prof-text-secondary">
                    Sessions in selected range: <span className="font-extrabold text-slate-800 dark:text-prof-text-primary">{filteredSessions.length}</span>
                  </span>
                </div>

                <div className="border border-slate-200 dark:border-prof-border rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-prof-bg border-b border-slate-200 dark:border-prof-border text-xs font-bold uppercase text-slate-600 dark:text-prof-text-secondary">
                        <th className="p-3 w-32">Roll Number</th>
                        <th className="p-3">Student Name</th>
                        <th className="p-3 text-center">Lectures Attended</th>
                        <th className="p-3 text-center">Lectures Held</th>
                        <th className="p-3 text-right">Percentage Standing</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-prof-border-subtle">
                      {studentReportStats.map(stat => (
                        <tr key={stat.studentId} className="hover:bg-slate-50/60 dark:hover:bg-prof-bg-surface-hover">
                          <td className="p-3 font-mono font-bold text-xs text-slate-800 dark:text-prof-text-primary">
                            {stat.rollNumber}
                          </td>
                          <td className="p-3 font-semibold text-sm text-slate-900 dark:text-prof-text-primary">
                            {stat.name}
                          </td>
                          <td className="p-3 text-center text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {stat.attended}
                          </td>
                          <td className="p-3 text-center text-sm font-bold text-slate-700 dark:text-prof-text-primary">
                            {stat.held}
                          </td>
                          <td className="p-3 text-right">
                            <span className={`px-3 py-1 rounded-xl text-xs font-extrabold ${
                              stat.percentage >= 75
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                                : stat.percentage >= 65
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                            }`}>
                              {stat.percentage}%
                            </span>
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

        {/* MODAL: CREATE / EDIT CLASS WITH YEAR, SUBJECT & GROUP */}
        {classModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <form onSubmit={handleSaveClass} className="bg-white dark:bg-prof-bg-surface rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-prof-border space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-prof-border-subtle">
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-5 h-5 text-blue-600 dark:text-prof-accent-blue" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-prof-text-primary">
                    {editingClassId ? 'Edit Class & Group' : 'Create New Class / Subject'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setClassModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-prof-text-primary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-prof-text-secondary mb-1">
                  Class Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B.Tech CS Engineering"
                  value={inputClassName}
                  onChange={e => setInputClassName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-prof-border bg-white dark:bg-prof-bg text-sm text-slate-900 dark:text-prof-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-prof-text-secondary mb-1">
                  Academic Year *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 3rd Year (2025-26)"
                  value={inputAcademicYear}
                  onChange={e => setInputAcademicYear(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-prof-border bg-white dark:bg-prof-bg text-sm text-slate-900 dark:text-prof-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-prof-text-secondary mb-1">
                    Subject Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS301"
                    value={inputSubjCode}
                    onChange={e => setInputSubjCode(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-prof-border bg-white dark:bg-prof-bg text-sm font-mono font-bold text-slate-900 dark:text-prof-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-prof-text-secondary mb-1">
                    Group (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Group A / Lab 1"
                    value={inputGroupName}
                    onChange={e => setInputGroupName(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-prof-border bg-white dark:bg-prof-bg text-sm text-slate-900 dark:text-prof-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-prof-text-secondary mb-1">
                  Subject Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Data Structures & Algorithms"
                  value={inputSubjName}
                  onChange={e => setInputSubjName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-prof-border bg-white dark:bg-prof-bg text-sm text-slate-900 dark:text-prof-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setClassModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-prof-border text-slate-700 dark:text-prof-text-secondary text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md"
                >
                  {editingClassId ? 'Save Class' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL: DIFFERENT DATE WARNING BEFORE SUBMITTING */}
        {dateWarningModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-prof-bg-surface rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-300 dark:border-amber-700 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-prof-text-primary">
                    Date Verification Notice
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-prof-text-secondary">
                    Submitting attendance for a different date
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-700 dark:text-prof-text-primary leading-relaxed">
                You selected <span className="font-bold text-amber-600 dark:text-amber-400">{date}</span> instead of today (<span className="font-bold">{todayStr}</span>). Please verify that you intend to record attendance for this specific date.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDateWarningModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-prof-border text-slate-700 dark:text-prof-text-secondary text-sm font-semibold"
                >
                  Change Date
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDateWarningModalOpen(false);
                    setSummaryModalOpen(true);
                  }}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold shadow-md"
                >
                  Proceed With {date}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: UNSAVED CHANGES BACK WARNING */}
        {backWarningModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-prof-bg-surface rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-prof-border space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Save className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-prof-text-primary">
                    Unsubmitted Attendance Edits
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-prof-text-secondary">
                    Your draft is auto-saved locally
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-600 dark:text-prof-text-secondary leading-relaxed">
                You have unsubmitted changes on this screen. Every edit has been instant auto-saved to your local draft, so you can resume anytime. Do you wish to leave this page now?
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBackWarningModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-prof-border text-slate-700 dark:text-prof-text-secondary text-sm font-semibold"
                >
                  Stay & Continue
                </button>
                <button
                  type="button"
                  onClick={confirmLeaveWithoutSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md"
                >
                  Leave Page
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SUMMARY CONFIRMATION MODAL */}
        {summaryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-prof-bg-surface rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-prof-border space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Send className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-prof-text-primary">
                    Confirm Attendance Submission
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-prof-text-secondary">
                    {selectedClass?.subjectCode} — Date: {date}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-prof-bg border border-slate-200 dark:border-prof-border-subtle text-center">
                <div>
                  <p className="text-xs text-slate-500 dark:text-prof-text-secondary font-medium">Present</p>
                  <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{presentCount}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-prof-text-secondary font-medium">Absent</p>
                  <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">{absentCount}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-prof-text-secondary font-medium">Total</p>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-prof-text-primary mt-1">{totalCount}</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSummaryModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-prof-border text-slate-700 dark:text-prof-text-secondary text-sm font-semibold hover:bg-slate-100 dark:hover:bg-prof-bg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md"
                >
                  Confirm & Push Live
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
