import { defineStore } from 'pinia';
import api from '../services/api';
import socket from '../services/socket';

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null,
        token: localStorage.getItem('token') || null,
        isInitialized: false,
        isLoginModalOpen: false,
    }),
    actions: {
        async init() {
            if (this.token) {
                api.defaults.headers.common['x-auth-token'] = this.token;
                try {
                    const response = await api.get('/auth/me');
                    this.user = response.data;
                    this.isInitialized = true;
                } catch (err) {
                    console.error("Failed to fetch user:", err);
                    this.logout();
                    this.isInitialized = true;
                }
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
        this.token = data.token;
        this.user = data.user;
        localStorage.setItem('token', data.token);
        api.defaults.headers.common['x-auth-token'] = data.token;
        socket.setToken(data.token);
    },
    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('token');
        delete api.defaults.headers.common['x-auth-token'];
        socket.setToken(null);
    },
    updateBalance(newBalance) {
        if (this.user) {
            this.user.balance = newBalance;
        }
    },
    openLoginModal() {
        this.isLoginModalOpen = true;
    },
    closeLoginModal() {
        this.isLoginModalOpen = false;
    }
}
});
