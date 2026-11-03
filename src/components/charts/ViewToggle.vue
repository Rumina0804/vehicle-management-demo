<script setup lang="ts">
import { ChartColumn, Table2 } from '@lucide/vue'

/** グラフ ⇔ 表 の切り替え（カード見出し用） */
const model = defineModel<'chart' | 'table'>({ default: 'chart' })
</script>

<template>
  <div class="flex overflow-hidden rounded-md bg-white/20 p-0.5" role="group" aria-label="表示形式">
    <button
      class="flex h-6 items-center gap-1 rounded px-2 text-[11px] font-bold"
      :class="model === 'chart' ? 'bg-white text-brand-700' : 'text-white hover:bg-white/15'"
      :aria-pressed="model === 'chart'"
      @click="model = 'chart'"
    >
      <ChartColumn class="size-3.5" />グラフ
    </button>
    <button
      class="flex h-6 items-center gap-1 rounded px-2 text-[11px] font-bold"
      :class="model === 'table' ? 'bg-white text-brand-700' : 'text-white hover:bg-white/15'"
      :aria-pressed="model === 'table'"
      @click="model = 'table'"
    >
      <Table2 class="size-3.5" />表
    </button>
  </div>
</template>
