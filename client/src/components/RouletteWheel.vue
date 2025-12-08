<template>
  <div class="relative w-full max-w-4xl mx-auto h-[150px] sm:h-[225px] md:h-[300px] overflow-hidden flex justify-center items-end mb-4 sm:mb-8">
    <!-- Wheel Container (Shifted up to show only bottom half) -->
    <div 
      class="relative w-[300px] h-[300px] sm:w-[450px] sm:h-[450px] md:w-[600px] md:h-[600px] rounded-full transition-transform cubic-bezier(0.1, 0.8, 0.1, 1) transform-gpu"
      :style="{ transform: `rotate(${rotation}deg)`, transitionDuration: `${transitionDuration}ms` }"
    >
      <!-- Segments -->
      <svg viewBox="0 0 100 100" class="w-full h-full transform -rotate-90 overflow-visible">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:rgba(255,255,255,1);stop-opacity:1" />
            <stop offset="100%" style="stop-color:rgba(255,255,255,0.6);stop-opacity:1" />
          </linearGradient>
        </defs>
        <g v-for="(segment, i) in SEGMENTS" :key="i">
          <path 
            :d="getSegmentPath(i)" 
            :fill="getSegmentColor(segment.color)"
            stroke="#0a0a0f" 
            stroke-width="0.5"
          />
          <!-- Number -->
          <text
            :x="getTextX(i)"
            :y="getTextY(i)"
            fill="url(#textGradient)"
            font-size="5"
            font-weight="300"
            text-anchor="middle"
            dominant-baseline="middle"
            :transform="getTextTransform(i)"
            style="text-shadow: 1px 1px 2px rgba(0,0,0,0.8); font-family: 'Outfit', sans-serif;"
          >
            {{ segment.number }}
          </text>
        </g>
      </svg>
    </div>

    <!-- Center Display (Positioned in the hollow space of the arc) -->
    <div class="absolute top-[30%] md:top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-center pointer-events-none">
        
        <!-- Timer State -->
        <div v-if="status.includes('ROLLING IN')" class="text-center">
            <div class="text-4xl sm:text-5xl md:text-6xl font-outfit font-thin md:font-light bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent mb-2 tracking-tighter drop-shadow-2xl">
                {{ timeLeft.toFixed(2) }}
            </div>
            <div class="text-text-muted text-xs sm:text-sm font-thin md:font-light tracking-[0.3em] uppercase">Rolling In</div>
        </div>

        <!-- Result State -->
        <div v-else-if="lastResult" class="text-center animate-fade-in">
            <div class="text-text-muted text-[10px] sm:text-xs font-thin md:font-light tracking-[0.3em] uppercase mb-2 sm:mb-4">Winning Number</div>
            <div :class="[
                'text-5xl sm:text-6xl md:text-7xl font-outfit font-thin md:font-light mb-2 sm:mb-4 drop-shadow-2xl',
                lastResult.color === COLORS.RED ? 'text-primary' : lastResult.color === COLORS.GREEN ? 'text-success' : 'text-purple-300'
            ]">
                {{ lastResult.number }}
            </div>
            <div :class="[
                'text-xs sm:text-sm font-bold uppercase tracking-widest px-3 sm:px-4 py-1 sm:py-1.5 rounded-full inline-block border font-outfit',
                lastResult.color === COLORS.RED ? 'bg-primary/20 text-primary border-primary/30' : lastResult.color === COLORS.GREEN ? 'bg-success/20 text-success border-success/30' : 'bg-purple-900/40 text-purple-300 border-purple-400/30'
            ]">
                {{ lastResult.color }}
            </div>
        </div>

        <!-- Rolling State -->
        <div v-else class="text-center pt-8">
            <div class="text-2xl sm:text-3xl font-outfit font-thin md:font-light tracking-[0.3em] text-white uppercase animate-pulse">Rolling</div>
            <div class="flex justify-center mt-4 space-x-2">
                <div class="w-2 h-2 bg-primary rounded-full animate-bounce" style="animation-delay: 0s"></div>
                <div class="w-2 h-2 bg-white rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                <div class="w-2 h-2 bg-primary rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
            </div>
        </div>
    </div>

    <!-- Pointer -->
    <div class="absolute bottom-[-15px] md:bottom-[10px] left-1/2 -translate-x-1/2 z-30">
        <div class="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[24px] border-b-accent filter drop-shadow-[0_0_15px_rgba(255,215,0,0.6)]"></div>
    </div>

    <!-- Gradient Overlay to fade the edges of the arc -->
    <div class="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-background pointer-events-none z-10 h-20 top-0"></div>
  </div>
</template>

<script setup>
import { SEGMENTS, SEGMENT_ANGLE, COLORS } from '../constants/game';

const getSegmentColor = (color) => {
    switch(color) {
        case COLORS.RED: return '#ff4d4d';
        case COLORS.BLACK: return '#2d1f3d';
        case COLORS.GREEN: return '#22c55e';
        default: return color;
    }
};

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
