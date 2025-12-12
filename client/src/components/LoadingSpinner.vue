<template>
  <div class="min-h-[400px] flex flex-col items-center justify-center gap-4">
    <!-- Spinner -->
    <div class="relative w-16 h-16">
      <div class="absolute inset-0 rounded-full border-4 border-primary/20"></div>
      <div class="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin"></div>
    </div>
    
    <!-- Loading Text -->
    <p class="text-muted-foreground font-mono text-sm tracking-wider animate-pulse">
      LOADING...
    </p>
  </div>
</template>

<script setup>
// No logic needed for loading spinner
</script>
