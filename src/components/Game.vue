<template>
  <div class="flex flex-col items-center w-full max-w-6xl mx-auto">
    
    <!-- Game Area -->
    <!-- Game Area -->
    <div class="w-full relative flex flex-col gap-6">
        
        <!-- Top Section: Wheel (60%) and History (40%) -->
        <div class="flex flex-col lg:flex-row gap-6 items-start">
            <div class="w-full lg:w-[60%] bg-[#1a1a1a]/50 rounded-2xl border border-[#2a2a2a] p-4 relative min-h-[350px] flex items-center justify-center">
                <RouletteWheel 
                    :rotation="rotation" 
                    :transition-duration="transitionDuration"
                    :status="status"
                    :time-left="timeLeft"
                    :last-result="lastResult"
                />
            </div>
            <div class="w-full lg:w-[40%] bg-[#1a1a1a]/50 rounded-2xl border border-[#2a2a2a] p-4 h-full min-h-[350px]">
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
        
        <!-- ActiveBets removed as it will be integrated into BettingBoard -->
    </div>

    <!-- Result Modal -->
    <!-- Result Modal Removed -->

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useAuthStore } from "../stores/auth";
import api from "../services/api";
import socket from "../services/socket";
import RouletteWheel from "./RouletteWheel.vue";
import HistoryBar from "./HistoryBar.vue";
import BettingControls from "./BettingControls.vue";
import BettingBoard from "./BettingBoard.vue";
import ActiveBets from "./ActiveBets.vue";

const authStore = useAuthStore();

// State
const bets = ref([]);
const isSpinning = ref(false);
const rotation = ref(0);
const lastResult = ref(null);
const winnings = ref(0);
const spinHistory = ref([]);
const currentBetAmount = ref(0);
const transitionDuration = ref(0);
const status = ref('');
const timeLeft = ref(0);
let spinInterval = null;

const SEGMENT_ANGLE = 360 / 15;
const SEGMENTS = [
  { number: 0, color: "green" },
  { number: 1, color: "red" },
  { number: 8, color: "black" },
  { number: 2, color: "red" },
  { number: 9, color: "black" },
  { number: 3, color: "red" },
  { number: 10, color: "black" },
  { number: 4, color: "red" },
  { number: 11, color: "black" },
  { number: 5, color: "red" },
  { number: 12, color: "black" },
  { number: 6, color: "red" },
  { number: 13, color: "black" },
  { number: 7, color: "red" },
  { number: 14, color: "black" },
];

// Computed
const totalBetAmount = computed(() => bets.value.reduce((sum, b) => sum + b.amount, 0));

// Methods
const getColorClass = (color) => {
    switch(color) {
        case 'red': return 'bg-[#e50914] border-[#ff1f2b] text-white';
        case 'black': return 'bg-[#252525] border-[#444] text-gray-300';
        case 'green': return 'bg-[#00c74d] border-[#00e057] text-white';
        default: return 'bg-gray-800';
    }
};

const handlePlaceBet = (type, value) => {
    if (isSpinning.value) return;
    if (currentBetAmount.value <= 0) {
        // alert("Please enter a bet amount");
        return;
    }
    
    const balance = authStore.user?.balance || 0;
    if (balance < totalBetAmount.value + currentBetAmount.value) {
        alert("Insufficient balance!");
        return;
    }

    // Add to existing bet if matches
    const existing = bets.value.find(b => b.type === type && b.value === value);
    if (existing) {
        existing.amount += currentBetAmount.value;
    } else {
        bets.value.push({ 
            type, 
            value, 
            amount: currentBetAmount.value,
            username: authStore.user?.username 
        });
    }

    // Send bet to server
    socket.emit('placeBet', { type, value, amount: currentBetAmount.value }, (response) => {
        if (response.error) {
            alert(response.error);
            // Revert local bet if failed?
            // For now, we rely on server state update to sync bets
        } else {
            // Success
        }
    });
};

const clearBets = () => {
    if (isSpinning.value) return;
    bets.value = [];
};

const spin = async () => {
  // Manual spin removed. Controlled by server.
};

