import { defineComponent, h, type PropType } from 'vue'
import { CirclePlay, CirclePause, Wrench, Ban, TriangleAlert, Truck, Car, Package, Droplets, Construction } from '@lucide/vue'
import type { CategoryId, VehicleStatus } from '@/types'
import { STATUS_LABELS } from '@/mock/catalog'
import { useDbStore } from '@/stores/db'

/** 使用状況バッジ（色＋アイコン＋文字で表示） */
export const StatusBadge = defineComponent({
  name: 'StatusBadge',
  props: { status: { type: String as PropType<VehicleStatus>, required: true } },
  setup(props) {
    const MAP = {
      active: { cls: 'badge-good', icon: CirclePlay },
      repair: { cls: 'badge-warn', icon: Wrench },
      suspended: { cls: 'badge-muted', icon: CirclePause },
      disposal: { cls: 'badge-bad', icon: Ban },
    } as const
    return () => {
      const m = MAP[props.status]
      return h('span', { class: ['badge', m.cls] }, [h(m.icon, { class: 'size-3.5', 'stroke-width': 2.4 }), STATUS_LABELS[props.status]])
    }
  },
})

const CATEGORY_ICON: Record<CategoryId, typeof Truck> = {
  cargo: Package,
  truck: Truck,
  probester: Droplets,
  special: Construction,
  passenger: Car,
}

/** 車両区分バッジ（区分色のアイコン＋文字） */
export const CategoryBadge = defineComponent({
  name: 'CategoryBadge',
  props: {
    categoryId: { type: String as PropType<CategoryId>, required: true },
    full: { type: Boolean, default: false },
  },
  setup(props) {
    const db = useDbStore()
    return () => {
      const c = db.categoryMap.get(props.categoryId)
      if (!c) return null
      return h(
        'span',
        {
          class: 'badge border',
          style: { background: `${c.color}14`, borderColor: `${c.color}55`, color: 'var(--color-ink)' },
        },
        [h(CATEGORY_ICON[c.id], { class: 'size-3.5', style: { color: c.color }, 'stroke-width': 2.6 }), props.full ? c.name : c.shortName],
      )
    }
  },
})

/** 車検期限までの残日数バッジ */
export const ExpiryBadge = defineComponent({
  name: 'ExpiryBadge',
  props: { days: { type: Number, required: true } },
  setup(props) {
    return () => {
      const d = props.days
      if (d < 0) return h('span', { class: 'badge badge-bad' }, [h(TriangleAlert, { class: 'size-3.5' }), `${-d}日超過`])
      const cls = d <= 30 ? 'badge-bad' : d <= 60 ? 'badge-warn' : 'badge-muted'
      return h('span', { class: ['badge tnum', cls] }, `あと${d}日`)
    }
  },
})
