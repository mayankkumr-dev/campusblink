import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchStore } from '../../store/searchStore';
import { Search, X, Clock, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import { searchStudents } from '../../api/search';
import { useAuthStore } from '../../store/authStore';
import { getAvatarDataUrl } from '../../lib/avatar';
import { getDisplayHandle } from '../../lib/user';

export const SearchPeoplePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const profile = useAuthStore((state) => state.profile);
  
  const initialQuery = searchParams.get('q') || '';
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const { recentSearches, addSearchTerm, removeSearchTerm, clearHistory } = useSearchStore();

  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  const runSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setStudents([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await searchStudents(term, { limit: 20, currentUserId: profile?.id || null });
      setStudents(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (activeQuery) {
      runSearch(activeQuery);
    } else {
      setStudents([]);
    }
  }, [activeQuery, runSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const trimmed = value.trim();
      setActiveQuery(trimmed);
      if (trimmed) {
        setSearchParams({ q: trimmed }, { replace: true });
      } else {
        setSearchParams({}, { replace: true });
      }
    }, 300);
  };

  const handleRecentSearchClick = (term: string) => {
    setSearchTerm(term);
    setActiveQuery(term);
    setSearchParams({ q: term }, { replace: true });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchTerm.trim();
    if (!trimmed) return;
    addSearchTerm(trimmed);
    inputRef.current?.blur();
  };

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col">
      {/* Header area with input */}
      <div className="flex items-center px-4 pt-12 pb-4 border-b border-gray-100 bg-white shadow-sm sticky top-0 z-10">
        <button 
          onClick={() => navigate('/student/home')}
          className="mr-3 p-1 -ml-1 text-gray-500 hover:text-gray-900 active:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <form onSubmit={onSubmit} className="flex-1 relative flex items-center">
          <Search className="absolute left-3 w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            placeholder="Search students..."
            className="w-full bg-gray-100 border-none text-gray-900 placeholder-gray-400 py-2.5 pl-10 pr-10 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-100 text-base"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setActiveQuery('');
                setSearchParams({}, { replace: true });
                inputRef.current?.focus();
              }}
              className="absolute right-3 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </form>
      </div>

      {/* Recent Searches (Conditionally Rendered) */}
      {!activeQuery && recentSearches.length > 0 && (
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
                onClick={() => handleRecentSearchClick(term)}
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

      {/* Search Results */}
      {activeQuery && (
        <div className="flex-1 overflow-y-auto bg-gray-50/50 p-4">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : students.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-gray-100">
              {students.map((student, index) => {
                const avatar = student.avatar_url || getAvatarDataUrl({ name: student.name, seed: student.id });
                return (
                  <div
                    key={student.id}
                    onClick={() => navigate(`/student/profile/${student.id}`)}
                    className={`flex items-center gap-3 py-3 px-4 active:bg-gray-50 cursor-pointer ${
                      index !== students.length - 1 ? 'border-b border-gray-50' : ''
                    }`}
                  >
                    <img src={avatar} alt={student.name} className="w-10 h-10 rounded-full border border-gray-100 object-cover" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[15px] font-semibold text-gray-900 truncate leading-tight">{student.name}</h4>
                      <p className="text-[13px] text-gray-500 truncate">@{getDisplayHandle(student.username, 'student')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">
              <p className="text-[15px]">No students found for "{activeQuery}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
