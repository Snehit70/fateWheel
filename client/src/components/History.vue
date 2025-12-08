<template>
  <div class="min-h-screen bg-background text-foreground pt-24 px-4 pb-12">
    <div class="max-w-6xl mx-auto space-y-8">
      <div class="flex items-center justify-between">
        <h1 class="text-3xl font-bold font-mono tracking-wider">BET HISTORY</h1>
        <Button variant="secondary" as-child>
          <router-link to="/">
            BACK TO GAME
          </router-link>
        </Button>
      </div>

      <Card>
        <CardContent class="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Bet Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Payout</TableHead>
                <TableHead>Balance After</TableHead>
                <TableHead>Winning Number</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="loading">
                <TableCell colspan="8" class="h-24 text-center">Loading history...</TableCell>
              </TableRow>
              <TableRow v-else-if="history.length === 0">
                <TableCell colspan="8" class="h-24 text-center">No bets found. Start playing!</TableCell>
              </TableRow>
              <TableRow v-else v-for="item in history" :key="item._id">
                <TableCell class="text-muted-foreground whitespace-nowrap">
                  {{ formatDate(item.createdAt) }}
                </TableCell>
                
                <!-- Type & Value -->
                <TableCell class="font-medium capitalize">
                  <span v-if="isTransaction(item)" :class="getTransactionTypeClass(item.type)">
                    {{ item.type }}
                  </span>
                  <span v-else>
                    {{ item.type }}
                  </span>
                </TableCell>
                <TableCell>
                  <span v-if="isTransaction(item)" class="text-muted-foreground italic">
                    {{ item.description || '-' }}
                  </span>
                  <span v-else :class="getValueClass(item)">
                    {{ formatValue(item) }}
                  </span>
                </TableCell>

                <!-- Amount -->
                <TableCell class="font-mono">
                  <span :class="isTransaction(item) && item.type === 'deposit' ? 'text-green-500 font-bold' : ''">
                    ₹{{ item.amount }}
                  </span>
                </TableCell>

                <!-- Result -->
                <TableCell>
                  <Badge v-if="!isTransaction(item)" :variant="item.result === 'win' ? 'default' : 'destructive'" :class="item.result === 'win' ? 'bg-green-500 hover:bg-green-600' : ''">
                    {{ item.result }}
                  </Badge>
                  <span v-else class="text-muted-foreground text-xs uppercase font-bold">
                    Completed
                  </span>
                </TableCell>

                <!-- Payout / Balance After -->
                <TableCell class="font-mono font-bold">
                  <span v-if="isTransaction(item)" class="text-muted-foreground">
                    Bal: ₹{{ item.balanceAfter }}
                  </span>
                  <span v-else :class="item.payout > 0 ? 'text-green-500' : 'text-muted-foreground'">
                    {{ item.payout > 0 ? '+' : '' }}₹{{ item.payout }}
                  </span>
                </TableCell>

                <!-- Balance After -->
                <TableCell class="font-mono">
                  <span class="text-muted-foreground">
                    ₹{{ item.balanceAfter ?? '-' }}
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
                    <div v-else-if="isTransaction(item)" class="text-muted-foreground text-xs">
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
import { ref, onMounted, onUnmounted } from 'vue';
import api from '../services/api';
import { useAuthStore } from '../stores/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const authStore = useAuthStore();
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

onMounted(() => {
  fetchHistory();

  if (authStore.socket) {
    // Refresh history on balance update (covers wins and admin adjustments)
    authStore.socket.on('balanceUpdate', fetchHistory);

    // Refresh history when game ends (covers losses/completed bets)
    authStore.socket.on('gameState', (data) => {
        if (data.state === 'RESULT') {
            // Add a small delay to ensure server DB write is fully propagated if there's any lag
            // (Though server awaits save before emitting, so it should be fine)
            fetchHistory();
        }
    });
  }
});

onUnmounted(() => {
    if (authStore.socket) {
        authStore.socket.off('balanceUpdate', fetchHistory);
        // We can't easily off the anonymous function for gameState unless we name it
        // But since we're unmounting, we should probably just remove all listeners for this component context if possible
        // Or better, define the handler
    }
});
</script>
