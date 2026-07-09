import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Search, ShoppingBag, X, Plus, Minus, Coffee, Utensils, Pizza, Soup, Loader2, AlertTriangle, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams, useNavigate } from 'react-router';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { getCanteens, getMenuItems, getMyCanteenReorderRequests, placeOrder, getMyOrders } from '../../api/canteen';
import { deductCredits } from '../../api/credits';
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
  const { items: cartItems, addItem, removeItem, updateQty, total: getCartTotal, clearCart, shopId: cartShopId } = useCartStore();

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
    const shop = canteens.find(c => c.id === selectedCanteenId);
    if (cartShopId && cartShopId !== selectedCanteenId) {
       toast.error("You can only order from one canteen at a time. Cart cleared.");
    }
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      image_url: item.image_url,
      is_veg: item.is_veg
    }, selectedCanteenId, shop?.name || 'Canteen');
    toast.success(`${item.name} added to cart`);
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

  if (checkingCanteenAccess) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] p-4 md:p-8">
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
      <div className="min-h-screen bg-[var(--bg-primary)] font-sans text-[var(--text-primary)] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-lg border border-[var(--text-primary)]/10 bg-[var(--bg)] p-8 text-center shadow-soft">
          <h2 className="font-syne font-bold text-2xl mb-3">College Required</h2>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-6">
            Update your profile to select your college to access canteen ordering.
          </p>
          <button
            onClick={() => navigate('/student/profile?edit=1')}
            className="px-6 py-3 rounded-md bg-[var(--yellow)] text-[var(--text-primary)] font-bold hover:shadow-[0_0_20px_rgba(255,214,0,0.35)] transition-all"
          >
            Update Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] font-sans text-[var(--text-primary)] flex flex-col pt-16 md:pt-0">
      {/* Top Navbar */}
      <header className="hidden md:flex h-20 bg-[var(--bg)] border-b border-[var(--text-primary)]/10 px-8 items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3 mt-2">
           {/* Logo intentionally removed from this specific page header as per request */}
        </div>

        <nav className="flex items-center gap-8">
          <button 
            onClick={() => { setActiveTab('menu'); setIsCartOpen(false); }}
            className={`font-syne font-bold text-lg transition-colors ${activeTab === 'menu' && !isCartOpen ? 'text-[var(--text-primary)] border-b-2 border-[var(--yellow)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            Menu
          </button>
          <button 
            onClick={() => { setActiveTab('history'); setIsCartOpen(false); }}
            className={`font-syne font-bold text-lg transition-colors ${activeTab === 'history' ? 'text-[var(--text-primary)] border-b-2 border-[var(--yellow)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            Order History
          </button>
          <button 
            onClick={() => { setIsCartOpen(!isCartOpen); }}
            className={`font-syne font-bold text-lg transition-colors flex items-center gap-2 ${isCartOpen ? 'text-[var(--text-primary)] border-b-2 border-[var(--yellow)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            Cart {cartItems.length > 0 && <span className="bg-[var(--yellow)] text-[var(--text-primary)] text-xs px-2 py-0.5 rounded-md shadow-sm">{cartItems.length}</span>}
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="font-syne font-bold text-sm leading-tight text-[var(--text-primary)]">{profile?.name || 'Student'}</p>
            <p className="text-xs text-[var(--yellow-dark)] font-bold font-sans">⭐ {profile?.campus_credits || 0} Reputation available</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-[var(--bg)] border border-[var(--yellow)] overflow-hidden shadow-sm">
            <img
              src={profile?.avatar_url || getAvatarDataUrl({ name: profile?.name, email: profile?.email, seed: profile?.id || profile?.username })}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </header>
      
      {/* Mobile nav buttons */}
      <div className="md:hidden flex bg-[var(--bg)] border-b border-black/10 sticky top-16 z-30">
        <button onClick={() => { setActiveTab('menu'); setIsCartOpen(false); }} className={`flex-1 py-3 text-sm font-bold ${activeTab === 'menu' && !isCartOpen ? 'border-b-2 border-[var(--yellow)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>Menu</button>
        <button onClick={() => { setActiveTab('history'); setIsCartOpen(false); }} className={`flex-1 py-3 text-sm font-bold ${activeTab === 'history' ? 'border-b-2 border-[var(--yellow)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>History</button>
        <button onClick={() => setIsCartOpen(!isCartOpen)} className={`flex-1 py-3 text-sm font-bold ${isCartOpen ? 'border-b-2 border-[var(--yellow)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
          Cart {cartItems.length > 0 && `(${cartItems.length})`}
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 transition-all duration-300">
          {reorderRequests.map((order) => (
            <div key={order.id} className="mb-4 rounded-lg border border-amber-400/40 bg-amber-50 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-[var(--text-primary)] text-sm">Canteen Reorder Requested</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Your order <span className="font-mono font-bold">#{order.id.slice(0, 6)}</span>
                    {order.canteen_shops?.name ? ` at ${order.canteen_shops.name}` : ''} needs reorder.
                    If you already paid, you do not need to pay again. If not, you can pay at the canteen.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate(`/student/canteen/reorder/${order.id}`)}
                className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-all disabled:opacity-60 whitespace-nowrap shadow-md"
              >
                <><RotateCcw className="w-4 h-4" /> Reorder Items</>
              </button>
            </div>
          ))}
          
          {isLoading && !isCartOpen ? (
             <div className="max-w-6xl mx-auto py-8">
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                 {Array.from({ length: 6 }).map((_, index) => (
                   <ListSkeleton key={`canteen-grid-skeleton-${index}`} rows={1} />
                 ))}
               </div>
             </div>
          ) : !selectedCanteenId && activeTab === 'menu' ? (
            <div className="max-w-6xl mx-auto py-8">
              <h2 className="font-syne font-bold text-3xl md:text-4xl mb-4 text-[var(--text-primary)]">Where are you hungry?</h2>
              <p className="text-base md:text-lg text-[var(--text-secondary)] font-sans mb-12">Select a canteen below to view their live menu and place an order.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {canteens.length === 0 && !isLoading && (
                  <p className="text-[var(--text-secondary)] col-span-full">No active canteens found on campus at the moment.</p>
                )}
                {canteens.map((canteen) => (
                  <button
                    key={canteen.id}
                    onClick={() => setSearchParams({ canteenId: canteen.id })}
                    className="bg-[var(--bg)] border-2 border-[var(--text-primary)]/10 hover:border-[var(--yellow)] rounded-lg p-6 text-left transition-all group shadow-soft hover:shadow-medium hover:-translate-y-1 relative overflow-hidden"
                  >
                     <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-[var(--yellow)]/10 rounded-full blur-[20px] group-hover:bg-[var(--yellow)]/20 transition-colors pointer-events-none" />
                     {canteen.logo_url ? (
                       <img src={canteen.logo_url} alt="Logo" className="w-10 h-10 object-cover rounded-full mb-4 relative z-10" />
                     ) : (
                       <Utensils className="w-10 h-10 text-[var(--text-primary)] mb-4 group-hover:text-[var(--yellow)] transition-colors relative z-10" />
                     )}
                     <h3 className="print-shop-name font-syne font-bold text-xl text-[var(--text-primary)] mb-2 relative z-10">{canteen.name}</h3>
                     <p className="font-sans text-sm text-[var(--text-secondary)] relative z-10">{canteen.category?.replace('_',' ') || canteen.description || 'Campus Canteen'}</p>
                     <p className={`mt-3 text-[11px] font-bold uppercase tracking-[0.16em] relative z-10 ${canteen.is_open_now ? 'text-[var(--success-dark)]' : 'text-[var(--error-dark)]'}`}>{canteen.is_open_now ? 'Open now' : 'Closed'}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : activeTab === 'menu' ? (
            <>
              {/* Category Nav & Search */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex overflow-x-auto hide-scrollbar gap-2 md:gap-4 pb-2 md:pb-0">
                  {dynamicCategories.length > 0 ? dynamicCategories.map((catName) => (
                    <button
                      key={catName}
                      onClick={() => setActiveCategory(catName)}
                      className={`category-pill flex items-center whitespace-nowrap gap-2 px-5 py-2.5 rounded-md font-bold font-sans transition-all border ${
                        activeCategory === catName 
                          ? 'bg-[var(--yellow)] text-[var(--text-primary)] border-[var(--yellow)] shadow-medium' 
                          : 'bg-[var(--bg)] text-[var(--text-secondary)] border-[var(--text-primary)]/10 hover:border-[var(--text-primary)]/30 hover:text-[var(--text-primary)] shadow-sm'
                      }`}
                    >
                      {catName}
                    </button>
                  )) : (
                    categories.map((cat) => (
                      <button
                        key={cat.name}
                        onClick={() => setActiveCategory(cat.name)}
                        className={`category-pill flex items-center whitespace-nowrap gap-2 px-6 py-3 rounded-md font-bold font-sans transition-all border ${
                          activeCategory === cat.name 
                            ? 'bg-[var(--yellow)] text-[var(--text-primary)] border-[var(--yellow)] shadow-medium' 
                            : 'bg-[var(--bg)] text-[var(--text-secondary)] border-[var(--text-primary)]/10 hover:border-[var(--text-primary)]/30 hover:text-[var(--text-primary)] shadow-sm'
                        }`}
                      >
                        <cat.icon className="w-5 h-5" />
                        {cat.name}
                      </button>
                    ))
                  )}
                </div>
                
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                  <input 
                    placeholder="Search for an item" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[var(--bg)] border border-[var(--text-primary)]/10 rounded-md pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-[var(--yellow)] focus:ring-1 focus:ring-[var(--yellow)]/50 transition-colors text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-sans shadow-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <button 
                  onClick={() => { 
                    setSearchParams({}); 
                  }}
                  className="text-sm font-sans font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--text-primary)]/10 bg-[var(--bg)] hover:bg-[var(--bg-secondary)] px-4 py-1.5 rounded-md transition-colors flex items-center gap-1"
                >
                  ← Back to Canteens
                </button>
                <h2 className="font-syne font-bold text-2xl md:text-3xl text-[var(--text-primary)]">
                  {canteens.find(c => c.id === selectedCanteenId)?.name || 'Menu'}
                </h2>
                <span className={`rounded-md px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${canteens.find(c => c.id === selectedCanteenId)?.is_open_now ? 'bg-[var(--success-light)] text-[var(--success-dark)]' : 'bg-[#FEE2E2] text-[var(--error-dark)]'}`}>
                  {canteens.find(c => c.id === selectedCanteenId)?.is_open_now ? 'Open' : 'Closed'}
                </span>
              </div>

              {/* Menu Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 pb-24 md:pb-0">
                {filteredItems.length === 0 && <p className="text-[var(--text-secondary)] col-span-full">No items found in this category.</p>}
                {filteredItems.map(item => {
                  const qty = getQuantity(item.id);
                  return (
                    <Card key={item.id} className="bg-[var(--bg)] border border-[var(--text-primary)]/10 overflow-hidden hover:border-[var(--yellow)] transition-colors group flex flex-col p-4 shadow-soft">
                      <div className="w-full aspect-square rounded-lg overflow-hidden bg-[var(--bg-secondary)] relative mb-4">
                        {item.image_url ? (
                          <img loading="lazy" src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                             <Utensils className="w-12 h-12" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-[var(--bg)]/90  border border-[var(--text-primary)]/10 rounded-md px-2 py-1 shadow-sm flex items-center gap-1.5">
                           <div className={`w-2 h-2 rounded-full ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`} />
                           <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">{item.is_veg ? 'Veg' : 'Non-Veg'}</span>
                        </div>
                      </div>
                      <div className="flex flex-col flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="canteen-item-name font-syne font-bold leading-tight pr-2 text-[var(--text-primary)]">{item.name}</h3>
                        </div>
                        
                        <div className="text-sm text-[var(--text-secondary)] font-sans space-y-1 mb-4">
                          <p>{item.description || 'Prepared fresh'}</p>
                          <p>Prep Time: <span className="font-bold text-[var(--text-primary)]">{item.prep_time_minutes} min</span></p>
                        </div>
                        
                        <div className="mt-auto flex flex-col gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center bg-[var(--bg)] rounded-md border border-[var(--text-primary)]/10 overflow-hidden shadow-sm">
                              <button 
                                onClick={() => updateQty(item.id, qty - 1)}
                                className="w-8 h-8 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="w-8 text-center font-bold text-[var(--text-primary)] text-sm">{qty}</span>
                              <button 
                                onClick={() => {
                                  if(qty === 0) handleAddToCart(item);
                                  else updateQty(item.id, qty + 1);
                                }}
                                className="w-8 h-8 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                            <span className="listing-price font-syne font-bold text-xl text-[var(--text-primary)] ml-auto">₹{item.price}</span>
                          </div>
                          
                          {qty > 0 ? (
                            <button className="w-full py-2.5 rounded-md font-bold font-sans text-sm tracking-wider border-2 border-[var(--yellow)] text-[var(--text-primary)] bg-[var(--yellow)]/20 flex items-center justify-center gap-2 shadow-sm">
                              <ShoppingBag className="w-4 h-4" /> Added to Cart
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleAddToCart(item)}
                              className="w-full py-2.5 rounded-md font-bold font-sans text-sm tracking-wider border border-[var(--text-primary)]/10 hover:border-[var(--yellow)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--yellow)]/10 hover:shadow-sm transition-all flex items-center justify-center gap-2"
                            >
                              <ShoppingBag className="w-4 h-4" /> Add to cart
                            </button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {activeTab === 'history' && (
                <div className="max-w-6xl mx-auto">
                  <h2 className="font-syne font-bold text-3xl md:text-4xl mb-8 text-center text-[var(--text-primary)]">Order History</h2>

                  <div className="bg-[var(--bg)] border border-[var(--text-primary)]/10 rounded-lg overflow-hidden shadow-soft overflow-x-auto">
                    {orderHistory.length === 0 ? (
                      <div className="p-8 text-center text-[var(--text-secondary)]">You haven't placed any canteen orders yet.</div>
                    ) : (
                      <table className="w-full min-w-[600px] text-left font-sans">
                        <thead className="bg-[var(--bg-secondary)] h-[40px] border-b border-[var(--border)]">
                          <tr className="border-b border-[var(--text-primary)]/10 text-xs text-[var(--text-secondary)] uppercase tracking-widest bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] transition-colors duration-150">
                            <th className="px-6 py-4 font-bold px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Date</th>
                            <th className="px-6 py-4 font-bold px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Shop</th>
                            <th className="px-6 py-4 font-bold px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Items</th>
                            <th className="px-6 py-4 font-bold px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Status</th>
                            <th className="px-6 py-4 font-bold text-right px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Expense</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--text-primary)]/10">
                          {orderHistory.map((order) => (
                            <tr key={order.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                              <td className="activity-date px-6 py-4 text-sm text-[var(--text-primary)] font-medium">
                                {new Date(order.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 text-sm text-[var(--text-primary)]">
                                {order.canteen_shops?.name || 'Unknown'}
                              </td>
                              <td className="px-6 py-4 text-sm text-[var(--text-primary)] font-medium max-w-[200px] truncate">
                                {Array.isArray(order.items) ? order.items.map((i:any) => `${i.qty}x ${i.name}`).join(', ') : 'Custom Order'}
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <span className={`status-badge inline-block px-2 py-1 rounded text-xs font-bold uppercase ${
                                  order.status === 'ready' ? 'bg-green-100 text-green-700' :
                                  order.status === 'preparing' ? 'bg-orange-100 text-orange-700' :
                                  order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                  order.status === 'picked_up' ? 'bg-gray-200 text-[var(--text-2)]' :
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {order.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm font-bold text-right text-[var(--text-primary)]">₹ {order.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

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
                className="fixed inset-0 bg-black/40 -[1px] z-40"
              />
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ type: 'spring', damping: 24, stiffness: 220 }}
                className="fixed z-50 left-0 right-0 bottom-0 md:bottom-6 md:left-auto md:right-6 md:w-[420px] md:max-h-[84vh] bg-[var(--bg)] border border-[var(--border)] flex flex-col overflow-hidden"
              >
                <div className="p-4 md:p-5 border-b border-[var(--text-primary)]/10 flex items-center justify-between bg-[var(--bg-secondary)]">
                  <div>
                    <h2 className="font-syne font-bold text-2xl text-[var(--text-primary)]">Your Cart</h2>
                    <p className="text-xs text-[var(--text-secondary)] font-bold mt-0.5">{cartItems.length} item{cartItems.length === 1 ? '' : 's'} added</p>
                  </div>
                  <button onClick={() => setIsCartOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-2 hover:bg-[var(--bg)] rounded-md transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 hide-scrollbar bg-[var(--bg)]">
                  {cartItems.length === 0 ? (
                    <div className="h-56 flex flex-col items-center justify-center text-[var(--text-muted)] space-y-4">
                      <ShoppingBag className="w-16 h-16 opacity-30" />
                      <p className="font-sans font-medium text-[var(--text-secondary)]">Your cart is empty</p>
                    </div>
                  ) : (
                    cartItems.map((cartItem: any) => (
                      <div key={cartItem.id} className="flex gap-4 rounded-lg border border-[var(--text-primary)]/10 p-3">
                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-[var(--bg-secondary)] flex-shrink-0 flex items-center justify-center">
                          {cartItem.image_url ? (
                             <img loading="lazy" src={cartItem.image_url} alt={cartItem.name} className="w-full h-full object-cover opacity-90" />
                          ) : (
                             <Utensils className="w-7 h-7 text-[var(--text-muted)]" />
                          )}
                        </div>
                        <div className="flex-1 flex flex-col min-w-0">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-syne font-bold text-sm text-[var(--text-primary)] line-clamp-2 pr-3 leading-tight">{cartItem.name}</h4>
                            <button onClick={() => removeItem(cartItem.id)} className="text-red-500 hover:text-red-600 p-1 -mt-1 -mr-1 transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between mt-auto">
                            <div className="flex items-center bg-[var(--bg)] rounded-md border border-[var(--text-primary)]/10 overflow-hidden shadow-sm">
                              <button onClick={() => updateQty(cartItem.id, cartItem.qty - 1)} className="w-7 h-7 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors">
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-6 text-center font-bold text-[var(--text-primary)] text-xs">{cartItem.qty}</span>
                              <button onClick={() => updateQty(cartItem.id, cartItem.qty + 1)} className="w-7 h-7 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors">
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <span className="font-syne font-bold text-[var(--text-primary)] text-sm">₹{cartItem.price * cartItem.qty}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {cartItems.length > 0 && (
                  <div className="p-4 md:p-5 border-t border-[var(--text-primary)]/10 bg-[var(--bg-secondary)]">
                    <div className="flex justify-between items-center mb-4 px-1">
                      <span className="font-sans font-bold text-[var(--text-secondary)]">Total Amount</span>
                      <span className="font-syne font-bold text-2xl text-[var(--text-primary)]">₹{cartTotal}</span>
                    </div>
                    <button
                      onClick={handlePlaceOrder}
                      disabled={isPlacingOrder}
                      className="w-full py-4 bg-[var(--yellow)] text-[var(--text-primary)] rounded-md font-bold font-sans uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {isPlacingOrder ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Utensils className="w-4 h-4" /> Place Order ({cartItems.length})</>}
                    </button>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
