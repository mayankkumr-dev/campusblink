/**
 * @file axios.js
 * @description Secure Axios client instance for React frontend with automatic HttpOnly cookie attachment.
 * Configured with withCredentials: true to mitigate XSS vulnerabilities by removing localStorage token dependency.
 */

import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// 1. Create configured Axios instance
const apiClient = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true, // CRITICAL: Tells browser to automatically attach HttpOnly, Secure, SameSite cookies to API requests
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 10000,
});

// 2. Request Interceptor: Supplementary headers and security tracing
apiClient.interceptors.request.use(
  (config) => {
    // Notice: Since JWT is issued inside an HttpOnly cookie, client-side JavaScript cannot and MUST NOT access it.
    // The browser automatically attaches the 'token' / 'access_token' cookie via withCredentials: true.
    return config;
  },
  (error) => Promise.reject(error)
);

// 3. Response Interceptor: Centralized error handling for expired cookies / 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('[SECURITY] HttpOnly authentication cookie missing, expired, or invalid. Dispatching unauthorized event.');
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

// Auth helper methods using the secure Axios instance
export const authApi = {
  login: async (email, password) => {
    // Upon response, browser stores the Set-Cookie HttpOnly header automatically
    return apiClient.post('/api/login', { email, password });
  },
  logout: async () => {
    // Requests backend to emit Set-Cookie with expired maxAge to clear HttpOnly cookies
    return apiClient.post('/api/logout');
  },
  getSession: async () => {
    // Browser attaches cookie automatically; backend verifies JWT from cookie
    return apiClient.get('/api/auth/session');
  },
  verifyToken: async () => {
    return apiClient.post('/api/auth/verify-token');
  }
};

export default apiClient;
