import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, PlusCircle, MoreVertical, Edit3, Eye, 
  FileText, Mail, AlertTriangle, PauseCircle, PlayCircle, Trash2, X, Package, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { createAdminPrintShop, getAdminPrintShopOwners, getAllPrintShops, updateAdminPrintShop, updatePrintShopStatus } from '../../api/admin';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  id: '',
  name: '',
  owner_id: '',
  college: '',
  bw_price_per_page: '1',
  color_price_per_page: '5',
  binding_charge: '20',
  logo_url: '',
  is_active: true,
};

export const AdminPrintShopsPage: React.FC = () => {
  const navigate = useNavigate();
  const adminProfile = useAuthStore(state => state.profile);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [shops, setShops] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const isEditMode = Boolean(form.id);

  useEffect(() => {
    fetchShops();
    fetchOwners();
  }, []);

  const fetchShops = async () => {
    setIsLoading(true);
    const { data, error } = await getAllPrintShops();
    if (error) {
      toast.error(error.message || 'Failed to load print shops');
    } else if (data) {
      setShops(data);
    }
    setIsLoading(false);
  };

  const fetchOwners = async () => {
    const { data, error } = await getAdminPrintShopOwners();
    if (error) {
      toast.error(error.message || 'Failed to load owner list');
      return;
    }
    setOwners(data || []);
  };

  const filteredShops = shops.filter(s => {
    const searchMatch = s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                       s.owner?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const status = s.is_active ? 'Active' : 'Suspended';
    const statusMatch = filterStatus === 'All' || status === filterStatus;

    return searchMatch && statusMatch;
  });

  const handleToggleStatus = async (shopId: string, shopName: string, currentStatus: boolean) => {
    if (!adminProfile) return;
    const loadingToast = toast.loading(`${currentStatus ? 'Suspending' : 'Reactivating'} ${shopName}...`);
    const { error } = await updatePrintShopStatus(adminProfile.id, shopId, shopName, !currentStatus);
    if (error) {
      toast.error(error.message, { id: loadingToast });
    } else {
      toast.success(`${shopName} is now ${!currentStatus ? 'Active' : 'Suspended'}`, { id: loadingToast });
      fetchShops();
    }
    setActiveDropdown(null);
  };

  const handleCreateShop = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!adminProfile?.id) return;

    setIsSaving(true);
    const loadingToast = toast.loading(isEditMode ? 'Updating print shop...' : 'Creating print shop...');

    const payload = {
      ...form,
      bw_price_per_page: Number(form.bw_price_per_page),
      color_price_per_page: Number(form.color_price_per_page),
      binding_charge: Number(form.binding_charge),
    };

    const { data, error } = isEditMode
      ? await updateAdminPrintShop(adminProfile.id, form.id, payload)
      : await createAdminPrintShop(adminProfile.id, payload);

    if (error) {
      const message = error.message || `Failed to ${isEditMode ? 'update' : 'create'} print shop`;
      const isRlsError = message.toLowerCase().includes('row-level security policy');
      toast.error(
        isRlsError
          ? 'Supabase RLS is blocking print shop writes. Run fix_print_admin_rls.sql in the SQL Editor.'
          : message,
        { id: loadingToast }
      );
      setIsSaving(false);
      return;
    }

    toast.success(`${data?.name || 'Print shop'} ${isEditMode ? 'updated' : 'created'} successfully`, { id: loadingToast });
    setForm(EMPTY_FORM);
    setIsModalOpen(false);
    setIsSaving(false);
    fetchShops();
    fetchOwners();
  };

  const handleOpenCreate = () => {
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (shop: any) => {
    setForm({
      id: shop.id,
      name: shop.name || '',
      owner_id: shop.owner_id || '',
      college: shop.college || '',
      bw_price_per_page: String(shop.bw_price_per_page ?? 1),
      color_price_per_page: String(shop.color_price_per_page ?? 5),
      binding_charge: String(shop.binding_charge ?? 20),
      logo_url: shop.logo_url || '',
      is_active: Boolean(shop.is_active),
    });
    setActiveDropdown(null);
    setIsModalOpen(true);
  };

  const selectedOwner = owners.find((owner) => owner.id === form.owner_id);

  const StatusBadge = ({ status }: { status: string }) => {
    const badges: any = {
      'Active': 'bg-accent-green/15 text-accent-green',
      'Pending': 'bg-[#FEF9C3] text-[var(--yellow-dark)]',
      'Suspended': 'bg-[#FEE2E2] text-[#DC2626]'
    };
    return (
       <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${badges[status]}`}>
         {status === 'Active' && <span className="w-1.5 h-1.5 rounded-md bg-[#16A34A] mr-1" />}
         {status}
       </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      
      {/* Top Bar */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 bg-[var(--bg)] p-4 rounded-lg border border-black/[0.08]">
        <div className="relative w-full lg:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] group-focus-within:text-[var(--yellow)] transition-colors" />
          <input 
            type="text" 
            placeholder="Search print shop or owner..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--bg-tertiary)] border border-black/10 rounded-lg py-2 pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--yellow)]/50 focus:bg-[var(--bg-tertiary)] transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {['All', 'Active', 'Suspended'].map(pill => (
            <button 
              key={pill} 
              onClick={() => setFilterStatus(pill)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sans transition-colors ${filterStatus === pill ? 'bg-[var(--yellow)] text-[var(--text-primary)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-black/[0.08] hover:border-black/10'}`}
            >
              {pill}
            </button>
          ))}
          <div className="h-6 w-px bg-[var(--bg-tertiary)] mx-2 hidden lg:block" />
          <button 
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--yellow)] hover:bg-yellow-400 text-[var(--text-primary)] rounded-lg text-sm font-sans font-bold transition-colors"
          >
            <PlusCircle className="w-4 h-4" /> Add Print Shop
          </button>
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
              <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider font-sans px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Shop</th>
              <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider font-sans px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Owner Info</th>
              <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider font-sans px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Orders Total</th>
              <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider font-sans px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Status</th>
              <th className="p-4 w-16 text-center text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider font-sans px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.06] relative">
            {filteredShops.map((shop) => (
              <tr key={shop.id} className="hover:bg-black/[0.03] transition-colors group">
                <td className="p-4 min-w-[200px]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--text-primary)] flex items-center justify-center font-syne font-bold text-lg text-[var(--yellow)] border border-black/[0.08] shrink-0 shadow-inner overflow-hidden">
                      {shop.logo_url ? (
                        <img src={shop.logo_url} className="w-full h-full object-cover" />
                      ) : (
                        shop.name?.charAt(0).toUpperCase() || 'P'
                      )}
                    </div>
                    <div>
                      <div className="font-sans font-bold text-sm text-[var(--text-primary)] mb-0.5">{shop.name}</div>
                      <div className="font-sans text-xs text-[var(--text-secondary)]">{shop.college}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                   <div className="font-sans text-sm text-[var(--text-primary)] font-medium mb-0.5">{shop.owner?.name || 'Unknown'}</div>
                   <div className="font-sans text-xs text-[var(--text-secondary)]">{shop.owner?.email || 'No email associated'}</div>
                </td>
                <td className="p-4">
                  <div className="font-syne font-bold text-xl text-accent-green">{shop.total_orders || 0}</div>
                </td>
                <td className="p-4">
                  <StatusBadge status={shop.is_active ? 'Active' : 'Suspended'} />
                </td>
                <td className="p-4 text-center relative">
                  <button 
                    onClick={() => setActiveDropdown(activeDropdown === shop.id ? null : shop.id)}
                    className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {/* Actions Dropdown */}
                  {activeDropdown === shop.id && (
                    <div className="absolute right-[50px] top-4 w-56 bg-[var(--bg-tertiary)] border border-black/10 rounded-lg shadow-md z-20 py-1 font-sans text-sm overflow-hidden animate-in zoom-in-95 duration-100">
                      
                      <button onClick={() => { navigate(`/admin/print/${shop.id}`); setActiveDropdown(null); }} className="w-full text-left px-4 py-2 text-[var(--text-primary)] hover:bg-black/[0.03] flex items-center gap-2">
                        <Eye className="w-4 h-4 text-[var(--text-secondary)]" /> Schedule & Status
                      </button>
                      <button onClick={() => handleOpenEdit(shop)} className="w-full text-left px-4 py-2 text-[var(--text-primary)] hover:bg-black/[0.03] flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-[var(--text-secondary)]" /> Edit Details
                      </button>
                      <button onClick={() => { navigate(`/admin/print/orders?shop=${shop.id}`); setActiveDropdown(null); }} className="w-full text-left px-4 py-2 text-[var(--text-primary)] hover:bg-black/[0.03] flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[var(--yellow)]" /> Print Orders
                      </button>
                      <button className="w-full text-left px-4 py-2 text-[var(--text-primary)] hover:bg-black/[0.03] flex items-center gap-2">
                        <Package className="w-4 h-4 text-accent-green" /> Manage Stationery
                      </button>
                      
                      <div className="h-px bg-[var(--bg-tertiary)] my-1" />
                      
                      <button className="w-full text-left px-4 py-2 text-[var(--text-primary)] hover:bg-black/[0.03] flex items-center gap-2">
                        <Mail className="w-4 h-4 text-[var(--accent)]" /> Contact Owner
                      </button>
                      
                      {!shop.is_active ? (
                        <button onClick={() => handleToggleStatus(shop.id, shop.name, shop.is_active)} className="w-full text-left px-4 py-2 text-accent-green hover:bg-[#16A34A]/10 flex items-center gap-2">
                          <PlayCircle className="w-4 h-4" /> Reactivate Shop
                        </button>
                      ) : (
                        <button onClick={() => handleToggleStatus(shop.id, shop.name, shop.is_active)} className="w-full text-left px-4 py-2 text-[#DC2626] hover:bg-[#DC2626]/10 flex items-center gap-2">
                          <PauseCircle className="w-4 h-4" /> Suspend Shop
                        </button>
                      )}

                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filteredShops.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-[var(--text-secondary)] font-sans">
                  No print shops found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        )}
      </div>

      {/* Add New Print Shop Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 " onClick={() => setIsModalOpen(false)} />
          <div className="bg-[var(--bg)] border border-black/10 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto relative shadow-md animate-in zoom-in-95 duration-200 hide-scrollbar">
            
            <div className="sticky top-0 bg-[var(--bg)]/90  border-b border-black/[0.08] p-6 flex items-center justify-between z-10">
              <h2 className="font-syne font-bold text-xl text-[var(--text-primary)]">{isEditMode ? 'Edit Print Shop' : 'Register Print Shop'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-tertiary)] rounded-md transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateShop} className="p-6 space-y-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Shop Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Campus Xerox Hub"
                    className="w-full rounded-lg border border-black/10 bg-[var(--bg-tertiary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--yellow)]/50"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Owner</label>
                  <select
                    value={form.owner_id}
                    onChange={(e) => {
                      const nextOwner = owners.find((owner) => owner.id === e.target.value);
                      setForm((prev) => ({
                        ...prev,
                        owner_id: e.target.value,
                        college: nextOwner?.college || prev.college,
                      }));
                    }}
                    className="w-full rounded-lg border border-black/10 bg-[var(--bg-tertiary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--yellow)]/50"
                    required
                  >
                    <option value="">Select a user</option>
                    {owners.map((owner) => (
                      <option key={owner.id} value={owner.id}>
                        {owner.name || owner.email} {owner.email ? `(${owner.email})` : ''}
                      </option>
                    ))}
                  </select>
                  {selectedOwner ? (
                    <p className="mt-2 text-xs text-[var(--text-secondary)]">
                      Current role: {selectedOwner.role || 'unknown'} • College: {selectedOwner.college || 'Not set'}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">College</label>
                  <input
                    value={form.college}
                    onChange={(e) => setForm((prev) => ({ ...prev, college: e.target.value }))}
                    placeholder="Maharaja Agrasen Institute of Technology (MAIT)"
                    className="w-full rounded-lg border border-black/10 bg-[var(--bg-tertiary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--yellow)]/50"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">B/W Price Per Page</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.bw_price_per_page}
                    onChange={(e) => setForm((prev) => ({ ...prev, bw_price_per_page: e.target.value }))}
                    className="w-full rounded-lg border border-black/10 bg-[var(--bg-tertiary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--yellow)]/50"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Color Price Per Page</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.color_price_per_page}
                    onChange={(e) => setForm((prev) => ({ ...prev, color_price_per_page: e.target.value }))}
                    className="w-full rounded-lg border border-black/10 bg-[var(--bg-tertiary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--yellow)]/50"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Binding Charge</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.binding_charge}
                    onChange={(e) => setForm((prev) => ({ ...prev, binding_charge: e.target.value }))}
                    className="w-full rounded-lg border border-black/10 bg-[var(--bg-tertiary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--yellow)]/50"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Logo URL</label>
                  <input
                    value={form.logo_url}
                    onChange={(e) => setForm((prev) => ({ ...prev, logo_url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-black/10 bg-[var(--bg-tertiary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--yellow)]/50"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-lg border border-black/[0.08] bg-[var(--bg-tertiary)] px-4 py-3 text-sm font-bold text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  className="h-4 w-4 accent-[var(--yellow)]"
                />
                Activate this shop immediately
              </label>

              <div className="pt-6 border-t border-black/[0.08] flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-lg text-[var(--text-primary)] font-sans font-bold hover:bg-black/[0.03] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-[var(--yellow)] px-5 py-2.5 font-sans font-bold text-[var(--text-primary)] hover:bg-yellow-400 disabled:opacity-60">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />} {isEditMode ? 'Save Changes' : 'Create Shop'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
