import { computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import { getNumbersByColor } from '../constants/game';

export function useBettingBoard(props, emit) {
    const authStore = useAuthStore();

    const getBetAmount = (type, value) => {
        const bet = props.bets.find((b) => b.type === type && b.value === value);
        return bet ? bet.amount : 0;
    };

    const getUserBetOnTarget = (type, value) => {
        const userId = authStore.userId;
        if (!userId) return 0;
        return props.bets
            .filter((b) => b.type === type && b.value === value && b.userId === userId)
            .reduce((sum, b) => sum + b.amount, 0);
    };

    const getBetsForColor = (color) => {
        return props.bets.filter((bet) => {
            if (color === "red") {
                return (
                    (bet.type === "color" && bet.value === "red") ||
                    (bet.type === "number" && getNumbersByColor("red").includes(bet.value))
                );
            } else if (color === "green") {
                return (
                    (bet.type === "number" && bet.value === 0) ||
                    (bet.type === "type" && ["even", "odd"].includes(bet.value))
                );
            } else if (color === "black") {
                return (
                    (bet.type === "color" && bet.value === "black") ||
                    (bet.type === "number" && getNumbersByColor("black").includes(bet.value))
                );
            }
            return false;
        });
    };

    const getTotalBetForColor = (color) => {
        return getBetsForColor(color).reduce((sum, b) => sum + b.amount, 0);
    };

    const getUniqueUsersCountForColor = (color) => {
        const bets = getBetsForColor(color);
        const uniqueUserIds = new Set(bets.map(b => b.userId));
        return uniqueUserIds.size;
    };

    const getAggregatedBetsForColor = (color) => {
        const bets = getBetsForColor(color);
        const userMap = new Map();

        for (const bet of bets) {
            if (userMap.has(bet.userId)) {
                userMap.get(bet.userId).amount += bet.amount;
            } else {
                userMap.set(bet.userId, {
                    userId: bet.userId,
                    username: bet.username,
                    amount: bet.amount
                });
            }
        }

        return Array.from(userMap.values());
    };

    const getUserBetForColor = (color) => {
        const userId = authStore.userId;
        if (!userId) return 0;
        return getBetsForColor(color)
            .filter((b) => b.userId === userId)
            .reduce((sum, b) => sum + b.amount, 0);
    };

    const getSectionClass = (color) => {
        if (!props.lastResult) return "border-border";

        if (props.lastResult.color === color) {
            // Winner - Art Deco gold highlight
            if (color === 'red') {
                return 'border-ruby-light shadow-[0_0_40px_rgba(196,30,42,0.4)] scale-[1.02] z-10';
            } else if (color === 'green') {
                return 'border-emerald shadow-[0_0_40px_rgba(46,139,87,0.4)] scale-[1.02] z-10';
            } else {
                return 'border-royal/60 shadow-[0_0_40px_rgba(74,63,107,0.38)] scale-[1.02] z-10';
            }
        } else {
            // Loser
            return "border-transparent opacity-40 grayscale hover:opacity-100 hover:grayscale-0";
        }
    };

    const getNumberClass = (num) => {
        if (!props.lastResult) {
            // Default state - Art Deco jewel tones
            if (num === 0) {
                return "bg-gradient-to-br from-emerald to-emerald/80 hover:from-emerald hover:to-emerald/90 text-cream border-emerald/50";
            }
            if (num >= 1 && num <= 7) {
                return "bg-gradient-to-br from-ruby to-ruby/80 hover:from-ruby-light hover:to-ruby text-cream border-ruby/50";
            }
            if (num >= 8 && num <= 14) {
                return "bg-gradient-to-br from-royal to-royal/80 hover:from-royal/90 hover:to-[#120b1d] text-cream border-royal/50";
            }
            return "bg-surface/50 hover:bg-surface border-gold/10";
        }

        if (props.lastResult.number === num) {
            // Winner - Gold highlight
            return 'bg-gradient-to-br from-gold to-gold-dark text-background border-gold shadow-[0_0_25px_rgba(212,175,55,0.5)] scale-110 z-20';
        } else {
            // Loser
            return "bg-surface/30 border-transparent opacity-40 hover:opacity-100 hover:bg-surface/50 hover:border-gold/10";
        }
    };

    const getEvenOddClass = (type) => {
        // Default state
        const defaultClass = "bg-surface/50 border-gold/10 hover:bg-surface hover:text-cream hover:border-emerald/50";

        if (!props.lastResult) return defaultClass;

        const winningNumber = props.lastResult.number;

        // Zero is neither even nor odd
        if (winningNumber === 0) {
            return "bg-surface/30 border-transparent opacity-40 hover:opacity-100 hover:bg-surface/50 hover:border-gold/10";
        }

        const isEven = winningNumber % 2 === 0;

        if ((type === 'even' && isEven) || (type === 'odd' && !isEven)) {
            // Winner - Gold highlight
            return 'bg-gradient-to-br from-gold to-gold-dark text-background border-gold shadow-[0_0_20px_rgba(212,175,55,0.4)] scale-105';
        } else {
            // Loser
            return "bg-surface/30 border-transparent opacity-40 hover:opacity-100 hover:bg-surface/50 hover:border-gold/10";
        }
    };

    return {
        getBetAmount,
        getUserBetOnTarget,
        getBetsForColor,
        getTotalBetForColor,
        getUniqueUsersCountForColor,
        getAggregatedBetsForColor,
        getUserBetForColor,
        getSectionClass,
        getNumberClass,
        getEvenOddClass
    };
}
