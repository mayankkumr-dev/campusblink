import React, { useState, useEffect } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { Button } from './ui/button';
import { Search, ShoppingBag, X, Plus, Minus, Coffee, Utensils, Pizza, Soup, Loader2, AlertTriangle, RotateCcw, ChevronLeft, Store } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams, useNavigate } from 'react-router';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { getCanteens, getMenuItems, getMyCanteenReorderRequests, placeOrder, getMyOrders } from '../../api/canteen';
import { useMyOrderStatus } from '../../hooks/useRealtime';
import { getAvatarDataUrl } from '../../lib/avatar';
import toast from 'react-hot-toast';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';
import { AccessDenied } from './AccessDenied';
import { ListSkeleton } from './ui/Skeletons';

export const CanteenMenuPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCanteenId = searchParams.get('canteenId');
  const [activeTab, setActiveTab] = useState('menu');
  const [activeCategory, setActiveCategory] = useState('Breakfast');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const navigate = useNavigate();
  const profile = useAuthStore(state => state.profile);
  const { hasAccess: hasCanteenAccess, isChecking: checkingCanteenAccess } = useFeatureAccess('canteen_access');
  const { isAllowed } = useFeatureAccess(profile);
  const { items: cartItems, addItem, removeItem, updateQty, total: getCartTotal, clearCart, shopId: cartShopId, shopName: cartShopName } = useCartStore();
  const [switchShopModalOpen, setSwitchShopModalOpen] = useState(false);
  const [pendingAddItem, setPendingAddItem] = useState<any | null>(null);

  const [canteens, setCanteens] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [reorderRequests, setReorderRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Load Canteens
  useEffect(() => {
    async function loadCanteens() {
      setIsLoading(true);
      const { data } = await getCanteens(profile?.college);
      if (data) setCanteens(data);
      setIsLoading(false);
    }
    if (!selectedCanteenId && activeTab === 'menu') {
      loadCanteens();
    }
  }, [selectedCanteenId, activeTab, profile?.college]);

  // Load Menu for selected canteen
  useEffect(() => {
    async function loadMenu() {
      setIsLoading(true);
      const { data } = await getMenuItems(selectedCanteenId);
      if (data) {
        setMenuItems(data);
        // auto-select first category
        const cats = [...new Set(data.map((i: any) => i.category))];
        if (cats.length > 0 && !cats.includes(activeCategory)) {
          setActiveCategory(cats[0] as string);
        }
      }
      setIsLoading(false);
    }
    if (selectedCanteenId && activeTab === 'menu') {
      loadMenu();
    }
  }, [selectedCanteenId, activeTab]);

  // Load Order History
  useEffect(() => {
    async function loadHistory() {
      setIsLoading(true);
      if (profile?.id) {
        const { data } = await getMyOrders(profile.id, profile.college);
        if (data) setOrderHistory(data);
      }
      setIsLoading(false);
    }
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, profile?.id, profile?.college]);

  useEffect(() => {
    async function loadReorderRequests() {
      if (!profile?.id) return;
      const { data } = await getMyCanteenReorderRequests(profile.id);
      if (data) setReorderRequests(data);
    }

    loadReorderRequests();
  }, [profile?.id]);

  // Realtime order status tracking
  useMyOrderStatus(profile?.id, (updatedOrder) => {
     setOrderHistory(prev => prev.map(o => o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o));
  });

  const categories = [
    { name: 'Breakfast', icon: Coffee },
    { name: 'Lunch', icon: Utensils },
    { name: 'Snacks', icon: Pizza },
    { name: 'Beverages', icon: Soup },
  ];

  const handleAddToCart = (item: any) => {
    if (cartShopId && cartShopId !== selectedCanteenId && cartItems.length > 0) {
      setPendingAddItem(item);
      setSwitchShopModalOpen(true);
      return;
    }
    const shop = canteens.find(c => c.id === selectedCanteenId);
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      image_url: item.image_url,
      is_veg: item.is_veg
    }, selectedCanteenId, shop?.name || 'Canteen');
    toast.success(`${item.name} added to cart`);
  };

  const handleConfirmSwitchShop = () => {
    clearCart();
    if (pendingAddItem) {
      const shop = canteens.find(c => c.id === selectedCanteenId);
      addItem({
        id: pendingAddItem.id,
        name: pendingAddItem.name,
        price: pendingAddItem.price,
        image_url: pendingAddItem.image_url,
        is_veg: pendingAddItem.is_veg
      }, selectedCanteenId, shop?.name || 'Canteen');
      toast.success(`${pendingAddItem.name} added to cart`);
    }
    setSwitchShopModalOpen(false);
    setPendingAddItem(null);
  };

  const getQuantity = (id: string) => {
    return cartItems.find((p: any) => p.id === id)?.qty || 0;
  };

  const handlePlaceOrder = async () => {
    if (!profile?.id) return toast.error("Please login to place an order");
    if (cartItems.length === 0) return toast.error("Cart is empty");
    if (!isAllowed('ordering')) return toast.error('Ordering is currently restricted for your account.');
    
    const total = getCartTotal();

    setIsPlacingOrder(true);

    const orderData = {
      student_id: profile.id,
      shop_id: cartShopId,
      items: cartItems,
      total,
      status: 'placed'
    };

    const { data, error } = await placeOrder(orderData, profile.college);
    
    if (error) {
      toast.error(error.message || "Failed to place order. Try again.");
    } else {
      toast.success("Order placed! Pay at counter 🍔");
      if (!localStorage.getItem('cb_first_order_done')) {
        localStorage.setItem('cb_first_order_done', '1');
        window.dispatchEvent(new CustomEvent('cb-order-placed-first-time'));
      }
      clearCart();
      setIsCartOpen(false);
      setActiveTab('history');
    }
    setIsPlacingOrder(false);
  };

  const cartTotal = getCartTotal();

  // Extract dynamic categories from items if available
  const dynamicCategories = [...new Set(menuItems.map(i => i.category || 'Other'))];
  
  const filteredItems = menuItems.filter(item => 
    (item.category === activeCategory || (activeCategory === 'Other' && !item.category)) &&
    (searchTerm === '' || item.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const tabs = [
    { id: 'menu', label: 'Menu' },
    { id: 'history', label: 'Order History' },
    { id: 'cart', label: `Cart ${cartItems.length > 0 ? `(${cartItems.length})` : ''}` }
  ];

  if (checkingCanteenAccess) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <ListSkeleton key={`canteen-access-skeleton-${index}`} rows={1} />
          ))}
        </div>
      </div>
    );
  }

  if (!hasCanteenAccess) {
    return <AccessDenied feature="Canteen" />;
  }

  if (!profile?.college) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl bg-white p-10 text-center shadow-[0_8px_30px_-4px_rgba(0,0,0,0.05)] border border-slate-100">
          <h2 className="font-bold text-2xl mb-4 text-slate-900">College Required</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            Update your profile to select your college to access canteen ordering.
          </p>
          <button
            onClick={() => navigate('/student/profile?edit=1')}
            className="px-6 py-3.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors w-full shadow-md"
          >
            Update Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col pt-16 md:pt-0 font-sans">
      {/* Top Navbar */}
      <header className="hidden md:flex h-[72px] bg-white border-b border-slate-100 px-8 items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3 mt-2">
           {/* Logo intentionally removed from this specific page header as per request */}
        </div>

        <nav className="flex items-center gap-10">
          {tabs.map((tab) => {
            const isActive = (tab.id === 'cart' ? isCartOpen : (activeTab === tab.id && !isCartOpen));
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'cart') {
                    setIsCartOpen(!isCartOpen);
                  } else {
                    setActiveTab(tab.id);
                    setIsCartOpen(false);
                  }
                }}
                className={`relative py-4 text-[15px] font-semibold transition-colors flex items-center gap-2 ${
                  isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-900 rounded-t-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-bold text-sm leading-tight text-slate-900">{profile?.name || 'Student'}</p>
            <p className="text-[11px] text-amber-500 font-bold uppercase tracking-wider mt-0.5">{profile?.campus_credits || 0} Reputation</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shadow-sm">
            <img
              src={profile?.avatar_url || getAvatarDataUrl({ name: profile?.name, email: profile?.email, seed: profile?.id || profile?.username })}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </header>
      
      {/* Mobile nav buttons */}
      <div className="md:hidden flex bg-white border-b border-slate-100 sticky top-16 z-30 shadow-sm">
        <button onClick={() => { setActiveTab('menu'); setIsCartOpen(false); }} className={`flex-1 py-3.5 text-sm font-bold relative ${activeTab === 'menu' && !isCartOpen ? 'text-slate-900' : 'text-slate-500'}`}>
          Menu
          {activeTab === 'menu' && !isCartOpen && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-900" />}
        </button>
        <button onClick={() => { setActiveTab('history'); setIsCartOpen(false); }} className={`flex-1 py-3.5 text-sm font-bold relative ${activeTab === 'history' ? 'text-slate-900' : 'text-slate-500'}`}>
          History
          {activeTab === 'history' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-900" />}
        </button>
        <button onClick={() => setIsCartOpen(!isCartOpen)} className={`flex-1 py-3.5 text-sm font-bold relative flex justify-center items-center gap-1.5 ${isCartOpen ? 'text-slate-900' : 'text-slate-500'}`}>
          Cart {cartItems.length > 0 && <span className="bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded-md">{cartItems.length}</span>}
          {isCartOpen && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-900" />}
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-10 transition-all duration-300">
          <div className="max-w-6xl mx-auto">
            
            {reorderRequests.map((order) => (
              <div key={order.id} className="mb-8 rounded-2xl border border-amber-200/60 bg-amber-50/50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="bg-white p-2 rounded-xl text-amber-600 shadow-sm">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-[15px]">Canteen Reorder Requested</p>
                    <p className="text-sm text-slate-600 mt-1 max-w-xl leading-relaxed">
                      Your order <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded text-xs border border-slate-100">#{order.id.slice(0, 6)}</span>
                      {order.canteen_shops?.name ? ` at ${order.canteen_shops.name}` : ''} needs reorder.
                      If you already paid, you do not need to pay again.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/student/canteen/reorder/${order.id}`)}
                  className="flex-shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-all shadow-md w-full sm:w-auto"
                >
                  <RotateCcw className="w-4 h-4" /> Reorder Items
                </button>
              </div>
            ))}
            
            {isLoading && !isCartOpen ? (
               <div className="py-8">
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                   {Array.from({ length: 6 }).map((_, index) => (
                     <ListSkeleton key={`canteen-grid-skeleton-${index}`} rows={1} />
                   ))}
                 </div>
               </div>
            ) : !selectedCanteenId && activeTab === 'menu' ? (
              <div className="py-8 md:py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="font-bold text-4xl md:text-5xl text-slate-900 tracking-tight mb-4">Where are you hungry?</h2>
                <p className="text-lg text-slate-500 mb-12 max-w-2xl">Select a canteen below to view their live menu and place an order.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {canteens.length === 0 && !isLoading && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                      <p className="text-slate-500">No active canteens found on campus at the moment.</p>
                    </div>
                  )}
                  {canteens.map((canteen) => (
                    <button
                      key={canteen.id}
                      onClick={() => setSearchParams({ canteenId: canteen.id })}
                      className="bg-white rounded-2xl p-6 text-left transition-all duration-300 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] hover:-translate-y-1 group border border-slate-100 flex flex-col"
                    >
                      <div className="flex items-start justify-between mb-5">
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center overflow-hidden shadow-sm border border-slate-100 group-hover:bg-slate-900 transition-colors duration-300">
                          {canteen.logo_url ? (
                            <img src={canteen.logo_url} alt="Logo" className="w-full h-full object-cover" />
                          ) : (
                            <Store className="w-7 h-7 text-slate-300 group-hover:text-white transition-colors duration-300" />
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          canteen.is_open_now ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                        }`}>
                          {canteen.is_open_now ? 'Open' : 'Closed'}
                        </span>
                      </div>
                      <h3 className="font-bold text-xl text-slate-900 mb-1.5">{canteen.name}</h3>
                      <p className="text-sm text-slate-500 line-clamp-2">{canteen.category?.replace('_',' ') || canteen.description || 'Campus Canteen'}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : activeTab === 'menu' ? (
              <div className="animate-in fade-in duration-500 pb-24 md:pb-0">
                <div className="flex items-center gap-4 mb-8">
                  <button 
                    onClick={() => { 
                      setSearchParams({}); 
                    }}
                    className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-xl transition-all shadow-sm hover:shadow-md"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="font-bold text-2xl md:text-3xl text-slate-900 tracking-tight flex items-center gap-3">
                      {canteens.find(c => c.id === selectedCanteenId)?.name || 'Menu'}
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${canteens.find(c => c.id === selectedCanteenId)?.is_open_now ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                        {canteens.find(c => c.id === selectedCanteenId)?.is_open_now ? 'Open' : 'Closed'}
                      </span>
                    </h2>
                  </div>
                </div>

                {/* Category Nav & Search */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-8">
                  <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-1 -mx-4 px-4 md:mx-0 md:px-0">
                    {dynamicCategories.length > 0 ? dynamicCategories.map((catName) => (
                      <button
                        key={catName}
                        onClick={() => setActiveCategory(catName)}
                        className={`flex-shrink-0 flex items-center whitespace-nowrap px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                          activeCategory === catName 
                            ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' 
                            : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-800 hover:bg-slate-50 shadow-sm'
                        }`}
                      >
                        {catName}
                      </button>
                    )) : (
                      categories.map((cat) => (
                        <button
                          key={cat.name}
                          onClick={() => setActiveCategory(cat.name)}
                          className={`flex-shrink-0 flex items-center whitespace-nowrap gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                            activeCategory === cat.name 
                              ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' 
                              : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-800 hover:bg-slate-50 shadow-sm'
                          }`}
                        >
                          <cat.icon className="w-4 h-4" />
                          {cat.name}
                        </button>
                      ))
                    )}
                  </div>
                  
                  <div className="relative w-full lg:w-80 flex-shrink-0">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      placeholder="Search for an item..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all text-slate-900 placeholder:text-slate-400 font-medium shadow-sm"
                    />
                  </div>
                </div>

                {/* Menu Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredItems.length === 0 && (
                    <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                      <p className="text-slate-500 font-medium">No items found in this category.</p>
                    </div>
                  )}
                  {filteredItems.map(item => {
                    const qty = getQuantity(item.id);
                    return (
                      <div key={item.id} className="bg-white rounded-3xl overflow-hidden shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] flex flex-col transition-all hover:shadow-[0_15px_40px_-10px_rgba(0,0,0,0.08)] group border border-slate-100/50">
                        <div className="w-full aspect-[4/3] bg-slate-50 relative overflow-hidden">
                          {item.image_url ? (
                            <img loading="lazy" src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-200">
                               <Utensils className="w-10 h-10" />
                            </div>
                          )}
                          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md rounded-full px-3 py-1.5 shadow-sm flex items-center gap-2">
                             <div className={`w-2 h-2 rounded-full ${item.is_veg ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                             <span className="text-[10px] uppercase font-bold tracking-widest text-slate-700">{item.is_veg ? 'Veg' : 'Non-Veg'}</span>
                          </div>
                        </div>
                        <div className="p-6 flex flex-col flex-1">
                          <h3 className="font-bold text-lg text-slate-900 leading-tight mb-2 pr-2">{item.name}</h3>
                          
                          <div className="text-sm text-slate-500 space-y-2 mb-6">
                            <p className="line-clamp-2 min-h-[40px] leading-relaxed">{item.description || 'Prepared fresh upon ordering'}</p>
                            <p className="text-xs text-slate-400 font-bold tracking-wide">PREP TIME: {item.prep_time_minutes} MIN</p>
                          </div>
                          
                          <div className="mt-auto flex items-center justify-between">
                            <span className="font-extrabold text-2xl text-slate-900 tracking-tight">₹{item.price}</span>
                            
                            {qty > 0 ? (
                              <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-100">
                                <button 
                                  onClick={() => updateQty(item.id, qty - 1)}
                                  className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg transition-all shadow-sm"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className="w-10 text-center font-bold text-slate-900 text-[15px]">{qty}</span>
                                <button 
                                  onClick={() => {
                                    if(qty === 0) handleAddToCart(item);
                                    else updateQty(item.id, qty + 1);
                                  }}
                                  className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg transition-all shadow-sm"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => handleAddToCart(item)}
                                className="px-6 py-3 bg-blue-50 text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-100 transition-colors flex items-center gap-2"
                              >
                                <Plus className="w-4 h-4" /> Add
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                {activeTab === 'history' && (
                  <div className="max-w-4xl mx-auto py-4 md:py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="font-bold text-3xl md:text-4xl mb-8 text-slate-900 tracking-tight">Order History</h2>

                    <div className="space-y-4">
                      {orderHistory.length === 0 ? (
                        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                            <Utensils className="w-8 h-8" />
                          </div>
                          <p className="text-slate-500 font-medium">You haven't placed any canteen orders yet.</p>
                        </div>
                      ) : (
                        orderHistory.map((order) => (
                          <div key={order.id} className="bg-white p-5 md:p-6 rounded-2xl shadow-[0_2px_15px_-4px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)]">
                            
                            <div className="flex items-start gap-4 md:gap-5">
                              <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0 text-slate-400 border border-slate-100">
                                <ShoppingBag className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-3 mb-1.5">
                                  <h4 className="font-bold text-slate-900 text-lg">{order.canteen_shops?.name || 'Unknown Canteen'}</h4>
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                    order.status === 'ready' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                    order.status === 'preparing' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                    order.status === 'cancelled' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                    order.status === 'picked_up' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                                    'bg-blue-50 text-blue-600 border-blue-100'
                                  }`}>
                                    {order.status.replace('_', ' ')}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wider">
                                  {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                </p>
                                <div className="text-sm text-slate-700 font-medium leading-relaxed">
                                   {Array.isArray(order.items) ? order.items.map((i:any) => {
                                     const quantity = i.qty || i.quantity || 1;
                                     return `${quantity}x ${i.name}`;
                                   }).join(', ') : 'Custom Order'}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between md:flex-col md:items-end gap-1 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
                              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total</span>
                              <span className="font-bold text-2xl text-slate-900 tracking-tight">₹{order.total}</span>
                            </div>

                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        </div>

        {/* Cart Panel */}
        <AnimatePresence>
          {isCartOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCartOpen(false)}
                className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40"
              />
              <motion.div
                initial={{ x: '100%', opacity: 0.5 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0.5 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed z-50 top-0 right-0 bottom-0 w-full md:w-[440px] bg-white shadow-2xl flex flex-col border-l border-slate-100"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white/95 backdrop-blur-md z-10">
                  <div>
                    <h2 className="font-bold text-2xl text-slate-900 tracking-tight">Your Cart</h2>
                    <p className="text-sm text-slate-500 font-medium mt-1">{cartItems.length} item{cartItems.length !== 1 ? 's' : ''}</p>
                  </div>
                  <button onClick={() => setIsCartOpen(false)} className="text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 p-2.5 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 hide-scrollbar">
                  {cartItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <div className="w-32 h-32 mb-6 rounded-3xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-200 relative overflow-hidden">
                         <div className="absolute inset-0 bg-gradient-to-tr from-slate-50 to-white" />
                         <ShoppingBag className="w-12 h-12 relative z-10" />
                      </div>
                      <h3 className="font-bold text-xl text-slate-900 mb-2">Cart is empty</h3>
                      <p className="text-slate-500 text-sm max-w-[200px] leading-relaxed">Looks like you haven't added anything to your cart yet.</p>
                    </div>
                  ) : (
                    cartItems.map((cartItem: any) => (
                      <div key={cartItem.id} className="flex gap-4 p-4 bg-white rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.03)] border border-slate-100 items-center">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-50 flex-shrink-0 flex items-center justify-center border border-slate-100">
                          {cartItem.image_url ? (
                             <img src={cartItem.image_url} alt={cartItem.name} className="w-full h-full object-cover" />
                          ) : (
                             <Utensils className="w-6 h-6 text-slate-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-slate-900 text-[15px] truncate pr-2 leading-tight">{cartItem.name}</h4>
                            <button onClick={() => removeItem(cartItem.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-1 -mt-1 -mr-1">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="font-bold text-slate-900 text-sm mb-3">₹{cartItem.price}</div>
                          
                          <div className="flex items-center gap-3">
                            <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-200">
                              <button onClick={() => updateQty(cartItem.id, cartItem.qty - 1)} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white rounded-md transition-all shadow-sm">
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-center font-bold text-slate-900 text-xs">{cartItem.qty}</span>
                              <button onClick={() => updateQty(cartItem.id, cartItem.qty + 1)} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white rounded-md transition-all shadow-sm">
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {cartItems.length > 0 && (
                  <div className="p-6 bg-white border-t border-slate-100 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.05)] relative z-10">
                    <div className="flex justify-between items-end mb-6 px-1">
                      <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Total Amount</span>
                      <span className="font-bold text-3xl text-slate-900 tracking-tight">₹{cartTotal}</span>
                    </div>
                    <button
                      onClick={handlePlaceOrder}
                      disabled={isPlacingOrder}
                      className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-[15px] hover:bg-slate-800 transition-all shadow-[0_8px_20px_-8px_rgba(15,23,42,0.3)] hover:shadow-[0_12px_25px_-8px_rgba(15,23,42,0.4)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {isPlacingOrder ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Place Order securely'}
                    </button>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
        
        <AlertDialog.Root open={switchShopModalOpen} onOpenChange={setSwitchShopModalOpen}>
          <AlertDialog.Portal>
            <AlertDialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <AlertDialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-[90%] max-w-md translate-x-[-50%] translate-y-[-50%] gap-6 border border-slate-100 bg-white p-8 shadow-2xl rounded-3xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
              <div className="flex flex-col gap-2 text-center">
                <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-2">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <AlertDialog.Title className="text-xl font-bold text-slate-900">
                  Start a new order?
                </AlertDialog.Title>
                <AlertDialog.Description className="text-[15px] text-slate-500 leading-relaxed">
                  Your cart has items from <span className="font-bold text-slate-700">{cartShopName || 'another canteen'}</span>. Adding from {canteens.find(c => c.id === selectedCanteenId)?.name || 'this canteen'} will discard those items.
                </AlertDialog.Description>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-3 mt-4">
                <AlertDialog.Cancel asChild>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSwitchShopModalOpen(false);
                      setPendingAddItem(null);
                    }}
                    className="sm:w-1/2 py-6 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-bold rounded-xl transition-colors"
                  >
                    Cancel
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action asChild>
                  <Button
                    onClick={handleConfirmSwitchShop}
                    className="sm:w-1/2 py-6 bg-rose-600 text-white hover:bg-rose-700 hover:shadow-lg hover:shadow-rose-500/20 transition-all font-bold rounded-xl"
                  >
                    Clear & Continue
                  </Button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      </main>
    </div>
  );
};
