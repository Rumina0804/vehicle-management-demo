<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import {
  ClipboardList,
  Truck,
  CirclePlay,
  CirclePause,
  CalendarDays,
  TriangleAlert,
  Search,
  RotateCcw,
  CirclePlus,
  Download,
  Upload,
  ChevronRight,
  Pencil,
  Clock,
  Plus,
  FileUp,
  FileSpreadsheet,
} from '@lucide/vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import KpiCard from '@/components/ui/KpiCard.vue'
import AppModal from '@/components/ui/AppModal.vue'
import PaginationBar from '@/components/ui/PaginationBar.vue'
import SortTh from '@/components/ui/SortTh.vue'
import VehicleThumb from '@/components/vehicle/VehicleThumb.vue'
import { CategoryBadge, StatusBadge } from '@/components/vehicle/VehicleBadges'
import { useDbStore } from '@/stores/db'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { usePagination, useSort } from '@/composables/useTable'
import { diffDays, fmtDate, fmtDateTime, todayISO } from '@/utils/date'
import { num, pct } from '@/utils/format'
import { downloadCsv, parseCsv, stamp } from '@/utils/csv'
import { ACQUISITION_LABELS, MAKER_SHORT, STATUS_LABELS } from '@/mock/catalog'
import type { Vehicle, VehicleStatus, CategoryId, AcquisitionType } from '@/types'

const db = useDbStore()
const auth = useAuthStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()
const today = todayISO()

// ---- 検索条件 ----
interface Filters {
  q: string
  division: string
  category: string
  type: string
  status: string
  expFrom: string
  expTo: string
  expiring: boolean
  longSuspended: boolean
  leaseOnly: boolean
}
const empty = (): Filters => ({ q: '', division: '', category: '', type: '', status: '', expFrom: '', expTo: '', expiring: false, longSuspended: false, leaseOnly: false })
const fromQuery = (): Filters => ({
  ...empty(),
  q: typeof route.query.q === 'string' ? route.query.q : '',
  division: typeof route.query.division === 'string' ? route.query.division : '',
  category: typeof route.query.category === 'string' ? route.query.category : '',
  status: typeof route.query.status === 'string' ? route.query.status : '',
  expiring: route.query.expiring === '1',
})
const form = reactive<Filters>(fromQuery())
const applied = ref<Filters>({ ...form })

watch(
  () => route.query,
  () => {
    Object.assign(form, fromQuery())
    applied.value = { ...form }
  },
)

function search() {
  applied.value = { ...form }
  page.value = 1
}
function clear() {
  Object.assign(form, empty())
  applied.value = empty()
  if (Object.keys(route.query).length) router.replace({ query: {} })
}

const typeOptions = computed(() => db.vehicleTypes.filter((t) => !form.category || t.categoryId === form.category))
watch(
  () => form.category,
  () => {
    if (form.type && !typeOptions.value.some((t) => t.id === form.type)) form.type = ''
  },
)

const daysLeft = (v: Vehicle) => diffDays(v.inspectionExpiry, today)

const filtered = computed(() => {
  const f = applied.value
  const q = f.q.trim().toLowerCase().replace(/\s+/g, '')
  return db.vehicles.filter((v) => {
    if (q && !`${v.id}${v.plateNumber}`.toLowerCase().replace(/\s+/g, '').includes(q)) return false
    if (f.division && v.divisionId !== f.division) return false
    if (f.category && v.categoryId !== f.category) return false
    if (f.type && v.typeId !== f.type) return false
    if (f.status && v.status !== f.status) return false
    if (f.expFrom && v.inspectionExpiry < f.expFrom) return false
    if (f.expTo && v.inspectionExpiry > f.expTo) return false
    if (f.expiring && daysLeft(v) > 60) return false
    if (f.longSuspended && !(v.status === 'suspended' && diffDays(today, v.statusSince) >= 90)) return false
    if (f.leaseOnly && v.acquisitionType !== 'lease') return false
    return true
  })
})

const { sort, toggle, sorted } = useSort(filtered, { key: 'id', dir: 'asc' }, {
  id: (v) => v.id,
  plate: (v) => v.plateNumber,
  division: (v) => db.divisionMap.get(v.divisionId)?.sortOrder ?? 99,
  category: (v) => db.categoryMap.get(v.categoryId)?.sortOrder ?? 99,
  type: (v) => db.typeMap.get(v.typeId)?.sortOrder ?? 99,
  model: (v) => `${v.maker}${v.model}`,
  expiry: (v) => v.inspectionExpiry,
  mileage: (v) => v.mileage,
  status: (v) => v.status,
})
const { page, pageSize, pageCount, paged, total, rangeFrom, rangeTo } = usePagination(sorted, 20)

