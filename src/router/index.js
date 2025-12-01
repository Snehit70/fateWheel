import { createRouter, createWebHistory } from 'vue-router';
import RequestAccess from '../components/RequestAccess.vue';
import Login from '../components/Login.vue';
import Game from '../components/Game.vue';
import { useAuthStore } from '../stores/auth';

const routes = [
    { path: '/', component: Game },
    { path: '/login', component: Login },
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
        next('/login');
    } else {
        next();
    }
});

export default router;
