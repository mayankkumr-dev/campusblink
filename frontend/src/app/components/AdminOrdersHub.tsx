import React from 'react';
import { useSearchParams } from 'react-router';
import { AdminCanteenOrdersPage } from './AdminCanteenOrdersPage';
import { AdminPrintOrdersPage } from './AdminPrintOrdersPage';
import { AdminCanteenMenuPage } from './AdminCanteenMenuPage';
import { ShoppingBag, FileText, UtensilsCrossed } from 'lucide-react';

export const AdminOrdersHub: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'canteen';

  const tabs = [
    { id: 'canteen', label: 'Canteen Orders', icon: ShoppingBag },
    { id: 'print', label: 'Print Orders', icon: FileText },
    { id: 'menu', label: 'Canteen Menu', icon: UtensilsCrossed },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Scrollable Tabs */}
      <div className="bg-[var(--bg)] p-2 rounded-lg border border-black/[0.08] flex items-center gap-2 overflow-x-auto hide-scrollbar sticky top-0 z-10 shadow-sm">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSearchParams({ tab: tab.id })}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                isActive 
                  ? 'bg-[var(--yellow)] text-[var(--text)] shadow-sm' 
                  : 'text-[var(--text-secondary)] hover:bg-black/5 hover:text-[var(--text)]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--text)]' : 'text-[var(--text-secondary)]'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="pt-2 pb-10">
        {activeTab === 'canteen' && <AdminCanteenOrdersPage />}
        {activeTab === 'print' && <AdminPrintOrdersPage />}
        {activeTab === 'menu' && <AdminCanteenMenuPage />}
      </div>
    </div>
  );
};
