<template>
  <div class="bg-[#0f0f13] min-h-screen text-white font-sans selection:bg-red-500 selection:text-white">
    <TopBar />
    
    <main class="p-6 lg:p-10 min-h-[calc(100vh-80px)] relative">
      <!-- Background Elements -->
      <div class="fixed inset-0 pointer-events-none z-0">
        <div class="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-[0.03]"></div>
        <div class="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[120px]"></div>
        <div class="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px]"></div>
      </div>

      <div class="relative z-10">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>
    <LoginModal />
  </div>
</template>

<script setup>
import TopBar from './components/TopBar.vue';
import LoginModal from './components/LoginModal.vue';
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
