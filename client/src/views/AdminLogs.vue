<template>
  <div class="min-h-screen bg-[#0f0f13] text-white p-6">
    <div class="max-w-7xl mx-auto">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">System Logs</h1>
        <router-link to="/admin" class="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all border border-gray-600 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Panel
        </router-link>
      </div>

      <div class="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="bg-[#0f0f13] text-gray-400 text-xs uppercase tracking-wider">
                <th class="p-4">Action</th>
                <th class="p-4">Admin</th>
                <th class="p-4">Target User</th>
                <th class="p-4">Details</th>
                <th class="p-4">Time</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#2a2a2a]">
              <tr v-if="logsLoading">
                <td colspan="5" class="p-8 text-center text-gray-500">Loading logs...</td>
              </tr>
              <tr v-else-if="logs.length === 0">
                <td colspan="5" class="p-8 text-center text-gray-500">No logs found</td>
              </tr>
              <tr v-else v-for="log in logs" :key="log._id" class="hover:bg-[#252525] transition-colors">
                <td class="p-4">
                  <span :class="getActionClass(log.action)">{{ log.action.replace(/_/g, ' ') }}</span>
                </td>
                <td class="p-4 text-gray-300">{{ log.adminId?.username || 'System' }}</td>
                <td class="p-4 text-gray-300">{{ log.targetUsername || '-' }}</td>
                <td class="p-4 text-gray-400 text-sm">{{ log.details }}</td>
                <td class="p-4 text-gray-500 text-xs">{{ new Date(log.createdAt).toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../services/api';

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

const getActionClass = (action) => {
    switch(action) {
        case 'approve_user': return 'text-green-500 font-bold uppercase text-xs';
        case 'reject_user': return 'text-red-500 font-bold uppercase text-xs';
        case 'delete_user': return 'text-red-600 font-bold uppercase text-xs bg-red-900/20 px-2 py-1 rounded';
        case 'update_balance': return 'text-blue-400 font-bold uppercase text-xs';
        default: return 'text-gray-400 uppercase text-xs';
    }
};

onMounted(() => {
    fetchLogs();
});
</script>
