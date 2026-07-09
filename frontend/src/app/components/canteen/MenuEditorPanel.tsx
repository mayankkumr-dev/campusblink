import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit2, Image as ImageIcon, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { createMenuItem, updateMenuItem, deleteMenuItem, uploadMenuItemPhoto } from '../../../api/canteen';
import { MenuItemRow } from './MenuItemRow';

export interface MenuEditorPanelProps {
  shop: any;
  menuItems: any[];
  setMenuItems: React.Dispatch<React.SetStateAction<any[]>>;
}

export const MenuEditorPanel: React.FC<MenuEditorPanelProps> = ({ shop, menuItems, setMenuItems }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [menuModal, setMenuModal] = useState<{
    isOpen: boolean;
    mode: 'add' | 'edit';
    item: any | null;
  }>({ isOpen: false, mode: 'add', item: null });
  const [menuForm, setMenuForm] = useState({
    name: '',
    price: '',
    category: 'Snacks',
    image: '',
    available: true,
  });
  const [menuImageFile, setMenuImageFile] = useState<File | null>(null);

  const handleOpenMenuModal = (mode: 'add' | 'edit', item: any | null = null) => {
    if (mode === 'edit' && item) {
      setMenuForm({
        name: item.name,
        price: item.price.toString(),
        category: item.category,
        image: item.image_url || '',
        available: item.is_available,
      });
    } else {
      setMenuForm({
        name: '',
        price: '',
        category: 'Snacks',
        image: '',
        available: true,
      });
    }
    setMenuImageFile(null);
    setMenuModal({ isOpen: true, mode, item });
  };

  const handleSaveMenuItem = async () => {
    if (!menuForm.name || !menuForm.price || !shop?.id) return;
    setIsSaving(true);
    try {
      let imageUrl = menuForm.image || null;
      if (menuImageFile) {
        const { data, error } = await uploadMenuItemPhoto(shop.id, menuImageFile);
        if (error) {
          toast.error(error.message || 'Failed to upload menu image');
          setIsSaving(false);
          return;
        }
        imageUrl = data;
      }

      const payload = {
        shop_id: shop.id,
        name: menuForm.name,
        price: parseFloat(menuForm.price),
        category: menuForm.category,
        image_url: imageUrl,
        is_available: menuForm.available,
      };

      if (menuModal.mode === 'add') {
        const { data, error } = await createMenuItem(payload);
        if (error) toast.error(error.message);
        else {
          setMenuItems((prev) => [...prev, data]);
          toast.success('Item added successfully!');
        }
      } else if (menuModal.item) {
        const { data, error } = await updateMenuItem(menuModal.item.id, payload);
        if (error) toast.error(error.message);
        else {
          setMenuItems((prev) =>
            prev.map((item) => (item.id === menuModal.item.id ? { ...item, ...data } : item))
          );
          toast.success('Item updated successfully!');
        }
      }
      setMenuModal({ isOpen: false, mode: 'add', item: null });
    } catch (err: any) {
      toast.error(err.message || 'Error saving item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMenuItem = async (id: string) => {
    if (window.confirm('Delete this menu item?')) {
      const { error } = await deleteMenuItem(id);
      if (error) toast.error(error.message);
      else {
        setMenuItems((prev) => prev.filter((item) => item.id !== id));
        toast.success('Item deleted');
      }
    }
  };

  return (
    <div className="mx-auto max-w-7xl font-sans">
      {/* Modern Header Container */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-border-subtle bg-surface p-6 sm:p-8 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
        <div>
          <h2 className="font-syne text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">
            Menu Management
          </h2>
          <p className="mt-1 text-xs text-text-secondary">
            Create, update, and organize canteen food items and pricing.
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenMenuModal('add')}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-6 py-3.5 font-syne text-xs sm:text-sm font-bold text-white shadow-xs transition-all hover:-translate-y-0.5 hover:bg-amber-600"
        >
          <Plus className="h-4.5 w-4.5 stroke-[3]" /> Add New Item
        </button>
      </div>

      {/* Modernized Food Item Grid */}
      {menuItems.length === 0 ? (
        <div className="rounded-3xl border border-border-subtle bg-surface p-16 text-center shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
          <p className="font-syne text-base font-bold text-text-primary">No food items added yet</p>
          <p className="mt-1 text-xs text-text-secondary">
            Click &quot;Add New Item&quot; above to start building your canteen menu.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {menuItems.map((item) => (
            <MenuItemRow
              key={item.id}
              item={item}
              onEdit={(it) => handleOpenMenuModal('edit', it)}
              onDelete={handleDeleteMenuItem}
            />
          ))}
        </div>
      )}

      {/* Sleek Light-Mode Modal */}
      <AnimatePresence>
        {menuModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuModal({ isOpen: false, mode: 'add', item: null })}
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-border-subtle bg-surface shadow-[0_20px_60px_rgba(0,0,0,0.12)]"
            >
              <div className="border-b border-border-subtle bg-surface-elevated p-6 flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-amber-soft text-accent-amber border border-amber-100 shadow-2xs">
                  {menuModal.mode === 'add' ? (
                    <Plus className="h-5 w-5 stroke-[2.5]" />
                  ) : (
                    <Edit2 className="h-5 w-5 stroke-[2.2]" />
                  )}
                </div>
                <div>
                  <h3 className="font-syne text-xl font-bold text-text-primary">
                    {menuModal.mode === 'add' ? 'Add Menu Item' : 'Edit Menu Item'}
                  </h3>
                  <p className="text-xs text-text-secondary">
                    {menuModal.mode === 'add'
                      ? 'Create a new dish for your canteen catalog.'
                      : 'Update dish details, category, or pricing.'}
                  </p>
                </div>
              </div>

              <div className="space-y-4 p-6 max-h-[65vh] overflow-y-auto">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                    Item Name
                  </label>
                  <input
                    type="text"
                    value={menuForm.name}
                    onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                    placeholder="e.g. Masala Dosa"
                    className="mt-1.5 w-full rounded-xl border border-border-subtle bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                      Price (₹)
                    </label>
                    <input
                      type="number"
                      value={menuForm.price}
                      onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })}
                      placeholder="60"
                      className="mt-1.5 w-full rounded-xl border border-border-subtle bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                      Category
                    </label>
                    <input
                      type="text"
                      value={menuForm.category}
                      onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-border-subtle bg-surface px-4 py-3 text-sm text-text-primary focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                    <ImageIcon className="h-3.5 w-3.5" /> Image URL
                  </label>
                  <input
                    type="text"
                    value={menuForm.image}
                    onChange={(e) => setMenuForm({ ...menuForm, image: e.target.value })}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="mt-1.5 w-full rounded-xl border border-border-subtle bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                  {menuForm.image && (
                    <div className="mt-2.5 h-32 overflow-hidden rounded-2xl border border-border-subtle">
                      <img
                        loading="lazy"
                        src={menuForm.image}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setMenuImageFile(file);
                    }}
                    className="mt-2 w-full text-xs text-text-secondary file:mr-3 file:rounded-xl file:border-0 file:bg-amber-50 file:px-3 file:py-2 file:font-bold file:text-accent-amber hover:file:bg-amber-100"
                  />
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={menuForm.available}
                      onChange={(e) => setMenuForm({ ...menuForm, available: e.target.checked })}
                      className="h-4.5 w-4.5 rounded border-slate-300 accent-amber-500"
                    />
                    <span className="text-xs font-semibold text-text-primary">
                      Item is currently available for ordering
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-border-subtle bg-surface-elevated p-5">
                <button
                  type="button"
                  onClick={() => setMenuModal({ isOpen: false, mode: 'add', item: null })}
                  className="rounded-xl px-5 py-2.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveMenuItem}
                  disabled={!menuForm.name || !menuForm.price || isSaving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-6 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-amber-600 disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 stroke-[2.5]" />
                  )}
                  {isSaving ? 'Saving...' : 'Save Item'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
