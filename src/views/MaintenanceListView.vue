<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ClipboardList, Search, RotateCcw, Plus, Download, Wrench, Coins, Building2, CircleCheck, CarFront, Trash2, ListChecks } from '@lucide/vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import AppModal from '@/components/ui/AppModal.vue'
import PaginationBar from '@/components/ui/PaginationBar.vue'
import SortTh from '@/components/ui/SortTh.vue'
import { RecordKindBadge, RecordStateBadge } from '@/components/vehicle/RecordBadges'
import { useDbStore } from '@/stores/db'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { usePagination, useSort } from '@/composables/useTable'
import { addMonths, fmtDate, fmtDateTime, todayISO } from '@/utils/date'
import { num, yen } from '@/utils/format'
import { downloadCsv, stamp } from '@/utils/csv'
import { recordKind, recordState, sumOf } from '@/utils/analytics'
import { COST_CATEGORY_LABELS, INSURANCE_LABELS, vehicleName } from '@/mock/catalog'
import type { MaintenanceRecord } from '@/types'

const db = useDbStore()
const auth = useAuthStore()
const ui = useUiStore()
const route = useRoute()
const today = todayISO()

const empty = () => ({
  from: addMonths(today, -6),
  to: today,
  division: typeof route.query.division === 'string' ? route.query.division : (auth.scopeDivisionId ?? ''),
  category: '',
  state: typeof route.query.state === 'string' ? route.query.state : '',
  vendor: '',
  q: '',
})
const form = reactive(empty())
const applied = ref({ ...form })
if (applied.value.state === 'open') {
  applied.value.from = ''
  form.from = ''
}
function search() {
  applied.value = { ...form }
  page.value = 1
}
function clear() {
  Object.assign(form, { ...empty(), state: '', division: auth.scopeDivisionId ?? '' })
  search()
}

const filtered = computed(() => {
  const f = applied.value
  const q = f.q.trim().toLowerCase()
  return db.records.filter((r) => {
    if (f.from && r.date < f.from) return false
    if (f.to && r.date > f.to) return false
    if (f.division && r.divisionId !== f.division) return false
    if (f.category && r.category !== f.category) return false
    if (f.vendor && r.vendorId !== f.vendor) return false
    if (f.state === 'open' && r.returnDate !== null) return false
    if (f.state === 'estimate' && r.status !== 'estimate') return false
    if (q) {
      const v = db.vehicleMap.get(r.vehicleId)
      if (!`${r.vehicleId} ${v?.plateNumber} ${r.workType} ${r.description}`.toLowerCase().includes(q)) return false
    }
    return true
  })
})

const { sort, toggle, sorted } = useSort(filtered, { key: 'date', dir: 'desc' }, {
  date: (r) => `${r.date}${r.createdAt}`,
  vehicle: (r) => r.vehicleId,
  kind: (r) => recordKind(r).label,
  vendor: (r) => db.vendorMap.get(r.vendorId)?.sortOrder ?? 99,
  total: (r) => r.totalCost,
  company: (r) => r.companyCost,
})
const { page, pageCount, paged, total, rangeFrom, rangeTo } = usePagination(sorted, 20)

const sumTotal = computed(() => sumOf(filtered.value, 'total'))
const sumCompany = computed(() => sumOf(filtered.value, 'company'))

function exportCsv() {
  downloadCsv(
    `修理・整備履歴_${stamp()}.csv`,
    ['登録番号', '実施日', '費用計上日', '車両管理番号', '車両ナンバー', '所属事業部', '区分', '種別', '修理箇所', '内容', '修理業者', '走行距離', '修理・整備総額', '会社負担額', '保険負担額', 'その他負担額', '保険処理状況', '見込/確定', '状況', '備考'],
    sorted.value.map((r) => [
      r.id,
      r.date,
      r.accountingDate,
      r.vehicleId,
      db.vehicleMap.get(r.vehicleId)?.plateNumber,
      db.divisionName(r.divisionId),
      COST_CATEGORY_LABELS[r.category],
      r.workType,
      db.partMap.get(r.partId)?.name,
      r.description,
      db.vendorMap.get(r.vendorId)?.name,
      r.mileage,
      r.totalCost,
      r.companyCost,
      r.insuranceCost,
      r.otherCost,
      INSURANCE_LABELS[r.insuranceStatus],
      r.status === 'estimate' ? '見込' : '確定',
      recordState(r).label,
      r.note,
    ]),
  )
  ui.toast(`${sorted.value.length}件をCSVに出力しました`)
}

// ---- 詳細 ----
const selected = ref<MaintenanceRecord | null>(null)
const canEditSel = computed(() => !!selected.value && auth.canEditDivision(selected.value.divisionId))

