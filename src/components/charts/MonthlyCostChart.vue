<script setup lang="ts">
import { computed } from 'vue'
import type { ChartConfiguration } from 'chart.js'
import BaseChart from './BaseChart.vue'
import { htmlTooltip, hoverBandPlugin, INK, SERIES, thousandTick } from './setup'
import { kyen } from '@/utils/format'

/** 月次の修理費（単一系列の棒グラフ・千円） */
const props = withDefaults(
  defineProps<{
    labels: string[]
    values: (number | null)[]
    /** 途中経過の月（当月） */
    partialIndex?: number
    height?: number
  }>(),
  { partialIndex: -1, height: 200 },
)

const plugins = [hoverBandPlugin()]

const config = computed<ChartConfiguration>(() => ({
  type: 'bar',
  data: {
    labels: props.labels,
    datasets: [
      {
        label: '修理費（実績）',
        data: props.values.map((v) => (v === null ? null : Math.round(v / 1000))),
        backgroundColor: props.values.map((_, i) => (i === props.partialIndex ? SERIES.blueSoft : SERIES.blue)),
        hoverBackgroundColor: props.values.map((_, i) => (i === props.partialIndex ? '#9ec5f4' : '#3987e5')),
        borderRadius: { topLeft: 4, topRight: 4 },
        borderSkipped: 'start',
        maxBarThickness: 24,
        categoryPercentage: 0.7,
        barPercentage: 0.9,
      },
    ],
  },
  options: {
    interaction: { mode: 'index', intersect: false },
    layout: { padding: { top: 8, right: 4 } },
    scales: {
      x: { grid: { display: false }, border: { color: INK.axis }, ticks: { color: INK.secondary, font: { size: 11 } } },
      y: {
        beginAtZero: true,
        grid: { color: INK.grid },
        border: { display: false },
        ticks: { color: INK.muted, maxTicksLimit: 6, callback: thousandTick },
      },
    },
    plugins: {
      tooltip: {
        enabled: false,
        external: htmlTooltip((i) => {
          const v = props.values[i]
          if (v === null || v === undefined) return { title: props.labels[i] ?? '', rows: [{ color: INK.axis, value: '—', label: '実績なし' }] }
          return {
            title: `${props.labels[i]}${i === props.partialIndex ? '（途中経過）' : ''}`,
            rows: [{ color: i === props.partialIndex ? SERIES.blueSoft : SERIES.blue, value: `${kyen(v)}千円`, label: '修理・整備費' }],
          }
        }),
      },
    },
  },
}))
</script>

<template>
  <BaseChart :config="config" :plugins="plugins" :height="height" label="月別の修理・整備費の棒グラフ" />
</template>
