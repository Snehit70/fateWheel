<template>
  <Dialog :open="isOpen" @update:open="handleOpenChange">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle class="text-3xl font-bold text-center mb-2">{{ isLogin ? 'Welcome Back' : 'Create Account' }}</DialogTitle>
        <DialogDescription class="text-center">
          {{ isLogin ? 'Sign in to continue playing' : 'Join us and start winning today' }}
        </DialogDescription>
      </DialogHeader>


      <form @submit.prevent="handleSubmit" class="space-y-4 py-4">
        <div class="space-y-2">
          <label class="text-xs font-bold text-muted-foreground uppercase">Email</label>
          <Input 
            v-model="email" 
            type="email" 
            placeholder="Enter your email"
            required
          />
        </div>

        <div v-if="!isLogin" class="space-y-2">
          <label class="text-xs font-bold text-muted-foreground uppercase">Username</label>
          <Input 
            v-model="username" 
            type="text" 
            placeholder="Choose a username"
            required
          />
        </div>
        
        <div class="space-y-2">
          <label class="text-xs font-bold text-muted-foreground uppercase">Password</label>
          <div class="relative">
            <Input 
              v-model="password" 
              :type="showPassword ? 'text' : 'password'" 
              placeholder="Enter your password"
              required
              class="pr-10"
            />
            <button 
              type="button"
              @click="showPassword = !showPassword"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
              tabindex="-1"
            >
              <Eye v-if="!showPassword" class="h-4 w-4" />
              <EyeOff v-else class="h-4 w-4" />
            </button>
          </div>
        </div>

        <div v-if="error" class="text-destructive text-sm text-center bg-destructive/10 py-2 rounded border border-destructive/20">
          {{ error }}
        </div>

        <Button 
          type="submit" 
          class="w-full font-bold py-6 uppercase tracking-wider"
          :class="[
            isSuccess 
              ? 'bg-green-500 hover:bg-green-600 text-white' 
              : ''
          ]"
          :disabled="loading || isSuccess"
        >
          <span v-if="loading"><i class="fas fa-spinner fa-spin mr-2"></i> Processing...</span>
          <span v-else-if="isSuccess"><i class="fas fa-check mr-2"></i> {{ isLogin ? 'Success' : 'Check Email' }}</span>
          <span v-else>{{ isLogin ? 'Sign In' : 'Sign Up' }}</span>
        </Button>
      </form>

      <DialogFooter class="sm:justify-center">
        <div class="text-sm text-muted-foreground">
          {{ isLogin ? "Don't have an account?" : "Already have an account?" }}
          <button 
            @click="toggleMode" 
            class="text-primary hover:text-primary/90 font-bold ml-1 hover:underline focus:outline-none"
          >
            {{ isLogin ? 'Sign Up' : 'Sign In' }}
          </button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-vue-next';

const authStore = useAuthStore();
const router = useRouter();
const isOpen = computed(() => authStore.isLoginModalOpen);
const isLogin = ref(true);
const email = ref('');
const username = ref('');
const password = ref('');
const showPassword = ref(false);
const error = ref('');
const loading = ref(false);
const isSuccess = ref(false);

const handleOpenChange = (value) => {
  if (!value) {
    close();
  }
};

const close = () => {
  authStore.closeLoginModal();
  resetForm();
};

const toggleMode = () => {
  isLogin.value = !isLogin.value;
  error.value = '';
};

const resetForm = () => {
  email.value = '';
  username.value = '';
  password.value = '';
  showPassword.value = false;
  error.value = '';
  isLogin.value = true;
};

const handleSubmit = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    if (isLogin.value) {
      await authStore.login(email.value, password.value);
      close();
    } else {
      await authStore.register(email.value, password.value, username.value);
      // Registration successful
      isSuccess.value = true;
      error.value = 'Verification email sent! Please check your inbox.';
      
      // Wait 3 seconds then switch/close
      setTimeout(() => {
        isSuccess.value = false;
        // Depending on Supabase settings, user might be logged in or need verify
        // For now, we assume email verification is required or we just close
        close();
      }, 3000);
    }
  } catch (err) {
    if (typeof err === 'string') {
        error.value = err;
    } else {
        error.value = err.message || 'An error occurred';
    }
    isSuccess.value = false;
  } finally {
    loading.value = false;
  }
};
</script>
