import axios from 'axios';
import { getToken, clearSession } from '@/Composables/useAuth';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? '',
    headers: {
        'Content-Type': 'application/json',
        'Accept':       'application/json',
    },
    withCredentials: true,
});

// Pasang Bearer token (Sanctum) di tiap request kalau sudah login.
api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// 401 → token kadaluarsa/invalid: bersihkan sesi & paksa ke halaman login.
api.interceptors.response.use(
    (res) => res,
    (error) => {
        if (error?.response?.status === 401) {
            clearSession();
            if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    },
);

export default api;
