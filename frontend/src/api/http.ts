import axios from 'axios';

export const http = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('cw_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/encuesta')) {
      localStorage.removeItem('cw_token');
      localStorage.removeItem('cw_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export function apiErrorMsg(err: any, fallback = 'Ocurrió un error al procesar la solicitud.'): string {
  const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  return typeof msg === 'string' && msg ? msg : fallback;
}
