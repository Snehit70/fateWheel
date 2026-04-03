<script setup>
import { cn } from "@/lib/utils";

const props = defineProps({
  class: { type: null, required: false },
});
</script>

<template>
  <tr
    data-slot="table-row"
    :class="
      cn(
        'hover:bg-gold/5 data-[state=selected]:bg-gold/10 border-b border-gold/5 transition-colors',
        props.class,
      )
    "
  >
    <slot />
  </tr>
</template>
