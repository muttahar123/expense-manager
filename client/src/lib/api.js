import axios from 'axios';

// Vite proxies /api → http://localhost:5000 in dev (see vite.config.js).
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
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
