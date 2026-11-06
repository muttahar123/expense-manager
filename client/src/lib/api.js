import axios from 'axios';
import { supabase } from './supabase.js';

// Vite proxies /api → http://localhost:5000 in dev (see vite.config.js);
// on Vercel /api is same-origin (the serverless function).
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach the signed-in user's Supabase access token to every request so the
// backend can verify who they are and enforce per-user data isolation.
api.interceptors.request.use(async (config) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

export const createTransaction = (data) => api.post('/transactions', data).then((r) => r.data);
export const listTransactions = (params) => api.get('/transactions', { params }).then((r) => r.data);
export const deleteTransaction = (id) => api.delete(`/transactions/${id}`).then((r) => r.data);

export const createInvestment = (data) => api.post('/investments', data).then((r) => r.data);
export const listInvestments = () => api.get('/investments').then((r) => r.data);
export const updateInvestment = (id, data) => api.patch(`/investments/${id}`, data).then((r) => r.data);

export const getInsights = (params) => api.get('/insights', { params }).then((r) => r.data);

export const getMe = () => api.get('/me').then((r) => r.data);
export const updateMe = (data) => api.patch('/me', data).then((r) => r.data);

export default api;