function confirmEstimate() {
  if (!selected.value) return
  db.updateRecord(selected.value.id, { status: 'confirmed' })
  ui.toast('確定に変更しました')
}
function markReturned() {
  if (!selected.value) return
  db.updateRecord(selected.value.id, { returnDate: today })
  ui.toast(`${selected.value.vehicleId} を車両復帰にしました`)
}
async function remove() {
  const r = selected.value
  if (!r) return
  const ok = await ui.confirm({ title: '履歴の削除', message: `${r.id}（${r.vehicleId}・${r.workType}）を削除します。よろしいですか？`, confirmText: '削除する', tone: 'danger' })
  if (!ok) return
  db.deleteRecord(r.id)
  selected.value = null
  ui.toast('履歴を削除しました')
}
</script>

<template>
  <div>
    <PageHeader title="修理・整備履歴一覧" :icon="ClipboardList" description="登録された修理・整備・車検の履歴を検索・確認できます。&#10;見込の確定や車両復帰の登録もこの画面から行えます。">
      <template #actions>
        <RouterLink v-if="auth.can('data.edit')" to="/maintenance/new" class="btn btn-primary btn-lg"><Plus class="size-5" />新規登録</RouterLink>
      </template>
    </PageHeader>

    <form class="card mb-4 grid grid-cols-2 items-end gap-x-4 gap-y-3 px-4 py-3 md:grid-cols-4 xl:grid-cols-[auto_1fr_1fr_1fr_1fr_1.3fr_auto]" @submit.prevent="search">
      <div class="col-span-2 md:col-span-2 xl:col-span-1">
        <span class="field-label mb-1">実施日</span>
        <span class="flex items-center gap-1.5">
          <input v-model="form.from" type="date" class="input w-[150px]" aria-label="実施日（から）" />
          <span class="text-ink-3">〜</span>
          <input v-model="form.to" type="date" class="input w-[150px]" aria-label="実施日（まで）" />
        </span>
      </div>
      <label>
        <span class="field-label mb-1">所属事業部</span>
        <select v-model="form.division" class="input">
          <option value="">すべて</option>
          <option v-for="d in db.divisions" :key="d.id" :value="d.id">{{ d.shortName }}</option>
        </select>
      </label>
      <label>
        <span class="field-label mb-1">費用区分</span>
        <select v-model="form.category" class="input">
          <option value="">すべて</option>
          <option v-for="(l, k) in COST_CATEGORY_LABELS" :key="k" :value="k">{{ l }}</option>
        </select>
      </label>
      <label>
        <span class="field-label mb-1">状況</span>
        <select v-model="form.state" class="input">
          <option value="">すべて</option>
          <option value="open">修理中（未復帰）</option>
          <option value="estimate">見込のみ</option>
        </select>
      </label>
      <label>
        <span class="field-label mb-1">修理業者</span>
        <select v-model="form.vendor" class="input">
          <option value="">すべて</option>
          <option v-for="w in db.vendors" :key="w.id" :value="w.id">{{ w.name }}</option>
        </select>
      </label>
      <label>
        <span class="field-label mb-1">キーワード</span>
        <input v-model="form.q" class="input" placeholder="車両番号・ナンバー・内容" />
      </label>
      <span class="col-span-2 flex gap-2 md:col-span-1">
        <button type="submit" class="btn btn-primary h-[38px] flex-1"><Search class="size-4" />検索</button>
        <button type="button" class="btn btn-soft h-[38px]" aria-label="条件をクリア" @click="clear"><RotateCcw class="size-4" /></button>
      </span>
    </form>

    <div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div class="card flex items-center gap-3 px-4 py-3"><ListChecks class="size-7 text-brand-600" /><span><span class="block text-[12px] font-bold text-ink-2">件数</span><span class="tnum text-[22px] font-black">{{ num(total) }}件</span></span></div>
      <div class="card flex items-center gap-3 px-4 py-3"><Coins class="size-7 text-brand-600" /><span><span class="block text-[12px] font-bold text-ink-2">修理・整備総額</span><span class="tnum text-[22px] font-black">{{ yen(sumTotal) }}</span></span></div>
      <div class="card flex items-center gap-3 px-4 py-3"><Building2 class="size-7 text-brand-600" /><span><span class="block text-[12px] font-bold text-ink-2">会社実質負担額</span><span class="tnum text-[22px] font-black">{{ yen(sumCompany) }}</span></span></div>
    </div>

    <SectionCard :title="`修理・整備履歴（${num(total)}件）`" :icon="Wrench" body-class="p-0">
      <template #actions>
        <button class="head-chip" @click="exportCsv"><Download class="size-3.5" />CSV出力</button>
      </template>
      <div class="overflow-x-auto">
        <table class="tbl">
          <thead>
            <tr>
              <SortTh label="実施日" field="date" :sort="sort" @sort="toggle($event as never)" />
              <SortTh label="車両" field="vehicle" :sort="sort" @sort="toggle($event as never)" />
              <th>所属</th>
              <SortTh label="区分" field="kind" :sort="sort" @sort="toggle($event as never)" />
              <th>種別・内容</th>
              <SortTh label="修理業者" field="vendor" :sort="sort" @sort="toggle($event as never)" />
              <SortTh label="総額" field="total" :sort="sort" align="right" @sort="toggle($event as never)" />
              <SortTh label="会社負担" field="company" :sort="sort" align="right" @sort="toggle($event as never)" />
              <th>状況</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in paged" :key="r.id" class="cursor-pointer" @click="selected = r">
              <td class="tnum whitespace-nowrap">{{ fmtDate(r.date) }}</td>
              <td class="whitespace-nowrap"><span class="font-bold">{{ r.vehicleId }}</span><span class="ml-1.5 text-[12px] text-ink-2">{{ db.vehicleMap.get(r.vehicleId)?.plateNumber }}</span></td>
              <td class="whitespace-nowrap">{{ db.divisionName(r.divisionId, true) }}</td>
              <td><RecordKindBadge :record="r" /></td>
              <td class="min-w-[260px]"><span class="font-bold">{{ r.workType }}</span><span class="block truncate text-[12px] text-ink-2">{{ r.description }}</span></td>
              <td class="whitespace-nowrap">{{ db.vendorMap.get(r.vendorId)?.name }}</td>
              <td class="tnum text-right">{{ yen(r.totalCost) }}</td>
              <td class="tnum text-right">{{ yen(r.companyCost) }}</td>
              <td><RecordStateBadge :record="r" /></td>
            </tr>
            <tr v-if="!paged.length"><td colspan="9" class="py-12 text-center text-ink-3">条件に一致する履歴はありません</td></tr>
          </tbody>
        </table>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-4 py-2.5">
        <span class="tnum text-[12.5px] text-ink-2">{{ num(rangeFrom) }} - {{ num(rangeTo) }}件 ／ 全{{ num(total) }}件</span>
        <PaginationBar v-model:page="page" :page-count="pageCount" />
      </div>
    </SectionCard>

    <AppModal :open="!!selected" :title="`修理・整備履歴の詳細（${selected?.id}）`" width="760px" @close="selected = null">
      <table v-if="selected" class="tbl">
        <tbody>
          <tr><th class="w-36">対象車両</th><td><RouterLink :to="{ name: 'vehicle-detail', params: { id: selected.vehicleId } }" class="link">{{ selected.vehicleId }}</RouterLink>　{{ db.vehicleMap.get(selected.vehicleId)?.plateNumber }}（{{ db.vehicleMap.get(selected.vehicleId) && vehicleName(db.vehicleMap.get(selected.vehicleId)!) }}）</td></tr>
          <tr><th>実施日／計上日</th><td>{{ fmtDate(selected.date) }}／{{ fmtDate(selected.accountingDate) }}</td></tr>
          <tr><th>区分・種別</th><td class="flex items-center gap-2"><RecordKindBadge :record="selected" />{{ selected.workType }}（{{ db.partMap.get(selected.partId)?.name }}）</td></tr>
          <tr><th>内容</th><td>{{ selected.description }}</td></tr>
          <tr><th>修理業者</th><td>{{ db.vendorMap.get(selected.vendorId)?.name }}</td></tr>
          <tr><th>費用</th><td class="tnum">総額 <b>{{ yen(selected.totalCost) }}</b>／会社 {{ yen(selected.companyCost) }}／保険 {{ yen(selected.insuranceCost) }}／その他 {{ yen(selected.otherCost) }}</td></tr>
          <tr><th>保険処理状況</th><td>{{ INSURANCE_LABELS[selected.insuranceStatus] }}</td></tr>
          <tr><th>状況</th><td class="flex items-center gap-2"><RecordStateBadge :record="selected" />{{ selected.status === 'estimate' ? '（金額は見込）' : '' }}<span v-if="selected.returnDate" class="text-ink-2">復帰日 {{ fmtDate(selected.returnDate) }}</span></td></tr>
          <tr><th>走行距離</th><td class="tnum">{{ selected.mileage === null ? '—' : `${num(selected.mileage)} km` }}</td></tr>
          <tr><th>備考</th><td>{{ selected.note || '—' }}</td></tr>
          <tr v-if="selected.photos.length"><th>写真</th><td><span class="flex flex-wrap gap-2"><img v-for="(p, i) in selected.photos" :key="i" :src="p" alt="" class="size-20 rounded-md object-cover" /></span></td></tr>
          <tr><th>登録</th><td class="text-ink-2">{{ fmtDateTime(selected.createdAt) }}／{{ selected.createdBy }}</td></tr>
        </tbody>
      </table>
      <template #footer>
        <button v-if="canEditSel" class="btn btn-danger-outline mr-auto" @click="remove"><Trash2 class="size-4" />削除</button>
        <button v-if="canEditSel && selected?.returnDate === null" class="btn btn-good-outline" @click="markReturned"><CarFront class="size-4" />車両復帰にする</button>
        <button v-if="canEditSel && selected?.status === 'estimate'" class="btn btn-outline" @click="confirmEstimate"><CircleCheck class="size-4" />確定にする</button>
        <button class="btn btn-soft" @click="selected = null">閉じる</button>
      </template>
    </AppModal>
  </div>
</template>
