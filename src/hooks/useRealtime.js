import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useNotificationStore } from '../store/notificationStore';

export function useCanteenOrders(shopId, onNewOrder, onUpdate) {
  useEffect(() => {
    if (!shopId) return;
    
    const channel = supabase
      .channel(`canteen-orders-${shopId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'canteen_orders',
        filter: `shop_id=eq.${shopId}`
      }, (payload) => {
        toast.success("New order received! 🍔");
        if (onNewOrder) onNewOrder(payload.new);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'canteen_orders',
        filter: `shop_id=eq.${shopId}`
      }, (payload) => {
        if (onUpdate) onUpdate(payload.new);
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId, onNewOrder, onUpdate]);
}

export function usePrintOrders(shopId, onNewOrder, onUpdate) {
  useEffect(() => {
    if (!shopId) return;
    
    const channel = supabase
      .channel(`print-orders-${shopId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'print_orders',
        filter: `shop_id=eq.${shopId}`
      }, (payload) => {
        toast.success("New print order received! 🖨️");
        if (onNewOrder) onNewOrder(payload.new);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'print_orders',
        filter: `shop_id=eq.${shopId}`
      }, (payload) => {
        if (onUpdate) onUpdate(payload.new);
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId, onNewOrder, onUpdate]);
}

export function useShopStatus(table, shopId, onUpdate) {
  useEffect(() => {
    if (!table || !shopId) return;

    const channel = supabase
      .channel(`${table}-status-${shopId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table,
        filter: `id=eq.${shopId}`,
      }, (payload) => {
        if (onUpdate) onUpdate(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId, table, onUpdate]);
}

export function useMyOrderStatus(studentId, onStatusChange) {
  useEffect(() => {
    if (!studentId) return;

    const channel1 = supabase
      .channel(`canteen-status-${studentId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'canteen_orders',
        filter: `student_id=eq.${studentId}`
      }, (payload) => {
        const status = payload.new.status;
        if (status === 'ready') toast.success("Your food is ready for pickup! 🍔");
        if (status === 'cancelled') toast.error("Your order was cancelled.");
        if (onStatusChange) onStatusChange(payload.new);
      })
      .subscribe();

    const channel2 = supabase
      .channel(`print-status-${studentId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'print_orders',
        filter: `student_id=eq.${studentId}`
      }, (payload) => {
        const status = payload.new.status;
        if (status === 'ready') toast.success("Your print is ready! 🖨️");
        if (onStatusChange) onStatusChange(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
    };
  }, [studentId, onStatusChange]);
}

export function useMessages(listingId, onNewMessage) {
  useEffect(() => {
    if (!listingId) return;
    const channel = supabase
      .channel(`messages-${listingId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'listing_messages',
        filter: `listing_id=eq.${listingId}`
      }, (payload) => {
        if (onNewMessage) onNewMessage(payload.new);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [listingId, onNewMessage]);
}

export function useCommunityFeed(onNewPost) {
  useEffect(() => {
    const channel = supabase
      .channel('public:posts')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'posts'
      }, (payload) => {
        if (payload.new.is_hidden === false) {
           if (onNewPost) onNewPost(payload.new);
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [onNewPost]);
}

export function useNotifications(userId) {
  const addNotification = useNotificationStore(state => state.addNotification);

  useEffect(() => {
    if (!userId) return;
    
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        addNotification(payload.new);
        toast(payload.new.title, { icon: '🔔' });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, addNotification]);
}
