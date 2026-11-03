<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ChartColumnBig,
  Funnel,
  Info,
  Check,
  Search,
  RotateCcw,
  CalendarDays,
  ChevronsRight,
  Coins,
  TrendingUp,
  ChartSpline,
  ChartBar,
  ChartPie,
  Trophy,
  Scale,
  Wrench,
  Building2,
  Truck,
  ChevronRight,
  Download,
  X,
} from '@lucide/vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import AppModal from '@/components/ui/AppModal.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import TrendChart from '@/components/charts/TrendChart.vue'
import HBarList from '@/components/charts/HBarList.vue'
import ViewToggle from '@/components/charts/ViewToggle.vue'
import VehiclePickerModal from '@/components/vehicle/VehiclePickerModal.vue'
import { SERIES } from '@/components/charts/setup'
import { useDbStore } from '@/stores/db'
import { useAuthStore } from '@/stores/auth'
import {
  addMonths,
  addYears,
  calendarMonths,
  fiscalMonths,
  fiscalYearLabel,
  fiscalYearOf,
  fiscalYearRange,
  fmtDate,
  minDate,
  monthLabel,
  monthsBetween,
  todayISO,
} from '@/utils/date'
import { amount, METRIC_LABELS, monthlyTotals, sumOf, type Metric } from '@/utils/analytics'
import { kyen, pct, signedPct, signedYen, yen } from '@/utils/format'
import { downloadCsv, stamp } from '@/utils/csv'
import { COST_CATEGORY_LABELS, vehicleName } from '@/mock/catalog'
import type { CostCategory, MaintenanceRecord } from '@/types'

const db = useDbStore()
const auth = useAuthStore()
const router = useRouter()
const today = todayISO()
const currentFy = fiscalYearOf(today)

// ---- 分析条件（入力中の条件 → 「集計・表示」で反映） ----
interface Criteria {
  scope: 'all' | 'division'
  divisionId: string
  periodType: 'fiscal' | 'calendar' | 'custom'
  fy: number
  year: number
  from: string
  to: string
  metric: Metric
  categoryId: string
  vehicleIds: string[]
  vendorId: string
  costCategory: CostCategory | ''
}

const initial = (): Criteria => ({
  scope: auth.scopeDivisionId ? 'division' : 'all',
  divisionId: auth.scopeDivisionId ?? db.activeDivisions[0]?.id ?? '',
  periodType: 'fiscal',
  fy: currentFy,
  year: Number(today.slice(0, 4)),
  from: `${today.slice(0, 7)}-01`.replace(/^(\d{4})/, (y) => String(Number(y) - 1)),
  to: today,
  metric: 'total',
  categoryId: '',
  vehicleIds: [],
  vendorId: '',
  costCategory: '',
})

const form = reactive<Criteria>(initial())
const applied = ref<Criteria>(structuredClone(initial()))
const dirty = computed(() => JSON.stringify(form) !== JSON.stringify(applied.value))

function apply() {
  applied.value = structuredClone({ ...form, vehicleIds: [...form.vehicleIds] })
}
function clear() {
  Object.assign(form, initial())
  apply()
}

const fyOptions = [currentFy, currentFy - 1, currentFy - 2]
const yearOptions = [Number(today.slice(0, 4)), Number(today.slice(0, 4)) - 1, Number(today.slice(0, 4)) - 2]
const pickerOpen = ref(false)

// ---- 期間の解決 ----
const period = computed(() => {
  const c = applied.value
  let from: string
  let to: string
  let months: string[]
  let label: string
  if (c.periodType === 'fiscal') {
    const r = fiscalYearRange(c.fy)
    from = r.from
    to = r.to
    months = fiscalMonths(c.fy)
    label = `${c.fy}年度`
  } else if (c.periodType === 'calendar') {
    from = `${c.year}-01-01`
    to = `${c.year}-12-31`
    months = calendarMonths(c.year)
    label = `${c.year}年`
  } else {
    from = c.from <= c.to ? c.from : c.to
    to = c.from <= c.to ? c.to : c.from
    months = monthsBetween(from, to)
    label = `${fmtDate(from)}〜${fmtDate(to)}`
  }
  const partial = to > today
  const effTo = minDate(to, today)
  // 途中経過の期間は「前年の同じ期間」と比較
  const prevFrom = addYears(from, -1)
  const prevTo = addYears(effTo, -1)
  const prevLabel =
    c.periodType === 'fiscal' ? `${c.fy - 1}年度${partial ? '・同期間' : ''}` : c.periodType === 'calendar' ? `${c.year - 1}年${partial ? '・同期間' : ''}` : '前年同期間'
  return { from, to: effTo, months, label: partial ? `${label}・${fmtDate(effTo)}まで` : label, shortLabel: label, partial, prevFrom, prevTo, prevLabel }
})

