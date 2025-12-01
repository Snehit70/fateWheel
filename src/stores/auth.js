import { defineStore } from 'pinia';
import api from '../services/api';

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null,
        token: localStorage.getItem('token') || null,
        isInitialized: false,
    }),
    actions: {
        async init() {
            if (this.token) {
                // Ideally verify token with backend here
                // For now, we assume it's valid or handle 401 in api interceptor
                this.isInitialized = true;
            } else {
                this.isInitialized = true;
            }
        },
        async login(email, password) {
            try {
                const res = await api.post('/auth/login', { email, password });
                this.setAuth(res.data);
            } catch (err) {
                throw err.response?.data?.message || 'Login failed';
            }
        },
        async register(email, password) {
            try {
                const res = await api.post('/auth/register', { email, password });
                this.setAuth(res.data);
            } catch (err) {
                throw err.response?.data?.message || 'Registration failed';
            }
        },
        setAuth(data) {
            this.token = data.token;
            this.user = data.user;
            localStorage.setItem('token', data.token);
        },
        logout() {
            this.token = null;
            this.user = null;
            localStorage.removeItem('token');
        },
        updateBalance(newBalance) {
            if (this.user) {
                this.user.balance = newBalance;
            }
        }
    }
});
