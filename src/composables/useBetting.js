import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import socket from '../services/socket';

export function useBetting(bets, isSpinning) {
    const authStore = useAuthStore();
    const currentBetAmount = ref(0);

    const totalBetAmount = computed(() => bets.value.reduce((sum, b) => sum + b.amount, 0));

    const handlePlaceBet = (type, value) => {
        if (isSpinning.value) return;
        if (currentBetAmount.value <= 0) {
            return;
        }

        const balance = authStore.user?.balance || 0;
        if (balance < totalBetAmount.value + currentBetAmount.value) {
            alert("Insufficient balance!");
            return;
        }

        // Optimistic update
        const existing = bets.value.find(b => b.type === type && b.value === value);
        if (existing) {
            existing.amount += currentBetAmount.value;
        } else {
            bets.value.push({
                type,
                value,
                amount: currentBetAmount.value,
                username: authStore.user?.username,
                userId: authStore.user?.id
            });
        }

        // Send bet to server
        socket.emit('placeBet', { type, value, amount: currentBetAmount.value }, (response) => {
            if (response.error) {
                alert(response.error);
                // Revert logic could go here, but we rely on server state sync for now
            }
        });
    };

    const clearBets = () => {
        if (isSpinning.value) return;
        // This only clears local bets array, but server is source of truth.
        // Ideally we should emit a 'clearBets' event to server if supported, 
        // or just wait for server to reset. 
        // For now, let's assume this is a client-side clear request that might need server handling
        // But based on original code, it just cleared bets.value. 
        // If bets are synced from server, clearing locally might be overwritten.
        // Let's assume for now we just want to clear the input or something? 
        // original code: bets.value = [];
        bets.value = [];
    };

    return {
        currentBetAmount,
        totalBetAmount,
        handlePlaceBet,
        clearBets
    };
}
