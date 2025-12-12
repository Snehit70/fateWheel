<template>
  <div class="min-h-screen bg-background text-foreground flex flex-col items-center justify-center pt-24 px-4">
    <div class="text-center space-y-6">
      <!-- 404 Badge -->
      <div class="inline-flex items-center justify-center w-32 h-32 rounded-full bg-primary/10 border-2 border-primary/30 mb-4">
        <span class="text-5xl font-bold text-primary">404</span>
      </div>
      
      <!-- Title -->
      <h1 class="text-4xl font-bold font-mono tracking-wider text-primary">
        PAGE NOT FOUND
      </h1>
      
      <!-- Description -->
      <p class="text-muted-foreground text-lg max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      
      <!-- Back Button -->
      <router-link to="/" class="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        BACK TO GAME
      </router-link>
    </div>
  </div>
</template>

<script setup>
// No logic needed for this simple page
</script>
