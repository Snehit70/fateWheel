import { ref } from 'vue';

const MAX_TOASTS = 5;
const toasts = ref([]);
let toastId = 0;

export function useToast() {
    const showToast = (message, type = 'error', duration = 3000) => {
        const id = ++toastId;

        // Enforce maximum toast limit - remove oldest if at limit
        while (toasts.value.length >= MAX_TOASTS) {
            toasts.value.shift();
        }

        toasts.value.push({ id, message, type });

        // Auto-remove after duration
        setTimeout(() => {
            removeToast(id);
        }, duration);

        return id;
    };

    const removeToast = (id) => {
        toasts.value = toasts.value.filter(t => t.id !== id);
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
