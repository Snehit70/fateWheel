<template>
  <div class="w-full h-full flex flex-col gap-3 relative">
    <!-- Login Overlay -->
    <div
      v-if="!isLoggedIn"
      class="absolute inset-0 z-20 glass rounded flex items-center justify-center"
    >
      <button
        @click="authStore.openLoginModal()"
        class="btn-gold px-6 py-3 rounded text-sm font-display tracking-wider animate-pulse"
      >
        Sign In to Bet
      </button>
    </div>

    <!-- Admin Overlay -->
    <div
      v-if="isAdmin"
      class="absolute inset-0 z-20 glass rounded flex items-center justify-center"
    >
      <div class="font-display text-sm tracking-wider px-6 py-4 text-ruby border border-ruby/30 bg-ruby/10 rounded">
        Betting Disabled for Admins
      </div>
    </div>

    <!-- Input & Controls -->
    <div class="flex flex-col gap-2" :class="{ 'opacity-40 pointer-events-none': !isLoggedIn || isSpinning }">
      <div class="flex items-center gap-2">
        <!-- Bet Input -->
        <div class="relative flex-1">
          <div class="absolute left-3 top-1/2 -translate-y-1/2 z-10">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <input
            type="text"
            inputmode="numeric"
            v-model.number="betAmount"
            @keypress="onlyAllowNumbers"
            class="w-full pl-9 pr-10 py-2.5 sm:py-3 rounded bg-surface border border-gold/20 text-cream font-display text-lg sm:text-xl font-semibold tracking-wide tabular-nums focus:border-gold/50 focus:ring-1 focus:ring-gold/30 focus:outline-none transition-all duration-300 placeholder:text-muted-foreground/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="0"
            :min="BET_LIMITS.MIN"
            :max="BET_LIMITS.MAX"
            :disabled="!isLoggedIn || isSpinning"
          />
          <button
            v-if="betAmount > 0"
            @click="betAmount = 0"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ruby transition-colors z-10"
            :disabled="!isLoggedIn || isSpinning"
            type="button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>

        <!-- Clear Board Button -->
        <button
          @click="$emit('clear-bets')"
          class="h-full px-4 py-2.5 sm:py-3 rounded bg-surface border border-gold/10 text-muted-foreground hover:text-cream hover:border-gold/30 transition-all duration-300 font-display text-[10px] sm:text-xs tracking-[0.15em] uppercase"
          :disabled="!isLoggedIn || isSpinning"
        >
          Clear
        </button>
      </div>

      <!-- Error message -->
      <span v-if="isOutOfRange" class="text-xs text-ruby font-display tracking-wide ml-1">
        Range: {{ BET_LIMITS.MIN }} - {{ BET_LIMITS.MAX }}
      </span>
    </div>

    <!-- Quick Chips -->
    <div class="grid grid-cols-5 gap-1.5" :class="{ 'opacity-40 pointer-events-none': !isLoggedIn || isSpinning }">
      <button
        v-for="chip in chips"
        :key="chip.value"
        @click="addAmount(chip.value)"
        class="chip flex flex-col items-center justify-center py-2 rounded group"
        :disabled="!isLoggedIn || isSpinning"
      >
        <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-surface-lighter to-surface border-2 border-gold flex items-center justify-center shadow-lg group-hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all duration-300">
          <span class="text-xs sm:text-sm font-display font-semibold text-gold">+{{ chip.label }}</span>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import { BET_LIMITS } from '../constants/game';

const authStore = useAuthStore();

const props = defineProps({
  balance: { type: Number, default: 0 },
  isLoggedIn: { type: Boolean, default: false },
  isSpinning: { type: Boolean, default: false },
  totalBet: { type: Number, default: 0 },
  amount: { type: Number, default: BET_LIMITS.MIN }
});

const emit = defineEmits(['update:amount', 'clear-input', 'clear-bets']);

const betAmount = computed({
  get: () => props.amount,
  set: (val) => emit('update:amount', val)
});

const chips = [
  { label: "10", value: 10 },
  { label: "20", value: 20 },
  { label: "50", value: 50 },
  { label: "100", value: 100 },
  { label: "200", value: 200 },
];

const isOutOfRange = computed(() => {
  return betAmount.value > 0 && (betAmount.value < BET_LIMITS.MIN || betAmount.value > BET_LIMITS.MAX);
});

const isAdmin = computed(() => authStore.user && authStore.user.role === 'admin');

const addAmount = (amount) => {
  const newAmount = betAmount.value + amount;
  if (newAmount <= BET_LIMITS.MAX) {
    betAmount.value = newAmount;
  } else {
    betAmount.value = BET_LIMITS.MAX;
  }
};

const onlyAllowNumbers = (event) => {
  const char = String.fromCharCode(event.which || event.keyCode);
  if (!/[0-9]/.test(char)) {
    event.preventDefault();
  }
};
</script>
