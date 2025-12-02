<template>
  <div class="min-h-screen bg-[#0f0f13] text-white pt-24 px-4 pb-12">
    <div class="max-w-6xl mx-auto">
      <div class="flex items-center justify-between mb-8">
        <h1 class="text-3xl font-bold font-mono tracking-wider">BET HISTORY</h1>
        <router-link to="/" class="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm font-bold">
          BACK TO GAME
        </router-link>
      </div>

      <div class="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden shadow-2xl">
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead class="bg-[#252525] text-gray-400 text-xs uppercase tracking-wider">
              <tr>
                <th class="px-6 py-4 font-medium">Time</th>
                <th class="px-6 py-4 font-medium">Bet Type</th>
                <th class="px-6 py-4 font-medium">Value</th>
                <th class="px-6 py-4 font-medium">Amount</th>
                <th class="px-6 py-4 font-medium">Result</th>
                <th class="px-6 py-4 font-medium">Payout</th>
                <th class="px-6 py-4 font-medium">Winning Number</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#2a2a2a]">
              <tr v-if="loading" class="animate-pulse">
                <td colspan="7" class="px-6 py-8 text-center text-gray-500">Loading history...</td>
              </tr>
              <tr v-else-if="history.length === 0">
                <td colspan="7" class="px-6 py-8 text-center text-gray-500">No bets found. Start playing!</td>
              </tr>
              <tr v-for="item in history" :key="item._id" class="hover:bg-[#202020] transition-colors">
                <td class="px-6 py-4 text-gray-400 text-sm whitespace-nowrap">
                  {{ formatDate(item.createdAt) }}
                </td>
                
                <!-- Type & Value -->
                <td class="px-6 py-4 text-sm font-medium capitalize">
                  <span v-if="isTransaction(item)" :class="getTransactionTypeClass(item.type)">
                    {{ item.type }}
                  </span>
                  <span v-else>
                    {{ item.type }}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm">
                  <span v-if="isTransaction(item)" class="text-gray-400 italic">
                    {{ item.description || '-' }}
                  </span>
                  <span v-else :class="getValueClass(item)">
                    {{ formatValue(item) }}
                  </span>
                </td>

                <!-- Amount -->
                <td class="px-6 py-4 text-sm font-mono">
                  <span :class="isTransaction(item) && item.type === 'deposit' ? 'text-green-500 font-bold' : 'text-white'">
                    ₹{{ item.amount }}
                  </span>
                </td>

                <!-- Result -->
                <td class="px-6 py-4">
                  <span v-if="!isTransaction(item)" :class="[
                    'px-2 py-1 rounded text-xs font-bold uppercase tracking-wide',
                    item.result === 'win' ? 'bg-green-500/20 text-green-500 border border-green-500/30' : 'bg-red-500/20 text-red-500 border border-red-500/30'
                  ]">
                    {{ item.result }}
                  </span>
                  <span v-else class="text-gray-600 text-xs uppercase font-bold">
                    Completed
                  </span>
                </td>

                <!-- Payout / Balance After -->
                <td class="px-6 py-4 text-sm font-mono font-bold">
                  <span v-if="isTransaction(item)" class="text-gray-400">
                    Bal: ₹{{ item.balanceAfter }}
                  </span>
                  <span v-else :class="item.payout > 0 ? 'text-green-500' : 'text-gray-500'">
                    {{ item.payout > 0 ? '+' : '' }}₹{{ item.payout }}
                  </span>
                </td>

                <!-- Winning Number -->
                <td class="px-6 py-4">
                    <div v-if="!isTransaction(item) && item.gameResult" class="flex items-center space-x-2">
                        <span :class="[
                            'w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold text-white',
                            getGameResultColor(item.gameResult.color)
                        ]">
                            {{ item.gameResult.number }}
                        </span>
                    </div>
                    <div v-else-if="isTransaction(item)" class="text-gray-600 text-xs">
                        -
                    </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../services/api';

const history = ref([]);
const loading = ref(true);

const fetchHistory = async () => {
  try {
    const res = await api.get('/game/history');
    history.value = res.data;
  } catch (err) {
    console.error("Failed to fetch history:", err);
  } finally {
    loading.value = false;
  }
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatValue = (bet) => {
    if (bet.type === 'type') return bet.value.toUpperCase();
    if (bet.type === 'color') return bet.value.toUpperCase();
    return bet.value;
};

const getValueClass = (bet) => {
    if (bet.type === 'color') {
        return bet.value === 'red' ? 'text-red-500 font-bold' : bet.value === 'black' ? 'text-gray-400 font-bold' : 'text-green-500 font-bold';
    }
    if (bet.type === 'number') {
        // We don't know the color of the bet number easily without logic, keep it white
        return 'text-white font-bold';
    }
    return 'text-gray-300';
};

const getGameResultColor = (color) => {
    switch(color) {
        case 'red': return 'bg-red-500';
        case 'black': return 'bg-gray-800';
        case 'green': return 'bg-green-500';
        default: return 'bg-gray-500';
    }
};

const isTransaction = (item) => {
    return ['deposit', 'withdraw', 'adjustment'].includes(item.type);
};

const getTransactionTypeClass = (type) => {
    if (type === 'deposit') return 'text-green-500 font-bold';
    if (type === 'withdraw') return 'text-red-500 font-bold';
    return 'text-blue-500';
};

onMounted(() => {
  fetchHistory();
});
</script>
