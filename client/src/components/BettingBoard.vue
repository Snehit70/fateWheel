<template>
  <div class="w-full mb-2">
    <!-- Mobile Tabs -->
    <div class="grid grid-cols-3 gap-1 mb-2 lg:hidden bg-surface/50 p-1 rounded border border-gold/10">
      <button
        v-for="tab in ['red', 'green', 'black']"
        :key="tab"
        @click="activeTab = tab"
        class="flex flex-col items-center justify-center py-2 rounded transition-all duration-300 font-display"
        :class="getTabClass(tab)"
      >
        <span class="text-[10px] font-semibold tracking-[0.15em] uppercase">{{ tab === 'green' ? 'Zero' : tab }}</span>
        <span class="text-[9px] mt-0.5 opacity-70 tabular-nums">{{ getUserBetForColor(tab) }}</span>
      </button>
    </div>

    <!-- Betting Sections Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-2">

      <!-- RED Section -->
      <div
        class="card-elegant p-2 transition-all duration-500"
        :class="[getSectionClass('red'), { 'hidden lg:block': activeTab !== 'red' }]"
      >
        <!-- Gold accent line -->
        <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-ruby/50 to-transparent"></div>

        <!-- Header Row -->
        <div class="flex gap-1.5 h-14 mb-2">
          <!-- Main Color Button -->
          <button
            @click="handlePlaceBet('color', COLORS.RED)"
            class="flex-1 btn-ruby rounded flex flex-col items-center justify-center relative overflow-hidden group"
            :class="{ 'opacity-60 cursor-not-allowed': !isLoggedIn || isAdmin || isSpinning }"
            :disabled="!isLoggedIn || isAdmin || isSpinning"
          >
            <span class="text-base font-display tracking-[0.2em]">RED</span>
            <span v-if="getUserBetOnTarget('color', 'red')" class="text-[10px] text-gold font-semibold mt-0.5">
              {{ getUserBetOnTarget("color", "red") }}
            </span>
            <!-- Shine effect -->
            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
          </button>

          <!-- Number Buttons -->
          <div class="flex-[2] grid grid-cols-7 gap-0.5">
            <button
              v-for="num in getNumbersByColor(COLORS.RED)"
              :key="num"
              @click="handlePlaceBet('number', num)"
              class="h-full rounded flex flex-col items-center justify-center transition-all duration-300 font-display text-sm"
               :class="[getNumberClass(num), { 'opacity-60 cursor-not-allowed': !isLoggedIn || isAdmin || isSpinning }]"
               :disabled="!isLoggedIn || isAdmin || isSpinning"
            >
              <span class="font-medium">{{ num }}</span>
              <span v-if="getUserBetOnTarget('number', num) > 0" class="text-[8px] text-gold font-semibold">
                {{ getUserBetOnTarget("number", num) }}
              </span>
            </button>
          </div>
        </div>

        <!-- Stats Row -->
        <div class="grid grid-cols-3 gap-1 mb-2">
          <div class="bg-surface/50 rounded p-1.5 flex flex-col items-center border border-gold/5">
            <span class="text-[8px] text-muted-foreground font-display tracking-[0.2em] uppercase">Users</span>
            <span class="text-xs font-display font-semibold text-cream tabular-nums">{{ getUniqueUsersCountForColor("red") }}</span>
          </div>
          <div class="bg-surface/50 rounded p-1.5 flex flex-col items-center border border-gold/5">
            <span class="text-[8px] text-muted-foreground font-display tracking-[0.2em] uppercase">Total</span>
            <span class="text-xs font-display font-semibold text-cream tabular-nums">{{ getTotalBetForColor("red") }}</span>
          </div>
          <div class="bg-surface/50 rounded p-1.5 flex flex-col items-center border border-ruby/20">
            <span class="text-[8px] text-muted-foreground font-display tracking-[0.2em] uppercase">You</span>
            <span class="text-xs font-display font-semibold text-ruby-light tabular-nums">{{ getUserBetForColor("red") }}</span>
          </div>
        </div>

        <!-- User Cards -->
        <div class="grid grid-cols-4 gap-1">
          <div
            v-for="(user, i) in getAggregatedBetsForColor('red')"
            :key="user.userId || i"
            class="bg-surface/30 rounded p-1.5 flex flex-col items-center gap-0.5 border border-gold/5 hover:border-ruby/30 transition-all duration-300 group"
          >
            <div class="w-6 h-6 rounded bg-gradient-to-br from-ruby/30 to-ruby/10 flex items-center justify-center border border-ruby/30 text-[8px] font-display font-semibold text-ruby-light">
              {{ (user.username || 'U').substring(0, 2).toUpperCase() }}
            </div>
            <span class="text-[8px] text-muted-foreground font-medium truncate w-full text-center">{{ user.username || "User" }}</span>
            <span class="text-[9px] font-display font-semibold text-ruby-light tabular-nums">{{ user.amount }}</span>
          </div>
        </div>
      </div>

      <!-- GREEN Section -->
      <div
        class="card-elegant p-2 transition-all duration-500"
        :class="[getSectionClass('green'), { 'hidden lg:block': activeTab !== 'green' }]"
      >
        <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald/50 to-transparent"></div>

        <!-- Header Row -->
        <div class="grid grid-cols-3 gap-1.5 h-14 mb-2">
          <!-- Even Button -->
          <button
            @click="handlePlaceBet('type', 'even')"
            class="rounded flex flex-col items-center justify-center transition-all duration-300 font-display text-xs border"
            :class="[getEvenOddClass('even'), { 'opacity-60 cursor-not-allowed': !isLoggedIn || isAdmin || isSpinning }]"
            :disabled="!isLoggedIn || isAdmin || isSpinning"
          >
            <span class="tracking-[0.15em] uppercase font-semibold">Even</span>
            <span v-if="getUserBetOnTarget('type', 'even') > 0" class="text-[9px] text-gold font-semibold">
              {{ getUserBetOnTarget("type", "even") }}
            </span>
          </button>

          <!-- Zero Button -->
          <button
            @click="handlePlaceBet('number', 0)"
            class="btn-emerald rounded flex flex-col items-center justify-center relative overflow-hidden group"
            :class="{ 'opacity-60 cursor-not-allowed': !isLoggedIn || isAdmin || isSpinning }"
            :disabled="!isLoggedIn || isAdmin || isSpinning"
          >
            <span class="text-xl font-display font-semibold">0</span>
            <span v-if="getUserBetOnTarget('number', 0) > 0" class="text-[9px] text-gold font-semibold">
              {{ getUserBetOnTarget("number", 0) }}
            </span>
            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
          </button>

          <!-- Odd Button -->
          <button
            @click="handlePlaceBet('type', 'odd')"
            class="rounded flex flex-col items-center justify-center transition-all duration-300 font-display text-xs border"
            :class="[getEvenOddClass('odd'), { 'opacity-60 cursor-not-allowed': !isLoggedIn || isAdmin || isSpinning }]"
            :disabled="!isLoggedIn || isAdmin || isSpinning"
          >
            <span class="tracking-[0.15em] uppercase font-semibold">Odd</span>
            <span v-if="getUserBetOnTarget('type', 'odd') > 0" class="text-[9px] text-gold font-semibold">
              {{ getUserBetOnTarget("type", "odd") }}
            </span>
          </button>
        </div>

        <!-- Stats Row -->
        <div class="grid grid-cols-3 gap-1 mb-2">
          <div class="bg-surface/50 rounded p-1.5 flex flex-col items-center border border-gold/5">
            <span class="text-[8px] text-muted-foreground font-display tracking-[0.2em] uppercase">Users</span>
            <span class="text-xs font-display font-semibold text-cream tabular-nums">{{ getUniqueUsersCountForColor("green") }}</span>
          </div>
          <div class="bg-surface/50 rounded p-1.5 flex flex-col items-center border border-gold/5">
            <span class="text-[8px] text-muted-foreground font-display tracking-[0.2em] uppercase">Total</span>
            <span class="text-xs font-display font-semibold text-cream tabular-nums">{{ getTotalBetForColor("green") }}</span>
          </div>
          <div class="bg-surface/50 rounded p-1.5 flex flex-col items-center border border-emerald/20">
            <span class="text-[8px] text-muted-foreground font-display tracking-[0.2em] uppercase">You</span>
            <span class="text-xs font-display font-semibold text-emerald tabular-nums">{{ getUserBetForColor("green") }}</span>
          </div>
        </div>

        <!-- User Cards -->
        <div class="grid grid-cols-4 gap-1">
          <div
            v-for="(user, i) in getAggregatedBetsForColor('green')"
            :key="user.userId || i"
            class="bg-surface/30 rounded p-1.5 flex flex-col items-center gap-0.5 border border-gold/5 hover:border-emerald/30 transition-all duration-300"
          >
            <div class="w-6 h-6 rounded bg-gradient-to-br from-emerald/30 to-emerald/10 flex items-center justify-center border border-emerald/30 text-[8px] font-display font-semibold text-emerald">
              {{ (user.username || 'U').substring(0, 2).toUpperCase() }}
            </div>
            <span class="text-[8px] text-muted-foreground font-medium truncate w-full text-center">{{ user.username || "User" }}</span>
            <span class="text-[9px] font-display font-semibold text-emerald tabular-nums">{{ user.amount }}</span>
          </div>
        </div>
      </div>

      <!-- BLACK Section -->
      <div
        class="card-elegant p-2 transition-all duration-500"
        :class="[getSectionClass('black'), { 'hidden lg:block': activeTab !== 'black' }]"
      >
        <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-royal/70 to-transparent"></div>

        <!-- Header Row -->
        <div class="flex gap-1.5 h-14 mb-2">
          <!-- Main Color Button -->
          <button
            @click="handlePlaceBet('color', COLORS.BLACK)"
            class="flex-1 btn-royal rounded flex flex-col items-center justify-center relative overflow-hidden group"
            :class="{ 'opacity-60 cursor-not-allowed': !isLoggedIn || isAdmin || isSpinning }"
            :disabled="!isLoggedIn || isAdmin || isSpinning"
          >
            <span class="text-base font-display tracking-[0.2em]">BLACK</span>
            <span v-if="getUserBetOnTarget('color', 'black')" class="text-[10px] text-gold font-semibold mt-0.5">
              {{ getUserBetOnTarget("color", "black") }}
            </span>
            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
          </button>

          <!-- Number Buttons -->
          <div class="flex-[2] grid grid-cols-7 gap-0.5">
            <button
              v-for="num in getNumbersByColor(COLORS.BLACK)"
              :key="num"
              @click="handlePlaceBet('number', num)"
              class="h-full rounded flex flex-col items-center justify-center transition-all duration-300 font-display text-sm"
               :class="[getNumberClass(num), { 'opacity-60 cursor-not-allowed': !isLoggedIn || isAdmin || isSpinning }]"
               :disabled="!isLoggedIn || isAdmin || isSpinning"
            >
              <span class="font-medium">{{ num }}</span>
              <span v-if="getUserBetOnTarget('number', num) > 0" class="text-[8px] text-gold font-semibold">
                {{ getUserBetOnTarget("number", num) }}
              </span>
            </button>
          </div>
        </div>

        <!-- Stats Row -->
        <div class="grid grid-cols-3 gap-1 mb-2">
          <div class="bg-surface/50 rounded p-1.5 flex flex-col items-center border border-gold/5">
            <span class="text-[8px] text-muted-foreground font-display tracking-[0.2em] uppercase">Users</span>
            <span class="text-xs font-display font-semibold text-cream tabular-nums">{{ getUniqueUsersCountForColor("black") }}</span>
          </div>
          <div class="bg-surface/50 rounded p-1.5 flex flex-col items-center border border-gold/5">
            <span class="text-[8px] text-muted-foreground font-display tracking-[0.2em] uppercase">Total</span>
            <span class="text-xs font-display font-semibold text-cream tabular-nums">{{ getTotalBetForColor("black") }}</span>
          </div>
          <div class="bg-surface/50 rounded p-1.5 flex flex-col items-center border border-royal/30">
            <span class="text-[8px] text-muted-foreground font-display tracking-[0.2em] uppercase">You</span>
            <span class="text-xs font-display font-semibold text-cream tabular-nums">{{ getUserBetForColor("black") }}</span>
          </div>
        </div>

        <!-- User Cards -->
        <div class="grid grid-cols-4 gap-1">
          <div
            v-for="(user, i) in getAggregatedBetsForColor('black')"
            :key="user.userId || i"
            class="bg-surface/30 rounded p-1.5 flex flex-col items-center gap-0.5 border border-gold/5 hover:border-royal/40 transition-all duration-300"
          >
            <div class="w-6 h-6 rounded bg-gradient-to-br from-royal/50 to-royal/20 flex items-center justify-center border border-royal/40 text-[8px] font-display font-semibold text-cream">
              {{ (user.username || 'U').substring(0, 2).toUpperCase() }}
            </div>
            <span class="text-[8px] text-muted-foreground font-medium truncate w-full text-center">{{ user.username || "User" }}</span>
            <span class="text-[9px] font-display font-semibold text-cream tabular-nums">{{ user.amount }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useBettingBoard } from "../composables/useBettingBoard";
