<template>
  <div class="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
    
    <!-- Red Section -->
    <div class="flex flex-col gap-4 bg-secondary/30 p-4 rounded-xl border border-glass-border">
        <!-- Header Row -->
        <div class="flex gap-2 h-14">
            <button 
                @click="$emit('place-bet', 'color', 'red')"
                class="flex-1 bg-primary hover:bg-primary-hover rounded-lg font-bold text-white transition-colors relative group flex items-center justify-center border-b-4 border-red-900 active:border-b-0 active:translate-y-1"
            >
                RED
                <span v-if="getBetAmount('color', 'red')" class="absolute -top-2 -right-2 bg-white text-primary text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg animate-pop">
                    {{ getBetAmount('color', 'red') }}
                </span>
            </button>
            <div class="flex-[2] grid grid-cols-7 gap-1">
                <button 
                    v-for="num in [1, 2, 3, 4, 5, 6, 7]" 
                    :key="num"
                    @click="$emit('place-bet', 'number', num)"
                    class="bg-secondary hover:bg-[#333] rounded text-gray-400 font-medium transition-colors relative border border-transparent hover:border-primary flex items-center justify-center text-sm"
                >
                    {{ num }}
                    <span v-if="getBetAmount('number', num)" class="absolute -top-2 -right-2 bg-white text-black text-[8px] font-bold rounded-full w-3 h-3 flex items-center justify-center shadow-lg z-10">
                        {{ getBetAmount('number', num) }}
                    </span>
                </button>
            </div>
        </div>

        <!-- Stats Row -->
        <div class="grid grid-cols-3 gap-2">
            <div class="bg-black/20 rounded p-2 flex flex-col items-center justify-center">
                <span class="text-[10px] text-gray-500 uppercase font-bold">Users</span>
                <span class="text-sm font-bold text-white">{{ getBetsForColor('red').length }}</span>
            </div>
            <div class="bg-black/20 rounded p-2 flex flex-col items-center justify-center">
                <span class="text-[10px] text-gray-500 uppercase font-bold">Total Bet</span>
                <span class="text-sm font-bold text-white">{{ getTotalBetForColor('red').toFixed(1) }}</span>
            </div>
            <div class="bg-black/20 rounded p-2 flex flex-col items-center justify-center">
                <span class="text-[10px] text-gray-500 uppercase font-bold">Your Bet</span>
                <span class="text-sm font-bold text-primary">{{ getUserBetForColor('red').toFixed(1) }}</span>
            </div>
        </div>

        <!-- User Cards -->
        <div class="grid grid-cols-4 gap-2">
            <div v-for="(bet, i) in getBetsForColor('red')" :key="i" class="bg-[#1a1a1a] rounded p-2 flex flex-col items-center gap-1 border border-white/5">
                <img src="@/assets/default-user.svg" class="w-8 h-8 rounded-full bg-gray-700 p-1" />
                <span class="text-[10px] text-gray-400 font-bold truncate w-full text-center">{{ bet.username || 'User' }}</span>
                <span class="text-xs font-bold text-primary">{{ bet.amount }}</span>
            </div>
        </div>
    </div>

    <!-- Green Section -->
    <div class="flex flex-col gap-4 bg-secondary/30 p-4 rounded-xl border border-glass-border">
        <!-- Header Row -->
        <div class="grid grid-cols-3 gap-2 h-14">
            <button 
                @click="$emit('place-bet', 'type', 'even')"
                class="bg-secondary hover:bg-[#333] rounded-lg text-gray-400 font-bold transition-colors border border-transparent hover:border-green-500 flex items-center justify-center text-xs uppercase tracking-wider"
            >
                EVEN
            </button>
            <button 
                @click="$emit('place-bet', 'number', 0)"
                class="bg-green-600 hover:bg-green-500 rounded-lg font-bold text-white transition-colors relative group flex items-center justify-center border-b-4 border-green-800 active:border-b-0 active:translate-y-1"
            >
                ZERO
                 <span v-if="getBetAmount('number', 0)" class="absolute -top-2 -right-2 bg-white text-green-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg animate-pop">
                    {{ getBetAmount('number', 0) }}
                </span>
            </button>
            <button 
                @click="$emit('place-bet', 'type', 'odd')"
                class="bg-secondary hover:bg-[#333] rounded-lg text-gray-400 font-bold transition-colors border border-transparent hover:border-green-500 flex items-center justify-center text-xs uppercase tracking-wider"
            >
                ODD
            </button>
        </div>

        <!-- Stats Row -->
        <div class="grid grid-cols-3 gap-2">
            <div class="bg-black/20 rounded p-2 flex flex-col items-center justify-center">
                <span class="text-[10px] text-gray-500 uppercase font-bold">Users</span>
                <span class="text-sm font-bold text-white">{{ getBetsForColor('green').length }}</span>
            </div>
            <div class="bg-black/20 rounded p-2 flex flex-col items-center justify-center">
                <span class="text-[10px] text-gray-500 uppercase font-bold">Total Bet</span>
                <span class="text-sm font-bold text-white">{{ getTotalBetForColor('green').toFixed(1) }}</span>
            </div>
            <div class="bg-black/20 rounded p-2 flex flex-col items-center justify-center">
                <span class="text-[10px] text-gray-500 uppercase font-bold">Your Bet</span>
                <span class="text-sm font-bold text-green-500">{{ getUserBetForColor('green').toFixed(1) }}</span>
            </div>
        </div>

        <!-- User Cards -->
        <div class="grid grid-cols-4 gap-2">
            <div v-for="(bet, i) in getBetsForColor('green')" :key="i" class="bg-[#1a1a1a] rounded p-2 flex flex-col items-center gap-1 border border-white/5">
                <img src="@/assets/default-user.svg" class="w-8 h-8 rounded-full bg-gray-700 p-1" />
                <span class="text-[10px] text-gray-400 font-bold truncate w-full text-center">{{ bet.username || 'User' }}</span>
                <span class="text-xs font-bold text-green-500">{{ bet.amount }}</span>
            </div>
        </div>
    </div>

    <!-- Black Section -->
    <div class="flex flex-col gap-4 bg-secondary/30 p-4 rounded-xl border border-glass-border">
        <!-- Header Row -->
        <div class="flex gap-2 h-14">
            <button 
                @click="$emit('place-bet', 'color', 'black')"
                class="flex-1 bg-[#1f1f23] hover:bg-[#2a2a2a] rounded-lg font-bold text-white transition-colors relative group flex items-center justify-center border-b-4 border-black active:border-b-0 active:translate-y-1"
            >
                BLACK
                <span v-if="getBetAmount('color', 'black')" class="absolute -top-2 -right-2 bg-white text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg animate-pop">
                    {{ getBetAmount('color', 'black') }}
                </span>
            </button>
            <div class="flex-[2] grid grid-cols-7 gap-1">
                <button 
                    v-for="num in [8, 9, 10, 11, 12, 13, 14]" 
                    :key="num"
                    @click="$emit('place-bet', 'number', num)"
                    class="bg-secondary hover:bg-[#333] rounded text-gray-400 font-medium transition-colors relative border border-transparent hover:border-gray-500 flex items-center justify-center text-sm"
                >
                    {{ num }}
                    <span v-if="getBetAmount('number', num)" class="absolute -top-2 -right-2 bg-white text-black text-[8px] font-bold rounded-full w-3 h-3 flex items-center justify-center shadow-lg z-10">
                        {{ getBetAmount('number', num) }}
                    </span>
                </button>
            </div>
        </div>

        <!-- Stats Row -->
        <div class="grid grid-cols-3 gap-2">
            <div class="bg-black/20 rounded p-2 flex flex-col items-center justify-center">
                <span class="text-[10px] text-gray-500 uppercase font-bold">Users</span>
                <span class="text-sm font-bold text-white">{{ getBetsForColor('black').length }}</span>
            </div>
            <div class="bg-black/20 rounded p-2 flex flex-col items-center justify-center">
                <span class="text-[10px] text-gray-500 uppercase font-bold">Total Bet</span>
                <span class="text-sm font-bold text-white">{{ getTotalBetForColor('black').toFixed(1) }}</span>
            </div>
            <div class="bg-black/20 rounded p-2 flex flex-col items-center justify-center">
                <span class="text-[10px] text-gray-500 uppercase font-bold">Your Bet</span>
                <span class="text-sm font-bold text-gray-400">{{ getUserBetForColor('black').toFixed(1) }}</span>
            </div>
        </div>

        <!-- User Cards -->
        <div class="grid grid-cols-4 gap-2">
            <div v-for="(bet, i) in getBetsForColor('black')" :key="i" class="bg-[#1a1a1a] rounded p-2 flex flex-col items-center gap-1 border border-white/5">
                <img src="@/assets/default-user.svg" class="w-8 h-8 rounded-full bg-gray-700 p-1" />
                <span class="text-[10px] text-gray-400 font-bold truncate w-full text-center">{{ bet.username || 'User' }}</span>
                <span class="text-xs font-bold text-white">{{ bet.amount }}</span>
            </div>
        </div>
    </div>

  </div>
