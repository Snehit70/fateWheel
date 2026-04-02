<template>
  <div class="flex flex-col items-center w-full">

    <!-- Initial Loading State -->
    <div v-if="isInitialLoading" class="flex items-center justify-center min-h-[50vh]">
      <div class="text-center space-y-3">
        <div class="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p class="text-muted-foreground text-sm font-mono">Connecting to game...</p>
      </div>
    </div>

    <!-- Game Area -->
    <div v-else class="w-full relative flex flex-col gap-1 lg:gap-2">
        
        <!-- Top Section: Wheel (60%) and Right Panel (40%) -->
        <div class="flex flex-col lg:flex-row gap-1 lg:gap-2 items-stretch">
            <!-- Left: Wheel -->
            <Card 
                class="w-full lg:w-[60%] p-0 sm:p-2 relative min-h-[160px] sm:min-h-[250px] md:min-h-[300px] flex items-center justify-center transition-all duration-500"
                :class="{ 'ring-2 ring-yellow-500/20 shadow-[0_0_50px_rgba(255,215,0,0.1)]': isSpinning }"
            >
                <RouletteWheel 
                    :rotation="rotation" 
                    :transition-duration="transitionDuration"
                    :status="status"
                    :time-left="timeLeft"
                    :last-result="lastResult"
                />
            </Card>

            <!-- Right: History & Betting Controls -->
            <div 
                class="w-full lg:w-[40%] flex flex-col gap-1 lg:gap-2 transition-all duration-500"
                :class="{ 'opacity-30 pointer-events-none blur-[1px]': isSpinning }"
            >
                <!-- History Section (Mobile) -->
                <div class="lg:hidden bg-secondary/30 rounded-lg p-1 flex items-center gap-1 sm:gap-2 overflow-hidden border border-border/50">
                    <h3 class="text-muted-foreground font-bold uppercase tracking-widest text-[10px] sm:text-xs whitespace-nowrap pl-1">History</h3>
                    <HistoryBar :history="spinHistory" class="h-8 sm:h-10 flex-1" />
                </div>

                <!-- History Section (Desktop) -->
                <div class="hidden lg:flex bg-secondary/30 rounded-lg p-2 items-center gap-2 overflow-hidden border border-border/50">
                    <h3 class="text-muted-foreground font-bold uppercase tracking-widest text-xs whitespace-nowrap pl-1">History</h3>
                    <HistoryBar :history="spinHistory" class="h-10 flex-1" />
                </div>

                <!-- Betting Controls Section -->
                <Card class="p-1 sm:p-2 flex-1 flex flex-col">
                     <BettingControls 
                        :balance="authStore.user?.balance || 0"
                        :is-logged-in="!!authStore.user"
                        :is-spinning="isSpinning || isLocking || status === 'RESULT'"
                        :total-bet="totalBetAmount"
                        v-model:amount="currentBetAmount"
                         @clear-input="currentBetAmount = 0"
                         @clear-bets="clearBets"
                    />
                </Card>
            </div>
        </div>
        
        <!-- Bottom Section: Betting Board -->
        <div 
            class="transition-all duration-500"
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

    <!-- Result Modal -->
    <!-- Result Modal Removed -->

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
import { Card } from "@/components/ui/card";
import { useGameLogic } from "../composables/useGameLogic";
import { useBetting } from "../composables/useBetting";

const authStore = useAuthStore();
const gameStore = useGameStore();

// Animation-only composable
const { rotation, transitionDuration } = useGameLogic();

// Betting composable (wraps game store)
const {
    currentBetAmount,
    totalBetAmount,
    handlePlaceBet,
    clearBets
} = useBetting();

// Read reactive state from game store
const bets = computed(() => gameStore.bets);
const isSpinning = computed(() => gameStore.isSpinning);
const isLocking = computed(() => gameStore.isLocking);
const lastResult = computed(() => gameStore.lastResult);
const spinHistory = computed(() => gameStore.spinHistory);
const status = computed(() => gameStore.status);
const timeLeft = computed(() => gameStore.timeLeft);
const isInitialLoading = computed(() => gameStore.isInitialLoading);
</script>

<style scoped>
.pop-enter-active,
.pop-leave-active {
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
</style>
