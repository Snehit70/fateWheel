<template>
  <div class="min-h-screen bg-background text-foreground font-body selection:bg-primary/30 selection:text-cream">
    <!-- Art Deco Background Elements -->
    <div class="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <!-- Subtle noise texture -->
      <div class="absolute inset-0 opacity-[0.015]" style="background-image: url('data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27noise%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.8%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23noise)%27/%3E%3C/svg%3E');"></div>

      <!-- Gold radial glow from top center -->
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-radial from-gold/[0.04] via-transparent to-transparent rounded-full blur-3xl"></div>

      <!-- Corner accent glows -->
      <div class="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-radial from-gold/[0.02] to-transparent rounded-full blur-2xl"></div>
      <div class="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-radial from-gold/[0.02] to-transparent rounded-full blur-2xl"></div>

      <!-- Subtle Art Deco geometric lines -->
      <svg class="absolute inset-0 w-full h-full opacity-[0.03]" preserveAspectRatio="none">
        <defs>
          <pattern id="deco-pattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M30 0 L60 30 L30 60 L0 30 Z" fill="none" stroke="#d4af37" stroke-width="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#deco-pattern)" />
      </svg>
    </div>

    <!-- Main Content -->
    <TopBar />

    <main class="relative z-10 p-2 lg:px-6 lg:pb-4 lg:pt-2 min-h-[calc(100vh-56px)]">
      <div class="max-w-7xl mx-auto">
        <router-view v-slot="{ Component }">
          <transition name="page-fade" mode="out-in">
            <Suspense>
              <template #default>
                <component :is="Component" />
              </template>
              <template #fallback>
                <LoadingSpinner />
              </template>
            </Suspense>
          </transition>
        </router-view>
      </div>
    </main>

    <!-- Elegant Footer -->
    <footer class="footer-terms relative z-10">
      <div class="flex items-center justify-center gap-2 mb-2">
        <div class="h-px w-8 bg-gradient-to-r from-transparent to-gold/30"></div>
        <span class="text-gold/60 text-[10px] font-display tracking-[0.3em] uppercase">Disclaimer</span>
        <div class="h-px w-8 bg-gradient-to-l from-transparent to-gold/30"></div>
      </div>
      <p>This website is intended strictly for educational purposes only. Any misuse of the content or involvement in illegal usage is prohibited. We are not responsible for any unlawful use or consequences arising from such misuse.</p>
    </footer>

    <LoginModal />
    <ToastContainer />
  </div>
</template>

<script setup>
import TopBar from './components/TopBar.vue';
import LoginModal from './components/LoginModal.vue';
import ToastContainer from './components/ToastContainer.vue';
import LoadingSpinner from './components/LoadingSpinner.vue';
import { onMounted, onUnmounted } from 'vue';
import { useAuthStore } from './stores/auth';
import { useAudio } from './composables/useAudio';
import socket from './services/socket';

const authStore = useAuthStore();
const { tryUnlockAudio, isAudioUnlocked } = useAudio();

const handleInteraction = () => {
    if (!isAudioUnlocked.value) {
        tryUnlockAudio();
    }
};

onMounted(() => {
    authStore.init();
    socket.connect();
    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
});

onUnmounted(() => {
    window.removeEventListener('click', handleInteraction);
    window.removeEventListener('keydown', handleInteraction);
    window.removeEventListener('touchstart', handleInteraction);
    authStore.cleanup();
    socket.disconnect();
});
</script>

<style>
/* Page transition animations */
.page-fade-enter-active {
  animation: fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.page-fade-leave-active {
  animation: fadeDown 0.25s cubic-bezier(0.4, 0, 1, 1) forwards;
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeDown {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-8px);
  }
}

/* Radial gradient utility */
.bg-gradient-radial {
  background: radial-gradient(circle, var(--tw-gradient-stops));
}
</style>
