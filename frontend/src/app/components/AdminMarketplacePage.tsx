import React, { useState, useEffect } from 'react';
import { 
  Search, ExternalLink, Flag, MessageSquare, 
  Trash2, ShieldAlert, CheckCircle2, PauseCircle, PlayCircle, Loader2
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
    const confirmed = window.confirm(`Are you sure you want to ${verb} \"${title}\"?`);
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
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-[#FEF0E6] text-[#DC2626] mr-2">
          <Flag className="w-3 h-3 mr-1" /> {reports} Reports
        </span>
      );
    }
    
    const normalizedStatus = status || 'active';
    const badges: any = {
      'active': 'bg-[var(--success-light)] text-[#16A34A]',
      'sold': 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]',
      'disabled': 'bg-[#FEE2E2] text-[#DC2626]'
    };
    return (
       <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${badges[normalizedStatus] || 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'}`}>
         {normalizedStatus === 'active' && <span className="w-1.5 h-1.5 rounded-md bg-[#16A34A] mr-1" />}
         {normalizedStatus}
       </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {title && (
        <div className="bg-[var(--bg)] border border-black/[0.08] rounded-lg p-4">
          <h2 className="font-syne font-bold text-xl text-[var(--text-primary)]">{title}</h2>
        </div>
      )}
      
      {/* Top Bar */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 bg-[var(--bg)] p-4 rounded-lg border border-black/[0.08]">
        <div className="relative w-full lg:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] group-focus-within:text-[var(--yellow)] transition-colors" />
          <input 
            type="text" 
            placeholder="Search listings, sellers, keywords..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--bg-tertiary)] border border-black/10 rounded-lg py-2 pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--yellow)]/50 focus:bg-[var(--bg-tertiary)] transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {['All', 'Active', 'Sold', 'Reported', 'Disabled'].map(pill => (
            <button 
              key={pill} 
              onClick={() => setFilterStatus(pill)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider font-sans transition-colors ${filterStatus === pill ? 'bg-[var(--yellow)] text-[var(--text-primary)]' : pill === 'Reported' && filterStatus === 'Reported' ? 'bg-[#DC2626] text-[var(--text-primary)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-black/[0.08] hover:border-black/10'}`}
            >
              {pill}
            </button>
          ))}
          <select
            value={collegeFilter}
            onChange={(e) => setCollegeFilter(e.target.value)}
            className="ml-2 bg-[var(--bg-tertiary)] border border-black/10 rounded-lg py-1.5 px-2 text-[11px] text-[var(--text-primary)] font-bold uppercase tracking-wider"
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
      <div className="bg-[var(--bg)] border border-black/[0.08] rounded-lg overflow-x-auto min-h-[400px]">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--yellow)]" />
          </div>
        ) : (
        <table className="w-full text-left border-collapse">
          <thead className="bg-[var(--bg-secondary)] h-[40px] border-b border-[var(--border)]">
            <tr className="border-b border-black/[0.08] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] transition-colors duration-150">
              <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider font-sans px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Listing Title</th>
              <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider font-sans px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Seller Details</th>
              <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider font-sans px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Price</th>
              <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider font-sans px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Status / Health</th>
              <th className="p-4 w-16 text-center text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider font-sans px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.06] relative">
            {filteredListings.map((listing) => (
              <tr key={listing.id} className="hover:bg-black/[0.03] transition-colors group">
                <td className="p-4 min-w-[250px] max-w-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-[var(--text-primary)] flex items-center justify-center font-syne font-bold text-2xl text-[var(--text-primary)] border border-black/[0.08] shrink-0 shadow-inner overflow-hidden">
                      {listing.images && listing.images.length > 0 ? (
                        <img loading="lazy" src={listing.images[0]} className="w-full h-full object-cover" />
                      ) : (
                        listing.title?.charAt(0) || '📦'
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-sans font-bold text-sm text-[var(--text-primary)] mb-0.5 truncate pr-4">{listing.title}</div>
                      <div className="font-sans text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">ID: {listing.id} • {new Date(listing.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                   <div className="font-sans text-sm text-[var(--text-primary)] font-medium mb-0.5">{listing.seller?.name || 'Unknown User'}</div>
                   <div className="font-sans text-xs text-[var(--text-secondary)]">{listing.seller?.email || 'No email'}</div>
                </td>
                <td className="p-4">
                  <div className="font-syne font-bold text-xl text-[#16A34A]">₹{listing.price}</div>
                </td>
                <td className="p-4">
                  <StatusBadge status={listing.is_admin_disabled ? 'disabled' : (listing.status || (listing.is_sold ? 'sold' : 'active'))} reports={listing.report_count} />
                </td>
                <td className="p-4 text-center relative">
                   <div className="flex items-center gap-2 justify-center">
                     <button title="View Live Post" className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors">
                       <ExternalLink className="w-4 h-4" />
                     </button>
                     <button 
                        onClick={() => setActiveDropdown(activeDropdown === listing.id ? null : listing.id)}
                        className="p-1.5 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors text-xs font-bold font-sans flex items-center gap-1"
                     >
                        Mod <ShieldAlert className="w-3.5 h-3.5 text-[var(--yellow)]" />
                     </button>
                   </div>

                  {/* Moderation Dropdown */}
                  {activeDropdown === listing.id && (
                    <div className="absolute right-4 top-12 w-48 bg-[var(--bg-tertiary)] border border-black/10 rounded-lg shadow-md z-20 py-1 font-sans text-sm overflow-hidden animate-in zoom-in-95 duration-100 text-left">
                      
                      <div className="px-3 py-2 border-b border-black/[0.08]">
                         <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Danger Zone</span>
                      </div>
                      
                      {!listing.is_sold && !listing.is_admin_disabled && (
                        <button onClick={() => handleUpdateStatus(listing.id, listing.title, 'sold')} className="w-full text-left px-4 py-2 text-[var(--text-primary)] hover:bg-black/[0.03] flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#16A34A]" /> Mark as Sold
                        </button>
                      )}
                      
                      {listing.is_admin_disabled ? (
                        <button onClick={() => handleUpdateStatus(listing.id, listing.title, 'enabled')} className="w-full text-left px-4 py-2 text-[#16A34A] hover:bg-[#16A34A]/10 flex items-center gap-2 font-bold">
                          <PlayCircle className="w-4 h-4" /> Enable Listing
                        </button>
                      ) : (
                        <button onClick={() => handleUpdateStatus(listing.id, listing.title, 'disabled')} className="w-full text-left px-4 py-2 text-[#DC2626] hover:bg-[#DC2626]/10 flex items-center gap-2 font-bold">
                          <PauseCircle className="w-4 h-4" /> Disable Listing
                        </button>
                      )}
                      
                      <div className="h-px bg-[var(--bg-tertiary)] my-1" />

                      <button onClick={() => handleDelete(listing.id, listing.title)} className="w-full text-left px-4 py-2 text-[#DC2626] hover:bg-[#DC2626]/10 flex items-center gap-2 font-bold">
                        <Trash2 className="w-4 h-4" /> Delete Permanently
                      </button>

                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filteredListings.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-[var(--text-secondary)] font-sans">
                  No listings found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        )}
      </div>

    </div>
  );
};
