<template>
    <div 
      v-if="status === 'pending'" 
      class="w-full mb-4 p-4 rounded-lg bg-yellow-500/20 border border-yellow-500/50 text-yellow-500"
    >
      <div class="flex items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p class="font-bold">Account Pending Approval</p>
          <p class="text-sm text-yellow-500/80">Your account is waiting for admin approval. You can browse but cannot place bets yet.</p>
        </div>
      </div>
    </div>

    <div 
      v-else-if="status === 'rejected'" 
      class="w-full mb-4 p-4 rounded-lg bg-red-500/20 border border-red-500/50 text-red-500"
    >
      <div class="flex items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p class="font-bold">Account Rejected</p>
          <p class="text-sm text-red-500/80">Your account registration was rejected. Please contact support for more information.</p>
        </div>
      </div>
    </div>
</template>

<script setup>
defineProps({
  status: {
    type: String, // 'pending' | 'rejected' | 'approved'
    default: ''
  }
});
</script>
