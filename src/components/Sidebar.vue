<template>
  <aside class="w-20 lg:w-64 bg-[#1a1a1a] border-r border-[#2a2a2a] flex flex-col h-screen fixed left-0 top-0 z-40 transition-all duration-300">
    <!-- Logo Area -->
    <div class="h-20 flex items-center justify-center border-b border-[#2a2a2a]">
      <div class="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(229,9,20,0.5)]">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
        </svg>
      </div>
      <span class="hidden lg:block ml-3 text-xl font-bold tracking-wider text-white">CASINO</span>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto py-6 space-y-2">
      <a href="#" class="flex items-center px-4 py-3 text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-colors group">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 group-hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
        <span class="hidden lg:block ml-4 font-medium">Slots</span>
      </a>

      <a href="#" class="flex items-center px-4 py-3 text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-colors group">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 group-hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span class="hidden lg:block ml-4 font-medium">Bets</span>
      </a>

      <!-- Active Item -->
      <a href="#" class="flex items-center px-4 py-3 text-white bg-[#2a2a2a] border-l-4 border-red-600 group relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-r from-red-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="hidden lg:block ml-4 font-bold">Roulette</span>
      </a>

      <a href="#" class="flex items-center px-4 py-3 text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-colors group">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 group-hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <span class="hidden lg:block ml-4 font-medium">Crash</span>
      </a>

      <a href="#" class="flex items-center px-4 py-3 text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-colors group">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 group-hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <span class="hidden lg:block ml-4 font-medium">Dice</span>
      </a>

      <a href="#" class="flex items-center px-4 py-3 text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-colors group">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 group-hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="hidden lg:block ml-4 font-medium">Coinflip</span>
      </a>
    </nav>

    <!-- Socials / Bottom -->
    <div class="p-4 border-t border-[#2a2a2a] space-y-4">
      <div class="flex justify-center space-x-4 lg:justify-start lg:space-x-2">
        <a href="#" class="text-gray-500 hover:text-white transition-colors"><i class="fab fa-twitter"></i></a>
        <a href="#" class="text-gray-500 hover:text-white transition-colors"><i class="fab fa-discord"></i></a>
      </div>
      <div class="hidden lg:flex items-center justify-between text-xs text-gray-500">
        <span>EN</span>
        <img src="https://flagcdn.com/w20/us.png" alt="US" class="w-4 h-3 opacity-50">
      </div>
    </div>
  </aside>
</template>

<script setup>
// No script needed for static sidebar
</script>
