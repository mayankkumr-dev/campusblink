import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Coffee,
  Loader2,
  X,
  Upload,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  uploadMenuItemPhoto,
} from '../../../api/canteen';

export interface MobileMenuManagementProps {
  shop: any;
  menuItems: any[];
  setMenuItems: React.Dispatch<React.SetStateAction<any[]>>;
}

export const MobileMenuManagement: React.FC<MobileMenuManagementProps> = ({
  shop,
  menuItems,
  setMenuItems,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'add' | 'edit';
    item: any | null;
  }>({ isOpen: false, mode: 'add', item: null });

  const [form, setForm] = useState({
    name: '',
    price: '',
    category: 'Snacks',
    image: '',
    available: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const categories = ['All', 'Snacks', 'Beverages', 'Meals', 'Desserts'];

  const handleOpenModal = (mode: 'add' | 'edit', item: any | null = null) => {
    if (mode === 'edit' && item) {
      setForm({
        name: item.name,
        price: item.price.toString(),
        category: item.category || 'Snacks',
        image: item.image_url || '',
        available: Boolean(item.is_available),
      });
    } else {
      setForm({
        name: '',
        price: '',
        category: 'Snacks',
        image: '',
        available: true,
      });
    }
    setImageFile(null);
    setModalState({ isOpen: true, mode, item });
  };

  const handleSaveItem = async () => {
    if (!form.name || !form.price || !shop?.id) {
      toast.error('Please enter name and price');
      return;
    }
    setIsSaving(true);
    try {
      let imageUrl = form.image || null;
      if (imageFile) {
        const { data, error } = await uploadMenuItemPhoto(shop.id, imageFile);
        if (error) {
          toast.error(error.message || 'Failed to upload photo');
          setIsSaving(false);
          return;
        }
        imageUrl = data;
      }

      const payload = {
        shop_id: shop.id,
        name: form.name,
        price: parseFloat(form.price),
        category: form.category,
        image_url: imageUrl,
        is_available: form.available,
      };

      if (modalState.mode === 'add') {
        const { data, error } = await createMenuItem(payload);
        if (error) {
          toast.error(error.message);
        } else {
          setMenuItems((prev) => [...prev, data]);
          toast.success('Item added to menu!');
        }
      } else if (modalState.item) {
        const { data, error } = await updateMenuItem(modalState.item.id, payload);
        if (error) {
          toast.error(error.message);
        } else {
          setMenuItems((prev) =>
            prev.map((item) =>
              item.id === modalState.item.id ? { ...item, ...data } : item
            )
          );
          toast.success('Menu item updated!');
        }
      }
      setModalState({ isOpen: false, mode: 'add', item: null });
    } catch (err: any) {
      toast.error(err.message || 'Error saving menu item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this menu item permanently?')) {
      const { error } = await deleteMenuItem(id);
      if (error) {
        toast.error(error.message);
      } else {
        setMenuItems((prev) => prev.filter((item) => item.id !== id));
        toast.success('Item deleted');
      }
    }
  };

  const filteredItems =
    activeCategory === 'All'
      ? menuItems
      : menuItems.filter((i) => (i.category || 'Snacks') === activeCategory);

  return (
    <div className="flex flex-col min-h-dvh bg-[#FAFAFA] dark:bg-shop-bg-base text-gray-900 dark:text-shop-text-primary font-sans pb-28 select-none transition-colors">
      {/* Pinned Top Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-shop-bg-surface/95 backdrop-blur-md border-b border-gray-100 dark:border-shop-border-subtle px-4 py-3.5 shadow-[0_2px_15px_rgba(0,0,0,0.03)] dark:shadow-none transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-syne text-xl font-extrabold text-gray-900 dark:text-shop-text-primary tracking-tight">
              Menu Management
            </h1>
            <p className="text-[11px] font-semibold text-gray-400 dark:text-shop-text-secondary mt-0.5">
              {menuItems.length} total dishes • Instant availability
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenModal('add')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 active:scale-95 text-white font-syne font-bold text-xs shadow-xs transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.8]" /> Add
          </button>
        </div>

        {/* Removed duplicate Add button dock */}

        {/* Horizontal Category Pill Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pt-3 pb-0.5 no-scrollbar">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-gray-900 dark:bg-shop-accent text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-shop-bg-surface-raised text-gray-600 dark:text-shop-text-secondary hover:bg-gray-200 dark:hover:bg-shop-bg-surface-hover'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </header>

      {/* Food Item Cards: Highly Efficient Horizontal List-Items */}
      <div className="p-4 space-y-3">
        {filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-shop-bg-surface rounded-3xl p-10 text-center shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none border border-transparent dark:border-shop-border-subtle my-6 transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-shop-bg-surface-raised text-gray-400 dark:text-shop-text-secondary flex items-center justify-center mx-auto mb-3">
              <Coffee className="w-6 h-6 stroke-[1.8]" />
            </div>
            <h3 className="font-syne text-base font-extrabold text-gray-900 dark:text-shop-text-primary">
              No dishes in {activeCategory}
            </h3>
            <p className="text-xs text-gray-500 dark:text-shop-text-secondary font-medium mt-1 max-w-xs mx-auto">
              Tap the button above to add dishes, snacks, and beverages for students.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            return (
              <div
                key={item.id}
                onClick={() => handleOpenModal('edit', item)}
                className="group bg-white dark:bg-shop-bg-surface rounded-2xl p-3.5 shadow-[0_2px_14px_rgba(0,0,0,0.03)] dark:shadow-none border border-gray-100 dark:border-shop-border-subtle flex items-center gap-3.5 active:scale-[0.99] transition-all cursor-pointer"
              >
                {/* Beautifully Rounded, Perfectly Cropped Square Thumbnail on Left */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-gray-50 dark:bg-shop-bg-surface-raised shrink-0 border border-gray-100 dark:border-shop-border-subtle relative">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-shop-text-tertiary">
                      <Coffee className="w-7 h-7 stroke-[1.5]" />
                    </div>
                  )}
                </div>

                {/* Right: Stack Item Name, Price, and Category Pills */}
                <div className="min-w-0 flex-1 flex flex-col justify-between py-1">
                  <div>
                    <h3 className="font-syne font-bold text-sm text-gray-900 dark:text-shop-text-primary truncate">
                      {item.name}
                    </h3>
                    <p className="font-syne font-black text-sm text-gray-900 dark:text-shop-text-primary">
                      ₹{item.price}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                    <span className="px-2 py-0.5 rounded text-gray-600 bg-gray-100 dark:bg-[#2c2c2e] dark:text-[#86868b] text-[10px] font-bold font-syne">
                      {item.category || 'Snacks'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-syne ${
                        item.is_available
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                          : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
                      }`}
                    >
                      {item.is_available ? 'Available' : 'Out of Stock'}
                    </span>
                  </div>
                </div>

                {/* Edit & Delete Actions */}
                <div className="flex flex-col items-center gap-2 shrink-0 self-start">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenModal('edit', item);
                    }}
                    className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-shop-bg-surface-raised hover:bg-gray-100 dark:hover:bg-shop-bg-surface-hover text-gray-600 dark:text-shop-text-secondary flex items-center justify-center active:scale-95 transition-all"
                    aria-label="Edit dish"
                  >
                    {/* Modern Thin-Line Pencil SVG */}
                    <svg
                      className="w-4 h-4 stroke-[1.6]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      <path d="m15 5 4 4" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteItem(item.id, e)}
                    className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center active:scale-95 transition-all"
                    aria-label="Delete dish"
                  >
                    {/* Minus SVG */}
                    <svg
                      className="w-4 h-4 stroke-[2]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Premium Sticky Floating Action Button (FAB) in Bottom Right */}
      <button
        type="button"
        onClick={() => handleOpenModal('add')}
        className="fixed right-4 bottom-20 z-40 w-13 h-13 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-[0_8px_25px_rgba(37,99,235,0.35)] flex items-center justify-center transition-all"
        aria-label="Add item"
      >
        <Plus className="w-6 h-6 stroke-[2.6]" />
      </button>

      {/* Touch-Friendly Add / Edit Bottom Sheet Modal */}
      <AnimatePresence>
        {modalState.isOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() =>
                setModalState({ isOpen: false, mode: 'add', item: null })
              }
              className="absolute inset-0 bg-gray-900/40 dark:bg-black/70 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, y: 150 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 150 }}
              className="relative z-10 w-full max-w-lg bg-white dark:bg-shop-bg-surface rounded-t-3xl sm:rounded-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.14)] dark:shadow-none border border-transparent dark:border-shop-border-subtle overflow-hidden transition-colors"
            >
              <div className="p-5 border-b border-gray-100 dark:border-shop-border-subtle flex items-center justify-between">
                <div>
                  <h3 className="font-syne text-lg font-extrabold text-gray-900 dark:text-shop-text-primary">
                    {modalState.mode === 'edit' ? 'Edit Dish' : 'Add New Dish'}
                  </h3>
                  <p className="text-xs text-gray-400 dark:text-shop-text-secondary font-medium">
                    Manage title, price, photo & stock status
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setModalState({ isOpen: false, mode: 'add', item: null })
                  }
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-shop-bg-surface-raised text-gray-500 dark:text-shop-text-secondary flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-shop-text-secondary mb-1.5">
                    Dish Name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Masala Dosa or Cold Coffee"
                    className="w-full rounded-xl bg-gray-50 dark:bg-shop-bg-surface-raised border border-gray-200 dark:border-shop-border-subtle px-3.5 py-3 text-sm text-gray-900 dark:text-shop-text-primary placeholder:text-gray-400 dark:placeholder:text-shop-text-tertiary font-medium focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-shop-text-secondary mb-1.5">
                      Price (₹)
                    </label>
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      placeholder="e.g. 40"
                      className="w-full rounded-xl bg-gray-50 dark:bg-shop-bg-surface-raised border border-gray-200 dark:border-shop-border-subtle px-3.5 py-3 text-sm text-gray-900 dark:text-shop-text-primary placeholder:text-gray-400 dark:placeholder:text-shop-text-tertiary font-bold focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-shop-text-secondary mb-1.5">
                      Category
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full rounded-xl bg-gray-50 dark:bg-shop-bg-surface-raised border border-gray-200 dark:border-shop-border-subtle px-3.5 py-3 text-sm text-gray-900 dark:text-shop-text-primary font-semibold focus:outline-none focus:border-blue-600"
                    >
                      {categories
                        .filter((c) => c !== 'All')
                        .map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-shop-text-secondary mb-1.5">
                    Photo Upload / Image URL
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-gray-100 dark:bg-shop-bg-surface-raised hover:bg-gray-200 dark:hover:bg-shop-bg-surface-hover text-gray-700 dark:text-shop-text-secondary text-xs font-bold shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setImageFile(file);
                        }}
                      />
                    </label>
                    <input
                      type="text"
                      value={form.image}
                      onChange={(e) =>
                        setForm({ ...form, image: e.target.value })
                      }
                      placeholder="Or paste image URL..."
                      className="w-full rounded-xl bg-gray-50 dark:bg-shop-bg-surface-raised border border-gray-200 dark:border-shop-border-subtle px-3 py-3 text-xs text-gray-900 dark:text-shop-text-primary placeholder:text-gray-400 dark:placeholder:text-shop-text-tertiary focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  {imageFile && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-1">
                      Selected file: {imageFile.name}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm font-bold text-gray-800 dark:text-shop-text-primary">
                    Currently Available for Order
                  </span>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, available: !form.available })}
                    className={`w-12 h-7 rounded-full p-1 transition-colors flex items-center ${
                      form.available ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-shop-border-strong'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                        form.available ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 dark:border-shop-border-subtle bg-gray-50/60 dark:bg-shop-bg-surface-raised flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    setModalState({ isOpen: false, mode: 'add', item: null })
                  }
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-gray-500 dark:text-shop-text-secondary hover:bg-gray-100 dark:hover:bg-shop-bg-surface-hover"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveItem}
                  disabled={isSaving}
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold font-syne shadow-sm flex items-center justify-center gap-1.5 transition-all"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Save Dish</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
