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
          <label class="text-xs font-bold text-muted-foreground uppercase">Username</label>
          <Input 
            v-model="username" 
            type="text" 
            placeholder="Enter your username"
            required
          />
        </div>
        
        <div class="space-y-2">
          <label class="text-xs font-bold text-muted-foreground uppercase">Password</label>
          <Input 
            v-model="password" 
            type="password" 
            placeholder="Enter your password"
            required
          />
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
          <span v-else-if="isSuccess"><i class="fas fa-check mr-2"></i> Sent</span>
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

const authStore = useAuthStore();
const router = useRouter();
const isOpen = computed(() => authStore.isLoginModalOpen);
const isLogin = ref(true);
const username = ref('');
const password = ref('');
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
      // Check if admin and redirect
      if (authStore.user?.role === 'admin') {
        router.push('/admin');
      }
      close();
    } else {
      const res = await authStore.register(username.value, password.value);
      // Registration successful, show success state on button
      isSuccess.value = true;
      
      // Wait 2 seconds then switch to login
      setTimeout(() => {
        isSuccess.value = false;
        toggleMode(); // Switch to login
      }, 2000);
    }
  } catch (err) {
    error.value = err.response?.data?.message || err.message || 'An error occurred';
    isSuccess.value = false;
  } finally {
    loading.value = false;
  }
};
</script>
