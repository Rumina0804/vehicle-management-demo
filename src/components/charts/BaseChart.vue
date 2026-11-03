<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { Chart, type ChartConfiguration, type Plugin } from 'chart.js'
import './setup'

/** Chart.js の薄いラッパー（設定が変わったらデータとオプションを差し替えて再描画） */
const props = withDefaults(
  defineProps<{
    config: ChartConfiguration
    plugins?: Plugin[]
    height?: number
    label: string
  }>(),
  { height: 240, plugins: () => [] },
)

const canvas = ref<HTMLCanvasElement | null>(null)
const chart = shallowRef<Chart | null>(null)

onMounted(() => {
  if (!canvas.value) return
  chart.value = new Chart(canvas.value, { ...props.config, plugins: props.plugins })
})

watch(
  () => props.config,
  (cfg) => {
    const c = chart.value
    if (!c) return
    c.data = cfg.data
    if (cfg.options) c.options = cfg.options
    c.update()
  },
)

onBeforeUnmount(() => chart.value?.destroy())
</script>

<template>
  <div class="relative w-full" :style="{ height: `${height}px` }">
    <canvas ref="canvas" role="img" :aria-label="label" />
  </div>
</template>
