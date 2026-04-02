<template>
  <div class="min-h-[400px] flex flex-col items-center justify-center gap-6">
    <!-- Art Deco Loading Animation -->
    <div class="relative w-20 h-20">
      <!-- Outer rotating ring -->
      <div class="absolute inset-0 rounded-full border-2 border-gold/20"></div>
      <div class="absolute inset-0 rounded-full border-2 border-transparent border-t-gold animate-spin" style="animation-duration: 1.5s;"></div>

      <!-- Middle pulsing ring -->
      <div class="absolute inset-2 rounded-full border border-gold/30 animate-pulse"></div>

      <!-- Inner rotating ring (opposite direction) -->
      <div class="absolute inset-4 rounded-full border border-transparent border-b-gold/60 animate-spin" style="animation-duration: 2s; animation-direction: reverse;"></div>

      <!-- Center dot -->
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="w-2 h-2 rounded-full bg-gold shadow-[0_0_10px_rgba(212,175,55,0.6)] animate-pulse"></div>
      </div>
    </div>

    <!-- Loading Text -->
    <div class="text-center">
      <p class="text-muted-foreground font-display text-sm tracking-[0.3em] uppercase animate-pulse">
        Loading
      </p>
      <div class="flex justify-center mt-3 gap-1">
        <div class="w-1 h-1 rounded-full bg-gold animate-bounce" style="animation-delay: 0s;"></div>
        <div class="w-1 h-1 rounded-full bg-gold animate-bounce" style="animation-delay: 0.15s;"></div>
        <div class="w-1 h-1 rounded-full bg-gold animate-bounce" style="animation-delay: 0.3s;"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
// No logic needed for loading spinner
</script>
