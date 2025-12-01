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
                this.isInitialized = true;
                api.defaults.headers.common['x-auth-token'] = this.token;
            } else {
                this.isInitialized = true;
            }
        },
        async login(username, password) {
            try {
                const response = await api.post('/auth/login', { username, password });
                this.setAuth(response.data);
            } catch (err) {
                throw err.response?.data?.message || 'Login failed';
            }
        },
        async register(username, password) {
            try {
                const response = await api.post('/auth/register', { username, password });
                this.setAuth(response.data);
            } catch (err) {
                throw err.response?.data?.message || 'Registration failed';
            }
        },
        setAuth(data) {
            this.token = data.token;
            this.user = data.user;
            localStorage.setItem('token', data.token);
            api.defaults.headers.common['x-auth-token'] = data.token;
        },
        logout() {
            this.token = null;
            this.user = null;
            localStorage.removeItem('token');
            delete api.defaults.headers.common['x-auth-token'];
        },
        updateBalance(newBalance) {
            if (this.user) {
                this.user.balance = newBalance;
            }
        }
    }
});
