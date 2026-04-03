<script setup>
import { useVModel } from "@vueuse/core";
import { cn } from "@/lib/utils";

const props = defineProps({
  defaultValue: { type: [String, Number], required: false },
  modelValue: { type: [String, Number], required: false },
  class: { type: null, required: false },
});

const emits = defineEmits(["update:modelValue"]);

const modelValue = useVModel(props, "modelValue", emits, {
  passive: true,
  defaultValue: props.defaultValue,
});
</script>

<template>
  <input
    v-model="modelValue"
    data-slot="input"
    :class="
      cn(
        'file:text-foreground placeholder:text-muted-foreground/50 selection:bg-gold/30 selection:text-cream',
        'border-gold/20 bg-surface/50 h-9 w-full min-w-0 rounded border px-3 py-1 text-base font-body',
        'shadow-inner shadow-black/10 transition-all duration-300 outline-none',
        'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus:border-gold/50 focus:ring-2 focus:ring-gold/20',
        'aria-invalid:ring-ruby/20 aria-invalid:border-ruby',
        props.class,
      )
    "
  />
</template>
