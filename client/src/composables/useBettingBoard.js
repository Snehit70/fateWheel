import { computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import { getNumbersByColor } from '../constants/game';
import { THEME } from '../constants/theme';

export function useBettingBoard(props, emit) {
    const authStore = useAuthStore();

    const getBetAmount = (type, value) => {
        const bet = props.bets.find((b) => b.type === type && b.value === value);
        return bet ? bet.amount : 0;
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

    // Count unique users who have bet in this color section
    const getUniqueUsersCountForColor = (color) => {
        const bets = getBetsForColor(color);
        const uniqueUserIds = new Set(bets.map(b => b.userId));
        return uniqueUserIds.size;
    };

    // Aggregate bets by user - returns array of { userId, username, totalAmount }
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
        const userId = authStore.user?.id;
        if (!userId) return 0;
        return getBetsForColor(color)
            .filter((b) => b.userId === userId)
            .reduce((sum, b) => sum + b.amount, 0);
    };

    const getSectionClass = (color) => {
        if (!props.lastResult) return "border-border";

        if (props.lastResult.color === color) {
            // Winner - return appropriate border and shadow classes based on color
            if (color === 'red') {
                return `border-red-500 shadow-[0_0_40px_${THEME.colors.red.shadow}] scale-[1.02] z-10`;
            } else if (color === 'green') {
                return `border-green-500 shadow-[0_0_40px_${THEME.colors.green.shadow}] scale-[1.02] z-10`;
            } else {
                return `border-purple-500 shadow-[0_0_40px_${THEME.colors.black.shadow}] scale-[1.02] z-10`;
            }
        } else {
            // Loser
            return "border-transparent opacity-40 grayscale hover:opacity-100 hover:grayscale-0";
        }
    };

    const getNumberClass = (num) => {
        if (!props.lastResult) {
            // Default state - color based on number
            if (num === 0) return "bg-[#00b300] hover:bg-[#009900] text-white border-[#008000]";
            if (num >= 1 && num <= 7) return "bg-[#b91c1c] hover:bg-[#991b1b] text-white border-[#7f1d1d]";
            if (num >= 8 && num <= 14) return "bg-[#2d1f3d] hover:bg-[#3d2a52] text-purple-200 border-[#4a3366]";
            return "bg-secondary/50 hover:bg-secondary border-border";
        }

        if (props.lastResult.number === num) {
            return `bg-yellow-500 text-black border-yellow-500 shadow-[0_0_20px_${THEME.colors.gold.shadow}] scale-110 z-20`;
        } else {
            // Loser
            return "bg-secondary/30 border-transparent opacity-40 hover:opacity-100 hover:bg-secondary/50 hover:border-border";
        }
    };

    const getEvenOddClass = (type) => {
        // Default state
        const defaultClass = "bg-secondary/50 hover:bg-secondary hover:text-foreground hover:border-green-500";

        if (!props.lastResult) return defaultClass;

        const winningNumber = props.lastResult.number;

        // Zero is neither even nor odd for betting purposes
        if (winningNumber === 0) {
            return "bg-secondary/30 border-transparent opacity-40 hover:opacity-100 hover:bg-secondary/50 hover:border-border";
        }

        const isEven = winningNumber % 2 === 0;

        if ((type === 'even' && isEven) || (type === 'odd' && !isEven)) {
            // Winner - yellow highlight like winning numbers
            return `bg-yellow-500 text-black border-yellow-500 shadow-[0_0_20px_${THEME.colors.gold.shadow}] scale-105`;
        } else {
            // Loser
            return "bg-secondary/30 border-transparent opacity-40 hover:opacity-100 hover:bg-secondary/50 hover:border-border";
        }
    };

    return {
        getBetAmount,
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
