
<template>
  <div class="w-full mb-2 lg:mb-2">
    <!-- Mobile Tabs -->
    <div class="grid grid-cols-3 gap-1 mb-1 lg:mb-2 lg:hidden bg-secondary/30 p-1 rounded-lg">
      <button 
        @click="activeTab = 'red'"
        class="flex flex-col items-center justify-center py-1 rounded transition-all duration-300"
        :class="activeTab === 'red' ? 'bg-[#ff4d4d]/20 text-[#ff4d4d] border border-[#ff4d4d]/50 shadow-[0_0_10px_rgba(255,77,77,0.2)]' : 'text-muted-foreground hover:bg-white/5'"
      >
        <span class="text-[10px] font-bold tracking-wider">RED</span>
        <span class="text-[9px] font-outfit mt-0.5 opacity-80">${{ getUserBetForColor("red") }}</span>
      </button>
      
      <button 
        @click="activeTab = 'green'"
        class="flex flex-col items-center justify-center py-1 rounded transition-all duration-300"
        :class="activeTab === 'green' ? 'bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/50 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'text-muted-foreground hover:bg-white/5'"
      >
        <span class="text-[10px] font-bold tracking-wider">ZERO</span>
        <span class="text-[9px] font-outfit mt-0.5 opacity-80">${{ getUserBetForColor("green") }}</span>
      </button>

      <button 
        @click="activeTab = 'black'"
        class="flex flex-col items-center justify-center py-1 rounded transition-all duration-300"
        :class="activeTab === 'black' ? 'bg-[#2d1f3d]/30 text-purple-300 border border-purple-400/50 shadow-[0_0_10px_rgba(138,43,226,0.3)]' : 'text-muted-foreground hover:bg-white/5'"
      >
        <span class="text-[10px] font-bold tracking-wider">BLACK</span>
        <span class="text-[9px] font-outfit mt-0.5 opacity-80">${{ getUserBetForColor("black") }}</span>
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-1 lg:gap-2">
    <!-- Red Section -->
    <Card
      class="flex flex-col gap-1 sm:gap-2 p-1 transition-all duration-500"
      :class="[getSectionClass('red'), { 'hidden lg:flex': activeTab !== 'red' }]"
    >
      <!-- Header Row -->
      <div class="flex gap-1 h-12">
        <Button
          @click="handlePlaceBet('color', COLORS.RED)"
          class="flex-1 bg-[#ff4d4d] hover:bg-[#ff3333] text-white relative group h-full text-lg tracking-wider font-outfit border-b-4 border-[#cc0000] active:border-b-0 active:translate-y-1 flex flex-col items-center justify-center"
          :class="{ 'opacity-80 hover:bg-[#ff4d4d] cursor-not-allowed': !isLoggedIn || isAdmin }"
        >
          <span>RED</span>
          <span
            v-if="getBetAmount('color', 'red')"
            class="text-[10px] text-yellow-500 font-medium whitespace-nowrap"
          >
            {{ getBetAmount("color", "red") }}
          </span>
        </Button>
        <div class="flex-[2] grid grid-cols-7 gap-[2px]">
          <Button
            v-for="num in getNumbersByColor(COLORS.RED)"
            :key="num"
            @click="handlePlaceBet('number', num)"
            class="h-full p-0 flex flex-col items-center justify-center transition-all duration-300 font-outfit"
            :class="[getNumberClass(num), { 'opacity-80 cursor-not-allowed': !isLoggedIn || isAdmin }]"
          >
            <span class="text-sm font-medium">{{ num }}</span>
            <span
              v-if="getBetAmount('number', num) > 0"
              class="text-[9px] text-yellow-500 font-medium"
            >
              {{ getBetAmount("number", num) }}
            </span>
          </Button>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="grid grid-cols-3 gap-1">
        <div
          class="bg-secondary/50 rounded p-1 flex flex-col items-center justify-center border border-border"
        >
          <span class="text-[9px] text-muted-foreground uppercase font-bold tracking-wider"
            >Users</span
          >
          <span class="text-xs font-medium text-foreground font-outfit">{{
            getUniqueUsersCountForColor("red")
          }}</span>
        </div>
        <div
          class="bg-secondary/50 rounded p-1 flex flex-col items-center justify-center border border-border"
        >
          <span class="text-[9px] text-muted-foreground uppercase font-bold tracking-wider"
            >Total</span
          >
          <span class="text-xs font-medium text-foreground font-outfit">{{
            getTotalBetForColor("red")
          }}</span>
        </div>
        <div
          class="bg-secondary/50 rounded p-1 flex flex-col items-center justify-center border border-border"
        >
          <span class="text-[9px] text-muted-foreground uppercase font-bold tracking-wider"
            >You</span
          >
          <span class="text-xs font-medium text-red-500 font-outfit">{{
            getUserBetForColor("red")
          }}</span>
        </div>
      </div>

      <!-- User Cards -->
      <div class="grid grid-cols-4 gap-1">
        <div
          v-for="(user, i) in getAggregatedBetsForColor('red')"
          :key="user.userId || i"
          class="bg-secondary/30 rounded p-1 flex flex-col items-center gap-0.5 border border-border hover:border-red-500/30 transition-colors"
        >
          <img
            src="/default-user.svg"
            class="w-6 h-6 rounded-full bg-white p-[2px] border border-border"
          />
          <span
            class="text-[9px] text-muted-foreground font-bold truncate w-full text-center"
            >{{ user.username || "User" }}</span
          >
          <span v-if="shouldShowAmount(user)" class="text-[9px] font-medium text-red-500 font-outfit">{{
            user.amount
          }}</span>
        </div>
      </div>
    </Card>

    <!-- Green Section -->
    <Card
      class="flex flex-col gap-1 sm:gap-2 p-1 transition-all duration-500"
      :class="[getSectionClass('green'), { 'hidden lg:flex': activeTab !== 'green' }]"
    >
      <!-- Header Row -->
      <div class="grid grid-cols-3 gap-1 h-12">
        <Button
          @click="handlePlaceBet('type', 'even')"
          variant="outline"
          class="h-full flex flex-col items-center justify-center text-xs uppercase tracking-wider font-outfit font-bold transition-all duration-300"
          :class="[
            getEvenOddClass('even'),
            { 'opacity-80 cursor-not-allowed': !isLoggedIn || isAdmin }
          ]"
        >
          <span>EVEN</span>
          <span
            v-if="getBetAmount('type', 'even') > 0"
            class="text-[9px] text-yellow-500 font-medium"
          >
            {{ getBetAmount("type", "even") }}
          </span>
        </Button>
        <Button
          @click="handlePlaceBet('number', 0)"
          class="h-full p-0 flex flex-col items-center justify-center transition-all duration-300 font-outfit"
          :class="[getNumberClass(0), { 'opacity-80 cursor-not-allowed': !isLoggedIn || isAdmin }]"
        >
          <span class="text-sm font-medium">0</span>
          <span
            v-if="getBetAmount('number', 0) > 0"
            class="text-[9px] text-yellow-500 font-medium"
          >
            {{ getBetAmount("number", 0) }}
          </span>
        </Button>
        <Button
          @click="handlePlaceBet('type', 'odd')"
          variant="outline"
          class="h-full flex flex-col items-center justify-center text-xs uppercase tracking-wider font-outfit font-bold transition-all duration-300"
          :class="[
            getEvenOddClass('odd'),
            { 'opacity-80 cursor-not-allowed': !isLoggedIn || isAdmin }
          ]"
        >
          <span>ODD</span>
          <span
            v-if="getBetAmount('type', 'odd') > 0"
            class="text-[9px] text-yellow-500 font-medium"
          >
            {{ getBetAmount("type", "odd") }}
          </span>
        </Button>
      </div>

      <!-- Stats Row -->
      <div class="grid grid-cols-3 gap-1">
        <div
          class="bg-secondary/50 rounded p-1 flex flex-col items-center justify-center border border-border"
        >
          <span class="text-[9px] text-muted-foreground uppercase font-bold tracking-wider"
            >Users</span
          >
          <span class="text-xs font-medium text-foreground font-outfit">{{
            getUniqueUsersCountForColor("green")
          }}</span>
        </div>
        <div
          class="bg-secondary/50 rounded p-1 flex flex-col items-center justify-center border border-border"
        >
          <span class="text-[9px] text-muted-foreground uppercase font-bold tracking-wider"
            >Total</span
          >
          <span class="text-xs font-medium text-foreground font-outfit">{{
            getTotalBetForColor("green")
          }}</span>
        </div>
        <div
          class="bg-secondary/50 rounded p-1 flex flex-col items-center justify-center border border-border"
        >
          <span class="text-[9px] text-muted-foreground uppercase font-bold tracking-wider"
            >You</span
          >
          <span class="text-xs font-medium text-green-500 font-outfit">{{
            getUserBetForColor("green")
          }}</span>
        </div>
      </div>

      <!-- User Cards -->
      <div class="grid grid-cols-4 gap-1">
        <div
          v-for="(user, i) in getAggregatedBetsForColor('green')"
          :key="user.userId || i"
          class="bg-secondary/30 rounded p-1 flex flex-col items-center gap-0.5 border border-border hover:border-green-500/30 transition-colors"
        >
          <img
            src="/default-user.svg"
            class="w-6 h-6 rounded-full bg-white p-[2px] border border-border"
          />
          <span
            class="text-[9px] text-muted-foreground font-bold truncate w-full text-center"
            >{{ user.username || "User" }}</span
          >
          <span v-if="shouldShowAmount(user)" class="text-[9px] font-medium text-green-500 font-outfit">{{
            user.amount
          }}</span>
        </div>
      </div>
    </Card>

    <!-- Black Section -->
    <Card
      class="flex flex-col gap-1 sm:gap-2 p-1 transition-all duration-500"
      :class="[getSectionClass('black'), { 'hidden lg:flex': activeTab !== 'black' }]"
    >
      <!-- Header Row -->
      <div class="flex gap-1 h-12">
        <Button
          @click="handlePlaceBet('color', COLORS.BLACK)"
          class="flex-1 bg-[#2d1f3d] hover:bg-[#3d2a52] text-purple-200 relative group h-full text-lg tracking-wider font-outfit border-b-4 border-[#4a3366] active:border-b-0 active:translate-y-1 shadow-[0_0_15px_rgba(138,43,226,0.2)] flex flex-col items-center justify-center"
          :class="{ 'opacity-80 hover:bg-[#2d1f3d] cursor-not-allowed': !isLoggedIn || isAdmin }"
        >
          <span>BLACK</span>
          <span
            v-if="getBetAmount('color', 'black')"
            class="text-[10px] text-yellow-500 font-medium whitespace-nowrap"
          >
            {{ getBetAmount("color", "black") }}
          </span>
        </Button>
        <div class="flex-[2] grid grid-cols-7 gap-[2px]">
          <Button
            v-for="num in getNumbersByColor(COLORS.BLACK)"
            :key="num"
            @click="handlePlaceBet('number', num)"
            class="h-full p-0 flex flex-col items-center justify-center transition-all duration-300 font-outfit"
            :class="[getNumberClass(num), { 'opacity-80 cursor-not-allowed': !isLoggedIn || isAdmin }]"
          >
            <span class="text-sm font-medium">{{ num }}</span>
            <span
              v-if="getBetAmount('number', num) > 0"
              class="text-[9px] text-yellow-500 font-medium"
            >
              {{ getBetAmount("number", num) }}
            </span>
          </Button>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="grid grid-cols-3 gap-1">
        <div
          class="bg-secondary/50 rounded p-1 flex flex-col items-center justify-center border border-border"
        >
          <span class="text-[9px] text-muted-foreground uppercase font-bold tracking-wider"
            >Users</span
          >
          <span class="text-xs font-medium text-foreground font-outfit">{{
            getUniqueUsersCountForColor("black")
          }}</span>
        </div>
        <div
          class="bg-secondary/50 rounded p-1 flex flex-col items-center justify-center border border-border"
        >
          <span class="text-[9px] text-muted-foreground uppercase font-bold tracking-wider"
            >Total</span
          >
          <span class="text-xs font-medium text-foreground font-outfit">{{
            getTotalBetForColor("black")
          }}</span>
        </div>
        <div
          class="bg-secondary/50 rounded p-1 flex flex-col items-center justify-center border border-border"
        >
          <span class="text-[9px] text-muted-foreground uppercase font-bold tracking-wider"
            >You</span
          >
          <span class="text-xs font-medium text-purple-400 font-outfit">{{
            getUserBetForColor("black")
          }}</span>
        </div>
      </div>

      <!-- User Cards -->
      <div class="grid grid-cols-4 gap-1">
        <div
          v-for="(user, i) in getAggregatedBetsForColor('black')"
          :key="user.userId || i"
          class="bg-secondary/30 rounded p-1 flex flex-col items-center gap-0.5 border border-border hover:border-purple-500/30 transition-colors"
        >
          <img
            src="/default-user.svg"
            class="w-6 h-6 rounded-full bg-white p-[2px] border border-border"
          />
          <span
            class="text-[9px] text-muted-foreground font-bold truncate w-full text-center"
            >{{ user.username || "User" }}</span
          >
          <span v-if="shouldShowAmount(user)" class="text-[9px] font-medium text-purple-400 font-outfit">{{ user.amount }}</span>
        </div>
      </div>
    </Card>
    </div>
  </div>
</template>

<script setup>
import { useBettingBoard } from "../composables/useBettingBoard";
import { getNumbersByColor, COLORS } from "../constants/game";
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const activeTab = ref('red');

const isAdmin = computed(() => {
    return authStore.user && authStore.user.role === 'admin';
});

const props = defineProps({
  bets: {
    type: Array,
    default: () => [],
  },
  lastResult: {
    type: Object,
    default: null,
  },
  isLoggedIn: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(["place-bet"]);

const handlePlaceBet = (type, value) => {
    if (!props.isLoggedIn) {
        authStore.openLoginModal();
        return;
    }
    if (isAdmin.value) return;
    emit('place-bet', type, value);
};

const shouldShowAmount = (betUser) => {
    if (isAdmin.value) return true;
    if (authStore.user && (authStore.user.id === betUser.userId || authStore.user._id === betUser.userId)) {
        return true;
    }
    return false;
};

const {
    getBetAmount,
    getBetsForColor,
    getTotalBetForColor,
    getUniqueUsersCountForColor,
    getAggregatedBetsForColor,
    getUserBetForColor,
    getSectionClass,
    getNumberClass,
    getEvenOddClass
} = useBettingBoard(props, emit);
</script>
