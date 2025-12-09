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

      <Card>
        <CardContent class="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="w-20">Round #</TableHead>
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
                  <TableCell class="font-mono font-bold">{{ round.roundNumber }}</TableCell>
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
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const rounds = ref([]);
const loading = ref(true);
const expandedRound = ref(null);
const expandedBets = ref([]);

const fetchRounds = async () => {
  try {
    const res = await api.get('/admin/rounds');
    rounds.value = res.data;
  } catch (err) {
    console.error('Failed to fetch rounds:', err);
  } finally {
    loading.value = false;
  }
};

const toggleExpand = async (roundId) => {
  if (expandedRound.value === roundId) {
    expandedRound.value = null;
    expandedBets.value = [];
    return;
  }

  expandedRound.value = roundId;
  try {
    const res = await api.get(`/admin/rounds/${roundId}`);
    expandedBets.value = res.data.bets;
  } catch (err) {
    console.error('Failed to fetch round details:', err);
    expandedBets.value = [];
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

const getResultColor = (color) => {
  switch (color) {
    case 'red': return 'bg-red-500';
    case 'black': return 'bg-[#2d1f3d] shadow-[0_0_6px_rgba(138,43,226,0.3)]';
    case 'green': return 'bg-green-500';
    default: return 'bg-gray-500';
  }
};

const getProfitClass = (profit) => {
  if (profit > 0) return 'text-green-500';
  if (profit < 0) return 'text-red-500';
  return 'text-muted-foreground';
};

const getValueColor = (value) => {
  switch (value) {
    case 'red': return 'text-red-500 font-bold';
    case 'black': return 'text-purple-400 font-bold';
    case 'green': return 'text-green-500 font-bold';
    default: return '';
  }
};

onMounted(() => {
  fetchRounds();
});
</script>
