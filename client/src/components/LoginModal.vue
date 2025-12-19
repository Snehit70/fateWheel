<template>
  <Dialog :open="isOpen" @update:open="handleOpenChange">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle class="text-3xl font-bold text-center mb-2">
          {{ isForgotPassword ? 'Reset Password' : (isLogin ? 'Welcome Back' : 'Create Account') }}
        </DialogTitle>
        <DialogDescription class="text-center">
          {{ isForgotPassword ? 'Enter your username and new password' : (isLogin ? 'Sign in to continue playing' : 'Join us and start winning today') }}
        </DialogDescription>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="space-y-4 py-4">
        <div class="space-y-2">
          <label class="text-xs font-bold text-muted-foreground uppercase">Username</label>
          <Input 
            v-model="username" 
            type="text" 
            placeholder="Enter your username"
            required
          />
        </div>
        
        <div class="space-y-2">
          <label class="text-xs font-bold text-muted-foreground uppercase">
            {{ isForgotPassword ? 'New Password' : 'Password' }}
          </label>
          <div class="relative">
            <Input 
              v-model="password" 
              :type="showPassword ? 'text' : 'password'" 
              :placeholder="isForgotPassword ? 'Enter new password' : 'Enter your password'"
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

        <div v-if="isForgotPassword" class="space-y-2">
          <label class="text-xs font-bold text-muted-foreground uppercase">Confirm Password</label>
          <div class="relative">
            <Input 
              v-model="confirmPassword" 
              :type="showConfirmPassword ? 'text' : 'password'" 
              placeholder="Confirm new password"
              required
              class="pr-10"
            />
            <button 
              type="button"
              @click="showConfirmPassword = !showConfirmPassword"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
              tabindex="-1"
            >
              <Eye v-if="!showConfirmPassword" class="h-4 w-4" />
              <EyeOff v-else class="h-4 w-4" />
            </button>
          </div>
        </div>

        <div v-if="error" class="text-destructive text-sm text-center bg-destructive/10 py-2 rounded border border-destructive/20">
          {{ error }}
        </div>
        
        <div v-if="successMessage" class="text-green-500 text-sm text-center bg-green-500/10 py-2 rounded border border-green-500/20">
          {{ successMessage }}
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
          <span v-else-if="isSuccess"><i class="fas fa-check mr-2"></i> Success</span>
          <span v-else>{{ isForgotPassword ? 'Reset Password' : (isLogin ? 'Sign In' : 'Sign Up') }}</span>
        </Button>
      </form>

      <DialogFooter class="sm:justify-center flex-col gap-2">
        <!-- Forgot Password Link -->
        <div v-if="isLogin && !isForgotPassword" class="text-center w-full">
            <button 
              @click="switchToForgot" 
              class="text-sm text-muted-foreground hover:text-foreground hover:underline focus:outline-none"
            >
              Forgot Password?
            </button>
        </div>

        <div class="text-sm text-muted-foreground text-center">
          <span v-if="isForgotPassword">
            Remember your password?
            <button 
              @click="switchToLogin" 
              class="text-primary hover:text-primary/90 font-bold ml-1 hover:underline focus:outline-none"
            >
              Sign In
            </button>
          </span>
          <span v-else>
            {{ isLogin ? "Don't have an account?" : "Already have an account?" }}
            <button 
              @click="toggleMode" 
              class="text-primary hover:text-primary/90 font-bold ml-1 hover:underline focus:outline-none"
            >
              {{ isLogin ? 'Sign Up' : 'Sign In' }}
            </button>
          </span>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import api from '../services/api';

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

const isOpen = computed(() => authStore.isLoginModalOpen);
const isLogin = ref(true);
const isForgotPassword = ref(false);

const username = ref('');
const password = ref('');
const confirmPassword = ref('');

const showPassword = ref(false);
const showConfirmPassword = ref(false);

const error = ref('');
const successMessage = ref('');
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
  isForgotPassword.value = false;
  error.value = '';
  successMessage.value = '';
};

const switchToForgot = () => {
    isForgotPassword.value = true;
    error.value = '';
    successMessage.value = '';
    password.value = '';
    confirmPassword.value = '';
};

const switchToLogin = () => {
    isForgotPassword.value = false;
    isLogin.value = true;
    error.value = '';
    successMessage.value = '';
};

const resetForm = () => {
  username.value = '';
  password.value = '';
  confirmPassword.value = '';
  showPassword.value = false;
  showConfirmPassword.value = false;
  error.value = '';
  successMessage.value = '';
  isLogin.value = true;
  isForgotPassword.value = false;
  isSuccess.value = false;
};

const handleSubmit = async () => {
  loading.value = true;
  error.value = '';
  successMessage.value = '';
  
  try {
    if (isForgotPassword.value) {
        // Handle Forgot Password
        if (password.value !== confirmPassword.value) {
            throw new Error("Passwords do not match");
        }
        
        await api.post('/auth/reset-password', {
            username: username.value,
            newPassword: password.value,
            confirmPassword: confirmPassword.value
        });
        
        isSuccess.value = true;
        successMessage.value = "Password reset successful! Redirecting to login...";
        
        setTimeout(() => {
            isSuccess.value = false;
            switchToLogin();
            // Pre-fill username might be nice, it's already there since we use same v-model
            password.value = ''; // clear password
        }, 2000);
        
    } else if (isLogin.value) {
      // Login with Username
      await authStore.login(username.value, password.value);
      close();
    } else {
      // Register with Username
      await authStore.register(username.value, password.value);
      isSuccess.value = true;
      successMessage.value = "Registration successful!";
      
      setTimeout(() => {
        isSuccess.value = false;
        toggleMode(); // Switch to login
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
