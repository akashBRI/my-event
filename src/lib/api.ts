// src/lib/api.ts
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || '/', // Use root path for Next.js API routes by default
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach the auth token from localStorage
axiosInstance.interceptors.request.use(
  (config) => {
    // Check if window is defined to ensure this runs only client-side or during SSR initial load
    // where localStorage might not be available.
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration/invalidity globally
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the error response status is 401 (Unauthorized) or 403 (Forbidden)
    // and it's not a login attempt itself, then the token might be invalid or expired.
    // Note: A more sophisticated approach might involve a global logout or redirect,
    // but for simplicity, we let individual components handle specific errors,
    // or the AuthProvider's `fetchUserProfile` will eventually catch an invalid token.
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.warn('API call failed with 401/403. Token might be invalid or expired. Consider global logout if needed.');
      // Example of how you might trigger a logout if you had a global event emitter or a static Auth utility
      // import { AuthUtil } from '@/lib/authUtil'; // hypothetical AuthUtil
      // AuthUtil.triggerLogout();
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
