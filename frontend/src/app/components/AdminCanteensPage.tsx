import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, PlusCircle, MoreVertical, Edit3, Eye, 
  ShoppingBag, UtensilsCrossed, Mail, AlertTriangle, 
  PauseCircle, PlayCircle, Trash2, X, Loader2
} from 'lucide-react';
import { createAdminCanteen, getAdminCanteenOwners, getAllCanteens, updateAdminCanteen, updateCanteenStatus, createCanteenOwnerAccount } from '../../api/admin';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router';

const EMPTY_FORM = {
  id: '',
  name: '',
  owner_id: '',
  college: '',
  logo_url: '',
  is_active: true,
};

export const AdminCanteensPage: React.FC = () => {
  const navigate = useNavigate();
  const adminProfile = useAuthStore(state => state.profile);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [canteens, setCanteens] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [owners, setOwners] = useState<any[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [ownerForm, setOwnerForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    college: '',
    shop_name: '',
  });

  const handleCreateOwnerAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await createCanteenOwnerAccount(ownerForm);
      toast.success('Canteen owner account & shop created successfully! ✅');
      setIsOwnerModalOpen(false);
      setOwnerForm({ name: '', username: '', email: '', password: '', college: '', shop_name: '' });
      fetchCanteens();
      fetchOwners();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create canteen owner account');
    } finally {
      setIsSaving(false);
    }
  };

  const isEditMode = Boolean(form.id);

  useEffect(() => {
    fetchCanteens();
    fetchOwners();
  }, []);

  const fetchCanteens = async () => {
    setIsLoading(true);
    const { data } = await getAllCanteens();
    if (data) setCanteens(data);
    setIsLoading(false);
  };

  const fetchOwners = async () => {
    const { data, error } = await getAdminCanteenOwners();
    if (error) {
      toast.error(error.message || 'Failed to load owner list');
      return;
    }
    setOwners(data || []);
  };

  const filteredCanteens = canteens.filter(c => {
    const searchMatch = c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                       c.owner?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status in DB is usually is_active boolean. Let's map it.
    // If is_active is true -> Active, else Suspended.
    const status = c.is_active ? 'Active' : 'Suspended';
    const statusMatch = filterStatus === 'All' || status === filterStatus;

    return searchMatch && statusMatch;
  });

  const handleToggleStatus = async (shopId: string, shopName: string, currentStatus: boolean) => {
    if (!adminProfile) return;
    const loadingToast = toast.loading(`${currentStatus ? 'Suspending' : 'Reactivating'} ${shopName}...`);
    const { error } = await updateCanteenStatus(adminProfile.id, shopId, shopName, !currentStatus);
    if (error) {
      toast.error(error.message, { id: loadingToast });
    } else {
      toast.success(`${shopName} is now ${!currentStatus ? 'Active' : 'Suspended'}`, { id: loadingToast });
      fetchCanteens();
    }
    setActiveDropdown(null);
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
      logo_url: shop.logo_url || '',
      is_active: Boolean(shop.is_active),
    });
    setActiveDropdown(null);
    setIsModalOpen(true);
  };

  const handleSaveCanteen = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!adminProfile?.id) return;

    setIsSaving(true);
    const loadingToast = toast.loading(isEditMode ? 'Updating canteen...' : 'Creating canteen...');

    const payload = {
      ...form,
    };

    const { data, error } = isEditMode
      ? await updateAdminCanteen(adminProfile.id, form.id, payload)
      : await createAdminCanteen(adminProfile.id, payload);

    if (error) {
      const message = error.message || `Failed to ${isEditMode ? 'update' : 'create'} canteen`;
      const isRlsError = message.toLowerCase().includes('row-level security policy');
      toast.error(
        isRlsError
          ? 'Supabase RLS is blocking canteen writes. Run fix_core_rls.sql (and your admin SQL setup) in Supabase SQL Editor.'
          : message,
        { id: loadingToast }
      );
      setIsSaving(false);
      return;
    }

    toast.success(`${data?.name || 'Canteen'} ${isEditMode ? 'updated' : 'created'} successfully`, { id: loadingToast });
    setForm(EMPTY_FORM);
    setIsModalOpen(false);
    setIsSaving(false);
    fetchCanteens();
    fetchOwners();
  };

  const selectedOwner = owners.find((owner) => owner.id === form.owner_id);

  const StatusBadge = ({ status }: { status: string }) => {
    const badges: any = {
      'Active': 'bg-accent-green/15 text-accent-green',
      'Pending': 'bg-amber-100 text-amber-800',
      'Suspended': 'bg-rose-100 text-rose-600'
    };
    return (
       <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${badges[status]}`}>
         {status === 'Active' && <span className="w-1.5 h-1.5 rounded-md bg-emerald-600 mr-1" />}
         {status}
       </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      
      {/* Top Bar */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 bg-white p-4 rounded-lg border border-black/[0.08]">
        <div className="relative w-full lg:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-500 transition-colors dark:text-slate-400" />
          <input 
            type="text" 
            placeholder="Search canteen or owner..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-100 border border-black/10 rounded-lg py-2 pl-9 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-400/50 focus:bg-slate-100 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {['All', 'Active', 'Suspended'].map(pill => (
            <button 
              key={pill} 
              onClick={() => setFilterStatus(pill)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sans transition-colors ${filterStatus === pill ? 'bg-amber-500 text-slate-900' : 'bg-slate-100 text-slate-500 hover:text-slate-900 border border-black/[0.08] hover:border-black/10'}`}
            >
              {pill}
            </button>
          ))}
          <div className="h-6 w-px bg-slate-100 mx-2 hidden lg:block" />
          <button 
            onClick={() => setIsOwnerModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-sans font-bold transition-colors"
          >
            <PlusCircle className="w-4 h-4" /> Create Owner & Shop
          </button>
          <button 
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-yellow-400 text-slate-900 rounded-lg text-sm font-sans font-bold transition-colors"
          >
            <PlusCircle className="w-4 h-4" /> Add Existing Shop
          </button>
        </div>
      </div>

      {/* Table Area */}
      <div className="bg-white border border-black/[0.08] rounded-lg overflow-x-auto min-h-[400px]">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500 dark:text-amber-400 transition-colors" />
          </div>
        ) : (
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 h-[40px] border-b border-[rgba(15,23,42,0.08)]">
            <tr className="border-b border-black/[0.08] bg-slate-100 hover:bg-slate-50 transition-colors duration-150">
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider font-sans px-4 text-left font-sans font-semibold text-[12px] text-slate-400 uppercase tracking-[0.6px]">Canteen</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider font-sans px-4 text-left font-sans font-semibold text-[12px] text-slate-400 uppercase tracking-[0.6px]">Owner Info</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider font-sans px-4 text-left font-sans font-semibold text-[12px] text-slate-400 uppercase tracking-[0.6px]">Performance</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider font-sans px-4 text-left font-sans font-semibold text-[12px] text-slate-400 uppercase tracking-[0.6px]">Status</th>
              <th className="p-4 w-16 text-center text-xs font-bold text-slate-500 uppercase tracking-wider font-sans px-4 text-left font-sans font-semibold text-[12px] text-slate-400 uppercase tracking-[0.6px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.06] relative">
            {filteredCanteens.map((canteen) => (
              <tr key={canteen.id} className="hover:bg-black/[0.03] transition-colors group">
                <td className="p-4 min-w-[200px]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center font-syne font-bold text-lg text-amber-500 border border-black/[0.08] shrink-0 overflow-hidden">
                      {canteen.logo_url ? (
                        <img src={canteen.logo_url} className="w-full h-full object-cover" />
                      ) : (
                        canteen.name?.charAt(0).toUpperCase() || 'C'
                      )}
                    </div>
                    <div>
                      <div className="font-sans font-bold text-sm text-slate-900 mb-0.5">{canteen.name}</div>
                      <div className="font-sans text-xs text-slate-500">{canteen.college}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                   <div className="font-sans text-sm text-slate-900 font-medium mb-0.5">{canteen.owner?.name || 'Unknown'}</div>
                   <div className="font-sans text-xs text-slate-500">{canteen.owner?.email || 'No email associated'}</div>
                </td>
                <td className="p-4">
                  <div className="font-sans text-sm text-slate-900 flex gap-2 mb-0.5">
                     <span className="text-slate-500">Orders:</span> {canteen.total_orders || 0}
                  </div>
                  <div className="font-sans text-xs text-accent-green font-bold">
                     ₹{(canteen.total_revenue || 0).toLocaleString()}
                  </div>
                </td>
                <td className="p-4">
                  <StatusBadge status={canteen.is_active ? 'Active' : 'Suspended'} />
                </td>
                <td className="p-4 text-center relative">
                  <button 
                    onClick={() => setActiveDropdown(activeDropdown === canteen.id ? null : canteen.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {/* Actions Dropdown */}
                  {activeDropdown === canteen.id && (
                    <div className="absolute right-[50px] top-4 w-56 bg-slate-100 border border-black/10 rounded-lg shadow-md z-20 py-1 font-sans text-sm overflow-hidden animate-in zoom-in-95 duration-100">
                      
                      <button onClick={() => { navigate(`/admin/canteen/${canteen.id}`); setActiveDropdown(null); }} className="w-full text-left px-4 py-2 text-slate-900 hover:bg-black/[0.03] flex items-center gap-2">
                        <Eye className="w-4 h-4 text-slate-500 dark:text-slate-400 transition-colors" /> Schedule & Status
                      </button>
                      <button onClick={() => handleOpenEdit(canteen)} className="w-full text-left px-4 py-2 text-slate-900 hover:bg-black/[0.03] flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-slate-500 dark:text-slate-400 transition-colors" /> Edit Details
                      </button>
                      
                      <div className="h-px bg-slate-100 my-1" />
                      
                      <button className="w-full text-left px-4 py-2 text-slate-900 hover:bg-black/[0.03] flex items-center gap-2">
                        <Mail className="w-4 h-4 text-amber-500 dark:text-amber-400 transition-colors" /> Contact Owner
                      </button>
                      
                      {!canteen.is_active ? (
                        <button onClick={() => handleToggleStatus(canteen.id, canteen.name, canteen.is_active)} className="w-full text-left px-4 py-2 text-accent-green hover:bg-emerald-600/10 flex items-center gap-2">
                          <PlayCircle className="w-4 h-4" /> Reactivate Canteen
                        </button>
                      ) : (
                        <button onClick={() => handleToggleStatus(canteen.id, canteen.name, canteen.is_active)} className="w-full text-left px-4 py-2 text-rose-600 hover:bg-rose-600/10 flex items-center gap-2">
                          <PauseCircle className="w-4 h-4" /> Suspend Canteen
                        </button>
                      )}

                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filteredCanteens.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500 font-sans">
                  No canteens found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        )}
      </div>

      {/* Add New Canteen Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 " onClick={() => setIsModalOpen(false)} />
          <div className="bg-white border border-black/10 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto relative shadow-md animate-in zoom-in-95 duration-200 hide-scrollbar">
            
            <div className="sticky top-0 bg-white/90  border-b border-black/[0.08] p-6 flex items-center justify-between z-10">
              <h2 className="font-syne font-bold text-xl text-slate-900">{isEditMode ? 'Edit Canteen' : 'Register New Canteen'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-500 hover:text-slate-900 bg-slate-100 rounded-md transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCanteen} className="p-6 space-y-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-900">Canteen Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Campus Food Court"
                    className="w-full rounded-lg border border-black/10 bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none focus:border-amber-400/50"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-900">Owner</label>
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
                    className="w-full rounded-lg border border-black/10 bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none focus:border-amber-400/50"
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
                    <p className="mt-2 text-xs text-slate-500">
                      Current role: {selectedOwner.role || 'unknown'} • College: {selectedOwner.college || 'Not set'}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-900">College</label>
                  <input
                    value={form.college}
                    onChange={(e) => setForm((prev) => ({ ...prev, college: e.target.value }))}
                    placeholder="Maharaja Agrasen Institute of Technology (MAIT)"
                    className="w-full rounded-lg border border-black/10 bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none focus:border-amber-400/50"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-900">Logo URL</label>
                  <input
                    value={form.logo_url}
                    onChange={(e) => setForm((prev) => ({ ...prev, logo_url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-black/10 bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none focus:border-amber-400/50"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-lg border border-black/[0.08] bg-slate-100 px-4 py-3 text-sm font-bold text-slate-900">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  className="h-4 w-4 accent-amber-500"
                />
                Activate this canteen immediately
              </label>

              <div className="pt-6 border-t border-black/[0.08] flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-lg text-slate-900 font-sans font-bold hover:bg-black/[0.03] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 font-sans font-bold text-slate-900 hover:bg-yellow-400 disabled:opacity-60">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />} {isEditMode ? 'Save Changes' : 'Create Canteen'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Create Owner Account & Shop Modal */}
      {isOwnerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-black/[0.08] bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/[0.08] pb-4 mb-4">
              <h3 className="font-syne text-lg font-bold text-slate-900">Create Canteen Owner & Shop</h3>
              <button onClick={() => setIsOwnerModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOwnerAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Owner Full Name *</label>
                <input
                  value={ownerForm.name}
                  onChange={(e) => setOwnerForm({ ...ownerForm, name: e.target.value })}
                  placeholder="e.g. Ramesh Sharma"
                  className="w-full rounded-lg border border-black/10 bg-slate-100 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Username *</label>
                  <input
                    value={ownerForm.username}
                    onChange={(e) => setOwnerForm({ ...ownerForm, username: e.target.value })}
                    placeholder="ramesh_canteen"
                    className="w-full rounded-lg border border-black/10 bg-slate-100 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">College *</label>
                  <input
                    value={ownerForm.college}
                    onChange={(e) => setOwnerForm({ ...ownerForm, college: e.target.value })}
                    placeholder="MAIT"
                    className="w-full rounded-lg border border-black/10 bg-slate-100 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Login Email *</label>
                  <input
                    type="email"
                    value={ownerForm.email}
                    onChange={(e) => setOwnerForm({ ...ownerForm, email: e.target.value })}
                    placeholder="canteen@campusblink.com"
                    className="w-full rounded-lg border border-black/10 bg-slate-100 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Password *</label>
                  <input
                    type="password"
                    value={ownerForm.password}
                    onChange={(e) => setOwnerForm({ ...ownerForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-black/10 bg-slate-100 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Canteen Shop Name *</label>
                <input
                  value={ownerForm.shop_name}
                  onChange={(e) => setOwnerForm({ ...ownerForm, shop_name: e.target.value })}
                  placeholder="e.g. Ramesh Canteen Point"
                  className="w-full rounded-lg border border-black/10 bg-slate-100 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="pt-4 border-t border-black/[0.08] flex justify-end gap-3">
                <button type="button" onClick={() => setIsOwnerModalOpen(false)} className="px-4 py-2 rounded-lg text-slate-700 font-bold text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center gap-2">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Create Account & Shop
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
