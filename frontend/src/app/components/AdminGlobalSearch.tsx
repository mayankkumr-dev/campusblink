import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, User, ShoppingBag, MessageSquare, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router';

// This function needs to be populated with real backend fetching logic later.
// For now, we will create a mock-like structure and hook it up to Supabase.
import { supabase } from '../../lib/supabase';

export const AdminGlobalSearch: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ type: string; id: string; title: string; subtitle: string; url: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleOpenEvent = () => setIsOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-global-search', handleOpenEvent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-global-search', handleOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const searchDb = async () => {
      if (!query.trim() || query.length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const searchQuery = `%${query}%`;
        const tempResults: typeof results = [];

        // 1. Search Users
        const { data: users } = await supabase
          .from('profiles')
          .select('id, full_name, name, username, email, role')
          .or(`username.ilike.${searchQuery},email.ilike.${searchQuery},name.ilike.${searchQuery},full_name.ilike.${searchQuery}`)
          .limit(10);

        if (users) {
          const qLower = query.trim().toLowerCase();
          users.sort((a, b) => {
            const aUser = String(a.username || '').toLowerCase();
            const bUser = String(b.username || '').toLowerCase();
            const aEmail = String(a.email || '').toLowerCase();
            const bEmail = String(b.email || '').toLowerCase();
            const aPrio = aUser.startsWith(qLower) || aEmail.startsWith(qLower) ? 0 : aUser.includes(qLower) || aEmail.includes(qLower) ? 1 : 2;
            const bPrio = bUser.startsWith(qLower) || bEmail.startsWith(qLower) ? 0 : bUser.includes(qLower) || bEmail.includes(qLower) ? 1 : 2;
            return aPrio - bPrio;
          });
          users.slice(0, 5).forEach((u) => {
            tempResults.push({
              type: 'user',
              id: u.id,
              title: u.name || u.full_name || u.username || 'Unnamed User',
              subtitle: `${u.username ? '@' + u.username + ' • ' : ''}${u.email} • ${u.role}`,
              url: `/admin/users/${u.id}`,
            });
          });
        }

        // 2. Search Canteen Orders
        const { data: orders } = await supabase
          .from('canteen_orders')
          .select('id, status, profiles!user_id(full_name)')
          .textSearch('id::text', query)
          .limit(5);

        if (orders) {
          orders.forEach((o) => {
            tempResults.push({
              type: 'order',
              id: o.id,
              title: `Order #${o.id.split('-')[0]}`,
              subtitle: `${o.profiles?.full_name || 'Unknown'} • ${o.status}`,
              url: `/admin/canteen/orders`, // Cannot deep link directly to order without specific page right now
            });
          });
        }

        // 3. Search Posts
        const { data: posts } = await supabase
          .from('community_posts')
          .select('id, content, profiles!user_id(full_name)')
          .ilike('content', searchQuery)
          .limit(5);

        if (posts) {
          posts.forEach((p) => {
            tempResults.push({
              type: 'post',
              id: p.id,
              title: p.content.substring(0, 40) + '...',
              subtitle: `Post by ${p.profiles?.full_name || 'Student'}`,
              url: `/admin/community`,
            });
          });
        }

        setResults(tempResults);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceSearch = setTimeout(searchDb, 300);
    return () => clearTimeout(debounceSearch);
  }, [query]);

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'user': return <User className="w-4 h-4 text-amber-500 dark:text-amber-400 transition-colors" />;
      case 'order': return <ShoppingBag className="w-4 h-4 text-accent-green" />;
      case 'post': return <MessageSquare className="w-4 h-4 text-amber-500 dark:text-amber-400 transition-colors" />;
      default: return <Search className="w-4 h-4 text-slate-500 dark:text-slate-400 transition-colors" />;
    }
  };

  const handleSelect = (url: string) => {
    setIsOpen(false);
    navigate(url);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => setIsOpen(false)}
      />
      
      {/* Search Modal */}
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden border border-black/10 animate-in zoom-in-95 duration-200">
        <div className="flex items-center px-4 py-3 border-b border-black/[0.08]">
          <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users, orders, posts... (Cmd+K)"
            className="flex-1 bg-transparent border-none outline-none text-base text-slate-900 placeholder:text-slate-400 font-sans"
          />
          <div className="flex items-center justify-center p-1 rounded bg-slate-100 border border-black/10 text-[10px] font-bold text-slate-500 px-2 shrink-0">
            ESC
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="p-8 flex justify-center items-center">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500 dark:text-amber-400 transition-colors" />
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Results
              </div>
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelect(result.url)}
                  className="w-full flex items-center px-4 py-3 hover:bg-slate-100 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-50 border border-black/[0.08] flex items-center justify-center mr-4 shrink-0">
                    {getIcon(result.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">{result.title}</div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">{result.subtitle}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <div className="p-8 text-center text-slate-500">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-medium">No results found for "{query}"</p>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400">
              <p className="text-sm">Type at least 2 characters to search</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};