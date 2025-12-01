<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white font-sans">
    <div class="mb-4 text-2xl font-bold text-yellow-400">
      Balance: ${{ authStore.user?.balance || 0 }}
    </div>

    <div class="relative mb-8">
      <!-- Pointer -->
      <div class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[20px] border-t-yellow-500"></div>

      <!-- Wheel -->
      <div 
        class="w-80 h-80 rounded-full border-4 border-gray-700 shadow-xl relative overflow-hidden transition-transform cubic-bezier(0.1, 0.8, 0.1, 1)"
        :style="{ transform: `rotate(${rotation}deg)`, transitionDuration: `${transitionDuration}ms` }"
      >
        <svg viewBox="0 0 100 100" class="w-full h-full transform -rotate-90">
          <g v-for="(segment, i) in SEGMENTS" :key="i">
            <path 
              :d="getSegmentPath(i)" 
              :fill="segment.color" 
              stroke="#374151" 
              stroke-width="0.5"
            />
            <text
              :x="getTextX(i)"
              :y="getTextY(i)"
              fill="white"
              font-size="5"
              text-anchor="middle"
              dominant-baseline="middle"
              :transform="getTextTransform(i)"
            >
              {{ segment.number }}
            </text>
          </g>
        </svg>
      </div>
    </div>

    <!-- Betting Controls -->
    <div class="flex flex-col gap-4 items-center w-full max-w-md px-4">
      <!-- Chip Selection -->
      <div class="flex gap-2 mb-2">
        <button 
          v-for="chip in CHIPS" 
          :key="chip.value"
          @click="selectedChip = chip.value"
          :class="[
            'w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-all',
            selectedChip === chip.value ? 'scale-110 ring-2 ring-yellow-400' : 'opacity-80',
            chip.colorClass
          ]"
        >
          {{ chip.value }}
        </button>
      </div>

      <!-- Betting Board -->
      <div class="w-full bg-gray-800 p-4 rounded-xl shadow-lg">
        <div class="grid grid-cols-7 gap-2 mb-4">
            <!-- Zero -->
            <button 
                @click="placeBet('number', 0)"
                class="col-span-7 bg-green-600 hover:bg-green-500 h-10 rounded flex items-center justify-center font-bold relative"
            >
                0
                <span v-if="getBetAmount('number', 0)" class="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {{ getBetAmount('number', 0) }}
                </span>
            </button>
            
            <!-- Numbers 1-14 -->
            <button 
                v-for="num in 14" 
                :key="num"
                @click="placeBet('number', num)"
                :class="[
                    'h-10 rounded flex items-center justify-center font-bold relative',
                    getColor(num) === 'red' ? 'bg-red-600 hover:bg-red-500' : 'bg-gray-900 hover:bg-gray-700'
                ]"
            >
                {{ num }}
                <span v-if="getBetAmount('number', num)" class="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {{ getBetAmount('number', num) }}
                </span>
            </button>
        </div>

        <div class="flex gap-4">
            <button 
                @click="placeBet('color', 'red')"
                class="flex-1 bg-red-600 hover:bg-red-500 h-12 rounded font-bold relative"
            >
                RED (x2)
                <span v-if="getBetAmount('color', 'red')" class="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {{ getBetAmount('color', 'red') }}
                </span>
            </button>
            <button 
                @click="placeBet('color', 'black')"
                class="flex-1 bg-gray-900 hover:bg-gray-700 h-12 rounded font-bold relative"
            >
                BLACK (x2)
                <span v-if="getBetAmount('color', 'black')" class="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {{ getBetAmount('color', 'black') }}
                </span>
            </button>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-4 w-full">
        <button 
            @click="clearBets"
            class="flex-1 bg-gray-600 hover:bg-gray-500 py-3 rounded-lg font-bold"
            :disabled="isSpinning"
        >
            Clear Bets
        </button>
        <button 
            @click="spin"
            class="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black py-3 rounded-lg font-bold text-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isSpinning || bets.length === 0"
        >
            {{ isSpinning ? 'Spinning...' : 'SPIN' }}
        </button>
      </div>
    </div>

    <!-- History -->
    <div class="mt-8 w-full max-w-md px-4">
      <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <div 
          v-for="(res, idx) in spinHistory" 
          :key="idx"
          :class="[
            'w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border-2',
            res.color === 'red' ? 'bg-red-600 border-red-400' : res.color === 'black' ? 'bg-gray-900 border-gray-600' : 'bg-green-600 border-green-400'
          ]"
        >
          {{ res.number }}
        </div>
        <div v-if="spinHistory.length === 0" class="text-xs text-gray-500 italic px-2">No history</div>
      </div>
    </div>

    <!-- Result Modal -->
    <div v-if="lastResult" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50" @click="lastResult = null">
        <div class="bg-gray-800 p-8 rounded-2xl text-center shadow-2xl border border-gray-600 transform scale-110" @click.stop>
            <h2 class="text-3xl font-bold mb-4">Result</h2>
            <div :class="[
                'w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold mx-auto mb-6 border-4',
                lastResult.color === 'red' ? 'bg-red-600 border-red-400' : lastResult.color === 'black' ? 'bg-gray-900 border-gray-600' : 'bg-green-600 border-green-400'
            ]">
                {{ lastResult.number }}
            </div>
            <p class="text-xl mb-2">
                You won: <span class="text-yellow-400 font-bold">${{ winnings }}</span>
            </p>
            <button @click="lastResult = null" class="mt-4 bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-lg font-bold">
                Close
            </button>
        </div>
    </div>

  </div>
