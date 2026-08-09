import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Trash2, FileText, Server } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import toast from 'react-hot-toast';

export const OfflineLibraryPage = () => {
  const navigate = useNavigate();
  const [offlineItems, setOfflineItems] = useState<any[]>([]);

  useEffect(() => {
    loadOfflineLibrary();
  }, []);

  const loadOfflineLibrary = () => {
    const saved = localStorage.getItem('notes_offline_lib');
    if (saved) {
      setOfflineItems(JSON.parse(saved));
    }
  };

  const removeOffline = async (item: any) => {
    if ('caches' in window) {
      try {
        const cache = await caches.open('campus-blink-notes-files');
        if (item.file_url) {
          await cache.delete(item.file_url);
        }
      } catch(e) {
        console.error(e);
      }
    }
    
    const updated = offlineItems.filter(i => i.id !== item.id);
    setOfflineItems(updated);
    localStorage.setItem('notes_offline_lib', JSON.stringify(updated));
    toast.success('Removed from offline storage');
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Sticky Context Bar */}
      <div className="sticky top-[44px] md:top-0 z-40 h-[52px] w-full px-4 flex items-center bg-[#f5f5f7]/80 backdrop-blur-md border-b border-[#e0e0e0]">
        <button onClick={() => navigate(-1)} className="flex items-center text-[#1d1d1f] active:scale-95 transition-transform">
          <ArrowLeft size={16} className="mr-1" />
          <span style={{ fontFamily: 'SF Pro Display', fontSize: 14, fontWeight: 600, letterSpacing: '0.231px' }}>
            Back
          </span>
        </button>
        <div className="mx-auto flex items-center justify-center">
          <Server size={14} className="mr-1 text-[#7a7a7a]" />
          <span style={{ fontFamily: 'SF Pro Text', fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>Offline Library</span>
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto pb-24">
        {offlineItems.length === 0 ? (
          <div className="text-center py-20 px-4">
            <Server size={48} className="mx-auto text-[#d2d2d7] mb-4" />
            <h3 style={{ color: '#1d1d1f', fontFamily: 'SF Pro Display', fontSize: 21, fontWeight: 600 }}>Your offline library is empty</h3>
            <p className="mt-2" style={{ color: '#7a7a7a', fontFamily: 'SF Pro Text', fontSize: 17 }}>Saved files will appear here for access without internet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {offlineItems.map((item) => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white rounded-[18px] border border-[#e0e0e0] overflow-hidden active:scale-[0.98] transition-transform p-5 flex items-start"
                >
                  <div className="mr-4 mt-1 text-[#0066cc]">
                    <FileText size={24} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 mr-2">
                    <h3 style={{ fontFamily: 'SF Pro Text', fontSize: 17, fontWeight: 600, letterSpacing: '-0.374px', color: '#1d1d1f' }}>{item.title}</h3>
                    <div className="mt-1 flex items-center gap-2 flex-wrap" style={{ color: '#7a7a7a', fontSize: 14 }}>
                      <span className="capitalize">{item.category?.replace('_', ' ')}</span>
                      {item.file_size_bytes && <span>• {(item.file_size_bytes / 1024 / 1024).toFixed(1)} MB</span>}
                    </div>
                    
                    <div className="mt-4 flex items-center gap-3">
                      <button 
                        onClick={() => window.open(item.file_url, '_blank')}
                        className="flex items-center text-[#1d1d1f] font-medium bg-[#f5f5f7] px-3 py-1.5 rounded-[8px]" style={{ fontSize: 14 }}
                      >
                        Open
                      </button>
                      
                      <button 
                        onClick={() => removeOffline(item)}
                        className="flex items-center text-rose-600 font-medium p-1.5"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
