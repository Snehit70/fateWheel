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
            this.handleSession(session);

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

                try {
                    // Sync with backend and get user details (balance, etc.)
                    const response = await api.get('/auth/me');
                    this.user = response.data;

                    // Socket events
                    socket.on('balanceUpdate', (payload) => {
                        if (this.user) {
                            this.user.balance = payload.balance;
                        }
                    });

                    // Re-fetch on socket reconnect
                    socket.on('connect', async () => {
                        if (this.session?.access_token) {
                            const res = await api.get('/auth/me');
                            this.user = res.data;
                        }
                    });

                } catch (err) {
                    console.error("Failed to sync user with backend:", err);
                    // If backend sync fails (e.g. user deleted on backend), should we logout?
                    // For now, keep session but user data might be incomplete.
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
