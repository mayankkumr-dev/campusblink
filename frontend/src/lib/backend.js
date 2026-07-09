/**
 * Backend API Client
 * Centralized API client for communicating with the Campus Blink backend
 * Automatically handles JWT token injection and error handling
 */

import { useAuthStore } from '../store/authStore';
import apiClient from './axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

class BackendAPI {
  async request(endpoint, options = {}) {
    const authStore = useAuthStore();
    const session = authStore.session;

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add JWT token if available
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        credentials: 'include', // CRITICAL: Ensure browser attaches secure HttpOnly cookies
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw {
          status: response.status,
          message: data.error || 'An error occurred',
          data,
        };
      }

      return data;
    } catch (error) {
      if (error.status) {
        throw error;
      }
      throw {
        status: 500,
        message: error.message || 'Network error',
        data: null,
      };
    }
  }

  // Auth endpoints
  auth = {
    verifyToken: async () => {
      return this.request('/api/auth/verify-token', { method: 'POST' });
    },

    completeProfile: async (profileData) => {
      return this.request('/api/auth/complete-profile', {
        method: 'POST',
        body: JSON.stringify(profileData),
      });
    },

    getSession: async () => {
      return this.request('/api/auth/session', { method: 'GET' });
    },
  };

  // Payment endpoints (Cashfree integrations have been removed)
  payments = {
    createOrder: async (orderId, amount, orderType) => {
      // return this.request('/api/payments/create-order', {
      //   method: 'POST',
      //   body: JSON.stringify({ orderId, amount, orderType }),
      // });
      console.warn('Payment API removed');
      return { data: { payment_session_id: 'mock_session' } };
    },

    verifyPayment: async (cashfreeOrderId) => {
      // return this.request('/api/payments/verify', {
      //   method: 'POST',
      //   body: JSON.stringify({ cashfreeOrderId }),
      // });
      console.warn('Payment verification API removed');
      return { data: { status: 'mock_success' } };
    },

    professorPayLater: async (orderId, amount, orderType) => {
      // return this.request('/api/payments/professor/pay-later', {
      //   method: 'POST',
      //   body: JSON.stringify({ orderId, amount, orderType }),
      // });
      console.warn('Pay-later API removed');
      return { data: { status: 'mock_success' } };
    },

    professorPayPending: async (paymentIds) => {
      // return this.request('/api/payments/professor/pay-pending', {
      //   method: 'POST',
      //   body: JSON.stringify({ paymentIds }),
      // });
      console.warn('Pay-pending API removed');
      return { data: { status: 'mock_success' } };
    },

    getProfessorPending: async () => {
      // return this.request('/api/payments/professor/pending', { method: 'GET' });
      console.warn('Pending dues API removed');
      return { data: { pendingAmount: 0, pendingPayments: [] } };
    },
  };

  // Email endpoints
  email = {
    send: async (to, subject, html) => {
      return this.request('/api/email/send', {
        method: 'POST',
        body: JSON.stringify({ to, subject, html }),
      });
    },

    approveProfessor: async (professorId) => {
      return this.request('/api/email/professor/approve', {
        method: 'POST',
        body: JSON.stringify({ professorId }),
      });
    },

    rejectProfessor: async (professorId, reason) => {
      return this.request('/api/email/professor/reject', {
        method: 'POST',
        body: JSON.stringify({ professorId, reason }),
      });
    },

    resendVerification: async () => {
      return this.request('/api/email/verification', { method: 'POST' });
    },
  };

  // Admin endpoints
  admin = {
    getStats: async () => {
      return this.request('/api/admin/stats', { method: 'GET' });
    },

    getUsers: async (filters = {}) => {
      const params = new URLSearchParams(filters);
      return this.request(`/api/admin/users?${params}`, { method: 'GET' });
    },

    updateUser: async (userId, updates) => {
      return this.request(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    },

    deleteUser: async (userId) => {
      return this.request(`/api/admin/users/${userId}`, { method: 'DELETE' });
    },

    getPendingProfessors: async () => {
      return this.request('/api/admin/professors/pending', { method: 'GET' });
    },

    approveProfessor: async (professorId) => {
      return this.request(`/api/admin/professors/${professorId}/approve`, {
        method: 'POST',
      });
    },

    rejectProfessor: async (professorId, reason) => {
      return this.request(`/api/admin/professors/${professorId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },

    getAuditLog: async (limit = 100, offset = 0) => {
      return this.request(`/api/admin/audit-log?limit=${limit}&offset=${offset}`, {
        method: 'GET',
      });
    },

    updateFeatureAccess: async (userId, feature, enabled) => {
      return this.request('/api/admin/feature-access', {
        method: 'POST',
        body: JSON.stringify({ userId, feature, enabled }),
      });
    },
  };

  // Professor endpoints
  professor = {
    getHomeStats: async () => {
      return this.request('/api/professor/home-stats', { method: 'GET' });
    },

    getOrders: async (filters = {}) => {
      const params = new URLSearchParams(filters);
      return this.request(`/api/professor/orders?${params}`, { method: 'GET' });
    },
  };

  // Canteen endpoints
  canteen = {
    placeOrder: async (orderData) => {
      return this.request('/api/canteen/orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
      });
    },

    updateOrderStatus: async (orderId, status) => {
      return this.request(`/api/canteen/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },

    getShopOrders: async (shopId, filters = {}) => {
      const params = new URLSearchParams(filters);
      return this.request(`/api/canteen/orders/shop/${shopId}?${params}`, {
        method: 'GET',
      });
    },
  };

  // Print endpoints
  print = {
    placeOrder: async (orderData) => {
      return this.request('/api/print/orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
      });
    },

    updateOrderStatus: async (orderId, status) => {
      return this.request(`/api/print/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },

    getShopOrders: async (shopId, filters = {}) => {
      const params = new URLSearchParams(filters);
      return this.request(`/api/print/orders/shop/${shopId}?${params}`, {
        method: 'GET',
      });
    },
  };

  // Upload endpoints
  uploads = {
    uploadImage: async (file, folder = 'uploads') => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const authStore = useAuthStore();
      const session = authStore.session;

      const headers = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${API_URL}/api/uploads/image`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw {
          status: response.status,
          message: data.error || 'Upload failed',
          data,
        };
      }

      return data;
    },

    uploadPDF: async (file, folder = 'documents') => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const authStore = useAuthStore();
      const session = authStore.session;

      const headers = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${API_URL}/api/uploads/pdf`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw {
          status: response.status,
          message: data.error || 'Upload failed',
          data,
        };
      }

      return data;
    },

    deleteFile: async (publicId) => {
      return this.request('/api/uploads/file', {
        method: 'DELETE',
        body: JSON.stringify({ publicId }),
      });
    },
  };
}

export { apiClient };
export default new BackendAPI();
