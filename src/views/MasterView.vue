<script setup lang="ts">
import { computed, reactive, ref, type Component } from 'vue'
import { Database, Building2, Wrench, Cog, Truck, Plus, Pencil, CircleCheck, CircleSlash } from '@lucide/vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { CategoryBadge } from '@/components/vehicle/VehicleBadges'
import { useDbStore } from '@/stores/db'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { fiscalYearRange, fiscalYearOf, todayISO } from '@/utils/date'
import { num, yen } from '@/utils/format'
import type { Division, RepairPart, Vendor, VendorKind } from '@/types'

const db = useDbStore()
const auth = useAuthStore()
const ui = useUiStore()
const canManage = computed(() => auth.can('masters.manage'))
const fyFrom = fiscalYearRange(fiscalYearOf(todayISO())).from

type Tab = 'division' | 'vendor' | 'part' | 'type'
const TABS: { key: Tab; label: string; icon: Component }[] = [
  { key: 'division', label: '事業部', icon: Building2 },
  { key: 'vendor', label: '修理業者', icon: Wrench },
  { key: 'part', label: '修理箇所', icon: Cog },
  { key: 'type', label: '車両区分・タイプ', icon: Truck },
]
const tab = ref<Tab>('division')

// ---- 集計（参照件数） ----
const vehiclesByDivision = computed(() => {
  const m = new Map<string, number>()
  for (const v of db.vehicles) m.set(v.divisionId, (m.get(v.divisionId) ?? 0) + 1)
  return m
})
const usersByDivision = computed(() => {
  const m = new Map<string, number>()
  for (const u of db.users) if (u.divisionId && u.status === 'active') m.set(u.divisionId, (m.get(u.divisionId) ?? 0) + 1)
  return m
})
const vendorStats = computed(() => {
  const m = new Map<string, { count: number; amount: number }>()
  for (const r of db.records) {
    if (r.accountingDate < fyFrom) continue
    const e = m.get(r.vendorId) ?? { count: 0, amount: 0 }
    e.count++
    e.amount += r.totalCost
    m.set(r.vendorId, e)
  }
  return m
})
const partCounts = computed(() => {
  const m = new Map<string, number>()
  for (const r of db.records) m.set(r.partId, (m.get(r.partId) ?? 0) + 1)
  return m
})
const typeCounts = computed(() => {
  const m = new Map<string, number>()
  for (const v of db.vehicles) m.set(v.typeId, (m.get(v.typeId) ?? 0) + 1)
  return m
})

// ---- 編集 ----
const VENDOR_KINDS: VendorKind[] = ['自社工場', 'ディーラー', '整備工場', 'タイヤ専門', '架装メーカー', '板金塗装']
const PART_GROUPS: RepairPart['group'][] = ['点検・車検', '車体・機関', '足回り', '電装・空調', '架装', '外装', 'その他']

const divEdit = ref<Division | null>(null)
const vendorEdit = ref<Vendor | null>(null)
const partEdit = ref<RepairPart | null>(null)
const err = reactive({ msg: '' })

function newDivision() {
  const n = db.divisions.length + 1
  divEdit.value = { id: `div${Date.now()}`, code: `D${String(n).padStart(2, '0')}`, name: '', shortName: '', location: '', plateRegion: '', manager: '', phone: '', sortOrder: n, active: true }
}
function newVendor() {
  const n = db.vendors.length + 1
  vendorEdit.value = { id: `W${String(n).padStart(2, '0')}x${Date.now() % 1000}`, name: '', kind: '整備工場', location: '', phone: '', divisionIds: [], makers: [], active: true, sortOrder: n }
}
function newPart() {
  const n = db.parts.length
  partEdit.value = { id: `P${String(n).padStart(2, '0')}x${Date.now() % 1000}`, name: '', group: 'その他', sortOrder: n }
}

function saveDivision() {
  const d = divEdit.value
  if (!d) return
  if (!d.name.trim() || !d.shortName.trim()) return (err.msg = '事業部名と略称は必須です')
  db.upsertDivision({ ...d })
  ui.toast(`事業部「${d.name}」を保存しました`)
  divEdit.value = null
  err.msg = ''
}
function saveVendor() {
  const w = vendorEdit.value
  if (!w) return
  if (!w.name.trim()) return (err.msg = '業者名は必須です')
  db.upsertVendor({ ...w })
  ui.toast(`修理業者「${w.name}」を保存しました`)
  vendorEdit.value = null
  err.msg = ''
}
function savePart() {
  const p = partEdit.value
  if (!p) return
  if (!p.name.trim()) return (err.msg = '修理箇所名は必須です')
  db.upsertPart({ ...p })
  ui.toast(`修理箇所「${p.name}」を保存しました`)
  partEdit.value = null
  err.msg = ''
}
</script>

