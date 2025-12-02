<template>
  <div class="w-full max-w-4xl mx-auto bg-[#1a1a1a] p-4 rounded-xl border border-[#2a2a2a] mb-8">
    <div class="flex flex-col md:flex-row gap-4 items-center">
        
        <!-- Balance / Input -->
        <div class="flex-1 w-full">
            <div class="flex justify-between text-xs text-gray-500 mb-1 font-bold uppercase tracking-wider">
                <span>Your Balance</span>
                <span>Your Bet</span>
            </div>
            <div class="flex items-center bg-[#0f0f13] rounded-lg border border-[#2a2a2a] p-1">
                <div class="px-3 py-2 text-white font-mono font-bold border-r border-[#2a2a2a]">
                    <span class="text-green-500">₹</span> {{ balance.toFixed(2) }}
                </div>
                <input 
                    type="number" 
                    v-model.number="betAmount"
                    class="flex-1 bg-transparent border-none text-white px-3 py-2 focus:ring-0 font-mono"
                    placeholder="0.00"
                >
                <div class="flex gap-1 px-1">
                    <button @click="setAmount('min')" class="px-2 py-1 text-[10px] bg-[#2a2a2a] hover:bg-[#333] text-gray-400 rounded uppercase font-bold transition-colors">Min</button>
                    <button @click="setAmount('half')" class="px-2 py-1 text-[10px] bg-[#2a2a2a] hover:bg-[#333] text-gray-400 rounded uppercase font-bold transition-colors">1/2</button>
                    <button @click="setAmount('double')" class="px-2 py-1 text-[10px] bg-[#2a2a2a] hover:bg-[#333] text-gray-400 rounded uppercase font-bold transition-colors">x2</button>
                    <button @click="setAmount('max')" class="px-2 py-1 text-[10px] bg-[#2a2a2a] hover:bg-[#333] text-gray-400 rounded uppercase font-bold transition-colors">Max</button>
                    <button @click="$emit('clear-input')" class="px-2 py-1 text-[10px] bg-[#2a2a2a] hover:bg-red-900/30 text-red-500 rounded transition-colors"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-2 w-full md:w-auto">
            <button 
                v-if="!isLoggedIn"
                @click="authStore.openLoginModal()"
                class="flex-1 md:flex-none px-8 py-3 bg-[#2a2a2a] hover:bg-[#333] text-white font-bold rounded-lg uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
            >
                <i class="fas fa-key"></i> Log In
            </button>
            
            <template v-else>
                 <button 
                    @click="$emit('clear-bets')"
                    class="px-4 py-3 bg-[#2a2a2a] hover:bg-[#333] text-gray-400 hover:text-white font-bold rounded-lg transition-colors"
                    :disabled="isSpinning"
                >
                    Clear
                </button>
                <button 
                    @click="$emit('spin')"
                    class="flex-1 md:flex-none px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(255,215,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                    :class="{ 'animate-pulse': !isSpinning && totalBet > 0 }"
                    :disabled="isSpinning || totalBet === 0"
                >
                    {{ isSpinning ? 'Rolling...' : 'Place Bet' }}
                </button>
            </template>
        </div>

    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();

const props = defineProps({
    balance: {
        type: Number,
        default: 0
    },
    isLoggedIn: {
        type: Boolean,
        default: false
    },
    isSpinning: {
        type: Boolean,
        default: false
    },
    totalBet: {
        type: Number,
        default: 0
    }
});

const emit = defineEmits(['update:amount', 'clear-input', 'clear-bets', 'spin']);

const betAmount = ref(0);

watch(betAmount, (val) => {
    emit('update:amount', val);
});

const setAmount = (type) => {
    if (type === 'min') betAmount.value = 0.1;
    if (type === 'max') betAmount.value = props.balance;
    if (type === 'half') betAmount.value = Math.max(0.1, betAmount.value / 2);
    if (type === 'double') betAmount.value = Math.min(props.balance, betAmount.value * 2);
};
</script>
