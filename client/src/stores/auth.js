import { defineStore } from 'pinia';
import api from '../services/api';
import socket from '../services/socket';
// Supabase client import
import { supabase } from '@/lib/supabase';

// Helper to proxy username to email
const toEmail = (username) => `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@roulette.game`;

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null,
        session: null,
        isInitialized: false,
        isLoginModalOpen: false,
    }),
    actions: {
        async init() {
            // Get initial session
            const { data: { session } } = await supabase.auth.getSession();

            // If we have a session, try to refresh it to ensure token is valid
            if (session) {
                const { data: refreshData, error } = await supabase.auth.refreshSession();
                if (error || !refreshData.session) {
                    // Token is truly invalid, clear it
                    console.warn("Session expired, clearing...");
                    await supabase.auth.signOut();
                    this.isInitialized = true;
                    return;
                }
                // Use the refreshed session
                this.handleSession(refreshData.session);
            } else {
                this.handleSession(null);
            }

            // Listen for auth changes
            supabase.auth.onAuthStateChange((_event, session) => {
                this.handleSession(session);
            });

            this.isInitialized = true;
        },
        async handleSession(session) {
            this.session = session;

            if (session?.access_token) {
                api.defaults.headers.common['x-auth-token'] = session.access_token;
                socket.setToken(session.access_token);

                // Skip sync if already in progress (debounce)
                if (this._syncInProgress) {
                    return;
                }
                this._syncInProgress = true;

                try {
                    // Sync with backend and get user details (balance, etc.)
                    const response = await api.get('/auth/me');
                    this.user = response.data;

                    // Setup socket listeners only once
                    if (!this._listenersSetup) {
                        this._listenersSetup = true;

                        socket.on('balanceUpdate', (payload) => {
                            if (this.user) {
                                this.user.balance = payload.balance;
                            }
                        });
                    }

                } catch (err) {
                    console.error("Failed to sync user with backend:", err);

                    // If 401, token is invalid - logout user gracefully
                    if (err.response?.status === 401) {
                        console.warn("Auth token invalid, logging out...");
                        this.user = null;
                        this.session = null;
                        delete api.defaults.headers.common['x-auth-token'];
                        socket.setToken(null);
                        // Sign out from Supabase to clear session
                        await supabase.auth.signOut();
                        this.openLoginModal();
                        return;
                    }
                } finally {
                    this._syncInProgress = false;
                }
            } else {
                this.user = null;
                delete api.defaults.headers.common['x-auth-token'];
                socket.setToken(null);
            }
        },
        async login(username, password) {
            const email = toEmail(username);
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) {
                if (error.message.includes('Invalid login credentials')) {
                    throw "Invalid username or password";
                }
                throw error.message;
            }
            return data;
        },
        async register(username, password) {
            const email = toEmail(username);
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username: username // Store original username in metadata
                    }
                }
            });
            if (error) throw error.message;
            return data;
        },
        async logout() {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            // handleSession(null) will be triggered by onAuthStateChange
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