<template>
  <div>
    <PageHeader title="マスタ管理" :icon="Database" description="事業部・修理業者・修理箇所など、登録画面の選択肢となる&#10;基本データを管理します。" />

    <div class="mb-3 flex flex-wrap gap-2" role="tablist">
      <button
        v-for="t in TABS"
        :key="t.key"
        role="tab"
        :aria-selected="tab === t.key"
        class="flex h-10 items-center gap-2 rounded-xl border px-5 text-[14px] font-bold"
        :class="tab === t.key ? 'border-transparent bg-gradient-to-b from-[#2f82ef] to-[#1a62d3] text-white shadow-[0_4px_12px_rgba(27,99,214,0.35)]' : 'border-line bg-white/80 text-navy-900 hover:bg-white'"
        @click="tab = t.key"
      >
        <component :is="t.icon" class="size-4" />{{ t.label }}
      </button>
      <span v-if="!canManage" class="ml-auto self-center text-[12px] text-ink-2">閲覧専用の権限のため、マスタの変更はできません。</span>
    </div>

    <SectionCard v-if="tab === 'division'" :title="`事業部マスタ（${db.divisions.length}件）`" :icon="Building2" body-class="p-0">
      <template #actions><button v-if="canManage" class="head-chip" @click="newDivision"><Plus class="size-3.5" />追加</button></template>
      <div class="overflow-x-auto">
        <table class="tbl">
          <thead><tr><th>コード</th><th>事業部名</th><th>略称</th><th>所在地</th><th>責任者</th><th>電話番号</th><th class="text-right">保有車両</th><th class="text-right">利用者</th><th>状態</th><th /></tr></thead>
          <tbody>
            <tr v-for="d in db.divisions" :key="d.id">
              <td class="tnum">{{ d.code }}</td>
              <td class="font-bold">{{ d.name }}</td>
              <td>{{ d.shortName }}</td>
              <td>{{ d.location }}</td>
              <td>{{ d.manager }}</td>
              <td class="tnum">{{ d.phone }}</td>
              <td class="tnum text-right">{{ num(vehiclesByDivision.get(d.id) ?? 0) }}台</td>
              <td class="tnum text-right">{{ num(usersByDivision.get(d.id) ?? 0) }}名</td>
              <td><span class="badge" :class="d.active ? 'badge-good' : 'badge-muted'">{{ d.active ? '有効' : '無効' }}</span></td>
              <td><button v-if="canManage" class="btn btn-outline btn-sm" @click="divEdit = { ...d }"><Pencil class="size-3.5" />編集</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </SectionCard>

    <SectionCard v-else-if="tab === 'vendor'" :title="`修理業者マスタ（${db.vendors.length}件）`" :icon="Wrench" body-class="p-0">
      <template #actions><button v-if="canManage" class="head-chip" @click="newVendor"><Plus class="size-3.5" />追加</button></template>
      <div class="overflow-x-auto">
        <table class="tbl">
          <thead><tr><th>業者名</th><th>種別</th><th>所在地</th><th>電話番号</th><th>主な対応事業部</th><th class="text-right">今期件数</th><th class="text-right">今期支払額</th><th>状態</th><th /></tr></thead>
          <tbody>
            <tr v-for="w in db.vendors" :key="w.id">
              <td class="whitespace-nowrap font-bold">{{ w.name }}</td>
              <td><span class="badge badge-info">{{ w.kind }}</span></td>
              <td class="whitespace-nowrap">{{ w.location }}</td>
              <td class="tnum">{{ w.phone }}</td>
              <td class="text-[12px]">{{ w.divisionIds.length ? w.divisionIds.map((id) => db.divisionName(id, true)).join('・') : '全社' }}</td>
              <td class="tnum text-right">{{ num(vendorStats.get(w.id)?.count ?? 0) }}件</td>
              <td class="tnum text-right">{{ yen(vendorStats.get(w.id)?.amount ?? 0) }}</td>
              <td><span class="badge" :class="w.active ? 'badge-good' : 'badge-muted'">{{ w.active ? '有効' : '無効' }}</span></td>
              <td><button v-if="canManage" class="btn btn-outline btn-sm" @click="vendorEdit = { ...w, divisionIds: [...w.divisionIds], makers: [...w.makers] }"><Pencil class="size-3.5" />編集</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </SectionCard>

    <SectionCard v-else-if="tab === 'part'" :title="`修理箇所マスタ（${db.parts.length}件）`" :icon="Cog" body-class="p-0">
      <template #actions><button v-if="canManage" class="head-chip" @click="newPart"><Plus class="size-3.5" />追加</button></template>
      <table class="tbl">
        <thead><tr><th>コード</th><th>修理箇所</th><th>分類</th><th class="text-right">登録件数</th><th /></tr></thead>
        <tbody>
          <tr v-for="p in db.parts" :key="p.id">
            <td class="tnum">{{ p.id.slice(0, 3) }}</td>
            <td class="font-bold">{{ p.name }}</td>
            <td>{{ p.group }}</td>
            <td class="tnum text-right">{{ num(partCounts.get(p.id) ?? 0) }}件</td>
            <td><button v-if="canManage" class="btn btn-outline btn-sm" @click="partEdit = { ...p }"><Pencil class="size-3.5" />編集</button></td>
          </tr>
        </tbody>
      </table>
    </SectionCard>

    <div v-else class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <SectionCard v-for="c in db.categories" :key="c.id" :title="c.name" :icon="Truck" body-class="p-0">
        <template #actions><span class="head-chip">{{ c.description }}</span></template>
        <table class="tbl tbl-compact">
          <thead><tr><th>車両タイプ</th><th>区分</th><th class="text-right">台数</th></tr></thead>
          <tbody>
            <tr v-for="t in db.vehicleTypes.filter((x) => x.categoryId === c.id)" :key="t.id">
              <td class="font-bold">{{ t.name }}</td>
              <td><CategoryBadge :category-id="c.id" /></td>
              <td class="tnum text-right">{{ num(typeCounts.get(t.id) ?? 0) }}台</td>
            </tr>
          </tbody>
        </table>
      </SectionCard>
    </div>

    <!-- 事業部 -->
    <AppModal :open="!!divEdit" title="事業部の編集" width="560px" @close="(divEdit = null), (err.msg = '')">
      <div v-if="divEdit" class="grid grid-cols-[100px_1fr] items-center gap-x-4 gap-y-3">
        <span class="field-label">コード</span><input v-model="divEdit.code" class="input" />
        <span class="field-label req">事業部名</span><input v-model="divEdit.name" class="input" placeholder="例：岡山事業部" />
        <span class="field-label req">略称</span><input v-model="divEdit.shortName" class="input" placeholder="例：岡山" />
        <span class="field-label">所在地</span><input v-model="divEdit.location" class="input" />
        <span class="field-label">責任者</span><input v-model="divEdit.manager" class="input" />
        <span class="field-label">電話番号</span><input v-model="divEdit.phone" class="input" />
        <span class="field-label">表示順</span><input v-model.number="divEdit.sortOrder" type="number" class="input w-28" />
        <span class="field-label">状態</span>
        <label class="flex items-center gap-2 text-[13px]"><input v-model="divEdit.active" type="checkbox" class="check" />有効（選択肢に表示する）</label>
        <p v-if="err.msg" class="field-error col-span-2">{{ err.msg }}</p>
      </div>
      <template #footer>
        <button class="btn btn-soft" @click="divEdit = null">キャンセル</button>
        <button class="btn btn-primary" @click="saveDivision"><CircleCheck class="size-4" />保存</button>
      </template>
    </AppModal>

    <!-- 修理業者 -->
    <AppModal :open="!!vendorEdit" title="修理業者の編集" width="600px" @close="(vendorEdit = null), (err.msg = '')">
      <div v-if="vendorEdit" class="grid grid-cols-[110px_1fr] items-center gap-x-4 gap-y-3">
        <span class="field-label req">業者名</span><input v-model="vendorEdit.name" class="input" />
        <span class="field-label">種別</span>
        <select v-model="vendorEdit.kind" class="input"><option v-for="k in VENDOR_KINDS" :key="k" :value="k">{{ k }}</option></select>
        <span class="field-label">所在地</span><input v-model="vendorEdit.location" class="input" />
        <span class="field-label">電話番号</span><input v-model="vendorEdit.phone" class="input" />
        <span class="field-label self-start pt-1">主な対応事業部</span>
        <div class="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px]">
          <label v-for="d in db.divisions" :key="d.id" class="flex items-center gap-1.5"><input v-model="vendorEdit.divisionIds" type="checkbox" class="check" :value="d.id" />{{ d.shortName }}</label>
          <span class="w-full text-[11.5px] text-ink-3">未選択の場合は「全社」扱いになります</span>
        </div>
        <span class="field-label">状態</span>
        <label class="flex items-center gap-2 text-[13px]"><input v-model="vendorEdit.active" type="checkbox" class="check" />有効<CircleSlash v-if="!vendorEdit.active" class="size-4 text-ink-3" /></label>
        <p v-if="err.msg" class="field-error col-span-2">{{ err.msg }}</p>
      </div>
      <template #footer>
        <button class="btn btn-soft" @click="vendorEdit = null">キャンセル</button>
        <button class="btn btn-primary" @click="saveVendor"><CircleCheck class="size-4" />保存</button>
      </template>
    </AppModal>

    <!-- 修理箇所 -->
    <AppModal :open="!!partEdit" title="修理箇所の編集" width="480px" @close="(partEdit = null), (err.msg = '')">
      <div v-if="partEdit" class="grid grid-cols-[90px_1fr] items-center gap-x-4 gap-y-3">
        <span class="field-label req">修理箇所</span><input v-model="partEdit.name" class="input" />
        <span class="field-label">分類</span>
        <select v-model="partEdit.group" class="input"><option v-for="g in PART_GROUPS" :key="g" :value="g">{{ g }}</option></select>
        <span class="field-label">表示順</span><input v-model.number="partEdit.sortOrder" type="number" class="input w-28" />
        <p v-if="err.msg" class="field-error col-span-2">{{ err.msg }}</p>
      </div>
      <template #footer>
        <button class="btn btn-soft" @click="partEdit = null">キャンセル</button>
        <button class="btn btn-primary" @click="savePart"><CircleCheck class="size-4" />保存</button>
      </template>
    </AppModal>
  </div>
</template>
