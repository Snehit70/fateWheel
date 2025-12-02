import { createRouter, createWebHistory } from 'vue-router';
import Game from '../components/Game.vue';
import History from '../components/History.vue';
import { useAuthStore } from '../stores/auth';

const routes = [
    { path: '/', component: Game },
    { path: '/history', component: History, meta: { requiresAuth: true } },
    { path: '/admin', component: () => import('../components/AdminPanel.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore();

    // Ensure auth state is initialized
    if (!authStore.isInitialized) {
        await authStore.init();
    }

    // 1. Admin Route Protection (Strict)
    if (to.meta.requiresAdmin) {
        if (!authStore.user || authStore.user.role !== 'admin') {
            next('/'); // Redirect unauthorized users to home
            return;
        }
    }

    // 2. Auth Requirement (Game Page)
    if (to.meta.requiresAuth) {
        if (!authStore.user) {
            // Allow navigation to home so background loads, but open modal
            if (to.path === '/') {
                next();
                // We need to wait a tick or ensure store is ready, but calling action is fine
                authStore.openLoginModal();
                return;
            } else {
                // For other protected routes (if any), redirect to home
                next('/');
                authStore.openLoginModal();
                return;
            }
        }
    }

    next();
});

export default router;
