<template>
  <div class="min-h-screen bg-[#0f0f13] text-white p-6">
    <div class="max-w-7xl mx-auto">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">Admin Panel</h1>
        <button @click="$router.push('/')" class="px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] rounded-lg transition-colors">
          Back to Game
        </button>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-[#1a1a1a] p-6 rounded-xl border border-[#2a2a2a]">
          <h3 class="text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">Total Users</h3>
          <div class="text-3xl font-mono font-bold">{{ users.length }}</div>
        </div>
        <div class="bg-[#1a1a1a] p-6 rounded-xl border border-[#2a2a2a]">
          <h3 class="text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">Total Balance</h3>
          <div class="text-3xl font-mono font-bold text-green-500">₹{{ totalSystemBalance.toFixed(2) }}</div>
        </div>

      </div>

      <!-- Users Table -->
      <div class="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
        <div class="p-4 border-b border-[#2a2a2a] flex justify-between items-center">
          <h2 class="text-xl font-bold">User Management</h2>
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Search users..." 
            class="bg-[#0f0f13] border border-[#2a2a2a] rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-red-500 transition-colors"
          >
        </div>
        
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="bg-[#0f0f13] text-gray-400 text-xs uppercase tracking-wider">
                <th class="p-4">Username</th>
                <th class="p-4">Role</th>
                <th class="p-4">Balance</th>
                <th class="p-4">Joined</th>
                <th class="p-4">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#2a2a2a]">
              <tr v-for="user in filteredUsers" :key="user._id" class="hover:bg-[#252525] transition-colors">
                <td class="p-4 font-medium">{{ user.username }}</td>
                <td class="p-4">
                  <span :class="['px-2 py-1 rounded text-xs font-bold uppercase', user.role === 'admin' ? 'bg-red-900/30 text-red-500' : 'bg-gray-800 text-gray-400']">
                    {{ user.role }}
                  </span>
                </td>
                <td class="p-4 font-mono text-green-500">₹{{ user.balance.toFixed(2) }}</td>
                <td class="p-4 text-gray-400 text-sm">{{ new Date(user.createdAt).toLocaleDateString() }}</td>
                <td class="p-4 flex gap-2">
                  <button @click="openEditBalance(user)" class="text-blue-400 hover:text-blue-300 text-sm font-bold">
                    Edit Balance
                  </button>
                  <button @click="confirmDelete(user)" class="text-red-400 hover:text-red-300 text-sm font-bold">
                    Delete
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Edit Balance Modal -->
    <div v-if="editingUser" class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="bg-[#1a1a1a] p-6 rounded-xl border border-[#2a2a2a] w-full max-w-md">
        <h3 class="text-xl font-bold mb-4">Edit Balance: {{ editingUser.username }}</h3>
        
        <div class="mb-6">
          <label class="block text-xs uppercase text-gray-500 font-bold mb-2">New Balance</label>
          <input 
            v-model.number="newBalance" 
            type="number" 
            class="w-full bg-[#0f0f13] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-red-500"
          >
        </div>

        <div class="flex justify-end gap-3">
          <button @click="editingUser = null" class="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
          <button @click="saveBalance" class="px-6 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-bold">Save</button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="deletingUser" class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="bg-[#1a1a1a] p-6 rounded-xl border border-[#2a2a2a] w-full max-w-md">
        <h3 class="text-xl font-bold mb-4 text-red-500">Delete User</h3>
        <p class="text-gray-300 mb-6">Are you sure you want to delete user <span class="font-bold text-white">{{ deletingUser.username }}</span>? This action cannot be undone.</p>
        
        <div class="flex justify-end gap-3">
          <button @click="deletingUser = null" class="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
          <button @click="deleteUser" class="px-6 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-bold">Delete</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../services/api';

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
  return users.value.reduce((sum, u) => sum + u.balance, 0);
});

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
