import { computed, ref, watch, type Ref } from 'vue'

export type SortDir = 'asc' | 'desc'
export interface SortState<K extends string = string> {
  key: K
  dir: SortDir
}

/** 並び替え（クリックで昇順→降順を切り替え） */
export function useSort<T, K extends string>(
  items: Ref<readonly T[]>,
  initial: SortState<NoInfer<K>>,
  getters: Record<K, (row: T) => string | number | null>,
) {
  const sort = ref(initial) as Ref<SortState<K>>

  function toggle(key: K) {
    if (sort.value.key === key) sort.value = { key, dir: sort.value.dir === 'asc' ? 'desc' : 'asc' }
    else sort.value = { key, dir: 'asc' }
  }

  const sorted = computed(() => {
    const get = getters[sort.value.key]
    const dir = sort.value.dir === 'asc' ? 1 : -1
    return [...items.value].sort((a, b) => {
      const va = get(a)
      const vb = get(b)
      if (va === vb) return 0
      if (va === null) return 1
      if (vb === null) return -1
      return (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'ja')) * dir
    })
  })

  return { sort, toggle, sorted }
}

/** ページ送り */
export function usePagination<T>(items: Ref<readonly T[]>, initialSize = 20) {
  const page = ref(1)
  const pageSize = ref(initialSize)
  const total = computed(() => items.value.length)
  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
  const paged = computed(() => items.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
  const rangeFrom = computed(() => (total.value === 0 ? 0 : (page.value - 1) * pageSize.value + 1))
  const rangeTo = computed(() => Math.min(total.value, page.value * pageSize.value))

  watch([total, pageSize], () => {
    if (page.value > pageCount.value) page.value = pageCount.value
  })

  return { page, pageSize, total, pageCount, paged, rangeFrom, rangeTo }
}