// ---- フィルタ ----
function matches(r: MaintenanceRecord): boolean {
  const c = applied.value
  if (c.scope === 'division' && r.divisionId !== c.divisionId) return false
  if (c.vehicleIds.length && !c.vehicleIds.includes(r.vehicleId)) return false
  if (c.vendorId && r.vendorId !== c.vendorId) return false
  if (c.costCategory && r.category !== c.costCategory) return false
  if (c.categoryId && db.vehicleMap.get(r.vehicleId)?.categoryId !== c.categoryId) return false
  return true
}

const current = computed(() => db.records.filter((r) => r.accountingDate >= period.value.from && r.accountingDate <= period.value.to && matches(r)))
const previous = computed(() => db.records.filter((r) => r.accountingDate >= period.value.prevFrom && r.accountingDate <= period.value.prevTo && matches(r)))
/** グラフ用：前期間は月ごとに比較できるよう期間全体を集計 */
const previousFull = computed(() => {
  const from = addYears(period.value.from, -1)
  const to = addYears(applied.value.periodType === 'custom' ? period.value.to : period.value.months.length ? `${period.value.months.at(-1)}-31` : period.value.to, -1)
  return db.records.filter((r) => r.accountingDate >= from && r.accountingDate <= to && matches(r))
})

const metric = computed(() => applied.value.metric)
const metricLabel = computed(() => METRIC_LABELS[metric.value])
const curTotal = computed(() => sumOf(current.value, metric.value))
const prevTotal = computed(() => sumOf(previous.value, metric.value))
const diff = computed(() => curTotal.value - prevTotal.value)
const rate = computed(() => (prevTotal.value > 0 ? curTotal.value / prevTotal.value - 1 : null))

// ---- 月次推移 ----
const trendView = ref<'chart' | 'table'>('chart')
const monthLabels = computed(() =>
  period.value.months.map((m, i, arr) => (applied.value.periodType === 'custom' && arr.length > 12 ? `${m.slice(2, 4)}/${m.slice(5)}` : i === 0 || m.endsWith('-01') ? `${monthLabel(m)}` : monthLabel(m))),
)
const futureMask = computed(() => period.value.months.map((m) => m > today.slice(0, 7)))
const trendCurrent = computed(() =>
  monthlyTotals(current.value, period.value.months, metric.value).map((v, i) => (futureMask.value[i] ? null : v)),
)
const trendCompany = computed(() =>
  metric.value === 'total' ? monthlyTotals(current.value, period.value.months, 'company').map((v, i) => (futureMask.value[i] ? null : v)) : null,
)
const trendPrev = computed(() =>
  monthlyTotals(
    previousFull.value,
    period.value.months.map((m) => addMonths(`${m}-01`, -12).slice(0, 7)),
    metric.value,
  ),
)

// ---- 事業部別 ----
const byDivision = computed(() =>
  db.divisions
    .map((d) => ({
      key: d.id,
      label: d.name,
      value: sumOf(current.value.filter((r) => r.divisionId === d.id), metric.value),
    }))
    .filter((x) => applied.value.scope === 'all' || x.key === applied.value.divisionId)
    .sort((a, b) => b.value - a.value),
)

// ---- 車両区分別 ----
const byCategory = computed(() =>
  db.categories.map((c) => ({
    id: c.id,
    label: c.name,
    color: c.color,
    value: sumOf(current.value.filter((r) => db.vehicleMap.get(r.vehicleId)?.categoryId === c.id), metric.value),
  })),
)

