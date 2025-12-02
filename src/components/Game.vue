<template>
  <div class="flex flex-col items-center w-full max-w-6xl mx-auto">
    
    <!-- Game Area -->
    <!-- Game Area -->
    <div class="w-full relative flex flex-col gap-6">
        
        <!-- Top Section: Wheel (60%) and History (40%) -->
        <div class="flex flex-col lg:flex-row gap-6 items-start">
            <div class="w-full lg:w-[60%] bg-secondary/50 rounded-2xl border border-glass-border p-4 relative min-h-[350px] flex items-center justify-center">
                <RouletteWheel 
                    :rotation="rotation" 
                    :transition-duration="transitionDuration"
                    :status="status"
                    :time-left="timeLeft"
                    :last-result="lastResult"
                />
            </div>
            <div class="w-full lg:w-[40%] bg-secondary/50 rounded-2xl border border-glass-border p-4 h-full min-h-[350px]">
                <h3 class="text-gray-400 font-bold uppercase tracking-widest text-sm mb-4">Last 100 Rounds</h3>
                <HistoryBar :history="spinHistory" />
            </div>
        </div>
        
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
        
        <BettingBoard 
            :bets="bets"
            :last-result="lastResult"
            @place-bet="handlePlaceBet"
        />
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
