<template>
  <div class="flex flex-col items-center w-full">
    <!-- Initial Loading State -->
    <div v-if="isInitialLoading" class="flex items-center justify-center min-h-[60vh]">
      <div class="text-center space-y-4">
        <div class="relative w-16 h-16 mx-auto">
          <!-- Outer ring -->
          <div class="absolute inset-0 rounded-full border-2 border-gold/20"></div>
          <!-- Spinning ring -->
          <div class="absolute inset-0 rounded-full border-2 border-transparent border-t-gold animate-spin"></div>
          <!-- Inner glow -->
          <div class="absolute inset-2 rounded-full bg-gold/5"></div>
        </div>
        <p class="text-muted-foreground text-sm font-display tracking-[0.2em] uppercase animate-pulse">
          Connecting
        </p>
      </div>
    </div>

    <!-- Game Area -->
    <div v-else class="w-full relative flex flex-col gap-2 animate-fade-up">

      <!-- Top Section: Wheel and Controls -->
      <div class="flex flex-col lg:flex-row gap-2 items-stretch">

        <!-- Left: Wheel Container -->
        <div
          class="w-full lg:w-[60%] card-elegant p-0 sm:p-3 relative min-h-[180px] sm:min-h-[280px] md:min-h-[340px] flex items-center justify-center transition-all duration-500 animate-fade-up stagger-1 panel-sheen"
          :class="{ 'shadow-[0_0_60px_rgba(212,175,55,0.15)]': isSpinning }"
        >
          <!-- Decorative corner accents -->
          <div class="absolute top-2 left-2 w-4 h-4 border-l border-t border-gold/30 hidden sm:block"></div>
          <div class="absolute top-2 right-2 w-4 h-4 border-r border-t border-gold/30 hidden sm:block"></div>
          <div class="absolute bottom-2 left-2 w-4 h-4 border-l border-b border-gold/30 hidden sm:block"></div>
          <div class="absolute bottom-2 right-2 w-4 h-4 border-r border-b border-gold/30 hidden sm:block"></div>

          <RouletteWheel
            :rotation="rotation"
            :transition-duration="transitionDuration"
            :status="status"
            :time-left="timeLeft"
            :last-result="lastResult"
          />
        </div>

        <!-- Right: History & Controls -->
        <div
          class="w-full lg:w-[40%] flex flex-col gap-2 transition-all duration-500 animate-fade-up stagger-2"
          :class="{ 'opacity-40 pointer-events-none blur-[1px]': isSpinning }"
        >
          <!-- History Section -->
          <div class="card-elegant p-2 sm:p-3">
            <div class="flex items-center gap-3 overflow-hidden">
              <div class="flex items-center gap-2 flex-shrink-0">
                <div class="h-px w-3 bg-gradient-to-r from-gold/50 to-transparent hidden sm:block"></div>
                <h3 class="text-muted-foreground font-display font-semibold tracking-[0.2em] text-[10px] sm:text-xs uppercase whitespace-nowrap">
                  History
                </h3>
              </div>
              <HistoryBar :history="spinHistory" class="h-10 sm:h-12 flex-1" />
            </div>
          </div>

          <!-- Betting Controls -->
          <div class="card-elegant p-2 sm:p-3 flex-1 flex flex-col">
            <BettingControls
              :balance="authStore.user?.balance || 0"
              :is-logged-in="!!authStore.user"
              :is-spinning="isSpinning || isLocking || status === 'RESULT'"
              :total-bet="totalBetAmount"
              v-model:amount="currentBetAmount"
              @clear-input="currentBetAmount = 0"
              @clear-bets="clearBets"
            />
          </div>
        </div>
      </div>

      <!-- Bottom Section: Betting Board -->
      <div
        class="transition-all duration-500 animate-fade-up stagger-3"
        :class="{ 'pointer-events-none': isSpinning || isLocking || status === 'RESULT' }"
      >
        <BettingBoard
          :bets="bets"
          :last-result="lastResult"
          :is-logged-in="!!authStore.user"
          @place-bet="handlePlaceBet"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useAuthStore } from "../stores/auth";
import { useGameStore } from "../stores/game";
import RouletteWheel from "../components/RouletteWheel.vue";
import HistoryBar from "../components/HistoryBar.vue";
import BettingControls from "../components/BettingControls.vue";
import BettingBoard from "../components/BettingBoard.vue";
import { useGameLogic } from "../composables/useGameLogic";
import { useBetting } from "../composables/useBetting";

const authStore = useAuthStore();
const gameStore = useGameStore();

const { rotation, transitionDuration } = useGameLogic();

const {
  currentBetAmount,
  totalBetAmount,
  handlePlaceBet,
  clearBets
} = useBetting();

const bets = computed(() => gameStore.bets);
const isSpinning = computed(() => gameStore.isSpinning);
const isLocking = computed(() => gameStore.isLocking);
const lastResult = computed(() => gameStore.lastResult);
const spinHistory = computed(() => gameStore.spinHistory);
const status = computed(() => gameStore.status);
const timeLeft = computed(() => gameStore.timeLeft);
const isInitialLoading = computed(() => gameStore.isInitialLoading);
</script>
