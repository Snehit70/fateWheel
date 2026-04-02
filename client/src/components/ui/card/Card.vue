<script setup>
import { cn } from "@/lib/utils";

const props = defineProps({
  class: { type: null, required: false },
});
</script>

<template>
  <div
    data-slot="card"
    :class="
      cn(
        'bg-gradient-to-b from-surface to-background text-card-foreground flex flex-col gap-4 rounded border border-gold/10 p-4 shadow-lg shadow-black/20 relative overflow-hidden',
        props.class,
      )
    "
  >
    <!-- Top accent line -->
    <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent"></div>
    <slot />
  </div>
</template>
