<template>
  <div class="w-full h-full flex flex-col gap-2 relative">
    <!-- Login Overlay -->
    <div 
        v-if="!isLoggedIn" 
        class="absolute inset-0 z-20 bg-background/60 backdrop-blur-sm flex items-center justify-center rounded-lg border border-white/10"
    >
        <Button 
            @click="authStore.openLoginModal()" 
            class="font-bold text-lg px-8 py-3 shadow-xl animate-pulse"
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

    <!-- Restricted Overlay -->
    <div 
        v-if="isRestricted" 
        class="absolute inset-0 z-20 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg border border-white/10 gap-2"
    >
        <div class="font-bold text-lg px-8 py-4 text-orange-500 border border-orange-500/50 bg-orange-500/10 rounded-md text-center">
            ACCOUNT RESTRICTED
        </div>
        <p class="text-sm text-muted-foreground font-semibold">Contact Admin for support</p>
    </div>

    <!-- Input & Multipliers -->
    <div class="flex flex-col gap-1" :class="{ 'opacity-50 pointer-events-none': !isLoggedIn || isSpinning }">
        <div class="flex items-center gap-1">
            <div class="relative flex-1">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-green-500 font-bold text-xl z-10"></span>
                <Input 
                    type="text" 
                    inputmode="numeric"
                    v-model.number="betAmount"
                    @keypress="onlyAllowNumbers"
                    class="pl-10 pr-10 font-mono text-xl sm:text-2xl font-bold h-8 sm:h-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0"
                    :min="BET_LIMITS.MIN"
                    :max="BET_LIMITS.MAX"
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
            <Button 
                variant="secondary" 
                size="sm" 
                @click="$emit('clear-bets')" 
                class="h-8 sm:h-12 px-4 sm:px-6 text-xs sm:text-sm font-bold uppercase tracking-wider"
                :disabled="!isLoggedIn || isSpinning"
            >
                Clear Board
            </Button>
        </div>
        <span v-if="isOutOfRange" class="text-sm text-red-500 font-bold ml-1">
            Correct range is {{ BET_LIMITS.MIN }}-{{ BET_LIMITS.MAX }}
        </span>
    </div>

    <!-- Quick Chips -->
    <div class="grid grid-cols-5 gap-1 sm:gap-2" :class="{ 'opacity-50 pointer-events-none': !isLoggedIn || isSpinning }">
        <Button 
            v-for="chip in chips" 
            :key="chip.value" 
            variant="outline" 
            class="h-auto py-1 flex items-center justify-center hover:border-primary/50"
            @click="addAmount(chip.value)"
            :disabled="!isLoggedIn || isSpinning"
        >
            <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-gray-700 to-black border-2 border-gray-600 shadow-lg flex items-center justify-center text-xs sm:text-sm font-bold text-white group-hover:border-primary transition-colors">
                +{{ chip.label }}
            </div>
        </Button>
    </div>


  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { useAuthStore } from '../stores/auth';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BET_LIMITS } from '../constants/game';

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
    },
    amount: {
        type: Number,
        default: BET_LIMITS.MIN
    }
});



const emit = defineEmits(['update:amount', 'clear-input', 'clear-bets', 'spin']);

const betAmount = computed({
    get: () => props.amount,
    set: (val) => emit('update:amount', val)
});

const chips = [
    { label: "10", value: 10 },
    { label: "20", value: 20 },
    { label: "50", value: 50 },
    { label: "100", value: 100 },
    { label: "200", value: 200 },
];

const isOutOfRange = computed(() => {
    return betAmount.value > 0 && (betAmount.value < BET_LIMITS.MIN || betAmount.value > BET_LIMITS.MAX);
});

const isAdmin = computed(() => {
    return authStore.user && authStore.user.role === 'admin';
});

const isRestricted = computed(() => {
    return authStore.user && 
           authStore.user.role !== 'admin' && 
           authStore.user.status !== 'approved';
});





const addAmount = (amount) => {
    const newAmount = betAmount.value + amount;
    if (newAmount <= BET_LIMITS.MAX) {
        betAmount.value = newAmount;
    } else {
        betAmount.value = BET_LIMITS.MAX;
    }
};

const onlyAllowNumbers = (event) => {
    const char = String.fromCharCode(event.which || event.keyCode);
    if (!/[0-9]/.test(char)) {
        event.preventDefault();
    }
};
</script>
