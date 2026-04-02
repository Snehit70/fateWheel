<template>
  <div class="min-h-screen bg-background text-foreground p-6">
    <div class="max-w-7xl mx-auto space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-3xl font-bold bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
          Round Analysis
        </h1>
        <Button variant="secondary" as-child>
          <router-link to="/admin">BACK TO ADMIN</router-link>
        </Button>
      </div>

      <!-- Mobile Card View -->
      <div class="sm:hidden space-y-2">
        <div v-if="loading" class="text-center text-muted-foreground py-8">Loading rounds...</div>
        <div v-else-if="rounds.length === 0" class="text-center text-muted-foreground py-8">No rounds found.</div>
        <template v-else v-for="round in rounds" :key="round._id">
          <div 
            class="p-3 rounded-lg border border-border cursor-pointer transition-colors"
            :class="expandedRound === round.roundId ? 'bg-surface/50' : ''"
            @click="toggleExpand(round.roundId)"
          >
            <!-- Header -->
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="font-mono font-bold text-sm">#{{ round.roundNumber }}</span>
                <span :class="['w-6 h-6 inline-flex items-center justify-center rounded-full text-xs font-bold text-white', getResultColor(round.color)]">
                  {{ round.number }}
                </span>
              </div>
              <span class="text-xs text-muted-foreground">{{ formatDate(round.createdAt) }}</span>
            </div>
            <!-- Stats -->
            <div class="flex items-center justify-between text-sm">
              <div class="flex gap-3 text-muted-foreground">
                <span>{{ round.stats?.totalBets || 0 }} bets</span>
                <span>{{ round.stats?.uniqueUsers || 0 }} users</span>
              </div>
              <span class="font-mono font-bold" :class="getProfitClass(round.stats?.netProfit)">
                {{ round.stats?.netProfit >= 0 ? '+' : '' }}{{ round.stats?.netProfit || 0 }}
              </span>
            </div>
          </div>
          <!-- Expanded Bets (Mobile) -->
          <div v-if="expandedRound === round.roundId && expandedBets.length > 0" class="ml-2 pl-3 border-l-2 border-border space-y-2">
            <div v-for="bet in expandedBets" :key="bet._id" class="p-2 rounded bg-surface/30 text-sm">
              <div class="flex items-center justify-between mb-1">
                <span class="font-medium">{{ bet.username }}</span>
                <Badge v-if="bet.result === 'win'" class="bg-green-500 text-xs">WIN</Badge>
                <Badge v-else-if="bet.result === 'loss'" variant="destructive" class="text-xs">LOSS</Badge>
              </div>
              <div class="flex items-center justify-between text-muted-foreground">
                <span class="capitalize">{{ bet.type }}: 
                  <span v-if="bet.type === 'color'" :class="getValueColor(bet.value)">{{ bet.value?.toUpperCase() }}</span>
                  <span v-else>{{ bet.value }}</span>
                </span>
                <span class="font-mono">{{ bet.amount }} → <span :class="bet.payout > 0 ? 'text-green-500' : ''">{{ bet.payout || 0 }}</span></span>
              </div>
            </div>
          </div>
          <div v-else-if="expandedRound === round.roundId && expandedBets.length === 0" class="ml-2 pl-3 border-l-2 border-border text-sm text-muted-foreground py-2">
            No bets in this round
          </div>
        </template>
      </div>

      <!-- Desktop Table View -->
      <Card class="hidden sm:block">
        <CardContent class="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="w-20">Round #</TableHead>
                <TableHead class="w-32">Round ID</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Time</TableHead>
                <TableHead class="text-right">Bets</TableHead>
                <TableHead class="text-right">Users</TableHead>
                <TableHead class="text-right">Wagered</TableHead>
                <TableHead class="text-right">Payout</TableHead>
                <TableHead class="text-right">Profit</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="loading">
                <TableCell colspan="9" class="h-24 text-center">Loading rounds...</TableCell>
              </TableRow>
              <TableRow v-else-if="rounds.length === 0">
                <TableCell colspan="9" class="h-24 text-center">No rounds found. Play some games first!</TableCell>
              </TableRow>
              <template v-else v-for="round in rounds" :key="round._id">
                <TableRow 
                  class="cursor-pointer hover:bg-surface/50" 
                  @click="toggleExpand(round.roundId)"
                >
                  <TableCell class="font-mono font-bold">{{ getDailyRoundNumber(round.roundId) }}</TableCell>
                  <TableCell class="font-mono text-xs text-muted-foreground">{{ round.roundId }}</TableCell>
                  <TableCell>
                    <span :class="[
                      'w-8 h-8 inline-flex items-center justify-center rounded-full text-sm font-bold text-white',
                      getResultColor(round.color)
                    ]">
                      {{ round.number }}
                    </span>
                  </TableCell>
                  <TableCell class="text-muted-foreground text-sm">{{ formatDate(round.createdAt) }}</TableCell>
                  <TableCell class="text-right font-mono">{{ round.stats?.totalBets || 0 }}</TableCell>
                  <TableCell class="text-right font-mono">{{ round.stats?.uniqueUsers || 0 }}</TableCell>
                  <TableCell class="text-right font-mono">{{ round.stats?.totalWagered || 0 }}</TableCell>
                  <TableCell class="text-right font-mono">{{ round.stats?.totalPayout || 0 }}</TableCell>
                  <TableCell class="text-right font-mono font-bold" :class="getProfitClass(round.stats?.netProfit)">
                    {{ round.stats?.netProfit >= 0 ? '+' : '' }}{{ round.stats?.netProfit || 0 }}
                  </TableCell>
                  <TableCell class="text-right">
                    <span class="text-muted-foreground text-sm">
                      {{ expandedRound === round.roundId ? '▲' : '▼' }}
                    </span>
                  </TableCell>
                </TableRow>
                <!-- Expanded Bets -->
                <TableRow v-if="expandedRound === round.roundId && expandedBets.length > 0">
                  <TableCell colspan="9" class="bg-surface/30 p-4">
                    <div class="text-sm font-medium mb-2">Bets in this round:</div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead class="text-right">Amount</TableHead>
                          <TableHead>Result</TableHead>
                          <TableHead class="text-right">Payout</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow v-for="bet in expandedBets" :key="bet._id">
                          <TableCell class="font-medium">{{ bet.username }}</TableCell>
                          <TableCell class="capitalize">{{ bet.type }}</TableCell>
                          <TableCell>
                            <span v-if="bet.type === 'color'" :class="getValueColor(bet.value)">{{ bet.value?.toUpperCase() }}</span>
                            <span v-else-if="bet.type === 'type'" class="uppercase">{{ bet.value }}</span>
                            <span v-else>{{ bet.value }}</span>
                          </TableCell>
                          <TableCell class="text-right font-mono">{{ bet.amount }}</TableCell>
                          <TableCell>
                            <Badge v-if="bet.result === 'win'" class="bg-green-500">WIN</Badge>
                            <Badge v-else-if="bet.result === 'loss'" variant="destructive">LOSS</Badge>
                            <span v-else class="text-muted-foreground">-</span>
                          </TableCell>
                          <TableCell class="text-right font-mono" :class="bet.payout > 0 ? 'text-green-500' : ''">
                            {{ bet.payout || 0 }}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableCell>
                </TableRow>
                <TableRow v-else-if="expandedRound === round.roundId && expandedBets.length === 0">
                  <TableCell colspan="9" class="bg-surface/30 p-4 text-center text-muted-foreground">
                    No bets in this round
                  </TableCell>
                </TableRow>
              </template>
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
import { ref, onMounted, onUnmounted } from 'vue';
import api from '../services/api';
import socket from '../services/socket';
import PaginationControls from '@/components/ui/PaginationControls.vue';
import { getResultColor, getValueColor } from '../utils/game';
import { formatDate } from '../utils/formatters';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const rounds = ref([]);
const loading = ref(true);
const pagination = ref({
    page: 1,
    limit: 20,
    totalPages: 1,
    total: 0
});
const expandedRound = ref(null);
const expandedBets = ref([]);
const betsCache = ref(new Map());