</template>

<script setup>
import { useAuthStore } from '../stores/auth';

const props = defineProps({
    bets: {
        type: Array,
        default: () => []
    },
    lastResult: {
        type: Object,
        default: null
    }
});

const authStore = useAuthStore();

const getBetAmount = (type, value) => {
    return props.bets
        .filter(b => b.type === type && b.value === value)
        .reduce((sum, b) => sum + b.amount, 0);
};

const getBetsForColor = (color) => {
    return props.bets.filter(bet => {
        if (color === 'red') {
            return (bet.type === 'color' && bet.value === 'red') || (bet.type === 'number' && [1,2,3,4,5,6,7].includes(bet.value));
        } else if (color === 'green') {
            return (bet.type === 'number' && bet.value === 0) || bet.type === 'even' || bet.type === 'odd';
        } else if (color === 'black') {
            return (bet.type === 'color' && bet.value === 'black') || (bet.type === 'number' && [8,9,10,11,12,13,14].includes(bet.value));
        }
        return false;
    });
};

const getTotalBetForColor = (color) => {
    return getBetsForColor(color).reduce((sum, b) => sum + b.amount, 0);
};

const getUserBetForColor = (color) => {
    const userId = authStore.user?.id;
    if (!userId) return 0;
    return getBetsForColor(color)
        .filter(b => b.userId === userId)
        .reduce((sum, b) => sum + b.amount, 0);
};

defineEmits(['place-bet']);
</script>

<style scoped>
@keyframes pop {
    0% { transform: scale(0.8); opacity: 0; }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); opacity: 1; }
}

.animate-pop {
    animation: pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}
</style>
