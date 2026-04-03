<template>
  <div class="min-h-screen pt-0 px-2 pb-4">
    <div class="max-w-7xl mx-auto space-y-3">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="h-px w-6 bg-gradient-to-r from-gold/50 to-transparent hidden sm:block"></div>
          <h1 class="text-xl sm:text-2xl font-display font-semibold tracking-[0.1em] text-cream">
            ROUND ANALYSIS
          </h1>
        </div>
        <Button variant="outline" as-child>
          <router-link to="/admin">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Admin
          </router-link>
        </Button>
      </div>

      <div class="sm:hidden space-y-2">
        <div v-if="loading" class="card-elegant p-8 text-center text-muted-foreground font-display tracking-wider">Loading rounds...</div>
        <div v-else-if="rounds.length === 0" class="card-elegant p-8 text-center text-muted-foreground font-display tracking-wider">No rounds found.</div>
        <template v-else v-for="round in rounds" :key="round._id">
          <div
            class="card-elegant p-3 cursor-pointer transition-all duration-300"
            :class="expandedRound === round.roundId ? 'border-gold/30 shadow-[0_0_24px_rgba(212,175,55,0.08)]' : ''"
            @click="toggleExpand(round.roundId)"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="font-display font-bold text-sm text-muted-foreground">#{{ round.roundNumber }}</span>
                <span :class="['w-6 h-6 inline-flex items-center justify-center rounded text-xs font-display font-bold', getResultColor(round.color)]">
                  {{ round.number }}
                </span>
              </div>
              <span class="text-xs text-muted-foreground font-body">{{ formatDate(round.createdAt) }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <div class="flex gap-3 text-muted-foreground font-body">
                <span>{{ round.stats?.totalBets || 0 }} bets</span>
                <span>{{ round.stats?.uniqueUsers || 0 }} users</span>
              </div>
              <span class="font-display font-bold tabular-nums" :class="getProfitClass(round.stats?.netProfit)">
                {{ round.stats?.netProfit >= 0 ? '+' : '' }}{{ round.stats?.netProfit || 0 }}
              </span>
            </div>
          </div>
          <div v-if="expandedRound === round.roundId && expandedBets.length > 0" class="ml-2 pl-3 border-l-2 border-gold/20 space-y-2">
            <div v-for="bet in expandedBets" :key="bet._id" class="p-2 rounded bg-surface/30 text-sm border border-gold/5">
              <div class="flex items-center justify-between mb-1">
                <span class="font-display font-medium text-cream">{{ bet.username }}</span>
                <Badge v-if="bet.result === 'win'" class="bg-emerald text-xs">WIN</Badge>
                <Badge v-else-if="bet.result === 'loss'" variant="destructive" class="text-xs">LOSS</Badge>
              </div>
              <div class="flex items-center justify-between text-muted-foreground font-body">
                <span class="capitalize">{{ bet.type }}:
                  <span v-if="bet.type === 'color'" :class="getValueColor(bet.value)">{{ bet.value?.toUpperCase() }}</span>
                  <span v-else>{{ bet.value }}</span>
                </span>
                <span class="font-display tabular-nums">{{ bet.amount }} -> <span :class="bet.payout > 0 ? 'text-emerald' : ''">{{ bet.payout || 0 }}</span></span>
              </div>
            </div>
          </div>
          <div v-else-if="expandedRound === round.roundId && expandedBets.length === 0" class="ml-2 pl-3 border-l-2 border-gold/20 text-sm text-muted-foreground py-2 font-display tracking-wider">
            No bets in this round
          </div>
        </template>
      </div>

      <Card class="hidden sm:block">
        <CardContent class="p-0">
          <Table>
            <TableHeader>
              <TableRow class="border-gold/10 hover:bg-transparent">
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
                <TableCell colspan="10" class="h-24 text-center text-muted-foreground font-display tracking-wider">Loading rounds...</TableCell>
              </TableRow>
              <TableRow v-else-if="rounds.length === 0">
                <TableCell colspan="10" class="h-24 text-center text-muted-foreground font-display tracking-wider">No rounds found. Play some games first!</TableCell>
              </TableRow>
              <template v-else v-for="round in rounds" :key="round._id">
                <TableRow class="cursor-pointer" @click="toggleExpand(round.roundId)">
                  <TableCell class="font-display font-bold text-cream">{{ getDailyRoundNumber(round.roundId) }}</TableCell>
                  <TableCell class="font-body text-xs text-muted-foreground">{{ round.roundId }}</TableCell>
                  <TableCell>
                    <span :class="['w-8 h-8 inline-flex items-center justify-center rounded text-sm font-display font-bold', getResultColor(round.color)]">
                      {{ round.number }}
                    </span>
                  </TableCell>
                  <TableCell class="text-muted-foreground text-sm font-body">{{ formatDate(round.createdAt) }}</TableCell>
                  <TableCell class="text-right font-display tabular-nums">{{ round.stats?.totalBets || 0 }}</TableCell>
                  <TableCell class="text-right font-display tabular-nums">{{ round.stats?.uniqueUsers || 0 }}</TableCell>
                  <TableCell class="text-right font-display tabular-nums">{{ round.stats?.totalWagered || 0 }}</TableCell>
                  <TableCell class="text-right font-display tabular-nums">{{ round.stats?.totalPayout || 0 }}</TableCell>
                  <TableCell class="text-right font-display font-bold tabular-nums" :class="getProfitClass(round.stats?.netProfit)">
                    {{ round.stats?.netProfit >= 0 ? '+' : '' }}{{ round.stats?.netProfit || 0 }}
                  </TableCell>
                  <TableCell class="text-right text-muted-foreground text-sm">
                    {{ expandedRound === round.roundId ? '▲' : '▼' }}
                  </TableCell>
                </TableRow>
                <TableRow v-if="expandedRound === round.roundId && expandedBets.length > 0">
                  <TableCell colspan="10" class="bg-surface/30 p-4">
                    <div class="text-sm font-display font-medium tracking-[0.12em] uppercase text-cream mb-3">Bets in this round</div>
                    <Table>
                      <TableHeader>
                        <TableRow class="border-gold/10 hover:bg-transparent">
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
                          <TableCell class="font-display font-medium text-cream">{{ bet.username }}</TableCell>
                          <TableCell class="capitalize font-body">{{ bet.type }}</TableCell>
                          <TableCell>
                            <span v-if="bet.type === 'color'" :class="getValueColor(bet.value)">{{ bet.value?.toUpperCase() }}</span>
                            <span v-else-if="bet.type === 'type'" class="uppercase font-body">{{ bet.value }}</span>
                            <span v-else class="font-body">{{ bet.value }}</span>
                          </TableCell>
                          <TableCell class="text-right font-display tabular-nums">{{ bet.amount }}</TableCell>
                          <TableCell>
                            <Badge v-if="bet.result === 'win'" class="bg-emerald">WIN</Badge>
                            <Badge v-else-if="bet.result === 'loss'" variant="destructive">LOSS</Badge>
                            <span v-else class="text-muted-foreground">-</span>
                          </TableCell>
                          <TableCell class="text-right font-display tabular-nums" :class="bet.payout > 0 ? 'text-emerald' : ''">
                            {{ bet.payout || 0 }}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableCell>
                </TableRow>
                <TableRow v-else-if="expandedRound === round.roundId && expandedBets.length === 0">
                  <TableCell colspan="10" class="bg-surface/30 p-4 text-center text-muted-foreground font-display tracking-wider">
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
    const parts = roundId.split('-');
    if (parts.length === 2) {
        return parts[1];
    }
    return roundId.slice(-4).toUpperCase();
};

const getProfitClass = (profit) => {
    if (!profit) return 'text-muted-foreground';
    if (profit > 0) return 'text-emerald';
    if (profit < 0) return 'text-ruby';
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
