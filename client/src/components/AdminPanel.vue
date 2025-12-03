<template>
  <div class="min-h-screen bg-background text-foreground p-6">
    <div class="max-w-7xl mx-auto space-y-8">
      <div class="flex justify-between items-center">
        <h1 class="text-3xl font-bold bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">Admin Panel</h1>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ stats.totalUsers }}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="flex items-center justify-between">
              <div class="text-2xl font-bold text-yellow-500">{{ stats.pendingUsers }}</div>
              <Button 
                variant="outline" 
                size="sm" 
                @click="filterPending"
                :class="{ 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500': showPendingOnly }"
              >
                Filter
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold" :class="stats.netProfit >= 0 ? 'text-green-500' : 'text-red-500'">
              {{ stats.netProfit >= 0 ? '+' : '' }}₹{{ Math.floor(stats.netProfit) }}
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Users Table -->
      <Card>
        <CardHeader>
          <div class="flex items-center justify-between">
            <CardTitle>User Management</CardTitle>
            <div class="w-64">
              <Input 
                v-model="searchQuery" 
                placeholder="Search users..." 
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="user in filteredUsers" :key="user._id">
                <TableCell class="font-medium">{{ user.username }}</TableCell>
                <TableCell>
                  <Select 
                    :model-value="user.status || 'approved'" 
                    @update:model-value="(val) => updateStatus(user, val)"
                  >
                    <SelectTrigger class="w-[130px]" :class="getStatusColor(user.status)">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell class="font-mono text-green-500 font-bold">₹{{ Math.floor(user.balance) }}</TableCell>
                <TableCell class="text-muted-foreground">{{ new Date(user.createdAt).toLocaleDateString() }}</TableCell>
                <TableCell>
                  <div class="flex gap-2">
                    <Button size="sm" variant="outline" @click="openEditBalance(user)">
                      Edit Balance
                    </Button>
                    <Button size="sm" variant="destructive" @click="confirmDelete(user)">
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>

    <!-- Edit Balance Dialog -->
    <Dialog :open="!!editingUser" @update:open="(val) => !val && (editingUser = null)">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Balance: {{ editingUser?.username }}</DialogTitle>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="grid grid-cols-4 items-center gap-4">
            <label class="text-right text-sm font-medium">New Balance</label>
            <Input
              v-model.number="newBalance"
              type="number"
              class="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="editingUser = null">Cancel</Button>
          <Button @click="saveBalance">Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <Dialog :open="!!deletingUser" @update:open="(val) => !val && (deletingUser = null)">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle class="text-destructive">Delete User</DialogTitle>
        </DialogHeader>
        <div class="py-4">
          <p class="text-muted-foreground">
            Are you sure you want to delete user <span class="font-bold text-foreground">{{ deletingUser?.username }}</span>? This action cannot be undone.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="deletingUser = null">Cancel</Button>
          <Button variant="destructive" @click="deleteUser">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import api from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const users = ref([]);
const stats = ref({
  totalUsers: 0,
  pendingUsers: 0,
  netProfit: 0
});
const searchQuery = ref('');
const showPendingOnly = ref(false);
const editingUser = ref(null);
const deletingUser = ref(null);
const newBalance = ref(0);

const fetchStats = async () => {
  try {
    const res = await api.get('/admin/stats');
    stats.value = res.data;
  } catch (err) {
    console.error(err);
  }
};

const fetchUsers = async () => {
  try {
    const res = await api.get('/admin/users');
    users.value = res.data;
  } catch (err) {
    console.error(err);
    alert('Failed to fetch users');
  }
};

const filteredUsers = computed(() => {
  let result = users.value.filter(u => u.role !== 'admin');
  
  if (showPendingOnly.value) {
    result = result.filter(u => u.status === 'pending');
  }
  
  if (searchQuery.value) {
    result = result.filter(u => u.username.toLowerCase().includes(searchQuery.value.toLowerCase()));
  }
  
  return result;
});

const filterPending = () => {
  showPendingOnly.value = !showPendingOnly.value;
};

const getStatusColor = (status) => {
  switch (status) {
    case 'approved': return 'text-green-500 border-green-500/20 bg-green-500/10';
    case 'rejected': return 'text-red-500 border-red-500/20 bg-red-500/10';
    case 'pending': return 'text-yellow-500 border-yellow-500/20 bg-yellow-500/10';
    default: return '';
  }
};

const openEditBalance = (user) => {
  editingUser.value = user;
  newBalance.value = user.balance;
};

const saveBalance = async () => {
  if (!editingUser.value) return;
  
  try {
    const res = await api.put(`/admin/users/${editingUser.value._id}/balance`, {
      balance: newBalance.value
    });
    
    // Update local state is handled by socket, but we can do optimistic update too
    // const index = users.value.findIndex(u => u._id === editingUser.value._id);
    // if (index !== -1) {
    //   users.value[index] = res.data;
    // }
    
    editingUser.value = null;
    fetchStats(); // Refresh stats
  } catch (err) {
    console.error(err);
    alert('Failed to update balance');
  }
};

const updateStatus = async (user, status) => {
  try {
    const res = await api.put(`/admin/users/${user._id}/status`, { status });
    fetchStats(); // Refresh stats
  } catch (err) {
    console.error(err);
    alert('Failed to update status');
  }
};

const confirmDelete = (user) => {
  deletingUser.value = user;
};

const deleteUser = async () => {
  if (!deletingUser.value) return;

  try {
    await api.delete(`/admin/users/${deletingUser.value._id}`);
    users.value = users.value.filter(u => u._id !== deletingUser.value._id);
    deletingUser.value = null;
    fetchStats(); // Refresh stats
  } catch (err) {
    console.error(err);
    alert('Failed to delete user');
  }
};

// Realtime Updates
const handleUserUpdate = (updatedUser) => {
  const index = users.value.findIndex(u => u._id === updatedUser._id);
  if (index !== -1) {
    users.value[index] = updatedUser;
  } else if (updatedUser.role !== 'admin') {
    // New user?
    users.value.unshift(updatedUser);
  }
  fetchStats(); // Refresh stats on any user update
};

onMounted(() => {
  fetchUsers();
  fetchStats();
  
  if (authStore.socket) {
    authStore.socket.on('admin:userUpdate', handleUserUpdate);
  }
});

onUnmounted(() => {
  if (authStore.socket) {
    authStore.socket.off('admin:userUpdate', handleUserUpdate);
  }
});
</script>
