import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { LayoutGrid, ShoppingBag, Coffee, Settings, LogOut, Bell, Search, Clock, Check, X, User, AlertCircle, MessageSquare, ChefHat, Plus, Edit2, Trash2, Image as ImageIcon, RotateCcw } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { getMenuItems, updateOrderStatus, getShopOrders, createMenuItem, updateMenuItem, deleteMenuItem, requestCanteenReorder, uploadMenuItemPhoto, updateCanteenShopAvailability } from '../../api/canteen';
import { useCanteenOrders, useShopStatus } from '../../hooks/useRealtime';
import { getAvatarDataUrl } from '../../lib/avatar';
import toast from 'react-hot-toast';
import { decorateShopStatus } from '../../lib/shopStatus';
import { ThemeAwareLogo } from './ThemeAwareLogo';
import { ListSkeleton } from './ui/Skeletons';

export const CanteenDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('Live Orders');
  const profile = useAuthStore(state => state.profile);
  const user = useAuthStore(state => state.user);

  const [shop, setShop] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Reject Modal State
  const [rejectModal, setRejectModal] = useState<{ isOpen: boolean, order: any | null }>({ isOpen: false, order: null });
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');

  // Menu Management Modal State
  const [menuModal, setMenuModal] = useState<{ isOpen: boolean, mode: 'add' | 'edit', item: any | null }>({ isOpen: false, mode: 'add', item: null });
  const [menuForm, setMenuForm] = useState({ name: '', price: '', category: 'Snacks', image: '', available: true });
  const [menuImageFile, setMenuImageFile] = useState<File | null>(null);

  const rejectReasons = [
    "Item(s) Not Available",
    "Out of Stock",
    "Kitchen is currently too busy",
    "Canteen is closing soon",
    "Price updated, please re-order"
  ];

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

  // Realtime hook for incoming / updated orders
  useCanteenOrders(shop?.id, (newOrder) => {
    // on new order
    setOrders(prev => [newOrder, ...prev]);
  }, (updatedOrder) => {
    // on update
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o));
  });

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

  const handleAccept = async (id: string) => {
    const { error } = await updateOrderStatus(id, 'preparing');
    if (error) toast.error("Failed to accept order: " + error.message);
    else toast.success("Order accepted!");
  };

  const handleMarkReady = async (id: string) => {
    const { error } = await updateOrderStatus(id, 'ready');
    if (error) toast.error("Failed to mark ready");
    else toast.success("Order marked ready for pickup!");
  };

  const handleDismissReady = async (id: string) => {
    const { error } = await updateOrderStatus(id, 'picked_up');
    if (error) toast.error("Failed to complete order");
    else toast.success("Order marked collected!");
  };

  const handleRejectClick = (order: any) => {
    setRejectModal({ isOpen: true, order });
    setSelectedReason('');
    setCustomReason('');
  };

  const confirmReject = async () => {
    if (rejectModal.order) {
      const reason = selectedReason || customReason;
      const { error } = await updateOrderStatus(rejectModal.order.id, 'cancelled', {
        rejectionReason: reason,
      });
      if (error) {
        toast.error("Failed to reject order: " + error.message);
      } else {
        toast.success("Order rejected.");
      }
    }
    setRejectModal({ isOpen: false, order: null });
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

  // Menu Management Handlers
  const handleOpenMenuModal = (mode: 'add' | 'edit', item: any | null = null) => {
    if (mode === 'edit' && item) {
      setMenuForm({ name: item.name, price: item.price.toString(), category: item.category, image: item.image_url || '', available: item.is_available });
    } else {
      setMenuForm({ name: '', price: '', category: 'Snacks', image: '', available: true });
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
        is_available: menuForm.available
      };

      if (menuModal.mode === 'add') {
        const { data, error } = await createMenuItem(payload);
        if (error) toast.error(error.message);
        else {
          setMenuItems(prev => [...prev, data]);
          toast.success("Item added");
        }
      } else if (menuModal.mode === 'edit' && menuModal.item) {
        const { data, error } = await updateMenuItem(menuModal.item.id, payload);
        if (error) toast.error(error.message);
        else {
          setMenuItems(prev => prev.map(item => item.id === menuModal.item.id ? { ...item, ...data } : item));
          toast.success("Item updated");
        }
      }
      setMenuModal({ isOpen: false, mode: 'add', item: null });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMenuItem = async (id: string) => {
    if(window.confirm('Are you sure you want to delete this item?')) {
       const { error } = await deleteMenuItem(id);
       if (error) toast.error(error.message);
       else {
         setMenuItems(prev => prev.filter(item => item.id !== id));
         toast.success("Item deleted");
       }
    }
  };

  const navItems = [
    { icon: LayoutGrid, label: 'Live Orders' },
    { icon: ShoppingBag, label: 'Order History' },
    { icon: Coffee, label: 'Menu Management' },
    { icon: Settings, label: 'Settings' },
  ];

  const newOrdersList = orders.filter(o => o.status === 'placed').sort((a,b) => (b.is_delivery_order ? 1 : 0) - (a.is_delivery_order ? 1 : 0));
  const inProcessOrders = orders.filter(o => o.status === 'preparing').sort((a,b) => (b.is_delivery_order ? 1 : 0) - (a.is_delivery_order ? 1 : 0));
  const readyOrders = orders.filter(o => o.status === 'ready').sort((a,b) => (b.is_delivery_order ? 1 : 0) - (a.is_delivery_order ? 1 : 0));
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
    <div className="flex min-h-dvh bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 bg-[var(--bg-primary)] border-r border-[var(--text-primary)]/10 flex-col relative z-20">
        <div className="h-20 flex items-center px-6 border-b border-[var(--text-primary)]/10">
          <div className="h-[40px] flex items-center shrink-0 mb-4 ml-2 mt-2">
             <Link to={user ? '/student/home' : '/'} className="no-underline cursor-pointer flex flex-col items-center justify-center drop-shadow-sm transition-transform hover:scale-105">
                 <ThemeAwareLogo alt="Campus Blink" loading="eager" className="h-[65px] w-auto object-contain shrink-0" />
             </Link>
          </div>
        </div>
        
        <nav className="flex-1 py-8 px-4 space-y-3 overflow-y-auto">
          {navItems.map((item, i) => (
            <button 
              key={i} 
              onClick={() => setActiveView(item.label)}
              className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-lg transition-all ${
              activeView === item.label 
                ? 'bg-[var(--bg-primary)]var(--yellow)]/20 to-transparent text-[var(--text-primary)] border-l-4 border-[var(--border)]' 
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
            }`}>
              <item.icon className={`w-5 h-5 ${activeView === item.label ? 'text-[var(--yellow)] drop-shadow-sm' : ''}`} />
              <span className="text-sm tracking-wide">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-[var(--text-primary)]/10 bg-[var(--bg-primary)]/50">
          <div className="flex items-center gap-4 mb-6">
             {shop?.logo_url ? (
               <img src={shop.logo_url} alt="Shop Logo" className="w-12 h-12 rounded-full border-2 border-[var(--border)]" />
             ) : (
               <div className="w-12 h-12 rounded-full bg-[var(--bg)] border-2 border-[var(--border)]">
                 {shop?.name?.charAt(0) || 'C'}
               </div>
             )}
            <div>
              <p className="font-syne font-bold text-base leading-tight truncate w-32">{shop?.name || 'My Canteen'}</p>
              <p className={`text-xs flex items-center gap-1.5 mt-1 font-medium tracking-wide ${shop?.is_open_now ? 'text-green-400' : 'text-red-400'}`}>
                {shop?.is_open_now ? (
                  <><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" /> Accepting Orders</>
                ) : (
                  <><span className="w-2 h-2 rounded-full bg-red-500" /> Closed</>
                )}
              </p>
            </div>
          </div>
          <button onClick={() => navigate('/login')} className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors font-bold text-sm">
            <LogOut className="w-4 h-4" /> Logout Dashboard
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full w-full relative z-10 bg-[var(--bg-primary)]">
        {/* Decorative Background Elements */}
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-[var(--yellow)]/10 rounded-md blur-[150px] pointer-events-none" />
        
        {/* Header */}
        <header className="h-16 md:h-20 flex items-center justify-between px-4 md:px-10 border-b border-[var(--text-primary)]/10 bg-[var(--bg)]/80  z-10 sticky top-0">
          <div className="flex items-center gap-3 md:gap-5 min-w-0">
            <h1 className="font-syne font-bold text-xl md:text-3xl tracking-tight truncate">{activeView}</h1>
            {activeView === 'Live Orders' && (
              <Badge className="bg-[var(--yellow)] text-[var(--text)] font-bold px-3 py-1 text-sm shadow-[0_0_15px_rgba(255,214,0,0.3)]">
                {newOrdersList.length} New
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-3 md:gap-8">
            <div className="relative group hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)] group-focus-within:text-[var(--yellow)] transition-colors" />
              <input 
                placeholder="Search anything..." 
                className="bg-[var(--bg)] border border-[var(--border)] w-80 transition-all text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              />
            </div>
            <button className="relative text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-2 bg-[var(--bg)] rounded-md border border-[var(--text-primary)]/10 hover:border-[var(--yellow)]">
              <Bell className="w-5 h-5" />
              {newOrdersList.length > 0 && (
                <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
              )}
            </button>
          </div>
        </header>

        <div className="md:hidden px-4 py-3 border-b border-[var(--text-primary)]/10 bg-[var(--bg)]/80 ">
          <select
            value={activeView}
            onChange={(e) => setActiveView(e.target.value)}
            className="w-full bg-[var(--bg)] border border-[var(--text-primary)]/10 rounded-lg px-3 py-2.5 text-sm font-sans"
          >
            {navItems.map((item) => (
              <option key={item.label} value={item.label}>{item.label}</option>
            ))}
          </select>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 md:p-10 pb-24 md:pb-10 safe-area-bottom">
          <div className="mx-auto mb-6 max-w-7xl rounded-[20px] border border-[var(--border)] bg-[var(--bg)] p-5 shadow-soft">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--yellow-dark)]">Live shop status</p>
                <h2 className="mt-2 font-syne text-2xl font-bold text-[var(--text-primary)]">{shop?.is_open_now ? 'Open for orders' : 'Currently closed'}</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{shop?.shop_status_reason || 'Availability follows your schedule unless manually overridden.'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => handleOverride('open')} className="rounded-md border border-[var(--success-light)] bg-[#F0FDF4] px-4 py-2 text-sm font-bold text-[var(--success-dark)]">Force open</button>
                <button onClick={() => handleOverride('closed')} className="rounded-md border border-[#FEE2E2] bg-[var(--error-light)] px-4 py-2 text-sm font-bold text-[var(--error-dark)]">Force closed</button>
                <button onClick={() => handleOverride(null)} className="rounded-md border border-black/10 bg-[var(--bg-primary)] px-4 py-2 text-sm font-bold text-[var(--text-primary)]">Use schedule</button>
              </div>
            </div>
          </div>

          {activeView === 'Live Orders' && (
            <div className="max-w-7xl mx-auto space-y-12 flex flex-col">
              
              {/* Ready / In Process Section */}
              <AnimatePresence>
                {(inProcessOrders.length > 0 || readyOrders.length > 0) && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-6 order-2"
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="font-syne font-bold text-2xl flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)] animate-pulse" /> 
                        In Process & Ready
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      <AnimatePresence>
                        {/* Ready Orders */}
                        {readyOrders.map((order) => (
                          <motion.div key={order.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                            <Card className="bg-green-50 border-green-500/30 flex flex-col p-0 overflow-hidden shadow-soft group">
                              <div className="p-4 border-b border-green-500/20 bg-green-100 flex justify-between items-center">
                                <span className="font-syne font-bold text-lg text-[var(--text-primary)]">#{order.id.slice(0, 6)}</span>
                                <Badge className="bg-green-500 text-white font-bold text-xs">Ready for Pickup</Badge>
                              </div>
                              <div className="p-4 flex items-center gap-3 bg-[var(--bg)]">
                                <div className="w-10 h-10 rounded-full border border-green-500/30 overflow-hidden">
                                  <img
                                    src={order.profiles?.avatar_url || getAvatarDataUrl({ name: order.profiles?.name, seed: order.student_id || order.id })}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div>
                                  <p className="text-[var(--text-primary)] font-bold text-sm">{order.profiles?.name || 'Student'}</p>
                                  <p className="text-xs text-green-600">{order.items?.length || 0} items • ₹{order.total}</p>
                                  {order.is_delivery_order && (
                                    <span className="inline-flex mt-1 items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-[var(--success-light)] text-[var(--success-dark)]">
                                      🚀 Delivery: {order.delivery_room_number || 'Room'}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="px-4 py-3 bg-[var(--bg)] border-t border-green-500/20">
                                <ul className="space-y-1">
                                  {order.items?.map((item: any, idx: number) => (
                                    <li key={idx} className="flex items-start gap-1.5 text-xs text-[var(--text-secondary)]">
                                      <span className="text-green-500 font-bold">•</span>
                                      <span>{item.qty}x {item.name}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="p-4 bg-[var(--bg)]">
                                <button 
                                  onClick={() => handleDismissReady(order.id)}
                                  className="w-full py-2.5 rounded-lg border border-green-500 text-green-600 hover:bg-green-500 hover:text-white transition-all font-bold text-sm tracking-wide uppercase flex items-center justify-center gap-2"
                                >
                                  <Check className="w-4 h-4" /> Mark Collected
                                </button>
                              </div>
                            </Card>
                          </motion.div>
                        ))}

                        {/* In Process Orders */}
                        {inProcessOrders.map((order) => (
                          <motion.div key={order.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                            <Card className="bg-[var(--bg)] border-amber-500/30 flex flex-col p-0 overflow-hidden shadow-soft group">
                              <div className="p-4 border-b border-amber-500/20 bg-amber-50 flex justify-between items-center">
                                <span className="font-syne font-bold text-lg text-[var(--text-primary)]">#{order.id.slice(0, 6)}</span>
                                <Badge className="bg-amber-100 text-amber-600 border border-amber-500/30 font-bold text-xs flex items-center gap-1">
                                  <ChefHat className="w-3 h-3" /> Preparing
                                </Badge>
                              </div>
                              <div className="p-4 flex items-center gap-3 bg-[var(--bg)]">
                                <div className="w-10 h-10 rounded-full border border-amber-500/30 overflow-hidden">
                                  <img
                                    src={order.profiles?.avatar_url || getAvatarDataUrl({ name: order.profiles?.name, seed: order.student_id || order.id })}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div>
                                  <p className="text-[var(--text-primary)] font-bold text-sm">{order.profiles?.name || 'Student'}</p>
                                  <p className="text-xs text-amber-600">{order.items?.length || 0} items • ₹{order.total}</p>
                                  {order.is_delivery_order && (
                                    <span className="inline-flex mt-1 items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-[#FEF9C3] text-[var(--yellow-dark)]">
                                      🚀 Delivery: {order.delivery_room_number || 'Room'}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="px-4 py-3 bg-[var(--bg)] border-t border-amber-500/10">
                                <ul className="space-y-1">
                                  {order.items?.map((item: any, idx: number) => (
                                    <li key={idx} className="flex items-start gap-1.5 text-xs text-[var(--text-secondary)]">
                                      <span className="text-amber-500 font-bold">•</span>
                                      <span>{item.qty}x {item.name}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="p-4 bg-[var(--bg)] border-t border-amber-500/10">
                                <button 
                                  onClick={() => handleMarkReady(order.id)}
                                  className="w-full py-2.5 rounded-lg bg-amber-500 text-[var(--text)] hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all font-bold text-sm tracking-wide uppercase flex items-center justify-center gap-2"
                                >
                                  <Check className="w-4 h-4" /> Ready to Pickup
                                </button>
                              </div>
                            </Card>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Incoming Requests Section */}
              <div className="space-y-6 order-1">
                <div className="flex items-center justify-between">
                  <h2 className="font-syne font-bold text-2xl flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)] animate-pulse" /> 
                    Incoming Requests
                  </h2>
                </div>

                {newOrdersList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[30vh] text-center bg-[var(--bg-secondary)] rounded-lg border border-black/10 border-dashed">
                     <div className="w-20 h-20 bg-[var(--bg)] rounded-full flex items-center justify-center mb-4 shadow-soft">
                       <Check className="w-10 h-10 text-[var(--yellow)]" />
                     </div>
                     <h3 className="font-syne font-bold text-xl text-[var(--text-primary)] mb-2">No New Requests</h3>
                     <p className="text-[var(--text-secondary)] font-sans max-w-sm text-sm">You've cleared the queue! Waiting for students to place new orders.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    <AnimatePresence>
                      {newOrdersList.map((order) => (
                        <motion.div
                          key={order.id}
                          initial={{ opacity: 0, y: 20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                          layout
                        >
                          <Card className="bg-[var(--bg)] border-[var(--text-primary)]/10 hover:border-[var(--yellow)] transition-all duration-300 flex flex-col p-0 overflow-hidden group shadow-soft">
                            {/* Card Header */}
                            <div className="p-5 border-b border-[var(--text-primary)]/10 flex justify-between items-center bg-[var(--bg-secondary)]">
                              <div className="flex items-center gap-2">
                                <span className="font-syne font-bold text-xl text-[var(--text-primary)] tracking-wide">#{order.id.slice(0, 6)}</span>
                              </div>
                              <span className="text-xs font-bold px-3 py-1 rounded-md bg-[var(--yellow)]/20 text-[var(--text-primary)] flex items-center gap-1.5 border border-[var(--yellow)]/30 shadow-sm">
                                <Clock className="w-3 h-3" /> {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            </div>

                            {/* Student Info */}
                            <div className="p-5 pb-4 border-b border-[var(--text-primary)]/10 flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full overflow-hidden border border-[var(--text-primary)]/10 shadow-sm">
                                <img
                                  src={order.profiles?.avatar_url || getAvatarDataUrl({ name: order.profiles?.name, seed: order.student_id || order.id })}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <p className="text-[var(--text-primary)] font-bold font-sans text-lg leading-tight">{order.profiles?.name || 'Student'}</p>
                                <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">{order.student_id?.slice(0, 8)}</p>
                                {order.is_delivery_order && (
                                  <span className="inline-flex mt-1 items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-[var(--text-primary)] text-[var(--yellow)]">
                                    🚀 Delivery: {order.delivery_room_number || 'Room'}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Order Items */}
                            <div className="p-5 flex-1 bg-[var(--bg)]">
                              <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest mb-3">Order Details</p>
                              <ul className="space-y-2">
                                {order.items?.map((item: any, idx: number) => (
                                  <li key={idx} className="flex items-start gap-2 text-sm text-[var(--text-primary)] font-medium">
                                    <span className="text-[var(--yellow)] font-bold mt-0.5">•</span>
                                    <span>{item.qty}x {item.name}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Card Footer / Actions */}
                            <div className="p-5 pt-4 bg-[var(--bg-secondary)] flex flex-col gap-4 border-t border-[var(--text-primary)]/10">
                              <div className="flex justify-between items-end">
                                <span className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-widest">Total Amount</span>
                                <span className="font-syne font-bold text-2xl text-[var(--text-primary)] leading-none drop-shadow-sm">₹{order.total}</span>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3 pt-2">
                                <button 
                                  onClick={() => handleRejectClick(order)}
                                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-sm tracking-wide"
                                >
                                  <X className="w-4 h-4" /> Reject
                                </button>
                                <button 
                                  onClick={() => handleAccept(order.id)}
                                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[var(--yellow)] text-[var(--text-primary)] hover:shadow-medium hover:scale-[1.02] active:scale-[0.98] transition-all font-bold text-sm tracking-wide uppercase"
                                >
                                  <Check className="w-4 h-4 stroke-[3]" /> Accept
                                </button>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === 'Order History' && (
            <div className="max-w-6xl mx-auto">
              {/* Similar history logic... */}
              <div className="bg-[var(--bg)] border border-[var(--text-primary)]/10 rounded-lg overflow-hidden shadow-soft">
                {historyOrders.length === 0 ? (
                  <div className="p-10 text-center text-[var(--text-secondary)] font-medium">No order history available yet.</div>
                ) : (
                  <table className="w-full text-left font-sans">
                    <thead className="bg-[var(--bg-secondary)] h-[40px] border-b border-[var(--border)]">
                      <tr className="border-b border-[var(--text-primary)]/10 text-xs text-[var(--text-secondary)] uppercase tracking-widest bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] transition-colors duration-150">
                        <th className="px-8 py-5 font-bold px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Date</th>
                        <th className="px-8 py-5 font-bold px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Student</th>
                        <th className="px-8 py-5 font-bold px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Order ID</th>
                        <th className="px-8 py-5 font-bold px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Items Ordered</th>
                        <th className="px-8 py-5 font-bold px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Status</th>
                        <th className="px-8 py-5 font-bold text-right px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Revenue</th>
                        <th className="px-8 py-5 font-bold text-center px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--text-primary)]/10">
                      {historyOrders.map((order, i) => (
                        <tr key={i} className="hover:bg-[var(--bg-secondary)] transition-colors group cursor-pointer">
                          <td className="px-8 py-5 text-sm text-[var(--text-primary)] font-medium">{new Date(order.created_at).toLocaleDateString()}</td>
                          <td className="px-8 py-5 text-sm text-[var(--text-primary)] font-medium flex items-center gap-3">
                            {order.profiles?.name || 'Student'}
                          </td>
                          <td className="px-8 py-5 text-sm font-mono text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">#{order.id.slice(0,6)}</td>
                          <td className="px-8 py-5 text-sm text-[var(--text-3)]">
                             <div className="truncate max-w-[200px]">
                               {order.items?.map((i:any) => `${i.qty}x ${i.name}`).join(', ')}
                             </div>
                          </td>
                          <td className="px-8 py-5">
                            {order.status === 'completed' || order.status === 'picked_up' ? (
                              <Badge className="bg-green-100 text-green-600 border border-green-500/30">Completed</Badge>
                            ) : order.status === 'reorder_requested' ? (
                              <Badge className="bg-amber-100 text-amber-700 border border-amber-400/30">Reorder Sent</Badge>
                            ) : order.status === 'reorder_completed' ? (
                              <Badge className="bg-blue-100 text-blue-600 border border-blue-400/30">Reordered</Badge>
                            ) : (
                              <Badge className="bg-red-50 text-red-500 border border-red-500/30">Rejected</Badge>
                            )}
                          </td>
                          <td className="px-8 py-5 text-base font-syne font-bold text-right text-[var(--text-primary)]">
                            {order.status === 'completed' || order.status === 'picked_up' ? order.total : <span className="text-[var(--text-muted)] line-through">{order.total}</span>}
                          </td>
                          <td className="px-8 py-5 text-center">
                            {(order.status === 'completed' || order.status === 'picked_up') && (
                              <button
                                onClick={() => handleRequestReorder(order)}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-400/40 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs transition-colors whitespace-nowrap"
                              >
                                <RotateCcw className="w-3.5 h-3.5" /> Request Reorder
                              </button>
                            )}
                            {order.status === 'reorder_requested' && (
                              <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 font-bold">
                                <RotateCcw className="w-3.5 h-3.5 animate-spin" /> Waiting for student
                              </span>
                            )}
                            {order.status === 'reorder_completed' && (
                              <span className="inline-flex items-center gap-1.5 text-xs text-blue-500 font-bold">
                                <Check className="w-3.5 h-3.5" /> Student reordered
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {activeView === 'Menu Management' && (
            <div className="max-w-7xl mx-auto">
               <div className="flex items-center justify-between mb-8">
                  <h2 className="font-syne font-bold text-3xl text-[var(--text-primary)]">Menu Items</h2>
                  <button 
                    onClick={() => handleOpenMenuModal('add')}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--yellow)] text-[var(--text-primary)] font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-medium"
                  >
                    <Plus className="w-5 h-5 stroke-[3]" /> Add New Item
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 {menuItems.map((item) => (
                   <Card key={item.id} className="bg-[var(--bg)] border-[var(--text-primary)]/10 p-0 overflow-hidden flex flex-col group hover:border-[var(--yellow)] transition-colors shadow-soft">
                     <div className="relative h-48 overflow-hidden bg-[var(--bg-secondary)]">
                       {item.image_url ? (
                         <img loading="lazy" src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                            <Coffee className="w-12 h-12" />
                         </div>
                       )}
                       <div className="absolute top-3 left-3">
                         <Badge className="bg-[var(--bg)]/80  text-[var(--text-primary)] border border-[var(--text-primary)]/10 font-bold shadow-sm">
                           {item.category}
                         </Badge>
                       </div>
                       <div className="absolute top-3 right-3">
                         <Badge className={`${item.is_available ? 'bg-green-100/90 text-green-700 border-green-200' : 'bg-red-50/90 text-red-600 border-red-200'}  font-bold border shadow-sm`}>
                           {item.is_available ? 'Available' : 'Out of Stock'}
                         </Badge>
                       </div>
                     </div>
                     <div className="p-5 flex-1 flex flex-col">
                       <h3 className="font-syne font-bold text-xl text-[var(--text-primary)] mb-2">{item.name}</h3>
                       <p className="font-syne font-bold text-2xl text-[var(--text-primary)] mb-6">₹{item.price}</p>
                       
                       <div className="mt-auto grid grid-cols-2 gap-3">
                         <button 
                           onClick={() => handleOpenMenuModal('edit', item)}
                           className="flex items-center justify-center gap-2 py-2 rounded-lg bg-[var(--bg)] hover:bg-[var(--bg-secondary)] border border-[var(--text-primary)]/10 hover:border-[var(--text-primary)]/30 text-[var(--text-primary)] transition-colors font-bold text-sm shadow-sm"
                         >
                           <Edit2 className="w-4 h-4" /> Edit
                         </button>
                         <button 
                           onClick={() => handleDeleteMenuItem(item.id)}
                           className="flex items-center justify-center gap-2 py-2 rounded-lg bg-[#FFFFFF] hover:bg-red-500/10 border border-[#ffffff1a] hover:border-red-500 text-gray-300 hover:text-red-500 transition-colors font-bold text-sm"
                         >
                           <Trash2 className="w-4 h-4" /> Delete
                         </button>
                       </div>
                     </div>
                   </Card>
                 ))}
               </div>
            </div>
          )}

          {activeView !== 'Live Orders' && activeView !== 'Order History' && activeView !== 'Menu Management' && (
             <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <div className="w-20 h-20 bg-[var(--bg-secondary)] border border-[var(--text-primary)]/10 rounded-lg flex items-center justify-center mb-6 shadow-soft">
                  <Settings className="w-10 h-10 text-[var(--text-secondary)]" />
                </div>
                <h2 className="font-syne font-bold text-3xl text-[var(--text-primary)] mb-3">{activeView}</h2>
                <p className="text-[var(--text-secondary)] font-sans max-w-md">This module is currently under development. Please check back later.</p>
             </div>
          )}
        </div>
      </main>

      {/* Reject Reason Modal */}
      <AnimatePresence>
        {rejectModal.isOpen && rejectModal.order && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setRejectModal({ isOpen: false, order: null })}
              className="absolute inset-0 bg-black/80 "
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-[var(--bg)] border border-[var(--text-primary)]/10 rounded-lg shadow-strong w-full max-w-lg overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-[var(--text-primary)]/10 bg-[var(--bg-secondary)] flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-syne font-bold text-2xl text-[var(--text-primary)] mb-1">Reject Order #{rejectModal.order.id.slice(0,6)}</h3>
                  <p className="text-sm text-[var(--text-secondary)] font-sans flex items-center gap-1.5">
                    Notify <strong className="text-[var(--text-primary)]">{rejectModal.order.profiles?.name}</strong> about the cancellation.
                  </p>
                </div>
              </div>

              <div className="p-6 flex-1 overflow-y-auto bg-[var(--bg)]">
                <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Select a Reason</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {rejectReasons.map((reason, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setSelectedReason(reason); setCustomReason(''); }}
                      className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                        selectedReason === reason ? 'bg-[var(--yellow)]/20 border-[var(--yellow)] text-[var(--text-primary)] shadow-sm' : 'bg-[var(--bg)] border-[var(--text-primary)]/10 text-[var(--text-secondary)] hover:border-[var(--text-primary)]/30 hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> Or write a custom message
                  </p>
                  <textarea 
                    value={customReason}
                    onChange={(e) => { setCustomReason(e.target.value); if (e.target.value) setSelectedReason(''); }}
                    placeholder={`e.g. "Sorry ${rejectModal.order.profiles?.name?.split(' ')[0]}, the Dosa batter just ran out..."`}
                    className="w-full bg-[var(--bg)] border border-[var(--text-primary)]/10 rounded-lg p-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--yellow)] focus:ring-1 focus:ring-[var(--yellow)]/50 transition-all min-h-[100px] resize-none"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-[var(--text-primary)]/10 bg-[var(--bg-secondary)] flex justify-end gap-3">
                <button 
                  onClick={() => setRejectModal({ isOpen: false, order: null })}
                  className="px-6 py-3 rounded-lg font-bold font-sans text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg)] border border-transparent hover:border-[var(--text-primary)]/10 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmReject}
                  disabled={!selectedReason && !customReason}
                  className="px-6 py-3 rounded-lg font-bold font-sans text-sm bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-medium"
                >
                  <X className="w-4 h-4" /> Confirm Rejection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Menu Management Modal */}
      <AnimatePresence>
        {menuModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMenuModal({ isOpen: false, mode: 'add', item: null })}
              className="absolute inset-0 bg-black/80 "
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-[var(--bg)] border border-[var(--text-primary)]/10 rounded-lg shadow-strong w-full max-w-lg overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-[var(--text-primary)]/10 bg-[var(--bg-secondary)] flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[var(--bg)] border border-[var(--yellow)] flex items-center justify-center flex-shrink-0 shadow-sm">
                  {menuModal.mode === 'add' ? <Plus className="w-6 h-6 text-[var(--yellow)]" /> : <Edit2 className="w-6 h-6 text-[var(--yellow)]" />}
                </div>
                <div>
                  <h3 className="font-syne font-bold text-2xl text-[var(--text-primary)] mb-1">
                    {menuModal.mode === 'add' ? 'Add Menu Item' : 'Edit Menu Item'}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] font-sans">
                    {menuModal.mode === 'add' ? 'Create a new dish for your canteen menu.' : 'Update the details of this item.'}
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh] bg-[var(--bg)]">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Item Name</label>
                  <input 
                    type="text" 
                    value={menuForm.name}
                    onChange={(e) => setMenuForm({...menuForm, name: e.target.value})}
                    placeholder="e.g. Schezwan Fried Rice"
                    className="w-full bg-[var(--bg)] border border-[var(--text-primary)]/10 rounded-lg px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--yellow)] focus:ring-1 focus:ring-[var(--yellow)]/50 transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Price (₹)</label>
                    <input 
                      type="number" 
                      value={menuForm.price}
                      onChange={(e) => setMenuForm({...menuForm, price: e.target.value})}
                      placeholder="150"
                      className="w-full bg-[var(--bg)] border border-[var(--text-primary)]/10 rounded-lg px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--yellow)] focus:ring-1 focus:ring-[var(--yellow)]/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Category</label>
                    <input 
                      type="text"
                      value={menuForm.category}
                      onChange={(e) => setMenuForm({...menuForm, category: e.target.value})}
                      className="w-full bg-[var(--bg)] border border-[var(--text-primary)]/10 rounded-lg px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--yellow)] focus:ring-1 focus:ring-[var(--yellow)]/50 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> Image URL
                  </label>
                  <input 
                    type="text" 
                    value={menuForm.image}
                    onChange={(e) => setMenuForm({...menuForm, image: e.target.value})}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full bg-[var(--bg)] border border-[var(--text-primary)]/10 rounded-lg px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--yellow)] focus:ring-1 focus:ring-[var(--yellow)]/50 transition-all"
                  />
                  {menuForm.image && (
                    <div className="mt-2 h-32 rounded-lg overflow-hidden border border-[var(--text-primary)]/10">
                      <img loading="lazy" src={menuForm.image} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setMenuImageFile(file);
                    }}
                    className="w-full text-sm text-[var(--text-secondary)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--yellow)]/20 file:px-3 file:py-2 file:font-bold file:text-[var(--text-primary)] hover:file:bg-[var(--yellow)]/30"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input 
                    type="checkbox" 
                    id="availableToggle"
                    checked={menuForm.available}
                    onChange={(e) => setMenuForm({...menuForm, available: e.target.checked})}
                    className="w-5 h-5 rounded border-[var(--text-primary)]/20 bg-[var(--bg)] text-[var(--yellow)] focus:ring-[var(--yellow)] focus:ring-offset-white"
                  />
                  <label htmlFor="availableToggle" className="text-sm font-bold text-[var(--text-primary)] cursor-pointer select-none">
                    Item is currently available
                  </label>
                </div>
              </div>

              <div className="p-6 border-t border-[var(--text-primary)]/10 bg-[var(--bg-secondary)] flex justify-end gap-3">
                <button 
                  onClick={() => setMenuModal({ isOpen: false, mode: 'add', item: null })}
                  className="px-6 py-3 rounded-lg font-bold font-sans text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg)] border border-transparent hover:border-[var(--text-primary)]/10 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveMenuItem}
                  disabled={!menuForm.name || !menuForm.price || isSaving}
                  className="px-6 py-3 rounded-lg font-bold font-sans text-sm bg-[var(--yellow)] text-[var(--text-primary)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-medium flex items-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />} 
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
