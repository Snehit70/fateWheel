<template>
  <div class="w-full h-full">
    <!-- Mobile: Show 10 items -->
    <div class="flex flex-nowrap gap-2 items-center h-full overflow-x-auto scrollbar-hide lg:hidden">
        <transition-group name="list">
            <div 
                v-for="(res, idx) in mobileHistory" 
                :key="res.id || idx"
                :class="[
                    'w-6 h-10 sm:w-8 sm:h-12 rounded-md flex-shrink-0 flex items-center justify-center text-[10px] sm:text-xs font-medium border border-opacity-20 transition-all duration-300',
                    getColorClass(res.color)
                ]"
            >
                {{ res.number }}
            </div>
        </transition-group>
    </div>
    <!-- Desktop: Show 15 items -->
    <div class="hidden lg:flex flex-nowrap gap-2 items-center h-full overflow-x-auto scrollbar-hide">
        <transition-group name="list">
            <div 
                v-for="(res, idx) in desktopHistory" 
                :key="res.id || idx"
                :class="[
                    'w-8 h-12 rounded-md flex-shrink-0 flex items-center justify-center text-xs font-medium border border-opacity-20 transition-all duration-300',
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

const mobileHistory = computed(() => {
    return props.history.slice(0, 10);
});

const desktopHistory = computed(() => {
    return props.history.slice(0, 15);
});

const getColorClass = (color) => {
    switch(color) {
        case 'red': return 'bg-primary border-primary-foreground/20 text-primary-foreground shadow-[0_0_10px_rgba(229,9,20,0.3)]';
        case 'black': return 'bg-[#2d1f3d] border-purple-400/30 text-purple-200 shadow-[0_0_10px_rgba(138,43,226,0.35)]';
        case 'green': return 'bg-green-600 border-white text-white shadow-[0_0_10px_rgba(0,199,77,0.3)]';
        default: return 'bg-secondary';
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
  transform: translateY(-20px);
}
</style>
