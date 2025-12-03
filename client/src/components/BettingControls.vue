<template>
  <div class="w-full h-full flex flex-col gap-4">
    <!-- Input & Multipliers -->
    <div class="flex items-center gap-2">
        <div class="relative flex-1">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 font-medium z-10">₹</span>
            <Input 
                type="number" 
                v-model.number="betAmount"
                class="pl-8 pr-3 font-mono text-lg font-medium"
                placeholder="0"
            />
        </div>
        <div class="flex gap-1">
             <Button variant="secondary" size="sm" @click="setAmount('half')" class="h-10 px-3 text-xs font-medium">1/2</Button>
             <Button variant="secondary" size="sm" @click="setAmount('double')" class="h-10 px-3 text-xs font-medium">2x</Button>
             <Button variant="secondary" size="sm" @click="setAmount('max')" class="h-10 px-3 text-xs font-medium">MAX</Button>
        </div>
    </div>

    <!-- Quick Chips -->
    <div class="grid grid-cols-5 gap-2">
        <Button 
            v-for="chip in chips" 
            :key="chip.value" 
            variant="outline" 
            class="h-auto py-2 flex flex-col items-center justify-center gap-1 hover:border-primary/50"
            @click="addAmount(chip.value)"
        >
            <div class="w-6 h-6 rounded-full bg-gradient-to-br from-gray-700 to-black border border-gray-600 shadow-lg flex items-center justify-center text-[8px] font-medium text-white group-hover:border-primary transition-colors">
                {{ chip.label }}
            </div>
            <span class="text-[10px] text-muted-foreground font-medium group-hover:text-foreground">+{{ chip.label }}</span>
        </Button>
    </div>

    <!-- Actions -->
    <div class="flex gap-2 mt-auto">
        <Button 
            variant="secondary" 
            class="flex-1 hover:bg-destructive/10 hover:text-destructive text-xs uppercase tracking-wider"
            @click="betAmount = 0" 
        >
            Reset Amount
        </Button>
        <Button 
            variant="secondary"
            class="flex-1 text-xs uppercase tracking-wider"
            @click="$emit('clear-bets')"
            :disabled="isSpinning"
        >
            Clear Board
        </Button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
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