onMounted(() => {
    socket.connect();

    socket.on('gameState', (data) => {
        bets.value = data.bets;
        spinHistory.value = data.history;
        
        if (data.state === 'WAITING') {
            status.value = 'ROLLING IN';
            isSpinning.value = false;
            lastResult.value = null;
            winnings.value = 0;
            
            // Smooth Timer Logic
            // Calculate expected end time based on server report
            const newEndTime = Date.now() + (data.timeLeft * 1000);
            
            // Only update our local end time if it's significantly different (drift > 200ms)
            // or if we don't have one yet.
            if (!endTime || Math.abs(newEndTime - endTime) > 200) {
                endTime = newEndTime;
            }
            
            // Start local ticker if not running
            if (!spinInterval) {
                spinInterval = setInterval(() => {
                    const remaining = Math.max(0, (endTime - Date.now()) / 1000);
                    timeLeft.value = remaining;
                    if (remaining <= 0) {
                        // Timer finished
                    }
                }, 16); // ~60fps
            }
            
        } else if (data.state === 'SPINNING') {
            status.value = 'ROLLING...';
            isSpinning.value = true;
            if (spinInterval) {
                clearInterval(spinInterval);
                spinInterval = null;
            }
        } else if (data.state === 'RESULT') {
            status.value = 'RESULT';
            isSpinning.value = false;
            if (spinInterval) {
                clearInterval(spinInterval);
                spinInterval = null;
            }
        }
    });

    socket.on('spinResult', (data) => {
        handleSpin(data.result, data.duration);
    });
});

// State for timer
let endTime = 0;

onUnmounted(() => {
    socket.disconnect();
});

const handleSpin = async (result, duration) => {
  isSpinning.value = true;
  lastResult.value = null;
  winnings.value = 0;
  
  // Start continuous spinning
  transitionDuration.value = 0;
  
  const animateSpin = () => {
    rotation.value += 15; 
    spinInterval = requestAnimationFrame(animateSpin);
  };
  animateSpin();

  // Calculate rotation to land on the result
  const resultIndex = SEGMENTS.findIndex(s => s.number === result.number);
  
  // Wait a bit for visual effect (server gives us duration)
  // We should start deceleration such that we land exactly when duration ends?
  // Or just use the duration for the transition.
  
  // Let's stop continuous spin immediately and start the target transition
  if (spinInterval) cancelAnimationFrame(spinInterval);
  
  // Force reflow
  await new Promise(r => requestAnimationFrame(r));

  transitionDuration.value = duration; 
  
  const randomOffset = 0.5 + (Math.random() * 0.8 - 0.4); 
  const targetAngle = (resultIndex + randomOffset) * SEGMENT_ANGLE;
  
  const currentRot = rotation.value;
  const extraSpins = 5 * 360; 
  
  const targetRotationMod = (180 - targetAngle);
  const currentMod = currentRot % 360;
  
  let diff = targetRotationMod - currentMod;
  while (diff < 0) diff += 360;
  
  const finalRotation = currentRot + extraSpins + diff;

  rotation.value = finalRotation;

  setTimeout(() => {
      lastResult.value = result;
      // Winnings are calculated by server and updated in balance via authStore refresh or socket event
      // We can calculate locally for display
      const myBets = bets.value.filter(b => b.userId === authStore.user?.id);
      let totalWinnings = 0;
      for (const bet of myBets) {
          if (bet.type === "number" && bet.value === result.number) {
              totalWinnings += bet.amount * 14;
          } else if (bet.type === "color" && bet.value === result.color) {
              totalWinnings += bet.amount * 2;
          } else if (bet.type === "type") {
              if (bet.value === "even" && result.number !== 0 && result.number % 2 === 0) {
                  totalWinnings += bet.amount * 2;
              } else if (bet.value === "odd" && result.number !== 0 && result.number % 2 !== 0) {
                  totalWinnings += bet.amount * 2;
              }
          }
      }
      winnings.value = totalWinnings;
      
      // Update balance from store (should be updated by server side socket event or we fetch it)
      // Ideally server sends 'balanceUpdate' event
      if (authStore.user) {
          // Optimistic update or fetch
          authStore.user.balance += totalWinnings;
      }
  }, duration);
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
