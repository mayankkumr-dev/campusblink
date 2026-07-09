import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, Search, StopCircle, Trash2 } from 'lucide-react';
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
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[var(--yellow)]" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-3 rounded-lg border border-black/[0.08] bg-[var(--bg)] p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <select
            value={selectedShop}
            onChange={(event) => setSelectedShop(event.target.value)}
            className="rounded-lg border border-[var(--yellow)]/30 bg-[var(--bg-tertiary)] px-4 py-2.5 text-sm font-bold text-[var(--yellow)] outline-none"
          >
            <option value="all">All Canteens</option>
            {(canteens || []).map((canteen) => (
              <option key={canteen.id} value={canteen.id}>{canteen.name}</option>
            ))}
          </select>
          <span className="hidden text-sm text-[var(--text-secondary)] md:block">Live menu inventory</span>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search items..."
            className="w-full rounded-lg border border-black/10 bg-[var(--bg-tertiary)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--yellow)]/50"
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
                ? 'bg-[var(--bg)] text-[var(--text-primary)]'
                : 'border border-black/[0.08] bg-[var(--bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredItems.map((item) => (
          <div key={item.id} className="relative rounded-lg border border-black/[0.08] bg-[var(--bg)] p-4">
            {!item.is_available && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-[var(--bg-primary)]/70">
                <span className="rounded bg-[#DC2626] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-primary)]">Out of Stock</span>
              </div>
            )}

            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">{item.name}</h3>
                <p className="text-xs text-[var(--text-secondary)]">{item.shop?.name || 'Unknown canteen'} • {item.category || 'Uncategorized'}</p>
              </div>
              <span className="font-syne text-lg font-bold text-[var(--yellow)]">₹{item.price}</span>
            </div>

            <div className="mb-3 flex items-center gap-2 text-xs">
              <span className={`rounded px-2 py-1 font-bold ${item.is_veg ? 'bg-[#16A34A]/10 text-accent-green' : 'bg-[#DC2626]/10 text-[#DC2626]'}`}>
                {item.is_veg ? 'Veg' : 'Non-veg'}
              </span>
              <span className={`rounded px-2 py-1 font-bold ${item.is_available ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' : 'bg-[#DC2626]/15 text-[#DC2626]'}`}>
                {item.is_available ? 'Available' : 'Unavailable'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggleAvailability(item)}
                className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-[var(--bg-tertiary)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] hover:border-[var(--yellow)]/40"
              >
                {item.is_available ? <StopCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                {item.is_available ? 'Disable' : 'Enable'}
              </button>
              <button
                onClick={() => handleDeleteItem(item)}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--error)]/30 bg-[#DC2626]/10 px-3 py-2 text-xs font-bold text-[#DC2626] hover:bg-[#DC2626]/15"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="rounded-lg border border-dashed border-black/10 bg-[var(--bg)] p-10 text-center text-sm text-[var(--text-secondary)]">
          <AlertCircle className="mx-auto mb-3 h-5 w-5 text-[var(--yellow)]" />
          No menu items found for the selected filters.
        </div>
      )}
    </div>
  );
};