// ---- KPI ----
const count = computed(() => db.vehicles.length)
const active = computed(() => db.vehicles.filter((v) => v.status === 'active').length)
const suspended = computed(() => db.vehicles.filter((v) => v.status === 'suspended').length)
const expiringCount = computed(() => db.vehicles.filter((v) => daysLeft(v) <= 60).length)

// ---- 最近の更新 ----
const EVENT_ICON = { create: CirclePlus, update: Pencil, status: CirclePause, division: Pencil, import: FileUp } as const
const EVENT_CLASS = { create: 'text-[#13803f]', update: 'text-brand-600', status: 'text-ink-2', division: 'text-brand-600', import: 'text-brand-600' } as const
const events = computed(() => db.vehicleEvents.slice(0, 4))

// ---- CSV ----
const HEADER = ['車両管理番号', '車両ナンバー', '所属事業部', '車両区分', '車両タイプ', 'メーカー', '車種', '型式', '車台番号', '初度登録年月', '導入年月日', '車検満了日', '走行距離', '使用状況', '取得区分', '車両本体価格', '架装・付属設備費', '取得諸費用', '備考']

function exportCsv() {
  downloadCsv(
    `車両台帳_${stamp()}.csv`,
    HEADER,
    sorted.value.map((v) => [
      v.id,
      v.plateNumber,
      db.divisionName(v.divisionId),
      db.categoryMap.get(v.categoryId)?.name,
      db.typeMap.get(v.typeId)?.name,
      v.maker,
      v.model,
      v.modelCode,
      v.chassisNumber,
      v.firstRegistration,
      v.introducedOn,
      v.inspectionExpiry,
      v.mileage,
      STATUS_LABELS[v.status],
      ACQUISITION_LABELS[v.acquisitionType],
      v.bodyPrice,
      v.equipmentPrice,
      v.acquisitionMisc,
      v.note,
    ]),
  )
  ui.toast(`${sorted.value.length}件をCSVに出力しました`)
}

const importOpen = ref(false)
const importRows = ref<(Partial<Vehicle> & { id?: string })[]>([])
const importErrors = ref<string[]>([])
const importName = ref('')

function resetImport() {
  importRows.value = []
  importErrors.value = []
  importName.value = ''
}

async function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (!file) return
  resetImport()
  importName.value = file.name
  const rows = parseCsv(await file.text())
  const header = rows.shift() ?? []
  const col = (name: string) => header.indexOf(name)
  if (col('車両ナンバー') < 0) {
    importErrors.value.push('見出し行に「車両ナンバー」がありません。CSV出力したファイルの形式で作成してください。')
    return
  }
  const divByName = new Map(db.divisions.flatMap((d) => [[d.name, d.id], [d.shortName, d.id]] as [string, string][]))
  const catByName = new Map(db.categories.map((c) => [c.name, c.id]))
  const typeByName = new Map(db.vehicleTypes.map((t) => [t.name, t]))
  const statusByLabel = new Map<string, VehicleStatus>(Object.entries(STATUS_LABELS).map(([k, l]) => [l, k as VehicleStatus]))
  const acqByLabel = new Map<string, AcquisitionType>(Object.entries(ACQUISITION_LABELS).map(([k, l]) => [l, k as AcquisitionType]))
  rows.forEach((r, i) => {
    const get = (n: string) => (col(n) >= 0 ? (r[col(n)] ?? '').trim() : '')
    const line = i + 2
    const plate = get('車両ナンバー')
    if (!plate) return importErrors.value.push(`${line}行目：車両ナンバーが空です`)
    const division = divByName.get(get('所属事業部'))
    if (!division) return importErrors.value.push(`${line}行目：所属事業部「${get('所属事業部')}」が見つかりません`)
    const type = typeByName.get(get('車両タイプ'))
    const category = (catByName.get(get('車両区分')) ?? type?.categoryId) as CategoryId | undefined
    if (!category) return importErrors.value.push(`${line}行目：車両区分「${get('車両区分')}」が見つかりません`)
    const expiry = get('車検満了日').replaceAll('/', '-')
    if (expiry && !/^\d{4}-\d{2}-\d{2}$/.test(expiry)) return importErrors.value.push(`${line}行目：車検満了日の形式が正しくありません`)
    const n = (s: string) => Number(s.replace(/[^\d.-]/g, '')) || 0
    const id = get('車両管理番号')
    importRows.value.push({
      ...(id ? { id } : {}),
      plateNumber: plate,
      divisionId: division,
      categoryId: category,
      typeId: type?.id ?? db.vehicleTypes.find((t) => t.categoryId === category)!.id,
      maker: get('メーカー'),
      model: get('車種'),
      modelCode: get('型式'),
      chassisNumber: get('車台番号'),
      ...(get('初度登録年月') ? { firstRegistration: get('初度登録年月').replace('/', '-').slice(0, 7) } : {}),
      ...(get('導入年月日') ? { introducedOn: get('導入年月日').replaceAll('/', '-') } : {}),
      ...(expiry ? { inspectionExpiry: expiry } : {}),
      mileage: n(get('走行距離')),
      status: statusByLabel.get(get('使用状況')) ?? 'active',
      acquisitionType: acqByLabel.get(get('取得区分')) ?? 'new',
      bodyPrice: n(get('車両本体価格')),
      equipmentPrice: n(get('架装・付属設備費')),
      acquisitionMisc: n(get('取得諸費用')),
      note: get('備考'),
    })
  })
}

