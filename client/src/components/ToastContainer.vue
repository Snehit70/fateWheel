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
                    'px-4 py-3 rounded-lg shadow-lg max-w-sm pointer-events-auto',
                    'backdrop-blur-sm border font-medium text-sm',
                    typeClasses[toast.type]
                ]"
                @click="removeToast(toast.id)"
            >
                <div class="flex items-center gap-2">
                    <span v-if="toast.type === 'error'" class="text-lg">⚠️</span>
                    <span v-else-if="toast.type === 'success'" class="text-lg">✅</span>
                    <span v-else-if="toast.type === 'warning'" class="text-lg">⚡</span>
                    <span v-else class="text-lg">ℹ️</span>
                    <span>{{ toast.message }}</span>
                </div>
            </div>
        </TransitionGroup>
    </Teleport>
</template>

<script setup>
import { useToast } from '../composables/useToast';

const { toasts, removeToast } = useToast();

const typeClasses = {
    error: 'bg-red-500/90 text-white border-red-400',
    success: 'bg-green-500/90 text-white border-green-400',
    warning: 'bg-yellow-500/90 text-black border-yellow-400',
    info: 'bg-blue-500/90 text-white border-blue-400'
};
</script>

<style scoped>
.toast-enter-active {
    transition: all 0.3s ease-out;
}
.toast-leave-active {
    transition: all 0.2s ease-in;
}
.toast-enter-from {
    opacity: 0;
    transform: translateX(100%);
}
.toast-leave-to {
    opacity: 0;
    transform: translateX(100%);
}
.toast-move {
    transition: transform 0.3s ease;
}
</style>
