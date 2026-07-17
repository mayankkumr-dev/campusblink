import React, { useState, useEffect } from 'react';
import { Badge } from '../../app/components/ui/badge';
import { LayoutGrid, ShoppingBag, Coffee, Settings, LogOut, RotateCcw, Check, Moon, Sun, Monitor } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from 'next-themes';
import { supabase } from '../../lib/supabase';
import { getMenuItems, getShopOrders, requestCanteenReorder, updateCanteenShopAvailability } from '../../api/canteen';
import { useShopStatus } from '../../hooks/useRealtime';
import toast from 'react-hot-toast';
import { decorateShopStatus } from '../../lib/shopStatus';
import { Logo } from '../../app/components/ui/Logo';
import { ListSkeleton } from '../../app/components/ui/Skeletons';
import { FeatureErrorBoundary } from '../../shared/components/FeatureErrorBoundary';
import {
  CanteenStatsHeader,
  ShopSettingsPanel,
  OrdersPanel,
  MenuEditorPanel,
  MobileOrdersDashboard,
  MobileOrderHistoryList,
  MobileMenuManagement,
} from './canteen';

export const CanteenDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('Live Orders');
  const profile = useAuthStore(state => state.profile);
  const user = useAuthStore(state => state.user);
  const { theme, setTheme } = useTheme();

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

  const isOpen = Boolean(shop?.is_open_now || shop?.is_active);
  const handleToggleShopStatus = async () => {
    const nextState = isOpen ? 'closed' : 'open';
    await handleOverride(nextState);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] dark:bg-shop-bg-base px-4 py-8">
        <div className="mx-auto w-full max-w-6xl space-y-4">
          <ListSkeleton rows={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh bg-surface dark:bg-shop-bg-base text-text-primary dark:text-shop-text-primary font-sans overflow-hidden">
      {/* Sleek Light/Dark-Mode Sidebar */}
      <aside className="hidden md:flex w-64 bg-surface dark:bg-shop-bg-surface border-r border-border-subtle dark:border-shop-border-subtle flex-col relative z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-none">
        <div className="h-20 flex items-center px-6 border-b border-border-subtle dark:border-shop-border-subtle">
          <Link
            to={user ? '/student/home' : '/'}
            className="no-underline cursor-pointer flex items-center transition-transform hover:scale-105"
          >
            <Logo
              alt="Campus Blink"
              loading="eager"
              className="h-8 w-auto object-contain"
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
                    ? 'bg-amber-500 dark:bg-shop-accent text-white font-bold shadow-xs dark:shadow-none'
                    : 'text-text-secondary dark:text-shop-text-secondary hover:text-text-primary dark:hover:text-shop-text-primary hover:bg-surface-elevated dark:hover:bg-shop-bg-surface-hover font-medium'
                } focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:focus-visible:ring-shop-accent`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-text-secondary/70 dark:text-shop-text-tertiary'}`} />
                <span className="text-sm tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-5 border-t border-border-subtle dark:border-shop-border-subtle bg-background dark:bg-shop-bg-surface-raised">
          <div className="flex items-center gap-3.5 mb-5">
            {shop?.logo_url ? (
              <img
                src={shop.logo_url}
                alt="Shop Logo"
                className="w-11 h-11 rounded-2xl border border-border-subtle dark:border-shop-border-subtle object-cover"
              />
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-accent-amber-soft border border-accent-amber-soft text-accent-amber flex items-center justify-center font-syne font-bold text-base">
                {shop?.name?.charAt(0) || 'C'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-syne font-bold text-sm text-text-primary dark:text-shop-text-primary leading-tight truncate">
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
            onClick={async () => {
              await supabase.auth.signOut();
              useAuthStore.getState().logout();
              navigate('/');
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-accent-red bg-surface dark:bg-shop-bg-surface border border-rose-200 dark:border-red-900/30 hover:bg-rose-50 dark:hover:bg-red-900/20 transition-colors font-bold text-xs shadow-2xs dark:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout Dashboard
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full w-full relative z-10 bg-surface dark:bg-shop-bg-base">
        <div className="hidden md:block">
          <CanteenStatsHeader activeView={activeView} newOrdersCount={newOrdersList.length} />
        </div>

        {/* Content View Area */}
        <div className="flex-1 overflow-auto p-0 md:p-6 lg:p-10 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-10">
          <FeatureErrorBoundary featureName="Canteen Dashboard">
            <div className="hidden md:block">
              <ShopSettingsPanel shop={shop} onOverride={handleOverride} />
            </div>

            {activeView === 'Live Orders' && (
              <>
                <div className="hidden md:block">
                  <OrdersPanel shopId={shop?.id} orders={orders} setOrders={setOrders} />
                </div>
                <div className="md:hidden">
                  <MobileOrdersDashboard
                    shop={shop}
                    onOverride={handleOverride}
                    orders={orders}
                    setOrders={setOrders}
                  />
                </div>
              </>
            )}

            {activeView === 'Order History' && (
              <>
                <div className="hidden md:block mx-auto max-w-7xl">
                  <div className="overflow-hidden rounded-3xl border border-border-subtle dark:border-shop-border-subtle bg-surface dark:bg-shop-bg-surface shadow-[0_2px_16px_rgba(0,0,0,0.03)] dark:shadow-none">
                    {historyOrders.length === 0 ? (
                      <div className="px-6 py-24 text-center">
                        <p className="font-syne text-base font-bold text-text-primary dark:text-shop-text-primary">
                        No order history available yet
                      </p>
                      <p className="mt-1 text-xs text-text-secondary dark:text-shop-text-secondary">
                        Past completed, reordered, and cancelled canteen orders will be recorded here.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-sans">
                        <thead>
                          <tr className="border-b border-border-subtle dark:border-shop-border-subtle bg-slate-50/80 dark:bg-shop-bg-surface-raised text-[11px] font-bold uppercase tracking-wider text-text-secondary dark:text-shop-text-secondary">
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Student</th>
                            <th className="px-6 py-4">Order ID</th>
                            <th className="px-6 py-4">Items Ordered</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Revenue</th>
                            <th className="px-6 py-4 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-shop-border-subtle">
                          {historyOrders.map((order, i) => (
                            <tr
                              key={i}
                              className="transition-colors hover:bg-slate-50/60 dark:hover:bg-shop-bg-surface-hover"
                            >
                              <td className="whitespace-nowrap px-6 py-4 text-xs font-semibold text-text-primary dark:text-shop-text-primary">
                                {new Date(order.created_at).toLocaleDateString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </td>
                              <td className="px-6 py-4 text-xs font-bold text-text-primary dark:text-shop-text-primary">
                                {order.profiles?.name || 'Student'}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-xs font-mono text-text-secondary dark:text-shop-text-secondary">
                                #{order.id.slice(0, 6)}
                              </td>
                              <td className="px-6 py-4 text-xs text-text-secondary dark:text-shop-text-secondary max-w-xs">
                                <div className="truncate">
                                  {order.items
                                    ?.map((item: any) => `${item.qty}x ${item.name}`)
                                    .join(', ')}
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-6 py-4">
                                {order.status === 'completed' || order.status === 'picked_up' ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 dark:border-emerald-900/30 bg-accent-green/15 px-3 py-1 text-[11px] font-bold text-accent-green">
                                    Completed
                                  </span>
                                ) : order.status === 'reorder_requested' ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-accent-amber-soft dark:border-amber-900/30 bg-accent-amber-soft px-3 py-1 text-[11px] font-bold text-accent-amber">
                                    Reorder Sent
                                  </span>
                                ) : order.status === 'reorder_completed' ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-accent-blue-soft dark:border-blue-900/30 bg-accent-blue-soft px-3 py-1 text-[11px] font-bold text-blue-700 dark:text-blue-400">
                                    Reordered
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 dark:border-red-900/30 bg-accent-red/15 px-3 py-1 text-[11px] font-bold text-accent-red">
                                    Rejected
                                  </span>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-right font-syne text-sm font-extrabold text-text-primary dark:text-shop-text-primary">
                                {order.status === 'completed' || order.status === 'picked_up' ? (
                                  `₹${order.total}`
                                ) : (
                                  <span className="text-text-secondary/70 dark:text-shop-text-tertiary line-through">
                                    ₹{order.total}
                                  </span>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-center">
                                {(order.status === 'completed' || order.status === 'picked_up') && (
                                  <button
                                    type="button"
                                    onClick={() => handleRequestReorder(order)}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-accent-amber-soft dark:border-amber-900/30 bg-accent-amber-soft dark:bg-amber-900/20 px-3.5 py-1.5 text-xs font-bold text-accent-amber transition-colors hover:bg-amber-100 dark:hover:bg-amber-900/40 focus:outline-none focus:ring-2 focus:ring-accent-amber dark:focus:ring-shop-accent"
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
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400">
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
              <div className="md:hidden">
                <MobileOrderHistoryList
                  historyOrders={historyOrders}
                  onRequestReorder={handleRequestReorder}
                />
              </div>
            </>
            )}

            {activeView === 'Menu Management' && (
              <>
                <div className="hidden md:block">
                  <MenuEditorPanel
                    shop={shop}
                    menuItems={menuItems}
                    setMenuItems={setMenuItems}
                  />
                </div>
                <div className="md:hidden">
                  <MobileMenuManagement
                    shop={shop}
                    menuItems={menuItems}
                    setMenuItems={setMenuItems}
                  />
                </div>
              </>
            )}

            {activeView === 'Settings' && (
              <>
                {/* Desktop Settings View */}
                <div className="hidden md:block space-y-6 mx-auto max-w-3xl">
                  {/* Appearance Panel */}
                  <div className="rounded-3xl border border-border-subtle dark:border-shop-border-subtle bg-surface dark:bg-shop-bg-surface p-6 sm:p-8 shadow-[0_2px_16px_rgba(0,0,0,0.03)] dark:shadow-none flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 dark:bg-shop-accent-soft-bg border border-amber-100 dark:border-shop-accent/20 text-amber-500 dark:text-shop-accent shadow-2xs dark:shadow-none">
                        {theme === 'dark' ? <Moon className="h-6 w-6" /> : <Sun className="h-6 w-6" />}
                      </div>
                      <div>
                        <h2 className="font-syne text-xl font-extrabold text-text-primary dark:text-shop-text-primary">
                          Appearance
                        </h2>
                        <p className="mt-1 text-sm text-text-secondary dark:text-shop-text-secondary">
                          Choose how your canteen dashboard looks.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex rounded-xl border border-border-subtle dark:border-shop-border-strong bg-background dark:bg-shop-bg-surface-raised p-1 self-start md:self-auto">
                      {[
                        { id: 'light', label: 'Light', icon: Sun },
                        { id: 'dark', label: 'Dark', icon: Moon },
                        { id: 'system', label: 'System', icon: Monitor },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTheme(t.id)}
                          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold capitalize transition-colors ${
                            theme === t.id
                              ? 'bg-amber-500 dark:bg-shop-accent text-white shadow-sm dark:shadow-none'
                              : 'text-text-secondary dark:text-shop-text-secondary hover:text-text-primary dark:hover:text-shop-text-primary'
                          } focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:focus-visible:ring-shop-accent`}
                        >
                          <t.icon className="h-4 w-4" />
                          <span className="inline">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-border-subtle dark:border-shop-border-subtle bg-surface dark:bg-shop-bg-surface p-12 sm:p-16 text-center shadow-[0_2px_16px_rgba(0,0,0,0.03)] dark:shadow-none">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-accent-amber-soft dark:bg-shop-accent-soft-bg border border-amber-100 dark:border-shop-accent/20 text-accent-amber dark:text-shop-accent shadow-2xs dark:shadow-none">
                      <Settings className="h-9 w-9 stroke-[1.8]" />
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent-amber-soft dark:bg-shop-accent-soft-bg border border-accent-amber-soft dark:border-shop-accent/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-amber dark:text-shop-accent mb-3">
                      Under Active Development
                    </span>
                    <h2 className="font-syne text-2xl sm:text-3xl font-extrabold text-text-primary dark:text-shop-text-primary">
                      Shop Preferences & Operating Configuration
                    </h2>
                    <p className="mx-auto mt-2.5 max-w-md text-xs sm:text-sm text-text-secondary dark:text-shop-text-secondary leading-relaxed">
                      Advanced shop notifications, payout account settings, and automated shift scheduling are currently being fine-tuned. Use the Live Shop Status toggle at the top to manage immediate availability.
                    </p>
                  </div>
                </div>

                {/* Mobile Settings View (Touched flush to top) */}
                <div className="md:hidden flex flex-col min-h-dvh bg-[#FAFAFA] dark:bg-shop-bg-base pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
                  <header className="sticky top-0 z-40 bg-white/95 dark:bg-shop-bg-surface/95 backdrop-blur-md shadow-[0_2px_15px_rgba(0,0,0,0.04)] dark:shadow-none border-b border-gray-100 dark:border-shop-border-subtle px-4 pt-3.5 pb-3 flex items-center justify-between">
                    <div>
                      <h1 className="font-syne text-xl font-extrabold text-gray-900 dark:text-shop-text-primary tracking-tight">
                        Canteen Settings
                      </h1>
                      <p className="text-[11px] font-semibold text-gray-400 dark:text-shop-text-secondary mt-0.5">
                        Preferences & Operating Configuration
                      </p>
                    </div>

                    <div
                      onClick={handleToggleShopStatus}
                      className={`cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-full transition-all active:scale-95 ${
                        isOpen
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                          : 'bg-gray-100 dark:bg-shop-bg-surface-raised text-gray-600 dark:text-shop-text-secondary border border-transparent dark:border-shop-border-subtle'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                        }`}
                      />
                      <span className="text-xs font-bold font-syne">
                        {isOpen ? 'Accepting Orders' : 'Closed'}
                      </span>
                    </div>
                  </header>

                  <div className="p-4 space-y-4">
                    {/* Appearance Switcher Card */}
                    <div className="rounded-3xl bg-white dark:bg-shop-bg-surface p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none border border-gray-100 dark:border-shop-border-subtle">
                      <div className="mb-4">
                        <h3 className="font-syne font-bold text-base text-gray-900 dark:text-shop-text-primary">
                          Appearance
                        </h3>
                        <p className="text-xs text-gray-400 dark:text-shop-text-secondary">
                          Customize how Canteen Dashboard looks on your device.
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { id: 'light', label: 'Light Mode' },
                          { id: 'dark', label: 'Dark Mode' },
                          { id: 'system', label: 'System' },
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setTheme(t.id)}
                            className={`flex flex-col items-center justify-center py-3 px-2 rounded-2xl border-2 font-syne text-xs font-bold transition-all ${
                              theme === t.id
                                ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                                : 'border-gray-100 dark:border-shop-border-subtle bg-gray-50 dark:bg-shop-bg-surface-raised text-gray-600 dark:text-shop-text-secondary'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Hardware / Active Shop Profile */}
                    <div className="rounded-3xl bg-white dark:bg-shop-bg-surface p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none border border-gray-100 dark:border-shop-border-subtle flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-shop-text-secondary">
                          Active Canteen
                        </p>
                        <p className="font-syne font-extrabold text-base text-gray-900 dark:text-shop-text-primary mt-0.5">
                          {shop?.name || 'Campus Canteen'}
                        </p>
                      </div>

                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-syne font-bold text-xs">
                        Active
                      </span>
                    </div>

                    {/* Account Actions */}
                    <button
                      type="button"
                      onClick={async () => {
                        await supabase.auth.signOut();
                        useAuthStore.getState().logout();
                        navigate('/');
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-rose-600 bg-white dark:bg-shop-bg-surface border border-rose-100 dark:border-red-900/30 hover:bg-rose-50 transition-colors font-bold text-sm shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </FeatureErrorBoundary>
        </div>

        {/* Sleek Mobile Bottom Navigation Bar (Light & Dark Mode supported) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-shop-bg-surface border-t border-gray-100 dark:border-shop-border-subtle shadow-[0_-4px_25px_rgba(0,0,0,0.04)] dark:shadow-none h-[calc(64px+env(safe-area-inset-bottom,8px))] pb-[env(safe-area-inset-bottom,8px)] z-50 flex items-center justify-around px-1 select-none">
          {navItems.map((item) => {
            const isActive = activeView === item.label;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => setActiveView(item.label)}
                className="flex flex-col items-center justify-center gap-1 flex-1 h-full pt-1.5 focus:outline-none"
              >
                <div
                  className={`relative flex items-center justify-center px-3.5 py-1 rounded-2xl transition-all duration-300 ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'text-gray-400 dark:text-shop-text-tertiary'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label === 'Live Orders' && newOrdersList.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-white dark:border-shop-bg-surface" />
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] tracking-tight transition-colors ${
                    isActive
                      ? 'font-bold text-blue-600 dark:text-blue-400'
                      : 'font-medium text-gray-400 dark:text-shop-text-secondary'
                  }`}
                >
                  {item.label === 'Menu Management' ? 'Menu' : item.label === 'Order History' ? 'History' : item.label}
                </span>
              </button>
            );
          })}
        </nav>

      </main>
    </div>
  );
};
