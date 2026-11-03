<script setup lang="ts">
import { computed } from 'vue'
import type { ChartConfiguration, ChartDataset } from 'chart.js'
import BaseChart from './BaseChart.vue'
import { calloutPlugin, hoverBandPlugin, htmlTooltip, INK, SERIES, thousandTick, type TipRow } from './setup'
import { kyen, signedPct } from '@/utils/format'

/**
 * 月次推移（分析画面）。すべて同じ単位（千円）・同じ軸。
 * 棒＝当期間の選択指標、灰線＝前期間、橙線＝会社実質負担額（指標が総額のとき）
 */
const props = withDefaults(
  defineProps<{
    labels: string[]
    current: (number | null)[]
    previous: (number | null)[]
    company: (number | null)[] | null
    metricLabel: string
    prevLabel: string
    /** 途中経過の月（当月） */
    partialIndex?: number
    height?: number
  }>(),
  { height: 220, partialIndex: -1 },
)

/** 吹き出しを付ける月（途中経過の月は避け、直近の締まった月） */
const lastIndex = computed(() => {
  for (let i = props.current.length - 1; i >= 0; i--) {
    if (props.current[i] === null || (props.current[i] ?? 0) <= 0) continue
    if (i === props.partialIndex) continue
    return i
  }
  return -1
})

const callout = computed(() => {
  const i = lastIndex.value
  if (i < 0) return null
  const cur = props.current[i] ?? 0
  const prev = props.previous[i] ?? 0
  const diff = prev > 0 ? signedPct(cur / prev - 1) : '—'
  return { index: i, datasetIndex: 0, text: `${props.labels[i]}：${kyen(cur)}千円（前期比 ${diff}）` }
})

const plugins = [hoverBandPlugin(), calloutPlugin(() => callout.value)]

const k = (v: number | null) => (v === null ? null : Math.round(v / 1000))

const config = computed<ChartConfiguration>(() => {
  const datasets: ChartDataset[] = [
    {
      type: 'bar',
      label: props.metricLabel,
      data: props.current.map(k),
      backgroundColor: SERIES.blue,
      hoverBackgroundColor: '#3987e5',
      borderRadius: { topLeft: 4, topRight: 4 },
      borderSkipped: 'start',
      maxBarThickness: 24,
      categoryPercentage: 0.7,
      barPercentage: 0.9,
      order: 3,
    },
    {
      type: 'line',
      label: props.prevLabel,
      data: props.previous.map(k),
      borderColor: SERIES.muted,
      backgroundColor: SERIES.muted,
      borderWidth: 2,
      tension: 0.25,
      pointRadius: 3,
      pointHoverRadius: 5,
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      order: 2,
    },
  ]
  if (props.company) {
    datasets.push({
      type: 'line',
      label: '会社実質負担額',
      data: props.company.map(k),
      borderColor: SERIES.orange,
      backgroundColor: SERIES.orange,
      borderWidth: 2,
      tension: 0.25,
      pointRadius: 4,
      pointHoverRadius: 5,
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      order: 1,
    })
  }
  return {
    type: 'bar',
    data: { labels: props.labels, datasets },
    options: {
      interaction: { mode: 'index', intersect: false },
      layout: { padding: { top: 34, right: 6 } },
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
            const rows: TipRow[] = []
            const cur = props.current[i]
            const prev = props.previous[i]
            rows.push({ color: SERIES.blue, value: cur === null || cur === undefined ? '—' : `${kyen(cur)}千円`, label: props.metricLabel })
            if (props.company) {
              const c = props.company[i]
              rows.push({ color: SERIES.orange, value: c === null || c === undefined ? '—' : `${kyen(c)}千円`, label: '会社実質負担額' })
            }
            rows.push({ color: SERIES.muted, value: prev === null || prev === undefined ? '—' : `${kyen(prev)}千円`, label: props.prevLabel })
            if (cur && prev) rows.push({ color: 'transparent', value: signedPct(cur / prev - 1), label: '前期比' })
            return { title: props.labels[i] ?? '', rows }
          }),
        },
      },
    },
  }
})
</script>

<template>
  <BaseChart :config="config" :plugins="plugins" :height="height" label="月次推移（当期間の棒グラフと前期間・会社負担の折れ線）" />
</template>
