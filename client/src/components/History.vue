<template>
  <div class="min-h-screen bg-background text-foreground pt-24 px-4 pb-12">
    <div class="max-w-6xl mx-auto space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-3xl font-bold font-mono tracking-wider">BET HISTORY</h1>
        <Button variant="secondary" as-child>
          <router-link to="/">
            BACK TO GAME
          </router-link>
        </Button>
      </div>

      <!-- Summary Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card class="p-4">
          <div class="text-xs text-muted-foreground uppercase font-bold">Total Bets</div>
          <div class="text-2xl font-bold font-mono">{{ stats.totalBets }}</div>
        </Card>
        <Card class="p-4">
          <div class="text-xs text-muted-foreground uppercase font-bold">Win Rate</div>
          <div class="text-2xl font-bold font-mono" :class="stats.winRate >= 50 ? 'text-green-500' : 'text-red-500'">
            {{ stats.winRate.toFixed(0) }}%
          </div>
        </Card>
        <Card class="p-4">
          <div class="text-xs text-muted-foreground uppercase font-bold">Net Profit</div>
          <div class="text-2xl font-bold font-mono" :class="stats.netProfit >= 0 ? 'text-green-500' : 'text-red-500'">
            {{ stats.netProfit >= 0 ? '+' : '' }}₹{{ stats.netProfit }}
          </div>
        </Card>
        <Card class="p-4">
          <div class="text-xs text-muted-foreground uppercase font-bold">Total Wagered</div>
          <div class="text-2xl font-bold font-mono">₹{{ stats.totalWagered }}</div>
        </Card>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-2">
        <Button 
          v-for="f in filterOptions" 
          :key="f.value"
          :variant="activeFilter === f.value ? 'default' : 'outline'"
          size="sm"
          @click="activeFilter = f.value"
          class="text-xs"
        >
          {{ f.label }}
        </Button>
      </div>

      <Card>
        <CardContent class="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Net Profit</TableHead>
                <TableHead>Balance After</TableHead>
                <TableHead>Winning #</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="loading">
                <TableCell colspan="8" class="h-24 text-center">Loading history...</TableCell>
              </TableRow>
              <TableRow v-else-if="filteredHistory.length === 0">
                <TableCell colspan="8" class="h-24 text-center">No records found.</TableCell>
              </TableRow>
              <TableRow v-else v-for="item in filteredHistory" :key="item._id">
                <!-- Time -->
                <TableCell class="text-muted-foreground whitespace-nowrap">
                  {{ formatDate(item.createdAt) }}
                </TableCell>
                
                <!-- Type -->
                <TableCell class="font-medium capitalize">
                  <span v-if="isTransaction(item)" :class="getTransactionTypeClass(item.type)">
                    {{ item.type }}
                    <Badge v-if="item.txCount > 1" variant="outline" class="text-[10px] px-1 py-0 ml-1">
                      x{{ item.txCount }}
                    </Badge>
                  </span>
                  <span v-else class="flex items-center gap-1">
                    {{ item.type }}
                    <Badge v-if="item.betCount > 1" variant="outline" class="text-[10px] px-1 py-0">
                      x{{ item.betCount }}
                    </Badge>
                  </span>
                </TableCell>

                <!-- Value -->
                <TableCell>
                  <span v-if="isTransaction(item)" class="text-muted-foreground italic text-xs">
                    {{ item.description || '-' }}
                  </span>
                  <span v-else :class="getValueClass(item)">
                    {{ formatValue(item) }}
                  </span>
                </TableCell>

                <!-- Amount -->
                <TableCell class="font-mono">
                  <span v-if="isTransaction(item)" :class="getTransactionAmountClass(item)">
                    {{ item.type === 'deposit' ? '+' : item.type === 'withdraw' ? '-' : '' }}₹{{ item.amount }}
                  </span>
                  <span v-else>
                    ₹{{ item.amount }}
                  </span>
                </TableCell>

                <!-- Result -->
                <TableCell>
                  <Badge v-if="!isTransaction(item) && item.result" :variant="item.result === 'win' ? 'default' : 'destructive'" :class="item.result === 'win' ? 'bg-green-500 hover:bg-green-600' : ''">
                    {{ item.result }}
                  </Badge>
                  <Badge v-else-if="!isTransaction(item) && item.status === 'refunded'" variant="outline" class="text-blue-400 border-blue-400">
                    refunded
                  </Badge>
                  <span v-else-if="!isTransaction(item) && !item.result" class="text-yellow-500 text-xs uppercase font-bold">
                    pending
                  </span>
                  <span v-else class="text-muted-foreground text-xs">
                    -
                  </span>
                </TableCell>


                <!-- Net Profit (payout - amount for bets, ₹0 for refunded) -->
                <TableCell class="font-mono font-bold">
                  <span v-if="isTransaction(item)" :class="getTransactionAmountClass(item)">
                    {{ item.type === 'deposit' ? '+' : item.type === 'withdraw' ? '-' : '' }}₹{{ item.amount }}
                  </span>
                  <span v-else-if="item.status === 'refunded'" class="text-blue-400">
                    ₹0
                  </span>
                  <span v-else :class="getNetProfitClass(item)">
                    {{ formatNetProfit(item) }}
                  </span>
                </TableCell>

                <!-- Balance After (for refunded bets, show as refunded since money returned via separate transaction) -->
                <TableCell class="font-mono">
                  <span v-if="item.status === 'refunded' && !item.balanceAfter" class="text-blue-400 text-xs">
                    (refunded)
                  </span>
                  <span v-else class="text-muted-foreground">
                    {{ formatBalance(item.balanceAfter) }}
                  </span>
                </TableCell>

                <!-- Winning Number -->
                <TableCell>
                    <div v-if="!isTransaction(item) && item.gameResult" class="flex items-center space-x-2">
                        <span :class="[
                            'w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold text-white',
                            getGameResultColor(item.gameResult.color)
                        ]">
                            {{ item.gameResult.number }}
                        </span>
                    </div>
                    <div v-else class="text-muted-foreground text-xs">
                        -
                    </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import api from '../services/api';
