// src/api/apiClient.js
//
// Single axios instance for all API calls.
// All requests go to the API Gateway (port 3000).
// The JWT token is automatically attached to every request
// via an axios interceptor.

import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api', // proxied to http://localhost:3000/api via vite.config.js
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach JWT token to every request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('vjcloudbank_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear storage and redirect to login
      localStorage.removeItem('vjcloudbank_token');
      localStorage.removeItem('vjcloudbank_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth API ──────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => apiClient.post('/users/register', data),
  login:    (data) => apiClient.post('/users/login', data),
  profile:  ()     => apiClient.get('/users/profile'),
};

// ── Accounts API ──────────────────────────────────────────────────
export const accountsAPI = {
  list:      ()     => apiClient.get('/accounts'),
  get:       (id)   => apiClient.get(`/accounts/${id}`),
  getBalance:(id)   => apiClient.get(`/accounts/${id}/balance`),
  create:    (data) => apiClient.post('/accounts', data),
  close:     (id)   => apiClient.patch(`/accounts/${id}/close`),
};

// ── Transactions API ──────────────────────────────────────────────
export const transactionsAPI = {
  deposit:  (data)          => apiClient.post('/transactions/deposit', data),
  withdraw: (data)          => apiClient.post('/transactions/withdraw', data),
  transfer: (data)          => apiClient.post('/transactions/transfer', data),
  history:  (accountId, page = 0, size = 20) =>
    apiClient.get(`/transactions/history/${accountId}?page=${page}&size=${size}`),
};

export default apiClient;
