import React, { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import { LayoutGrid, ShoppingBag, Coffee, Settings, LogOut, RotateCcw, Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { getMenuItems, getShopOrders, requestCanteenReorder, updateCanteenShopAvailability } from '../../api/canteen';
import { useShopStatus } from '../../hooks/useRealtime';
import toast from 'react-hot-toast';
import { decorateShopStatus } from '../../lib/shopStatus';
import { ThemeAwareLogo } from './ThemeAwareLogo';
import { ListSkeleton } from './ui/Skeletons';
import { FeatureErrorBoundary } from './FeatureErrorBoundary';
import {
  CanteenStatsHeader,
  ShopSettingsPanel,
  OrdersPanel,
  MenuEditorPanel,
} from './canteen';

export const CanteenDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('Live Orders');
  const profile = useAuthStore(state => state.profile);
  const user = useAuthStore(state => state.user);

  const [shop, setShop] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load Shop Details
  useEffect(() => {
    async function loadShop() {
      if (!profile?.id) return;
      const { data } = await supabase.from('canteen_shops').select('*').eq('owner_id', profile.id).single();
      if (data) {
        setShop(decorateShopStatus(data));
         // load menu & orders
         const { data: menuData } = await getMenuItems(data.id);
         if (menuData) setMenuItems(menuData);
         
         const { data: orderData } = await getShopOrders(data.id);
         if (orderData) setOrders(orderData);
      }
      setIsLoading(false);
    }
    loadShop();
  }, [profile?.id]);

  useShopStatus('canteen_shops', shop?.id, (updatedShop) => {
    setShop((current: any) => ({ ...current, ...decorateShopStatus(updatedShop) }));
  });

  const handleOverride = async (nextOverride: string | null) => {
    if (!shop?.id) return;
    const { data, error } = await updateCanteenShopAvailability(shop.id, nextOverride);
    if (error) {
      toast.error(error.message || 'Failed to update shop status');
      return;
    }
    setShop(data);
    toast.success(nextOverride === 'open' ? 'Shop forced open.' : nextOverride === 'closed' ? 'Shop forced closed.' : 'Shop back on schedule.');
  };

  const handleRequestReorder = async (order: any) => {
    const { error } = await requestCanteenReorder(order.id, order.student_id, order.shop_id);
    if (error) {
      toast.error('Failed to send reorder request');
      return;
    }

    setOrders(prev => prev.map((currentOrder) => (
      currentOrder.id === order.id ? { ...currentOrder, status: 'reorder_requested' } : currentOrder
    )));
    toast.success('Reorder request sent to student.');
  };

  const navItems = [
    { icon: LayoutGrid, label: 'Live Orders' },
    { icon: ShoppingBag, label: 'Order History' },
    { icon: Coffee, label: 'Menu Management' },
    { icon: Settings, label: 'Settings' },
  ];

  const newOrdersList = orders.filter(o => o.status === 'placed').sort((a,b) => (b.is_delivery_order ? 1 : 0) - (a.is_delivery_order ? 1 : 0));
  const historyOrders = orders.filter(o => ['completed', 'cancelled', 'picked_up', 'reorder_requested', 'reorder_completed'].includes(o.status));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] px-4 py-8">
        <div className="mx-auto w-full max-w-6xl space-y-4">
          <ListSkeleton rows={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-surface text-text-primary font-sans overflow-hidden">
      {/* Sleek Light-Mode Sidebar */}
      <aside className="hidden md:flex w-64 bg-surface border-r border-border-subtle flex-col relative z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="h-20 flex items-center px-6 border-b border-border-subtle">
          <Link
            to={user ? '/student/home' : '/'}
            className="no-underline cursor-pointer flex items-center transition-transform hover:scale-105"
          >
            <ThemeAwareLogo
              alt="Campus Blink"
              loading="eager"
              className="h-12 w-auto object-contain"
            />
          </Link>
        </div>

        <nav className="flex-1 py-8 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item, i) => {
            const isActive = activeView === item.label;
            return (
              <button
                type="button"
                key={i}
                onClick={() => setActiveView(item.label)}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all ${
                  isActive
                    ? 'bg-amber-500 text-white font-bold shadow-xs'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated font-medium'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-text-secondary/70'}`} />
                <span className="text-sm tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-5 border-t border-border-subtle bg-background">
          <div className="flex items-center gap-3.5 mb-5">
            {shop?.logo_url ? (
              <img
                src={shop.logo_url}
                alt="Shop Logo"
                className="w-11 h-11 rounded-2xl border border-border-subtle object-cover"
              />
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-accent-amber-soft border border-accent-amber-soft text-accent-amber flex items-center justify-center font-syne font-bold text-base">
                {shop?.name?.charAt(0) || 'C'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-syne font-bold text-sm text-text-primary leading-tight truncate">
                {shop?.name || 'My Canteen'}
              </p>
              <p
                className={`text-[11px] flex items-center gap-1.5 mt-1 font-semibold ${
                  shop?.is_open_now ? 'text-accent-green' : 'text-accent-red'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    shop?.is_open_now ? 'bg-accent-green animate-pulse' : 'bg-rose-500'
                  }`}
                />
                {shop?.is_open_now ? 'Accepting Orders' : 'Closed'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-accent-red bg-surface border border-rose-200 hover:bg-rose-50 transition-colors font-bold text-xs shadow-2xs"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout Dashboard
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full w-full relative z-10 bg-surface">
        <CanteenStatsHeader activeView={activeView} newOrdersCount={newOrdersList.length} />

        {/* Mobile Navigation Selector */}
        <div className="md:hidden px-4 py-3 border-b border-border-subtle bg-surface">
          <select
            value={activeView}
            onChange={(e) => setActiveView(e.target.value)}
            className="w-full bg-surface border border-border-subtle rounded-xl px-3.5 py-2.5 text-xs font-semibold text-text-primary"
          >
            {navItems.map((item) => (
              <option key={item.label} value={item.label}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {/* Content View Area */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-10 pb-24 md:pb-10">
          <FeatureErrorBoundary featureName="Canteen Dashboard">
            <ShopSettingsPanel shop={shop} onOverride={handleOverride} />

            {activeView === 'Live Orders' && (
              <OrdersPanel shopId={shop?.id} orders={orders} setOrders={setOrders} />
            )}

            {activeView === 'Order History' && (
              <div className="mx-auto max-w-7xl">
                <div className="overflow-hidden rounded-3xl border border-border-subtle bg-surface shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
                  {historyOrders.length === 0 ? (
                    <div className="px-6 py-24 text-center">
                      <p className="font-syne text-base font-bold text-text-primary">
                        No order history available yet
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">
                        Past completed, reordered, and cancelled canteen orders will be recorded here.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-sans">
                        <thead>
                          <tr className="border-b border-border-subtle bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Student</th>
                            <th className="px-6 py-4">Order ID</th>
                            <th className="px-6 py-4">Items Ordered</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Revenue</th>
                            <th className="px-6 py-4 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {historyOrders.map((order, i) => (
                            <tr
                              key={i}
                              className="transition-colors hover:bg-slate-50/60"
                            >
                              <td className="whitespace-nowrap px-6 py-4 text-xs font-semibold text-text-primary">
                                {new Date(order.created_at).toLocaleDateString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </td>
                              <td className="px-6 py-4 text-xs font-bold text-text-primary">
                                {order.profiles?.name || 'Student'}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-xs font-mono text-text-secondary">
                                #{order.id.slice(0, 6)}
                              </td>
                              <td className="px-6 py-4 text-xs text-text-secondary max-w-xs">
                                <div className="truncate">
                                  {order.items
                                    ?.map((item: any) => `${item.qty}x ${item.name}`)
                                    .join(', ')}
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-6 py-4">
                                {order.status === 'completed' || order.status === 'picked_up' ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-accent-green/15 px-3 py-1 text-[11px] font-bold text-accent-green">
                                    Completed
                                  </span>
                                ) : order.status === 'reorder_requested' ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-accent-amber-soft bg-accent-amber-soft px-3 py-1 text-[11px] font-bold text-accent-amber">
                                    Reorder Sent
                                  </span>
                                ) : order.status === 'reorder_completed' ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-accent-blue-soft bg-accent-blue-soft px-3 py-1 text-[11px] font-bold text-blue-700">
                                    Reordered
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-accent-red/15 px-3 py-1 text-[11px] font-bold text-accent-red">
                                    Rejected
                                  </span>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-right font-syne text-sm font-extrabold text-text-primary">
                                {order.status === 'completed' || order.status === 'picked_up' ? (
                                  `₹${order.total}`
                                ) : (
                                  <span className="text-text-secondary/70 line-through">
                                    ₹{order.total}
                                  </span>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-center">
                                {(order.status === 'completed' || order.status === 'picked_up') && (
                                  <button
                                    type="button"
                                    onClick={() => handleRequestReorder(order)}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-accent-amber-soft bg-accent-amber-soft px-3.5 py-1.5 text-xs font-bold text-accent-amber transition-colors hover:bg-amber-100"
                                  >
                                    <RotateCcw className="h-3 w-3" /> Request Reorder
                                  </button>
                                )}
                                {order.status === 'reorder_requested' && (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-accent-amber">
                                    <RotateCcw className="h-3 w-3 animate-spin" /> Awaiting student
                                  </span>
                                )}
                                {order.status === 'reorder_completed' && (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-accent-blue">
                                    <Check className="h-3.5 w-3.5" /> Reordered
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeView === 'Menu Management' && (
              <MenuEditorPanel
                shop={shop}
                menuItems={menuItems}
                setMenuItems={setMenuItems}
              />
            )}

            {activeView === 'Settings' && (
              <div className="mx-auto max-w-3xl rounded-3xl border border-border-subtle bg-surface p-12 sm:p-16 text-center shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-accent-amber-soft border border-amber-100 text-accent-amber shadow-2xs">
                  <Settings className="h-9 w-9 stroke-[1.8]" />
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-amber-soft border border-accent-amber-soft px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-amber mb-3">
                  Under Active Development
                </span>
                <h2 className="font-syne text-2xl sm:text-3xl font-extrabold text-text-primary">
                  Shop Preferences & Operating Configuration
                </h2>
                <p className="mx-auto mt-2.5 max-w-md text-xs sm:text-sm text-text-secondary leading-relaxed">
                  Advanced shop notifications, payout account settings, and automated shift scheduling are currently being fine-tuned. Use the Live Shop Status toggle at the top to manage immediate availability.
                </p>
              </div>
            )}
          </FeatureErrorBoundary>
        </div>
      </main>
    </div>
  );
};
