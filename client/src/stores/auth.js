import { defineStore } from 'pinia';
import api from '../services/api';
import socket from '../services/socket';
// Supabase client import
import { supabase } from '@/lib/supabase';

// Helper to proxy username to email with validation
const toEmail = (username) => {
    const sanitized = username.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (sanitized.length < 3) {
        throw new Error('Username must contain at least 3 alphanumeric characters');
    }
    return `${sanitized}@roulette.game`;
};

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null,
        session: null,
        isInitialized: false,
        isLoginModalOpen: false,
        pendingStatus: null, // 'pending' | 'rejected' | null
        // Private state (reactive)
        _syncInProgress: false,
        _listenersSetup: false,
        _authSubscription: null,
        _syncController: null,
    }),

    getters: {
        isAuthenticated: (state) => !!state.user && !!state.session,
        isAdmin: (state) => state.user?.role === 'admin',
        currentBalance: (state) => state.user?.balance ?? 0,
        isPending: (state) => state.pendingStatus === 'pending',
        isRejected: (state) => state.pendingStatus === 'rejected',
    },

    actions: {
        async init() {
            try {
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
                    await this.handleSession(refreshData.session);
                } else {
                    await this.handleSession(null);
                }

                // Listen for auth changes and store subscription for cleanup
                const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                    this.handleSession(session);
                });
                this._authSubscription = subscription;

            } catch (error) {
                console.error("Failed to initialize auth:", error);
                // Still mark as initialized to prevent app from hanging
            } finally {
                this.isInitialized = true;
            }
        },

        async handleSession(session) {
            this.session = session;

            if (session?.access_token) {
                api.defaults.headers.common['x-auth-token'] = session.access_token;
                socket.setToken(session.access_token);

                // Cancel previous sync request if still in progress
                if (this._syncController) {
                    this._syncController.abort();
                }
                this._syncController = new AbortController();

                this._syncInProgress = true;

                try {
                    // Sync with backend and get user details (balance, etc.)
                    const response = await api.get('/auth/me', {
                        signal: this._syncController.signal
                    });
                    this.user = response.data;

                    // Setup socket listeners only once
                    if (!this._listenersSetup) {
                        this._listenersSetup = true;

                        socket.on('balanceUpdate', (payload) => {
                            if (this.user) {
                                this.user.balance = payload.balance;
                            }
                        });

                        socket.on('statusUpdate', (payload) => {
                            if (this.user) {
                                this.user.status = payload.status;
                            }
                        });
                    }

                } catch (err) {
                    // Ignore aborted requests (expected when a new session comes in quickly)
                    if (err.name === 'AbortError' || err.name === 'CanceledError') {
                        return;
                    }

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

                    // If 403, user is pending or rejected
                    if (err.response?.status === 403) {
                        const status = err.response?.data?.status;
                        console.warn("User not approved:", status);
                        this.user = null;
                        this.session = null;
                        this.pendingStatus = status; // Store for UI to display
                        delete api.defaults.headers.common['x-auth-token'];
                        socket.setToken(null);
                        // Sign out from Supabase
                        await supabase.auth.signOut();
                        return;
                    }
                } finally {
                    this._syncInProgress = false;
                    this._syncController = null;
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

            // Sync with backend to check status immediately
            if (data.session) {
                await this.handleSession(data.session);

                // If the backend rejected us (403), pendingStatus will be set and user will be null
                if (this.pendingStatus) {
                    const status = this.pendingStatus === 'rejected' ? 'Rejected' : 'Pending Approval';
                    throw `Account ${status}. Please contact admin.`;
                }
            }

            return data;
        },

        async register(username, password) {
            // Client-side validation
            if (password.length < 6) {
                throw "Password must be at least 6 characters";
            }

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

            if (error) {
                // Friendly error messages
                if (error.message.includes('already registered')) {
                    throw "Username already taken";
                }
                if (error.message.includes('password')) {
                    throw "Password must be at least 6 characters";
                }
                throw error.message;
            }
            return data;
        },

        async logout() {
            // Remove socket listener before logout
            socket.off('balanceUpdate');
            socket.off('statusUpdate');
            this._listenersSetup = false;

            // Clear pending status
            this.pendingStatus = null;

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
        },

        // Cleanup method for when the app unmounts
        cleanup() {
            // Unsubscribe from auth state changes
            if (this._authSubscription) {
                this._authSubscription.unsubscribe();
                this._authSubscription = null;
            }

            // Remove socket listeners
            socket.off('balanceUpdate');
            socket.off('statusUpdate');
            this._listenersSetup = false;

            // Cancel any pending sync
            if (this._syncController) {
                this._syncController.abort();
                this._syncController = null;
            }
        }
    }
});
