<template>
  <div class="relative w-full max-w-4xl mx-auto h-[160px] sm:h-[240px] md:h-[320px] overflow-hidden flex justify-center items-end mb-0">

    <!-- Outer Gold Ring Glow -->
    <div
      class="absolute bottom-0 left-1/2 -translate-x-1/2 w-[320px] h-[320px] sm:w-[480px] sm:h-[480px] md:w-[640px] md:h-[640px] rounded-full transition-all duration-300"
      :class="{ 'wheel-spinning': status.includes('Rolling') || status === 'LOCKING BETS...' }"
      style="background: radial-gradient(circle, transparent 45%, rgba(212, 175, 55, 0.15) 47%, rgba(212, 175, 55, 0.05) 50%, transparent 52%);"
    ></div>

    <!-- Wheel Container -->
    <div
      class="relative w-[300px] h-[300px] sm:w-[450px] sm:h-[450px] md:w-[600px] md:h-[600px] rounded-full transition-transform transform-gpu"
      :style="{
        transform: `rotate(${rotation}deg)`,
        transitionDuration: `${transitionDuration}ms`,
        transitionTimingFunction: 'cubic-bezier(0.1, 0.8, 0.1, 1)'
      }"
    >
      <!-- SVG Wheel -->
      <svg viewBox="0 0 100 100" class="w-full h-full transform -rotate-90 overflow-visible drop-shadow-2xl">
        <defs>
          <!-- Gold metallic gradient for rim -->
          <linearGradient id="goldRim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f0d77a"/>
            <stop offset="50%" style="stop-color:#d4af37"/>
            <stop offset="100%" style="stop-color:#b8972f"/>
          </linearGradient>

          <!-- Segment gradients for depth -->
          <linearGradient id="rubyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#c41e2a"/>
            <stop offset="50%" style="stop-color:#9b111e"/>
            <stop offset="100%" style="stop-color:#7a0d17"/>
          </linearGradient>

          <linearGradient id="royalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#2d2045"/>
            <stop offset="50%" style="stop-color:#1a1128"/>
            <stop offset="100%" style="stop-color:#0f0a18"/>
          </linearGradient>

          <linearGradient id="emeraldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#34a65f"/>
            <stop offset="50%" style="stop-color:#2e8b57"/>
            <stop offset="100%" style="stop-color:#236b43"/>
          </linearGradient>

          <!-- Inner shadow for depth -->
          <filter id="innerShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feOffset dx="0" dy="1" />
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <!-- Subtle glow -->
          <filter id="glow">
            <feGaussianBlur stdDeviation="0.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <!-- Outer gold ring -->
        <circle cx="50" cy="50" r="49.5" fill="none" stroke="url(#goldRim)" stroke-width="1" opacity="0.8"/>

        <!-- Wheel segments -->
        <g v-for="(segment, i) in SEGMENTS" :key="i">
          <path
            :d="getSegmentPath(i)"
            :fill="getSegmentGradient(segment.color)"
            stroke="#0a0a0a"
            stroke-width="0.3"
            filter="url(#innerShadow)"
          />
          <!-- Segment separator lines in gold -->
          <line
            :x1="getLineStart(i).x"
            :y1="getLineStart(i).y"
            :x2="getLineEnd(i).x"
            :y2="getLineEnd(i).y"
            stroke="#d4af37"
            stroke-width="0.15"
            opacity="0.4"
          />
          <!-- Number -->
          <text
            :x="getTextX(i)"
            :y="getTextY(i)"
            fill="#f5e6c8"
            font-size="4.5"
            font-weight="500"
            text-anchor="middle"
            dominant-baseline="middle"
            :transform="getTextTransform(i)"
            style="font-family: 'Cinzel', serif; text-shadow: 0 1px 2px rgba(0,0,0,0.8);"
            filter="url(#glow)"
          >
            {{ segment.number }}
          </text>
        </g>

        <!-- Inner ring (gold) -->
        <circle cx="50" cy="50" r="32" fill="none" stroke="url(#goldRim)" stroke-width="0.8" opacity="0.6"/>

        <!-- Center black circle -->
        <circle cx="50" cy="50" r="31.5" fill="#0a0a0a"/>

        <!-- Inner decorative ring -->
        <circle cx="50" cy="50" r="28" fill="none" stroke="#d4af37" stroke-width="0.3" opacity="0.3"/>
      </svg>
    </div>

    <!-- Center Display -->
    <div class="absolute top-[25%] sm:top-[30%] md:top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-center pointer-events-none">

      <!-- Timer State -->
      <div v-if="status.includes('ROLLING IN')" class="text-center">
        <div class="text-4xl sm:text-5xl md:text-7xl font-display font-medium text-gold-gradient tracking-tight mb-1 drop-shadow-[0_0_30px_rgba(212,175,55,0.4)]">
          {{ timeLeft.toFixed(2) }}
        </div>
        <div class="text-muted-foreground text-[10px] sm:text-xs font-display tracking-[0.4em] uppercase opacity-70 hidden sm:block">Rolling In</div>
      </div>

      <!-- Locking Bets State -->
      <div v-else-if="status === 'LOCKING BETS...'" class="text-center">
        <div class="text-lg sm:text-2xl md:text-3xl font-display font-medium tracking-[0.2em] text-gold uppercase animate-pulse">
          Locking Bets
        </div>
        <div class="flex justify-center mt-3 space-x-2">
          <div class="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style="animation-delay: 0s"></div>
          <div class="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style="animation-delay: 0.15s"></div>
          <div class="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style="animation-delay: 0.3s"></div>
        </div>
      </div>

      <!-- Result State -->
      <div v-else-if="lastResult" class="text-center result-reveal">
        <div :class="[
          'text-5xl sm:text-6xl md:text-8xl font-display font-semibold mb-2 drop-shadow-[0_0_40px_currentColor] result-number',
          getResultColorClass(lastResult.color)
        ]">
          {{ lastResult.number }}
        </div>
        <div :class="[
          'text-[10px] sm:text-xs font-display font-medium uppercase tracking-[0.3em] px-4 py-1.5 rounded-sm inline-block border',
          getResultBadgeClass(lastResult.color)
        ]">
          {{ lastResult.color }}
        </div>
      </div>

      <!-- Rolling State -->
      <div v-else class="text-center">
        <div class="text-xl sm:text-2xl md:text-3xl font-display font-medium tracking-[0.3em] text-gold uppercase animate-pulse">
          Rolling
        </div>
        <div class="flex justify-center mt-4 space-x-2">
          <div class="w-1.5 h-1.5 bg-ruby rounded-full animate-bounce" style="animation-delay: 0s"></div>
          <div class="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style="animation-delay: 0.15s"></div>
          <div class="w-1.5 h-1.5 bg-emerald rounded-full animate-bounce" style="animation-delay: 0.3s"></div>
        </div>
      </div>
    </div>

    <!-- Elegant Pointer -->
    <div class="absolute bottom-[-8px] md:bottom-[15px] left-1/2 -translate-x-1/2 z-30">
      <div class="relative">
        <!-- Pointer shadow/glow -->
        <div class="absolute inset-0 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[20px] border-b-gold blur-sm opacity-60"></div>
        <!-- Main pointer -->
        <div class="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[20px] border-b-gold drop-shadow-[0_0_10px_rgba(212,175,55,0.8)]"></div>
        <!-- Pointer accent line -->
        <div class="absolute top-[4px] left-1/2 -translate-x-1/2 w-0.5 h-3 bg-gradient-to-b from-gold-light to-transparent"></div>
      </div>
    </div>

    <!-- Top gradient fade -->
    <div class="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-background via-background/80 to-transparent pointer-events-none z-10"></div>
  </div>
