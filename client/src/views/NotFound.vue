<template>
  <div class="min-h-[70vh] flex flex-col items-center justify-center px-4">
    <div class="text-center space-y-8">
      <!-- Art Deco 404 Badge -->
      <div class="relative inline-flex items-center justify-center">
        <!-- Decorative rings -->
        <div class="absolute w-40 h-40 rounded-full border border-gold/10"></div>
        <div class="absolute w-36 h-36 rounded-full border border-gold/20"></div>
        <div class="absolute w-32 h-32 rounded-full border-2 border-gold/30"></div>

        <!-- Main badge -->
        <div class="w-28 h-28 rounded-full bg-gradient-to-br from-surface to-background border-2 border-gold/40 flex items-center justify-center shadow-[0_0_40px_rgba(212,175,55,0.15)]">
          <span class="text-5xl font-display font-bold text-gold-gradient">404</span>
        </div>
      </div>

      <!-- Title -->
      <h1 class="text-3xl sm:text-4xl font-display font-semibold tracking-[0.15em] text-cream">
        PAGE NOT FOUND
      </h1>

      <!-- Art Deco divider -->
      <div class="flex items-center justify-center gap-4">
        <div class="w-16 h-px bg-gradient-to-r from-transparent to-gold/50"></div>
        <div class="w-2 h-2 rotate-45 border border-gold/50"></div>
        <div class="w-16 h-px bg-gradient-to-l from-transparent to-gold/50"></div>
      </div>

      <!-- Description -->
      <p class="text-muted-foreground text-lg max-w-md mx-auto font-body">
        The page you're looking for doesn't exist or has been moved to another location.
      </p>

      <!-- Back Button -->
      <router-link
        to="/"
        class="btn-gold inline-flex items-center gap-3 px-8 py-3.5 rounded text-sm"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline stroke-linecap="round" stroke-linejoin="round" points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span class="font-display tracking-[0.2em]">Back to Game</span>
      </router-link>
    </div>
  </div>
</template>

<script setup>
// No logic needed
</script>

<style scoped>
.text-gold-gradient {
  background: linear-gradient(135deg, #f0d77a 0%, #d4af37 50%, #b8972f 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
</style>
