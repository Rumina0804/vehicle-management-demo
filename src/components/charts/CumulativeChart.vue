<script setup lang="ts">
import { computed } from 'vue'
import type { ChartConfiguration } from 'chart.js'
import BaseChart from './BaseChart.vue'
import { crosshairPlugin, endLabelsPlugin, htmlTooltip, INK, SERIES, thousandTick } from './setup'
import { kyen } from '@/utils/format'

/** 累計（実績 vs 計画）— 単一の軸で比較 */
const props = withDefaults(
  defineProps<{
    labels: string[]
    actual: (number | null)[]
    plan: (number | null)[]
    height?: number
  }>(),
  { height: 200 },
)

const plugins = [
  crosshairPlugin(),
  endLabelsPlugin(() => [
    { datasetIndex: 0, text: (v) => `実績 ${v.toLocaleString('ja-JP')}` },
    { datasetIndex: 1, text: (v) => `計画 ${v.toLocaleString('ja-JP')}` },
  ]),
]

const lastActual = computed(() => {
  for (let i = props.actual.length - 1; i >= 0; i--) if (props.actual[i] !== null) return i
  return -1
})

const config = computed<ChartConfiguration>(() => ({
  type: 'line',
  data: {
    labels: props.labels,
    datasets: [
      {
        label: '累計（実績）',
        data: props.actual.map((v) => (v === null ? null : Math.round(v / 1000))),
        borderColor: SERIES.blue,
        backgroundColor: SERIES.blue,
        borderWidth: 2,
        tension: 0.25,
        pointRadius: props.actual.map((_, i) => (i === lastActual.value ? 4 : 0)),
        pointHoverRadius: 5,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        borderCapStyle: 'round',
        borderJoinStyle: 'round',
      },
      {
        label: '累計（計画）',
        data: props.plan.map((v) => (v === null ? null : Math.round(v / 1000))),
        borderColor: SERIES.muted,
        backgroundColor: SERIES.muted,
        borderWidth: 2,
        tension: 0.25,
        pointRadius: props.plan.map((_, i) => (i === props.plan.length - 1 ? 4 : 0)),
        pointHoverRadius: 5,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        borderCapStyle: 'round',
      },
    ],
  },
  options: {
    interaction: { mode: 'index', intersect: false },
    layout: { padding: { top: 18, right: 8 } },
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
          const a = props.actual[i]
          const p = props.plan[i]
          const rows = []
          if (a !== null && a !== undefined) rows.push({ color: SERIES.blue, value: `${kyen(a)}千円`, label: '累計（実績）' })
          if (p !== null && p !== undefined) rows.push({ color: SERIES.muted, value: `${kyen(p)}千円`, label: '累計（計画）' })
          if (a && p) rows.push({ color: 'transparent', value: `${((a / p) * 100).toFixed(1)}%`, label: '計画比' })
          return { title: `${props.labels[i]}末時点`, rows }
        }),
      },
    },
  },
}))
</script>

<template>
  <BaseChart :config="config" :plugins="plugins" :height="height" label="修理・整備費の累計（実績と計画）の折れ線グラフ" />
</template>
