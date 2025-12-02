<template>
  <div class="flex flex-col items-center w-full">
    
    <!-- Game Area -->
    <div class="w-full relative flex flex-col gap-6">
        
        <!-- Top Section: Wheel (60%) and Right Panel (40%) -->
        <div class="flex flex-col lg:flex-row gap-6 items-stretch">
            <!-- Left: Wheel -->
            <div 
                class="w-full lg:w-[60%] bg-secondary/50 rounded-2xl border border-glass-border p-4 relative min-h-[450px] flex items-center justify-center transition-all duration-500"
                :class="{ 'ring-2 ring-yellow-500/20 shadow-[0_0_50px_rgba(255,215,0,0.1)]': isSpinning }"
            >
                <RouletteWheel 
                    :rotation="rotation" 
                    :transition-duration="transitionDuration"
                    :status="status"
                    :time-left="timeLeft"
                    :last-result="lastResult"
                />
            </div>

            <!-- Right: History & Betting Controls -->
            <div 
                class="w-full lg:w-[40%] flex flex-col gap-6 transition-all duration-500"
                :class="{ 'opacity-30 pointer-events-none blur-[1px]': isSpinning }"
            >
                <!-- History Section -->
                <div class="bg-secondary/50 rounded-2xl border border-glass-border p-4 flex-1 min-h-[200px]">
                    <h3 class="text-gray-400 font-bold uppercase tracking-widest text-xs mb-3">History</h3>
                    <HistoryBar :history="spinHistory" />
                </div>

                <!-- Betting Controls Section -->
                <div class="bg-secondary/50 rounded-2xl border border-glass-border p-4">
                     <BettingControls 
                        :balance="authStore.user?.balance || 0"
                        :is-logged-in="!!authStore.user"
                        :is-spinning="isSpinning"
                        :total-bet="totalBetAmount"
                        v-model:amount="currentBetAmount"
                        @clear-input="currentBetAmount = 0"
                        @clear-bets="clearBets"
                        @spin="spin"
                    />
                </div>
            </div>
        </div>
        
        <!-- Bottom Section: Betting Board -->
        <div 
            class="transition-all duration-500"
            :class="{ 'opacity-50 blur-[2px] pointer-events-none': isSpinning }"
        >
            <BettingBoard 
                :bets="bets"
                :last-result="lastResult"
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
import RouletteWheel from "./RouletteWheel.vue";
import HistoryBar from "./HistoryBar.vue";
import BettingControls from "./BettingControls.vue";
import BettingBoard from "./BettingBoard.vue";
import { useGameLogic } from "../composables/useGameLogic";
import { useBetting } from "../composables/useBetting";

const authStore = useAuthStore();

// Composables
const { 
    bets, 
    isSpinning, 
    rotation, 
    lastResult, 
    spinHistory, 
    status, 
    timeLeft, 
    transitionDuration 
} = useGameLogic();

const { 
    currentBetAmount, 
    totalBetAmount, 
    handlePlaceBet, 
    clearBets 
} = useBetting(bets, isSpinning);

// Spin method is handled by server/socket events in useGameLogic
const spin = () => {
    // Placeholder if needed for manual trigger, but currently server-driven
};
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
