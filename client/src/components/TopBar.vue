<template>
  <header class="h-14 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
    <!-- Left: Logo & Brand -->
    <router-link to="/" class="flex items-center space-x-3 group">
      <img src="/logo.svg" alt="Probability Game Logo" class="h-10 w-10 transition-transform group-hover:scale-110 duration-300 drop-shadow-[0_0_10px_rgba(255,62,62,0.5)]" />
      <span class="hidden md:block text-2xl font-black tracking-widest text-foreground font-outfit group-hover:text-primary transition-colors duration-300">
        PROBABILITY
      </span>
    </router-link>

    <!-- Right: User / Auth -->
    <div class="flex items-center space-x-4">
        <!-- Sound Toggle -->
        <Button
            variant="ghost"
            size="icon"
            @click="toggleMute"
            class="text-muted-foreground hover:text-foreground hidden sm:flex"
            :title="isMuted ? 'Unmute' : 'Mute'"
        >
            <svg v-if="!isMuted" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
        </Button>

      <template v-if="authStore.user">
        <!-- Admin Net Profit Display -->
        <div v-if="authStore.user.role === 'admin'" class="flex items-center bg-secondary/50 rounded-lg px-2 md:px-4 py-1.5 md:py-2 border border-border">
            <span class="text-xs md:text-sm font-medium mr-2 text-muted-foreground">Net Profit:</span>
            <span class="font-outfit font-bold text-sm md:text-base" :class="netProfit >= 0 ? 'text-green-500' : 'text-red-500'">
                {{ netProfit >= 0 ? '+' : '' }}{{ Math.floor(netProfit) }}
            </span>
        </div>

        <!-- Balance Display -->
        <div v-if="authStore.user.role !== 'admin'" class="flex items-center bg-secondary/50 rounded-lg px-2 md:px-4 py-1.5 md:py-2 border border-border">
            <span class="text-green-500 font-medium mr-1 md:mr-2 font-outfit text-sm md:text-base"></span>
            <span class="text-foreground font-outfit font-medium tracking-wide text-sm md:text-base">{{ Math.floor(authStore.user.balance) }}</span>
        </div>





        <!-- History Button -->
        <Button
            v-if="authStore.user.role !== 'admin'"
            variant="ghost"
            @click="handleHistoryClick"
            class="flex items-center space-x-2 text-muted-foreground hover:text-foreground px-2 md:px-4"
        >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 md:h-4 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="hidden md:inline">HISTORY</span>
        </Button>

        <!-- User Profile -->
        <div 
            @click="handleProfileClick"
            class="flex items-center space-x-3 cursor-pointer hover:bg-secondary/50 p-1 md:p-2 rounded-lg transition-colors border border-transparent hover:border-border"
            :class="{ 'hover:bg-primary/10': authStore.user.role === 'admin' }"
        >
            <div class="w-8 h-8 rounded bg-secondary flex items-center justify-center text-xs font-medium text-foreground border border-border">
                {{ authStore.user.username?.substring(0, 2).toUpperCase() || 'US' }}
            </div>
            <span class="hidden lg:block text-sm font-medium text-foreground font-outfit">{{ authStore.user.username }}</span>
        </div>

        <!-- Logout Button -->
        <Button
            variant="ghost"
            size="icon"
            @click="handleLogout"
            class="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="Logout"
        >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
        </Button>

      </template>

      <template v-else>
        <Button @click="authStore.openLoginModal()" class="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
            <span>LOG IN</span>
        </Button>
      </template>
    </div>

  </header>
</template>

<script setup>
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { useAudio } from '../composables/useAudio';
import { ref, onMounted, onUnmounted, watch } from 'vue';
import api from '../services/api';
import socket from '../services/socket';

const authStore = useAuthStore();
const router = useRouter();
const { toggleMute, isMuted } = useAudio();
const netProfit = ref(0);

const fetchStats = async () => {
    if (authStore.user?.role !== 'admin') return;
    try {
        const res = await api.get('/admin/stats');
        netProfit.value = res.data.netProfit;
    } catch (err) {
        console.error(err);
    }
};

onMounted(() => {
    if (authStore.user?.role === 'admin') {
        fetchStats();
    }
    
    socket.on('admin:statsUpdate', fetchStats);
});

watch(() => authStore.user, (newUser) => {
    if (newUser?.role === 'admin') {
        fetchStats();
    }
});

onUnmounted(() => {
    socket.off('admin:statsUpdate', fetchStats);
});

const handleLogout = () => {
    authStore.logout();
    router.push('/');
};

const handleProfileClick = () => {
    if (authStore.user?.role === 'admin') {
        router.push('/admin');
    }
};

const handleHistoryClick = () => {
    router.push('/history');
};
</script>
