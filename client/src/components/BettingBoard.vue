<template>
  <div class="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
    <!-- Red Section -->
    <Card
      class="flex flex-col gap-4 p-4 transition-all duration-500"
      :class="getSectionClass('red')"
    >
      <!-- Header Row -->
      <div class="flex gap-2 h-14">
        <Button
          @click="$emit('place-bet', 'color', COLORS.RED)"
          class="flex-1 bg-[#ff4d4d] hover:bg-[#ff3333] text-white relative group h-full text-lg tracking-wider font-outfit border-b-4 border-[#cc0000] active:border-b-0 active:translate-y-1"
        >
          RED
          <span
            v-if="getBetAmount('color', 'red')"
            class="absolute -top-2 -right-2 bg-white text-red-600 text-xs font-medium rounded-full w-6 h-6 flex items-center justify-center shadow-lg animate-pop-in border-2 border-red-600"
          >
            {{ getBetAmount("color", "red") }}
          </span>
        </Button>
        <div class="flex-[2] grid grid-cols-7 gap-1">
          <Button
            v-for="num in getNumbersByColor(COLORS.RED)"
            :key="num"
            @click="$emit('place-bet', 'number', num)"
            variant="outline"
            class="h-full p-0 flex flex-col items-center justify-center transition-all duration-300 font-outfit"
            :class="getNumberClass(num)"
          >
            <span class="text-sm font-medium">{{ num }}</span>
            <span
              v-if="getBetAmount('number', num) > 0"
              class="text-[10px] text-yellow-500 font-medium"
            >
              {{ getBetAmount("number", num) }}
            </span>
          </Button>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="grid grid-cols-3 gap-2">
        <div
          class="bg-secondary/50 rounded p-2 flex flex-col items-center justify-center border border-border"
        >
          <span class="text-[10px] text-muted-foreground uppercase font-bold tracking-wider"
            >Users</span
          >
          <span class="text-sm font-medium text-foreground font-outfit">{{
            getBetsForColor("red").length
          }}</span>
        </div>
        <div
          class="bg-secondary/50 rounded p-2 flex flex-col items-center justify-center border border-border"
        >
          <span class="text-[10px] text-muted-foreground uppercase font-bold tracking-wider"
            >Total</span
          >
          <span class="text-sm font-medium text-foreground font-outfit">{{
            getTotalBetForColor("red")
          }}</span>
        </div>
        <div
          class="bg-secondary/50 rounded p-2 flex flex-col items-center justify-center border border-border"
        >
          <span class="text-[10px] text-muted-foreground uppercase font-bold tracking-wider"
            >You</span
          >
          <span class="text-sm font-medium text-red-500 font-outfit">{{
            getUserBetForColor("red")
          }}</span>
        </div>
      </div>

      <!-- User Cards -->
      <div class="grid grid-cols-4 gap-2">
        <div
          v-for="(bet, i) in getBetsForColor('red')"
          :key="i"
          class="bg-secondary/30 rounded p-2 flex flex-col items-center gap-1 border border-border hover:border-red-500/30 transition-colors"
        >
          <img
            src="@/assets/default-user.svg"
            class="w-8 h-8 rounded-full bg-white p-1 border border-border"
          />
          <span
            class="text-[10px] text-muted-foreground font-bold truncate w-full text-center"
            >{{ bet.username || "User" }}</span
          >
          <span class="text-xs font-medium text-red-500 font-outfit">{{
            bet.amount
          }}</span>
        </div>
      </div>
    </Card>

    <!-- Green Section -->
    <Card
      class="flex flex-col gap-4 p-4 transition-all duration-500"
      :class="getSectionClass('green')"
    >
      <!-- Header Row -->
      <div class="grid grid-cols-3 gap-2 h-14">
        <Button
          @click="$emit('place-bet', 'type', 'even')"
          variant="outline"
          class="h-full bg-secondary/50 hover:bg-secondary hover:text-foreground hover:border-green-500 text-xs uppercase tracking-wider font-outfit font-bold"
        >
          EVEN
        </Button>
        <Button
          @click="$emit('place-bet', 'number', 0)"
          class="h-full p-0 flex flex-col items-center justify-center transition-all duration-300 font-outfit"
          :class="getNumberClass(0)"
        >
          <span class="text-sm font-medium">0</span>
          <span
            v-if="getBetAmount('number', 0) > 0"
            class="text-[10px] text-yellow-500 font-medium"
          >
            {{ getBetAmount("number", 0) }}
          </span>
        </Button>
        <Button
          @click="$emit('place-bet', 'type', 'odd')"
          variant="outline"
          class="h-full bg-secondary/50 hover:bg-secondary hover:text-foreground hover:border-green-500 text-xs uppercase tracking-wider font-outfit font-bold"
        >
          ODD
        </Button>
      </div>

      <!-- Stats Row -->
      <div class="grid grid-cols-3 gap-2">
        <div
          class="bg-secondary/50 rounded p-2 flex flex-col items-center justify-center border border-border"
        >
          <span class="text-[10px] text-muted-foreground uppercase font-bold tracking-wider"
            >Users</span
          >
          <span class="text-sm font-medium text-foreground font-outfit">{{
            getBetsForColor("green").length
          }}</span>
        </div>
        <div
          class="bg-secondary/50 rounded p-2 flex flex-col items-center justify-center border border-border"
        >
          <span class="text-[10px] text-muted-foreground uppercase font-bold tracking-wider"
            >Total</span
          >
          <span class="text-sm font-medium text-foreground font-outfit">{{
            getTotalBetForColor("green")
          }}</span>
        </div>
        <div
          class="bg-secondary/50 rounded p-2 flex flex-col items-center justify-center border border-border"
        >
          <span class="text-[10px] text-muted-foreground uppercase font-bold tracking-wider"
            >You</span
          >
          <span class="text-sm font-medium text-green-500 font-outfit">{{
            getUserBetForColor("green")
          }}</span>
        </div>
      </div>

      <!-- User Cards -->
      <div class="grid grid-cols-4 gap-2">
        <div
          v-for="(bet, i) in getBetsForColor('green')"
          :key="i"
          class="bg-secondary/30 rounded p-2 flex flex-col items-center gap-1 border border-border hover:border-green-500/30 transition-colors"
        >
          <img
            src="@/assets/default-user.svg"
            class="w-8 h-8 rounded-full bg-white p-1 border border-border"
          />
          <span
            class="text-[10px] text-muted-foreground font-bold truncate w-full text-center"
            >{{ bet.username || "User" }}</span
          >
          <span class="text-xs font-medium text-green-500 font-outfit">{{
            bet.amount
          }}</span>
        </div>
      </div>
    </Card>

    <!-- Black Section -->
    <Card
      class="flex flex-col gap-4 p-4 transition-all duration-500"
      :class="getSectionClass('black')"
    >
      <!-- Header Row -->
      <div class="flex gap-2 h-14">
        <Button
          @click="$emit('place-bet', 'color', COLORS.BLACK)"
          class="flex-1 bg-[#1a1a1a] hover:bg-black text-white relative group h-full text-lg tracking-wider font-outfit border-b-4 border-black active:border-b-0 active:translate-y-1"
        >
          BLACK
          <span
            v-if="getBetAmount('color', 'black')"
            class="absolute -top-2 -right-2 bg-white text-black text-xs font-medium rounded-full w-6 h-6 flex items-center justify-center shadow-lg animate-pop-in border-2 border-black"
          >
            {{ getBetAmount("color", "black") }}
          </span>
        </Button>
        <div class="flex-[2] grid grid-cols-7 gap-1">
          <Button
            v-for="num in getNumbersByColor(COLORS.BLACK)"
            :key="num"
            @click="$emit('place-bet', 'number', num)"
            variant="outline"
            class="h-full p-0 flex flex-col items-center justify-center transition-all duration-300 font-outfit"
            :class="getNumberClass(num)"
          >
            <span class="text-sm font-medium">{{ num }}</span>
            <span
              v-if="getBetAmount('number', num) > 0"
              class="text-[10px] text-yellow-500 font-medium"
            >
              {{ getBetAmount("number", num) }}
            </span>
          </Button>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="grid grid-cols-3 gap-2">
        <div
          class="bg-secondary/50 rounded p-2 flex flex-col items-center justify-center border border-border"
        >
          <span class="text-[10px] text-muted-foreground uppercase font-bold tracking-wider"
            >Users</span
          >
          <span class="text-sm font-medium text-foreground font-outfit">{{
            getBetsForColor("black").length
          }}</span>
        </div>
        <div
          class="bg-secondary/50 rounded p-2 flex flex-col items-center justify-center border border-border"
        >
          <span class="text-[10px] text-muted-foreground uppercase font-bold tracking-wider"
            >Total</span
          >
          <span class="text-sm font-medium text-foreground font-outfit">{{
            getTotalBetForColor("black")
          }}</span>
        </div>
        <div
          class="bg-secondary/50 rounded p-2 flex flex-col items-center justify-center border border-border"
        >
          <span class="text-[10px] text-muted-foreground uppercase font-bold tracking-wider"
            >You</span
          >
          <span class="text-sm font-medium text-muted-foreground font-outfit">{{
            getUserBetForColor("black")
          }}</span>
        </div>
      </div>

      <!-- User Cards -->
      <div class="grid grid-cols-4 gap-2">
        <div
          v-for="(bet, i) in getBetsForColor('black')"
          :key="i"
          class="bg-secondary/30 rounded p-2 flex flex-col items-center gap-1 border border-border hover:border-white/20 transition-colors"
        >
          <img
            src="@/assets/default-user.svg"
            class="w-8 h-8 rounded-full bg-white p-1 border border-border"
          />
          <span
            class="text-[10px] text-muted-foreground font-bold truncate w-full text-center"
            >{{ bet.username || "User" }}</span
          >
          <span class="text-xs font-medium text-foreground font-outfit">{{ bet.amount }}</span>
        </div>
      </div>
    </Card>
  </div>
</template>

<script setup>
import { useBettingBoard } from "../composables/useBettingBoard";
import { getNumbersByColor, COLORS } from "../constants/game";
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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

const {
    getBetAmount,
    getBetsForColor,
    getTotalBetForColor,
    getUserBetForColor,
    getSectionClass,
    getNumberClass
} = useBettingBoard(props, emit);
</script>
