import React from 'react';
import { useSearchParams } from 'react-router';
import { AdminCanteenOrdersPage } from './AdminCanteenOrdersPage';
import { AdminPrintOrdersPage } from './AdminPrintOrdersPage';
import { AdminCanteenMenuPage } from './AdminCanteenMenuPage';
import { ShoppingBag, Printer, UtensilsCrossed, Activity, Clock, AlertCircle } from 'lucide-react';

export const AdminOrdersHub: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'canteen';

  const tabs = [
    { id: 'canteen', label: 'Canteen Orders', icon: ShoppingBag },
    { id: 'print', label: 'Print Orders', icon: Printer },
    { id: 'menu', label: 'Canteen Menu Catalog', icon: UtensilsCrossed },
  ] as const;

  return (
    <div className="space-y-6 font-sans">
      {/* Operations Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-syne text-xl font-extrabold text-slate-900 tracking-tight">
            Shop Operations Hub
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Monitor real-time canteen orders, print jobs, and menu availability across all campus shops
          </p>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-100 flex items-center gap-1.5 overflow-x-auto hide-scrollbar shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSearchParams({ tab: tab.id })}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon
                className={`w-4 h-4 stroke-[2] ${
                  isActive ? 'text-white' : 'text-slate-400'
                }`}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="pt-1 pb-12">
        {activeTab === 'canteen' && <AdminCanteenOrdersPage />}
        {activeTab === 'print' && <AdminPrintOrdersPage />}
        {activeTab === 'menu' && <AdminCanteenMenuPage />}
      </div>
    </div>
  );
};
