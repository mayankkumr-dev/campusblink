import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Download, FileText, Video, Server, ArrowDownToLine, Clock } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import toast from 'react-hot-toast';

const API_BASE = '/api/notes';

type Category = 'syllabus_unit' | 'note' | 'pyq' | 'lab' | 'aakash' | 'video';
const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'syllabus_unit', label: 'Syllabus' },
  { id: 'note', label: 'Notes' },
  { id: 'pyq', label: 'PYQs' },
  { id: 'lab', label: 'Lab' },
  { id: 'aakash', label: 'Aakash' },
  { id: 'video', label: 'Videos' },
];

export const SubjectDetailPage = () => {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Category>('syllabus_unit');
  const [subject, setSubject] = useState<any>(null);
  const [content, setContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSyllabusId, setExpandedSyllabusId] = useState<string | null>(null);
  
  // Track offline cached items
  const [offlineCached, setOfflineCached] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchSubjectDetails();
    checkOfflineCache();
  }, [subjectId]);

  const fetchSubjectDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/subjects/${subjectId}`);
      const data = await res.json();
      setSubject(data.subject);
      setContent(data.content || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load subject details');
    } finally {
      setLoading(false);
    }
  };

  const checkOfflineCache = async () => {
    if ('caches' in window) {
      try {
        const cache = await caches.open('campus-blink-notes-files');
        const keys = await cache.keys();
        const urls = keys.map(r => r.url);
        
        const cachedMap: Record<string, boolean> = {};
        content.forEach(c => {
          if (c.file_url && urls.includes(c.file_url)) {
            cachedMap[c.id] = true;
          }
        });
        setOfflineCached(cachedMap);
      } catch (e) {
        console.error('Offline cache check failed', e);
      }
    }
  };

  const saveOffline = async (item: any) => {
    if (!item.file_url) return;
    if (!('caches' in window)) {
      toast.error('Offline storage not supported in this browser');
      return;
    }
    
    const tid = toast.loading('Saving for offline use...');
    try {
      const cache = await caches.open('campus-blink-notes-files');
      await cache.add(item.file_url);
      setOfflineCached(prev => ({ ...prev, [item.id]: true }));
      toast.success('Saved for offline viewing', { id: tid });
      
      // Save metadata to localStorage so we can build the offline library view
      const offlineLib = JSON.parse(localStorage.getItem('notes_offline_lib') || '[]');
      if (!offlineLib.some((i: any) => i.id === item.id)) {
        offlineLib.push(item);
        localStorage.setItem('notes_offline_lib', JSON.stringify(offlineLib));
      }
      
    } catch (e) {
      console.error(e);
      toast.error('Failed to save offline', { id: tid });
    }
  };

  let filteredContent = content.filter(c => c.category === activeTab);
  
  if (activeTab === 'syllabus_unit') {
    // Sort syllabus items chronologically (oldest/first uploaded shows first)
    filteredContent = filteredContent.sort((a, b) => new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime());
  }

  const getBreadcrumb = () => {
    if (!subject) return 'Loading...';
    return `${subject.notes_branches?.notes_courses?.name || ''} › ${subject.notes_branches?.code || ''} › Sem ${subject.semester} › ${subject.name}`;
  };

  const handleDownload = async (item: any) => {
    if (!item.file_url) return;
    window.open(item.file_url, '_blank');
    
    try {
      await fetch(`${API_BASE}/content/${item.id}/download`, { method: 'POST' });
    } catch(e) {}
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Sticky Context Bar (sub-nav-frosted) */}
      <div className="sticky top-[44px] md:top-0 z-40 h-[52px] w-full px-4 flex items-center justify-between bg-[#f5f5f7]/80 backdrop-blur-md border-b border-[#e0e0e0]">
        <button onClick={() => navigate(-1)} className="flex items-center text-[#1d1d1f] active:scale-95 transition-transform truncate mr-2" style={{ maxWidth: '80%' }}>
          <ArrowLeft size={16} className="mr-1 shrink-0" />
          <span className="truncate" style={{ fontFamily: 'SF Pro Display', fontSize: 14, fontWeight: 600, letterSpacing: '0.231px' }}>
            {getBreadcrumb()}
          </span>
        </button>
        <button onClick={() => navigate('/student/notes')} className="shrink-0 text-[#0066cc]" style={{ fontFamily: 'SF Pro Text', fontSize: 14, fontWeight: 400 }}>
          Change
        </button>
      </div>

      {/* Tabs */}
      <div className="w-full bg-[#f5f5f7] border-b border-[#e0e0e0] sticky top-[96px] md:top-[52px] z-30">
        <div className="flex overflow-x-auto px-4 py-3 gap-2 no-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className="shrink-0 transition-all active:scale-95"
              style={{
                backgroundColor: activeTab === cat.id ? '#1d1d1f' : '#ffffff',
                color: activeTab === cat.id ? '#ffffff' : '#1d1d1f',
                fontFamily: 'SF Pro Text',
                fontSize: 14,
                fontWeight: activeTab === cat.id ? 600 : 400,
                letterSpacing: '-0.224px',
                borderRadius: 9999,
                padding: '8px 16px',
                border: activeTab === cat.id ? 'none' : '1px solid #e0e0e0'
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-w-4xl mx-auto pb-24">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-[#0066cc] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {filteredContent.length === 0 ? (
                <div className="text-center py-20 px-4">
                  <p style={{ color: '#7a7a7a', fontFamily: 'SF Pro Text', fontSize: 17 }}>No {CATEGORIES.find(c => c.id === activeTab)?.label.toLowerCase()} available yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredContent.map((item, idx) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white rounded-[18px] border border-[#e0e0e0] overflow-hidden active:scale-[0.98] transition-transform"
                    >
                      {item.category === 'video' ? (
                        <div>
                          <div className="relative w-full aspect-video bg-black">
                            <img src={item.metadata?.thumbnailUrl || 'https://images.unsplash.com/photo-1610484826967-09c5720778c7?w=800'} alt="thumbnail" className="w-full h-full object-cover" />
                            {item.metadata?.durationSeconds && (
                              <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                {Math.floor(item.metadata.durationSeconds / 60)}:{(item.metadata.durationSeconds % 60).toString().padStart(2, '0')}
                              </span>
                            )}
                          </div>
                          <div className="p-4 flex items-start justify-between">
                            <div className="flex-1 mr-4">
                              <h3 style={{ fontFamily: 'SF Pro Text', fontSize: 17, fontWeight: 600, letterSpacing: '-0.374px', color: '#1d1d1f' }} className="line-clamp-2">{item.title}</h3>
                              <p className="mt-1" style={{ color: '#7a7a7a', fontSize: 14 }}>{item.view_count} views</p>
                            </div>
                            <button 
                              onClick={() => window.open(item.embed_url, '_blank')}
                              className="shrink-0 flex items-center justify-center bg-[#f5f5f7] w-10 h-10 rounded-full text-[#0066cc]"
                            >
                              <Video size={18} />
                            </button>
                          </div>
                        </div>
                      ) : item.category === 'syllabus_unit' ? (
                        <div className="cursor-pointer" onClick={() => setExpandedSyllabusId(expandedSyllabusId === item.id ? null : item.id)}>
                          <div className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                            <h3 style={{ fontFamily: 'SF Pro Text', fontSize: 17, fontWeight: 600, color: '#1d1d1f' }}>{item.title}</h3>
                            <div className="text-slate-400">
                              {expandedSyllabusId === item.id ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                              ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                              )}
                            </div>
                          </div>
                          <AnimatePresence>
                            {expandedSyllabusId === item.id && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden bg-slate-50 border-t border-slate-100"
                              >
                                <div className="p-5 mt-1 text-[#424245] text-sm whitespace-pre-wrap leading-relaxed">
                                  {item.metadata?.description || 'No content provided.'}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ) : (
                        <div className="p-5 flex items-start">
                          <div className="mr-4 mt-1 text-[#7a7a7a]">
                            <FileText size={24} strokeWidth={1.5} />
                          </div>
                          <div className="flex-1 mr-2">
                            <h3 style={{ fontFamily: 'SF Pro Text', fontSize: 17, fontWeight: 600, letterSpacing: '-0.374px', color: '#1d1d1f' }}>{item.title}</h3>
                            <div className="mt-1 flex items-center gap-2 flex-wrap" style={{ color: '#7a7a7a', fontSize: 14 }}>
                              {item.file_size_bytes && <span>{(item.file_size_bytes / 1024 / 1024).toFixed(1)} MB</span>}
                              {item.file_size_bytes && <span>•</span>}
                              <span>{item.download_count} downloads</span>
                              {item.metadata?.year && <span>• {item.metadata.year}</span>}
                            </div>
                            
                            {/* Action Row */}
                            <div className="mt-4 flex items-center gap-3">
                              <button 
                                onClick={() => handleDownload(item)}
                                className="flex items-center text-[#0066cc] font-medium" style={{ fontSize: 14 }}
                              >
                                <Download size={14} className="mr-1" /> View/Download
                              </button>
                              
                              <button 
                                onClick={() => saveOffline(item)}
                                disabled={offlineCached[item.id]}
                                className={`flex items-center font-medium ${offlineCached[item.id] ? 'text-green-600' : 'text-[#1d1d1f]'}`} style={{ fontSize: 14 }}
                              >
                                {offlineCached[item.id] ? (
                                  <><Server size={14} className="mr-1" /> Saved Offline</>
                                ) : (
                                  <><ArrowDownToLine size={14} className="mr-1" /> Save Offline</>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
