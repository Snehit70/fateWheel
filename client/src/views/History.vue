<template>
  <div class="min-h-screen pt-0 px-2 pb-4">
    <div class="max-w-6xl mx-auto space-y-3">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="h-px w-6 bg-gradient-to-r from-gold/50 to-transparent hidden sm:block"></div>
          <h1 class="text-xl sm:text-2xl font-display font-semibold tracking-[0.1em] text-cream">
            <span v-if="viewingUsername" class="text-gold">{{ viewingUsername }}'s </span>BET HISTORY
            <span class="text-muted-foreground text-sm ml-2 font-body">({{ stats.totalBets }})</span>
          </h1>
        </div>
        <Button variant="outline" as-child>
          <router-link :to="viewingUserId ? '/admin' : '/'">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {{ viewingUserId ? 'Back to Admin' : 'Back to Game' }}
          </router-link>
        </Button>
      </div>

      <!-- Filters (Admin only) -->
      <div v-if="isAdmin" class="card-elegant p-3 flex items-center gap-2 flex-wrap">
        <div class="flex flex-wrap gap-1.5">
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

        <div class="h-6 w-px bg-gold/20 mx-2 hidden sm:block"></div>

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
            class="w-28 h-8 text-xs"
          />
          <Button
            variant="ghost"
            size="sm"
            @click="clearFilters"
            class="h-8 px-2 text-xs text-ruby"
            v-if="selectedDate || filterRoundId || activeFilter !== 'all'"
          >
            Clear
          </Button>
        </div>
      </div>

      <!-- Mobile Card View -->
      <div class="sm:hidden space-y-2">
        <div v-if="loading" class="card-elegant p-8 text-center">
          <div class="text-muted-foreground font-display tracking-wider">Loading history...</div>
        </div>
        <div v-else-if="filteredHistory.length === 0" class="card-elegant p-8 text-center">
          <div class="text-muted-foreground font-display tracking-wider">No records found.</div>
        </div>
        <div
          v-else
          v-for="item in processedHistory"
          :key="item._id"
          class="card-elegant p-3"
          :class="item.rowClass"
        >
          <!-- Header Row -->
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <span v-if="!isTransaction(item) && item.roundId" class="font-display text-xs text-muted-foreground">#{{ getRoundDisplayNumber(item) }}</span>
              <Badge v-if="isTransaction(item)" :class="getTransactionTypeClass(item.type)" variant="outline">
                {{ item.type }}
              </Badge>
              <span v-else class="text-sm font-display font-medium capitalize">{{ item.type }}: {{ formatValue(item) }}</span>
            </div>
            <span class="text-xs text-muted-foreground font-body">{{ formatOnlyTime(item.createdAt) }}</span>
          </div>
          <!-- Content Row -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="font-display text-sm tabular-nums">{{ item.amount }}</span>
              <Badge v-if="!isTransaction(item) && item.result" :variant="item.result === 'win' ? 'default' : 'destructive'" :class="item.result === 'win' ? 'bg-emerald hover:bg-emerald' : 'bg-ruby'">
                {{ item.result }}
              </Badge>
              <Badge v-else-if="!isTransaction(item) && item.status === 'refunded'" variant="outline" class="text-gold border-gold/40">
                refunded
              </Badge>
            </div>
            <span class="font-display font-bold tabular-nums" :class="isTransaction(item) ? getTransactionAmountClass(item) : getNetProfitClass(item)">
              <span v-if="isTransaction(item)">{{ item.type === 'deposit' ? '+' : '-' }}{{ item.amount }}</span>
              <span v-else-if="item.status === 'refunded'" class="text-gold">0</span>
              <span v-else>{{ formatNetProfit(item) }}</span>
            </span>
          </div>
          <!-- Winning Number (if bet) -->
          <div v-if="!isTransaction(item) && item.gameResult" class="mt-2 flex items-center gap-2">
            <span class="text-xs text-muted-foreground">Won:</span>
            <span :class="['w-5 h-5 flex items-center justify-center rounded text-[10px] font-display font-bold', getResultColor(item.gameResult.color)]">
              {{ item.gameResult.number }}
            </span>
          </div>
        </div>
      </div>

      <!-- Desktop Table View -->
      <Card class="hidden sm:block">
        <CardContent class="p-0">
          <Table>
            <TableHeader>
              <TableRow class="border-gold/10 hover:bg-transparent">
                <TableHead class="font-display text-[10px] tracking-[0.15em] uppercase text-muted-foreground">Round</TableHead>
                <TableHead class="font-display text-[10px] tracking-[0.15em] uppercase text-muted-foreground">Date</TableHead>
                <TableHead class="font-display text-[10px] tracking-[0.15em] uppercase text-muted-foreground">Time</TableHead>
                <TableHead class="font-display text-[10px] tracking-[0.15em] uppercase text-muted-foreground">Bet Type</TableHead>
                <TableHead class="font-display text-[10px] tracking-[0.15em] uppercase text-muted-foreground">Value</TableHead>
                <TableHead class="font-display text-[10px] tracking-[0.15em] uppercase text-muted-foreground">Amount</TableHead>
                <TableHead class="font-display text-[10px] tracking-[0.15em] uppercase text-muted-foreground">Result</TableHead>
                <TableHead class="font-display text-[10px] tracking-[0.15em] uppercase text-muted-foreground">Net Profit</TableHead>
                <TableHead class="font-display text-[10px] tracking-[0.15em] uppercase text-muted-foreground">Balance</TableHead>
                <TableHead class="font-display text-[10px] tracking-[0.15em] uppercase text-muted-foreground">Winning #</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="loading">
                <TableCell colspan="10" class="h-24 text-center text-muted-foreground font-display tracking-wider">Loading history...</TableCell>
              </TableRow>
              <TableRow v-else-if="filteredHistory.length === 0">
                <TableCell colspan="10" class="h-24 text-center text-muted-foreground font-display tracking-wider">No records found.</TableCell>
              </TableRow>
              <TableRow
                v-else
                v-for="(item, index) in processedHistory"
                :key="item._id"
                :class="item.rowClass"
                class="border-gold/5 hover:bg-gold/5 transition-colors"
              >
                <TableCell class="font-display text-muted-foreground">
                  <span v-if="!isTransaction(item) && item.roundId">#{{ getRoundDisplayNumber(item) }}</span>
                  <span v-else>-</span>
                </TableCell>
                <TableCell class="text-muted-foreground whitespace-nowrap font-body text-sm">
                  {{ formatOnlyDate(item.createdAt) }}
                </TableCell>
                <TableCell class="text-muted-foreground whitespace-nowrap font-body text-sm">
                  {{ formatOnlyTime(item.createdAt) }}
                </TableCell>
                <TableCell class="font-display font-medium capitalize">
                  <span v-if="isTransaction(item)" :class="getTransactionTypeClass(item.type)">
                    {{ item.type === 'adjustment' && item.description && item.description.includes('Server Restart') ? 'System Refund' : item.type }}
                    <Badge v-if="item.txCount > 1" variant="outline" class="text-[10px] px-1 py-0 ml-1">x{{ item.txCount }}</Badge>
                  </span>
                  <span v-else class="flex items-center gap-1">
                    {{ item.type === 'type' ? 'Parity' : item.type }}
                    <Badge v-if="item.betCount > 1" variant="outline" class="text-[10px] px-1 py-0">x{{ item.betCount }}</Badge>
                  </span>
                </TableCell>
                <TableCell class="font-display">{{ formatValue(item) }}</TableCell>
                <TableCell class="font-display tabular-nums">
                  <span v-if="isTransaction(item)" :class="getTransactionAmountClass(item)">
                    {{ item.type === 'deposit' ? '+' : item.type === 'withdraw' ? '-' : '' }}{{ item.amount }}
                  </span>
                  <span v-else>{{ item.amount }}</span>
                </TableCell>
                <TableCell>
                  <Badge v-if="!isTransaction(item) && item.result" :variant="item.result === 'win' ? 'default' : 'destructive'" :class="item.result === 'win' ? 'bg-emerald hover:bg-emerald' : 'bg-ruby'">
                    {{ item.result }}
                  </Badge>
                  <Badge v-else-if="!isTransaction(item) && item.status === 'refunded'" variant="outline" class="text-gold border-gold/40">refunded</Badge>
                  <span v-else-if="!isTransaction(item) && !item.result" class="text-gold text-xs uppercase font-display font-bold">pending</span>
                  <span v-else class="text-muted-foreground text-xs">-</span>
                </TableCell>
                <TableCell class="font-display font-bold tabular-nums">
                  <span v-if="isTransaction(item)" :class="getTransactionAmountClass(item)">
                    {{ item.type === 'deposit' ? '+' : item.type === 'withdraw' ? '-' : '' }}{{ item.amount }}
                  </span>
                  <span v-else-if="item.status === 'refunded'" class="text-gold">0</span>
                  <span v-else :class="getNetProfitClass(item)">{{ formatNetProfit(item) }}</span>
                </TableCell>
                <TableCell class="font-display tabular-nums">
                  <span v-if="item.status === 'refunded' && !item.balanceAfter" class="text-gold text-xs">(refunded)</span>
                  <span v-else class="text-muted-foreground">{{ formatBalance(item.balanceAfter) }}</span>
                </TableCell>
                <TableCell>
                  <div v-if="!isTransaction(item) && item.gameResult" class="flex items-center">
                    <span :class="['w-6 h-6 flex items-center justify-center rounded text-xs font-display font-bold', getResultColor(item.gameResult.color)]">
                      {{ item.gameResult.number }}
                    </span>
                  </div>
                  <div v-else class="text-muted-foreground text-xs">-</div>
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
import { useGameStore } from '../stores/game';
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
const gameStore = useGameStore();
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

