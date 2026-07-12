import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, Search, StopCircle, Trash2, Eye, EyeOff, UtensilsCrossed } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAllCanteens, getAllCanteenMenuItems } from '../../api/admin';
import { deleteMenuItem, toggleMenuItemAvailability } from '../../api/canteen';

const getErrorMessage = (error: any, fallback: string) => error?.message || fallback;

export const AdminCanteenMenuPage: React.FC = () => {
  const [canteens, setCanteens] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [selectedShop, setSelectedShop] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Items');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const [{ data: canteenData }, { data: menuData, error: menuError }] = await Promise.all([
      getAllCanteens(),
      getAllCanteenMenuItems(selectedShop !== 'all' ? selectedShop : undefined),
    ]);

    if (menuError) {
      toast.error(getErrorMessage(menuError, 'Failed to load menu items'));
    }

    setCanteens(canteenData || []);
    setMenuItems(menuData || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [selectedShop]);

  const categories = useMemo(() => {
    const set = new Set<string>(['All Items']);
    menuItems.forEach((item) => {
      if (item?.category) set.add(item.category);
    });
    return Array.from(set);
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return menuItems.filter((item) => {
      const matchesCategory = selectedCategory === 'All Items' || item.category === selectedCategory;
      const matchesSearch =
        !q ||
        item.name?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        item.shop?.name?.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, searchTerm, selectedCategory]);

  const handleToggleAvailability = async (item: any) => {
    const { error } = await toggleMenuItemAvailability(item.id, !item.is_available);
    if (error) {
      toast.error(getErrorMessage(error, 'Failed to update availability'));
      return;
    }
    toast.success(item.is_available ? 'Marked unavailable' : 'Marked available');
    setMenuItems((prev) => prev.map((m) => (m.id === item.id ? { ...m, is_available: !item.is_available } : m)));
  };

  const handleDeleteItem = async (item: any) => {
    if (!window.confirm(`Delete ${item.name}?`)) return;
    const { error } = await deleteMenuItem(item.id);
    if (error) {
      toast.error(getErrorMessage(error, 'Failed to delete item'));
      return;
    }
    toast.success('Menu item deleted');
    setMenuItems((prev) => prev.filter((m) => m.id !== item.id));
  };

  if (loading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-amber-500 dark:text-amber-400 transition-colors" /></div>;
  }

  return (
    <div>
      {/* ── MOBILE VIEWPORT ONLY ── */}
      <div className="md:hidden flex flex-col font-sans text-slate-900 dark:text-admin-text-primary pb-8 min-h-screen transition-colors">
        {/* Sticky Search & Filters Header */}
        <div className="sticky top-[64px] z-30 bg-[#F8FAFC]/95 dark:bg-admin-bg-base/95 backdrop-blur-md pt-2 pb-3 px-4 border-b border-slate-200/80 dark:border-admin-border-subtle shadow-[0_2px_12px_rgba(0,0,0,0.02)] dark:shadow-none space-y-3 transition-colors">
          <div className="flex gap-2">
            <div className="relative flex-1 group">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-admin-text-secondary transition-colors" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search items..."
                className="w-full rounded-2xl border border-slate-200/80 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-900 dark:text-admin-text-primary placeholder:text-slate-400 outline-none focus:border-amber-400 shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-none transition-colors"
              />
            </div>
            <select
              value={selectedShop}
              onChange={(event) => setSelectedShop(event.target.value)}
              className="shrink-0 w-[110px] rounded-2xl border border-slate-200/80 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface px-3 py-2.5 text-[11px] font-bold text-slate-700 dark:text-admin-text-secondary outline-none shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-none truncate transition-colors"
            >
              <option value="all">All Canteens</option>
              {(canteens || []).map((canteen) => (
                <option key={canteen.id} value={canteen.id}>{canteen.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`shrink-0 rounded-xl px-4 py-2 text-[11px] font-extrabold whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? 'bg-amber-500 dark:bg-admin-accent text-white dark:text-admin-bg-surface-elevated shadow-sm shadow-amber-200 dark:shadow-none'
                    : 'bg-white dark:bg-admin-bg-surface border border-slate-200/80 dark:border-admin-border-subtle text-slate-500 dark:text-admin-text-secondary hover:text-slate-900 dark:hover:text-admin-text-primary'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Item Cards List */}
        <div className="p-4 space-y-3 bg-[#F8FAFC] dark:bg-admin-bg-base flex-1 transition-colors">
          {filteredItems.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface p-10 text-center flex flex-col items-center transition-colors">
              <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-full mb-3 transition-colors">
                <UtensilsCrossed className="h-6 w-6 text-amber-500 dark:text-amber-400 transition-colors" />
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-admin-text-primary transition-colors">No items found</p>
              <p className="text-[10px] font-medium text-slate-500 dark:text-admin-text-tertiary mt-1 transition-colors">Try adjusting your filters</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div key={item.id} className={`rounded-2xl border ${item.is_available ? 'border-slate-100 dark:border-admin-border-subtle' : 'border-rose-100 dark:border-rose-500/30'} bg-white dark:bg-admin-bg-surface p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-none relative transition-all ${item.is_available ? '' : 'opacity-80'}`}>
                {/* Top Row: Title & Price */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="pr-12">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-admin-text-primary leading-tight transition-colors">{item.name}</h3>
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-admin-text-tertiary mt-1 transition-colors">
                      {item.shop?.name || 'Unknown canteen'}
                    </p>
                  </div>
                  <div className="absolute top-4 right-4 text-right">
                    <span className="font-syne text-base font-extrabold text-amber-600">₹{item.price}</span>
                  </div>
                </div>

                {/* Middle Row: Status Pills */}
                <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider font-extrabold">
                  <span className={`px-2 py-0.5 rounded-full transition-colors ${item.is_veg ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                    {item.is_veg ? 'Veg' : 'Non-veg'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full transition-colors ${item.is_available ? 'bg-slate-50 dark:bg-admin-bg-base text-slate-500 dark:text-admin-text-secondary' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                    {item.is_available ? 'Available' : 'Out of Stock'}
                  </span>
                </div>

                {/* Bottom Right: Touch-Friendly Action SVGs */}
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleAvailability(item)}
                    className={`flex items-center justify-center p-2 rounded-xl transition-colors ${item.is_available ? 'bg-slate-50 dark:bg-admin-bg-base text-slate-400 dark:text-admin-text-tertiary hover:text-slate-700 dark:hover:text-admin-text-primary' : 'bg-amber-50 dark:bg-admin-accent-soft-bg text-amber-600 dark:text-amber-500'}`}
                  >
                    {item.is_available ? <EyeOff className="w-4 h-4 stroke-[2]" /> : <Eye className="w-4 h-4 stroke-[2]" />}
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item)}
                    className="flex items-center justify-center p-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 stroke-[2]" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── DESKTOP PC VIEWPORT ONLY ── */}
      <div className="hidden md:block space-y-6 animate-in fade-in duration-500 font-sans">
        <div className="flex flex-col gap-3 rounded-lg border border-black/[0.08] bg-white p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <select
              value={selectedShop}
              onChange={(event) => setSelectedShop(event.target.value)}
              className="rounded-lg border border-amber-400/30 bg-slate-100 px-4 py-2.5 text-sm font-bold text-amber-500 outline-none"
            >
              <option value="all">All Canteens</option>
              {(canteens || []).map((canteen) => (
                <option key={canteen.id} value={canteen.id}>{canteen.name}</option>
              ))}
            </select>
            <span className="hidden text-sm text-slate-500 md:block">Live menu inventory</span>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400 transition-colors" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search items..."
              className="w-full rounded-lg border border-black/10 bg-slate-100 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-amber-400/50"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`rounded-md px-4 py-2 text-xs font-bold transition-colors ${
                selectedCategory === category
                  ? 'bg-white text-slate-900'
                  : 'border border-black/[0.08] bg-white text-slate-500 hover:text-slate-900'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => (
            <div key={item.id} className="relative rounded-lg border border-black/[0.08] bg-white p-4">
              {!item.is_available && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-slate-50/70">
                  <span className="rounded bg-[#DC2626] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-900">Out of Stock</span>
                </div>
              )}

              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{item.name}</h3>
                  <p className="text-xs text-slate-500">{item.shop?.name || 'Unknown canteen'} • {item.category || 'Uncategorized'}</p>
                </div>
                <span className="font-syne text-lg font-bold text-amber-500">₹{item.price}</span>
              </div>

              <div className="mb-3 flex items-center gap-2 text-xs">
                <span className={`rounded px-2 py-1 font-bold ${item.is_veg ? 'bg-[#16A34A]/10 text-accent-green' : 'bg-[#DC2626]/10 text-[#DC2626]'}`}>
                  {item.is_veg ? 'Veg' : 'Non-veg'}
                </span>
                <span className={`rounded px-2 py-1 font-bold ${item.is_available ? 'bg-slate-100 text-slate-900' : 'bg-[#DC2626]/15 text-[#DC2626]'}`}>
                  {item.is_available ? 'Available' : 'Unavailable'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleAvailability(item)}
                  className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-900 hover:border-amber-400/40"
                >
                  {item.is_available ? <StopCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                  {item.is_available ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => handleDeleteItem(item)}
                  className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-[#DC2626]/10 px-3 py-2 text-xs font-bold text-[#DC2626] hover:bg-[#DC2626]/15"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="rounded-lg border border-dashed border-black/10 bg-white p-10 text-center text-sm text-slate-500">
            <AlertCircle className="mx-auto mb-3 h-5 w-5 text-amber-500 dark:text-amber-400 transition-colors" />
            No menu items found for the selected filters.
          </div>
        )}
      </div>
    </div>
  );
};
