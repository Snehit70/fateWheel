<template>
  <div class="flex items-center justify-between px-2 py-4" v-if="totalPages > 1">
    <div class="text-sm text-muted-foreground">
      Page {{ currentPage }} of {{ totalPages }}
    </div>
    <div class="flex items-center space-x-2">
      <Button
        variant="outline"
        size="sm"
        @click="$emit('page-change', currentPage - 1)"
        :disabled="currentPage === 1 || loading"
      >
        Previous
      </Button>
      <div class="hidden sm:flex items-center space-x-1">
        <template v-for="page in visiblePages" :key="page">
            <span v-if="page === '...'" class="px-2 text-muted-foreground">...</span>
            <Button
                v-else
                :variant="currentPage === page ? 'default' : 'ghost'"
                size="sm"
                @click="$emit('page-change', page)"
                :disabled="loading"
                class="w-8 h-8 p-0"
            >
                {{ page }}
            </Button>
        </template>
      </div>
      <Button
        variant="outline"
        size="sm"
        @click="$emit('page-change', currentPage + 1)"
        :disabled="currentPage === totalPages || loading"
      >
        Next
      </Button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { Button } from '@/components/ui/button';

const props = defineProps({
  currentPage: {
    type: Number,
    required: true
  },
  totalPages: {
    type: Number,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
});

defineEmits(['page-change']);

const visiblePages = computed(() => {
    const pages = [];
    const delta = 2; // Number of pages to show around current page

    for (let i = 1; i <= props.totalPages; i++) {
        if (
            i === 1 || // First page
            i === props.totalPages || // Last page
            (i >= props.currentPage - delta && i <= props.currentPage + delta) // Range around current
        ) {
            pages.push(i);
        } else if (
            pages[pages.length - 1] !== '...' && 
            (i < props.currentPage - delta || i > props.currentPage + delta)
        ) {
            pages.push('...');
        }
    }
    return pages;
});
</script>
