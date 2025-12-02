<template>
  <div class="w-full h-full">
    <div class="flex flex-wrap gap-2 content-start h-full overflow-y-auto scrollbar-hide">
        <transition-group name="list">
            <div 
                v-for="(res, idx) in limitedHistory" 
                :key="res.id || idx"
                :class="[
                    'w-8 h-8 rounded-md flex-shrink-0 flex items-center justify-center text-xs font-bold border border-opacity-20 transition-all duration-300',
                    getColorClass(res.color)
                ]"
            >
                {{ res.number }}
            </div>
        </transition-group>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    history: {
        type: Array,
        default: () => []
    }
});

const limitedHistory = computed(() => {
    return props.history.slice(0, 20);
});

const getColorClass = (color) => {
    switch(color) {
        case 'red': return 'bg-primary border-white text-white shadow-[0_0_10px_rgba(229,9,20,0.3)]';
        case 'black': return 'bg-[#252525] border-gray-500 text-gray-300';
        case 'green': return 'bg-green-600 border-white text-white shadow-[0_0_10px_rgba(0,199,77,0.3)]';
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
