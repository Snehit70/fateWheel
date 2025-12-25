<template>
  <div class="min-h-screen bg-background text-foreground p-2">
    <div class="max-w-7xl mx-auto space-y-2">
      <div
        class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0"
      >
        <div class="flex items-center gap-2">
          <h1
            class="text-2xl font-bold bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent"
          >
            Admin
          </h1>

          <!-- Header Stats -->
          <div class="flex items-center gap-2">
            <div
              class="px-3 py-1 rounded-full bg-secondary text-xs font-medium border border-border"
            >
              Total: {{ stats.totalUsers }}
            </div>

            <div
              @click="filterPending"
              class="px-3 py-1 rounded-full text-xs font-medium border cursor-pointer transition-colors flex items-center gap-1.5"
              :class="[
                stats.pendingUsers > 0
                  ? 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20'
                  : 'text-muted-foreground border-border bg-secondary hover:bg-secondary/80',
                showPendingOnly ? 'ring-2 ring-yellow-500/50' : '',
              ]"
            >
              <span>Pending: {{ stats.pendingUsers }}</span>
              <svg
                v-if="showPendingOnly"
                xmlns="http://www.w3.org/2000/svg"
                class="h-3 w-3"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>

        <div class="flex gap-2">
          <Button variant="outline" size="sm" as-child>
            <router-link to="/admin/logs">Logs</router-link>
          </Button>
          <Button variant="outline" size="sm" as-child>
            <router-link to="/admin/rounds">Rounds</router-link>
          </Button>
        </div>
      </div>

      <!-- Admin Management Card -->
      <Card class="border-orange-500/20 bg-orange-500/5">
        <CardContent class="p-3">
          <div class="flex items-center justify-between gap-4 text-sm">
            <!-- Left Side: Admin & Net Profit -->
            <div class="flex items-center gap-6">
              <div class="flex items-center gap-2">
                <span class="text-muted-foreground">Admin:</span>
                <span class="font-bold">{{ adminUser?.username || "Loading..." }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-muted-foreground">Net Profit:</span>
                <span
                  class="font-mono font-bold"
                  :class="stats.netProfit >= 0 ? 'text-green-500' : 'text-red-500'"
                >
                  {{ Math.floor(stats.netProfit) }}
                </span>
              </div>
            </div>

            <!-- Right Side: Actions -->
            <div class="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                @click="$router.push('/admin/history')"
                class="h-7 px-3 text-xs"
              >
                History
              </Button>
              <Button
                size="sm"
                @click="openWithdraw"
                class="h-7 px-3 text-xs bg-orange-500 hover:bg-orange-600 text-white"
              >
                Withdraw Profit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Users Table - Desktop -->
      <Card class="hidden sm:block">
        <CardHeader>
          <div class="flex items-center justify-between">
            <CardTitle>User Management</CardTitle>
            <div class="w-64">
              <Input v-model="searchQuery" placeholder="Search users..." />
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
                <TableHead>Reset</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>History</TableHead>
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
                    <SelectTrigger
                      class="w-[130px]"
                      :class="getStatusColor(user.status)"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell class="font-mono text-green-500 font-bold">{{
                  Math.floor(user.balance)
                }}</TableCell>

                <!-- Reset Password Toggle -->
                <TableCell>
                  <div
                    v-if="user.status !== 'approved'"
                    class="flex items-center space-x-2"
                  >
                    <button
                      @click="toggleResetPermission(user)"
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                      :class="
                        user.allowPasswordReset ? 'bg-primary' : 'bg-input'
                      "
                    >
                      <span
                        class="pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform"
                        :class="
                          user.allowPasswordReset
                            ? 'translate-x-5'
                            : 'translate-x-0.5'
                        "
                      />
                    </button>
                    <span class="text-xs text-muted-foreground">{{
                      user.allowPasswordReset ? "On" : "Off"
                    }}</span>
                  </div>
                  <div v-else class="text-xs text-muted-foreground">-</div>
                </TableCell>

                <TableCell class="text-muted-foreground">{{
                  new Date(user.createdAt).toLocaleDateString()
                }}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    @click="viewUserHistory(user)"
                    class="bg-orange-500 hover:bg-orange-600 text-white border-none"
                  >
                    History
                  </Button>
                </TableCell>
                <TableCell>
                  <div class="flex gap-2">
                    <Button
                      size="sm"
                      @click="openEditBalance(user)"
                      class="bg-orange-500 hover:bg-orange-600 text-white border-none"
                    >
                      Edit Balance
                    </Button>
                    <Button
                      v-if="user.status && user.status !== 'approved'"
                      size="sm"
                      variant="destructive"
                      @click="confirmDelete(user)"
                    >
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
            <Input v-model="searchQuery" placeholder="Search users..." />
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
              <span class="font-mono text-green-500 font-bold">{{
                Math.floor(user.balance)
              }}</span>
            </div>
            <div class="flex items-center gap-2 mb-3">
              <Select
                :model-value="user.status || 'approved'"
                @update:model-value="(val) => updateStatus(user, val)"
              >
                <SelectTrigger
                  class="w-[120px]"
                  :class="getStatusColor(user.status)"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <span class="text-xs text-muted-foreground">{{
                new Date(user.createdAt).toLocaleDateString()
              }}</span>
            </div>

            <!-- Mobile Reset Toggle -->
            <div
              v-if="user.status !== 'approved'"
              class="flex items-center justify-between mb-3 p-2 bg-secondary/50 rounded"
            >
              <span class="text-sm font-medium">Allow Password Reset</span>
              <div class="flex items-center gap-2">
                <span class="text-xs text-muted-foreground">{{
                  user.allowPasswordReset ? "Allowed" : "Denied"
                }}</span>
                <button
                  @click="toggleResetPermission(user)"
                  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                  :class="user.allowPasswordReset ? 'bg-primary' : 'bg-input'"
                >
                  <span
                    class="pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform"
                    :class="
                      user.allowPasswordReset
                        ? 'translate-x-5'
                        : 'translate-x-0.5'
                    "
                  />
                </button>
              </div>
            </div>

            <div class="flex gap-2 flex-wrap">
              <Button
                size="sm"
                @click="viewUserHistory(user)"
                class="flex-1 bg-orange-500 hover:bg-orange-600 text-white border-none"
              >
                History
              </Button>
              <Button
                size="sm"
                @click="openEditBalance(user)"
                class="flex-1 bg-orange-500 hover:bg-orange-600 text-white border-none"
              >
                Edit Balance
              </Button>
              <Button
                v-if="user.status && user.status !== 'approved'"
                size="sm"
                variant="destructive"
                @click="confirmDelete(user)"
                class="flex-1"
              >
                Delete
              </Button>
            </div>
          </div>
          <div
            v-if="filteredUsers.length === 0"
            class="text-center text-muted-foreground py-4"
          >
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
    <Dialog
      :open="!!editingUser"
      @update:open="(val) => !val && (editingUser = null)"
    >
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
    <Dialog
      :open="!!deletingUser"
      @update:open="(val) => !val && (deletingUser = null)"
    >
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle class="text-destructive">Delete User</DialogTitle>
        </DialogHeader>
        <div class="py-4">
          <p class="text-muted-foreground">
            Are you sure you want to delete user
            <span class="font-bold text-foreground">{{
              deletingUser?.username
            }}</span
            >? This action cannot be undone.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="deletingUser = null">Cancel</Button>
          <Button variant="destructive" @click="deleteUser">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Withdraw Profit Dialog -->
    <Dialog :open="showWithdrawModal" @update:open="showWithdrawModal = $event">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Withdraw Profit</DialogTitle>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="text-sm text-muted-foreground mb-2">
            Available Net Profit:
            <span
              class="font-mono font-bold"
              :class="stats.netProfit >= 0 ? 'text-green-500' : 'text-red-500'"
              >{{ Math.floor(stats.netProfit) }}</span
            >
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <label class="text-right text-sm font-medium">Amount</label>
            <Input
              v-model.number="withdrawAmount"
              type="number"
              class="col-span-3"
              placeholder="0"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showWithdrawModal = false"
            >Cancel</Button
          >
          <Button
            @click="confirmWithdraw"
            :disabled="!withdrawAmount || withdrawAmount <= 0"
            >Withdraw</Button
          >
        </DialogFooter>
      </DialogContent>
    </Dialog>


  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import api from "../services/api";
import socket from "../services/socket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "../stores/auth";
import { useToast } from "../composables/useToast";
import { getStatusColor } from "../utils/game";
import PaginationControls from "@/components/ui/PaginationControls.vue";

const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();
const users = ref([]);
const stats = ref({
  totalUsers: 0,
  pendingUsers: 0,
  netProfit: 0,
});
const searchQuery = ref("");
const showPendingOnly = ref(false);
const editingUser = ref(null);
const deletingUser = ref(null);
const newBalance = ref(0);
const reason = ref("");

// Admin Management
const adminUser = computed(() => {
  // If we have users loaded, try to find the admin user details from the list (if displayed) or just use auth store
  // authStore user might not have createdAt, so we prefer finding in users list if possible
  // But typically admins might not see themselves in the user list if filtered out?
  // The user list *does* filter out admins in `filteredUsers` computed, but `users` has everyone?
  // Let's check fetchUsers: It calls /api/admin/users which returns all users.
  // So we can find 'admin' role in `users.value`.
  return users.value.find((u) => u.role === "admin") || authStore.user;
});

const showWithdrawModal = ref(false);
const withdrawAmount = ref(null);



const loading = ref(false);
const pagination = ref({
  page: 1,
  limit: 20,
  totalPages: 1,
  total: 0,
});

const fetchStats = async () => {
  try {
    const res = await api.get("/admin/stats");
    stats.value = res.data;
  } catch (err) {
    console.error(err);
  }
};

const fetchUsers = async () => {
  loading.value = true;
  try {
    const res = await api.get("/admin/users", {
      params: {
        page: pagination.value.page,
        limit: pagination.value.limit,
      },
    });

    if (res.data.pagination) {
      users.value = res.data.data;
      pagination.value = {
        page: res.data.pagination.page,
        limit: res.data.pagination.limit,
        totalPages: res.data.pagination.pages,
        total: res.data.pagination.total,
      };
    } else {
      // Fallback or legacy response
      users.value = res.data;
    }
  } catch (err) {
    console.error(err);
    toast.error("Failed to fetch users");
  } finally {
    loading.value = false;
  }
};

const changePage = (newPage) => {
  pagination.value.page = newPage;
  fetchUsers();
};

const filteredUsers = computed(() => {
  let result = users.value.filter((u) => u.role !== "admin");

  if (showPendingOnly.value) {
    result = result.filter((u) => u.status === "pending");
  }

  if (searchQuery.value) {
    result = result.filter((u) =>
      u.username.toLowerCase().includes(searchQuery.value.toLowerCase()),
    );
  }

  return result;
});

const filterPending = () => {
  showPendingOnly.value = !showPendingOnly.value;
};

const openEditBalance = (user) => {
  editingUser.value = user;
  newBalance.value = user.balance;
  reason.value = "";
};

const saveBalance = async () => {
  if (!editingUser.value) return;

  if (!reason.value.trim()) {
    toast.warning("Please provide a reason for this change.");
    return;
  }

  try {
    const res = await api.put(`/admin/users/${editingUser.value._id}/balance`, {
      balance: newBalance.value,
      reason: reason.value,
    });

    // Update local state immediately
    const index = users.value.findIndex((u) => u._id === editingUser.value._id);
    if (index !== -1) {
      users.value[index] = res.data;
    }

    editingUser.value = null;
    fetchStats(); // Refresh stats
    toast.success("Balance updated successfully");
  } catch (err) {
    console.error(err);
    toast.error("Failed to update balance");
  }
};

const updateStatus = async (user, status) => {
  try {
    const res = await api.put(`/admin/users/${user._id}/status`, { status });

    // Update local state immediately
    const index = users.value.findIndex((u) => u._id === user._id);
    if (index !== -1) {
      users.value[index] = res.data;
    }

    fetchStats(); // Refresh stats
  } catch (err) {
    console.error(err);
    toast.error("Failed to update status");
  }
};

const toggleResetPermission = async (user) => {
  try {
    const newValue = !user.allowPasswordReset;
    const res = await api.put(`/admin/users/${user._id}/allow-reset`, {
      allowPasswordReset: newValue,
    });

    // Optimistic update (though handled by socket usually)
    const index = users.value.findIndex((u) => u._id === user._id);
    if (index !== -1) {
      users.value[index].allowPasswordReset = newValue;
    }
  } catch (err) {
    console.error(err);
    toast.error(
      "Failed to toggle reset permission: " +
        (err.response?.data?.msg || err.message),
    );
  }
};

const confirmDelete = (user) => {
  deletingUser.value = user;
};

const deleteUser = async () => {
  if (!deletingUser.value) return;

  try {
    await api.delete(`/admin/users/${deletingUser.value._id}`);
    users.value = users.value.filter((u) => u._id !== deletingUser.value._id);
    deletingUser.value = null;
    fetchStats(); // Refresh stats
  } catch (err) {
    console.error(err);
    toast.error("Failed to delete user");
  }
};

// Admin Management Actions
const openWithdraw = () => {
  withdrawAmount.value = null;
  showWithdrawModal.value = true;
};

const confirmWithdraw = async () => {
  if (!withdrawAmount.value || withdrawAmount.value <= 0) return;

  if (withdrawAmount.value > stats.value.netProfit) {
    toast.error("Insufficient Net Profit");
    return;
  }

  try {
    const res = await api.post("/admin/withdraw", {
      amount: withdrawAmount.value,
    });
    toast.success(res.data.msg);
    showWithdrawModal.value = false;
    // Stats will update via socket, but we can also manually update if needed
    stats.value.netProfit = res.data.netProfit;
  } catch (err) {
    console.error(err);
    toast.error(err.response?.data?.msg || "Withdrawal failed");
  }
};


const viewUserHistory = (user) => {
  router.push({
    path: "/history",
    query: { userId: user._id, username: user.username },
  });
};

// Realtime Updates
// Realtime Updates
const handleUserUpdate = (updatedUser) => {
  const index = users.value.findIndex((u) => u._id === updatedUser._id);
  if (index !== -1) {
    // Check timestamps to avoid race conditions (out of order updates)
    const currentUpdate = new Date(users.value[index].updatedAt).getTime();
    const newUpdate = new Date(updatedUser.updatedAt).getTime();

    // Only update if the new data is actually newer (or if we don't have a timestamp yet)
    if (isNaN(currentUpdate) || newUpdate > currentUpdate) {
      users.value[index] = updatedUser;
    }
  }
  // Removed else if block: Updates to users not on the current page should not seamlessly appear at the top.
  // New users are handled by 'admin:newUser' event.

  fetchStats(); // Refresh stats on any user update
};

onMounted(() => {
  fetchUsers();
  fetchStats();

  socket.on("admin:userUpdate", handleUserUpdate);
  socket.on("admin:newUser", (user) => {
    if (pagination.value.page === 1) {
      users.value.unshift(user);
      if (users.value.length > pagination.value.limit) {
        users.value.pop();
      }
    }
    fetchStats();
  });
  socket.on("admin:userDeleted", (userId) => {
    users.value = users.value.filter((u) => u._id !== userId);
    fetchStats();
  });
  socket.on("admin:statsUpdate", fetchStats);

  // Refresh data on reconnection
  socket.on("connect", () => {
    fetchUsers();
    fetchStats();
  });
});

onUnmounted(() => {
  socket.off("admin:userUpdate", handleUserUpdate);
  socket.off("admin:newUser");
  socket.off("admin:userDeleted");
  socket.off("admin:statsUpdate");
  socket.off("connect");
});
</script>
