<template>
    <div 
      v-if="isVisible && status === 'pending'" 
      class="w-full mb-4 p-4 rounded-lg bg-yellow-500/20 border border-yellow-500/50 text-yellow-500 relative"
    >
      <div class="flex items-center gap-3 pr-8">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p class="font-bold">Account Pending Approval</p>
          <p class="text-sm text-yellow-500/80">Your account is waiting for admin approval. You can browse but cannot place bets yet.</p>
        </div>
      </div>
      <button 
        @click="close" 
        class="absolute top-2 right-2 text-yellow-500 hover:bg-yellow-500/10 p-1 rounded-full transition-colors"
        title="Dismiss"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>

    <div 
      v-else-if="isVisible && status === 'rejected'" 
      class="w-full mb-4 p-4 rounded-lg bg-red-500/20 border border-red-500/50 text-red-500 relative"
    >
      <div class="flex items-center gap-3 pr-8">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p class="font-bold">Account Rejected</p>
          <p class="text-sm text-red-500/80">Your account registration was rejected. Please contact support for more information.</p>
        </div>
      </div>
      <button 
        @click="close" 
        class="absolute top-2 right-2 text-red-500 hover:bg-red-500/10 p-1 rounded-full transition-colors"
        title="Dismiss"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  status: {
    type: String, // 'pending' | 'rejected' | 'approved'
    default: ''
  }
});

const isVisible = ref(true);

const close = () => {
    isVisible.value = false;
};

// Re-show banner if status changes (e.g. from pending to rejected)
watch(() => props.status, () => {
    isVisible.value = true;
});
</script>
