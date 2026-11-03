<script setup lang="ts">
import { computed } from 'vue'

/** 横棒（単一系列・値は棒の先に表示） */
export interface HBarItem {
  key: string
  label: string
  value: number
  hint?: string
  rank?: number
}

const props = withDefaults(
  defineProps<{
    items: HBarItem[]
    format: (v: number) => string
    color?: string
    labelWidth?: string
  }>(),
  { color: '#2a78d6', labelWidth: '120px' },
)
defineEmits<{ select: [string] }>()

const max = computed(() => Math.max(1, ...props.items.map((i) => i.value)))
</script>

<template>
  <ul class="flex flex-col gap-2">
    <li v-for="it in items" :key="it.key" class="group flex items-center gap-2" :title="`${it.label}：${format(it.value)}`">
      <span v-if="it.rank" class="flex size-6 shrink-0 items-center justify-center rounded-md text-[12px] font-black"
        :class="it.rank === 1 ? 'bg-[#f6c445] text-navy-950' : it.rank === 2 ? 'bg-[#c9d1dc] text-navy-950' : it.rank === 3 ? 'bg-[#e0a46b] text-white' : 'bg-[#eef2f7] text-ink-2'">
        {{ it.rank }}
      </span>
      <button
        class="shrink-0 truncate text-left text-[12.5px] font-bold text-ink hover:text-brand-700 hover:underline"
        :style="{ width: labelWidth }"
        @click="$emit('select', it.key)"
      >
        {{ it.label }}<span v-if="it.hint" class="ml-1 text-[11px] font-medium text-ink-3">{{ it.hint }}</span>
      </button>
      <span class="relative flex h-[18px] min-w-0 flex-1 items-center">
        <span
          class="h-full rounded-r-[4px] transition-[width,filter] duration-500 group-hover:brightness-110"
          :style="{ width: `${(it.value / max) * 78}%`, background: color }"
        />
        <span class="tnum ml-2 whitespace-nowrap text-[12.5px] font-bold text-ink">{{ format(it.value) }}</span>
      </span>
    </li>
  </ul>
</template>
