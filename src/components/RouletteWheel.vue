<template>
  <div class="relative w-full max-w-4xl mx-auto h-[300px] overflow-hidden flex justify-center items-end mb-8">
    <!-- Wheel Container (Shifted up to show only bottom half) -->
    <div 
      class="relative w-[600px] h-[600px] rounded-full transition-transform cubic-bezier(0.1, 0.8, 0.1, 1) transform-gpu"
      :style="{ transform: `rotate(${rotation}deg)`, transitionDuration: `${transitionDuration}ms` }"
    >
      <!-- Segments -->
      <svg viewBox="0 0 100 100" class="w-full h-full transform -rotate-90 overflow-visible">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <g v-for="(segment, i) in SEGMENTS" :key="i">
          <path 
            :d="getSegmentPath(i)" 
            :fill="getSegmentColor(segment.color)"
            stroke="#0f0f13" 
            stroke-width="0.5"
          />
          <!-- Number -->
          <text
            :x="getTextX(i)"
            :y="getTextY(i)"
            fill="rgba(255,255,255,0.9)"
            font-size="5"
            font-weight="bold"
            text-anchor="middle"
            dominant-baseline="middle"
            :transform="getTextTransform(i)"
            style="text-shadow: 1px 1px 2px rgba(0,0,0,0.8);"
          >
            {{ segment.number }}
          </text>
        </g>
      </svg>
    </div>

    <!-- Center Display (Positioned in the hollow space of the arc) -->
    <div class="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-center">
        
        <!-- Timer State -->
        <div v-if="status.includes('ROLLING IN')" class="text-center">
            <div class="text-6xl font-mono font-bold text-white mb-2 tracking-tighter drop-shadow-2xl">
                {{ timeLeft.toFixed(2) }}
            </div>
            <div class="text-gray-400 text-sm font-bold tracking-[0.3em] uppercase">Rolling In</div>
            
            <!-- Progress Bar -->
            <div class="w-48 h-1.5 bg-gray-800/50 rounded-full mt-6 mx-auto overflow-hidden backdrop-blur-sm">
                <div class="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-100 ease-linear" :style="{ width: `${(timeLeft / 15) * 100}%` }"></div>
            </div>
        </div>

        <!-- Result State -->
        <div v-else-if="lastResult" class="text-center animate-fade-in">
            <div class="text-gray-400 text-xs font-bold tracking-[0.3em] uppercase mb-4">Winning Number</div>
            <div :class="[
                'text-7xl font-bold mb-4 drop-shadow-2xl',
                lastResult.color === 'red' ? 'text-red-500' : lastResult.color === 'green' ? 'text-green-500' : 'text-white'
            ]">
                {{ lastResult.number }}
            </div>
            <div :class="[
                'text-sm font-bold uppercase tracking-widest px-4 py-1.5 rounded-full inline-block',
                lastResult.color === 'red' ? 'bg-red-500/20 text-red-500 border border-red-500/30' : lastResult.color === 'green' ? 'bg-green-500/20 text-green-500 border border-green-500/30' : 'bg-gray-700/50 text-gray-300 border border-gray-600/30'
            ]">
                {{ lastResult.color }}
            </div>
        </div>

        <!-- Rolling State -->
        <div v-else class="text-center pt-8">
            <div class="text-3xl font-light tracking-[0.3em] text-white uppercase animate-pulse">Rolling</div>
            <div class="flex justify-center mt-4 space-x-2">
                <div class="w-2 h-2 bg-red-500 rounded-full animate-bounce" style="animation-delay: 0s"></div>
                <div class="w-2 h-2 bg-white rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                <div class="w-2 h-2 bg-red-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
            </div>
        </div>
    </div>

    <!-- Pointer -->
    <div class="absolute bottom-[10px] left-1/2 -translate-x-1/2 z-30">
        <div class="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[24px] border-b-yellow-500 filter drop-shadow-[0_0_15px_rgba(255,215,0,0.6)]"></div>
    </div>

    <!-- Gradient Overlay to fade the edges of the arc -->
    <div class="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-[#0f0f13] pointer-events-none z-10 h-20 top-0"></div>
  </div>
</template>

<script setup>
const props = defineProps({
  rotation: {
    type: Number,
    default: 0
  },
  transitionDuration: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    default: ''
  },
  timeLeft: {
    type: Number,
    default: 0
  },
  lastResult: {
    type: Object,
    default: null
  }
});

const SEGMENTS = [
  { number: 0, color: "green" },
  { number: 1, color: "red" },
  { number: 8, color: "black" },
  { number: 2, color: "red" },
  { number: 9, color: "black" },
  { number: 3, color: "red" },
  { number: 10, color: "black" },
  { number: 4, color: "red" },
  { number: 11, color: "black" },
  { number: 5, color: "red" },
  { number: 12, color: "black" },
  { number: 6, color: "red" },
  { number: 13, color: "black" },
  { number: 7, color: "red" },
  { number: 14, color: "black" },
];

const SEGMENT_ANGLE = 360 / 15;

const getSegmentColor = (color) => {
    switch(color) {
        case 'red': return 'var(--color-primary)';
        case 'black': return '#1f1f23'; // Specific roulette black
        case 'green': return '#00c74d'; // Specific roulette green
        default: return '#000';
    }
};

// Donut Chart Math
const INNER_RADIUS = 32; // 32%
const OUTER_RADIUS = 50; // 50%

const getSegmentPath = (i) => {
  const startAngle = i * SEGMENT_ANGLE;
  const endAngle = (i + 1) * SEGMENT_ANGLE;
  
  // Convert to radians
  const startRad = (Math.PI * startAngle) / 180;
  const endRad = (Math.PI * endAngle) / 180;

  // Outer Arc points
  const x1 = 50 + OUTER_RADIUS * Math.cos(startRad);
  const y1 = 50 + OUTER_RADIUS * Math.sin(startRad);
  const x2 = 50 + OUTER_RADIUS * Math.cos(endRad);
  const y2 = 50 + OUTER_RADIUS * Math.sin(endRad);

  // Inner Arc points
  const x3 = 50 + INNER_RADIUS * Math.cos(endRad);
  const y3 = 50 + INNER_RADIUS * Math.sin(endRad);
  const x4 = 50 + INNER_RADIUS * Math.cos(startRad);
  const y4 = 50 + INNER_RADIUS * Math.sin(startRad);

  return `
    M ${x1} ${y1}
    A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 0 1 ${x2} ${y2}
    L ${x3} ${y3}
    A ${INNER_RADIUS} ${INNER_RADIUS} 0 0 0 ${x4} ${y4}
    Z
  `;
};

const getTextX = (i) => 50 + (INNER_RADIUS + (OUTER_RADIUS - INNER_RADIUS)/2) * Math.cos((Math.PI * (i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2)) / 180);
const getTextY = (i) => 50 + (INNER_RADIUS + (OUTER_RADIUS - INNER_RADIUS)/2) * Math.sin((Math.PI * (i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2)) / 180);
const getTextTransform = (i) => `rotate(${90 + i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2}, ${getTextX(i)}, ${getTextY(i)})`;

</script>

<style scoped>
.animate-fade-in {
    animation: fadeIn 0.5s ease-out;
}
@keyframes fadeIn {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
}
</style>
