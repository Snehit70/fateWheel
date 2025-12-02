<template>
  <div class="w-full h-full flex flex-col gap-4">
    <!-- Input & Multipliers -->
    <div class="flex items-center gap-2 bg-background/50 p-1 rounded-lg border border-white/5">
        <div class="relative flex-1">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 font-medium">₹</span>
            <input 
                type="number" 
                v-model.number="betAmount"
                class="w-full bg-transparent border-none text-white pl-8 pr-3 py-2 focus:ring-0 font-mono text-lg font-medium placeholder-gray-600"
                placeholder="0"
            >
        </div>
        <div class="flex gap-1 pr-1">
             <button @click="setAmount('half')" class="px-3 py-1.5 text-xs bg-[#2a2a2a] hover:bg-[#333] text-gray-400 hover:text-white rounded font-medium transition-colors">1/2</button>
             <button @click="setAmount('double')" class="px-3 py-1.5 text-xs bg-[#2a2a2a] hover:bg-[#333] text-gray-400 hover:text-white rounded font-medium transition-colors">2x</button>
             <button @click="setAmount('max')" class="px-3 py-1.5 text-xs bg-[#2a2a2a] hover:bg-[#333] text-gray-400 hover:text-white rounded font-medium transition-colors">MAX</button>
        </div>
    </div>

    <!-- Quick Chips -->
    <div class="grid grid-cols-5 gap-2">
        <button v-for="chip in chips" :key="chip.value" @click="addAmount(chip.value)" class="bg-[#252525] hover:bg-[#333] border border-white/5 hover:border-primary/50 rounded-lg py-2 flex flex-col items-center justify-center transition-all active:scale-95 group">
            <div class="w-6 h-6 rounded-full bg-gradient-to-br from-gray-700 to-black border border-gray-600 shadow-lg flex items-center justify-center text-[8px] font-medium text-white mb-1 group-hover:border-primary transition-colors">
                {{ chip.label }}
            </div>
            <span class="text-[10px] text-gray-400 font-medium group-hover:text-white">+{{ chip.label }}</span>
        </button>
    </div>

    <!-- Actions -->
    <div class="flex gap-2 mt-auto">
        <button 
            @click="betAmount = 0" 
            class="flex-1 py-3 bg-[#2a2a2a] hover:bg-red-900/20 text-gray-400 hover:text-red-500 font-medium rounded-lg transition-colors text-xs uppercase tracking-wider"
        >
            Reset Amount
        </button>
        <button 
            @click="$emit('clear-bets')"
            class="flex-1 py-3 bg-[#2a2a2a] hover:bg-[#333] text-gray-400 hover:text-white font-medium rounded-lg transition-colors text-xs uppercase tracking-wider"
            :disabled="isSpinning"
        >
            Clear Board
        </button>
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

const chips = [
    { label: '10', value: 10 },
    { label: '100', value: 100 },
    { label: '500', value: 500 },
    { label: '1k', value: 1000 },
    { label: '5k', value: 5000 },
];

watch(betAmount, (val) => {
    emit('update:amount', val);
});

const setAmount = (type) => {
    if (type === 'min') betAmount.value = 0.1;
    if (type === 'max') betAmount.value = props.balance;
    if (type === 'half') betAmount.value = Math.max(0, Math.floor(betAmount.value / 2));
    if (type === 'double') betAmount.value = Math.min(props.balance, betAmount.value * 2);
};

const addAmount = (amount) => {
    const newAmount = betAmount.value + amount;
    // Allow going over balance? Usually no.
    if (newAmount <= props.balance) {
        betAmount.value = newAmount;
    } else {
        betAmount.value = props.balance;
    }
};
</script>
