import { defineStore } from 'pinia';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null,
        userData: null,
        isInitialized: false,
    }),
    actions: {
        init() {
            return new Promise((resolve) => {
                onAuthStateChanged(auth, async (user) => {
                    this.user = user;
                    if (user) {
                        // Subscribe to user document for balance updates
                        const unsub = onSnapshot(doc(db, 'users', user.email), (doc) => {
                            if (doc.exists()) {
                                this.userData = doc.data();
                            }
                        });
                    } else {
                        this.userData = null;
                    }
                    this.isInitialized = true;
                    resolve();
                });
            });
        },
        async logout() {
            await signOut(auth);
            this.user = null;
            this.userData = null;
        }
    }
});
