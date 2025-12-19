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

                    // Initialize socket with token
                    socket.setToken(this.token);

                    // Listen for balance updates
                    socket.on('balanceUpdate', (payload) => {
                        if (this.user) {
                            this.user.balance = payload.balance;
                        }
                    });

                    // Listen for user profile updates (status, role, etc)
                    socket.on('userUpdate', (updatedUser) => {
                        if (this.user && this.user.id === updatedUser.id) {
                            // Merge updates
                            Object.assign(this.user, updatedUser);
                        } else if (this.user && this.user._id === updatedUser._id) {
                            // Fallback if id vs _id mismatch
                            Object.assign(this.user, updatedUser);
                        }
                    });

                    // Refresh user data on reconnection (fixes sync issues after server restart)
                    socket.on('connect', async () => {
                        if (this.token) {
                            try {
                                const res = await api.get('/auth/me');
                                this.user = res.data;
                            } catch (err) {
                                console.error("Failed to refresh user on reconnect:", err);
                            }
                        }
                    });
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
                // Server returned an error response with a message
                if (err.response?.data?.message) {
                    throw err.response.data.message;
                }

                // Network error - request never reached the server
                if (err.code === 'ERR_NETWORK' || !err.response) {
                    throw 'Network error - please check your internet connection and try again';
                }

                // Request timed out
                if (err.code === 'ECONNABORTED') {
                    throw 'Request timed out - please try again';
                }

                // Server error (5xx)
                if (err.response?.status >= 500) {
                    throw 'Server error - please try again later';
                }

                // Fallback for any other error
                throw 'Unable to login - please try again';
            }
        },
        async register(username, password) {
            try {
                const res = await api.post('/auth/register', { username, password });
                return res.data;
            } catch (err) {
                throw err;
            }
        },
        setAuth(data) {
            this.token = data.token;
            this.user = data.user;
            localStorage.setItem('token', data.token);
            api.defaults.headers.common['x-auth-token'] = data.token;
            socket.setToken(data.token);

            // Listen for balance updates
            socket.on('balanceUpdate', (payload) => {
                if (this.user) {
                    this.user.balance = payload.balance;
                }
            });

            // Listen for user profile updates
            socket.on('userUpdate', (updatedUser) => {
                if (this.user && (this.user.id === updatedUser.id || this.user._id === updatedUser._id)) {
                    Object.assign(this.user, updatedUser);
                }
            });
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
