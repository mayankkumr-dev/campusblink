import React, { useEffect, useState } from 'react';
import { ArrowLeft, Minus, Plus, ShoppingCart, Truck, X } from 'lucide-react';
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
  const [showCheckout, setShowCheckout] = useState(false);
  const [deliverToRoom, setDeliverToRoom] = useState(false);
  const [roomNumber, setRoomNumber] = useState(profile?.staff_room_number || '');
  const [paymentMethod, setPaymentMethod] = useState<'now' | 'counter' | 'later'>('now');
  const [placing, setPlacing] = useState(false);

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
      const { data } = await supabase
        .from('menu_items')
        .select('*')
        .eq('shop_id', selectedShop.id)
        .order('category')
        .order('name');
      // Filter is_available true on client side mapping just in case of nulls, or display all and let user know it's unav?
      setMenuItems((data || []).filter(item => item.is_available !== false));
    };
    loadMenu();
  }, [selectedShop?.id]);

  const cartItems = Object.values(cart);
  const cartTotal = cartItems.reduce((sum, c) => sum + (c.item.price * c.qty), 0);
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
        total: cartTotal,
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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="grid gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <ListSkeleton key={`prof-canteen-skeleton-${index}`} rows={1} />
          ))}
        </div>
      </div>
    );
  }

  // Checkout view
  if (showCheckout && selectedShop) {
    return (
      <div className="max-w-2xl mx-auto">
        <button onClick={() => setShowCheckout(false)} className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to menu
        </button>

        <h1 className="font-syne font-extrabold text-2xl text-[var(--text-primary)] mb-6">Checkout</h1>

        {/* Order Summary */}
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-5 mb-4">
          <h3 className="font-bold text-sm text-[var(--text-primary)] mb-3">Order from {selectedShop.name}</h3>
          {cartItems.map(c => (
            <div key={c.item.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
              <span className="text-sm text-[var(--text-primary)]">{c.item.name} × {c.qty}</span>
              <span className="text-sm font-bold text-[var(--text-primary)]">₹{c.item.price * c.qty}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-3 mt-2">
            <span className="font-bold text-[var(--text-primary)]">Total</span>
            <span className="font-syne font-extrabold text-xl text-[var(--text-primary)]">₹{cartTotal}</span>
          </div>
        </div>

        {/* Delivery Toggle */}
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-5 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Truck className="w-5 h-5 text-[var(--yellow-dark)]" />
              <div>
                <span className="text-sm font-bold text-[var(--text-primary)]">Deliver to my room?</span>
                <p className="text-xs text-[var(--text-secondary)]">We'll deliver your order to your cabin</p>
              </div>
            </div>
            <button
              onClick={() => setDeliverToRoom(!deliverToRoom)}
              className={`relative w-12 h-6 rounded-md transition-colors ${deliverToRoom ? 'bg-[var(--yellow-dark)]' : 'bg-[var(--border)]'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-[var(--bg)] rounded-sm shadow transition-transform ${deliverToRoom ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {deliverToRoom && (
            <div className="mt-3">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Room Number</label>
              <input
                type="text"
                value={roomNumber}
                onChange={e => setRoomNumber(e.target.value)}
                placeholder="e.g. A-201"
                className="w-full mt-1 h-10 px-3 rounded-md border border-[var(--border)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--yellow-dark)]"
              />
            </div>
          )}
        </div>

        {/* Payment Method */}
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-5 mb-6">
          <h3 className="font-bold text-sm text-[var(--text-primary)] mb-3">Payment Method</h3>
          {[
            { value: 'now' as const, label: 'Pay Now via UPI', desc: 'Scan QR code to pay' },
            { value: 'counter' as const, label: 'Pay at Counter', desc: 'Pay when picking up' },
            { value: 'later' as const, label: 'Pay Later', desc: 'Added to your pending payments' },
          ].map(opt => (
            <label
              key={opt.value}
              className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer mb-2 last:mb-0 transition-colors ${
                paymentMethod === opt.value ? 'border-[var(--yellow-dark)] bg-[#FEF9C3]/30' : 'border-[var(--border)] hover:bg-[var(--bg-primary)]'
              }`}
            >
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === opt.value}
                onChange={() => setPaymentMethod(opt.value)}
                className="accent-[var(--yellow-dark)]"
              />
              <div>
                <span className="text-sm font-bold text-[var(--text-primary)]">{opt.label}</span>
                <p className="text-xs text-[var(--text-secondary)]">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>

        <button
          onClick={handlePlaceOrder}
          disabled={placing || cartCount === 0}
          className="w-full h-12 rounded-md bg-[var(--text-primary)] text-white font-bold text-sm hover:bg-[var(--yellow-dark)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
        >
          {placing ? 'Placing Order...' : `Place Order — ₹${cartTotal}`}
        </button>
      </div>
    );
  }

  // Shop selection
  if (!selectedShop) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="font-syne font-extrabold text-2xl text-[var(--text-primary)] mb-6">Canteen</h1>
        {shops.length === 0 ? (
          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-8 text-center">
            <p className="text-sm text-[var(--text-secondary)]">No canteen shops available at your college.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {shops.map(shop => (
              <button
                key={shop.id}
                onClick={() => setSelectedShop(shop)}
                className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-5 text-left hover:border-[var(--yellow)] hover:shadow-sm transition-all flex items-center gap-4"
              >
                {shop.logo_url ? (
                  <img src={shop.logo_url} alt={shop.name} className="w-14 h-14 rounded-md object-cover border border-[var(--border)]" />
                ) : (
                  <div className="w-14 h-14 rounded-md bg-[#FEF9C3] flex items-center justify-center text-2xl">🍔</div>
                )}
                <div>
                  <h3 className="font-syne font-bold text-lg text-[var(--text-primary)]">{shop.name}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{shop.college}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Menu + cart view
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelectedShop(null); setCart({}); setMenuItems([]); }} className="p-2 rounded-md hover:bg-[var(--bg-secondary)]">
            <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <div>
            <h1 className="font-syne font-extrabold text-2xl text-[var(--text-primary)]">{selectedShop.name}</h1>
            <p className="text-sm text-[var(--text-secondary)]">Select items to order</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 mb-24">
        {menuItems.map(item => {
          const inCart = cart[item.id];
          return (
            <div key={item.id} className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-4 flex items-center justify-between">
              <div className="flex-1 flex gap-3">
                {item.image_url && (
                   <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-md object-cover border border-[var(--border)]" />
                )}
                <div>
                  <h4 className="font-bold text-sm text-[var(--text-primary)]">{item.name}</h4>
                  {item.description && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{item.description}</p>}
                  <span className="text-sm font-bold text-[var(--yellow-dark)] mt-1 block">₹{item.price}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {inCart ? (
                  <div className="flex items-center gap-2 bg-[#FEF9C3] rounded-md px-2 py-1">
                    <button onClick={() => removeFromCart(item.id)} className="w-6 h-6 flex items-center justify-center rounded-sm hover:bg-[#F59E0B]/20">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-bold w-5 text-center">{inCart.qty}</span>
                    <button onClick={() => addToCart(item)} className="w-6 h-6 flex items-center justify-center rounded-sm hover:bg-[#F59E0B]/20">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => addToCart(item)} className="h-8 px-4 rounded-md border border-[var(--yellow-dark)] text-[var(--yellow-dark)] text-xs font-bold hover:bg-[#FEF9C3] transition-colors">
                    Add
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cart Bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-16 md:bottom-0 left-0 md:left-[240px] right-0 bg-[var(--bg)] border-t border-[var(--border)] p-4 z-30 safe-area-bottom">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="w-5 h-5 text-[var(--yellow-dark)]" />
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[var(--yellow-dark)] text-white text-[9px] font-bold rounded-full flex items-center justify-center">{cartCount}</span>
              </div>
              <span className="font-syne font-bold text-lg">₹{cartTotal}</span>
            </div>
            <button
              onClick={() => setShowCheckout(true)}
              className="h-10 px-6 rounded-md bg-[var(--text-primary)] text-white text-sm font-bold hover:bg-[var(--yellow-dark)] hover:text-[var(--text-primary)] transition-colors"
            >
              Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