const isAdmin = computed(() => {
  return authStore.user && authStore.user.role === 'admin';
});

const filterOptions = [
  { value: 'all', label: 'All' },
  { value: 'bets', label: 'Bets Only' },
  { value: 'transactions', label: 'Transactions' }
];

const selectedDate = ref('');
const filterRoundId = ref('');

watch(filterRoundId, useDebounceFn(() => {
  pagination.value.page = 1;
  fetchHistory();
}, 300));

watch(selectedDate, () => {
  pagination.value.page = 1;
  fetchHistory();
});

const clearFilters = () => {
  selectedDate.value = '';
  filterRoundId.value = '';
  activeFilter.value = 'all';
};

const fetchHistory = async () => {
  loading.value = true;

  try {
    const endpoint = viewingUserId.value
      ? `/admin/users/${viewingUserId.value}/history`
      : `/game/history`;

    let startDate, endDate;
    if (selectedDate.value) {
      const [y, m, d] = selectedDate.value.split('-').map(Number);
      const start = new Date(y, m - 1, d, 0, 0, 0, 0);
      const end = new Date(y, m - 1, d, 23, 59, 59, 999);
      startDate = start.toISOString();
      endDate = end.toISOString();
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
      history.value = res.data.data;
      pagination.value = {
        page: res.data.pagination.page,
        limit: res.data.pagination.limit,
        totalPages: res.data.pagination.pages,
        total: res.data.pagination.total
      };
    } else {
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

const stats = computed(() => {
  const completedBets = history.value.filter(
    item => !isTransaction(item) && item.status === 'completed'
  );
  return { totalBets: completedBets.length };
});

const filteredHistory = computed(() => {
  let filtered = history.value;
  filtered = filtered.filter(item => item.status !== 'cancelled');

  switch (activeFilter.value) {
    case 'bets':
      return filtered.filter(item => !isTransaction(item));
    case 'transactions':
      return filtered.filter(item => isTransaction(item));
    default:
      return filtered;
  }
});

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
      rowClass: isTransaction(item) ? '' : (isDark ? 'bg-gold/[0.02]' : 'bg-surface/30')
    };
  });
});

