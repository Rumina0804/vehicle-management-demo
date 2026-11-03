<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  Gauge,
  Network,
  Building2,
  Check,
  Truck,
  CalendarClock,
  CalendarDays,
  Wrench,
  Cog,
  Coins,
  TrendingUp,
  ChartPie,
  ChartColumnBig,
  Trophy,
  Clock,
  ChevronRight,
  Medal,
  Award,
} from '@lucide/vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import KpiCard, { type KpiDelta } from '@/components/ui/KpiCard.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import MonthlyCostChart from '@/components/charts/MonthlyCostChart.vue'
import CumulativeChart from '@/components/charts/CumulativeChart.vue'
import ViewToggle from '@/components/charts/ViewToggle.vue'
import { SERIES } from '@/components/charts/setup'
import { ExpiryBadge } from '@/components/vehicle/VehicleBadges'
import { RecordStateBadge } from '@/components/vehicle/RecordBadges'
import { useDbStore } from '@/stores/db'
import { useAuthStore } from '@/stores/auth'
import {
  addDays,
  diffDays,
  fiscalMonths,
  fiscalYearLabel,
  fiscalYearOf,
  fiscalYearRange,
  fmtDate,
  lastDayOfMonth,
  monthLabel,
  todayISO,
} from '@/utils/date'
import { cumulative, expiryAsOf, groupSum, monthlyTotals, sumOf } from '@/utils/analytics'
import { kyen, num, pct, signed, yen } from '@/utils/format'

const db = useDbStore()
const auth = useAuthStore()
const router = useRouter()
const today = todayISO()

// ---- 表示対象（全社 / 事業部） ----
const division = ref<string>(auth.scopeDivisionId ?? 'all')
const inScope = (divisionId: string) => division.value === 'all' || divisionId === division.value
const scopeLabel = computed(() => (division.value === 'all' ? '全社' : db.divisionName(division.value, true)))

const vehicles = computed(() => db.vehicles.filter((v) => inScope(v.divisionId)))
const records = computed(() => db.records.filter((r) => inScope(r.divisionId)))

// ---- 期間 ----
const fy = fiscalYearOf(today)
const fyRange = fiscalYearRange(fy)
const months = fiscalMonths(fy)
const currentMonthIndex = months.indexOf(today.slice(0, 7))
const monthAgo = addDays(today, -30)

// ---- KPI ----
const fleetCount = computed(() => vehicles.value.length)
const fleetDelta = computed<KpiDelta>(() => {
  const prevEnd = fiscalYearRange(fy - 1).to
  const d = fleetCount.value - vehicles.value.filter((v) => v.introducedOn <= prevEnd).length
  return { text: `前期比 ${signed(d, '台')}`, dir: d > 0 ? 'up' : d < 0 ? 'down' : 'flat', upIsGood: true }
})

const expiring = computed(() =>
  vehicles.value
    .map((v) => ({ v, days: diffDays(v.inspectionExpiry, today) }))
    .filter((x) => x.days <= 60)
    .sort((a, b) => a.days - b.days),
)
const expiringDelta = computed<KpiDelta>(() => {
  const prev = vehicles.value.filter((v) => {
    if (v.introducedOn > monthAgo) return false
    const d = diffDays(expiryAsOf(v, db.recordsByVehicle.get(v.id), monthAgo), monthAgo)
    return d <= 60
  }).length
  const d = expiring.value.length - prev
  return { text: `前月比 ${signed(d, '台')}`, dir: d > 0 ? 'up' : d < 0 ? 'down' : 'flat', upIsGood: false }
})

const inRepair = computed(() => vehicles.value.filter((v) => v.status === 'repair'))
const repairDelta = computed<KpiDelta>(() => {
  const ids = new Set(vehicles.value.map((v) => v.id))
  const prev = new Set(
    db.records
      .filter((r) => ids.has(r.vehicleId) && r.category === 'repair' && r.date <= monthAgo && (r.returnDate === null || r.returnDate > monthAgo))
      .map((r) => r.vehicleId),
  ).size
  const d = inRepair.value.length - prev
  return { text: `前月比 ${signed(d, '台')}`, dir: d > 0 ? 'up' : d < 0 ? 'down' : 'flat', upIsGood: false }
})

const fyRecords = computed(() => records.value.filter((r) => r.accountingDate >= fyRange.from && r.accountingDate <= fyRange.to))
const fyTotal = computed(() => sumOf(fyRecords.value))

