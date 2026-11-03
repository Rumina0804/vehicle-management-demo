<script setup lang="ts">
import { computed } from 'vue'
import { ChevronUp, ChevronDown, ChevronsUpDown } from '@lucide/vue'
import type { SortState } from '@/composables/useTable'

const props = withDefaults(defineProps<{ label: string; field: string; sort: SortState; align?: 'left' | 'right' | 'center' }>(), {
  align: 'left',
})
defineEmits<{ sort: [string] }>()

const active = computed(() => props.sort.key === props.field)
</script>

<template>
  <th
    :aria-sort="active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'"
    :class="align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : ''"
  >
    <button
      class="inline-flex items-center gap-1 font-bold hover:text-brand-700"
      :class="[active ? 'text-brand-700' : '', align === 'right' ? 'flex-row-reverse' : '']"
      @click="$emit('sort', field)"
    >
      {{ label }}
      <ChevronUp v-if="active && sort.dir === 'asc'" class="size-3.5" :stroke-width="3" />
      <ChevronDown v-else-if="active" class="size-3.5" :stroke-width="3" />
      <ChevronsUpDown v-else class="size-3.5 opacity-40" />
    </button>
  </th>
</template>
