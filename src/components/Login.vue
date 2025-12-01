<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
    <div class="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--primary)_0%,_transparent_50%)] opacity-10 pointer-events-none"></div>

    <div class="glass-panel w-full max-w-md relative z-10 fade-in border-t border-white/10">
      <div class="flex justify-center mb-8">
        <div class="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-red-900 flex items-center justify-center shadow-lg shadow-red-900/50 ring-4 ring-white/5">
          <span class="text-3xl font-bold text-white">R</span>
        </div>
      </div>

      <h1 class="text-3xl font-bold mb-2 text-center tracking-tight">
        {{ isRegistering ? 'Create Account' : 'Welcome Back' }}
      </h1>
      <p class="text-gray-400 text-center mb-8 text-sm">
        {{ isRegistering ? 'Join the premium gaming experience' : 'Sign in to continue playing' }}
      </p>

      <form @submit.prevent="handleSubmit" class="flex flex-col gap-5">
        <div class="flex flex-col gap-2">
          <label class="text-xs uppercase tracking-wider text-gray-500 font-bold ml-1">Email</label>
          <input
            type="email"
            v-model="email"
            class="input-field"
            placeholder="name@example.com"
            required
          />
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-xs uppercase tracking-wider text-gray-500 font-bold ml-1">Password</label>
          <input
            type="password"
            v-model="password"
            class="input-field"
            placeholder="••••••••"
            required
          />
        </div>

        <p v-if="error" class="text-red-500 text-sm bg-red-900/20 p-3 rounded border border-red-900/50 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          {{ error }}
        </p>

        <button 
          type="submit" 
          :disabled="isLoading"
          class="btn-primary w-full mt-4 py-3 text-base shadow-lg shadow-red-900/20"
        >
          <span v-if="isLoading" class="flex items-center justify-center gap-2">
            <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Processing...
          </span>
          <span v-else>{{ isRegistering ? 'Sign Up' : 'Login' }}</span>
        </button>

        <div class="text-center mt-6 pt-6 border-t border-white/5">
          <button 
            type="button"
            @click="toggleMode"
            class="text-sm text-gray-400 hover:text-white transition-colors"
          >
            {{ isRegistering ? 'Already have an account? Login' : 'Need to set up password? Sign Up' }}
          </button>
        </div>
      </form>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';

const email = ref('');
const password = ref('');
const isRegistering = ref(false);
const error = ref('');
const isLoading = ref(false);
const router = useRouter();
const authStore = useAuthStore();

const toggleMode = () => {
  isRegistering.value = !isRegistering.value;
  error.value = '';
};

const handleSubmit = async () => {
  isLoading.value = true;
  error.value = '';

  try {
    if (isRegistering.value) {
      await authStore.register(email.value, password.value);
    } else {
      await authStore.login(email.value, password.value);
    }

    router.push('/game');
  } catch (err) {
    console.error(err);
    error.value = err;
  } finally {
    isLoading.value = false;
  }
};
</script>
