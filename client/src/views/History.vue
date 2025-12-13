<template>
  <div class="min-h-screen bg-background text-foreground pt-24 px-4 pb-12">
    <div class="max-w-6xl mx-auto space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-3xl font-bold font-mono tracking-wider">
          <span v-if="viewingUsername">{{ viewingUsername }}'s </span>BET HISTORY
          <span class="text-muted-foreground text-lg ml-2">({{ stats.totalBets }})</span>
        </h1>
        <Button variant="secondary" as-child>
          <router-link :to="viewingUserId ? '/admin' : '/'">
            {{ viewingUserId ? 'BACK TO ADMIN' : 'BACK TO GAME' }}
          </router-link>
        </Button>
      </div>

      <!-- Filters -->
      <div class="flex items-center gap-2 flex-wrap">
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

        <div class="flex items-center gap-2">
          <Input 
            type="date" 
            v-model="selectedDate" 
            class="w-auto h-8 text-xs" 
          />
          <Input 
            type="text" 
            placeholder="Round ID" 
            v-model="filterRoundId"
            class="w-32 h-8 text-xs" 
          />
        </div>
      </div>

      <Card>
        <CardContent class="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Round</TableHead>
                <TableHead>Date</TableHead>
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
                <TableCell colspan="9" class="h-24 text-center">Loading history...</TableCell>
              </TableRow>
              <TableRow v-else-if="filteredHistory.length === 0">
                <TableCell colspan="9" class="h-24 text-center">No records found.</TableCell>
              </TableRow>
              <TableRow
                v-else
                v-for="(item, index) in processedHistory"
                :key="item._id"
                :class="item.rowClass"
              >
                <!-- Round Number -->
                <TableCell class="font-mono text-muted-foreground">
                  <span v-if="!isTransaction(item) && item.roundId">
                    #{{ getRoundDisplayNumber(item) }}
                  </span>
                  <span v-else>-</span>
                </TableCell>
                <TableCell class="text-muted-foreground whitespace-nowrap">
                  {{ formatOnlyDate(item.createdAt) }}
                </TableCell>
                <TableCell class="text-muted-foreground whitespace-nowrap">
                  {{ formatOnlyTime(item.createdAt) }}
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
                  {{ formatValue(item) }}
                </TableCell>

                <!-- Amount -->
                <TableCell class="font-mono">
                  <span v-if="isTransaction(item)" :class="getTransactionAmountClass(item)">
                    {{ item.type === 'deposit' ? '+' : item.type === 'withdraw' ? '-' : '' }}{{ item.amount }}
                  </span>
                  <span v-else>
                    {{ item.amount }}
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


                <!-- Net Profit (payout - amount for bets, 0 for refunded) -->
                <TableCell class="font-mono font-bold">
                  <span v-if="isTransaction(item)" :class="getTransactionAmountClass(item)">
                    {{ item.type === 'deposit' ? '+' : item.type === 'withdraw' ? '-' : '' }}{{ item.amount }}
                  </span>
                  <span v-else-if="item.status === 'refunded'" class="text-blue-400">
                    0
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
                            getResultColor(item.gameResult.color)
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

      <div v-if="pagination.totalPages > 1" class="mt-4">
        <PaginationControls 
            :current-page="pagination.page" 
            :total-pages="pagination.totalPages"
            :loading="loading"
            @page-change="changePage"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import api from '../services/api';
import { useAuthStore } from '../stores/auth';
import socket from '../services/socket';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import PaginationControls from '@/components/ui/PaginationControls.vue';
import { formatDate, formatOnlyDate, formatOnlyTime } from '../utils/formatters';
import { getResultColor, getValueColor } from '../utils/game';
import { useDebounceFn } from '@vueuse/core';

const route = useRoute();
const authStore = useAuthStore();
const history = ref([]);
const loading = ref(true);
const pagination = ref({
    page: 1,
    limit: 20,
    totalPages: 1,
    total: 0
});
const activeFilter = ref('all');
const viewingUserId = computed(() => route.query.userId || null);
const viewingUsername = computed(() => route.query.username || null);

const filterOptions = [
  { value: 'all', label: 'All' },
  { value: 'bets', label: 'Bets Only' },
  { value: 'transactions', label: 'Transactions' }
];

const selectedDate = ref('');
const filterRoundId = ref('');

// Instant filter for Round ID with debounce
watch(filterRoundId, useDebounceFn(() => {
    pagination.value.page = 1;
    fetchHistory();
}, 300));

// Filter for Date
watch(selectedDate, () => {
    pagination.value.page = 1;
    fetchHistory();
});

