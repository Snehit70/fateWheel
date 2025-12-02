<template>
  <div class="w-full grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
    
    <!-- Red Section -->
    <div :class="['flex flex-col gap-2 transition-all duration-500', lastResult && lastResult.color !== 'red' ? 'opacity-30 blur-[1px]' : '', lastResult?.color === 'red' ? 'scale-105 z-10' : '']">
        <!-- Header Button -->
        <button 
            @click="$emit('place-bet', 'color', 'red')"
            class="w-full h-14 bg-[#e50914] hover:bg-[#ff1f2b] rounded-lg font-bold text-white transition-colors relative group flex items-center justify-between px-4 border-b-4 border-[#b00710] active:border-b-0 active:translate-y-1"
        >
            <span class="text-lg tracking-wider">RED</span>
            <span class="text-xs opacity-70 bg-black/20 px-2 py-1 rounded">x2</span>
            
            <span v-if="getBetAmount('color', 'red')" class="absolute -top-2 -right-2 bg-white text-red-600 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg border border-gray-200 animate-pop">
                {{ getBetAmount('color', 'red') }}
            </span>
        </button>

        <!-- Numbers Grid -->
        <div class="grid grid-cols-4 gap-2">
             <button 
                v-for="num in [1, 2, 3, 4, 5, 6, 7]" 
                :key="num"
                @click="$emit('place-bet', 'number', num)"
                class="h-10 bg-[#252525] hover:bg-[#333] rounded text-gray-400 font-medium transition-colors relative border border-transparent hover:border-[#e50914] flex items-center justify-center"
            >
                {{ num }}
                <span v-if="getBetAmount('number', num)" class="absolute -top-2 -right-2 bg-white text-black text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-lg z-10">
                    {{ getBetAmount('number', num) }}
                </span>
            </button>
        </div>

        <!-- Active Bets List -->
        <div class="mt-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] p-2 min-h-[100px]">
            <div class="text-[10px] text-gray-500 font-bold uppercase mb-2 flex justify-between">
                <span>{{ getBetsForColor('red').length }} Bets</span>
                <span>Total: ₹{{ getTotalBetForColor('red').toFixed(2) }}</span>
            </div>
            <div class="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                <div v-for="(bet, i) in getBetsForColor('red')" :key="i" class="flex items-center justify-between bg-[#252525] p-2 rounded border-l-2 border-red-500">
                    <div class="flex items-center gap-2">
                        <div class="w-6 h-6 rounded bg-gray-700 flex items-center justify-center text-[10px] text-white font-bold">
                            {{ bet.username?.substring(0, 2).toUpperCase() || 'US' }}
                        </div>
                        <span class="text-xs text-gray-300">{{ bet.username || 'User' }}</span>
                    </div>
                    <span class="text-xs font-mono text-white">₹{{ bet.amount }}</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Green Section -->
    <div :class="['flex flex-col gap-2 transition-all duration-500', lastResult && lastResult.color !== 'green' ? 'opacity-30 blur-[1px]' : '', lastResult?.color === 'green' ? 'scale-105 z-10' : '']">
        <!-- Header Button (Zero) -->
        <button 
            @click="$emit('place-bet', 'number', 0)"
            class="w-full h-14 bg-[#00c74d] hover:bg-[#00e057] rounded-lg font-bold text-white transition-colors relative group flex items-center justify-between px-4 border-b-4 border-[#00a33f] active:border-b-0 active:translate-y-1"
        >
            <span class="text-lg tracking-wider">ZERO</span>
            <span class="text-xs opacity-70 bg-black/20 px-2 py-1 rounded">x14</span>
            
            <span v-if="getBetAmount('number', 0)" class="absolute -top-2 -right-2 bg-white text-green-600 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg border border-gray-200 animate-pop">
                {{ getBetAmount('number', 0) }}
            </span>
        </button>

        <!-- Even / Odd Buttons -->
        <div class="grid grid-cols-2 gap-2">
             <button 
                @click="$emit('place-bet', 'type', 'even')"
                class="h-10 bg-[#252525] hover:bg-[#333] rounded text-gray-400 font-medium transition-colors border border-transparent hover:border-[#00c74d] flex items-center justify-center text-xs uppercase tracking-wider"
            >
                EVEN
            </button>
            <button 
                @click="$emit('place-bet', 'type', 'odd')"
                class="h-10 bg-[#252525] hover:bg-[#333] rounded text-gray-400 font-medium transition-colors border border-transparent hover:border-[#00c74d] flex items-center justify-center text-xs uppercase tracking-wider"
            >
                ODD
            </button>
        </div>

        <!-- Active Bets List -->
        <div class="mt-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] p-2 min-h-[100px]">
             <div class="text-[10px] text-gray-500 font-bold uppercase mb-2 flex justify-between">
                <span>{{ getBetsForColor('green').length }} Bets</span>
                <span>Total: ₹{{ getTotalBetForColor('green').toFixed(2) }}</span>
            </div>
            <div class="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                <div v-for="(bet, i) in getBetsForColor('green')" :key="i" class="flex items-center justify-between bg-[#252525] p-2 rounded border-l-2 border-green-500">
                    <div class="flex items-center gap-2">
                        <div class="w-6 h-6 rounded bg-gray-700 flex items-center justify-center text-[10px] text-white font-bold">
                            {{ bet.username?.substring(0, 2).toUpperCase() || 'US' }}
                        </div>
                        <span class="text-xs text-gray-300">{{ bet.username || 'User' }}</span>
                    </div>
                    <span class="text-xs font-mono text-white">₹{{ bet.amount }}</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Black Section -->
    <div :class="['flex flex-col gap-2 transition-all duration-500', lastResult && lastResult.color !== 'black' ? 'opacity-30 blur-[1px]' : '', lastResult?.color === 'black' ? 'scale-105 z-10' : '']">
        <!-- Header Button -->
        <button 
            @click="$emit('place-bet', 'color', 'black')"
            class="w-full h-14 bg-[#1f1f23] hover:bg-[#2a2a2a] rounded-lg font-bold text-white transition-colors relative group flex items-center justify-between px-4 border-b-4 border-[#0f0f13] active:border-b-0 active:translate-y-1"
        >
            <span class="text-lg tracking-wider">BLACK</span>
            <span class="text-xs opacity-70 bg-white/10 px-2 py-1 rounded">x2</span>
            
            <span v-if="getBetAmount('color', 'black')" class="absolute -top-2 -right-2 bg-white text-black text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg border border-gray-200 animate-pop">
                {{ getBetAmount('color', 'black') }}
            </span>
        </button>

        <!-- Numbers Grid -->
        <div class="grid grid-cols-4 gap-2">
             <button 
                v-for="num in [8, 9, 10, 11, 12, 13, 14]" 
                :key="num"
                @click="$emit('place-bet', 'number', num)"
                class="h-10 bg-[#252525] hover:bg-[#333] rounded text-gray-400 font-medium transition-colors relative border border-transparent hover:border-gray-500 flex items-center justify-center"
            >
                {{ num }}
                <span v-if="getBetAmount('number', num)" class="absolute -top-2 -right-2 bg-white text-black text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-lg z-10 animate-pop">
                    {{ getBetAmount('number', num) }}
                </span>
            </button>
        </div>

        <!-- Active Bets List -->
        <div class="mt-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] p-2 min-h-[100px]">
             <div class="text-[10px] text-gray-500 font-bold uppercase mb-2 flex justify-between">
                <span>{{ getBetsForColor('black').length }} Bets</span>
                <span>Total: ₹{{ getTotalBetForColor('black').toFixed(2) }}</span>
            </div>
            <div class="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                <div v-for="(bet, i) in getBetsForColor('black')" :key="i" class="flex items-center justify-between bg-[#252525] p-2 rounded border-l-2 border-gray-500">
                    <div class="flex items-center gap-2">
                        <div class="w-6 h-6 rounded bg-gray-700 flex items-center justify-center text-[10px] text-white font-bold">
                            {{ bet.username?.substring(0, 2).toUpperCase() || 'US' }}
                        </div>
                        <span class="text-xs text-gray-300">{{ bet.username || 'User' }}</span>
                    </div>
                    <span class="text-xs font-mono text-white">₹{{ bet.amount }}</span>
                </div>
            </div>
        </div>
    </div>

  </div>
</template>

<script setup>
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

defineEmits(['place-bet']);
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #1a1a1a;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 2px;
}

@keyframes pop {
    0% { transform: scale(0.8); opacity: 0; }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); opacity: 1; }
}

.animate-pop {
    animation: pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}
</style>
