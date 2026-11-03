<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from '@lucide/vue'

const props = defineProps<{ page: number; pageCount: number }>()
const emit = defineEmits<{ 'update:page': [number] }>()

/** 1 2 3 4 5 … 14 のような番号リスト */
const pages = computed<(number | '…')[]>(() => {
  const n = props.pageCount
  const p = props.page
  if (n <= 7) return Array.from({ length: n }, (_, i) => i + 1)
  const set = new Set<number>([1, n, p - 1, p, p + 1])
  if (p <= 4) [2, 3, 4, 5].forEach((x) => set.add(x))
  if (p >= n - 3) [n - 4, n - 3, n - 2, n - 1].forEach((x) => set.add(x))
  const list = [...set].filter((x) => x >= 1 && x <= n).sort((a, b) => a - b)
  const out: (number | '…')[] = []
  list.forEach((x, i) => {
    if (i > 0 && x - list[i - 1]! > 1) out.push('…')
    out.push(x)
  })
  return out
})

function go(p: number) {
  emit('update:page', Math.min(Math.max(1, p), props.pageCount))
}
</script>

<template>
  <nav class="flex items-center gap-1" aria-label="ページ送り">
    <button class="pg" :disabled="page <= 1" aria-label="最初のページ" @click="go(1)"><ChevronsLeft class="size-4" /></button>
    <button class="pg" :disabled="page <= 1" aria-label="前のページ" @click="go(page - 1)"><ChevronLeft class="size-4" /></button>
    <template v-for="(x, i) in pages" :key="i">
      <span v-if="x === '…'" class="px-1 text-ink-3">…</span>
      <button v-else class="pg" :class="x === page ? 'is-current' : ''" :aria-current="x === page ? 'page' : undefined" @click="go(x)">
        {{ x }}
      </button>
    </template>
    <button class="pg" :disabled="page >= pageCount" aria-label="次のページ" @click="go(page + 1)"><ChevronRight class="size-4" /></button>
    <button class="pg" :disabled="page >= pageCount" aria-label="最後のページ" @click="go(pageCount)"><ChevronsRight class="size-4" /></button>
  </nav>
</template>

<style scoped>
.pg {
  display: inline-flex;
  min-width: 2rem;
  height: 2rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.4rem;
  border: 1px solid var(--color-line);
  background: #fff;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-ink-2);
  font-variant-numeric: tabular-nums;
}
.pg:not(:disabled):hover {
  background: var(--color-brand-50);
  color: var(--color-brand-700);
}
.pg:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.pg.is-current {
  border-color: transparent;
  color: #fff;
  background: linear-gradient(180deg, #2f82ef 0%, #1a62d3 100%);
}
</style>
