import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useToast } from './useToast';
import socket from '../services/socket';

import { BET_LIMITS } from '../constants/game';

// Flag to prevent gameState from restoring cleared bets during the clear operation
const clearPending = ref(false);
const CLEAR_PENDING_TIMEOUT = 5000; // 5 second timeout to prevent stuck state

export function useBetting(bets, isSpinning) {
    const authStore = useAuthStore();
    const toast = useToast();
    const currentBetAmount = ref(BET_LIMITS.MIN);

    const totalBetAmount = computed(() => {
        const userId = authStore.user?.id;
        if (!userId) return 0;
        return bets.value
            .filter(b => b.userId === userId)
            .reduce((sum, b) => sum + b.amount, 0);
    });

    const handlePlaceBet = (type, value) => {
        if (isSpinning.value) return;
        if (currentBetAmount.value < BET_LIMITS.MIN) {
            toast.error(`Minimum bet is ${BET_LIMITS.MIN}`);
            return;
        }

        const balance = authStore.user?.balance || 0;
        // Check if user has enough balance for the NEW bet only
        // (balance is already deducted for existing bets on the server)
        if (balance < currentBetAmount.value) {
            toast.error("Insufficient balance!");
            return;
        }

        // Check if total bet on board would exceed max limit
        const MAX_BET_AMOUNT = BET_LIMITS.MAX;
        if (totalBetAmount.value + currentBetAmount.value > MAX_BET_AMOUNT) {
            const remainingAllowance = MAX_BET_AMOUNT - totalBetAmount.value;
            if (remainingAllowance <= 0) {
                toast.warning(`Maximum bet limit of ₹${MAX_BET_AMOUNT} reached for this round`);
            } else {
                toast.warning(`You can only bet ₹${remainingAllowance} more this round (Max: ₹${MAX_BET_AMOUNT})`);
            }
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
                toast.error(response.error);

                // Revert optimistic update
                const index = bets.value.findIndex(b => b.type === type && b.value === value && b.userId === authStore.user?.id);
                if (index !== -1) {
                    bets.value[index].amount -= currentBetAmount.value;
                    if (bets.value[index].amount <= 0) {
                        bets.value.splice(index, 1);
                    }
                }
            } else if (response.newBalance !== undefined) {
                // Update balance from server response
                authStore.updateBalance(response.newBalance);
            }
        });
    };

    const clearBets = () => {
        if (isSpinning.value) {
            return;
        }

        const userId = authStore.user?.id;
        if (!userId) {
            return;
        }

        // Set flag to prevent gameState from restoring our bets
        clearPending.value = true;

        // Safety timeout to reset clearPending if socket callback never fires
        const timeoutId = setTimeout(() => {
            if (clearPending.value) {
                console.warn('clearPending timeout - resetting flag');
                clearPending.value = false;
            }
        }, CLEAR_PENDING_TIMEOUT);

        // Optimistic clear
        bets.value = bets.value.filter(b => b.userId !== userId);

        socket.emit('clearBets', (response) => {
            // Clear the pending flag and timeout after server responds
            clearTimeout(timeoutId);
            clearPending.value = false;

            if (response.error) {
                console.error(response.error);
                toast.error("Bets locked for this round");
                socket.emit('requestState'); // Force immediate re-sync to restore chips
            } else if (response.newBalance !== undefined) {
                authStore.updateBalance(response.newBalance);
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

// Export helper to check if clear is pending (used by useGameLogic to filter bets)
export function isClearPending() {
    return clearPending.value;
}
