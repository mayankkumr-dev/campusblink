import { create } from 'zustand';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  
  setNotifications: (notifications) => {
     const unreadCount = notifications.filter(n => !n.is_read).length;
     set({ notifications, unreadCount });
  },

  addNotification: (notification) => set((state) => {
    const newNotifications = [notification, ...state.notifications];
    return {
      notifications: newNotifications,
      unreadCount: state.unreadCount + (notification.is_read ? 0 : 1)
    };
  }),

  markAsRead: (id) => set((state) => {
     const newNotifications = state.notifications.map(n => 
       n.id === id ? { ...n, is_read: true } : n
     );
     return {
       notifications: newNotifications,
       unreadCount: Math.max(0, state.unreadCount - 1)
     };
  }),

  markAllRead: () => set((state) => ({
     notifications: state.notifications.map(n => ({ ...n, is_read: true })),
     unreadCount: 0
  })),

  removeNotification: (id) => set((state) => {
    const notification = state.notifications.find((n) => n.id === id);
    return {
      notifications: state.notifications.filter((n) => n.id !== id),
      unreadCount: Math.max(0, state.unreadCount - (notification && !notification.is_read ? 1 : 0))
    };
  }),

  clearNotifications: () => set({ notifications: [], unreadCount: 0 })
}));
