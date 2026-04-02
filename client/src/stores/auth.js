import { defineStore } from 'pinia';
import api from '../services/api';
import socket from '../services/socket';
import router from '../router';

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null,
        token: localStorage.getItem('token') || null,
        isInitialized: false,
        isLoginModalOpen: false,
        _reconnectHandler: null,
    }),
    getters: {
        userId(state) {
            if (!state.user) return null;
            return state.user._id || state.user.id || null;
        },
    },
    actions: {
        _setupSocketListeners() {
            socket.off('balanceUpdate');
            socket.off('userUpdate');

            socket.on('balanceUpdate', (payload) => {
                if (this.user) {
                    this.user.balance = payload.balance;
                }
            });

            socket.on('userUpdate', (updatedUser) => {
                if (this.user && this.userId === (updatedUser._id || updatedUser.id)) {
                    Object.assign(this.user, updatedUser);
                }
            });
        },
        async init() {
            if (this.token) {
                api.defaults.headers.common['x-auth-token'] = this.token;
                try {
                    const response = await api.get('/auth/me');
                    this.user = response.data;
                    this.isInitialized = true;

                    socket.setToken(this.token);
                    this._setupSocketListeners();

                    // Remove old reconnect handler before adding a new one
                    if (this._reconnectHandler) {
                        socket.off('connect', this._reconnectHandler);
                    }
                    this._reconnectHandler = async () => {
                        if (this.token) {
                            try {
                                const res = await api.get('/auth/me');
                                this.user = res.data;
                            } catch (err) {
                                console.error('Failed to refresh user on reconnect:', err);
                            }
                        }
                    };
                    socket.on('connect', this._reconnectHandler);
                } catch (err) {
                    console.error('Failed to fetch user:', err);
                    this.logout();
                    this.isInitialized = true;
                    router.push('/');
                }
            } else {
                this.isInitialized = true;
            }
        },
        cleanup() {
            socket.off('balanceUpdate');
            socket.off('userUpdate');
            if (this._reconnectHandler) {
                socket.off('connect', this._reconnectHandler);
                this._reconnectHandler = null;
            }
        },
        async login(username, password) {
            try {
                const response = await api.post('/auth/login', { username, password });
                await this.setAuth(response.data);
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
        async setAuth(data) {
            this.token = data.token;
            this.user = data.user;
            localStorage.setItem('token', data.token);
            api.defaults.headers.common['x-auth-token'] = data.token;
            await socket.setToken(data.token);
            this._setupSocketListeners();
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
