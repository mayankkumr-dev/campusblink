import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchStore } from '../../store/searchStore';
import { Search, X, Clock } from 'lucide-react';
import { useNavigate } from 'react-router';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  
  const { recentSearches, addSearchTerm, removeSearchTerm, clearHistory } = useSearchStore();

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      // Slight delay to ensure element is mounted and animation has started
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSearch = (term: string) => {
    if (!term.trim()) return;
    addSearchTerm(term);
    onClose();
    // Blur to close keyboard
    inputRef.current?.blur();
    
    // Simulate routing or search trigger
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchTerm);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '-100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-50 bg-white/98 backdrop-blur-xl flex flex-col"
        >
          {/* Header area with input */}
          <div className="flex items-center px-4 pt-12 pb-4 border-b border-gray-100 bg-white shadow-sm">
            <form onSubmit={onSubmit} className="flex-1 relative flex items-center">
              <Search className="absolute left-3 w-5 h-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search students, societies..."
                className="w-full bg-gray-100 border-none text-gray-900 placeholder-gray-400 py-2.5 pl-10 pr-4 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-100 text-base"
              />
            </form>
            <button
              onClick={onClose}
              className="ml-4 text-blue-600 font-medium text-base active:opacity-70 transition-opacity"
            >
              Cancel
            </button>
          </div>

          {/* Recent Searches (Conditionally Rendered) */}
          {!searchTerm && recentSearches.length > 0 && (
            <div className="flex-1 overflow-y-auto bg-gray-50/50 px-4 py-6">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Recent</h3>
                <button
                  onClick={clearHistory}
                  className="text-sm font-medium text-blue-500 active:opacity-70 transition-opacity"
                >
                  Clear All
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-gray-100">
                {recentSearches.map((term, index) => (
                  <div
                    key={term}
                    className={`flex items-center justify-between py-3.5 px-4 active:bg-gray-50 cursor-pointer ${
                      index !== recentSearches.length - 1 ? 'border-b border-gray-50' : ''
                    }`}
                    onClick={() => handleSearch(term)}
                  >
                    <div className="flex items-center gap-3 flex-1 overflow-hidden">
                      <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="text-gray-900 text-base truncate font-medium">{term}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSearchTerm(term);
                      }}
                      className="p-2 -mr-2 text-gray-400 hover:text-gray-600 active:bg-gray-100 rounded-full transition-colors shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
