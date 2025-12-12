<template>
  <div class="flex flex-col items-center w-full">
    
    <!-- Pending Approval Banner -->
    <div 
      v-if="authStore.pendingStatus === 'pending'" 
      class="w-full mb-4 p-4 rounded-lg bg-yellow-500/20 border border-yellow-500/50 text-yellow-500"
    >
      <div class="flex items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p class="font-bold">Account Pending Approval</p>
          <p class="text-sm text-yellow-500/80">Your account is waiting for admin approval. You can browse but cannot place bets yet.</p>
        </div>
      </div>
    </div>

    <!-- Rejected Banner -->
    <div 
      v-if="authStore.pendingStatus === 'rejected'" 
      class="w-full mb-4 p-4 rounded-lg bg-red-500/20 border border-red-500/50 text-red-500"
    >
      <div class="flex items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p class="font-bold">Account Rejected</p>
          <p class="text-sm text-red-500/80">Your account registration was rejected. Please contact support for more information.</p>
        </div>
      </div>
    </div>

    <!-- Game Area -->
    <div class="w-full relative flex flex-col gap-2 lg:gap-4">
        
        <!-- Top Section: Wheel (60%) and Right Panel (40%) -->
        <div class="flex flex-col lg:flex-row gap-2 lg:gap-4 items-stretch">
            <!-- Left: Wheel -->
            <Card 
                class="w-full lg:w-[60%] p-1 sm:p-4 relative min-h-[180px] sm:min-h-[300px] md:min-h-[350px] flex items-center justify-center transition-all duration-500"
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
                class="w-full lg:w-[40%] flex flex-col gap-2 lg:gap-4 transition-all duration-500"
                :class="{ 'opacity-30 pointer-events-none blur-[1px]': isSpinning }"
            >
                <!-- History Section (Mobile) -->
                <div class="lg:hidden bg-secondary/30 rounded-lg p-1 sm:p-2 flex items-center gap-2 sm:gap-3 overflow-hidden border border-border/50">
                    <h3 class="text-muted-foreground font-bold uppercase tracking-widest text-[10px] sm:text-xs whitespace-nowrap pl-2">History</h3>
                    <HistoryBar :history="spinHistory" class="h-10 sm:h-12 flex-1" />
                </div>

                <!-- History Section (Desktop) -->
                <div class="hidden lg:flex bg-secondary/30 rounded-lg p-3 items-center gap-4 overflow-hidden border border-border/50">
                    <h3 class="text-muted-foreground font-bold uppercase tracking-widest text-xs whitespace-nowrap pl-2">History</h3>
                    <HistoryBar :history="spinHistory" class="h-14 flex-1" />
                </div>

                <!-- Betting Controls Section -->
                <Card class="p-2 sm:p-3 flex-1 flex flex-col">
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
                </Card>
            </div>
        </div>
        
        <!-- Bottom Section: Betting Board -->
        <div 
            class="transition-all duration-500"
            :class="{ 'pointer-events-none': isSpinning }"
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
import RouletteWheel from "../components/RouletteWheel.vue";
import HistoryBar from "../components/HistoryBar.vue";
import BettingControls from "../components/BettingControls.vue";
import BettingBoard from "../components/BettingBoard.vue";
import { Card } from "@/components/ui/card";
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
