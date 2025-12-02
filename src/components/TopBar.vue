<template>
  <header class="h-20 bg-[#0f0f13] border-b border-[#2a2a2a] flex items-center justify-between px-6 lg:px-10 sticky top-0 z-30">
    <!-- Left: Logo & Brand -->
    <router-link to="/" class="flex items-center space-x-3 group">
      <img src="@/assets/logo.svg" alt="Roulette Logo" class="h-10 w-10 transition-transform group-hover:scale-110 duration-300" />
      <span class="text-2xl font-bold tracking-widest text-white font-mono group-hover:text-green-500 transition-colors duration-300">
        ROULETTE
      </span>
    </router-link>

    <!-- Right: User / Auth -->
    <div class="flex items-center space-x-4">
      <template v-if="authStore.user">
        <!-- Balance Display -->
        <div v-if="authStore.user.role !== 'admin'" class="hidden md:flex items-center bg-[#1a1a1a] rounded-lg px-4 py-2 border border-[#2a2a2a]">
            <span class="text-green-500 font-bold mr-2">₹</span>
            <span class="text-white font-mono font-bold">{{ authStore.user.balance.toFixed(2) }}</span>
            <button class="ml-3 bg-blue-600 hover:bg-blue-500 text-white text-xs px-2 py-1 rounded transition-colors">
                Wallet
            </button>
        </div>

        <!-- History Button -->
        <router-link to="/history" class="hidden md:flex items-center space-x-2 px-3 py-2 bg-[#1a1a1a] hover:bg-[#252525] rounded-lg border border-[#2a2a2a] transition-colors text-sm font-bold text-gray-300 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>HISTORY</span>
        </router-link>

        <!-- User Profile -->
        <div class="flex items-center space-x-3 cursor-pointer hover:bg-[#1a1a1a] p-2 rounded-lg transition-colors">
            <div class="w-8 h-8 rounded bg-gray-700 flex items-center justify-center text-xs font-bold text-white">
                {{ authStore.user.username?.substring(0, 2).toUpperCase() || 'US' }}
            </div>
            <span class="hidden md:block text-sm font-medium text-white">{{ authStore.user.username }}</span>
        </div>

        <!-- Logout Button -->
        <button 
            @click="handleLogout" 
            class="p-2 text-gray-400 hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-colors"
            title="Logout"
        >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
        </button>
        
      </template>

      <template v-else>
        <button @click="authStore.openLoginModal()" class="btn-primary flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
            <span>LOG IN</span>
        </button>
      </template>
    </div>
  </header>
</template>

<script setup>
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const handleLogout = () => {
    authStore.logout();
    // router.push('/login'); // No need to redirect
};
</script>