</template>

<script setup>
import { SEGMENTS, SEGMENT_ANGLE, COLORS } from '../constants/game';

const props = defineProps({
  rotation: { type: Number, default: 0 },
  transitionDuration: { type: Number, default: 0 },
  status: { type: String, default: '' },
  timeLeft: { type: Number, default: 0 },
  lastResult: { type: Object, default: null }
});

// Donut Chart Math
const INNER_RADIUS = 32;
const OUTER_RADIUS = 49;

const getSegmentGradient = (color) => {
  switch(color) {
    case COLORS.RED: return 'url(#rubyGradient)';
    case COLORS.BLACK: return 'url(#royalGradient)';
    case COLORS.GREEN: return 'url(#emeraldGradient)';
    default: return color;
  }
};

const getSegmentPath = (i) => {
  const startAngle = i * SEGMENT_ANGLE;
  const endAngle = (i + 1) * SEGMENT_ANGLE;
  const startRad = (Math.PI * startAngle) / 180;
  const endRad = (Math.PI * endAngle) / 180;

  const x1 = 50 + OUTER_RADIUS * Math.cos(startRad);
  const y1 = 50 + OUTER_RADIUS * Math.sin(startRad);
  const x2 = 50 + OUTER_RADIUS * Math.cos(endRad);
  const y2 = 50 + OUTER_RADIUS * Math.sin(endRad);
  const x3 = 50 + INNER_RADIUS * Math.cos(endRad);
  const y3 = 50 + INNER_RADIUS * Math.sin(endRad);
  const x4 = 50 + INNER_RADIUS * Math.cos(startRad);
  const y4 = 50 + INNER_RADIUS * Math.sin(startRad);

  return `M ${x1} ${y1} A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${INNER_RADIUS} ${INNER_RADIUS} 0 0 0 ${x4} ${y4} Z`;
};

