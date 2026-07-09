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
          .select('id, full_name, email, role')
          .or(`full_name.ilike.${searchQuery},email.ilike.${searchQuery}`)
          .limit(5);

        if (users) {
          users.forEach((u) => {
            tempResults.push({
              type: 'user',
              id: u.id,
              title: u.full_name || 'Unnamed User',
              subtitle: `${u.email} • ${u.role}`,
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
      case 'user': return <User className="w-4 h-4 text-[var(--accent)]" />;
      case 'order': return <ShoppingBag className="w-4 h-4 text-[#16A34A]" />;
      case 'post': return <MessageSquare className="w-4 h-4 text-[var(--yellow)]" />;
      default: return <Search className="w-4 h-4 text-[var(--text-secondary)]" />;
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
      <div className="relative w-full max-w-xl bg-[var(--bg)] rounded-xl shadow-2xl overflow-hidden border border-black/10 animate-in zoom-in-95 duration-200">
        <div className="flex items-center px-4 py-3 border-b border-black/[0.08]">
          <Search className="w-5 h-5 text-[var(--text-muted)] mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users, orders, posts... (Cmd+K)"
            className="flex-1 bg-transparent border-none outline-none text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-sans"
          />
          <div className="flex items-center justify-center p-1 rounded bg-[var(--bg-tertiary)] border border-black/10 text-[10px] font-bold text-[var(--text-secondary)] px-2 shrink-0">
            ESC
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="p-8 flex justify-center items-center">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--yellow)]" />
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Results
              </div>
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelect(result.url)}
                  className="w-full flex items-center px-4 py-3 hover:bg-[var(--bg-tertiary)] transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-[var(--bg-primary)] border border-black/[0.08] flex items-center justify-center mr-4 shrink-0">
                    {getIcon(result.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-[var(--text-primary)] truncate">{result.title}</div>
                    <div className="text-xs text-[var(--text-secondary)] truncate mt-0.5">{result.subtitle}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <div className="p-8 text-center text-[var(--text-secondary)]">
              <AlertCircle className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3" />
              <p className="text-sm font-medium">No results found for "{query}"</p>
            </div>
          ) : (
            <div className="p-8 text-center text-[var(--text-muted)]">
              <p className="text-sm">Type at least 2 characters to search</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};