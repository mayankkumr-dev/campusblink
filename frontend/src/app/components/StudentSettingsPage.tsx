import React, { useState, useEffect } from 'react';
import { LogOut, Shield, KeyRound, MessageSquare, Star, Megaphone, ChevronRight, Moon, Calendar, ChevronDown, CheckCircle2, RefreshCw, Trash2, Upload, FileText, Edit3, Save, Plus, Loader2, Bell } from 'lucide-react';
import { useNavigate, Link } from 'react-router';
import toast from 'react-hot-toast';
import { signOut } from '../../api/auth';
import { uploadStudentScheduleFile, getStudentSchedule, saveStudentSchedule, deleteStudentSchedule } from '../../api/student';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from 'next-themes';
import { supabase } from '../../lib/supabase';

export const StudentSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const profile = useAuthStore((state) => state.profile);
  const isNoticeAdmin = Boolean(profile?.is_notice_admin) || profile?.role === 'admin';
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  const [expandedSection, setExpandedSection] = React.useState<string | null>(null);
  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Auto-expand 'schedule' section if navigated via CTA
  useEffect(() => {
    if (window.location.search.includes('section=schedule') || window.location.hash === '#schedule') {
      setExpandedSection('schedule');
    }
  }, []);

  // Upload Schedule State
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingStep, setUploadingStep] = useState<number>(0); // 0: idle, 1: scanning, 2: extracting, 3: success
  const [parsedScheduleInfo, setParsedScheduleInfo] = useState<any>(null);
  const [manualSlots, setManualSlots] = useState<any[]>([]);
  const [savingManual, setSavingManual] = useState<boolean>(false);
  const [newSlot, setNewSlot] = useState({
    day: 'MON',
    startTime: '09:00',
    endTime: '09:50',
    subject: '',
    room: '',
    batch: '',
    statusLabel: 'Lecture',
  });

  useEffect(() => {
    async function loadSchedule() {
      try {
        const cached = localStorage.getItem('student_parsed_schedule');
        if (cached) {
          const arr = JSON.parse(cached);
          if (Array.isArray(arr) && arr.length > 0) {
            setManualSlots(arr);
            setParsedScheduleInfo({
              metadata: {
                filename: 'saved_schedule.pdf',
                totalClasses: arr.length,
                daysDetected: Array.from(new Set(arr.map((c: any) => c.day))),
              },
              schedule: arr,
            });
          }
        }
        const res = await getStudentSchedule();
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setManualSlots(res.data);
          setParsedScheduleInfo({
            metadata: {
              filename: 'saved_schedule.pdf',
              totalClasses: res.data.length,
              daysDetected: Array.from(new Set(res.data.map((c: any) => c.day))),
            },
            schedule: res.data,
          });
        }
      } catch (_) {}
    }
    loadSchedule();
  }, []);

  const handleAddSlot = () => {
    if (!newSlot.subject.trim() || !newSlot.room.trim()) {
      toast.error('Please enter subject code/name and room number.');
      return;
    }
    const slotObj = {
      id: `${newSlot.day.toLowerCase()}-${Date.now()}`,
      day: newSlot.day,
      startTime: newSlot.startTime,
      endTime: newSlot.endTime,
      subject: newSlot.subject.trim(),
      code: newSlot.subject.trim(),
      room: newSlot.room.trim(),
      batch: newSlot.batch.trim() || 'All',
      statusLabel: newSlot.statusLabel,
    };
    const updated = [...manualSlots, slotObj];
    setManualSlots(updated);
    setNewSlot({
      day: newSlot.day,
      startTime: newSlot.endTime,
      endTime: '',
      subject: '',
      room: '',
      batch: '',
      statusLabel: 'Lecture',
    });
    toast.success('Class slot added! Click Save Manual Schedule to save changes.');
  };

  const handleRemoveSlot = (id: string) => {
    const updated = manualSlots.filter((s) => s.id !== id);
    setManualSlots(updated);
  };

  const handleSaveManualSchedule = async () => {
    setSavingManual(true);
    const res = await saveStudentSchedule(manualSlots);
    setSavingManual(false);
    if (res.error) {
      toast.error('Failed to save schedule');
    } else {
      setParsedScheduleInfo({
        metadata: {
          filename: 'Manual Schedule',
          totalClasses: manualSlots.length,
          daysDetected: Array.from(new Set(manualSlots.map((c: any) => c.day))),
        },
        schedule: manualSlots,
      });
      toast.success('Timetable saved successfully!');
    }
  };

  const handleDeleteSchedule = async () => {
    if (!window.confirm('Are you sure you want to delete your saved schedule?')) return;
    const toastId = toast.loading('Deleting schedule...');
    await deleteStudentSchedule();
    setManualSlots([]);
    setParsedScheduleInfo(null);
    setSelectedFile(null);
    setUploadingStep(0);
    localStorage.removeItem('student_parsed_schedule');
    toast.success('Schedule deleted successfully!', { id: toastId });
  };

  const handleScheduleUpload = async (file: File) => {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      toast.error('Invalid file format. Please upload a PDF, PNG, or JPG file.');
      return;
    }
    setSelectedFile(file);
    setUploadingStep(1);

    setTimeout(() => setUploadingStep(2), 1000);

    const res = await uploadStudentScheduleFile(file);
    if (res.error) {
      toast.error(res.error.message || 'Failed to parse timetable file.');
      setUploadingStep(0);
      setSelectedFile(null);
      return;
    }

    setUploadingStep(3);
    const uploadedSchedule = res.data.schedule || [];
    setManualSlots(uploadedSchedule);
    setParsedScheduleInfo(res.data);
    toast.success('Timetable parsed successfully!');
  };

  




  const handleLogout = async () => {
    const toastId = toast.loading('Logging you out...');
    try {
      await signOut();
      setAuth(null, null);
      toast.success('Logged out successfully.', { id: toastId });
      navigate('/');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to log out.', { id: toastId });
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-8 md:py-12 font-sans">
      <div className="mx-auto max-w-2xl">
        <div className="mb-10 text-center md:text-left">
          <p className="text-[11px] font-bold uppercase tracking-widest text-accent-blue mb-3">Settings</p>
          <h1 className="font-syne text-3xl md:text-4xl font-extrabold text-text-primary">Account controls</h1>
        </div>

        <div className="bg-surface rounded-3xl border border-border-subtle overflow-hidden">
{/* Upload Schedule Section */}
            <div id="schedule" className="border-b border-gray-100 dark:border-prof-border-subtle">
              <button 
                onClick={() => toggleSection('schedule')}
                className="w-full group flex items-center justify-between p-6 sm:p-8 hover:bg-gray-50 dark:hover:bg-prof-bg-surface-hover transition-colors text-left bg-white dark:bg-prof-bg-surface"
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/40 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-sm dark:shadow-none">
                    <Calendar className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h2 className="font-syne text-lg font-bold text-gray-900 dark:text-prof-text-primary mb-0.5">Upload Schedule</h2>
                    <p className="text-sm text-gray-500 dark:text-prof-text-secondary font-medium">Extract timetable classes from your weekly schedule PDF or Image.</p>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 dark:text-prof-text-tertiary group-hover:text-gray-700 dark:group-hover:text-prof-text-primary transition-transform flex-shrink-0 ${expandedSection === 'schedule' ? 'rotate-180' : ''}`} />
              </button>
              
              <div className={`overflow-hidden transition-all duration-500 ease-in-out ${expandedSection === 'schedule' ? 'max-h-[750px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-6 sm:p-8 pt-0 bg-white dark:bg-prof-bg-surface border-t border-gray-50 dark:border-prof-border-subtle">
                  <div className="max-w-2xl mx-auto">
                    {/* Upload drop zone */}
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleScheduleUpload(e.dataTransfer.files[0]);
                        }
                      }}
                      className={`relative rounded-3xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
                        isDragging
                          ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 shadow-lg scale-[1.01]'
                          : 'border-gray-200 dark:border-prof-border-subtle bg-gray-50/50 dark:bg-prof-bg-surface-raised hover:border-blue-400 dark:hover:border-blue-500/60 hover:bg-blue-50/20 dark:hover:bg-blue-950/20'
                      }`}
                    >
                      {uploadingStep === 1 || uploadingStep === 2 ? (
                        <div className="py-8 flex flex-col items-center justify-center">
                          <Loader2 className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-spin mb-4" />
                          <p className="text-base font-bold text-gray-900 dark:text-prof-text-primary font-syne mb-1">
                            {uploadingStep === 1 ? 'Scanning Document Layout...' : 'Extracting Tabular Timetable Data...'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-prof-text-secondary font-medium">Identifying timeslots, subjects, batch groups, and room numbers</p>
                        </div>
                      ) : uploadingStep === 3 && parsedScheduleInfo ? (
                        <div className="py-4 text-left">
                          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100 dark:border-prof-border-subtle">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-prof-text-primary">Schedule Parsed Successfully</h3>
                                <p className="text-xs text-gray-500 dark:text-prof-text-secondary">{parsedScheduleInfo.metadata?.filename} • {parsedScheduleInfo.metadata?.totalClasses || 17} Classes Extracted</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => { setUploadingStep(0); setSelectedFile(null); }}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                              >
                                <RefreshCw className="w-3.5 h-3.5" /> Re-upload
                              </button>
                              <button
                                type="button"
                                onClick={handleDeleteSchedule}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 pt-2">
                            {['MON', 'TUES', 'WED', 'THURS', 'FRI'].map((d) => (
                              <span key={d} className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/40">
                                {d}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="py-6 flex flex-col items-center">
                          <div className="w-14 h-14 rounded-2xl bg-white dark:bg-prof-bg-surface text-blue-600 dark:text-blue-400 border border-gray-200 dark:border-prof-border-subtle shadow-sm flex items-center justify-center mb-4">
                            <Upload className="w-6 h-6" strokeWidth={1.75} />
                          </div>
                          <p className="text-base font-bold text-gray-900 dark:text-prof-text-primary font-syne mb-1">
                            Drag & drop your timetable file here
                          </p>
                          <p className="text-xs text-gray-500 dark:text-prof-text-secondary font-medium mb-5">
                            Supports .PDF, .PNG, or .JPG timetable schedules
                          </p>
                          <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-[0_4px_14px_rgba(37,99,235,0.25)] transition-all active:scale-95">
                            <FileText className="w-4 h-4" /> Browse Files
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleScheduleUpload(e.target.files[0]);
                                }
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Manual Add / Edit Schedule UI */}
                    <div className="mt-8 pt-8 border-t border-gray-100 dark:border-prof-border-subtle">
                      <div className="flex items-center justify-between mb-5">
                        <div>
                          <h3 className="text-base font-bold text-gray-900 dark:text-prof-text-primary font-syne flex items-center gap-2">
                            <Edit3 className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Manual Schedule Editor
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-prof-text-secondary mt-0.5">
                            Add or edit schedule slots manually without invented full forms ({manualSlots.length} slots).
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {manualSlots.length > 0 && (
                            <button
                              type="button"
                              onClick={handleDeleteSchedule}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40 text-xs font-bold transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete Schedule
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleSaveManualSchedule}
                            disabled={savingManual}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                          >
                            {savingManual ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            Save Schedule
                          </button>
                        </div>
                      </div>

                      {/* Add Slot Form */}
                      <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-prof-bg-surface-raised border border-gray-200/80 dark:border-prof-border-subtle mb-6">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-600 dark:text-prof-text-secondary mb-1">Day</label>
                            <select
                              value={newSlot.day}
                              onChange={(e) => setNewSlot({ ...newSlot, day: e.target.value })}
                              className="w-full text-xs font-bold px-2.5 py-2 rounded-xl bg-white dark:bg-prof-bg-surface border border-gray-200 dark:border-prof-border-strong text-gray-900 dark:text-prof-text-primary"
                            >
                              <option value="MON">MON</option>
                              <option value="TUES">TUES</option>
                              <option value="WED">WED</option>
                              <option value="THURS">THURS</option>
                              <option value="FRI">FRI</option>
                              <option value="SAT">SAT</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-600 dark:text-prof-text-secondary mb-1">Start Time</label>
                            <input
                              type="text"
                              placeholder="09:00"
                              value={newSlot.startTime}
                              onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                              className="w-full text-xs font-semibold px-2.5 py-2 rounded-xl bg-white dark:bg-prof-bg-surface border border-gray-200 dark:border-prof-border-strong text-gray-900 dark:text-prof-text-primary"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-600 dark:text-prof-text-secondary mb-1">End Time</label>
                            <input
                              type="text"
                              placeholder="09:50"
                              value={newSlot.endTime}
                              onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                              className="w-full text-xs font-semibold px-2.5 py-2 rounded-xl bg-white dark:bg-prof-bg-surface border border-gray-200 dark:border-prof-border-strong text-gray-900 dark:text-prof-text-primary"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-600 dark:text-prof-text-secondary mb-1">Type</label>
                            <select
                              value={newSlot.statusLabel}
                              onChange={(e) => setNewSlot({ ...newSlot, statusLabel: e.target.value })}
                              className="w-full text-xs font-bold px-2.5 py-2 rounded-xl bg-white dark:bg-prof-bg-surface border border-gray-200 dark:border-prof-border-strong text-gray-900 dark:text-prof-text-primary"
                            >
                              <option value="Lecture">Lecture</option>
                              <option value="Tutorial">Tutorial</option>
                              <option value="Lab">Lab</option>
                              <option value="Mentoring">Mentoring</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-600 dark:text-prof-text-secondary mb-1">Subject Code / Name (exact)</label>
                            <input
                              type="text"
                              placeholder="e.g. HVE, CS, TW"
                              value={newSlot.subject}
                              onChange={(e) => setNewSlot({ ...newSlot, subject: e.target.value })}
                              className="w-full text-xs font-semibold px-2.5 py-2 rounded-xl bg-white dark:bg-prof-bg-surface border border-gray-200 dark:border-prof-border-strong text-gray-900 dark:text-prof-text-primary"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-600 dark:text-prof-text-secondary mb-1">Room / Venue</label>
                            <input
                              type="text"
                              placeholder="e.g. 346"
                              value={newSlot.room}
                              onChange={(e) => setNewSlot({ ...newSlot, room: e.target.value })}
                              className="w-full text-xs font-semibold px-2.5 py-2 rounded-xl bg-white dark:bg-prof-bg-surface border border-gray-200 dark:border-prof-border-strong text-gray-900 dark:text-prof-text-primary"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-600 dark:text-prof-text-secondary mb-1">Batch / Group</label>
                            <input
                              type="text"
                              placeholder="e.g. M Group, All"
                              value={newSlot.batch}
                              onChange={(e) => setNewSlot({ ...newSlot, batch: e.target.value })}
                              className="w-full text-xs font-semibold px-2.5 py-2 rounded-xl bg-white dark:bg-prof-bg-surface border border-gray-200 dark:border-prof-border-strong text-gray-900 dark:text-prof-text-primary"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={handleAddSlot}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Slot
                          </button>
                        </div>
                      </div>

                      {/* Manual Slots List */}
                      {manualSlots.length === 0 ? (
                        <p className="text-xs font-semibold text-gray-400 dark:text-prof-text-tertiary text-center py-4">No schedule slots added yet.</p>
                      ) : (
                        <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                          {manualSlots.map((slot, idx) => (
                            <div
                              key={slot.id || idx}
                              className="flex items-center justify-between p-3 rounded-xl bg-gray-50/50 dark:bg-prof-bg-surface border border-gray-200/60 dark:border-prof-border-subtle"
                            >
                              <div className="flex items-center gap-3">
                                <span className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/40">
                                  {slot.day}
                                </span>
                                <div>
                                  <div className="text-xs font-bold text-gray-900 dark:text-prof-text-primary">
                                    {slot.subject} <span className="text-gray-400 font-normal">({slot.startTime} - {slot.endTime})</span>
                                  </div>
                                  <div className="text-[11px] text-gray-500 dark:text-prof-text-secondary">
                                    Room {slot.room} • Batch {slot.batch || 'All'} • {slot.statusLabel || 'Lecture'}
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveSlot(slot.id)}
                                className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1.5 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            
          
          <div className="flex flex-col">
            <Link to="/student/bookmarks" className="group flex items-center justify-between p-6 md:p-8 border-b border-border-subtle hover:bg-surface-elevated transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent-blue-soft text-accent-blue flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <Star className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-syne text-lg font-bold text-text-primary mb-1">Saved Bookmarks</h2>
                  <p className="text-sm text-text-secondary">View your saved and favorite posts in the community.</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-text-secondary group-hover:text-accent-blue transition-colors flex-shrink-0" />
            </Link>

            <Link to="/student/settings/notifications" className="group flex items-center justify-between p-6 md:p-8 border-b border-border-subtle hover:bg-surface-elevated transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent-blue/15 text-accent-blue flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-syne text-lg font-bold text-text-primary mb-1">Notifications</h2>
                  <p className="text-sm text-text-secondary">Manage push notification preferences and alerts.</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-text-secondary group-hover:text-accent-blue transition-colors flex-shrink-0" />
            </Link>

            <Link to="/student/settings/password" className="group flex items-center justify-between p-6 md:p-8 border-b border-border-subtle hover:bg-surface-elevated transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent-green/15 text-accent-green flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-syne text-lg font-bold text-text-primary mb-1">Change Password</h2>
                  <p className="text-sm text-text-secondary">Update your digital key to keep your account secure.</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-text-secondary group-hover:text-accent-green transition-colors flex-shrink-0" />
            </Link>

            <Link to="/student/settings/feedback" className="group flex items-center justify-between p-6 md:p-8 border-b border-border-subtle hover:bg-surface-elevated transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent-amber-soft text-accent-amber flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-syne text-lg font-bold text-text-primary mb-1">Send Feedback</h2>
                  <p className="text-sm text-text-secondary">Found a glitch or want a new feature? Tell us about it.</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-text-secondary group-hover:text-accent-amber transition-colors flex-shrink-0" />
            </Link>

            {/* Appearance Row */}
            <div className="group flex flex-col md:flex-row md:items-center justify-between p-6 md:p-8 border-b border-border-subtle bg-surface transition-colors gap-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent-purple/15 text-accent-purple flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-syne text-lg font-bold text-text-primary mb-1">Appearance</h2>
                  <p className="text-sm text-text-secondary">Choose how Campus Blink looks on this device.</p>
                </div>
              </div>
              
              <div className="flex p-1 bg-slate-100 dark:bg-surface-elevated rounded-xl border border-slate-200 dark:border-border-subtle self-start md:self-auto shrink-0 w-full md:w-auto mt-2 md:mt-0 transition-colors">
                {['light', 'dark'].map((t) => {
                  const isActive = mounted && theme === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${
                        isActive 
                          ? 'bg-accent-blue text-white shadow-sm' 
                          : 'text-slate-500 hover:text-slate-900 dark:text-text-secondary dark:hover:text-text-primary hover:bg-slate-200/50 dark:hover:bg-transparent'
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>



            {isNoticeAdmin && (
              <Link to="/student/notices/admin" className="group flex items-center justify-between p-6 md:p-8 border-b border-border-subtle bg-accent-amber-soft transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent-amber/20 text-accent-amber flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-syne text-lg font-bold text-accent-amber mb-1">Notice Admin</h2>
                    <p className="text-sm text-accent-amber/80">Compose and manage official notices for your college.</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-accent-amber/50 group-hover:text-accent-amber transition-colors flex-shrink-0" />
              </Link>
            )}
          </div>
          
          <div className="p-6 md:p-8 bg-surface">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-surface-elevated text-text-secondary flex items-center justify-center flex-shrink-0 border border-border-subtle">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-syne text-lg font-bold text-text-primary mb-1">Session</h2>
                  <p className="text-sm text-text-secondary max-w-sm">Securely log off from your Campus Blink account on this device.</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 rounded-xl bg-surface border border-accent-red px-6 py-3 text-sm font-bold text-accent-red transition-all hover:bg-accent-red hover:text-white shadow-sm whitespace-nowrap"
              >
                <LogOut className="h-4 w-4" /> Log off
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
