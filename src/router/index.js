import { createRouter, createWebHistory } from 'vue-router';
import Game from '../components/Game.vue';
import { useAuthStore } from '../stores/auth';

const routes = [
    { path: '/', component: Game },
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

    if (to.meta.requiresAuth && !authStore.user) {
        // next('/login'); // Login route removed, maybe trigger modal?
        // For now, just allow or redirect to home if critical, but since LoginModal is in App.vue, 
        // we might just want to let them be or show modal.
        // But router guard expects a next().
        // If we redirect to '/', we might loop if '/' requires auth (it doesn't).
        next('/');
        // Ideally we should trigger the login modal here.
        authStore.openLoginModal();
    } else if (to.meta.requiresAdmin && authStore.user?.role !== 'admin') {
        next('/');
    } else {
        next();
    }
});

export default router;