// ---- 車両別 ----
function rankVehicles() {
  const map = new Map<string, { total: number; company: number; prev: number }>()
  for (const r of current.value) {
    const e = map.get(r.vehicleId) ?? { total: 0, company: 0, prev: 0 }
    e.total += r.totalCost
    e.company += r.companyCost
    map.set(r.vehicleId, e)
  }
  for (const r of previous.value) {
    const e = map.get(r.vehicleId)
    if (e) e.prev += amount(r, metric.value)
  }
  return [...map.entries()]
    .map(([id, e]) => ({ id, vehicle: db.vehicleMap.get(id)!, ...e, value: metric.value === 'total' ? e.total : e.company }))
    .filter((x) => x.vehicle)
    .sort((a, b) => b.value - a.value)
}
const vehicleRanking = computed(rankVehicles)

// ---- 業者別 ----
const vendorRanking = computed(() => {
  const map = new Map<string, { total: number; company: number; prev: number }>()
  for (const r of current.value) {
    const e = map.get(r.vendorId) ?? { total: 0, company: 0, prev: 0 }
    e.total += r.totalCost
    e.company += r.companyCost
    map.set(r.vendorId, e)
  }
  for (const r of previous.value) {
    const e = map.get(r.vendorId)
    if (e) e.prev += amount(r, metric.value)
  }
  const all = [...map.values()].reduce((s, e) => s + (metric.value === 'total' ? e.total : e.company), 0)
  return [...map.entries()]
    .map(([id, e]) => {
      const value = metric.value === 'total' ? e.total : e.company
      return { id, name: db.vendorMap.get(id)?.name ?? id, ...e, value, share: all ? value / all : 0 }
    })
    .sort((a, b) => b.value - a.value)
})

const totalAll = computed(() => sumOf(current.value, 'total'))
const companyAll = computed(() => sumOf(current.value, 'company'))
const burdenRate = computed(() => (totalAll.value ? companyAll.value / totalAll.value : null))
const insuranceAll = computed(() => current.value.reduce((s, r) => s + r.insuranceCost, 0))
const otherAll = computed(() => current.value.reduce((s, r) => s + r.otherCost, 0))

const vehicleDesc = (id: string) => {
  const v = db.vehicleMap.get(id)
  return v ? `${v.plateNumber}（${db.categoryMap.get(v.categoryId)?.shortName}）` : id
}
const prevRate = (cur: number, prev: number) => (prev > 0 ? cur / prev - 1 : null)

// ---- 一覧モーダル・CSV ----
const listModal = ref<'' | 'vehicles' | 'vendors'>('')

function exportVehicles() {
  downloadCsv(
    `車両別修理費ランキング_${stamp()}.csv`,
    ['順位', '車両番号', '車両ナンバー', '車種', '所属事業部', '修理・整備総額', '会社実質負担額', '会社負担率', '前期間比'],
    vehicleRanking.value.map((x, i) => [
      i + 1,
      x.id,
      x.vehicle.plateNumber,
      vehicleName(x.vehicle),
      db.divisionName(x.vehicle.divisionId),
      x.total,
      x.company,
      x.total ? ((x.company / x.total) * 100).toFixed(1) + '%' : '',
      signedPct(prevRate(x.value, x.prev)),
    ]),
  )
}
function exportVendors() {
  downloadCsv(
    `業者別支払金額_${stamp()}.csv`,
    ['順位', '修理業者', '支払金額（修理・整備総額）', '構成比', '会社実質負担額', '会社負担率', '前期間比'],
    vendorRanking.value.map((x, i) => [
      i + 1,
      x.name,
      x.total,
      (x.share * 100).toFixed(1) + '%',
      x.company,
      x.total ? ((x.company / x.total) * 100).toFixed(1) + '%' : '',
      signedPct(prevRate(x.value, x.prev)),
    ]),
  )
}

const scopeLabel = computed(() => (applied.value.scope === 'all' ? '全社' : db.divisionName(applied.value.divisionId, true)))
const activeFilters = computed(() => {
  const c = applied.value
  const list: string[] = []
  if (c.categoryId) list.push(db.categoryMap.get(c.categoryId as never)?.name ?? '')
  if (c.vehicleIds.length) list.push(`車両 ${c.vehicleIds.length}台`)
  if (c.vendorId) list.push(db.vendorMap.get(c.vendorId)?.name ?? '')
  if (c.costCategory) list.push(COST_CATEGORY_LABELS[c.costCategory])
  return list
})

const RANK_BG = ['bg-[#f6c445] text-navy-950', 'bg-[#c9d1dc] text-navy-950', 'bg-[#e0a46b] text-white']
</script>