/** 選択中の事業部の月次計画（4月〜3月） */
const planMonthly = computed(() => {
  const ids = division.value === 'all' ? Object.keys(db.budgets) : [division.value]
  return months.map((_, i) => ids.reduce((s, id) => s + (db.budgets[id]?.[i] ?? 0), 0))
})
const planToDate = computed(() => {
  if (currentMonthIndex < 0) return planMonthly.value.reduce((s, v) => s + v, 0)
  const full = planMonthly.value.slice(0, currentMonthIndex).reduce((s, v) => s + v, 0)
  const key = months[currentMonthIndex]!
  const daysInMonth = Number(lastDayOfMonth(key).slice(8, 10))
  const frac = Number(today.slice(8, 10)) / daysInMonth
  return full + (planMonthly.value[currentMonthIndex] ?? 0) * frac
})
const planRatio = computed(() => (planToDate.value > 0 ? fyTotal.value / planToDate.value : null))

// ---- 車両区分の内訳 ----
const categoryItems = computed(() =>
  db.categories.map((c) => ({
    id: c.id,
    label: c.name,
    color: c.color,
    value: vehicles.value.filter((v) => v.categoryId === c.id).length,
  })),
)

// ---- 修理費の推移 ----
const trendView = ref<'chart' | 'table'>('chart')
const monthlyValues = computed(() => {
  const totals = monthlyTotals(fyRecords.value, months)
  return totals.map((v, i) => (currentMonthIndex >= 0 && i > currentMonthIndex ? null : v))
})
const cumulativeActual = computed(() => cumulative(monthlyValues.value))
const cumulativePlan = computed(() => cumulative(planMonthly.value))
const monthLabels = months.map(monthLabel)

// ---- 下段の一覧 ----
const topCost = computed(() => {
  const map = groupSum(fyRecords.value, (r) => r.vehicleId)
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, total], i) => ({ rank: i + 1, vehicle: db.vehicleMap.get(id), total }))
    .filter((x) => x.vehicle)
})

const recent = computed(() =>
  [...records.value]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5),
)

const RANK_ICON = [Trophy, Medal, Award]
const RANK_CLASS = ['text-[#e2a400]', 'text-[#8d99aa]', 'text-[#c47a3a]']

function vehicleLabel(id: string) {
  const v = db.vehicleMap.get(id)
  if (!v) return id
  return `${v.plateNumber}（${db.categoryMap.get(v.categoryId)?.shortName ?? ''}）`
}

function openVehicle(id: string, tab?: string) {
  router.push({ name: 'vehicle-detail', params: { id }, query: tab ? { tab } : {} })
}

const listQuery = computed(() => (division.value === 'all' ? {} : { division: division.value }))
</script>

