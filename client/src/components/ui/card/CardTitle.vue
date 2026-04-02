<script setup>
import { cn } from "@/lib/utils";

const props = defineProps({
  class: { type: null, required: false },
});
</script>

<template>
  <h3
    data-slot="card-title"
    :class="cn('leading-none font-display font-semibold tracking-[0.1em] text-cream', props.class)"
  >
    <slot />
  </h3>
</template>
