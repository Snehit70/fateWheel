<template>
  <div class="w-full h-full">
    <!-- Mobile: Show 10 items -->
    <div class="flex flex-nowrap gap-1.5 items-center h-full overflow-x-auto scrollbar-hide lg:hidden">
      <TransitionGroup name="history-item">
        <div
          v-for="(res, idx) in mobileHistory"
          :key="res.id || idx"
          :class="[
            'w-7 h-10 sm:w-8 sm:h-11 rounded flex-shrink-0 flex items-center justify-center font-display text-[10px] sm:text-xs font-semibold border transition-all duration-500',
            getColorClass(res.color)
          ]"
          :style="{ animationDelay: `${idx * 50}ms` }"
        >
          {{ res.number }}
        </div>
      </TransitionGroup>
    </div>

    <!-- Desktop: Show 14 items -->
    <div class="hidden lg:flex flex-nowrap gap-2 items-center h-full overflow-x-auto scrollbar-hide">
      <TransitionGroup name="history-item">
        <div
          v-for="(res, idx) in desktopHistory"
          :key="res.id || idx"
          :class="[
            'w-9 h-12 rounded flex-shrink-0 flex items-center justify-center font-display text-xs font-semibold border transition-all duration-500 hover:scale-105',
            getColorClass(res.color)
          ]"
          :style="{ animationDelay: `${idx * 50}ms` }"
        >
          {{ res.number }}
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  history: { type: Array, default: () => [] }
});

const mobileHistory = computed(() => props.history.slice(0, 10));
const desktopHistory = computed(() => props.history.slice(0, 14));

const getColorClass = (color) => {
  switch(color) {
    case 'red':
      return 'bg-gradient-to-br from-ruby to-ruby/80 border-ruby-light/30 text-cream shadow-[0_0_12px_rgba(155,17,30,0.3)]';
    case 'black':
      return 'bg-gradient-to-br from-royal to-royal/80 border-royal/50 text-cream shadow-[0_0_12px_rgba(74,63,107,0.4)]';
    case 'green':
      return 'bg-gradient-to-br from-emerald to-emerald/80 border-emerald/50 text-cream shadow-[0_0_12px_rgba(46,139,87,0.3)]';
    default:
      return 'bg-surface border-gold/20';
  }
};
</script>

<style scoped>
/* History item transitions */
.history-item-enter-active {
  animation: slideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.history-item-leave-active {
  animation: slideOut 0.3s cubic-bezier(0.4, 0, 1, 1) forwards;
}

.history-item-move {
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideIn {
  0% {
    opacity: 0;
    transform: translateY(-20px) scale(0.8);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes slideOut {
  0% {
    opacity: 1;
    transform: translateX(0);
  }
  100% {
    opacity: 0;
    transform: translateX(20px);
  }
}
</style>