import { useAuthStore } from '../stores/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const authStore = useAuthStore();
const history = ref([]);
const loading = ref(true);
const activeFilter = ref('all');

const filterOptions = [
  { value: 'all', label: 'All' },
  { value: 'bets', label: 'Bets Only' },
  { value: 'transactions', label: 'Transactions' },
  { value: 'wins', label: 'Wins Only' },
  { value: 'losses', label: 'Losses Only' }
];

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

// Helper to create a time-based grouping key
const getTimeGroupKey = (dateStr) => {
  const date = new Date(dateStr);
  const minutes = Math.floor(date.getMinutes() / 2) * 2;
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${minutes}`;
};

// Aggregate bets AND transactions
const aggregatedHistory = computed(() => {
  const items = history.value;
  const result = [];
  const betGroups = new Map();
  const txGroups = new Map();

  for (const item of items) {
    if (isTransaction(item)) {
      // Aggregate transactions by time window + type + description
      const txKey = `tx-${getTimeGroupKey(item.createdAt)}-${item.type}-${item.description || 'none'}`;
      
      if (txGroups.has(txKey)) {
        const group = txGroups.get(txKey);
        group.amount += item.amount;
        group.txCount += 1;
        if (item.balanceAfter !== null && item.balanceAfter !== undefined) {
          group.balanceAfter = item.balanceAfter;
        }
        if (new Date(item.createdAt) > new Date(group.createdAt)) {
          group.createdAt = item.createdAt;
        }
      } else {
        txGroups.set(txKey, {
          ...item,
          amount: item.amount,
          txCount: 1,
          _id: txKey
        });
      }
      continue;
    }

    // Bet aggregation
    let groupKey;
    if (item.roundId) {
      groupKey = `round-${item.roundId}-${item.type}-${item.value}-${item.status || 'unknown'}`;
    } else {
      groupKey = `time-${getTimeGroupKey(item.createdAt)}-${item.type}-${item.value}-${item.status || 'unknown'}`;
    }

    if (betGroups.has(groupKey)) {
      const group = betGroups.get(groupKey);
      group.amount += item.amount;
      group.payout += item.payout || 0;
      group.betCount += 1;
      if (item.balanceAfter !== null && item.balanceAfter !== undefined) {
        group.balanceAfter = item.balanceAfter;
      }
      if (new Date(item.createdAt) > new Date(group.createdAt)) {
        group.createdAt = item.createdAt;
      }
      if (item.gameResult && !group.gameResult) {
        group.gameResult = item.gameResult;
      }
      if (item.result && !group.result) {
        group.result = item.result;
      }
    } else {
      betGroups.set(groupKey, {
        ...item,
        amount: item.amount,
        payout: item.payout || 0,
        betCount: 1,
        _id: groupKey
      });
    }
  }

  // Add transactions and bets to result
  for (const tx of txGroups.values()) {
    result.push(tx);
  }
  for (const group of betGroups.values()) {
    result.push(group);
  }

  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return result;
});

// Filter based on active filter
const filteredHistory = computed(() => {
  const items = aggregatedHistory.value;
  
  switch (activeFilter.value) {
    case 'bets':
      return items.filter(item => !isTransaction(item));
    case 'transactions':
      return items.filter(item => isTransaction(item));
    case 'wins':
      return items.filter(item => !isTransaction(item) && item.result === 'win');
    case 'losses':
      return items.filter(item => !isTransaction(item) && item.result === 'loss');
    default:
      return items;
  }
});

// Calculate stats from completed bets only
const stats = computed(() => {
  const completedBets = aggregatedHistory.value.filter(
    item => !isTransaction(item) && item.status === 'completed'
  );
  
  const wins = completedBets.filter(b => b.result === 'win');
  const totalBets = completedBets.length;
  const winRate = totalBets > 0 ? (wins.length / totalBets) * 100 : 0;
  
  const totalWagered = completedBets.reduce((sum, b) => sum + b.amount, 0);
  const totalPayout = completedBets.reduce((sum, b) => sum + (b.payout || 0), 0);
  const netProfit = totalPayout - totalWagered;
  
  return {
    totalBets,
    winRate,
    netProfit,
    totalWagered
  };
});

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatBalance = (balance) => {
  if (balance === null || balance === undefined) {
    return '-';
  }
  return `₹${balance}`;
};

const formatValue = (bet) => {
    if (bet.type === 'type') return bet.value.toUpperCase();
    if (bet.type === 'color') return bet.value.toUpperCase();
    return bet.value;
  };

const getValueClass = (bet) => {
    if (bet.type === 'color') {
        return bet.value === 'red' ? 'text-red-500 font-bold' : bet.value === 'black' ? 'text-purple-400 font-bold' : 'text-green-500 font-bold';
    }
    if (bet.type === 'number') {
        return 'text-foreground font-bold';
    }
    return 'text-muted-foreground';
};

const getGameResultColor = (color) => {
    switch(color) {
        case 'red': return 'bg-red-500';
        case 'black': return 'bg-[#2d1f3d] shadow-[0_0_6px_rgba(138,43,226,0.3)]';
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

const getTransactionAmountClass = (item) => {
    if (item.type === 'deposit') return 'text-green-500 font-bold';
    if (item.type === 'withdraw') return 'text-red-500 font-bold';
    return 'text-blue-500 font-bold';
};

const getNetProfit = (item) => {
    if (isTransaction(item)) return item.amount;
    return (item.payout || 0) - item.amount;
};

const formatNetProfit = (item) => {
    const netProfit = getNetProfit(item);
    if (netProfit > 0) return `+₹${netProfit}`;
    if (netProfit < 0) return `-₹${Math.abs(netProfit)}`;
    return '₹0';
};

const getNetProfitClass = (item) => {
    const netProfit = getNetProfit(item);
    if (netProfit > 0) return 'text-green-500';
    if (netProfit < 0) return 'text-red-500';
    return 'text-muted-foreground';
};

const handleGameState = (data) => {
    if (data.state === 'RESULT') {
        fetchHistory();
    }
};

onMounted(() => {
  fetchHistory();

  if (authStore.socket) {
    authStore.socket.on('balanceUpdate', fetchHistory);
    authStore.socket.on('gameState', handleGameState);
  }
});

onUnmounted(() => {
    if (authStore.socket) {
        authStore.socket.off('balanceUpdate', fetchHistory);
        authStore.socket.off('gameState', handleGameState);
    }
});
</script>