const isTransaction = (item) => {
  return ['deposit', 'withdraw', 'adjustment'].includes(item.type);
};

const getTransactionTypeClass = (type) => {
  if (type === 'deposit') return 'text-emerald font-bold';
  if (type === 'withdraw') return 'text-ruby font-bold';
  if (type === 'adjustment') return 'text-gold font-bold';
  return 'text-gold';
};

const getTransactionAmountClass = (item) => {
  if (item.type === 'deposit') return 'text-emerald font-bold';
  if (item.type === 'withdraw') return 'text-ruby font-bold';
  return 'text-gold font-bold';
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
  if (netProfit > 0) return 'text-emerald';
  if (netProfit < 0) return 'text-ruby';
  return 'text-muted-foreground';
};

const getRoundDisplayNumber = (item) => {
  if (item.roundId) {
    const parts = item.roundId.split('-');
    if (parts.length === 2 && parts[1].length === 4) {
      return parts[1];
    }
    return item.roundId.slice(-4).toUpperCase();
  }
  if (item.roundNumber) return item.roundNumber;
  return '-';
};

const debouncedFetchHistory = useDebounceFn(fetchHistory, 300);

onMounted(() => {
  fetchHistory();
  socket.on('balanceUpdate', debouncedFetchHistory);
});

onUnmounted(() => {
  socket.off('balanceUpdate', debouncedFetchHistory);
});

watch(() => gameStore.lastResult, (result) => {
  if (result) {
    debouncedFetchHistory();
  }
});

const formatValue = (bet) => {
  if (isTransaction(bet)) return '-';
  if (bet.type === 'type') return bet.value?.toUpperCase();
  if (bet.type === 'color') return bet.value?.toUpperCase();
  return bet.value;
};

const formatBalance = (balance) => {
  if (balance === null || balance === undefined) return '-';
  return `${balance}`;
};
</script>
