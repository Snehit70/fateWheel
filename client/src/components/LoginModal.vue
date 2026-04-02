<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-background/90 backdrop-blur-md"
          @click="close"
        ></div>

        <!-- Modal Content -->
        <div class="relative w-full max-w-md bg-surface border border-gold/20 rounded-lg shadow-2xl shadow-gold/5 overflow-hidden">
          <!-- Decorative top border -->
          <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent"></div>

          <!-- Art Deco Corner Decorations -->
          <div class="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-gold/40"></div>
          <div class="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-gold/40"></div>
          <div class="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-gold/40"></div>
          <div class="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-gold/40"></div>

          <!-- Close button -->
          <button
            @click="close"
            class="absolute top-4 right-4 z-10 p-1.5 rounded text-muted-foreground hover:text-cream transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div class="p-8">
            <!-- Header -->
            <div class="text-center mb-8">
              <h2 class="text-2xl font-display font-semibold tracking-[0.1em] text-gold-gradient mb-2">
                {{ isLogin ? 'Welcome Back' : 'Join Us' }}
              </h2>
              <p class="text-sm text-muted-foreground font-display tracking-wide">
                {{ isLogin ? 'Sign in to continue playing' : 'Create your account today' }}
              </p>
            </div>

            <!-- Form -->
            <form @submit.prevent="handleSubmit" class="space-y-5">
              <!-- Username -->
              <div class="space-y-2">
                <label class="text-[10px] font-display font-semibold text-muted-foreground tracking-[0.2em] uppercase">
                  Username
                </label>
                <input
                  v-model="username"
                  type="text"
                  class="w-full px-4 py-3 rounded bg-background border border-gold/10 text-cream font-body placeholder:text-muted-foreground/50 focus:border-gold/40 focus:ring-1 focus:ring-gold/20 focus:outline-none transition-all duration-300"
                  placeholder="Enter your username"
                  required
                />
              </div>

              <!-- Password -->
              <div class="space-y-2">
                <label class="text-[10px] font-display font-semibold text-muted-foreground tracking-[0.2em] uppercase">
                  Password
                </label>
                <div class="relative">
                  <input
                    v-model="password"
                    :type="showPassword ? 'text' : 'password'"
                    class="w-full px-4 py-3 pr-12 rounded bg-background border border-gold/10 text-cream font-body placeholder:text-muted-foreground/50 focus:border-gold/40 focus:ring-1 focus:ring-gold/20 focus:outline-none transition-all duration-300"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    @click="showPassword = !showPassword"
                    class="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-cream transition-colors"
                    tabindex="-1"
                  >
                    <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Error Message -->
              <div v-if="error" class="text-ruby text-sm text-center bg-ruby/10 py-2.5 rounded border border-ruby/20 font-display">
                {{ error }}
              </div>

              <!-- Success Message -->
              <div v-if="successMessage" class="text-emerald text-sm text-center bg-emerald/10 py-2.5 rounded border border-emerald/20 font-display">
                {{ successMessage }}
              </div>

              <!-- Submit Button -->
              <button
                type="submit"
                class="w-full py-3.5 rounded font-display font-semibold tracking-[0.15em] uppercase transition-all duration-300"
                :class="isSuccess ? 'bg-emerald text-cream' : 'btn-gold'"
                :disabled="loading || isSuccess"
              >
                <span v-if="loading" class="flex items-center justify-center gap-2">
                  <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing
                </span>
                <span v-else-if="isSuccess" class="flex items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Success
                </span>
                <span v-else>{{ isLogin ? 'Sign In' : 'Create Account' }}</span>
              </button>
            </form>

            <!-- Toggle Mode -->
            <div class="text-center mt-6 pt-6 border-t border-gold/10">
              <p class="text-sm text-muted-foreground font-display">
                {{ isLogin ? "Don't have an account?" : "Already have an account?" }}
                <button
                  @click="toggleMode"
                  class="text-gold hover:text-gold-light font-semibold ml-1 hover:underline transition-colors"
                >
                  {{ isLogin ? 'Sign Up' : 'Sign In' }}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();

const isOpen = computed(() => authStore.isLoginModalOpen);
const isLogin = ref(true);

const username = ref('');
const password = ref('');
const showPassword = ref(false);
const error = ref('');
const successMessage = ref('');
const loading = ref(false);
const isSuccess = ref(false);

watch(username, (newValue) => {
  username.value = newValue.toLowerCase().trim();
});

const close = () => {
  authStore.closeLoginModal();
  resetForm();
};

const toggleMode = () => {
  isLogin.value = !isLogin.value;
  error.value = '';
  successMessage.value = '';
};

const resetForm = () => {
  username.value = '';
  password.value = '';
  showPassword.value = false;
  error.value = '';
  successMessage.value = '';
  isLogin.value = true;
  isSuccess.value = false;
};

const handleSubmit = async () => {
  loading.value = true;
  error.value = '';
  successMessage.value = '';

  try {
    if (isLogin.value) {
      await authStore.login(username.value, password.value.trim());
      close();
    } else {
      await authStore.register(username.value, password.value.trim());
      isSuccess.value = true;
      successMessage.value = "Registration successful! You can now sign in.";

      setTimeout(() => {
        isSuccess.value = false;
        successMessage.value = "";
        isLogin.value = true;
      }, 1500);
    }
  } catch (err) {
    if (typeof err === 'string') {
      error.value = err;
    } else {
      error.value = err.response?.data?.message || err.message || 'An error occurred';
    }
    isSuccess.value = false;
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
/* Gold gradient text */
.text-gold-gradient {
  background: linear-gradient(135deg, #f0d77a 0%, #d4af37 50%, #b8972f 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Modal transitions */
.modal-enter-active {
  animation: modalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.modal-leave-active {
  animation: modalOut 0.2s cubic-bezier(0.4, 0, 1, 1) forwards;
}

@keyframes modalIn {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

@keyframes modalOut {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

.modal-enter-active > div:last-child {
  animation: modalContentIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.modal-leave-active > div:last-child {
  animation: modalContentOut 0.2s cubic-bezier(0.4, 0, 1, 1) forwards;
}

@keyframes modalContentIn {
  0% {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes modalContentOut {
  0% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  100% {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
}
</style>
