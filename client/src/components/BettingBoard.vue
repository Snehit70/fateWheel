<template>
  <div class="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
    <!-- Red Section -->
    <div
      class="flex flex-col gap-4 p-4 rounded-xl border transition-all duration-500 glass-panel"
      :class="getSectionClass('red')"
    >
      <!-- Header Row -->
      <div class="flex gap-2 h-14">
        <button
          @click="$emit('place-bet', 'color', 'red')"
          class="flex-1 bg-primary hover:bg-primary-hover rounded-lg font-medium text-white transition-colors relative group flex items-center justify-center border-b-4 border-primary-dark active:border-b-0 active:translate-y-1 font-outfit tracking-wider text-lg"
        >
          RED
          <span
            v-if="getBetAmount('color', 'red')"
            class="absolute -top-2 -right-2 bg-white text-primary text-xs font-medium rounded-full w-6 h-6 flex items-center justify-center shadow-lg animate-pop-in border-2 border-primary"
          >
            {{ getBetAmount("color", "red") }}
          </span>
        </button>
        <div class="flex-[2] grid grid-cols-7 gap-1">
          <button
            v-for="num in getNumbersByColor('red')"
            :key="num"
            @click="$emit('place-bet', 'number', num)"
            class="h-full rounded flex flex-col items-center justify-center border transition-all duration-300 font-outfit"
            :class="getNumberClass(num)"
          >
            <span class="text-sm font-medium">{{ num }}</span>
            <span
              v-if="getBetAmount('number', num) > 0"
              class="text-[10px] text-accent font-medium"
            >
              {{ getBetAmount("number", num) }}
            </span>
          </button>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="grid grid-cols-3 gap-2">
        <div
          class="bg-surface-light rounded p-2 flex flex-col items-center justify-center border border-white/5"
        >
          <span class="text-[10px] text-text-muted uppercase font-bold tracking-wider"
            >Users</span
          >
          <span class="text-sm font-medium text-white font-outfit">{{
            getBetsForColor("red").length
          }}</span>
        </div>
        <div
          class="bg-surface-light rounded p-2 flex flex-col items-center justify-center border border-white/5"
        >
          <span class="text-[10px] text-text-muted uppercase font-bold tracking-wider"
            >Total</span
          >
          <span class="text-sm font-medium text-white font-outfit">{{
            getTotalBetForColor("red").toFixed(1)
          }}</span>
        </div>
        <div
          class="bg-surface-light rounded p-2 flex flex-col items-center justify-center border border-white/5"
        >
          <span class="text-[10px] text-text-muted uppercase font-bold tracking-wider"
            >You</span
          >
          <span class="text-sm font-medium text-primary font-outfit">{{
            getUserBetForColor("red").toFixed(1)
          }}</span>
        </div>
      </div>

      <!-- User Cards -->
      <div class="grid grid-cols-4 gap-2">
        <div
          v-for="(bet, i) in getBetsForColor('red')"
          :key="i"
          class="bg-surface-light rounded p-2 flex flex-col items-center gap-1 border border-white/5 hover:border-primary/30 transition-colors"
        >
          <img
            src="@/assets/default-user.svg"
            class="w-8 h-8 rounded-full bg-surface p-1 border border-white/10"
          />
          <span
            class="text-[10px] text-text-muted font-bold truncate w-full text-center"
            >{{ bet.username || "User" }}</span
          >
          <span class="text-xs font-medium text-primary font-outfit">{{
            bet.amount
          }}</span>
        </div>
      </div>
    </div>

    <!-- Green Section -->
    <div
      class="flex flex-col gap-4 p-4 rounded-xl border transition-all duration-500 glass-panel"
      :class="getSectionClass('green')"
    >
      <!-- Header Row -->
      <div class="grid grid-cols-3 gap-2 h-14">
        <button
          @click="$emit('place-bet', 'type', 'even')"
          class="bg-surface-light hover:bg-surface-lighter rounded-lg text-text-muted hover:text-white font-bold transition-colors border border-white/5 hover:border-success flex items-center justify-center text-xs uppercase tracking-wider font-outfit"
        >
          EVEN
        </button>
        <button
          @click="$emit('place-bet', 'number', 0)"
          class="h-full rounded flex flex-col items-center justify-center border transition-all duration-300 font-outfit"
          :class="getNumberClass(0)"
        >
          <span class="text-sm font-medium">0</span>
          <span
            v-if="getBetAmount('number', 0) > 0"
            class="text-[10px] text-accent font-medium"
          >
            {{ getBetAmount("number", 0) }}
          </span>
        </button>
        <button
          @click="$emit('place-bet', 'type', 'odd')"
          class="bg-surface-light hover:bg-surface-lighter rounded-lg text-text-muted hover:text-white font-bold transition-colors border border-white/5 hover:border-success flex items-center justify-center text-xs uppercase tracking-wider font-outfit"
        >
          ODD
        </button>
      </div>

      <!-- Stats Row -->
      <div class="grid grid-cols-3 gap-2">
        <div
          class="bg-surface-light rounded p-2 flex flex-col items-center justify-center border border-white/5"
        >
          <span class="text-[10px] text-text-muted uppercase font-bold tracking-wider"
            >Users</span
          >
          <span class="text-sm font-medium text-white font-outfit">{{
            getBetsForColor("green").length
          }}</span>
        </div>
        <div
          class="bg-surface-light rounded p-2 flex flex-col items-center justify-center border border-white/5"
        >
          <span class="text-[10px] text-text-muted uppercase font-bold tracking-wider"
            >Total</span
          >
          <span class="text-sm font-medium text-white font-outfit">{{
            getTotalBetForColor("green").toFixed(1)
          }}</span>
        </div>
        <div
          class="bg-surface-light rounded p-2 flex flex-col items-center justify-center border border-white/5"
        >
          <span class="text-[10px] text-text-muted uppercase font-bold tracking-wider"
            >You</span
          >
          <span class="text-sm font-medium text-success font-outfit">{{
            getUserBetForColor("green").toFixed(1)
          }}</span>
        </div>
      </div>

      <!-- User Cards -->
      <div class="grid grid-cols-4 gap-2">
        <div
          v-for="(bet, i) in getBetsForColor('green')"
          :key="i"
          class="bg-surface-light rounded p-2 flex flex-col items-center gap-1 border border-white/5 hover:border-success/30 transition-colors"
        >
          <img
            src="@/assets/default-user.svg"
            class="w-8 h-8 rounded-full bg-surface p-1 border border-white/10"
          />
          <span
            class="text-[10px] text-text-muted font-bold truncate w-full text-center"
            >{{ bet.username || "User" }}</span
          >
          <span class="text-xs font-medium text-success font-outfit">{{
            bet.amount
          }}</span>
        </div>
      </div>
    </div>

    <!-- Black Section -->
    <div
      class="flex flex-col gap-4 p-4 rounded-xl border transition-all duration-500 glass-panel"
      :class="getSectionClass('black')"
    >
      <!-- Header Row -->
      <div class="flex gap-2 h-14">
        <button
          @click="$emit('place-bet', 'color', 'black')"
          class="flex-1 bg-[#111111] hover:bg-[#222222] rounded-lg font-medium text-white transition-colors relative group flex items-center justify-center border-b-4 border-black active:border-b-0 active:translate-y-1 font-outfit tracking-wider text-lg"
        >
          BLACK
          <span
            v-if="getBetAmount('color', 'black')"
            class="absolute -top-2 -right-2 bg-white text-surface text-xs font-medium rounded-full w-6 h-6 flex items-center justify-center shadow-lg animate-pop-in border-2 border-surface"
          >
            {{ getBetAmount("color", "black") }}
          </span>
        </button>
        <div class="flex-[2] grid grid-cols-7 gap-1">
          <button
            v-for="num in getNumbersByColor('black')"
            :key="num"
            @click="$emit('place-bet', 'number', num)"
            class="h-full rounded flex flex-col items-center justify-center border transition-all duration-300 font-outfit"
            :class="getNumberClass(num)"
          >
            <span class="text-sm font-medium">{{ num }}</span>
            <span
              v-if="getBetAmount('number', num) > 0"
              class="text-[10px] text-accent font-medium"
            >
              {{ getBetAmount("number", num) }}
            </span>
          </button>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="grid grid-cols-3 gap-2">
        <div
          class="bg-surface-light rounded p-2 flex flex-col items-center justify-center border border-white/5"
        >
          <span class="text-[10px] text-text-muted uppercase font-bold tracking-wider"
            >Users</span
          >
          <span class="text-sm font-medium text-white font-outfit">{{
            getBetsForColor("black").length
          }}</span>
        </div>
        <div
          class="bg-surface-light rounded p-2 flex flex-col items-center justify-center border border-white/5"
        >
          <span class="text-[10px] text-text-muted uppercase font-bold tracking-wider"
            >Total</span
          >
          <span class="text-sm font-medium text-white font-outfit">{{
            getTotalBetForColor("black").toFixed(1)
          }}</span>
        </div>
        <div
          class="bg-surface-light rounded p-2 flex flex-col items-center justify-center border border-white/5"
        >
          <span class="text-[10px] text-text-muted uppercase font-bold tracking-wider"
            >You</span
          >
          <span class="text-sm font-medium text-text-muted font-outfit">{{
            getUserBetForColor("black").toFixed(1)
          }}</span>
        </div>
      </div>

      <!-- User Cards -->
      <div class="grid grid-cols-4 gap-2">
        <div
          v-for="(bet, i) in getBetsForColor('black')"
          :key="i"
          class="bg-surface-light rounded p-2 flex flex-col items-center gap-1 border border-white/5 hover:border-white/20 transition-colors"
        >
          <img
            src="@/assets/default-user.svg"
            class="w-8 h-8 rounded-full bg-surface p-1 border border-white/10"
          />
          <span
            class="text-[10px] text-text-muted font-bold truncate w-full text-center"
            >{{ bet.username || "User" }}</span
          >
          <span class="text-xs font-medium text-white font-outfit">{{ bet.amount }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from "../stores/auth";
import { getNumbersByColor } from "../constants/game";

const props = defineProps({
  bets: {
    type: Array,
    default: () => [],
  },
  lastResult: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["place-bet"]);

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

// Helper to determine section styling based on result
const getSectionClass = (color) => {
  if (!props.lastResult) return "border-transparent";

  if (props.lastResult.color === color) {
    // Winner
    const borderColor =
      color === "red"
        ? "border-primary"
        : color === "green"
        ? "border-success"
        : "border-surface-lighter";
    const shadowColor =
      color === "red"
        ? "rgba(255,62,62,0.3)"
        : color === "green"
        ? "rgba(0,230,118,0.3)"
        : "rgba(255,255,255,0.1)";

    return `${borderColor} shadow-[0_0_40px_${shadowColor}] scale-[1.02] z-10`;
  } else {
    // Loser
    return "border-transparent opacity-40 grayscale hover:opacity-100 hover:grayscale-0";
  }
};

// Helper for number buttons
const getNumberClass = (num) => {
  if (!props.lastResult) {
    if (num === 0) return "bg-green-600 hover:bg-green-500 text-white border-green-500";
    return "bg-surface-light hover:bg-surface-lighter border-white/5";
  }

  if (props.lastResult.number === num) {
    return "bg-accent text-black border-accent shadow-[0_0_20px_rgba(255,215,0,0.6)] scale-110 z-20";
  } else {
    // Loser
    return "bg-surface border-transparent opacity-40 hover:opacity-100 hover:bg-surface-light hover:border-white/10";
  }
};
</script>
