import { computed } from 'vue';
import { useGameStore } from '../stores/game';

export function useBetting() {
    const gameStore = useGameStore();

    return {
        currentBetAmount: computed({
            get: () => gameStore.currentBetAmount,
            set: (v) => { gameStore.currentBetAmount = v; }
        }),
        totalBetAmount: computed(() => gameStore.totalBetAmount),
        handlePlaceBet: gameStore.handlePlaceBet,
        clearBets: gameStore.handleClearBets,
    };
}
