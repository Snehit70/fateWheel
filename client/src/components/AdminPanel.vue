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
            <div class="text-2xl font-bold">{{ totalUsersCount }}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Total Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold text-green-500">₹{{ Math.floor(totalSystemBalance) }}</div>
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
                <TableHead>Role</TableHead>
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
                  <Badge :variant="user.role === 'admin' ? 'destructive' : 'secondary'">
                    {{ user.role }}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge :variant="getStatusVariant(user.status)">
                    {{ user.status || 'approved' }}
                  </Badge>
                </TableCell>
                <TableCell class="font-mono text-green-500">₹{{ Math.floor(user.balance) }}</TableCell>
                <TableCell class="text-muted-foreground">{{ new Date(user.createdAt).toLocaleDateString() }}</TableCell>
                <TableCell>
                  <div class="flex gap-2">
                    <template v-if="user.status === 'pending'">
                      <Button size="sm" variant="outline" class="text-green-500 hover:text-green-600 border-green-500/20 hover:bg-green-500/10" @click="updateStatus(user, 'approved')">
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" class="text-red-500 hover:text-red-600 border-red-500/20 hover:bg-red-500/10" @click="updateStatus(user, 'rejected')">
                        Reject
                      </Button>
                    </template>
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
import { ref, computed, onMounted } from 'vue';
import api from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const users = ref([]);
const searchQuery = ref('');
const editingUser = ref(null);
const deletingUser = ref(null);
const newBalance = ref(0);

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
  if (searchQuery.value) {
    result = result.filter(u => u.username.toLowerCase().includes(searchQuery.value.toLowerCase()));
  }
  return result;
});

const totalSystemBalance = computed(() => {
  return users.value
    .filter(u => u.role !== 'admin')
    .reduce((sum, u) => sum + u.balance, 0);
});

const totalUsersCount = computed(() => {
  return users.value.filter(u => u.role !== 'admin').length;
});

const getStatusVariant = (status) => {
  switch (status) {
    case 'approved': return 'default'; // default is usually primary/black which looks good for approved
    case 'rejected': return 'destructive';
    case 'pending': return 'secondary'; // or outline
    default: return 'default';
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
    
    // Update local state
    const index = users.value.findIndex(u => u._id === editingUser.value._id);
    if (index !== -1) {
      users.value[index] = res.data;
    }
    
    editingUser.value = null;
  } catch (err) {
    console.error(err);
    alert('Failed to update balance');
  }
};

const updateStatus = async (user, status) => {
  try {
    const res = await api.put(`/admin/users/${user._id}/status`, { status });
    
    // Update local state
    const index = users.value.findIndex(u => u._id === user._id);
    if (index !== -1) {
      users.value[index] = res.data;
    }
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
  } catch (err) {
    console.error(err);
    alert('Failed to delete user');
  }
};

onMounted(() => {
  fetchUsers();
});
</script>