<template>
  <div>
    <PageHeader
      title="ダッシュボード"
      :icon="Gauge"
      description="車両の保有・車検・修理・費用をまとめて管理し、&#10;安全・効率的な車両運用を支援する社内システムです。"
    />

    <!-- 表示対象 -->
    <div class="card mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
      <span class="flex items-center gap-2 text-[14px] font-bold text-navy-900">
        <Network class="size-5 text-navy-700" />表示対象（組織・事業部）
      </span>
      <div class="flex flex-1 flex-wrap gap-2" role="group" aria-label="表示対象の事業部">
        <button class="div-btn" :class="division === 'all' ? 'is-on' : ''" :aria-pressed="division === 'all'" @click="division = 'all'">
          <Check v-if="division === 'all'" class="size-4" :stroke-width="3" />全社
        </button>
        <button
          v-for="d in db.activeDivisions"
          :key="d.id"
          class="div-btn"
          :class="division === d.id ? 'is-on' : ''"
          :aria-pressed="division === d.id"
          @click="division = d.id"
        >
          <Check v-if="division === d.id" class="size-4" :stroke-width="3" />
          <Building2 v-else class="size-4 text-ink-3" />
          {{ d.shortName }}
        </button>
      </div>
    </div>

    <!-- KPI -->
    <div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
      <KpiCard label="保有車両数" :value="num(fleetCount)" unit="台" :icon="Truck" :deco="Truck" tone="blue" :delta="fleetDelta" :to="`/vehicles${division === 'all' ? '' : `?division=${division}`}`" />
      <KpiCard
        label="車検期限60日以内"
        :value="num(expiring.length)"
        unit="台"
        :icon="CalendarDays"
        :deco="CalendarClock"
        tone="red"
        :delta="expiringDelta"
        :to="`/vehicles?expiring=1${division === 'all' ? '' : `&division=${division}`}`"
      />
      <KpiCard label="修理中の車両" :value="num(inRepair.length)" unit="台" :icon="Wrench" :deco="Cog" tone="orange" :delta="repairDelta" to="/maintenance?state=open" />
      <KpiCard
        label="今期の修理総額"
        :sublabel="`${fiscalYearLabel(fy)}・4月〜当日`"
        :value="yen(fyTotal)"
        :icon="Coins"
        :deco="TrendingUp"
        tone="violet"
        :note="planRatio === null ? '' : `（計画比 ${pct(planRatio)}）`"
      />
    </div>

    <!-- 中段 -->
    <div class="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
      <SectionCard :title="`車両区分の内訳（${scopeLabel}）`" :icon="ChartPie" class="xl:col-span-5" body-class="p-4">
        <div class="flex flex-col items-center gap-5 sm:flex-row">
          <DonutChart
            :items="categoryItems"
            :format="(v) => `${num(v)}台`"
            :center-value="num(fleetCount)"
            center-unit="台"
            :size="180"
            label="車両区分ごとの台数のドーナツグラフ"
          />
          <ul class="w-full flex-1 divide-y divide-line-soft">
            <li v-for="c in categoryItems" :key="c.id">
              <RouterLink
                :to="{ name: 'vehicles', query: { ...listQuery, category: c.id } }"
                class="flex items-center gap-2.5 rounded-md px-1.5 py-2 text-[13.5px] hover:bg-brand-50"
              >
                <span class="size-3 shrink-0 rounded-full" :style="{ background: c.color }" />
                <span class="flex-1 font-bold text-ink">{{ c.label }}</span>
                <span class="tnum w-14 text-right font-bold">{{ num(c.value) }}台</span>
                <span class="tnum w-16 text-right text-ink-2">（{{ pct(fleetCount ? c.value / fleetCount : 0) }}）</span>
              </RouterLink>
            </li>
          </ul>
        </div>
      </SectionCard>

      <SectionCard :title="`修理費の推移（${scopeLabel}）`" :sub="`${fiscalYearLabel(fy)}`" :icon="ChartColumnBig" class="xl:col-span-7" body-class="px-4 pb-3 pt-3">
        <template #actions>
          <span class="head-chip tnum">累計 {{ yen(fyTotal) }}</span>
          <ViewToggle v-model="trendView" />
        </template>

        <div v-if="trendView === 'chart'" class="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-[1.25fr_1fr]">
          <div>
            <div class="mb-1 flex items-center justify-between text-[12px]">
              <span class="font-bold text-ink">月次の修理・整備費</span>
              <span class="flex items-center gap-3 text-ink-2">
                <span class="flex items-center gap-1"><span class="size-2.5 rounded-sm" :style="{ background: SERIES.blue }" />実績</span>
                <span class="flex items-center gap-1"><span class="size-2.5 rounded-sm" :style="{ background: SERIES.blueSoft }" />当月（途中経過）</span>
                <span class="text-ink-3">（千円）</span>
              </span>
            </div>
            <MonthlyCostChart :labels="monthLabels" :values="monthlyValues" :partial-index="currentMonthIndex" :height="196" />
          </div>
          <div>
            <div class="mb-1 flex items-center justify-between text-[12px]">
              <span class="font-bold text-ink">累計（実績と計画）</span>
              <span class="flex items-center gap-3 text-ink-2">
                <span class="flex items-center gap-1"><span class="h-[3px] w-3.5 rounded" :style="{ background: SERIES.blue }" />実績</span>
                <span class="flex items-center gap-1"><span class="h-[3px] w-3.5 rounded" :style="{ background: SERIES.muted }" />計画</span>
                <span class="text-ink-3">（千円）</span>
              </span>
            </div>
            <CumulativeChart :labels="monthLabels" :actual="cumulativeActual" :plan="cumulativePlan" :height="196" />
          </div>
        </div>

        <div v-else class="max-h-[230px] overflow-y-auto scroll-thin">
          <table class="tbl tbl-compact">
            <thead>
              <tr>
                <th>月</th>
                <th class="text-right">修理・整備費（千円）</th>
                <th class="text-right">累計・実績（千円）</th>
                <th class="text-right">累計・計画（千円）</th>
                <th class="text-right">計画比</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(m, i) in monthLabels" :key="m">
                <td>{{ m }}<span v-if="i === currentMonthIndex" class="ml-1 text-[11px] text-ink-3">（途中経過）</span></td>
                <td class="tnum text-right">{{ monthlyValues[i] === null ? '—' : kyen(monthlyValues[i]!) }}</td>
                <td class="tnum text-right">{{ cumulativeActual[i] === null ? '—' : kyen(cumulativeActual[i]!) }}</td>
                <td class="tnum text-right">{{ kyen(cumulativePlan[i] ?? 0) }}</td>
                <td class="tnum text-right">
                  {{ cumulativeActual[i] === null || !cumulativePlan[i] ? '—' : pct(cumulativeActual[i]! / cumulativePlan[i]!) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>

    <!-- 下段 -->
    <div class="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr_1.05fr]">
      <SectionCard title="車検期限が近い車両" sub="（60日以内）" :icon="CalendarDays" body-class="p-0">
        <template #actions>
          <span class="text-[12px] font-bold">該当：<span class="text-[15px]">{{ expiring.length }}</span>台</span>
          <RouterLink :to="{ name: 'vehicles', query: { ...listQuery, expiring: '1' } }" class="head-chip">一覧を見る<ChevronRight class="size-3.5" /></RouterLink>
        </template>
        <div class="overflow-x-auto">
          <table class="tbl tbl-compact">
            <thead>
              <tr>
                <th>期限まで</th>
                <th>車両番号</th>
                <th>車両名（車種）</th>
                <th>所属事業部</th>
                <th>車検満了日</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="x in expiring.slice(0, 5)" :key="x.v.id" class="cursor-pointer" @click="openVehicle(x.v.id)">
                <td><ExpiryBadge :days="x.days" /></td>
                <td class="font-bold">{{ x.v.id }}</td>
                <td class="whitespace-nowrap">{{ vehicleLabel(x.v.id) }}</td>
                <td class="whitespace-nowrap">{{ db.divisionName(x.v.divisionId, true) }}</td>
                <td class="tnum">{{ fmtDate(x.v.inspectionExpiry) }}</td>
              </tr>
              <tr v-if="!expiring.length">
                <td colspan="5" class="py-8 text-center text-ink-3">60日以内に車検期限を迎える車両はありません</td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="修理費の高い車両" sub="（今期累計）" :icon="Trophy" body-class="p-0">
        <template #actions><span class="head-chip">上位5台</span></template>
        <ul class="divide-y divide-line-soft">
          <li v-for="(x, i) in topCost" :key="x.vehicle!.id">
            <button class="flex w-full items-center gap-3 px-4 py-2 text-left text-[13px] hover:bg-brand-50" @click="openVehicle(x.vehicle!.id, 'records')">
              <span class="flex w-7 shrink-0 justify-center">
                <component :is="RANK_ICON[i]" v-if="i < 3" class="size-5" :class="RANK_CLASS[i]" :stroke-width="2.4" :aria-label="`${x.rank}位`" />
                <span v-else class="flex size-6 items-center justify-center rounded-md bg-[#eef2f7] text-[12px] font-black text-ink-2">{{ x.rank }}</span>
              </span>
              <span class="w-14 shrink-0 font-bold">{{ x.vehicle!.id }}</span>
              <span class="min-w-0 flex-1 truncate text-ink-2">{{ vehicleLabel(x.vehicle!.id) }}</span>
              <span class="tnum shrink-0 font-black text-ink">{{ yen(x.total) }}</span>
            </button>
          </li>
          <li v-if="!topCost.length" class="px-4 py-8 text-center text-[13px] text-ink-3">今期の修理・整備費はまだありません</li>
        </ul>
      </SectionCard>

      <SectionCard title="最近の整備・修理履歴" :icon="Clock" body-class="p-0">
        <template #actions>
          <span class="text-[12px] font-bold">最新5件</span>
          <RouterLink :to="{ name: 'maintenance', query: listQuery }" class="head-chip">一覧を見る<ChevronRight class="size-3.5" /></RouterLink>
        </template>
        <ul class="divide-y divide-line-soft">
          <li v-for="r in recent" :key="r.id">
            <button class="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13px] hover:bg-brand-50" @click="openVehicle(r.vehicleId, 'records')">
              <Wrench class="size-4 shrink-0 text-brand-600" />
              <span class="tnum shrink-0 text-ink-2">{{ fmtDate(r.date) }}</span>
              <span class="w-14 shrink-0 font-bold">{{ r.vehicleId }}</span>
              <span class="min-w-0 flex-1 truncate">{{ r.workType }}</span>
              <RecordStateBadge :record="r" />
            </button>
          </li>
        </ul>
      </SectionCard>
    </div>
  </div>
</template>

<style scoped>
.div-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  height: 2.25rem;
  padding: 0 1rem;
  border-radius: 0.5rem;
  border: 1px solid #c9d7ea;
  background: #fff;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--color-navy-900);
  transition:
    background-color 0.15s,
    box-shadow 0.15s;
}
.div-btn:hover {
  background: var(--color-brand-50);
}
.div-btn.is-on {
  border-color: transparent;
  color: #fff;
  background: linear-gradient(180deg, #2f82ef 0%, #1a62d3 100%);
  box-shadow: 0 3px 8px rgb(27 99 214 / 0.35);
  padding: 0 1.25rem;
}
</style>
