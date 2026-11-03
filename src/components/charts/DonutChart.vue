<script setup lang="ts">
import { computed } from 'vue'
import type { ChartConfiguration } from 'chart.js'
import BaseChart from './BaseChart.vue'
import { htmlTooltip } from './setup'
import { pct } from '@/utils/format'

export interface DonutItem {
  label: string
  value: number
  color: string
}

const props = withDefaults(
  defineProps<{
    items: DonutItem[]
    format: (v: number) => string
    centerLabel?: string
    centerValue: string
    centerUnit?: string
    size?: number
    label: string
  }>(),
  { centerLabel: '', centerUnit: '', size: 190 },
)

const total = computed(() => props.items.reduce((s, i) => s + i.value, 0))

const config = computed<ChartConfiguration>(() => ({
  type: 'doughnut',
  data: {
    labels: props.items.map((i) => i.label),
    datasets: [
      {
        data: props.items.map((i) => i.value),
        backgroundColor: props.items.map((i) => i.color),
        hoverBackgroundColor: props.items.map((i) => i.color),
        borderWidth: 0,
        spacing: 2,
        hoverOffset: 6,
      },
    ],
  },
  options: {
    cutout: '62%',
    layout: { padding: 6 },
    plugins: {
      tooltip: {
        enabled: false,
        external: htmlTooltip((i) => {
          const it = props.items[i]
          if (!it) return null
          return {
            title: it.label,
            rows: [{ color: it.color, value: props.format(it.value), label: `構成比 ${pct(total.value ? it.value / total.value : 0)}` }],
          }
        }),
      },
    },
  },
}))
</script>

<template>
  <div class="relative shrink-0" :style="{ width: `${size}px`, height: `${size}px` }">
    <BaseChart :config="config" :height="size" :label="label" />
    <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
      <span v-if="centerLabel" class="text-[12px] font-bold text-ink-2">{{ centerLabel }}</span>
      <span class="font-black leading-none text-navy-900">
        <span :class="centerValue.length > 8 ? 'text-[17px]' : 'text-[34px]'">{{ centerValue }}</span>
        <span v-if="centerUnit" class="ml-0.5 text-[15px]">{{ centerUnit }}</span>
      </span>
    </div>
  </div>
</template>
