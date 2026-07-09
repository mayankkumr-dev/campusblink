import { create } from 'zustand';

export const useCartStore = create((set, get) => ({
  shopId: null,
  shopName: null,
  items: [], // Array of { id, name, price, qty, image_url, is_veg }

  addItem: (item, newShopId, newShopName) => set((state) => {
    // If adding from a different shop, clear cart first
    if (state.shopId && state.shopId !== newShopId) {
       // This behavior should ideally prompt the user first in the UI, but this enforces state consistency
       return {
         shopId: newShopId,
         shopName: newShopName,
         items: [{ ...item, qty: 1 }]
       };
    }
    
    const existingItem = state.items.find(i => i.id === item.id);
    if (existingItem) {
      return {
        shopId: state.shopId || newShopId,
        shopName: state.shopName || newShopName,
        items: state.items.map(i => 
          i.id === item.id ? { ...i, qty: i.qty + 1 } : i
        )
      };
    }
    
    return {
      shopId: state.shopId || newShopId,
      shopName: state.shopName || newShopName,
      items: [...state.items, { ...item, qty: 1 }]
    };
  }),

  removeItem: (itemId) => set((state) => {
    const newItems = state.items.filter(i => i.id !== itemId);
    return {
      items: newItems,
      shopId: newItems.length === 0 ? null : state.shopId,
      shopName: newItems.length === 0 ? null : state.shopName
    };
  }),

  updateQty: (itemId, qty) => set((state) => {
    if (qty <= 0) {
      const newItems = state.items.filter(i => i.id !== itemId);
      return {
         items: newItems,
         shopId: newItems.length === 0 ? null : state.shopId,
         shopName: newItems.length === 0 ? null : state.shopName
      };
    }
    return {
      items: state.items.map(i => 
        i.id === itemId ? { ...i, qty } : i
      )
    };
  }),

  clearCart: () => set({ shopId: null, shopName: null, items: [] }),

  total: () => {
    const { items } = get();
    return items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  },

  itemCount: () => {
     const { items } = get();
     return items.reduce((sum, item) => sum + item.qty, 0);
  }
}));
