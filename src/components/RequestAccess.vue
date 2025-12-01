<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
    <!-- Background Effects -->
    <div class="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--primary)_0%,_transparent_50%)] opacity-10 pointer-events-none"></div>

    <div class="glass-panel w-full max-w-md text-center relative z-10 fade-in border-t border-white/10">
      <div class="flex justify-center mb-8">
        <div class="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-red-900 flex items-center justify-center shadow-lg shadow-red-900/50 ring-4 ring-white/5 animate-pulse-slow">
          <span class="text-4xl font-bold text-white">R</span>
        </div>
      </div>
      
      <h1 class="text-4xl font-bold mb-2 tracking-tighter text-white">ROULETTE</h1>
      <p class="text-gray-400 mb-8 text-lg font-light">Premium Gaming Experience</p>

      <div v-if="status === 'success'" class="text-green-400 p-6 bg-green-900/20 rounded-xl border border-green-900/50">
        <div class="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <p class="font-semibold text-lg">Request Received</p>
        <p class="text-sm mt-2 text-gray-400">We will notify you once approved.</p>
        <router-link to="/login" class="mt-6 inline-block text-sm text-white underline hover:text-primary transition-colors">
          Go to Login
        </router-link>
      </div>

      <form v-else @submit.prevent="handleSubmit" class="flex flex-col gap-5">
        <div class="text-left">
          <label class="text-xs uppercase tracking-wider text-gray-500 font-bold ml-1 mb-2 block">Email Address</label>
          <input
            type="email"
            placeholder="name@example.com"
            v-model="email"
            class="input-field"
            required
          />
        </div>
        
        <button 
          type="submit" 
          :disabled="status === 'loading'"
          class="btn-primary w-full py-3 text-base shadow-lg shadow-red-900/20 disabled:opacity-50"
        >
          <span v-if="status === 'loading'" class="flex items-center justify-center gap-2">
            <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Requesting...
          </span>
          <span v-else>Request Access</span>
        </button>
        <p v-if="status === 'error'" class="text-red-500 text-sm bg-red-900/20 p-3 rounded border border-red-900/50">{{ errorMessage }}</p>
      </form>
      
      <div class="mt-8 pt-8 border-t border-white/5">
         <p class="text-sm text-gray-500">Already have access?</p>
         <router-link to="/login" class="text-sm text-white hover:text-primary transition-colors mt-2 inline-block font-semibold">
           Login here
         </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const email = ref('');
const status = ref('idle');
const errorMessage = ref('');

const handleSubmit = async () => {
  console.log('handleSubmit called');
  status.value = 'loading';
  errorMessage.value = '';

  try {
    console.log('Checking user existence...');
    const userRef = doc(db, 'users', email.value);
    const userSnap = await getDoc(userRef);
    console.log('User snap exists:', userSnap.exists());

    if (userSnap.exists()) {
      // User already exists, just show success to avoid leaking info
      status.value = 'success';
      return;
    }

    console.log('Creating user document...');
    await setDoc(userRef, {
      email: email.value,
      status: 'PENDING',
      balance: 1000, // Dummy money
      createdAt: new Date()
    });
    console.log('User document created');

    status.value = 'success';
  } catch (error) {
    console.error('Error in handleSubmit:', error);
    status.value = 'error';
    errorMessage.value = 'Something went wrong. Try again.';
  }
};
</script>