import { getNumbersByColor, COLORS } from "../constants/game";
import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const activeTab = ref('red');

const isAdmin = computed(() => authStore.user && authStore.user.role === 'admin');

const props = defineProps({
  bets: { type: Array, default: () => [] },
  lastResult: { type: Object, default: null },
  isLoggedIn: { type: Boolean, default: false },
  isSpinning: { type: Boolean, default: false }
});

const emit = defineEmits(["place-bet"]);

const handlePlaceBet = (type, value) => {
  if (!props.isLoggedIn) {
    authStore.openLoginModal();
    return;
  }
  if (props.isSpinning) return;
  if (isAdmin.value) return;
  emit('place-bet', type, value);
};

const {
  getBetAmount,
  getUserBetOnTarget,
  getBetsForColor,
  getTotalBetForColor,
  getUniqueUsersCountForColor,
  getAggregatedBetsForColor,
  getUserBetForColor,
  getSectionClass,
  getNumberClass,
  getEvenOddClass
} = useBettingBoard(props, emit);

// Tab styling helper
const getTabClass = (tab) => {
  const isActive = activeTab.value === tab;
  const base = 'border';

  if (tab === 'red') {
    return isActive
      ? `${base} bg-ruby/20 text-ruby-light border-ruby/40 shadow-[0_0_15px_rgba(155,17,30,0.2)]`
      : `${base} border-transparent text-muted-foreground hover:bg-ruby/5`;
  }
  if (tab === 'green') {
    return isActive
      ? `${base} bg-emerald/20 text-emerald border-emerald/40 shadow-[0_0_15px_rgba(46,139,87,0.2)]`
      : `${base} border-transparent text-muted-foreground hover:bg-emerald/5`;
  }
  if (tab === 'black') {
    return isActive
      ? `${base} bg-royal/30 text-cream border-royal/50 shadow-[0_0_15px_rgba(74,63,107,0.25)]`
      : `${base} border-transparent text-muted-foreground hover:bg-royal/10`;
  }
  return base;
};
</script>
