<template>
  <div class="min-h-screen bg-background text-foreground p-6">
    <div class="max-w-7xl mx-auto space-y-8">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <div class="flex items-center gap-4">
          <h1 class="text-3xl font-bold bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">Admin Panel</h1>
          
          <!-- Header Stats -->
          <div class="flex items-center gap-2">
            <div class="px-3 py-1 rounded-full bg-secondary text-xs font-medium border border-border">
              Total: {{ stats.totalUsers }}
            </div>
            
            <div 
              @click="filterPending"
              class="px-3 py-1 rounded-full text-xs font-medium border cursor-pointer transition-colors flex items-center gap-1.5"
              :class="[
                stats.pendingUsers > 0 ? 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20' : 'text-muted-foreground border-border bg-secondary hover:bg-secondary/80',
                showPendingOnly ? 'ring-2 ring-yellow-500/50' : ''
              ]"
            >
              <span>Pending: {{ stats.pendingUsers }}</span>
              <svg v-if="showPendingOnly" xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        <div class="flex gap-2">
          <Button variant="outline" size="sm" as-child>
            <router-link to="/admin/rounds">Rounds</router-link>
          </Button>
          <Button variant="outline" size="sm" as-child>
            <router-link to="/admin/logs">Logs</router-link>
          </Button>
        </div>
      </div>

      <!-- Stats Cards -->


      <!-- Users Table - Desktop -->
      <Card class="hidden sm:block">
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
                <TableCell class="font-mono text-green-500 font-bold">{{ Math.floor(user.balance) }}</TableCell>
                <TableCell class="text-muted-foreground">{{ new Date(user.createdAt).toLocaleDateString() }}</TableCell>
                <TableCell>
                  <div class="flex gap-2">
                    <Button size="sm" variant="ghost" @click="viewUserHistory(user)">
                      History
                    </Button>
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
      
      <div v-if="pagination.totalPages > 1" class="mt-4">
        <PaginationControls 
            :current-page="pagination.page" 
            :total-pages="pagination.totalPages"
            :loading="loading"
            @page-change="changePage"
        />
      </div>

      <!-- Users List - Mobile -->
      <Card class="sm:hidden">
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <div class="mt-3">
            <Input 
              v-model="searchQuery" 
              placeholder="Search users..." 
            />
          </div>
        </CardHeader>
        <CardContent class="space-y-3">
          <div 
            v-for="user in filteredUsers" 
            :key="user._id"
            class="p-4 rounded-lg bg-surface border border-border"
          >
            <div class="flex items-center justify-between mb-3">
              <span class="font-medium text-lg">{{ user.username }}</span>
              <span class="font-mono text-green-500 font-bold">{{ Math.floor(user.balance) }}</span>
            </div>
            <div class="flex items-center gap-2 mb-3">
              <Select 
                :model-value="user.status || 'approved'" 
                @update:model-value="(val) => updateStatus(user, val)"
              >
                <SelectTrigger class="w-[120px]" :class="getStatusColor(user.status)">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <span class="text-xs text-muted-foreground">{{ new Date(user.createdAt).toLocaleDateString() }}</span>
            </div>
            <div class="flex gap-2 flex-wrap">
              <Button size="sm" variant="ghost" @click="viewUserHistory(user)" class="flex-1">
                History
              </Button>
              <Button size="sm" variant="outline" @click="openEditBalance(user)" class="flex-1">
                Edit Balance
              </Button>
              <Button size="sm" variant="destructive" @click="confirmDelete(user)" class="flex-1">
                Delete
              </Button>
            </div>
          </div>
          <div v-if="filteredUsers.length === 0" class="text-center text-muted-foreground py-4">
            No users found
          </div>
        </CardContent>
      </Card>

      
      <div v-if="pagination.totalPages > 1 && !loading" class="mt-4 sm:hidden">
        <PaginationControls 
            :current-page="pagination.page" 
            :total-pages="pagination.totalPages"
            :loading="loading"
            @page-change="changePage"
        />
      </div>
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
          <div class="grid grid-cols-4 items-center gap-4">
            <label class="text-right text-sm font-medium">Reason</label>
            <textarea
              v-model="reason"
              class="col-span-3 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Required for audit logs"
            ></textarea>
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
import { useRouter } from 'vue-router';
import socket from '../services/socket';

// ... existing imports ...

onMounted(() => {
  fetchUsers();
  fetchStats();
  
  socket.on('admin:userUpdate', handleUserUpdate);
  socket.on('admin:newUser', (user) => {
    if (pagination.value.page === 1) {
      users.value.unshift(user);
      if (users.value.length > pagination.value.limit) {
          users.value.pop();
      }
    }
    fetchStats();
  });
  socket.on('admin:userDeleted', (userId) => {
    users.value = users.value.filter(u => u._id !== userId);
    fetchStats();
  });
  socket.on('admin:statsUpdate', fetchStats);
  
  // Refresh data on reconnection
  socket.on('connect', () => {
    fetchUsers();
    fetchStats();
  });
});

onUnmounted(() => {
  socket.off('admin:userUpdate', handleUserUpdate);
  socket.off('admin:newUser');
  socket.off('admin:userDeleted');
  socket.off('admin:statsUpdate');
});
</script>
