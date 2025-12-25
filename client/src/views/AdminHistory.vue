<template>
  <div class="min-h-screen bg-background text-foreground p-4 sm:p-6">
    <div class="max-w-7xl mx-auto space-y-6">
      <div class="flex items-center gap-4">
        <Button variant="outline" size="icon" @click="$router.push('/admin')">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
          </svg>
        </Button>
        <h1 class="text-3xl font-bold bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
          Admin Withdrawal History
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Withdrawals</CardTitle>
        </CardHeader>
        <CardContent>
          <!-- Desktop Table -->
          <div class="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="tx in withdrawals" :key="tx._id">
                  <TableCell>{{ new Date(tx.createdAt).toLocaleString() }}</TableCell>
                  <TableCell class="font-medium">{{ tx.user?.username || 'Unknown' }}</TableCell>
                  <TableCell class="font-mono text-red-500 font-bold">-{{ tx.amount }}</TableCell>
                  <TableCell class="text-muted-foreground">{{ tx.description }}</TableCell>
                </TableRow>
                <TableRow v-if="withdrawals.length === 0">
                    <TableCell colspan="4" class="text-center py-8 text-muted-foreground">
                        No withdrawal history found.
                    </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <!-- Mobile List -->
          <div class="sm:hidden space-y-4">
            <div 
                v-for="tx in withdrawals" 
                :key="tx._id"
                class="p-4 rounded-lg bg-surface border border-border"
            >
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <div class="text-sm text-muted-foreground">{{ new Date(tx.createdAt).toLocaleString() }}</div>
                        <div class="font-medium">{{ tx.user?.username || 'Unknown' }}</div>
                    </div>
                    <div class="font-mono text-red-500 font-bold text-lg">-{{ tx.amount }}</div>
                </div>
                <div class="text-sm text-muted-foreground">{{ tx.description }}</div>
            </div>
             <div v-if="withdrawals.length === 0" class="text-center py-8 text-muted-foreground">
                No withdrawal history found.
            </div>
          </div>
          
           <div v-if="pagination.totalPages > 1" class="mt-4">
            <PaginationControls 
                :current-page="pagination.page" 
                :total-pages="pagination.totalPages"
                :loading="loading"
                @page-change="changePage"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../services/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import PaginationControls from '@/components/ui/PaginationControls.vue';

const withdrawals = ref([]);
const loading = ref(false);
const pagination = ref({
    page: 1,
    limit: 20,
    totalPages: 1,
    total: 0
});

const fetchWithdrawals = async () => {
    loading.value = true;
    try {
        const res = await api.get('/admin/withdrawals', {
            params: {
                page: pagination.value.page,
                limit: pagination.value.limit
            }
        });
        
        withdrawals.value = res.data.data;
        pagination.value = {
            page: res.data.pagination.page,
            limit: res.data.pagination.limit,
            totalPages: res.data.pagination.pages,
            total: res.data.pagination.total
        };
    } catch (err) {
        console.error(err);
    } finally {
        loading.value = false;
    }
};

const changePage = (newPage) => {
    pagination.value.page = newPage;
    fetchWithdrawals();
};

onMounted(() => {
    fetchWithdrawals();
});
</script>
