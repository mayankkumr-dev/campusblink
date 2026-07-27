import React, { useState, useEffect } from 'react';
import { 
  Search, ExternalLink, Flag,
  Trash2, ShieldAlert, CheckCircle2, PauseCircle, PlayCircle, Loader2, Store
} from 'lucide-react';
import { getAllMarketplaceListings, updateListingStatus, deleteMarketplaceListing } from '../../api/admin';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

type AdminMarketplacePageProps = {
  initialFilterStatus?: 'All' | 'Active' | 'Sold' | 'Reported' | 'Disabled';
  title?: string;
};

export const AdminMarketplacePage: React.FC<AdminMarketplacePageProps> = ({ initialFilterStatus = 'All', title }) => {
  const adminProfile = useAuthStore(state => state.profile);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState(initialFilterStatus);
  const [collegeFilter, setCollegeFilter] = useState('all');
  const [listings, setListings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    fetchListings();
  }, []);

  useEffect(() => {
    setFilterStatus(initialFilterStatus);
  }, [initialFilterStatus]);

  const fetchListings = async () => {
    setIsLoading(true);
    const { data } = await getAllMarketplaceListings();
    if (data) setListings(data);
    setIsLoading(false);
  };

  const filteredListings = listings.filter(l => {
    const searchMatch = l.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                       l.seller?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let isMatch = false;
    if (filterStatus === 'All') isMatch = true;
    else if (filterStatus === 'Active') isMatch = !l.is_sold && !l.is_admin_disabled;
    else if (filterStatus === 'Sold') isMatch = l.is_sold || l.status === 'sold';
    else if (filterStatus === 'Disabled') isMatch = Boolean(l.is_admin_disabled);
    else if (filterStatus === 'Reported') isMatch = l.report_count > 0;

    const collegeMatch =
      collegeFilter === 'all' ||
      (l.seller?.college || '').toLowerCase() === collegeFilter.toLowerCase();

    return searchMatch && isMatch && collegeMatch;
  });

  const collegeOptions = Array.from(
    new Set(
      listings
        .map((listing) => listing.seller?.college)
        .filter((value): value is string => Boolean(value && value.trim()))
    )
  ).sort((a, b) => a.localeCompare(b));

  const handleUpdateStatus = async (listingId: string, title: string, newStatus: string) => {
    if (!adminProfile) return;
    const verb = newStatus === 'disabled' ? 'disable' : newStatus === 'enabled' ? 'enable' : 'update';
    const confirmed = window.confirm(`Are you sure you want to ${verb} "${title}"?`);
    if (!confirmed) return;

    const loadingToast = toast.loading(`Updating ${title}...`);
    const { error } = await updateListingStatus(adminProfile.id, listingId, title, newStatus);
    if (error) {
      toast.error(error.message, { id: loadingToast });
    } else {
      toast.success(`Successfully ${newStatus === 'disabled' ? 'disabled' : newStatus === 'enabled' ? 'enabled' : 'updated'} listing`, { id: loadingToast });
      fetchListings();
    }
    setActiveDropdown(null);
  };

  const handleDelete = async (listingId: string, title: string) => {
    if (!adminProfile) return;
    if (!confirm(`Are you sure you want to permanently delete "${title}"?`)) return;
    const loadingToast = toast.loading(`Deleting ${title}...`);
    const { error } = await deleteMarketplaceListing(adminProfile.id, listingId, title);
    if (error) {
      toast.error(error.message, { id: loadingToast });
    } else {
      toast.success(`${title} permanently deleted`, { id: loadingToast });
      fetchListings();
    }
    setActiveDropdown(null);
  };

  const StatusBadge = ({ status, reports }: { status: string, reports: number }) => {
    if (reports > 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-[#FEF0E6] dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 mr-2">
          <Flag className="w-3 h-3 mr-1" /> {reports} Reports
        </span>
      );
    }
    
    const normalizedStatus = status || 'active';
    const badges: any = {
      'active': 'bg-accent-green/15 text-accent-green',
      'sold': 'bg-slate-100 dark:bg-surface-elevated text-slate-900 dark:text-text-primary',
      'disabled': 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
    };
    return (
       <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider transition-colors ${badges[normalizedStatus] || 'bg-slate-100 dark:bg-surface-elevated text-slate-900 dark:text-text-primary'}`}>
         {normalizedStatus === 'active' && <span className="w-1.5 h-1.5 rounded-md bg-emerald-600 mr-1" />}
         {normalizedStatus}
       </span>
    );
  };

  return (
    <div>
      {/* ── MOBILE VIEWPORT ONLY ── */}
      <div className="md:hidden flex flex-col font-sans text-slate-900 dark:text-text-primary bg-slate-50 dark:bg-background pb-8 min-h-screen transition-colors">
        {title && (
          <div className="bg-white dark:bg-surface px-4 pt-4 pb-2 transition-colors">
            <h2 className="font-syne font-bold text-xl text-slate-900 dark:text-text-primary transition-colors">{title}</h2>
          </div>
        )}

        {/* Sticky Header with Search & Filter Ribbon */}
        <div className="sticky top-[64px] z-30 bg-slate-50/95 dark:bg-background/95 backdrop-blur-md pt-4 pb-3 px-4 border-b border-slate-200/80 dark:border-border-subtle shadow-[0_2px_12px_rgba(0,0,0,0.02)] dark:shadow-none space-y-3 transition-colors">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-text-secondary transition-colors" />
            <input 
              type="text" 
              placeholder="Search listings, sellers..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-surface-elevated border border-slate-200/80 dark:border-border-subtle rounded-2xl py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-900 dark:text-text-primary placeholder-slate-400 dark:placeholder-text-secondary focus:outline-none focus:border-amber-400 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
            <select
              value={collegeFilter}
              onChange={(e) => setCollegeFilter(e.target.value)}
              className="shrink-0 rounded-xl border border-slate-200/80 dark:border-border-subtle bg-white dark:bg-surface px-3 py-2 text-[11px] font-bold text-slate-700 dark:text-text-secondary outline-none transition-colors"
            >
              <option value="all">All Colleges</option>
              {collegeOptions.map((college) => (
                <option key={college} value={college}>{college}</option>
              ))}
            </select>
            <div className="h-4 w-px bg-slate-200 dark:bg-border-subtle mx-1 shrink-0 transition-colors" />
            {['All', 'Active', 'Sold', 'Reported', 'Disabled'].map(pill => (
              <button 
                key={pill} 
                onClick={() => setFilterStatus(pill as 'All' | 'Active' | 'Sold' | 'Reported' | 'Disabled')}
                className={`shrink-0 px-3.5 py-2 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition-colors ${filterStatus === pill ? (pill === 'Reported' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white') : 'bg-white dark:bg-surface text-slate-500 dark:text-text-secondary border border-slate-200/80 dark:border-border-subtle hover:text-slate-900 dark:hover:text-text-primary'}`}
              >
                {pill}
              </button>
            ))}
          </div>
        </div>

        {/* Listing Cards */}
        <div className="p-4 space-y-3 flex-1">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500 dark:text-amber-400 transition-colors" />
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 dark:border-border-subtle bg-white dark:bg-surface p-10 text-center flex flex-col items-center mt-4 transition-colors">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-full mb-3 transition-colors">
                <Store className="h-8 w-8 text-amber-500 dark:text-amber-400 transition-colors" />
              </div>
              <p className="text-sm font-extrabold text-slate-900 dark:text-text-primary transition-colors">No listings found</p>
              <p className="text-[10px] font-medium text-slate-500 dark:text-text-secondary mt-1 max-w-[200px] transition-colors">Adjust your search or filter criteria to see results.</p>
            </div>
          ) : (
            filteredListings.map((listing) => (
              <div key={listing.id} className="rounded-2xl border border-slate-100 dark:border-border-subtle bg-white dark:bg-surface p-4 relative transition-colors">
                {/* Top Row: Listing Title and Price */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-surface-elevated flex items-center justify-center font-syne font-bold text-2xl text-slate-400 dark:text-text-secondary shrink-0 overflow-hidden transition-colors">
                    {listing.images && listing.images.length > 0 ? (
                      <img loading="lazy" src={listing.images[0]} className="w-full h-full object-cover" />
                    ) : (
                      listing.title?.charAt(0) || '📦'
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pr-16">
                    <h3 className="font-sans font-bold text-sm text-slate-900 dark:text-text-primary leading-tight mb-1 truncate transition-colors">{listing.title}</h3>
                    <div className="text-[10px] font-bold text-slate-400 dark:text-text-secondary bg-slate-50 dark:bg-surface-elevated px-2 py-0.5 rounded-md inline-block transition-colors">
                      ID: {String(listing.id).slice(0,8)}
                    </div>
                  </div>
                  <div className="absolute top-4 right-4 text-right">
                    <span className="font-syne text-lg font-extrabold text-emerald-600 dark:text-emerald-400">₹{listing.price}</span>
                  </div>
                </div>

                {/* Middle Row: Seller Details */}
                <div className="bg-slate-50/50 dark:bg-surface-elevated/50 rounded-xl p-3 mb-4 border border-slate-100 dark:border-border-subtle transition-colors">
                  <p className="text-xs font-bold text-slate-900 dark:text-text-primary transition-colors">{listing.seller?.name || 'Unknown User'}</p>
                  <p className="text-[10px] font-medium text-slate-500 dark:text-text-secondary mt-0.5 transition-colors">{listing.seller?.email || 'No email'}</p>
                </div>

                {/* Bottom Row: Status/Health Badges & Action Toggle */}
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-border-subtle pt-3 transition-colors">
                  <StatusBadge status={listing.is_admin_disabled ? 'disabled' : (listing.status || (listing.is_sold ? 'sold' : 'active'))} reports={listing.report_count} />
                  
                  <button 
                    onClick={() => setActiveDropdown(activeDropdown === listing.id ? null : listing.id)}
                    className="flex items-center gap-1.5 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors text-[11px] font-bold"
                  >
                    Manage <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  </button>
                </div>

                {/* Mobile Moderation Dropdown */}
                {activeDropdown === listing.id && (
                  <div className="absolute bottom-12 right-4 w-48 bg-white dark:bg-surface border border-slate-200 dark:border-border-subtle rounded-2xl shadow-xl z-20 py-2 font-sans text-xs overflow-hidden transition-colors">
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-border-subtle mb-1 transition-colors">
                       <span className="text-[9px] font-extrabold text-slate-400 dark:text-text-secondary uppercase tracking-wider transition-colors">Mod Actions</span>
                    </div>
                    
                    {!listing.is_sold && !listing.is_admin_disabled && (
                      <button onClick={() => { handleUpdateStatus(listing.id, listing.title, 'sold'); setActiveDropdown(null); }} className="w-full text-left px-4 py-2.5 text-slate-700 dark:text-text-primary hover:bg-slate-50 dark:hover:bg-surface-elevated flex items-center gap-2 font-bold transition-colors">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 transition-colors" /> Mark as Sold
                      </button>
                    )}
                    
                    {listing.is_admin_disabled ? (
                      <button onClick={() => { handleUpdateStatus(listing.id, listing.title, 'enabled'); setActiveDropdown(null); }} className="w-full text-left px-4 py-2.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2 font-bold transition-colors">
                        <PlayCircle className="w-4 h-4" /> Enable Listing
                      </button>
                    ) : (
                      <button onClick={() => { handleUpdateStatus(listing.id, listing.title, 'disabled'); setActiveDropdown(null); }} className="w-full text-left px-4 py-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 font-bold transition-colors">
                        <PauseCircle className="w-4 h-4" /> Disable Listing
                      </button>
                    )}
                    
                    <div className="h-px bg-slate-100 dark:bg-border-subtle my-1 transition-colors" />

                    <button onClick={() => { handleDelete(listing.id, listing.title); setActiveDropdown(null); }} className="w-full text-left px-4 py-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 font-bold transition-colors">
                      <Trash2 className="w-4 h-4" /> Delete Permanently
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── DESKTOP PC VIEWPORT ONLY ── */}
      <div className="hidden md:block space-y-6 animate-in fade-in duration-500">
        {title && (
          <div className="bg-white dark:bg-surface border border-black/[0.08] dark:border-border-subtle rounded-lg p-4 transition-colors">
            <h2 className="font-syne font-bold text-xl text-slate-900 dark:text-text-primary transition-colors">{title}</h2>
          </div>
        )}
        
        {/* Top Bar */}
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 bg-white dark:bg-surface p-4 rounded-lg border border-black/[0.08] dark:border-border-subtle transition-colors">
          <div className="relative w-full lg:w-96 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-text-secondary transition-colors" />
            <input 
              type="text" 
              placeholder="Search listings, sellers, keywords..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-100 dark:bg-surface-elevated border border-black/10 dark:border-border-subtle rounded-lg py-2 pl-9 pr-4 text-sm text-slate-900 dark:text-text-primary placeholder-slate-400 dark:placeholder-text-secondary focus:outline-none focus:border-amber-400/50 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {['All', 'Active', 'Sold', 'Reported', 'Disabled'].map(pill => (
              <button 
                key={pill} 
                onClick={() => setFilterStatus(pill as 'All' | 'Active' | 'Sold' | 'Reported' | 'Disabled')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider font-sans transition-colors ${filterStatus === pill ? 'bg-amber-500 text-slate-900' : pill === 'Reported' && filterStatus === 'Reported' ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-surface-elevated text-slate-500 dark:text-text-secondary hover:text-slate-900 dark:hover:text-text-primary border border-black/[0.08] dark:border-border-subtle'}`}
              >
                {pill}
              </button>
            ))}
            <select
              value={collegeFilter}
              onChange={(e) => setCollegeFilter(e.target.value)}
              className="ml-2 bg-slate-100 dark:bg-surface-elevated border border-black/10 dark:border-border-subtle rounded-lg py-1.5 px-2 text-[11px] text-slate-900 dark:text-text-primary font-bold uppercase tracking-wider transition-colors"
            >
              <option value="all">All Colleges</option>
              {collegeOptions.map((college) => (
                <option key={college} value={college}>
                  {college}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Area */}
        <div className="bg-white dark:bg-surface border border-black/[0.08] dark:border-border-subtle rounded-lg overflow-x-auto min-h-[400px] transition-colors">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500 dark:text-amber-400 transition-colors" />
            </div>
          ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-surface-elevated border-b border-[rgba(15,23,42,0.08)] dark:border-border-subtle">
              <tr className="border-b border-black/[0.08] dark:border-border-subtle bg-slate-100 dark:bg-surface-elevated transition-colors">
                <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-text-secondary uppercase tracking-wider font-sans text-left">Listing Title</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-text-secondary uppercase tracking-wider font-sans text-left">Seller Details</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-text-secondary uppercase tracking-wider font-sans text-left">Price</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-text-secondary uppercase tracking-wider font-sans text-left">Status / Health</th>
                <th className="px-4 py-3 w-20 text-center text-xs font-bold text-slate-500 dark:text-text-secondary uppercase tracking-wider font-sans">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06] dark:divide-border-subtle relative">
              {filteredListings.map((listing) => (
                <tr key={listing.id} className="hover:bg-slate-50 dark:hover:bg-surface-elevated/70 transition-colors group">
                  <td className="p-4 min-w-[250px] max-w-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-surface-elevated flex items-center justify-center font-syne font-bold text-2xl text-slate-400 dark:text-text-secondary border border-black/[0.08] dark:border-border-subtle shrink-0 overflow-hidden transition-colors">
                        {listing.images && listing.images.length > 0 ? (
                          <img loading="lazy" src={listing.images[0]} className="w-full h-full object-cover" />
                        ) : (
                          listing.title?.charAt(0) || '📦'
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-sans font-bold text-sm text-slate-900 dark:text-text-primary mb-0.5 truncate pr-4 transition-colors">{listing.title}</div>
                        <div className="font-sans text-[10px] text-slate-500 dark:text-text-secondary uppercase tracking-wider transition-colors">ID: {listing.id} • {new Date(listing.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                     <div className="font-sans text-sm text-slate-900 dark:text-text-primary font-medium mb-0.5 transition-colors">{listing.seller?.name || 'Unknown User'}</div>
                     <div className="font-sans text-xs text-slate-500 dark:text-text-secondary transition-colors">{listing.seller?.email || 'No email'}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-syne font-bold text-xl text-accent-green">₹{listing.price}</div>
                  </td>
                  <td className="p-4">
                    <StatusBadge status={listing.is_admin_disabled ? 'disabled' : (listing.status || (listing.is_sold ? 'sold' : 'active'))} reports={listing.report_count} />
                  </td>
                  <td className="p-4 text-center relative">
                     <div className="flex items-center gap-2 justify-center">
                       <button title="View Live Post" className="p-1.5 rounded-lg text-slate-500 dark:text-text-secondary hover:text-amber-500 dark:hover:text-amber-400 transition-colors">
                         <ExternalLink className="w-4 h-4" />
                       </button>
                       <button 
                          onClick={() => setActiveDropdown(activeDropdown === listing.id ? null : listing.id)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-surface-elevated text-slate-900 dark:text-text-primary hover:bg-slate-200 dark:hover:bg-surface transition-colors text-xs font-bold font-sans flex items-center gap-1"
                       >
                          Mod <ShieldAlert className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 transition-colors" />
                       </button>
                     </div>

                    {/* Moderation Dropdown */}
                    {activeDropdown === listing.id && (
                      <div className="absolute right-4 top-12 w-48 bg-white dark:bg-surface border border-black/10 dark:border-border-subtle rounded-lg shadow-md z-20 py-1 font-sans text-sm overflow-hidden animate-in zoom-in-95 duration-100 text-left transition-colors">
                        
                        <div className="px-3 py-2 border-b border-black/[0.08] dark:border-border-subtle">
                           <span className="text-[10px] font-bold text-slate-500 dark:text-text-secondary uppercase tracking-wider">Mod Actions</span>
                        </div>
                        
                        {!listing.is_sold && !listing.is_admin_disabled && (
                          <button onClick={() => handleUpdateStatus(listing.id, listing.title, 'sold')} className="w-full text-left px-4 py-2 text-slate-900 dark:text-text-primary hover:bg-slate-50 dark:hover:bg-surface-elevated flex items-center gap-2 font-bold transition-colors">
                            <CheckCircle2 className="w-4 h-4 text-accent-green" /> Mark as Sold
                          </button>
                        )}
                        
                        {listing.is_admin_disabled ? (
                          <button onClick={() => handleUpdateStatus(listing.id, listing.title, 'enabled')} className="w-full text-left px-4 py-2 text-accent-green hover:bg-emerald-600/10 flex items-center gap-2 font-bold transition-colors">
                            <PlayCircle className="w-4 h-4" /> Enable Listing
                          </button>
                        ) : (
                          <button onClick={() => handleUpdateStatus(listing.id, listing.title, 'disabled')} className="w-full text-left px-4 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-600/10 flex items-center gap-2 font-bold transition-colors">
                            <PauseCircle className="w-4 h-4" /> Disable Listing
                          </button>
                        )}
                        
                        <div className="h-px bg-slate-100 dark:bg-border-subtle my-1 transition-colors" />

                        <button onClick={() => handleDelete(listing.id, listing.title)} className="w-full text-left px-4 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-600/10 flex items-center gap-2 font-bold transition-colors">
                          <Trash2 className="w-4 h-4" /> Delete Permanently
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredListings.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-slate-500 dark:text-text-secondary font-sans text-sm">
                    <div className="flex flex-col items-center gap-2">
                       <Flag className="w-8 h-8 text-slate-300 dark:text-text-secondary" />
                       No listings found matching your criteria.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          )}
        </div>
      </div>
    </div>
  );
};
