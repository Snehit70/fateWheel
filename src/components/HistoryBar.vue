<template>
  <div class="w-full max-w-4xl mx-auto mb-6">
    <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">History</span>
    </div>
    <div class="glass-panel p-3 flex items-center justify-between overflow-hidden relative">
        <!-- Gradient Fade for overflow -->
        <div class="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#151515] to-transparent z-10"></div>
        
        <div class="flex gap-2 overflow-x-auto scrollbar-hide w-full">
            <transition-group name="list" tag="div" class="flex gap-2">
                <div 
                    v-for="(res, idx) in history" 
                    :key="res.id || idx"
                    :class="[
                        'w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-bold border border-opacity-20 transition-all duration-300',
                        getColorClass(res.color)
                    ]"
                >
                    {{ res.number }}
                </div>
            </transition-group>
            
            <!-- Empty State Placeholders -->
            <template v-if="history.length < 10">
                <div 
                    v-for="i in (10 - history.length)" 
                    :key="`empty-${i}`"
                    class="w-10 h-10 rounded-lg bg-[#252525] border border-[#333] opacity-50 flex-shrink-0"
                ></div>
            </template>
        </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
    history: {
        type: Array,
        default: () => []
    }
});

const getColorClass = (color) => {
    switch(color) {
        case 'red': return 'bg-[#e50914] border-white text-white shadow-[0_0_10px_rgba(229,9,20,0.3)]';
        case 'black': return 'bg-[#252525] border-gray-500 text-gray-300';
        case 'green': return 'bg-[#00c74d] border-white text-white shadow-[0_0_10px_rgba(0,199,77,0.3)]';
        default: return 'bg-gray-800';
    }
};
</script>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