const fetchHistory = async () => {
  loading.value = true;

  try {
    // If admin is viewing another user's history, use admin endpoint
    const endpoint = viewingUserId.value
      ? `/admin/users/${viewingUserId.value}/history`
      : `/game/history`;
      
    let startDate, endDate;
    if (selectedDate.value) {
        // Use Local Time boundaries to match user's table display
        // Split ensures we treat YYYY-MM-DD as local date components
        const [y, m, d] = selectedDate.value.split('-').map(Number);
        
        // Month is 0-indexed in JS Date
        const start = new Date(y, m - 1, d, 0, 0, 0, 0); 
        const end = new Date(y, m - 1, d, 23, 59, 59, 999);
        
        startDate = start.toISOString();
        endDate = end.toISOString();
        
        console.log('[DEBUG] Filtering Local Date:', selectedDate.value, '-> UTC Range:', startDate, 'to', endDate);
    }

    const res = await api.get(endpoint, {
        params: {
            page: pagination.value.page,
            limit: pagination.value.limit,
            startDate,
            endDate,
            roundId: filterRoundId.value || undefined
        }
    });

    if (res.data.pagination) {
        console.log('[DEBUG] History Response (Paginated):', res.data.data.length, 'items. First:', res.data.data[0]?.createdAt);
        history.value = res.data.data;
        pagination.value = {
            page: res.data.pagination.page,
            limit: res.data.pagination.limit,
            totalPages: res.data.pagination.pages,
            total: res.data.pagination.total
        };
    } else {
        console.log('[DEBUG] History Response (Legacy):', res.data.length, 'items. First:', res.data[0]?.createdAt);
        history.value = res.data;
    }
  } catch (err) {
    console.error("Failed to fetch history:", err);
  } finally {
    loading.value = false;
  }
};

const changePage = (newPage) => {
    pagination.value.page = newPage;
    fetchHistory();
};

// Return history directly (server already sorts, but we ensure order here)
const aggregatedHistory = computed(() => {
  const items = [...history.value];
  // Sort by createdAt descending (newest first) for general display,
  // but note that within a round, we want to see the progression.
  // Actually, the server /game/history endpoint sorts by createdAt desc.
  // And we want the default view to be newest first.

  // However, for the progressive balance to make sense visually in a table (top to bottom),
  // usually we read top-down.
  // If we show newest first (DESC), looking at a round:
  // Row 1: 09:34:05 - Win - Balance 10100
  // Row 2: 09:34:00 - Bet - Balance 9900
  // This reads correctly: "Top is latest state".

  // Trust server sorting for now to avoid hydration mismatches or redundant work on large sets
  return items;
});

// Pre-process history to add row classes (alternating colors for rounds)
const processedHistory = computed(() => {
    let lastRoundId = null;
    let isDark = false;
    
    return filteredHistory.value.map(item => {
        const roundId = item.roundId || item._id;
        if (!isTransaction(item) && roundId !== lastRoundId) {
            isDark = !isDark;
            lastRoundId = roundId;
        }
        return {
            ...item,
            rowClass: isTransaction(item) ? '' : (isDark ? 'bg-white/5' : 'bg-primary/5')
        };
    });
});

// Filter based on active filter
const filteredHistory = computed(() => {
  const items = aggregatedHistory.value;

  switch (activeFilter.value) {
    case 'bets':
      return items.filter(item => !isTransaction(item));
    case 'transactions':
      return items.filter(item => isTransaction(item));
    default:
      return items;
  }
});

// Calculate stats from completed bets only
const stats = computed(() => {
  const completedBets = aggregatedHistory.value.filter(
    item => !isTransaction(item) && item.status === 'completed'
  );

  return {
    totalBets: completedBets.length
  };
});



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
    if (netProfit > 0) return `+${netProfit}`;
    if (netProfit < 0) return `-${Math.abs(netProfit)}`;
    return '0';
};

const getNetProfitClass = (item) => {
    const netProfit = getNetProfit(item);
    if (netProfit > 0) return 'text-green-500';
    if (netProfit < 0) return 'text-red-500';
    return 'text-muted-foreground';
};

// Get round display number (uses roundNumber if available, otherwise derives from roundId)
const getRoundDisplayNumber = (item) => {
    if (item.roundNumber) return item.roundNumber;
    // For older items without roundNumber, use last 4 chars of roundId
    if (item.roundId) return item.roundId.slice(-4).toUpperCase();
    return '-';
};



const handleGameState = (data) => {
    if (data.state === 'RESULT') {
        fetchHistory();
    }
};

const formatValue = (bet) => {
    if (isTransaction(bet)) return '-';
    if (bet.type === 'type') return bet.value?.toUpperCase();
    if (bet.type === 'color') return bet.value?.toUpperCase();
    return bet.value;
};

const formatBalance = (balance) => {
  if (balance === null || balance === undefined) {
    return '-';
  }
  return `${balance}`;
};

onMounted(() => {
  fetchHistory();

  socket.on('balanceUpdate', fetchHistory);
  socket.on('gameState', handleGameState);
});

onUnmounted(() => {
    socket.off('balanceUpdate', fetchHistory);
    socket.off('gameState', handleGameState);
});
</script>
