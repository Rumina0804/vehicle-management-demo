import { defineComponent, h, type PropType } from 'vue'
import { Wrench, ClipboardCheck, CarFront, Settings, Tag } from '@lucide/vue'
import type { MaintenanceRecord } from '@/types'
import { recordKind, recordState, TONE_CLASS } from '@/utils/analytics'

const KIND_ICON = { 修理: Wrench, 点検: ClipboardCheck, 車検: CarFront, 整備: Settings, その他: Tag } as const

/** 区分（修理・整備・点検・車検・その他） */
export const RecordKindBadge = defineComponent({
  name: 'RecordKindBadge',
  props: { record: { type: Object as PropType<Pick<MaintenanceRecord, 'category' | 'workType'>>, required: true } },
  setup(props) {
    return () => {
      const k = recordKind(props.record)
      const icon = KIND_ICON[k.label as keyof typeof KIND_ICON] ?? Tag
      return h('span', { class: ['badge min-w-[64px] justify-center', TONE_CLASS[k.tone]] }, [h(icon, { class: 'size-3.5', 'stroke-width': 2.4 }), k.label])
    }
  },
})

/** 対応状況（車両復帰・完了・修理中・見込） */
export const RecordStateBadge = defineComponent({
  name: 'RecordStateBadge',
  props: { record: { type: Object as PropType<Pick<MaintenanceRecord, 'category' | 'status' | 'returnDate'>>, required: true } },
  setup(props) {
    return () => {
      const s = recordState(props.record)
      return h('span', { class: ['badge min-w-[68px] justify-center', s.tone === 'good' ? 'badge-solid-good' : TONE_CLASS[s.tone]] }, s.label)
    }
  },
})
