import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams } from 'react-router';
import { ChevronRight, Search, ArrowLeft } from 'lucide-react';

interface Course { id: string; name: string; slug: string; status: string; semester_count: number; }
interface Branch { id: string; course_id: string; name: string; code: string; icon: string; }
interface Subject { id: string; branch_id: string; semester: number; name: string; code: string; credits?: number; }

const API_BASE = '/api/notes';

export const StudentNotesFlow = () => {
  const navigate = useNavigate();
  const { courseSlug, branchCode, semester } = useParams();
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(true);

  // Selections based on URL params
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);

  // Determine current step based on params
  let step: 1 | 2 | 3 | 4 = 1;
  if (courseSlug) step = 2;
  if (courseSlug && branchCode) step = 3;
  if (courseSlug && branchCode && semester) step = 4;

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/courses`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch');
      setCourses(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async (cId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/courses/${cId}/branches`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch');
      setBranches(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async (bId: string, sem: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/branches/${bId}/semesters/${sem}/subjects`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch');
      setSubjects(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Sync state with URL
  useEffect(() => {
    if (courses.length > 0 && courseSlug) {
      const c = courses.find(x => x.slug === courseSlug);
      if (c && c.id !== selectedCourse?.id) {
        setSelectedCourse(c);
        fetchBranches(c.id);
      }
    }
  }, [courseSlug, courses]);

  useEffect(() => {
    if (branches.length > 0 && branchCode) {
      const b = branches.find(x => x.code.toLowerCase() === branchCode.toLowerCase());
      if (b && b.id !== selectedBranch?.id) {
        setSelectedBranch(b);
      }
    }
  }, [branchCode, branches]);

  useEffect(() => {
    if (semester && selectedBranch) {
      const sem = parseInt(semester, 10);
      if (sem !== selectedSemester) {
        setSelectedSemester(sem);
        fetchSubjects(selectedBranch.id, sem);
      }
    }
  }, [semester, selectedBranch]);

  const goBack = () => {
    setDirection(-1);
    if (step === 4) navigate(`/student/notes/${courseSlug}/${branchCode}`);
    else if (step === 3) navigate(`/student/notes/${courseSlug}`);
    else if (step === 2) navigate(`/student/notes`);
  };

  const selectCourse = (course: Course) => {
    setDirection(1);
    navigate(`/student/notes/${course.slug}`);
  };

  const selectBranch = (branch: Branch) => {
    setDirection(1);
    navigate(`/student/notes/${selectedCourse?.slug}/${branch.code.toLowerCase()}`);
  };

  const selectSemester = (sem: number) => {
    setDirection(1);
    navigate(`/student/notes/${selectedCourse?.slug}/${selectedBranch?.code.toLowerCase()}/sem/${sem}`);
  };

  const selectSubject = (subject: Subject) => {
    localStorage.setItem('notes_last_session', JSON.stringify({
      course: selectedCourse,
      branch: selectedBranch,
      semester: selectedSemester,
      subject
    }));
    navigate(`/student/notes/subject/${subject.id}`);
  };

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit: (dir: number) => ({ zIndex: 0, x: dir < 0 ? 300 : -300, opacity: 0 })
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Search & Hero (Only step 1) */}
      {step === 1 && (
        <div className="w-full bg-white px-6 py-10 pt-safe text-center">
          <h1 style={{ fontFamily: 'SF Pro Display', fontSize: 40, fontWeight: 600, letterSpacing: 0, lineHeight: 1.1 }}>
            Notes & Materials
          </h1>
          <p className="mt-2 text-[#7a7a7a]" style={{ fontFamily: 'SF Pro Display', fontSize: 21, fontWeight: 400 }}>
            Browse syllabus, notes, PYQs, and videos.
          </p>
          <div className="mx-auto mt-6 max-w-md relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7a7a7a]" size={16} />
            <input 
              placeholder="Search subjects or topics..."
              className="w-full h-11 pl-10 pr-4 rounded-full border border-[rgba(0,0,0,0.08)] bg-white focus:outline-none focus:border-[#0066cc]"
              style={{ fontFamily: 'SF Pro Text', fontSize: 17 }}
            />
          </div>
        </div>
      )}

      {/* Sticky Context Bar */}
      {step > 1 && (
        <div className="sticky top-[44px] z-40 h-[52px] w-full px-4 flex items-center bg-[#f5f5f7]/80 backdrop-blur-md border-b border-[#e0e0e0]">
          <button onClick={goBack} className="flex items-center text-[#1d1d1f] active:scale-95 transition-transform">
            <ArrowLeft size={20} className="mr-2" />
            <span style={{ fontFamily: 'SF Pro Display', fontSize: 21, fontWeight: 600, letterSpacing: '0.231px' }}>
              {step === 2 ? 'Select Branch' : step === 3 ? 'Select Semester' : selectedBranch?.name}
            </span>
          </button>
        </div>
      )}

      <div className="w-full max-w-3xl mx-auto p-4 overflow-hidden relative" style={{ minHeight: '60vh' }}>
        <AnimatePresence custom={direction} mode="wait">
          {loading ? (
            <motion.div key="loading" className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-[#0066cc] border-t-transparent rounded-full animate-spin"></div>
            </motion.div>
          ) : (
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
              className="w-full"
            >
              {/* Step 1: Course */}
              {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {courses.map(c => (
                    <button 
                      key={c.id} 
                      onClick={() => selectCourse(c)}
                      className="text-left w-full bg-white border border-[#e0e0e0] rounded-[18px] p-6 active:scale-95 transition-transform"
                    >
                      <h3 style={{ fontFamily: 'SF Pro Text', fontSize: 17, fontWeight: 600, letterSpacing: '-0.374px', color: '#1d1d1f' }}>
                        {c.name}
                      </h3>
                      {c.status === 'coming_soon' && (
                        <span className="inline-block mt-2 bg-[#f5f5f7] px-2 py-1 rounded text-[12px] font-medium text-[#7a7a7a]">Coming Soon</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Step 2: Branch */}
              {step === 2 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {branches.map(b => (
                    <button 
                      key={b.id} 
                      onClick={() => selectBranch(b)}
                      className="text-left flex items-center justify-between w-full bg-white border border-[#e0e0e0] rounded-[18px] p-6 active:scale-95 transition-transform"
                    >
                      <div>
                        <h3 style={{ fontFamily: 'SF Pro Text', fontSize: 17, fontWeight: 600, letterSpacing: '-0.374px', color: '#1d1d1f' }}>
                          {b.name}
                        </h3>
                        <p className="mt-1" style={{ color: '#7a7a7a', fontSize: 14 }}>{b.code}</p>
                      </div>
                      <ChevronRight className="text-[#d2d2d7]" />
                    </button>
                  ))}
                </div>
              )}

              {/* Step 3: Semester */}
              {step === 3 && selectedCourse && (
                <div className="grid grid-cols-4 gap-3">
                  {Array.from({ length: selectedCourse.semester_count }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => selectSemester(i + 1)}
                      className="flex items-center justify-center bg-white border border-[#e0e0e0] rounded-full py-3 active:scale-95 transition-transform"
                      style={{ color: '#1d1d1f', fontFamily: 'SF Pro Text', fontSize: 14, fontWeight: 600 }}
                    >
                      Sem {i + 1}
                    </button>
                  ))}
                </div>
              )}

              {/* Step 4: Subject */}
              {step === 4 && (
                <div className="grid grid-cols-1 gap-4">
                  {subjects.length === 0 ? (
                    <div className="text-center py-20">
                      <p style={{ color: '#7a7a7a', fontFamily: 'SF Pro Text', fontSize: 17 }}>No subjects found for this semester.</p>
                    </div>
                  ) : (
                    subjects.map(s => (
                      <button 
                        key={s.id} 
                        onClick={() => selectSubject(s)}
                        className="text-left flex items-center justify-between w-full bg-white border border-[#e0e0e0] rounded-[18px] p-6 active:scale-95 transition-transform"
                      >
                        <div>
                          <h3 style={{ fontFamily: 'SF Pro Text', fontSize: 17, fontWeight: 600, letterSpacing: '-0.374px', color: '#1d1d1f' }}>
                            {s.name}
                          </h3>
                          <p className="mt-1" style={{ color: '#7a7a7a', fontSize: 14 }}>{s.code || 'No code'} {s.credits ? `• ${s.credits} Credits` : ''}</p>
                        </div>
                        <ChevronRight className="text-[#d2d2d7]" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
