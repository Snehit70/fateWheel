import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

// All routes use lazy loading for consistent code splitting
const routes = [
    {
        path: '/',
        name: 'Game',
        component: () => import('../views/Game.vue')
    },
    {
        path: '/history',
        name: 'History',
        component: () => import('../views/History.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/admin',
        name: 'Admin',
        component: () => import('../views/Admin.vue'),
        meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
        path: '/admin/logs',
        name: 'AdminLogs',
        component: () => import('../views/AdminLogs.vue'),
        meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
        path: '/admin/rounds',
        name: 'AdminRounds',
        component: () => import('../views/AdminRounds.vue'),
        meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
        path: '/admin/history',
        name: 'AdminHistory',
        component: () => import('../views/AdminHistory.vue'),
        meta: { requiresAuth: true, requiresAdmin: true }
    },
    // 404 Catch-all route - must be last
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: () => import('../views/NotFound.vue')
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

// Page title mapping
const pageTitles = {
    'Game': 'Roulette Game',
    'History': 'Bet History | Roulette',
    'Admin': 'Admin Panel | Roulette',
    'AdminLogs': 'Admin Logs | Roulette',
    'AdminRounds': 'Admin Rounds | Roulette',
    'AdminHistory': 'Admin Withdrawal History | Roulette',
    'NotFound': 'Page Not Found | Roulette',
};

router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore();

    // Ensure auth state is initialized with error handling
    if (!authStore.isInitialized) {
        try {
            await authStore.init();
        } catch (error) {
            console.error('Failed to initialize auth:', error);
            // Continue without auth - user can try again via login modal
        }
    }

    // 1. Admin Route Protection (Strict)
    if (to.meta.requiresAdmin) {
        if (!authStore.user || authStore.user.role !== 'admin') {
            next({ name: 'Game' }); // Redirect unauthorized users to home
            return;
        }
    }

    // 2. Auth Requirement
    if (to.meta.requiresAuth) {
        if (!authStore.user) {
            // Redirect to home and show login modal
            next({ name: 'Game' });
            authStore.openLoginModal();
            return;
        }
    }

    next();
});

// Update page title after navigation
router.afterEach((to) => {
    const title = pageTitles[to.name] || 'Roulette';
    document.title = title;
});

export default router;