const importSummary = computed(() => {
  const updates = importRows.value.filter((r) => r.id && db.vehicleMap.has(r.id)).length
  return { updates, adds: importRows.value.length - updates }
})

function runImport() {
  const { added, updated } = db.upsertVehicles(importRows.value)
  importOpen.value = false
  resetImport()
  ui.toast(`CSVを取り込みました（新規 ${added}件・更新 ${updated}件）`)
}

function downloadTemplate() {
  downloadCsv('車両台帳_取込テンプレート.csv', HEADER, [
    ['', '倉敷100 さ 12-34', '倉敷第一事業部', 'トラック', '中型（4tクラス）', '日野自動車', 'レンジャー', '2PG-FD2ABG', 'FD2ABG-000001', '2026-04', '2026-04-10', '2027-04-09', '1200', '使用中', '新車取得', '9800000', '2100000', '480000', '新規導入'],
  ])
}

const canEdit = (v: Vehicle) => auth.canEditDivision(v.divisionId)
</script>

<template>
  <div>
    <PageHeader
      title="車両台帳一覧"
      :icon="ClipboardList"
      description="登録されている車両を検索・一覧で確認し、&#10;車両情報の参照・編集・管理ができます。"
    />

    <div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
      <KpiCard label="登録車両数" :value="num(count)" unit="台" :icon="Truck" tone="blue" />
      <KpiCard label="使用中" :value="num(active)" unit="台" :icon="CirclePlay" tone="green" :note="`構成比 ${pct(count ? active / count : 0)}`" to="/vehicles?status=active" />
      <KpiCard label="休止中" :value="num(suspended)" unit="台" :icon="CirclePause" tone="gray" :note="`構成比 ${pct(count ? suspended / count : 0)}`" to="/vehicles?status=suspended" />
      <KpiCard label="車検期限間近" sublabel="（60日以内）" :value="num(expiringCount)" unit="台" :icon="CalendarDays" :deco="TriangleAlert" tone="red" to="/vehicles?expiring=1" />
    </div>

    <div class="grid grid-cols-1 gap-4 min-[1820px]:grid-cols-[1fr_300px]">
      <div class="min-w-0 space-y-4 max-[1819px]:order-2">
        <!-- 検索・絞り込み条件 -->
        <section class="card overflow-hidden" aria-label="検索・絞り込み条件">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line-soft bg-[#f3f7fd] pr-4">
            <span class="flex h-10 items-center gap-2 bg-gradient-to-r from-[#1553bd] to-[#2a73e0] pl-4 pr-8 text-[15px] font-bold text-white [clip-path:polygon(0_0,100%_0,92%_100%,0_100%)]">
              <Search class="size-5" />検索・絞り込み条件
            </span>
            <span class="text-[12.5px] text-ink-2">複数の条件で車両を検索できます。条件を指定して「検索」を押してください。</span>
          </div>
          <form class="grid grid-cols-1 gap-x-4 gap-y-3 p-4 lg:grid-cols-[1fr_auto]" @submit.prevent="search">
            <div class="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-[1.6fr_1.2fr_1fr_1fr_0.9fr]">
              <label class="col-span-2 md:col-span-1">
                <span class="field-label mb-1">管理番号・ナンバー</span>
                <span class="relative block">
                  <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
                  <input v-model="form.q" class="input pl-9" placeholder="管理番号またはナンバーを入力" />
                </span>
              </label>
              <label>
                <span class="field-label mb-1">所属事業部</span>
                <select v-model="form.division" class="input">
                  <option value="">すべての事業部</option>
                  <option v-for="d in db.divisions" :key="d.id" :value="d.id">{{ d.name }}</option>
                </select>
              </label>
              <label>
                <span class="field-label mb-1">車両区分</span>
                <select v-model="form.category" class="input">
                  <option value="">すべて</option>
                  <option v-for="c in db.categories" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </label>
              <label>
                <span class="field-label mb-1">車両タイプ</span>
                <select v-model="form.type" class="input">
                  <option value="">すべて</option>
                  <option v-for="t in typeOptions" :key="t.id" :value="t.id">{{ t.name }}</option>
                </select>
              </label>
              <label>
                <span class="field-label mb-1">使用状況</span>
                <select v-model="form.status" class="input">
                  <option value="">すべて</option>
                  <option v-for="(l, k) in STATUS_LABELS" :key="k" :value="k">{{ l }}</option>
                </select>
              </label>
              <div class="col-span-2 md:col-span-2">
                <span class="field-label mb-1">車検期限</span>
                <span class="flex items-center gap-2">
                  <input v-model="form.expFrom" type="date" class="input" aria-label="車検期限（から）" />
                  <span class="text-ink-3">〜</span>
                  <input v-model="form.expTo" type="date" class="input" aria-label="車検期限（まで）" />
                </span>
              </div>
              <fieldset class="col-span-2 md:col-span-3">
                <legend class="field-label mb-1">その他の条件</legend>
                <span class="flex h-[38px] flex-wrap items-center gap-x-5 gap-y-1 text-[13px]">
                  <label class="flex items-center gap-1.5"><input v-model="form.expiring" type="checkbox" class="check" />車検期限間近（60日以内）</label>
                  <label class="flex items-center gap-1.5"><input v-model="form.longSuspended" type="checkbox" class="check" />長期休止中（90日以上）</label>
                  <label class="flex items-center gap-1.5"><input v-model="form.leaseOnly" type="checkbox" class="check" />リース車両のみ</label>
                </span>
              </fieldset>
            </div>
            <div class="flex flex-row gap-2 lg:w-40 lg:flex-col lg:justify-end">
              <button type="submit" class="btn btn-primary h-11 flex-1 text-[15px] lg:flex-none"><Search class="size-5" />検索</button>
              <button type="button" class="btn btn-outline flex-1 lg:flex-none" @click="clear"><RotateCcw class="size-4" />条件をクリア</button>
            </div>
          </form>
        </section>

        <!-- 車両一覧 -->
        <SectionCard :title="`車両一覧（${num(total)}件）`" :icon="Truck" body-class="p-0">
          <template #actions>
            <label class="flex items-center gap-2 text-[12px] font-bold">
              表示件数
              <select v-model.number="pageSize" class="h-7 rounded-md border-0 bg-white px-2 text-[12px] font-bold text-ink" aria-label="表示件数">
                <option :value="10">10件</option>
                <option :value="20">20件</option>
                <option :value="50">50件</option>
                <option :value="100">100件</option>
              </select>
            </label>
          </template>
          <div class="overflow-x-auto">
            <table class="tbl">
              <thead>
                <tr>
                  <th class="text-center">写真</th>
                  <SortTh label="車両管理番号" field="id" :sort="sort" @sort="toggle($event as never)" />
                  <SortTh label="車両ナンバー" field="plate" :sort="sort" @sort="toggle($event as never)" />
                  <SortTh label="所属事業部" field="division" :sort="sort" @sort="toggle($event as never)" />
                  <SortTh label="車両区分" field="category" :sort="sort" @sort="toggle($event as never)" />
                  <SortTh label="車両タイプ" field="type" :sort="sort" @sort="toggle($event as never)" />
                  <SortTh label="車種・型式" field="model" :sort="sort" @sort="toggle($event as never)" />
                  <SortTh label="車検満了日" field="expiry" :sort="sort" @sort="toggle($event as never)" />
                  <SortTh label="走行距離" field="mileage" :sort="sort" align="right" @sort="toggle($event as never)" />
                  <SortTh label="使用状況" field="status" :sort="sort" @sort="toggle($event as never)" />
                  <th class="text-center">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="v in paged" :key="v.id">
                  <td class="py-1.5"><VehicleThumb :vehicle="v" /></td>
                  <td class="font-bold">
                    <RouterLink :to="{ name: 'vehicle-detail', params: { id: v.id } }" class="hover:text-brand-700 hover:underline">{{ v.id }}</RouterLink>
                  </td>
                  <td class="whitespace-nowrap">{{ v.plateNumber }}</td>
                  <td class="whitespace-nowrap">{{ db.divisionName(v.divisionId, true) }}</td>
                  <td><CategoryBadge :category-id="v.categoryId" /></td>
                  <td class="whitespace-nowrap">{{ db.typeMap.get(v.typeId)?.name.replace(/（.*）/, '') }}</td>
                  <td class="leading-tight">
                    <span class="block whitespace-nowrap">{{ MAKER_SHORT[v.maker] ?? v.maker }} {{ v.model }}</span>
                    <span class="text-[11px] text-ink-3">（{{ v.modelCode }}）</span>
                  </td>
                  <td class="tnum whitespace-nowrap">
                    <span :class="daysLeft(v) <= 60 ? 'rounded bg-[#fde8e8] px-1.5 py-0.5 font-bold text-[#c9262d]' : ''">{{ fmtDate(v.inspectionExpiry) }}</span>
                  </td>
                  <td class="tnum whitespace-nowrap text-right">{{ num(v.mileage) }} km</td>
                  <td>
                    <span v-if="daysLeft(v) <= 60 && v.status === 'active'" class="badge badge-bad"><TriangleAlert class="size-3.5" />車検期限間近</span>
                    <StatusBadge v-else :status="v.status" />
                  </td>
                  <td>
                    <span class="flex justify-center gap-1.5">
                      <RouterLink :to="{ name: 'vehicle-detail', params: { id: v.id } }" class="btn btn-outline btn-sm"><Search class="size-3.5" />詳細</RouterLink>
                      <RouterLink v-if="canEdit(v)" :to="{ name: 'vehicle-edit', params: { id: v.id } }" class="btn btn-outline btn-sm"><Pencil class="size-3.5" />編集</RouterLink>
                    </span>
                  </td>
                </tr>
                <tr v-if="!paged.length">
                  <td colspan="11" class="py-12 text-center text-ink-3">条件に一致する車両はありません</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-4 py-2.5">
            <span class="tnum text-[12.5px] text-ink-2">{{ num(rangeFrom) }} - {{ num(rangeTo) }}件 ／ 全{{ num(total) }}件</span>
            <PaginationBar v-model:page="page" :page-count="pageCount" />
          </div>
        </SectionCard>
      </div>

      <!-- 右カラム（狭い画面では一覧の上に横並び） -->
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 max-[1819px]:order-1 min-[1820px]:flex min-[1820px]:flex-col">

        <SectionCard title="クイックアクション" :icon="CirclePlus" body-class="space-y-2.5 p-3">
          <RouterLink v-if="auth.can('data.edit')" to="/vehicles/new" class="qa qa-primary">
            <Truck class="size-7" />
            <span class="flex-1 text-[16px] font-black">新規車両登録</span>
            <ChevronRight class="size-5" />
          </RouterLink>
          <button v-if="auth.can('data.edit')" class="qa" @click="importOpen = true">
            <Upload class="size-7 text-brand-600" />
            <span class="flex-1 text-left">
              <span class="block text-[15px] font-black">CSV取込</span>
              <span class="block text-[11px] text-ink-2">（車両台帳の一括登録・更新）</span>
            </span>
            <ChevronRight class="size-5 text-brand-600" />
          </button>
          <button class="qa" @click="exportCsv">
            <Download class="size-7 text-brand-600" />
            <span class="flex-1 text-left">
              <span class="block text-[15px] font-black">CSV出力</span>
              <span class="block text-[11px] text-ink-2">（一覧のダウンロード）</span>
            </span>
            <ChevronRight class="size-5 text-brand-600" />
          </button>
          <p v-if="!auth.can('data.edit')" class="rounded-lg bg-[#f3f6fa] px-3 py-2 text-[12px] text-ink-2">閲覧専用の権限のため、登録・取込はできません。</p>
        </SectionCard>

        <SectionCard title="最近の更新" sub="（車両台帳）" :icon="Clock" body-class="p-0">
          <ul class="divide-y divide-line-soft">
            <li v-for="e in events" :key="e.id">
              <component
                :is="db.vehicleMap.has(e.vehicleId) ? RouterLink : 'div'"
                :to="db.vehicleMap.has(e.vehicleId) ? { name: 'vehicle-detail', params: { id: e.vehicleId } } : undefined"
                class="flex items-center gap-3 px-3.5 py-3 hover:bg-brand-50"
              >
                <component :is="EVENT_ICON[e.kind]" class="size-6 shrink-0" :class="EVENT_CLASS[e.kind]" />
                <span class="min-w-0 flex-1 leading-snug">
                  <span class="block text-[13px] font-bold">{{ e.title }}<span v-if="db.vehicleMap.has(e.vehicleId)" class="ml-1.5">{{ e.vehicleId }}</span></span>
                  <span v-if="e.detail" class="block truncate text-[12px] text-ink-2">（{{ e.detail }}）</span>
                  <span class="tnum block text-[11.5px] text-ink-3">{{ fmtDateTime(e.at) }}</span>
                </span>
                <ChevronRight class="size-4 shrink-0 text-ink-3" />
              </component>
            </li>
          </ul>
        </SectionCard>
      </div>
    </div>

    <!-- CSV取込 -->
    <AppModal :open="importOpen" title="CSV取込（車両台帳の一括登録・更新）" width="720px" @close="(importOpen = false), resetImport()">
      <ol class="mb-4 space-y-1 text-[13px] text-ink-2">
        <li>1. 「CSV出力」したファイル、またはテンプレートを編集して保存します。</li>
        <li>2. 車両管理番号が一致する車両は<b class="text-ink">更新</b>、空欄または新しい番号は<b class="text-ink">新規登録</b>になります。</li>
      </ol>
      <label class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50/60 px-4 py-8 text-center hover:bg-brand-50">
        <FileSpreadsheet class="size-10 text-brand-600" />
        <span class="text-[14px] font-bold text-navy-900">{{ importName || 'CSVファイルを選択' }}</span>
        <span class="text-[12px] text-ink-3">UTF-8（BOM付き可）／1行目は見出し行</span>
        <input type="file" accept=".csv,text/csv" class="sr-only" @change="onFile" />
      </label>
      <button class="link mt-2 text-[12.5px]" @click="downloadTemplate">テンプレートをダウンロード</button>

      <div v-if="importRows.length || importErrors.length" class="mt-4 space-y-2">
        <p v-if="importRows.length" class="rounded-lg bg-[#e2f5e9] px-3 py-2 text-[13px] font-bold text-[#0f6b35]">
          取込可能：{{ importRows.length }}件（新規 {{ importSummary.adds }}件・更新 {{ importSummary.updates }}件）
        </p>
        <ul v-if="importErrors.length" class="max-h-40 space-y-1 overflow-y-auto rounded-lg bg-[#fde8e8] px-3 py-2 text-[12.5px] text-[#b4232a]">
          <li v-for="e in importErrors" :key="e">{{ e }}</li>
        </ul>
      </div>
      <template #footer>
        <button class="btn btn-soft" @click="(importOpen = false), resetImport()">キャンセル</button>
        <button class="btn btn-primary" :disabled="!importRows.length" @click="runImport"><Plus class="size-4" />{{ importRows.length }}件を取り込む</button>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.qa {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0.9rem;
  border-radius: 0.75rem;
  border: 1px solid #b9cdea;
  background: #fff;
  color: var(--color-navy-900);
  transition:
    background-color 0.15s,
    box-shadow 0.15s;
}
.qa:hover {
  background: var(--color-brand-50);
}
.qa-primary {
  border: 0;
  color: #fff;
  background: linear-gradient(180deg, #2f82ef 0%, #1a62d3 100%);
  box-shadow: 0 4px 12px rgb(27 99 214 / 0.35);
}
.qa-primary:hover {
  background: linear-gradient(180deg, #3a8af2 0%, #1d69dc 100%);
}
</style>
