import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import socket from '../services/socket';

export function useBetting(bets, isSpinning) {
    const authStore = useAuthStore();
    const currentBetAmount = ref(0);

    const totalBetAmount = computed(() => {
        const userId = authStore.user?.id;
        if (!userId) return 0;
        return bets.value
            .filter(b => b.userId === userId)
            .reduce((sum, b) => sum + b.amount, 0);
    });

    const handlePlaceBet = (type, value) => {
        if (isSpinning.value) return;
        if (currentBetAmount.value <= 0) {
            return;
        }

        const balance = authStore.user?.balance || 0;
        // Check if user has enough balance for NEW bet + EXISTING bets
        if (balance < totalBetAmount.value + currentBetAmount.value) {
            alert("Insufficient balance!");
            return;
        }

        // Optimistic update
        const existing = bets.value.find(b => b.type === type && b.value === value && b.userId === authStore.user?.id);
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
                // Revert optimistic update
                const index = bets.value.findIndex(b => b.type === type && b.value === value);
                if (index !== -1) {
                    bets.value[index].amount -= currentBetAmount.value;
                    if (bets.value[index].amount <= 0) {
                        bets.value.splice(index, 1);
                    }
                }
            } else if (response.newBalance !== undefined) {
                // Update balance from server response
                if (authStore.user) {
                    authStore.user.balance = response.newBalance;
                }
            }
        });
    };

    const clearBets = () => {
        if (isSpinning.value) return;

        // Optimistic clear
        bets.value = bets.value.filter(b => b.userId !== authStore.user?.id);

        socket.emit('clearBets', (response) => {
            if (response.error) {
                console.error(response.error);
                // If error, maybe we should fetch state again? 
                // But usually socket broadcast will fix it.
            } else if (response.newBalance !== undefined) {
                if (authStore.user) {
                    authStore.user.balance = response.newBalance;
                }
            }
        });
    };

    return {
        currentBetAmount,
        totalBetAmount,
        handlePlaceBet,
        clearBets
    };
}