<template>
  <div>
    <PageHeader
      title="集計・分析"
      :icon="ChartColumnBig"
      badge="analytics"
      description="修理・整備にかかるコストを可視化し、期間比較で増減や傾向を分析します。&#10;修理実態と会社負担を多角的に比較し、コストの把握・最適化に活用できます。"
    />

    <!-- 分析条件 -->
    <section class="card mb-4 px-4 py-3" aria-label="分析条件">
      <div class="flex flex-wrap items-end gap-x-5 gap-y-3">
        <span class="flex items-center gap-2 self-center text-[15px] font-black text-navy-900"><Funnel class="size-5" />分析条件</span>

        <div>
          <span class="mb-1 flex items-center gap-1 text-[12px] font-bold text-ink-2">表示対象<Info class="size-3.5" title="全社または事業部を選択" /></span>
          <div class="flex items-center gap-2">
            <div class="seg">
              <button :aria-pressed="form.scope === 'all'" :disabled="!!auth.scopeDivisionId" @click="form.scope = 'all'"><Check v-if="form.scope === 'all'" class="size-4" />全社</button>
              <button :aria-pressed="form.scope === 'division'" @click="form.scope = 'division'"><Check v-if="form.scope === 'division'" class="size-4" />各事業部</button>
            </div>
            <select v-if="form.scope === 'division'" v-model="form.divisionId" class="input h-9 w-40" :disabled="!!auth.scopeDivisionId" aria-label="事業部">
              <option v-for="d in db.divisions" :key="d.id" :value="d.id">{{ d.name }}</option>
            </select>
          </div>
        </div>

        <div>
          <span class="mb-1 flex items-center gap-1 text-[12px] font-bold text-ink-2">集計期間<Info class="size-3.5" /></span>
          <div class="flex flex-wrap items-center gap-2">
            <div class="seg">
              <button :aria-pressed="form.periodType === 'fiscal'" @click="form.periodType = 'fiscal'"><Check v-if="form.periodType === 'fiscal'" class="size-4" />決算年度</button>
              <button :aria-pressed="form.periodType === 'calendar'" @click="form.periodType = 'calendar'"><Check v-if="form.periodType === 'calendar'" class="size-4" />暦年</button>
              <button :aria-pressed="form.periodType === 'custom'" @click="form.periodType = 'custom'"><Check v-if="form.periodType === 'custom'" class="size-4" />任意期間</button>
            </div>
            <select v-if="form.periodType === 'fiscal'" v-model.number="form.fy" class="input h-9 w-48" aria-label="決算年度">
              <option v-for="y in fyOptions" :key="y" :value="y">{{ fiscalYearLabel(y) }}{{ y === currentFy ? '・当期' : '' }}</option>
            </select>
            <select v-else-if="form.periodType === 'calendar'" v-model.number="form.year" class="input h-9 w-32" aria-label="年">
              <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}年</option>
            </select>
            <template v-else>
              <input v-model="form.from" type="date" class="input h-9 w-40" aria-label="開始日" />
              <span class="text-ink-3">〜</span>
              <input v-model="form.to" type="date" class="input h-9 w-40" aria-label="終了日" />
            </template>
          </div>
        </div>

        <div>
          <span class="mb-1 flex items-center gap-1 text-[12px] font-bold text-ink-2">費用指標<Info class="size-3.5" /></span>
          <div class="seg">
            <button :aria-pressed="form.metric === 'total'" @click="form.metric = 'total'"><Check v-if="form.metric === 'total'" class="size-4" />修理・整備総額</button>
            <button :aria-pressed="form.metric === 'company'" @click="form.metric = 'company'"><Check v-if="form.metric === 'company'" class="size-4" />会社実質負担額</button>
          </div>
        </div>
      </div>

      <div class="mt-3 flex flex-wrap items-end gap-x-4 gap-y-3 border-t border-line-soft pt-3">
        <label class="w-44">
          <span class="mb-1 block text-[12px] font-bold text-ink-2">車両区分</span>
          <select v-model="form.categoryId" class="input h-9">
            <option value="">すべて</option>
            <option v-for="c in db.categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </label>
        <div class="w-60">
          <span class="mb-1 block text-[12px] font-bold text-ink-2">個別車両</span>
          <button class="input flex h-9 items-center gap-2 text-left" @click="pickerOpen = true">
            <span class="flex-1 truncate" :class="form.vehicleIds.length ? 'text-ink' : 'text-[#97a4ba]'">
              {{ form.vehicleIds.length ? form.vehicleIds.join('、') : '車両を選択（複数選択可）' }}
            </span>
            <X v-if="form.vehicleIds.length" class="size-4 text-ink-3 hover:text-ink" @click.stop="form.vehicleIds = []" />
            <Search v-else class="size-4 text-ink-3" />
          </button>
        </div>
        <label class="w-60">
          <span class="mb-1 block text-[12px] font-bold text-ink-2">修理業者</span>
          <select v-model="form.vendorId" class="input h-9">
            <option value="">すべて</option>
            <option v-for="w in db.vendors" :key="w.id" :value="w.id">{{ w.name }}</option>
          </select>
        </label>
        <label class="w-44">
          <span class="mb-1 block text-[12px] font-bold text-ink-2">修理・整備区分</span>
          <select v-model="form.costCategory" class="input h-9">
            <option value="">すべて</option>
            <option v-for="(l, k) in COST_CATEGORY_LABELS" :key="k" :value="k">{{ l }}</option>
          </select>
        </label>
        <div class="ml-auto flex items-center gap-2">
          <span v-if="dirty" class="text-[12px] font-bold text-[#a35d00]">条件が変更されています →</span>
          <button class="btn btn-primary h-10 px-6 text-[14px]" @click="apply"><Search class="size-4" />集計・表示</button>
          <button class="btn btn-soft h-10" @click="clear"><RotateCcw class="size-4" />条件クリア</button>
        </div>
      </div>
    </section>

    <p class="mb-3 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-2">
      <CalendarDays class="size-4 text-brand-600" />
      集計対象：<b class="text-ink">{{ scopeLabel }}</b>／<b class="text-ink">{{ period.label }}</b>（費用計上日ベース）
      <span v-for="f in activeFilters" :key="f" class="badge badge-info">{{ f }}</span>
      <span class="text-ink-3">／{{ current.length.toLocaleString('ja-JP') }}件の修理・整備を集計</span>
    </p>

    <!-- 上段 -->
    <div class="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2 min-[1800px]:grid-cols-[1fr_1.55fr_1.15fr]">
      <SectionCard title="前期間比較" :sub="`（${metricLabel}）`" :icon="CalendarDays">
        <div class="flex items-stretch gap-2">
          <div class="flex-1 rounded-xl bg-gradient-to-b from-[#eef4fd] to-[#dfeafa] p-3 text-center">
            <p class="text-[13px] font-bold text-ink-2">前期間</p>
            <p class="text-[11px] text-ink-3">（{{ period.prevLabel }}）</p>
            <p class="mt-2 text-[22px] font-black text-navy-900">{{ yen(prevTotal) }}</p>
          </div>
          <ChevronsRight class="size-6 shrink-0 self-center text-brand-400" />
          <div class="flex-1 rounded-xl bg-gradient-to-b from-[#fff2f2] to-[#ffe0e0] p-3 text-center ring-1 ring-[#f5c6c6]">
            <p class="text-[13px] font-bold text-ink-2">当期間</p>
            <p class="text-[11px] text-ink-3">（{{ period.shortLabel }}{{ period.partial ? '・途中' : '' }}）</p>
            <p class="mt-2 text-[22px] font-black text-[#c9262d]">{{ yen(curTotal) }}</p>
          </div>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-2">
          <div class="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
            <Coins class="size-5 text-brand-600" />
            <span class="text-[12px] font-bold text-ink-2">増減額</span>
            <span class="ml-auto text-[16px] font-black" :class="diff > 0 ? 'text-[#c9262d]' : 'text-[#13803f]'">{{ signedYen(diff) }}</span>
          </div>
          <div class="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
            <TrendingUp class="size-5 text-brand-600" />
            <span class="text-[12px] font-bold text-ink-2">増減率</span>
            <span class="ml-auto text-[16px] font-black" :class="(rate ?? 0) > 0 ? 'text-[#c9262d]' : 'text-[#13803f]'">{{ signedPct(rate) }}</span>
          </div>
        </div>
        <p v-if="period.partial" class="mt-2 text-[11px] text-ink-3">※当期は途中経過のため、前期間は前年の同じ期間と比較しています。</p>
      </SectionCard>

      <SectionCard :title="`月次推移（${scopeLabel}）`" :icon="ChartSpline" class="xl:order-3 xl:col-span-2 min-[1800px]:order-none min-[1800px]:col-span-1" body-class="px-4 pb-3 pt-2">
        <template #actions><ViewToggle v-model="trendView" /></template>
        <div class="mb-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-2">
          <span class="text-ink-3">（千円）</span>
          <span class="flex items-center gap-1"><span class="size-2.5 rounded-sm" :style="{ background: SERIES.blue }" />{{ metricLabel }}</span>
          <span v-if="trendCompany" class="flex items-center gap-1"><span class="h-[3px] w-3.5 rounded" :style="{ background: SERIES.orange }" />会社実質負担額</span>
          <span class="flex items-center gap-1"><span class="h-[3px] w-3.5 rounded" :style="{ background: SERIES.muted }" />前期間（{{ metricLabel }}）</span>
        </div>
        <TrendChart
          v-if="trendView === 'chart'"
          :labels="monthLabels"
          :current="trendCurrent"
          :previous="trendPrev"
          :company="trendCompany"
          :metric-label="metricLabel"
          prev-label="前期間"
          :partial-index="period.months.indexOf(today.slice(0, 7))"
          :height="218"
        />
        <div v-else class="max-h-[218px] overflow-y-auto scroll-thin">
          <table class="tbl tbl-compact">
            <thead>
              <tr>
                <th>月</th>
                <th class="text-right">{{ metricLabel }}</th>
                <th v-if="trendCompany" class="text-right">会社実質負担額</th>
                <th class="text-right">前期間</th>
                <th class="text-right">前期比</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(m, i) in period.months" :key="m">
                <td>{{ m.replace('-', '/') }}</td>
                <td class="tnum text-right">{{ trendCurrent[i] === null ? '—' : `${kyen(trendCurrent[i]!)}千円` }}</td>
                <td v-if="trendCompany" class="tnum text-right">{{ trendCompany[i] === null ? '—' : `${kyen(trendCompany[i]!)}千円` }}</td>
                <td class="tnum text-right">{{ kyen(trendPrev[i] ?? 0) }}千円</td>
                <td class="tnum text-right">{{ trendCurrent[i] && trendPrev[i] ? signedPct(trendCurrent[i]! / trendPrev[i]! - 1) : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="事業部別比較" :sub="`（${metricLabel}）`" :icon="ChartBar">
        <HBarList :items="byDivision" :format="yen" label-width="112px" @select="(id) => router.push({ name: 'vehicles', query: { division: id } })" />
      </SectionCard>
    </div>

    <!-- 中段 -->
    <div class="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2 min-[1800px]:grid-cols-[1.25fr_1.25fr_1.15fr]">
      <SectionCard title="車両区分別内訳" :sub="`（${metricLabel}）`" :icon="ChartPie">
        <div class="flex flex-col items-center gap-4 sm:flex-row">
          <DonutChart :items="byCategory" :format="yen" center-label="合計" :center-value="yen(curTotal)" :size="176" label="車両区分別の費用のドーナツグラフ" />
          <ul class="w-full flex-1 space-y-1.5">
            <li v-for="c in byCategory" :key="c.id" class="flex items-center gap-2 text-[12.5px]">
              <span class="size-3 shrink-0 rounded-full" :style="{ background: c.color }" />
              <span class="flex-1 font-bold">{{ c.label }}</span>
              <span class="tnum font-bold">{{ yen(c.value) }}</span>
              <span class="tnum w-14 text-right text-ink-2">（{{ pct(curTotal ? c.value / curTotal : 0) }}）</span>
            </li>
          </ul>
        </div>
      </SectionCard>

      <SectionCard title="車両別 修理・整備総額" sub="（上位5台）" :icon="Trophy">
        <HBarList
          :items="vehicleRanking.slice(0, 5).map((x, i) => ({ key: x.id, label: x.id, hint: x.vehicle.plateNumber, value: x.value, rank: i + 1 }))"
          :format="yen"
          label-width="150px"
          @select="(id) => router.push({ name: 'vehicle-detail', params: { id }, query: { tab: 'records' } })"
        />
        <p v-if="!vehicleRanking.length" class="py-8 text-center text-[13px] text-ink-3">該当するデータがありません</p>
      </SectionCard>

      <SectionCard :title="`修理実態と会社負担の比較（${scopeLabel}・当期間）`" :icon="Scale" class="xl:col-span-2 min-[1800px]:col-span-1">
        <div class="grid grid-cols-[1fr_auto] gap-3">
          <div class="space-y-2">
            <div class="flex items-center gap-3 rounded-lg bg-[#f2f6fd] px-3 py-2.5">
              <Wrench class="size-6 shrink-0 text-brand-600" />
              <span class="text-[12px] font-bold leading-tight">修理実態<br /><span class="text-[10.5px] font-medium text-ink-3">（修理・整備総額）</span></span>
              <span class="tnum ml-auto text-[19px] font-black">{{ yen(totalAll) }}</span>
            </div>
            <div class="flex items-center gap-3 rounded-lg bg-[#f2f6fd] px-3 py-2.5">
              <Building2 class="size-6 shrink-0 text-brand-600" />
              <span class="text-[12px] font-bold leading-tight">会社負担<br /><span class="text-[10.5px] font-medium text-ink-3">（会社実質負担額）</span></span>
              <span class="tnum ml-auto text-[19px] font-black">{{ yen(companyAll) }}</span>
            </div>
          </div>
          <div class="flex w-[124px] flex-col items-center justify-center rounded-xl bg-gradient-to-b from-[#fff8e6] to-[#ffeec2] px-2 text-center">
            <Coins class="size-6 text-[#d08a00]" />
            <span class="mt-1 text-[12px] font-bold text-ink-2">会社負担率</span>
            <span class="text-[30px] font-black italic leading-tight text-brand-700">{{ pct(burdenRate) }}</span>
          </div>
        </div>
        <p class="mt-2 text-[11.5px] text-ink-2">
          保険負担 {{ yen(insuranceAll) }}／その他負担（メーカー保証等） {{ yen(otherAll) }}
        </p>
      </SectionCard>
    </div>

    <!-- 下段：ランキング -->
    <div class="grid grid-cols-1 gap-4 2xl:grid-cols-2">
      <SectionCard title="修理費ランキング" sub="（車両別・当期間）" :icon="Truck" body-class="p-0">
        <template #actions>
          <button class="head-chip" @click="listModal = 'vehicles'">一覧を見る<ChevronRight class="size-3.5" /></button>
        </template>
        <div class="overflow-x-auto">
          <table class="tbl tbl-compact">
            <thead>
              <tr>
                <th>順位</th>
                <th>車両番号</th>
                <th>車両名（車種）</th>
                <th class="text-right">修理・整備総額</th>
                <th class="text-right">会社実質負担額</th>
                <th class="text-right">会社負担率</th>
                <th class="text-right">前期間比</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(x, i) in vehicleRanking.slice(0, 5)" :key="x.id" class="cursor-pointer" @click="router.push({ name: 'vehicle-detail', params: { id: x.id }, query: { tab: 'records' } })">
                <td><span class="flex size-6 items-center justify-center rounded-md text-[12px] font-black" :class="RANK_BG[i] ?? 'bg-[#eef2f7] text-ink-2'">{{ i + 1 }}</span></td>
                <td class="font-bold">{{ x.id }}</td>
                <td class="whitespace-nowrap">{{ vehicleDesc(x.id) }}</td>
                <td class="tnum text-right">{{ yen(x.total) }}</td>
                <td class="tnum text-right">{{ yen(x.company) }}</td>
                <td class="tnum text-right">{{ pct(x.total ? x.company / x.total : null) }}</td>
                <td class="tnum text-right font-bold" :class="(prevRate(x.value, x.prev) ?? 0) > 0 ? 'text-[#c9262d]' : 'text-[#13803f]'">
                  {{ prevRate(x.value, x.prev) === null ? '新規' : `${(prevRate(x.value, x.prev) ?? 0) > 0 ? '▲' : '▼'} ${signedPct(prevRate(x.value, x.prev))}` }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="業者別支払金額" sub="（修理・整備）（当期間）" :icon="Wrench" body-class="p-0">
        <template #actions>
          <button class="head-chip" @click="listModal = 'vendors'">一覧を見る<ChevronRight class="size-3.5" /></button>
        </template>
        <div class="overflow-x-auto">
          <table class="tbl tbl-compact">
            <thead>
              <tr>
                <th>順位</th>
                <th>修理業者</th>
                <th class="text-right">支払金額</th>
                <th class="text-right">構成比</th>
                <th class="text-right">会社実質負担額</th>
                <th class="text-right">会社負担率</th>
                <th class="text-right">前期間比</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(x, i) in vendorRanking.slice(0, 5)" :key="x.id">
                <td><span class="flex size-6 items-center justify-center rounded-md text-[12px] font-black" :class="RANK_BG[i] ?? 'bg-[#eef2f7] text-ink-2'">{{ i + 1 }}</span></td>
                <td class="whitespace-nowrap font-bold">{{ x.name }}</td>
                <td class="tnum text-right">{{ yen(x.total) }}</td>
                <td class="tnum text-right">{{ pct(x.share) }}</td>
                <td class="tnum text-right">{{ yen(x.company) }}</td>
                <td class="tnum text-right">{{ pct(x.total ? x.company / x.total : null) }}</td>
                <td class="tnum text-right font-bold" :class="(prevRate(x.value, x.prev) ?? 0) > 0 ? 'text-[#c9262d]' : 'text-[#13803f]'">
                  {{ prevRate(x.value, x.prev) === null ? '新規' : `${(prevRate(x.value, x.prev) ?? 0) > 0 ? '▲' : '▼'} ${signedPct(prevRate(x.value, x.prev))}` }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>

    <VehiclePickerModal
      :open="pickerOpen"
      multiple
      :selected="form.vehicleIds"
      :division-id="form.scope === 'division' ? form.divisionId : null"
      title="分析する車両を選択"
      @close="pickerOpen = false"
      @select="(ids) => (form.vehicleIds = ids)"
    />

    <AppModal :open="listModal !== ''" :title="listModal === 'vehicles' ? '修理費ランキング（車両別・全件）' : '業者別支払金額（全件）'" width="980px" @close="listModal = ''">
      <div class="overflow-x-auto">
        <table v-if="listModal === 'vehicles'" class="tbl tbl-compact">
          <thead>
            <tr><th>順位</th><th>車両番号</th><th>車両名（車種）</th><th>所属事業部</th><th class="text-right">修理・整備総額</th><th class="text-right">会社実質負担額</th><th class="text-right">会社負担率</th><th class="text-right">前期間比</th></tr>
          </thead>
          <tbody>
            <tr v-for="(x, i) in vehicleRanking" :key="x.id">
              <td class="tnum">{{ i + 1 }}</td>
              <td class="font-bold">{{ x.id }}</td>
              <td class="whitespace-nowrap">{{ vehicleDesc(x.id) }}</td>
              <td>{{ db.divisionName(x.vehicle.divisionId, true) }}</td>
              <td class="tnum text-right">{{ yen(x.total) }}</td>
              <td class="tnum text-right">{{ yen(x.company) }}</td>
              <td class="tnum text-right">{{ pct(x.total ? x.company / x.total : null) }}</td>
              <td class="tnum text-right">{{ prevRate(x.value, x.prev) === null ? '新規' : signedPct(prevRate(x.value, x.prev)) }}</td>
            </tr>
          </tbody>
        </table>
        <table v-else class="tbl tbl-compact">
          <thead>
            <tr><th>順位</th><th>修理業者</th><th>種別</th><th class="text-right">支払金額</th><th class="text-right">構成比</th><th class="text-right">会社実質負担額</th><th class="text-right">会社負担率</th><th class="text-right">前期間比</th></tr>
          </thead>
          <tbody>
            <tr v-for="(x, i) in vendorRanking" :key="x.id">
              <td class="tnum">{{ i + 1 }}</td>
              <td class="font-bold">{{ x.name }}</td>
              <td>{{ db.vendorMap.get(x.id)?.kind }}</td>
              <td class="tnum text-right">{{ yen(x.total) }}</td>
              <td class="tnum text-right">{{ pct(x.share) }}</td>
              <td class="tnum text-right">{{ yen(x.company) }}</td>
              <td class="tnum text-right">{{ pct(x.total ? x.company / x.total : null) }}</td>
              <td class="tnum text-right">{{ prevRate(x.value, x.prev) === null ? '新規' : signedPct(prevRate(x.value, x.prev)) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <template #footer>
        <button class="btn btn-outline" @click="listModal === 'vehicles' ? exportVehicles() : exportVendors()"><Download class="size-4" />CSV出力</button>
        <button class="btn btn-soft" @click="listModal = ''">閉じる</button>
      </template>
    </AppModal>
  </div>
</template>
