<template>
  <Teleport to="body">
    <TransitionGroup
      name="toast"
      tag="div"
      class="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="[
          'px-4 py-3 rounded shadow-lg max-w-sm pointer-events-auto cursor-pointer',
          'glass border font-display text-sm tracking-wide',
          'transition-all duration-300 hover:scale-[1.02]',
          typeClasses[toast.type]
        ]"
        @click="removeToast(toast.id)"
      >
        <div class="flex items-center gap-3">
          <!-- Icon -->
          <div :class="iconClasses[toast.type]">
            <svg v-if="toast.type === 'error'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <svg v-else-if="toast.type === 'success'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <svg v-else-if="toast.type === 'warning'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <!-- Message -->
          <span class="flex-1">{{ toast.message }}</span>
        </div>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<script setup>
import { useToast } from '../composables/useToast';

const { toasts, removeToast } = useToast();

const typeClasses = {
  error: 'border-ruby/40 text-ruby-light',
  success: 'border-emerald/40 text-emerald',
  warning: 'border-gold/40 text-gold',
  info: 'border-gold/20 text-cream'
};

const iconClasses = {
  error: 'text-ruby-light',
  success: 'text-emerald',
  warning: 'text-gold',
  info: 'text-gold'
};
</script>

<style scoped>
.toast-enter-active {
  animation: toastIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.toast-leave-active {
  animation: toastOut 0.3s cubic-bezier(0.4, 0, 1, 1) forwards;
}

.toast-move {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes toastIn {
  0% {
    opacity: 0;
    transform: translateX(100%) scale(0.9);
  }
  100% {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

@keyframes toastOut {
  0% {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateX(100%) scale(0.9);
  }
}
</style>
