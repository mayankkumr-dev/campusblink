import React from 'react';
import { Coffee, Edit2, Trash2 } from 'lucide-react';

export interface MenuItemRowProps {
  item: any;
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
}

export const MenuItemRow: React.FC<MenuItemRowProps> = ({ item, onEdit, onDelete }) => {
  return (
    <div className="group flex flex-col overflow-hidden rounded-3xl border border-border-subtle dark:border-shop-border-subtle bg-surface dark:bg-shop-bg-surface shadow-[0_2px_16px_rgba(0,0,0,0.03)] dark:shadow-none transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(0,0,0,0.07)] dark:hover:border-shop-border-strong">
      {/* Edge-to-Edge Image Header */}
      <div className="relative h-48 w-full overflow-hidden bg-surface-elevated dark:bg-shop-bg-surface-raised">
        {item.image_url ? (
          <img
            loading="lazy"
            src={item.image_url}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-text-placeholder dark:text-shop-text-tertiary">
            <Coffee className="h-12 w-12 stroke-[1.5]" />
          </div>
        )}

        {/* Floating Badges */}
        <div className="absolute top-3.5 left-3.5">
          <span className="rounded-full bg-white/95 dark:bg-slate-900/90 px-3 py-1 text-[11px] font-bold text-text-primary dark:text-shop-text-primary backdrop-blur-md shadow-2xs dark:shadow-none">
            {item.category || 'Food'}
          </span>
        </div>
        <div className="absolute top-3.5 right-3.5">
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-bold backdrop-blur-md shadow-2xs dark:shadow-none ${
              item.is_available
                ? 'bg-emerald-500/90 text-white'
                : 'bg-rose-500/90 text-white'
            }`}
          >
            {item.is_available ? 'Available' : 'Out of Stock'}
          </span>
        </div>
      </div>

      {/* Content & Crisp Price Typography */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-syne text-lg font-bold text-text-primary dark:text-shop-text-primary line-clamp-1">
          {item.name}
        </h3>
        <p className="mt-1 font-syne text-2xl font-extrabold text-text-primary dark:text-shop-text-primary">
          ₹{item.price}
        </p>

        {/* Minimalist Ghost Buttons */}
        <div className="mt-6 grid grid-cols-2 gap-2 pt-4 border-t border-border-subtle dark:border-shop-border-subtle">
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-transparent bg-surface dark:bg-shop-bg-surface py-2.5 text-xs font-bold text-text-primary dark:text-shop-text-primary transition-colors hover:border-slate-200 dark:hover:border-shop-border-strong hover:bg-surface-elevated dark:hover:bg-shop-bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <Edit2 className="h-3.5 w-3.5" /> Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-transparent bg-transparent py-2.5 text-xs font-bold text-accent-red transition-colors hover:bg-rose-50 dark:hover:bg-red-900/20 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
};