const fetchRounds = async () => {
  loading.value = true;
  try {
    const res = await api.get('/admin/rounds', {
        params: {
            page: pagination.value.page,
            limit: pagination.value.limit
        }
    });

    if (res.data.pagination) {
        rounds.value = res.data.data;
        pagination.value = {
            page: res.data.pagination.page,
            limit: res.data.pagination.limit,
            totalPages: res.data.pagination.pages,
            total: res.data.pagination.total
        };
    } else {
        rounds.value = res.data;
    }
  } catch (err) {
    console.error('Failed to fetch rounds:', err);
  } finally {
    loading.value = false;
  }
};

const changePage = (newPage) => {
    pagination.value.page = newPage;
    fetchRounds();
};

const toggleExpand = async (roundId) => {
  if (expandedRound.value === roundId) {
    expandedRound.value = null;
    expandedBets.value = [];
    return;
  }

  expandedRound.value = roundId;

  if (betsCache.value.has(roundId)) {
      expandedBets.value = betsCache.value.get(roundId);
      return;
  }

  try {
    const res = await api.get(`/admin/rounds/${roundId}`);
    expandedBets.value = res.data.bets;
    betsCache.value.set(roundId, res.data.bets);
  } catch (err) {
    console.error('Failed to fetch round details:', err);
    expandedBets.value = [];
  }
};

const getDailyRoundNumber = (roundId) => {
    if (!roundId) return '-';
    // Format YYYYMMDD-XXXX, we want XXXX
    const parts = roundId.split('-');
    if (parts.length === 2) {
        return parts[1];
    }
    // Fallback for older or uuid IDs
    return roundId.slice(-4).toUpperCase();
};



const getProfitClass = (profit) => {
    if (!profit) return 'text-muted-foreground';
    if (profit > 0) return 'text-green-500';
    if (profit < 0) return 'text-red-500';
    return 'text-muted-foreground';
};

onMounted(() => {
  fetchRounds();
  
  socket.on('admin:newRound', (round) => {
      if (pagination.value.page === 1) {
          rounds.value.unshift(round);
          if (rounds.value.length > pagination.value.limit) {
              rounds.value.pop();
          }
      }
  });
});

onUnmounted(() => {
    socket.off('admin:newRound');
});
</script>
