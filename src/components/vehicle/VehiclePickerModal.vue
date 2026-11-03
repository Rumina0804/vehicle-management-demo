<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Search, Check } from '@lucide/vue'
import AppModal from '@/components/ui/AppModal.vue'
import VehicleThumb from './VehicleThumb.vue'
import { CategoryBadge } from './VehicleBadges'
import { useDbStore } from '@/stores/db'
import { vehicleName } from '@/mock/catalog'

/** 車両の検索・選択（単一 / 複数） */
const props = withDefaults(
  defineProps<{
    open: boolean
    multiple?: boolean
    selected?: string[]
    /** 選択できる事業部を限定（事業所利用者など） */
    divisionId?: string | null
    title?: string
  }>(),
  { multiple: false, selected: () => [], divisionId: null, title: '車両を選択' },
)
const emit = defineEmits<{ close: []; select: [string[]] }>()

const db = useDbStore()
const q = ref('')
const division = ref('')
const picked = ref<string[]>([])

watch(
  () => props.open,
  (o) => {
    if (o) {
      picked.value = [...props.selected]
      q.value = ''
      division.value = props.divisionId ?? ''
    }
  },
)

const list = computed(() => {
  const s = q.value.trim().toLowerCase()
  return db.vehicles.filter((v) => {
    if (props.divisionId && v.divisionId !== props.divisionId) return false
    if (division.value && v.divisionId !== division.value) return false
    if (!s) return true
    return [v.id, v.plateNumber, v.maker, v.model, v.modelCode, db.divisionName(v.divisionId)].join(' ').toLowerCase().includes(s)
  })
})

function toggle(id: string) {
  if (!props.multiple) {
    emit('select', [id])
    emit('close')
    return
  }
  picked.value = picked.value.includes(id) ? picked.value.filter((x) => x !== id) : [...picked.value, id]
}

function confirm() {
  emit('select', picked.value)
  emit('close')
}
</script>

<template>
  <AppModal :open="open" :title="title" width="820px" @close="emit('close')">
    <div class="mb-3 flex flex-wrap gap-2">
      <label class="relative min-w-[240px] flex-1">
        <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
        <input v-model="q" class="input pl-9" placeholder="管理番号・ナンバー・車種で検索" autofocus />
      </label>
      <select v-model="division" class="input w-48" :disabled="!!divisionId" aria-label="所属事業部">
        <option value="">すべての事業部</option>
        <option v-for="d in db.divisions" :key="d.id" :value="d.id">{{ d.name }}</option>
      </select>
    </div>
    <p class="mb-2 text-[12px] text-ink-3">{{ list.length }}件<template v-if="multiple">／選択中 {{ picked.length }}台</template></p>
    <ul class="max-h-[50vh] divide-y divide-line-soft overflow-y-auto rounded-lg border border-line scroll-thin">
      <li v-for="v in list" :key="v.id">
        <button
          class="flex w-full items-center gap-3 px-3 py-2 text-left text-[13px] hover:bg-brand-50"
          :class="picked.includes(v.id) ? 'bg-brand-50' : ''"
          @click="toggle(v.id)"
        >
          <span v-if="multiple" class="flex size-5 shrink-0 items-center justify-center rounded border" :class="picked.includes(v.id) ? 'border-brand-600 bg-brand-600 text-white' : 'border-[#c8d6ea] bg-white'">
            <Check v-if="picked.includes(v.id)" class="size-3.5" :stroke-width="3" />
          </span>
          <VehicleThumb :vehicle="v" />
          <span class="w-14 shrink-0 font-bold">{{ v.id }}</span>
          <span class="w-36 shrink-0 truncate">{{ v.plateNumber }}</span>
          <span class="min-w-0 flex-1 truncate text-ink-2">{{ vehicleName(v) }}（{{ v.modelCode }}）</span>
          <CategoryBadge :category-id="v.categoryId" />
          <span class="hidden w-24 shrink-0 truncate text-ink-2 sm:block">{{ db.divisionName(v.divisionId, true) }}</span>
        </button>
      </li>
      <li v-if="!list.length" class="px-3 py-8 text-center text-[13px] text-ink-3">該当する車両がありません</li>
    </ul>
    <template v-if="multiple" #footer>
      <button class="btn btn-soft mr-auto" @click="picked = []">選択を解除</button>
      <button class="btn btn-soft" @click="emit('close')">キャンセル</button>
      <button class="btn btn-primary" @click="confirm">{{ picked.length }}台を選択</button>
    </template>
  </AppModal>
</template>
