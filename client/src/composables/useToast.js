import { ref } from 'vue';

const toasts = ref([]);
let toastId = 0;

export function useToast() {
    const showToast = (message, type = 'error', duration = 3000) => {
        const id = ++toastId;
        toasts.value.push({ id, message, type });

        // Auto-remove after duration
        setTimeout(() => {
            removeToast(id);
        }, duration);

        return id;
    };

    const removeToast = (id) => {
        const index = toasts.value.findIndex(t => t.id === id);
        if (index !== -1) {
            toasts.value.splice(index, 1);
        }
    };

    const error = (message, duration = 3000) => showToast(message, 'error', duration);
    const success = (message, duration = 3000) => showToast(message, 'success', duration);
    const warning = (message, duration = 3000) => showToast(message, 'warning', duration);
    const info = (message, duration = 3000) => showToast(message, 'info', duration);

    return {
        toasts,
        showToast,
        removeToast,
        error,
        success,
        warning,
        info
    };
}
