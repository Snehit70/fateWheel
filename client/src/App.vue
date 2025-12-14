<template>
  <div class="bg-background min-h-screen text-text-main font-sans selection:bg-primary selection:text-white">
    <TopBar />
    
    <main class="p-2 lg:px-4 lg:pb-2 lg:pt-0 min-h-[calc(100vh-64px)] relative">
      <!-- Background Elements -->
      <div class="fixed inset-0 pointer-events-none z-0">
        <div class="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-[0.03]"></div>
        <div class="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]"></div>
        <div class="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px]"></div>
      </div>

      <div class="relative z-10">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
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
    
    <!-- Terms and Conditions Footer -->
    <footer class="footer-terms">
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

import { watch } from 'vue';
import { useToast } from './composables/useToast';

const authStore = useAuthStore();
const { tryUnlockAudio, isAudioUnlocked } = useAudio();
const toast = useToast();

const handleInteraction = () => {
    if (!isAudioUnlocked.value) {
        tryUnlockAudio();
    }
};

// Watch for pending/rejected status to notify user
watch(() => authStore.pendingStatus, (status) => {
    if (status === 'pending') {
        toast.info("Registration successful. Your account is pending admin approval.", 5000);
    } else if (status === 'rejected') {
        toast.error("Your account has been rejected.", 5000);
    }
});

onMounted(() => {
    authStore.init();
    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
});

onUnmounted(() => {
    window.removeEventListener('click', handleInteraction);
    window.removeEventListener('keydown', handleInteraction);
    window.removeEventListener('touchstart', handleInteraction);
    // Cleanup auth store listeners to prevent memory leaks
    authStore.cleanup();
});
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
