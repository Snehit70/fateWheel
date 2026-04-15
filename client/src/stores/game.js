import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import socket from '../services/socket';
import { useAuthStore } from './auth';
import { useToast } from '../composables/useToast';
import { BET_LIMITS } from '../constants/game';

const CLEAR_PENDING_TIMEOUT = 5000;
const BET_CALLBACK_TIMEOUT = 10000;
const SAFETY_BUFFER_MS = 1000;
const COUNTDOWN_DISPLAY_STEP_MS = 100;

export const useGameStore = defineStore('game', () => {
    const authStore = useAuthStore();
    const toast = useToast();

    // --- State ---
    const bets = ref([]);
    const status = ref('');
    const timeLeft = ref(0);
    const lastResult = ref(null);
    const spinHistory = ref([]);
    const isSpinning = ref(false);
    const isLocking = ref(false);
    const isInitialLoading = ref(true);

    // Connection status
    const isConnected = ref(socket.socket?.connected ?? false);
    const isReconnecting = ref(false);

    // Animation state (set by useGameLogic)
    const isAnimating = ref(false);

    // Betting
    const currentBetAmount = ref(BET_LIMITS.MIN);
    const clearPending = ref(false);

    // Internal timing
    let endTime = 0;
    let countdownTimer = null;
    let lastDisplayedCountdown = Number.POSITIVE_INFINITY;

    // --- Computed ---
    const totalBetAmount = computed(() => {
        const userId = authStore.userId;
        if (!userId) return 0;
        return bets.value
            .filter(b => b.userId === userId)
            .reduce((sum, b) => sum + b.amount, 0);
    });

    const stopCountdown = () => {
        if (countdownTimer) {
            clearTimeout(countdownTimer);
            countdownTimer = null;
        }
        lastDisplayedCountdown = Number.POSITIVE_INFINITY;
    };

    const scheduleNextCountdownTick = () => {
        if (countdownTimer) {
            return;
        }

        const now = socket.getServerTime();
        const adjustedMsLeft = Math.max(0, endTime - now - SAFETY_BUFFER_MS);
        const remainder = adjustedMsLeft % COUNTDOWN_DISPLAY_STEP_MS;
        const delay = adjustedMsLeft > 0
            ? (remainder === 0 ? COUNTDOWN_DISPLAY_STEP_MS : remainder)
            : COUNTDOWN_DISPLAY_STEP_MS;

        countdownTimer = setTimeout(() => {
            countdownTimer = null;
            updateCountdown();
            scheduleNextCountdownTick();
        }, delay);
    };

    const updateCountdown = () => {
        const now = socket.getServerTime();
        const serverTimeLeftSeconds = (endTime - now) / 1000;
        const adjustedSeconds = Math.max(0, serverTimeLeftSeconds - (SAFETY_BUFFER_MS / 1000));
        const quantizedSeconds = Math.ceil(adjustedSeconds * 10) / 10;

        if (lastDisplayedCountdown !== Number.POSITIVE_INFINITY && quantizedSeconds > lastDisplayedCountdown) {
            timeLeft.value = lastDisplayedCountdown;
        } else {
            timeLeft.value = quantizedSeconds;
            lastDisplayedCountdown = quantizedSeconds;
        }

        if (adjustedSeconds <= 0 && serverTimeLeftSeconds > 0) {
            if (!isLocking.value) {
                status.value = 'LOCKING BETS...';
                isLocking.value = true;
            }
        } else if (adjustedSeconds > 0) {
            isLocking.value = false;
            if (status.value !== 'ROLLING IN') status.value = 'ROLLING IN';
        }
    };

    const ensureCountdownRunning = () => {
        if (countdownTimer) {
            return;
        }

        updateCountdown();
        scheduleNextCountdownTick();
    };

    // --- Socket Event Handlers ---
    const handleGameUpdate = (data) => {
        if (typeof data.endTime === 'number') {
            const nextEndTime = data.endTime;
            const isNewRoundBoundary = endTime !== 0 && (nextEndTime - endTime) > 1000;
            endTime = nextEndTime;
            if (isNewRoundBoundary) {
                lastDisplayedCountdown = Number.POSITIVE_INFINITY;
                if (countdownTimer) {
                    clearTimeout(countdownTimer);
                    countdownTimer = null;
                }
            }
        }

        if (data.state === 'WAITING') {
            if (status.value !== 'ROLLING IN') {
                status.value = 'ROLLING IN';
                isSpinning.value = false;
                isLocking.value = false;
                lastResult.value = null;
            }

            ensureCountdownRunning();
        } else if (data.state === 'SPINNING') {
            status.value = 'ROLLING...';
            isSpinning.value = true;
            isLocking.value = false;
            stopCountdown();
        } else if (data.state === 'RESULT') {
            // Don't override animation state if wheel is still spinning
            if (isAnimating.value) return;

            status.value = 'RESULT';
            isSpinning.value = false;
            isLocking.value = false;
            if (data.result) {
                lastResult.value = data.result;
            }
            stopCountdown();
        }
    };

    const handleGameState = (data) => {
        const userId = authStore.userId;
        if (clearPending.value && userId) {
            bets.value = data.bets.filter(b => b.userId !== userId);
        } else {
            bets.value = data.bets;
        }
        spinHistory.value = data.history;
        isInitialLoading.value = false;
        handleGameUpdate(data);
    };

    const handleBetPlaced = (bet) => {
        const existingIdx = bets.value.findIndex(
            b => b.userId === bet.userId && b.type === bet.type && b.value === bet.value
        );

        if (existingIdx !== -1) {
            if (authStore.userId === bet.userId) {
                bets.value[existingIdx].amount = Math.max(bets.value[existingIdx].amount, bet.amount);
            } else {
                bets.value[existingIdx].amount = bet.amount;
            }
        } else {
            bets.value.push(bet);
        }
    };

    const handleBetsCleared = (userId) => {
        bets.value = bets.value.filter(b => b.userId !== userId);
    };

    // --- Actions ---
    function setupSocketListeners() {
        socket.off('gameState', handleGameState);
        socket.off('gameUpdate', handleGameUpdate);
        socket.off('betPlaced', handleBetPlaced);
        socket.off('betsCleared', handleBetsCleared);
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);

        socket.on('gameState', handleGameState);
        socket.on('gameUpdate', handleGameUpdate);
        socket.on('betPlaced', handleBetPlaced);
        socket.on('betsCleared', handleBetsCleared);
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        // Request initial state
        socket.emit('requestState');
    }

    function cleanupSocketListeners() {
        socket.off('gameState', handleGameState);
        socket.off('gameUpdate', handleGameUpdate);
        socket.off('betPlaced', handleBetPlaced);
        socket.off('betsCleared', handleBetsCleared);
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);

        stopCountdown();
    }

    function onConnect() {
        isConnected.value = true;
        isReconnecting.value = false;
        // Resync game state after reconnect
        requestState();
    }

    function onDisconnect() {
        isConnected.value = false;
    }

    function requestState() {
        socket.emit('requestState');
    }

    function handlePlaceBet(type, value) {
        if (isSpinning.value || isLocking.value || status.value === 'RESULT') return;
        if (currentBetAmount.value < BET_LIMITS.MIN) {
            toast.error(`Minimum bet is ${BET_LIMITS.MIN}`);
            return;
        }

        const balance = authStore.user?.balance || 0;
        if (balance < currentBetAmount.value) {
            toast.error('Insufficient balance!');
            return;
        }

        if (totalBetAmount.value + currentBetAmount.value > BET_LIMITS.MAX) {
            const remaining = BET_LIMITS.MAX - totalBetAmount.value;
            if (remaining <= 0) {
                toast.warning(`Maximum bet limit of ₹${BET_LIMITS.MAX} reached for this round`);
            } else {
                toast.warning(`You can only bet ₹${remaining} more this round (Max: ₹${BET_LIMITS.MAX})`);
            }
            return;
        }

        // Optimistic update
        const existing = bets.value.find(
            b => b.type === type && b.value === value && b.userId === authStore.userId
        );
        if (existing) {
            existing.amount += currentBetAmount.value;
        } else {
            bets.value.push({
                type,
                value,
                amount: currentBetAmount.value,
                username: authStore.user?.username,
                userId: authStore.userId
            });
        }

        const betAmount = currentBetAmount.value;
        let callbackFired = false;

        const timeoutId = setTimeout(() => {
            if (!callbackFired) {
                callbackFired = true;
                toast.error('Bet timed out - refreshing state');
                requestState();
            }
        }, BET_CALLBACK_TIMEOUT);

        socket.emit('placeBet', { type, value, amount: betAmount }, (response) => {
            clearTimeout(timeoutId);
            if (callbackFired) return;
            callbackFired = true;

            if (response.error) {
                toast.error(response.error);
                revertOptimisticBet(type, value, betAmount);
            } else if (response.newBalance !== undefined) {
                authStore.updateBalance(response.newBalance);
            }
        });
    }

    function revertOptimisticBet(type, value, amount) {
        const index = bets.value.findIndex(
            b => b.type === type && b.value === value && b.userId === authStore.userId
        );
        if (index !== -1) {
            bets.value[index].amount -= amount;
            if (bets.value[index].amount <= 0) {
                bets.value.splice(index, 1);
            }
        }
    }

    function handleClearBets() {
        if (isSpinning.value || isLocking.value) return;
        const userId = authStore.userId;
        if (!userId) return;

        clearPending.value = true;

        const timeoutId = setTimeout(() => {
            if (clearPending.value) {
                clearPending.value = false;
                toast.error('Clear timed out - refreshing state');
                requestState();
            }
        }, CLEAR_PENDING_TIMEOUT);

        bets.value = bets.value.filter(b => b.userId !== userId);

        socket.emit('clearBets', (response) => {
            clearTimeout(timeoutId);
            clearPending.value = false;

            if (response.error) {
                toast.error('Bets locked for this round');
                socket.emit('requestState');
            } else if (response.newBalance !== undefined) {
                authStore.updateBalance(response.newBalance);
            }
        });
    }

    function reset() {
        bets.value = [];
        status.value = '';
        timeLeft.value = 0;
        lastResult.value = null;
        spinHistory.value = [];
        isSpinning.value = false;
        isLocking.value = false;
        isInitialLoading.value = true;
        currentBetAmount.value = BET_LIMITS.MIN;
        clearPending.value = false;
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
    }

    return {
        // State
        bets,
        status,
        timeLeft,
        lastResult,
        spinHistory,
        isSpinning,
        isLocking,
        isAnimating,
        isInitialLoading,
        isConnected,
        isReconnecting,
        currentBetAmount,
        clearPending,
        // Computed
        totalBetAmount,
        // Actions
        setupSocketListeners,
        cleanupSocketListeners,
        requestState,
        handlePlaceBet,
        handleClearBets,
        handleGameUpdate,
        handleSpinResult: () => {}, // Placeholder — animation handles this
        reset,
    };
});
