<template>
  <div class="min-h-screen bg-background text-foreground p-2 sm:p-6">
    <div class="max-w-7xl mx-auto space-y-4">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 class="text-2xl font-bold bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">Audit Logs</h1>
        <div class="flex gap-2 items-center">
          <!-- Filter -->
          <Select v-model="selectedAction" @update:model-value="onFilterChange">
            <SelectTrigger class="w-[140px]">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="approve_user">Approve User</SelectItem>
              <SelectItem value="reject_user">Reject User</SelectItem>
              <SelectItem value="delete_user">Delete User</SelectItem>
              <SelectItem value="update_balance">Update Balance</SelectItem>
              <SelectItem value="toggle_reset">Toggle Reset</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" as-child>
            <router-link to="/admin" class="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </router-link>
          </Button>
        </div>
      </div>

      <!-- Desktop Table -->
      <Card class="hidden sm:block">
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
              <TableRow v-if="loading">
                <TableCell colspan="5" class="h-24 text-center">Loading logs...</TableCell>
              </TableRow>
              <TableRow v-else-if="logs.length === 0">
                <TableCell colspan="5" class="h-24 text-center text-muted-foreground">No logs found</TableCell>
              </TableRow>
              <TableRow v-else v-for="log in logs" :key="log._id" class="transition-colors">
                <TableCell>
                  <Badge :variant="getActionVariant(log.action)">
                    {{ formatAction(log.action) }}
                  </Badge>
                </TableCell>
                <TableCell class="font-medium">{{ log.targetUsername || '-' }}</TableCell>
                <TableCell class="text-muted-foreground max-w-[200px] truncate" :title="log.details">{{ log.details || '-' }}</TableCell>
                <TableCell class="text-muted-foreground max-w-[150px] truncate" :title="getReasonDisplay(log)">{{ getReasonDisplay(log) }}</TableCell>
                <TableCell class="text-muted-foreground text-xs whitespace-nowrap">{{ formatTime(log.createdAt) }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <!-- Mobile Cards -->
      <div class="sm:hidden space-y-3">
        <div v-if="loading" class="text-center text-muted-foreground py-8">Loading logs...</div>
        <div v-else-if="logs.length === 0" class="text-center text-muted-foreground py-8">No logs found</div>
        <div v-else v-for="log in logs" :key="log._id" class="p-4 rounded-lg bg-surface border border-border">
          <div class="flex items-center justify-between mb-2">
            <Badge :variant="getActionVariant(log.action)">{{ formatAction(log.action) }}</Badge>
            <span class="text-xs text-muted-foreground">{{ formatTime(log.createdAt) }}</span>
          </div>
          <div class="space-y-1 text-sm">
            <div><span class="text-muted-foreground">Target:</span> <span class="font-medium">{{ log.targetUsername || '-' }}</span></div>
            <div v-if="log.details"><span class="text-muted-foreground">Details:</span> {{ log.details }}</div>
            <div v-if="getReasonDisplay(log) !== '-'"><span class="text-muted-foreground">Reason:</span> {{ getReasonDisplay(log) }}</div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const logs = ref([]);
const loading = ref(false);
const selectedAction = ref('all');
const pagination = ref({
    page: 1,
    limit: 20,
    totalPages: 1,
    total: 0
});

const fetchLogs = async () => {
    loading.value = true;
    try {
        const params = {
            page: pagination.value.page,
            limit: pagination.value.limit
        };
        if (selectedAction.value && selectedAction.value !== 'all') {
            params.action = selectedAction.value;
        }

        const res = await api.get('/admin/logs', { params });

        if (res.data.pagination) {
            logs.value = res.data.data;
            pagination.value = {
                page: res.data.pagination.page,
                limit: res.data.pagination.limit,
                totalPages: res.data.pagination.pages,
                total: res.data.pagination.total
            };
        } else {
            logs.value = res.data;
        }
    } catch (err) {
        console.error("Failed to fetch logs:", err);
    } finally {
        loading.value = false;
    }
};

const onFilterChange = () => {
    pagination.value.page = 1;
    fetchLogs();
};

const changePage = (newPage) => {
    pagination.value.page = newPage;
    fetchLogs();
};

const getActionVariant = (action) => {
    switch(action) {
        case 'approve_user': return 'default';
        case 'reject_user': return 'destructive';
        case 'delete_user': return 'destructive';
        case 'update_balance': return 'secondary';
        case 'toggle_reset': return 'outline';
        default: return 'outline';
    }
};

const formatAction = (action) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleString();
};

// Support both new 'reason' field and legacy 'Reason:' embedded in details
const getReasonDisplay = (log) => {
    if (log.reason) return log.reason;
    if (log.details) {
        const match = log.details.match(/Reason:\s*([\s\S]+)$/i);
        if (match) return match[1].trim();
    }
    return '-';
};

const handleNewLog = (log) => {
    if (pagination.value.page === 1) {
        // Check if filter matches
        if (selectedAction.value === 'all' || selectedAction.value === log.action) {
            logs.value.unshift(log);
            if (logs.value.length > pagination.value.limit) {
                logs.value.pop();
            }
        }
    }
};

onMounted(() => {
    fetchLogs();
    socket.on('admin:newLog', handleNewLog);
});

onUnmounted(() => {
    socket.off('admin:newLog', handleNewLog);
});
</script>
