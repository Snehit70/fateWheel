<template>
  <div class="min-h-screen bg-background text-foreground p-6">
    <div class="max-w-7xl mx-auto space-y-8">
      <div class="flex justify-between items-center">
        <h1 class="text-3xl font-bold bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">System Logs</h1>
        <Button variant="outline" as-child>
          <router-link to="/admin" class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Panel
          </router-link>
        </Button>
      </div>

      <Card>
        <CardContent class="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Target User</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="logsLoading">
                <TableCell colspan="5" class="h-24 text-center">Loading logs...</TableCell>
              </TableRow>
              <TableRow v-else-if="logs.length === 0">
                <TableCell colspan="5" class="h-24 text-center">No logs found</TableCell>
              </TableRow>
              <TableRow v-else v-for="log in logs" :key="log._id">
                <TableCell>
                  <Badge :variant="getActionVariant(log.action)">
                    {{ log.action.replace(/_/g, ' ') }}
                  </Badge>
                </TableCell>
                <TableCell class="font-medium">{{ log.targetUsername || '-' }}</TableCell>
                <TableCell class="text-muted-foreground">{{ getCleanDetails(log.details) }}</TableCell>
                <TableCell class="text-muted-foreground">{{ getReasonFromDetails(log.details) }}</TableCell>
                <TableCell class="text-muted-foreground text-xs whitespace-nowrap">{{ new Date(log.createdAt).toLocaleString() }}</TableCell>
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
const logs = ref([]);
const logsLoading = ref(false);

const fetchLogs = async () => {
    logsLoading.value = true;
    try {
        const res = await api.get('/admin/logs');
        logs.value = res.data;
    } catch (err) {
        console.error("Failed to fetch logs:", err);
    } finally {
        logsLoading.value = false;
    }
};

const getActionVariant = (action) => {
    switch(action) {
        case 'approve_user': return 'default'; // Green-ish usually
        case 'reject_user': return 'destructive';
        case 'delete_user': return 'destructive';
        case 'update_balance': return 'secondary';
        default: return 'outline';
    }
};

// Remove "Reason: ..." from details since it now has its own column
const getCleanDetails = (details) => {
    if (!details) return '-';
    // Remove the "Reason: ..." part from the end
    return details.replace(/\.?\s*Reason:.*$/i, '').trim() || '-';
};

// Extract the reason from the details string
const getReasonFromDetails = (details) => {
    if (!details) return '-';
    const match = details.match(/Reason:\s*(.+)$/i);
    return match ? match[1].trim() : '-';
};

onMounted(() => {
    fetchLogs();
    
    if (authStore.socket) {
        authStore.socket.on('admin:newLog', (log) => {
            logs.value.unshift(log);
            if (logs.value.length > 100) {
                logs.value.pop();
            }
        });
    }
});

onUnmounted(() => {
    if (authStore.socket) {
        authStore.socket.off('admin:newLog');
    }
});
</script>
