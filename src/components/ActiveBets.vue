<template>
  <div class="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
    <div v-for="(bets, color) in groupedBets" :key="color" class="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
        <!-- Header -->
        <div :class="[
            'px-4 py-3 flex justify-between items-center border-b border-[#2a2a2a]',
            color === 'red' ? 'bg-red-900/20' : color === 'green' ? 'bg-green-900/20' : 'bg-gray-800/20'
        ]">
            <div class="flex items-center gap-2">
                <div :class="[
                    'w-2 h-2 rounded-full',
                    color === 'red' ? 'bg-red-500' : color === 'green' ? 'bg-green-500' : 'bg-gray-500'
                ]"></div>
                <span class="text-xs font-bold text-gray-300 uppercase">{{ color }}</span>
            </div>
            <span class="text-xs font-mono text-gray-400">
                {{ bets.reduce((sum, b) => sum + b.amount, 0).toFixed(2) }}
            </span>
        </div>

        <!-- List -->
        <div class="max-h-60 overflow-y-auto custom-scrollbar">
            <div v-if="bets.length === 0" class="p-4 text-center text-xs text-gray-600 italic">
                No bets
            </div>
            <div v-else v-for="(bet, i) in bets" :key="i" class="px-4 py-2 flex justify-between items-center hover:bg-[#252525] transition-colors border-b border-[#2a2a2a] last:border-0">
                <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded bg-gray-700 flex items-center justify-center text-[10px] font-bold text-white">
                        {{ bet.username?.substring(0, 2).toUpperCase() || 'ME' }}
                    </div>
                    <span class="text-xs text-gray-300">{{ bet.username || 'You' }}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-xs font-mono text-white">{{ bet.amount.toFixed(2) }}</span>
                    <i class="fas fa-coins text-[10px] text-yellow-500"></i>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    bets: {
        type: Array,
        default: () => []
    }
});

const groupedBets = computed(() => {
    const groups = { red: [], green: [], black: [] };
    
    props.bets.forEach(bet => {
        let color = 'black';
        if (bet.type === 'color') {
            color = bet.value;
        } else if (bet.type === 'number') {
            if (bet.value === 0) color = 'green';
            else if ([1, 2, 3, 4, 5, 6, 7].includes(bet.value)) color = 'red';
            else color = 'black';
        }
        
        if (groups[color]) {
            groups[color].push(bet);
        }
    });
    
    return groups;
});
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
</style>