const getLineStart = (i) => {
  const angle = i * SEGMENT_ANGLE;
  const rad = (Math.PI * angle) / 180;
  return {
    x: 50 + INNER_RADIUS * Math.cos(rad),
    y: 50 + INNER_RADIUS * Math.sin(rad)
  };
};

const getLineEnd = (i) => {
  const angle = i * SEGMENT_ANGLE;
  const rad = (Math.PI * angle) / 180;
  return {
    x: 50 + OUTER_RADIUS * Math.cos(rad),
    y: 50 + OUTER_RADIUS * Math.sin(rad)
  };
};

const getTextX = (i) => 50 + (INNER_RADIUS + (OUTER_RADIUS - INNER_RADIUS)/2) * Math.cos((Math.PI * (i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2)) / 180);
const getTextY = (i) => 50 + (INNER_RADIUS + (OUTER_RADIUS - INNER_RADIUS)/2) * Math.sin((Math.PI * (i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2)) / 180);
const getTextTransform = (i) => `rotate(${90 + i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2}, ${getTextX(i)}, ${getTextY(i)})`;

const getResultColorClass = (color) => {
  switch(color) {
    case 'red': return 'text-ruby-light';
    case 'green': return 'text-emerald';
    case 'black': return 'text-cream';
    default: return 'text-gold';
  }
};

const getResultBadgeClass = (color) => {
  switch(color) {
    case 'red': return 'bg-ruby/20 text-ruby-light border-ruby/40';
    case 'green': return 'bg-emerald/20 text-emerald border-emerald/40';
    case 'black': return 'bg-royal/30 text-cream border-royal/50';
    default: return 'bg-gold/20 text-gold border-gold/40';
  }
};
</script>

<style scoped>
/* Gold gradient text utility */
.text-gold-gradient {
  background: linear-gradient(135deg, #f0d77a 0%, #d4af37 50%, #b8972f 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Wheel glow animation */
.wheel-spinning {
  animation: wheelGlow 1.5s ease-in-out infinite;
}

@keyframes wheelGlow {
  0%, 100% {
    filter: drop-shadow(0 0 20px rgba(212, 175, 55, 0.3));
  }
  50% {
    filter: drop-shadow(0 0 40px rgba(212, 175, 55, 0.5));
  }
}

/* Result reveal animation */
.result-reveal {
  animation: resultReveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes resultReveal {
  0% {
    opacity: 0;
    transform: scale(0.8);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* Result number glow */
.result-number {
  animation: numberPulse 2s ease-in-out infinite;
}

@keyframes numberPulse {
  0%, 100% {
    filter: drop-shadow(0 0 20px currentColor);
  }
  50% {
    filter: drop-shadow(0 0 40px currentColor);
  }
}
</style>
