<template>
  <Transition name="fade">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" @click.self="close">
      <div class="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl w-full max-w-md p-8 relative shadow-2xl transform transition-all">
        
        <!-- Close Button -->
        <button @click="close" class="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
          <i class="fas fa-times text-xl"></i>
        </button>

        <!-- Header -->
        <div class="text-center mb-8">
          <h2 class="text-3xl font-bold text-white mb-2">{{ isLogin ? 'Welcome Back' : 'Create Account' }}</h2>
          <p class="text-gray-400 text-sm">
            {{ isLogin ? 'Sign in to continue playing' : 'Join us and start winning today' }}
          </p>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Username</label>
            <input 
              v-model="username" 
              type="text" 
              class="w-full bg-[#0f0f13] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors"
              placeholder="Enter your username"
              required
            >
          </div>
          
          <div>
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
            <input 
              v-model="password" 
              type="password" 
              class="w-full bg-[#0f0f13] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors"
              placeholder="Enter your password"
              required
            >
          </div>

          <div v-if="error" class="text-red-500 text-sm text-center bg-red-500/10 py-2 rounded border border-red-500/20">
            {{ error }}
          </div>

          <button 
            type="submit" 
            class="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-lg uppercase tracking-wider transition-all transform active:scale-95 shadow-[0_0_15px_rgba(255,215,0,0.3)]"
            :disabled="loading"
          >
            <span v-if="loading"><i class="fas fa-spinner fa-spin mr-2"></i> Processing...</span>
            <span v-else>{{ isLogin ? 'Sign In' : 'Sign Up' }}</span>
          </button>
        </form>

        <!-- Toggle Mode -->
        <div class="mt-6 text-center text-sm text-gray-400">
          {{ isLogin ? "Don't have an account?" : "Already have an account?" }}
          <button 
            @click="toggleMode" 
            class="text-yellow-500 hover:text-yellow-400 font-bold ml-1 hover:underline"
          >
            {{ isLogin ? 'Sign Up' : 'Sign In' }}
          </button>
        </div>

      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();
const isOpen = computed(() => authStore.isLoginModalOpen);
const isLogin = ref(true);
const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

const close = () => {
  authStore.closeLoginModal();
  resetForm();
};

const toggleMode = () => {
  isLogin.value = !isLogin.value;
  error.value = '';
};

const resetForm = () => {
  username.value = '';
  password.value = '';
  error.value = '';
  isLogin.value = true;
};

const handleSubmit = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    if (isLogin.value) {
      await authStore.login(username.value, password.value);
    } else {
      await authStore.register(username.value, password.value);
    }
    
    // Check if admin and redirect
    if (authStore.user?.role === 'admin') {
      router.push('/admin');
    }
    
    close();
  } catch (err) {
    error.value = err;
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-active .transform,
.fade-leave-active .transform {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.fade-enter-from .transform,
.fade-leave-to .transform {
  transform: scale(0.9) translateY(20px);
}
</style>
