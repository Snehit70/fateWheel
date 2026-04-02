<template>
  <header class="h-14 glass border-b border-gold/10 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-50">
    <!-- Left: Logo & Brand -->
    <router-link to="/" class="flex items-center gap-3 group">
      <!-- Art Deco Logo Container -->
      <div class="relative">
        <div class="absolute inset-0 bg-gold/20 rounded blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <img
          src="/logo.svg"
          alt="Logo"
          class="h-9 w-9 relative z-10 transition-transform duration-500 group-hover:scale-110 drop-shadow-[0_0_8px_rgba(212,175,55,0.3)]"
        />
      </div>
      <!-- Brand Name with Art Deco styling -->
      <div class="hidden md:flex flex-col">
        <span class="text-xl font-display font-semibold tracking-[0.15em] text-shimmer leading-none">
          FATEWHEEL
        </span>
        <span class="text-[8px] font-display tracking-[0.4em] text-muted-foreground uppercase mt-0.5">Premium Gaming</span>
      </div>
    </router-link>

    <!-- Right: User / Auth -->
    <div class="flex items-center gap-3 sm:gap-4">
      <!-- Connection Status -->
      <div class="flex items-center gap-2">
        <div
          class="w-2 h-2 rounded-full transition-all duration-500"
          :class="gameStore.isConnected
            ? 'bg-emerald shadow-[0_0_8px_rgba(46,139,87,0.8)]'
            : 'bg-ruby shadow-[0_0_8px_rgba(155,17,30,0.8)] animate-pulse'"
          :title="gameStore.isConnected ? 'Connected' : 'Disconnected'"
        ></div>
        <span class="text-[10px] font-display tracking-wider uppercase hidden sm:block" :class="gameStore.isConnected ? 'text-emerald' : 'text-ruby'">
          {{ gameStore.isConnected ? 'Live' : 'Offline' }}
        </span>
      </div>

      <!-- Divider -->
      <div class="h-6 w-px bg-gradient-to-b from-transparent via-gold/20 to-transparent"></div>

      <!-- Sound Toggle -->
      <button
        @click="toggleMute"
        class="p-2 rounded transition-all duration-300 text-muted-foreground hover:text-gold hover:bg-gold/5 hidden sm:flex items-center justify-center"
        :title="isMuted ? 'Unmute' : 'Mute'"
      >
        <svg v-if="!isMuted" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
        </svg>
      </button>

      <template v-if="authStore.user">
        <!-- Admin Net Profit Display -->
        <div v-if="authStore.user.role === 'admin'" class="flex items-center gap-2 bg-surface/50 rounded px-3 py-1.5 border border-gold/10">
          <span class="text-[10px] font-display tracking-wider text-muted-foreground uppercase">Net Profit</span>
          <span
            class="font-display font-semibold text-sm tabular-nums"
            :class="netProfit >= 0 ? 'text-emerald' : 'text-ruby'"
          >
            {{ netProfit >= 0 ? '+' : '' }}{{ Math.floor(netProfit).toLocaleString() }}
          </span>
        </div>

        <!-- Balance Display (Non-admin) -->
        <div v-if="authStore.user.role !== 'admin'" class="flex items-center gap-2 bg-surface/50 rounded px-3 py-1.5 border border-gold/10 group hover:border-gold/30 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="font-display font-semibold text-sm text-cream tabular-nums tracking-wide">
            {{ Math.floor(authStore.user.balance).toLocaleString() }}
          </span>
        </div>

        <!-- History Button -->
        <button
          v-if="authStore.user.role !== 'admin'"
          @click="handleHistoryClick"
          class="flex items-center gap-2 px-3 py-1.5 rounded text-muted-foreground hover:text-gold hover:bg-gold/5 transition-all duration-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="hidden md:block text-xs font-display tracking-wider uppercase">History</span>
        </button>

        <!-- User Profile -->
        <button
          @click="handleProfileClick"
          class="flex items-center gap-2 p-1.5 rounded transition-all duration-300 border border-transparent hover:border-gold/20 hover:bg-gold/5"
          :class="{ 'cursor-pointer': authStore.user.role === 'admin' }"
        >
          <!-- Avatar -->
          <div class="w-8 h-8 rounded bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center border border-gold/30 shadow-[0_0_10px_rgba(212,175,55,0.1)]">
            <span class="text-xs font-display font-semibold text-gold">
              {{ authStore.user.username?.substring(0, 2).toUpperCase() || 'US' }}
            </span>
          </div>
          <span class="hidden lg:block text-sm font-display tracking-wide text-cream">
            {{ authStore.user.username }}
          </span>
          <!-- Admin badge -->
          <span v-if="authStore.user.role === 'admin'" class="hidden lg:block text-[9px] font-display tracking-widest uppercase px-1.5 py-0.5 rounded bg-gold/20 text-gold border border-gold/30">
            Admin
          </span>
        </button>

        <!-- Logout Button -->
        <button
          @click="handleLogout"
          class="p-2 rounded text-muted-foreground hover:text-ruby hover:bg-ruby/10 transition-all duration-300"
          title="Logout"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </template>

      <!-- Not logged in -->
      <template v-else>
        <button
          @click="authStore.openLoginModal()"
          class="btn-gold flex items-center gap-2 px-4 py-2 rounded text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
          <span class="font-display tracking-wider">Sign In</span>
        </button>
      </template>
    </div>
  </header>
</template>

<script setup>
import { useAuthStore } from '../stores/auth';
import { useGameStore } from '../stores/game';
import { useRouter } from 'vue-router';
import { useAudio } from '../composables/useAudio';
import { ref, onMounted, onUnmounted, watch } from 'vue';
import api from '../services/api';
import socket from '../services/socket';

const authStore = useAuthStore();
const gameStore = useGameStore();
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

<style scoped>
/* Shimmer text animation */
.text-shimmer {
  background: linear-gradient(
    90deg,
    #d4af37 0%,
    #f0d77a 25%,
    #d4af37 50%,
    #b8972f 75%,
    #d4af37 100%
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: goldShine 4s linear infinite;
}

@keyframes goldShine {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
</style>
