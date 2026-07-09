import React, { useEffect, useState } from 'react';
import { ArrowLeft, Minus, Plus, ShoppingCart, Truck, X, Clock, MapPin, ChevronRight, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { insertPendingPayment } from '../../api/professor';
import { ListSkeleton } from './ui/Skeletons';

export const ProfessorCanteenPage: React.FC = () => {
  const profile = useAuthStore((state) => state.profile);
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [cart, setCart] = useState<Record<string, { item: any; qty: number }>>({});
  const [loading, setLoading] = useState(true);
  
  // Slide-out cart state
  const [showCheckout, setShowCheckout] = useState(false);
  const [deliverToRoom, setDeliverToRoom] = useState(false);
  const [roomNumber, setRoomNumber] = useState(profile?.staff_room_number || '');
  const [paymentMethod, setPaymentMethod] = useState<'now' | 'counter' | 'later'>('now');
  const [placing, setPlacing] = useState(false);

  // Category filter state
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    const loadShops = async () => {
      setLoading(true);
      const college = profile?.college;
      let query = supabase.from('canteen_shops').select('*').eq('is_active', true);
      if (college) query = query.eq('college', college);
      const { data } = await query.order('name');
      setShops(data || []);
      setLoading(false);
    };
    loadShops();
  }, [profile?.college]);

  useEffect(() => {
    if (!selectedShop) return;
    const loadMenu = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('menu_items')
        .select('*')
        .eq('shop_id', selectedShop.id)
        .order('category')
        .order('name');
      setMenuItems((data || []).filter(item => item.is_available !== false));
      setLoading(false);
      setSelectedCategory('All');
    };
    loadMenu();
  }, [selectedShop?.id]);

  const categories = ['All', ...Array.from(new Set(menuItems.map(item => item.category).filter(Boolean)))];
  const filteredItems = selectedCategory === 'All' ? menuItems : menuItems.filter(item => item.category === selectedCategory);

  const cartItems = Object.values(cart);
  const cartSubtotal = cartItems.reduce((sum, c) => sum + (c.item.price * c.qty), 0);
  const cartTax = Math.round(cartSubtotal * 0.05); // 5% dummy tax
  const cartTotal = cartSubtotal + cartTax;
  const cartCount = cartItems.reduce((sum, c) => sum + c.qty, 0);

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev[item.id];
      return { ...prev, [item.id]: { item, qty: (existing?.qty || 0) + 1 } };
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev[itemId];
      if (!existing || existing.qty <= 1) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return { ...prev, [itemId]: { ...existing, qty: existing.qty - 1 } };
    });
  };

  const handlePlaceOrder = async () => {
    if (!profile?.id || !selectedShop || cartCount === 0) return;
    setPlacing(true);

    try {
      const items = cartItems.map(c => ({
        item_id: c.item.id,
        item_name: c.item.name,
        name: c.item.name,
        quantity: c.qty,
        price: c.item.price,
      }));

      const orderPayload: any = {
        student_id: profile.id,
        shop_id: selectedShop.id,
        items,
        total: cartTotal, // Send total including tax
        status: 'placed',
        is_professor_order: true,
        is_delivery_order: deliverToRoom,
        delivery_room_number: deliverToRoom ? roomNumber : null,
        professor_pay_later: paymentMethod === 'later',
      };

      const { data: order, error } = await supabase
        .from('canteen_orders')
        .insert([orderPayload])
        .select()
        .single();

      if (error) throw error;

      if (paymentMethod === 'later' && order) {
        await insertPendingPayment({
          professor_id: profile.id,
          order_id: order.id,
          order_type: 'canteen',
          amount: cartTotal,
          shop_name: selectedShop.name,
          items,
        });
      }

      toast.success('Order placed successfully! 🍔');
      setCart({});
      setShowCheckout(false);
      setSelectedShop(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  if (loading && !selectedShop) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <ListSkeleton key={`prof-canteen-skeleton-${index}`} rows={1} />
          ))}
        </div>
      </div>
    );
  }

  // Shop Selection View
  if (!selectedShop) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-20">
        <header className="mb-10">
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-2">Campus Dining</p>
          <h1 className="font-syne font-extrabold text-4xl sm:text-5xl text-gray-900 tracking-tight leading-tight">
            Select a Canteen
          </h1>
          <p className="text-sm text-gray-500 mt-4 max-w-xl leading-relaxed">
            Choose from the available dining locations on campus. Your faculty discount is automatically applied to eligible items.
          </p>
        </header>

        {shops.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
            <div className="w-16 h-16 mx-auto bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Truck className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-lg font-bold text-gray-900 font-syne">No canteens available</p>
            <p className="text-sm text-gray-500 mt-2">There are currently no active canteens in your college.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shops.map(shop => (
              <button
                key={shop.id}
                onClick={() => setSelectedShop(shop)}
                className="group bg-white rounded-3xl p-6 text-left border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 flex flex-col gap-5 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-50 to-transparent rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform"></div>
                <div className="flex items-center gap-4">
                  {shop.logo_url ? (
                    <img src={shop.logo_url} alt={shop.name} className="w-16 h-16 rounded-2xl object-cover shadow-sm" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-2xl shadow-sm">
                      🍔
                    </div>
                  )}
                  <div>
                    <h3 className="font-syne font-bold text-xl text-gray-900 group-hover:text-blue-600 transition-colors">{shop.name}</h3>
                    <p className="text-xs font-semibold text-gray-500 mt-1 flex items-center gap-1 uppercase tracking-wider">
                      <MapPin className="w-3 h-3" /> {shop.college}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-4 border-t border-gray-50">
                   <span className="text-sm font-medium text-gray-500">View Menu</span>
                   <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Menu View
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-32">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { setSelectedShop(null); setCart({}); setMenuItems([]); }} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 text-gray-600 hover:text-blue-600 hover:shadow-md transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-syne font-extrabold text-3xl text-gray-900">{selectedShop.name}</h1>
            <p className="text-sm text-gray-500 font-medium mt-1 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" /> Prep time: ~10-15 mins
            </p>
          </div>
        </div>
      </div>

      {/* Categories Filter (Soft Light-themed Pills) */}
      {categories.length > 1 && (
        <div className="flex overflow-x-auto hide-scrollbar gap-3 mb-10 pb-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 shadow-sm ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white shadow-blue-500/25'
                  : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {/* Menu Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
           <ListSkeleton rows={4} />
           <ListSkeleton rows={4} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredItems.map(item => {
            const inCart = cart[item.id];
            return (
              <div key={item.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgb(0,0,0,0.06)] transition-all duration-300 flex items-center justify-between gap-4">
                <div className="flex-1 flex gap-4 min-w-0">
                  {item.image_url ? (
                     <img src={item.image_url} alt={item.name} className="w-20 h-20 rounded-2xl object-cover shadow-sm bg-gray-50 shrink-0" />
                  ) : (
                     <div className="w-20 h-20 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-2xl shrink-0 shadow-sm">
                       🍲
                     </div>
                  )}
                  <div className="min-w-0 flex flex-col justify-center">
                    <h4 className="font-bold text-base text-gray-900 truncate font-syne">{item.name}</h4>
                    {item.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>}
                    <span className="text-sm font-black text-blue-600 mt-2 block tracking-tight">₹{item.price}</span>
                  </div>
                </div>
                
                <div className="shrink-0 pl-2">
                  {inCart ? (
                    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 bg-blue-50 rounded-2xl p-1.5 border border-blue-100">
                      <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm hover:bg-blue-600 hover:text-white transition-colors">
                        <Minus className="w-4 h-4" strokeWidth={2.5} />
                      </button>
                      <span className="text-sm font-bold w-4 text-center text-blue-900">{inCart.qty}</span>
                      <button onClick={() => addToCart(item)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm hover:bg-blue-600 hover:text-white transition-colors">
                        <Plus className="w-4 h-4" strokeWidth={2.5} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => addToCart(item)} className="h-10 px-6 rounded-2xl border-2 border-gray-100 bg-white text-gray-900 text-sm font-bold hover:border-blue-600 hover:text-blue-600 shadow-sm transition-all flex items-center gap-2">
                      Add <Plus className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating View Cart Button */}
      {cartCount > 0 && !showCheckout && (
        <div className="fixed bottom-24 md:bottom-10 left-1/2 -translate-x-1/2 z-30 animate-in fade-in slide-in-from-bottom-10 duration-500">
          <button
            onClick={() => setShowCheckout(true)}
            className="flex items-center gap-4 bg-gray-900 text-white pl-6 pr-4 py-4 rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:scale-105 transition-transform"
          >
            <div className="flex items-center gap-3 border-r border-gray-700 pr-4">
              <div className="relative">
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                  {cartCount}
                </span>
              </div>
              <span className="font-syne font-bold text-lg">₹{cartSubtotal}</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-blue-300">
              Checkout <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Persistent Slide-Out Cart Panel */}
      <div className={`fixed inset-y-0 right-0 w-full md:w-[440px] bg-white shadow-[-10px_0_40px_rgba(0,0,0,0.1)] z-50 transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) flex flex-col ${showCheckout ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-6 sm:p-8 border-b border-gray-100 shrink-0 bg-white">
          <h2 className="text-2xl font-extrabold text-gray-900 font-syne flex items-center gap-3">
             <ShoppingCart className="w-6 h-6 text-blue-600" /> Your Order
          </h2>
          <button onClick={() => setShowCheckout(false)} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-900 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-[#FAFAFA]">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                 <ShoppingCart className="w-10 h-10 text-gray-300" strokeWidth={1.5} />
              </div>
              <p className="text-xl font-bold text-gray-900 font-syne mb-2">Cart is empty</p>
              <p className="text-sm text-gray-500">Looks like you haven't added anything yet.</p>
              <button onClick={() => setShowCheckout(false)} className="mt-8 px-8 py-3 bg-white border border-gray-200 rounded-full text-sm font-bold text-gray-900 hover:border-gray-900 transition-colors">
                 Continue Browsing
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Order Items */}
              <div className="space-y-5 bg-white p-5 rounded-3xl border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 px-1">Order Details</h3>
                {cartItems.map(c => (
                  <div key={c.item.id} className="flex gap-4 items-center">
                    {c.item.image_url ? (
                      <img src={c.item.image_url} alt={c.item.name} className="w-16 h-16 rounded-2xl object-cover bg-gray-50 shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-xl shrink-0">🍲</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-gray-900 truncate">{c.item.name}</h4>
                      <p className="text-sm text-blue-600 font-bold mt-1">₹{c.item.price}</p>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 rounded-full p-1 border border-gray-100">
                      <button onClick={() => removeFromCart(c.item.id)} className="w-7 h-7 flex items-center justify-center rounded-full bg-white shadow-sm text-gray-600 hover:text-blue-600 transition-colors">
                        <Minus className="w-3 h-3" strokeWidth={2.5} />
                      </button>
                      <span className="text-sm font-bold w-3 text-center">{c.qty}</span>
                      <button onClick={() => addToCart(c.item)} className="w-7 h-7 flex items-center justify-center rounded-full bg-white shadow-sm text-gray-600 hover:text-blue-600 transition-colors">
                        <Plus className="w-3 h-3" strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Delivery Toggle */}
              <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${deliverToRoom ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'}`}>
                       <Truck className="w-5 h-5" strokeWidth={2} />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-gray-900">Cabin Delivery</span>
                      <p className="text-xs text-gray-500 mt-0.5">We'll bring it to your room</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDeliverToRoom(!deliverToRoom)}
                    className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${deliverToRoom ? 'bg-blue-600' : 'bg-gray-200'}`}
                  >
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-300 ${deliverToRoom ? 'translate-x-7' : 'translate-x-1'}`} />
                  </button>
                </div>
                
                {deliverToRoom && (
                  <div className="mt-5 pt-5 border-t border-gray-50 animate-in fade-in slide-in-from-top-2">
                    <label className="text-xs font-bold tracking-widest text-gray-400 uppercase">Room Number</label>
                    <div className="relative mt-2">
                       <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                       <input
                         type="text"
                         value={roomNumber}
                         onChange={e => setRoomNumber(e.target.value)}
                         placeholder="e.g. A-201"
                         className="w-full h-12 pl-11 pr-4 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
                       />
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 px-1">Payment Method</h3>
                <div className="space-y-3">
                  {[
                    { value: 'now' as const, label: 'Pay Now (UPI)', desc: 'Scan QR at counter' },
                    { value: 'counter' as const, label: 'Pay at Counter', desc: 'Cash or Card' },
                    { value: 'later' as const, label: 'Add to Dues', desc: 'Settle later from dashboard' },
                  ].map(opt => (
                    <label
                      key={opt.value}
                      className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                        paymentMethod === opt.value 
                           ? 'border-blue-600 bg-blue-50/50 shadow-sm' 
                           : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                         <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${paymentMethod === opt.value ? 'border-blue-600' : 'border-gray-300'}`}>
                            {paymentMethod === opt.value && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
                         </div>
                         <div>
                           <span className={`text-sm font-bold ${paymentMethod === opt.value ? 'text-blue-900' : 'text-gray-900'}`}>{opt.label}</span>
                           <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                         </div>
                      </div>
                      {paymentMethod === opt.value && <Check className="w-5 h-5 text-blue-600" />}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Cart Footer */}
        {cartItems.length > 0 && (
           <div className="p-6 sm:p-8 bg-white border-t border-gray-100 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] shrink-0">
             <div className="space-y-3 mb-6">
               <div className="flex justify-between text-sm font-medium text-gray-500">
                 <span>Subtotal</span>
                 <span>₹{cartSubtotal}</span>
               </div>
               <div className="flex justify-between text-sm font-medium text-gray-500">
                 <span>Taxes & Fees (5%)</span>
                 <span>₹{cartTax}</span>
               </div>
               <div className="flex justify-between text-xl font-extrabold text-gray-900 pt-3 border-t border-gray-100 font-syne">
                 <span>Total</span>
                 <span className="text-blue-600">₹{cartTotal}</span>
               </div>
             </div>
             
             <button 
               onClick={handlePlaceOrder} 
               disabled={placing || cartCount === 0 || (deliverToRoom && !roomNumber.trim())} 
               className="w-full h-14 rounded-full bg-blue-600 text-white font-bold text-base hover:bg-blue-700 transition-all shadow-[0_8px_20px_rgba(37,99,235,0.2)] disabled:opacity-50 disabled:hover:scale-100 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 group"
             >
                {placing ? 'Processing...' : `Place Order • ₹${cartTotal}`} 
                {!placing && <ArrowLeft className="w-5 h-5 rotate-180 group-hover:translate-x-1 transition-transform" />}
             </button>
           </div>
        )}
      </div>

      {/* Backdrop for Slide-Out Cart */}
      {showCheckout && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40 animate-in fade-in duration-300" onClick={() => setShowCheckout(false)} />
      )}
      
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};