</template>

<script setup>
import { ref } from "vue";
import { useAuthStore } from "../stores/auth";
import api from "../services/api";
import { useRouter } from "vue-router";

const authStore = useAuthStore();
const router = useRouter();

const bets = ref([]);
const isSpinning = ref(false);
const rotation = ref(0);
const lastResult = ref(null);
const winnings = ref(0);
const spinHistory = ref([]);

const selectedChip = ref(10);
const transitionDuration = ref(4000);
let spinInterval = null;

const CHIPS = [
  { value: 1, colorClass: "bg-gray-400 border-white text-gray-900" },
  { value: 5, colorClass: "bg-red-600 border-white text-white" },
  { value: 10, colorClass: "bg-blue-600 border-white text-white" },
  { value: 25, colorClass: "bg-green-600 border-white text-white" },
  { value: 100, colorClass: "bg-black border-white text-white" },
];

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

const SEGMENT_ANGLE = 360 / 15;

// SVG Helpers
const getSegmentPath = (i) => {
  const startAngle = i * SEGMENT_ANGLE;
  const endAngle = (i + 1) * SEGMENT_ANGLE;
  const x1 = 50 + 50 * Math.cos((Math.PI * startAngle) / 180);
  const y1 = 50 + 50 * Math.sin((Math.PI * startAngle) / 180);
  const x2 = 50 + 50 * Math.cos((Math.PI * endAngle) / 180);
  const y2 = 50 + 50 * Math.sin((Math.PI * endAngle) / 180);
  return `M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`;
};

const getTextX = (i) => 50 + 40 * Math.cos((Math.PI * (i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2)) / 180);
const getTextY = (i) => 50 + 40 * Math.sin((Math.PI * (i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2)) / 180);
const getTextTransform = (i) => `rotate(${90 + i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2}, ${getTextX(i)}, ${getTextY(i)})`;

const getColor = (num) => {
    if (num === 0) return 'green';
    if ([1, 2, 3, 4, 5, 6, 7].includes(num)) return 'red';
    return 'black';
};

// Betting Logic
const placeBet = (type, value) => {
    if (isSpinning.value) return;
    
    // Check balance locally (server will verify too)
    const currentTotal = bets.value.reduce((sum, b) => sum + b.amount, 0);
    if ((authStore.user?.balance || 0) < currentTotal + selectedChip.value) {
        alert("Insufficient balance!");
        return;
    }

    bets.value.push({ type, value, amount: selectedChip.value });
};

const getBetAmount = (type, value) => {
    return bets.value
        .filter(b => b.type === type && b.value === value)
        .reduce((sum, b) => sum + b.amount, 0);
};

const clearBets = () => {
    if (isSpinning.value) return;
    bets.value = [];
};

// Spin Logic
const spin = async () => {
  if (isSpinning.value || bets.value.length === 0) return;
  
  isSpinning.value = true;
  lastResult.value = null;
  winnings.value = 0;
  
  // Start continuous spinning
  transitionDuration.value = 0;
  const startTime = Date.now();
  
  const animateSpin = () => {
    rotation.value += 15; // Speed of continuous spin
    spinInterval = requestAnimationFrame(animateSpin);
  };
  animateSpin();

  try {
    // Call API
    const { data } = await api.post('/game/spin', { bets: bets.value });
    
    const { result, winnings: totalWinnings, balance } = data;
    
    // Update balance immediately or wait?
    // Let's update balance after animation to keep it consistent
    // But we need to update it in store eventually
    // For now, let's store the new balance to update later

    // Calculate rotation to land on the result
    const resultIndex = SEGMENTS.findIndex(s => s.number === result.number);
    
    // Stop continuous spin
    if (spinInterval) cancelAnimationFrame(spinInterval);
    
    // Ensure we've spun for at least a little bit (visual consistency)
    const elapsedTime = Date.now() - startTime;
    const minSpinTime = 1000; // Minimum 1 second of "fast" spinning
    if (elapsedTime < minSpinTime) {
       await new Promise(r => setTimeout(r, minSpinTime - elapsedTime));
    }

    // Enable transition for deceleration
    transitionDuration.value = 4000;
    
    // Force reflow to ensure transition applies
    await new Promise(r => requestAnimationFrame(r));

    // Calculate final target
    const randomOffset = 0.5 + (Math.random() * 0.8 - 0.4); 
    const targetAngle = (resultIndex + randomOffset) * SEGMENT_ANGLE;
    
    const currentRot = rotation.value;
    const extraSpins = 3 * 360;
    
    const targetRotationMod = (360 - targetAngle);
    const currentMod = currentRot % 360;
    
    let diff = targetRotationMod - currentMod;
    if (diff < 0) diff += 360;
    
    const finalRotation = currentRot + extraSpins + diff;

    rotation.value = finalRotation;

    // Wait for animation
    setTimeout(() => {
      lastResult.value = result;
      spinHistory.value.unshift(result);
      if (spinHistory.value.length > 10) spinHistory.value.pop();

      winnings.value = totalWinnings;
      authStore.updateBalance(balance); // Update store balance
      
      bets.value = [];
      isSpinning.value = false;
    }, 4000);

  } catch (error) {
    console.error("Spin error:", error);
    if (spinInterval) cancelAnimationFrame(spinInterval);
    alert(error.message);
    isSpinning.value = false;
  }
};
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
    display: none;
}
.scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>
