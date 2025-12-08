<template>
  <div class="w-full h-full flex flex-col gap-2 sm:gap-4 relative">
    <!-- Login Overlay -->
    <div 
        v-if="!isLoggedIn" 
        class="absolute inset-0 z-20 bg-background/60 backdrop-blur-sm flex items-center justify-center rounded-lg border border-white/10"
    >
        <Button 
            @click="authStore.openLoginModal()" 
            class="font-bold text-lg px-8 py-6 shadow-xl animate-pulse"
        >
            LOGIN TO BET
        </Button>
    </div>

    <!-- Admin Overlay -->
    <div 
        v-if="isAdmin" 
        class="absolute inset-0 z-20 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg border border-white/10"
    >
        <div class="font-bold text-lg px-8 py-6 text-destructive border border-destructive/50 bg-destructive/10 rounded-md">
            BETTING DISABLED FOR ADMINS
        </div>
    </div>

    <!-- Input & Multipliers -->
    <div class="flex flex-col gap-2" :class="{ 'opacity-50 pointer-events-none': !isLoggedIn || isSpinning }">
        <div class="flex items-center gap-2">
            <div class="relative flex-1">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-green-500 font-bold text-xl z-10"></span>
                <Input 
                    type="text" 
                    inputmode="numeric"
                    v-model.number="betAmount"
                    @keypress="onlyAllowNumbers"
                    class="pl-10 pr-10 font-mono text-xl sm:text-2xl font-bold h-10 sm:h-14 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0"
                    :min="10"
                    :max="1000"
                    :disabled="!isLoggedIn || isSpinning"
                />
                <button 
                    v-if="betAmount > 0"
                    @click="betAmount = 0"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors z-10"
                    :disabled="!isLoggedIn || isSpinning"
                    type="button"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
            <div class="flex gap-1">
                 <Button variant="secondary" size="sm" @click="setAmount('10')" class="h-10 sm:h-14 px-2 sm:px-4 text-xs sm:text-sm font-bold" :disabled="!isLoggedIn || isSpinning">10</Button>
                 <Button variant="secondary" size="sm" @click="setAmount('1000')" class="h-10 sm:h-14 px-2 sm:px-4 text-xs sm:text-sm font-bold" :disabled="!isLoggedIn || isSpinning">1000</Button>
                 <Button variant="secondary" size="sm" @click="setAmount('min')" class="h-10 sm:h-14 px-2 sm:px-4 text-xs sm:text-sm font-bold" :disabled="!isLoggedIn || isSpinning">MIN</Button>
                 <Button variant="secondary" size="sm" @click="setAmount('max')" class="h-10 sm:h-14 px-2 sm:px-4 text-xs sm:text-sm font-bold" :disabled="!isLoggedIn || isSpinning">MAX</Button>
            </div>
        </div>
        <span v-if="isOutOfRange" class="text-sm text-red-500 font-bold ml-1">
            Correct range is 10-1000
        </span>
    </div>

    <!-- Quick Chips -->
    <div class="grid grid-cols-5 gap-2 sm:gap-3" :class="{ 'opacity-50 pointer-events-none': !isLoggedIn || isSpinning }">
        <Button 
            v-for="chip in chips" 
            :key="chip.value" 
            variant="outline" 
            class="h-auto py-2 sm:py-3 flex items-center justify-center hover:border-primary/50"
            @click="addAmount(chip.value)"
            :disabled="!isLoggedIn || isSpinning"
        >
            <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-gray-700 to-black border-2 border-gray-600 shadow-lg flex items-center justify-center text-xs sm:text-sm font-bold text-white group-hover:border-primary transition-colors">
                +{{ chip.label }}
            </div>
        </Button>
    </div>

    <!-- Actions -->
    <div class="flex gap-2 sm:gap-3 mt-auto" :class="{ 'opacity-50 pointer-events-none': !isLoggedIn || isSpinning }">
        <Button 
            variant="secondary" 
            class="flex-1 h-10 sm:h-12 hover:bg-destructive/10 hover:text-destructive text-xs sm:text-sm font-bold uppercase tracking-wider"
            @click="betAmount = 0" 
            :disabled="!isLoggedIn || isSpinning"
        >
            Reset Amount
        </Button>
        <Button 
            variant="secondary"
            class="flex-1 h-10 sm:h-12 text-xs sm:text-sm font-bold uppercase tracking-wider"
            @click="$emit('clear-bets')"
            :disabled="isSpinning || !isLoggedIn"
        >
            Clear Board
        </Button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

const betAmount = ref(11);

const chips = [
    { label: '11', value: 11 },
    { label: '21', value: 21 },
    { label: '51', value: 51 },
    { label: '101', value: 101 },
    { label: '201', value: 201 },
];

const isOutOfRange = computed(() => {
    return betAmount.value > 0 && (betAmount.value < 10 || betAmount.value > 1000);
});

const isAdmin = computed(() => {
    return authStore.user && authStore.user.role === 'admin';
});

watch(betAmount, (val) => {
    emit('update:amount', val);
});

const setAmount = (type) => {
    if (type === '10') betAmount.value = 10;
    if (type === '1000') betAmount.value = Math.min(props.balance, 1000);
    if (type === 'min') betAmount.value = 10;
    if (type === 'max') betAmount.value = props.balance;
};

const addAmount = (amount) => {
    const newAmount = betAmount.value + amount;
    if (newAmount <= 1000) {
        betAmount.value = newAmount;
    } else {
        betAmount.value = 1000;
    }
};

const onlyAllowNumbers = (event) => {
    const char = String.fromCharCode(event.which || event.keyCode);
    if (!/[0-9]/.test(char)) {
        event.preventDefault();
    }
};
</script>
