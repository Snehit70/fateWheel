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
            // Winner
            let borderColor = THEME.colors.zinc.border;
            let shadowColor = THEME.colors.black.shadow;

            if (color === 'red') {
                borderColor = `border-[${THEME.colors.red.text}]`; // Using tailwind arbitrary value or class if available
                // Since we can't easily inject dynamic tailwind classes without safelisting, we might return style object or specific classes
                // Let's stick to the existing class pattern but use our constants logic if possible, 
                // or just map to the tailwind classes that match our theme.
                // Actually, to use the theme constants effectively in template classes, we might need to bind style or use standard classes.
                // For now, let's keep returning tailwind classes but ensure they match our theme intent.
                return `border-red-500 shadow-[0_0_40px_${THEME.colors.red.shadow}] scale-[1.02] z-10`;
            } else if (color === 'green') {
                return `border-green-500 shadow-[0_0_40px_${THEME.colors.green.shadow}] scale-[1.02] z-10`;
            } else {
                return `border-zinc-500 shadow-[0_0_40px_${THEME.colors.black.shadow}] scale-[1.02] z-10`;
            }
        } else {
            // Loser
            return "border-transparent opacity-40 grayscale hover:opacity-100 hover:grayscale-0";
        }
    };

    const getNumberClass = (num) => {
        if (!props.lastResult) {
            if (num === 0) return "bg-[#00b300] hover:bg-[#009900] text-white border-[#008000]";
            return "bg-secondary/50 hover:bg-secondary border-border";
        }

        if (props.lastResult.number === num) {
            return `bg-yellow-500 text-black border-yellow-500 shadow-[0_0_20px_${THEME.colors.gold.shadow}] scale-110 z-20`;
        } else {
            // Loser
            return "bg-secondary/30 border-transparent opacity-40 hover:opacity-100 hover:bg-secondary/50 hover:border-border";
        }
    };

    return {
        getBetAmount,
        getBetsForColor,
        getTotalBetForColor,
        getUserBetForColor,
        getSectionClass,
        getNumberClass
    };
}
