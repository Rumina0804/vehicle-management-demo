<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import {
  CarFront,
  House,
  ChevronRight,
  ChevronLeft,
  Truck,
  IdCard,
  Pencil,
  Undo2,
  FileText,
  Coins,
  CalendarDays,
  Wrench,
  Paperclip,
  Camera,
  Maximize2,
  Hash,
  Network,
  Layers,
  Factory,
  Barcode,
  Route,
  Activity,
  Package,
  Calculator,
  Gauge,
  Cog,
  CircleDot,
  ImagePlus,
  List,
  Download,
  Upload,
  Plus,
  Timer,
  Trash2,
} from '@lucide/vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import AppModal from '@/components/ui/AppModal.vue'
import PaginationBar from '@/components/ui/PaginationBar.vue'
import VehicleIllustration from '@/components/vehicle/VehicleIllustration.vue'
import { CategoryBadge, StatusBadge } from '@/components/vehicle/VehicleBadges'
import { RecordKindBadge, RecordStateBadge } from '@/components/vehicle/RecordBadges'
import { useDbStore } from '@/stores/db'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { usePagination } from '@/composables/useTable'
import { diffDays, fiscalYearOf, fiscalYearRange, fmtDate, fmtJpDate, fmtRemaining, fmtYearMonth, todayISO } from '@/utils/date'
import { fileSize, num, pct, yen } from '@/utils/format'
import { ACQUISITION_LABELS, vehicleName } from '@/mock/catalog'
import { downscaleImage } from '@/utils/image'
import type { VehicleAttachment } from '@/types'

const props = defineProps<{ id: string }>()

const db = useDbStore()
const auth = useAuthStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()
const today = todayISO()

const v = computed(() => db.vehicleMap.get(props.id))
const type = computed(() => (v.value ? db.typeMap.get(v.value.typeId) : undefined))
const history = computed(() => db.recordsByVehicle.get(props.id) ?? [])
const canEdit = computed(() => !!v.value && auth.canEditDivision(v.value.divisionId))

type Tab = 'info' | 'cost' | 'inspection' | 'records' | 'files'
const TABS: { key: Tab; label: string; icon: Component }[] = [
  { key: 'info', label: '基本情報', icon: FileText },
  { key: 'cost', label: '取得費用', icon: Coins },
  { key: 'inspection', label: '車検・点検履歴', icon: CalendarDays },
  { key: 'records', label: '修理・整備履歴', icon: Wrench },
  { key: 'files', label: '添付資料', icon: Paperclip },
]
const tab = ref<Tab>((route.query.tab as Tab) || 'info')
watch(tab, (t) => router.replace({ query: t === 'info' ? {} : { tab: t } }))

// ---- 写真 ----
interface Shot {
  key: string
  label: string
  kind: 'illus' | 'mirror' | 'placeholder' | 'photo'
  icon?: Component
  src?: string
}
const shots = computed<Shot[]>(() => [
  { key: 'r', label: '右側面', kind: 'illus' },
  { key: 'l', label: '左側面', kind: 'mirror' },
  ...(v.value?.photos ?? []).map((p) => ({ key: p.id, label: p.label, kind: 'photo' as const, src: p.src })),
  { key: 'cab', label: '運転席', kind: 'placeholder', icon: Gauge },
  { key: 'eng', label: 'エンジンルーム', kind: 'placeholder', icon: Cog },
  { key: 'tire', label: 'タイヤ', kind: 'placeholder', icon: CircleDot },
  { key: 'vin', label: '車台番号', kind: 'placeholder', icon: Barcode },
])
const shotIndex = ref(0)
const shot = computed(() => shots.value[shotIndex.value] ?? shots.value[0]!)
const zoomOpen = ref(false)
const step = (d: number) => (shotIndex.value = (shotIndex.value + d + shots.value.length) % shots.value.length)

async function addPhoto(e: Event) {
  const input = e.target as HTMLInputElement
  const files = [...(input.files ?? [])]
  input.value = ''
  if (!v.value || !files.length) return
  const photos = [...v.value.photos]
  for (const f of files.slice(0, 6)) {
    if (!f.type.startsWith('image/')) continue
    photos.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, label: f.name.replace(/\.[^.]+$/, ''), src: await downscaleImage(f, 960) })
  }
  db.updateVehicle(v.value.id, { photos })
  shotIndex.value = 2
  ui.toast('写真を追加しました')
}

async function removePhoto(id: string) {
  if (!v.value) return
  if (!(await ui.confirm({ title: '写真の削除', message: 'この写真を削除しますか？', confirmText: '削除する', tone: 'danger' }))) return
  db.updateVehicle(v.value.id, { photos: v.value.photos.filter((p) => p.id !== id) })
  shotIndex.value = 0
}

// ---- 費用・指標 ----
const acquisitionTotal = computed(() => (v.value ? v.value.bodyPrice + v.value.equipmentPrice + v.value.acquisitionMisc : 0))
const daysToExpiry = computed(() => (v.value ? diffDays(v.value.inspectionExpiry, today) : 0))
const fy = fiscalYearOf(today)
const costThisFy = computed(() => history.value.filter((r) => r.accountingDate >= fiscalYearRange(fy).from).reduce((s, r) => s + r.totalCost, 0))
const costPrevFy = computed(() => {
  const r = fiscalYearRange(fy - 1)
  return history.value.filter((x) => x.accountingDate >= r.from && x.accountingDate <= r.to).reduce((s, x) => s + x.totalCost, 0)
})
const costAll = computed(() => history.value.reduce((s, r) => s + r.totalCost, 0))
const yearsOwned = computed(() => (v.value ? diffDays(today, v.value.introducedOn) / 365 : 0))

const inspectionRecords = computed(() => history.value.filter((r) => r.category === 'inspection' || r.workType.includes('点検')))
const repairRecords = computed(() => history.value.filter((r) => r.category !== 'inspection' && !r.workType.includes('点検')))
const nextCheck = computed(() => inspectionRecords.value.find((r) => r.nextLabel)?.nextLabel ?? '—')

const recPage = usePagination(computed(() => (tab.value === 'inspection' ? inspectionRecords.value : repairRecords.value)), 12)

// ---- 添付資料 ----
async function addAttachment(e: Event) {
  const input = e.target as HTMLInputElement
  const files = [...(input.files ?? [])]
  input.value = ''
  if (!v.value || !files.length) return
  const list: VehicleAttachment[] = [
    ...v.value.attachments,
    ...files.map((f) => ({ id: `${Date.now()}-${f.name}`, name: f.name, kind: 'その他' as const, size: f.size, uploadedAt: today })),
  ]
  db.updateVehicle(v.value.id, { attachments: list })
  ui.toast(`${files.length}件の資料を登録しました（デモではファイル名のみ保存）`)
}

const INFO_ICON: Record<string, Component> = { Hash, IdCard, Network, Truck, Layers, Factory, Barcode, CalendarDays, Route, Activity, Package, Timer }
const infoRows = computed(() => {
  const x = v.value
  if (!x) return []
  return [
    ['Hash', '車両管理番号', x.id, 'IdCard', '車両ナンバー', x.plateNumber],
    ['Network', '所属事業部', db.divisionName(x.divisionId), 'Truck', '車両区分', db.categoryMap.get(x.categoryId)?.name ?? ''],
    ['Truck', '車両タイプ', type.value?.name ?? '', 'Factory', 'メーカー', x.maker],
    ['Layers', '車種・型式', `${x.model}（${x.modelCode}）`, 'Barcode', '車台番号', x.chassisNumber],
    ['CalendarDays', '初度登録年月', fmtYearMonth(x.firstRegistration), 'CalendarDays', '導入年月日', fmtJpDate(x.introducedOn)],
    ['CalendarDays', '車検満了日', '__expiry__', 'Route', '走行距離', `${num(x.mileage)} km`],
    ['Activity', '使用状況', '__status__', 'Package', '取得区分', ACQUISITION_LABELS[x.acquisitionType]],
    ['Package', '積載量・能力', x.capacity || '—', 'Timer', 'アワーメーター', x.hourMeter === null ? '—' : `${num(x.hourMeter)} h`],
  ]
})
</script>

<template>
  <div v-if="!v" class="card mx-auto mt-10 max-w-lg p-8 text-center">
    <p class="text-lg font-black text-navy-900">車両「{{ id }}」が見つかりません</p>
    <RouterLink to="/vehicles" class="btn btn-primary mt-4">車両台帳一覧へ</RouterLink>
  </div>

  <div v-else>
    <PageHeader title="車両詳細" :icon="CarFront" description="選択した車両の情報・写真・取得費用・履歴を詳細に確認できます。" />

    <nav class="mb-3 flex items-center gap-1.5 text-[13px] text-ink-2" aria-label="パンくずリスト">
      <RouterLink to="/" class="flex items-center gap-1 hover:text-brand-700"><House class="size-4" />ホーム</RouterLink>
      <ChevronRight class="size-3.5" />
      <RouterLink to="/vehicles" class="hover:text-brand-700">車両台帳</RouterLink>
      <ChevronRight class="size-3.5" />
      <span class="font-bold text-ink">車両詳細（{{ v.id }}）</span>
    </nav>

    <!-- 概要バー -->
    <div class="card mb-3 flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3">
      <div class="flex items-center gap-3">
        <Truck class="size-10 text-brand-600" :stroke-width="1.8" />
        <div>
          <p class="text-[11px] font-bold text-ink-2">車両管理番号</p>
          <p class="text-[28px] font-black leading-none text-navy-900">{{ v.id }}</p>
        </div>
      </div>
      <span class="hidden h-10 w-px bg-line md:block" />
      <div class="flex items-center gap-3">
        <IdCard class="size-7 text-brand-600" />
        <div>
          <p class="text-[11px] font-bold text-ink-2">車両ナンバー</p>
          <p class="text-[19px] font-black text-navy-900">{{ v.plateNumber }}</p>
        </div>
      </div>
      <span class="hidden h-10 w-px bg-line md:block" />
      <div class="min-w-0">
        <p class="text-[17px] font-black text-navy-900">{{ v.maker }} {{ v.model }}（{{ v.modelCode }}）</p>
        <p class="mt-1 flex flex-wrap gap-1.5">
          <CategoryBadge :category-id="v.categoryId" full />
          <span class="badge badge-muted">{{ type?.name }}</span>
          <span class="badge badge-info">{{ db.divisionName(v.divisionId) }}</span>
        </p>
      </div>
      <div class="ml-auto flex flex-wrap items-center gap-2">
        <StatusBadge :status="v.status" class="h-8 px-3 text-[13px]" />
        <RouterLink v-if="canEdit" :to="{ name: 'vehicle-edit', params: { id: v.id } }" class="btn btn-outline"><Pencil class="size-4" />台帳を編集</RouterLink>
        <RouterLink v-if="canEdit" :to="{ name: 'maintenance-new', query: { vehicle: v.id } }" class="btn btn-outline"><Wrench class="size-4" />修理・整備を登録</RouterLink>
        <button class="btn btn-soft" @click="router.back()"><Undo2 class="size-4" />一覧に戻る</button>
      </div>
    </div>

    <!-- タブ -->
    <div class="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" role="tablist">
      <button
        v-for="t in TABS"
        :key="t.key"
        role="tab"
        :aria-selected="tab === t.key"
        class="flex h-11 items-center justify-center gap-2 rounded-xl border text-[14.5px] font-bold transition"
        :class="tab === t.key ? 'border-transparent bg-gradient-to-b from-[#2f82ef] to-[#1a62d3] text-white shadow-[0_4px_12px_rgba(27,99,214,0.35)]' : 'border-line bg-white/80 text-navy-900 hover:bg-white'"
        @click="(tab = t.key), (recPage.page.value = 1)"
      >
        <component :is="t.icon" class="size-5" />{{ t.label }}
      </button>
    </div>

    <!-- 基本情報 -->
    <template v-if="tab === 'info'">
      <div class="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[0.92fr_1.5fr]">
        <SectionCard title="車両写真" :icon="Camera" body-class="p-3">
          <div class="relative overflow-hidden rounded-xl bg-gradient-to-b from-[#cfe2f8] via-[#eef5fd] to-[#d6dee9]" style="aspect-ratio: 16 / 9">
            <svg viewBox="0 0 320 180" class="absolute inset-0 size-full" preserveAspectRatio="none" aria-hidden="true">
              <g fill="#a9c0dc" opacity="0.6">
                <rect x="10" y="70" width="14" height="60" /><rect x="30" y="50" width="10" height="80" /><rect x="46" y="88" width="50" height="42" />
                <circle cx="260" cy="104" r="26" /><rect x="234" y="104" width="52" height="26" /><rect x="292" y="80" width="10" height="50" />
              </g>
              <rect x="0" y="128" width="320" height="52" fill="#c4ceda" />
              <path d="M0 150 H320" stroke="#e9eef4" stroke-width="2" stroke-dasharray="18 14" />
            </svg>
            <template v-if="shot.kind === 'illus' || shot.kind === 'mirror'">
              <VehicleIllustration v-if="type" :kind="type.bodyKind" :size="type.sizeClass" :seed="v.id" :mirrored="shot.kind === 'mirror'" class="absolute inset-x-[6%] bottom-[9%] w-[88%]" />
            </template>
            <img v-else-if="shot.kind === 'photo'" :src="shot.src" :alt="shot.label" class="absolute inset-0 size-full object-cover" />
            <div v-else class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/70 text-ink-2 backdrop-blur-[2px]">
              <component :is="shot.icon" class="size-14 text-brand-400" :stroke-width="1.4" />
              <span class="text-[13px] font-bold">{{ shot.label }}の写真は未登録です</span>
            </div>
            <button class="gal-btn left-2" aria-label="前の写真" @click="step(-1)"><ChevronLeft class="size-5" /></button>
            <button class="gal-btn right-2" aria-label="次の写真" @click="step(1)"><ChevronRight class="size-5" /></button>
            <span class="absolute bottom-2 right-2 flex items-center gap-2 rounded-md bg-navy-950/70 px-2 py-1 text-[12px] font-bold text-white">
              {{ shotIndex + 1 }} / {{ shots.length }}
              <button aria-label="拡大表示" @click="zoomOpen = true"><Maximize2 class="size-4" /></button>
            </span>
            <span class="absolute left-2 top-2 rounded bg-white/85 px-2 py-0.5 text-[11px] font-bold text-ink-2">{{ shot.label }}</span>
          </div>
          <div class="mt-2 flex gap-2 overflow-x-auto pb-1 scroll-thin">
            <button
              v-for="(s, i) in shots"
              :key="s.key"
              class="relative h-[52px] w-[78px] shrink-0 overflow-hidden rounded-lg border-2 bg-gradient-to-b from-[#eaf2fc] to-[#d5e1ef]"
              :class="i === shotIndex ? 'border-brand-500' : 'border-transparent'"
              :aria-label="s.label"
              @click="shotIndex = i"
            >
              <VehicleIllustration v-if="(s.kind === 'illus' || s.kind === 'mirror') && type" :kind="type.bodyKind" :size="type.sizeClass" :seed="v.id" :mirrored="s.kind === 'mirror'" :show-shadow="false" class="absolute inset-x-1 bottom-0.5" />
              <img v-else-if="s.kind === 'photo'" :src="s.src" alt="" class="size-full object-cover" />
              <component :is="s.icon" v-else class="absolute inset-0 m-auto size-6 text-brand-400" />
            </button>
            <label v-if="canEdit" class="flex h-[52px] w-[78px] shrink-0 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-brand-300 text-[11px] font-bold text-brand-600 hover:bg-brand-50">
              <ImagePlus class="size-5" />写真を追加
              <input type="file" accept="image/*" multiple class="sr-only" @change="addPhoto" />
            </label>
          </div>
          <p class="mt-1.5 flex items-center justify-between text-[11px] text-ink-3">
            デモ版のため、写真の代わりに車両タイプのイラストを表示しています。
            <button v-if="shot.kind === 'photo' && canEdit" class="flex items-center gap-1 font-bold text-[#c9262d]" @click="removePhoto(shot.key)"><Trash2 class="size-3.5" />削除</button>
          </p>
        </SectionCard>

        <div class="flex min-w-0 flex-col gap-3">
          <SectionCard title="基本情報" sub="（車両の概要・仕様・利用状況）" :icon="FileText" body-class="p-0">
            <dl class="grid grid-cols-1 md:grid-cols-2">
              <template v-for="row in infoRows" :key="row[1]">
                <div v-for="k in [0, 3]" :key="k" class="flex items-center gap-2 border-b border-line-soft px-4 py-[7px] text-[13px] md:[&:nth-child(odd)]:border-r">
                  <component :is="INFO_ICON[row[k]!]" class="size-4 shrink-0 text-brand-600" />
                  <dt class="w-[104px] shrink-0 font-bold text-ink-2">{{ row[k + 1] }}</dt>
                  <dd class="min-w-0 flex-1 font-bold">
                    <template v-if="row[k + 2] === '__expiry__'">
                      <span :class="daysToExpiry <= 60 ? 'text-[#c9262d]' : daysToExpiry <= 180 ? 'text-[#c9262d]' : ''">{{ fmtJpDate(v.inspectionExpiry) }}</span>
                      <span class="ml-1 text-[12px]" :class="daysToExpiry <= 180 ? 'text-[#c9262d]' : 'text-ink-2'">（{{ fmtRemaining(daysToExpiry) }}）</span>
                    </template>
                    <StatusBadge v-else-if="row[k + 2] === '__status__'" :status="v.status" />
                    <template v-else>{{ row[k + 2] }}</template>
                  </dd>
                </div>
              </template>
            </dl>
          </SectionCard>

          <div class="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <div class="cost-card"><Truck class="size-6 text-brand-600" /><span><span class="block text-[11.5px] font-bold text-ink-2">車両本体価格</span><span class="tnum text-[19px] font-black">{{ yen(v.bodyPrice) }}</span></span></div>
            <div class="cost-card"><Package class="size-6 text-brand-600" /><span><span class="block text-[11.5px] font-bold text-ink-2">架装・付属設備費</span><span class="tnum text-[19px] font-black">{{ yen(v.equipmentPrice) }}</span></span></div>
            <div class="cost-card"><Calculator class="size-6 text-brand-600" /><span><span class="block text-[11.5px] font-bold text-ink-2">取得諸費用</span><span class="tnum text-[19px] font-black">{{ yen(v.acquisitionMisc) }}</span></span></div>
            <div class="cost-card !border-transparent bg-gradient-to-b from-[#2f82ef] to-[#1652b2] text-white"><Coins class="size-6" /><span><span class="block text-[11.5px] font-bold text-white/85">総取得額</span><span class="tnum text-[21px] font-black">{{ yen(acquisitionTotal) }}</span></span></div>
          </div>

          <div class="card flex items-stretch overflow-hidden">
            <span class="flex w-24 shrink-0 items-center justify-center gap-1.5 bg-[#f1f6fd] text-[14px] font-black text-navy-900"><FileText class="size-5 text-brand-600" />備考</span>
            <p class="flex-1 whitespace-pre-line px-4 py-3 text-[13.5px] leading-relaxed">{{ v.note || '—' }}</p>
          </div>
        </div>
      </div>

      <SectionCard title="修理・整備／車検・点検の履歴" sub="（直近の実施内容）" :icon="Wrench" body-class="p-0">
        <template #actions>
          <button class="head-chip" @click="tab = 'records'"><List class="size-3.5" />すべての履歴を見る</button>
        </template>
        <div class="overflow-x-auto">
          <table class="tbl tbl-compact">
            <thead>
              <tr><th>実施日</th><th>区分</th><th>種別</th><th>実施内容</th><th>実施先</th><th class="text-right">費用（税込）</th><th>状況</th><th>次回予定</th></tr>
            </thead>
            <tbody>
              <tr v-for="r in history.slice(0, 5)" :key="r.id">
                <td class="tnum whitespace-nowrap">{{ fmtDate(r.date) }}</td>
                <td><RecordKindBadge :record="r" /></td>
                <td class="whitespace-nowrap font-bold">{{ r.workType }}</td>
                <td class="min-w-[240px]">{{ r.description }}</td>
                <td class="whitespace-nowrap">{{ db.vendorMap.get(r.vendorId)?.name }}</td>
                <td class="tnum text-right">{{ yen(r.totalCost) }}</td>
                <td><RecordStateBadge :record="r" /></td>
                <td class="tnum whitespace-nowrap">{{ r.nextLabel ?? '—' }}</td>
              </tr>
              <tr v-if="!history.length"><td colspan="8" class="py-8 text-center text-ink-3">履歴はまだありません</td></tr>
            </tbody>
          </table>
        </div>
      </SectionCard>
    </template>

    <!-- 取得費用 -->
    <div v-else-if="tab === 'cost'" class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <SectionCard title="取得費用の内訳" :icon="Coins" body-class="p-0">
        <table class="tbl">
          <tbody>
            <tr><th class="w-48">取得区分</th><td>{{ ACQUISITION_LABELS[v.acquisitionType] }}</td></tr>
            <tr><th>導入年月日</th><td>{{ fmtJpDate(v.introducedOn) }}（保有 {{ yearsOwned.toFixed(1) }}年）</td></tr>
            <tr v-if="v.acquisitionType === 'lease'"><th>リース会社</th><td>{{ v.leaseCompany }}（満了 {{ fmtJpDate(v.leaseEnd) }}）</td></tr>
            <tr><th>車両本体価格</th><td class="tnum text-right">{{ yen(v.bodyPrice) }}</td></tr>
            <tr><th>架装・付属設備費</th><td class="tnum text-right">{{ yen(v.equipmentPrice) }}</td></tr>
            <tr><th>取得諸費用</th><td class="tnum text-right">{{ yen(v.acquisitionMisc) }}</td></tr>
            <tr><th class="!bg-brand-100">総取得額</th><td class="tnum text-right text-[16px] font-black">{{ yen(acquisitionTotal) }}</td></tr>
          </tbody>
        </table>
      </SectionCard>
      <SectionCard title="保有コストの目安" :icon="Calculator">
        <div class="grid grid-cols-2 gap-3">
          <div class="cost-card"><span><span class="block text-[12px] font-bold text-ink-2">今期の修理・整備費</span><span class="tnum text-[20px] font-black">{{ yen(costThisFy) }}</span></span></div>
          <div class="cost-card"><span><span class="block text-[12px] font-bold text-ink-2">前期の修理・整備費</span><span class="tnum text-[20px] font-black">{{ yen(costPrevFy) }}</span></span></div>
          <div class="cost-card"><span><span class="block text-[12px] font-bold text-ink-2">登録済み履歴の累計</span><span class="tnum text-[20px] font-black">{{ yen(costAll) }}</span></span></div>
          <div class="cost-card"><span><span class="block text-[12px] font-bold text-ink-2">取得額に対する累計修理費</span><span class="tnum text-[20px] font-black">{{ pct(acquisitionTotal ? costAll / acquisitionTotal : null) }}</span></span></div>
        </div>
        <p class="mt-3 text-[12px] text-ink-3">※累計は本システムに登録された履歴（直近約3年分）の合計です。</p>
      </SectionCard>
    </div>

    <!-- 車検・点検履歴 / 修理・整備履歴 -->
    <div v-else-if="tab === 'inspection' || tab === 'records'" class="space-y-4">
      <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
        <template v-if="tab === 'inspection'">
          <div class="cost-card"><CalendarDays class="size-6 text-[#c9262d]" /><span><span class="block text-[12px] font-bold text-ink-2">次回車検（満了日）</span><span class="text-[18px] font-black">{{ fmtDate(v.inspectionExpiry) }}<span class="ml-1 text-[12px] text-[#c9262d]">{{ fmtRemaining(daysToExpiry) }}</span></span></span></div>
          <div class="cost-card"><CalendarDays class="size-6 text-brand-600" /><span><span class="block text-[12px] font-bold text-ink-2">次回の点検予定</span><span class="text-[18px] font-black">{{ nextCheck }}</span></span></div>
          <div class="cost-card"><Timer class="size-6 text-brand-600" /><span><span class="block text-[12px] font-bold text-ink-2">車検の周期</span><span class="text-[18px] font-black">{{ v.inspectionCycleYears }}年ごと</span></span></div>
        </template>
        <template v-else>
          <div class="cost-card"><Coins class="size-6 text-brand-600" /><span><span class="block text-[12px] font-bold text-ink-2">今期の修理・整備費</span><span class="tnum text-[18px] font-black">{{ yen(costThisFy) }}</span></span></div>
          <div class="cost-card"><Coins class="size-6 text-ink-3" /><span><span class="block text-[12px] font-bold text-ink-2">前期の修理・整備費</span><span class="tnum text-[18px] font-black">{{ yen(costPrevFy) }}</span></span></div>
          <div class="cost-card"><Wrench class="size-6 text-brand-600" /><span><span class="block text-[12px] font-bold text-ink-2">修理・整備の件数</span><span class="tnum text-[18px] font-black">{{ repairRecords.length }}件</span></span></div>
        </template>
      </div>
      <SectionCard :title="tab === 'inspection' ? '車検・点検の履歴' : '修理・整備の履歴'" :icon="tab === 'inspection' ? CalendarDays : Wrench" body-class="p-0">
        <template #actions>
          <RouterLink v-if="canEdit" :to="{ name: 'maintenance-new', query: { vehicle: v.id } }" class="head-chip"><Plus class="size-3.5" />新規登録</RouterLink>
        </template>
        <div class="overflow-x-auto">
          <table class="tbl tbl-compact">
            <thead>
              <tr><th>実施日</th><th>区分</th><th>種別</th><th>修理箇所</th><th>実施内容</th><th>実施先</th><th class="text-right">走行距離</th><th class="text-right">修理・整備総額</th><th class="text-right">会社負担</th><th>状況</th><th>次回予定</th></tr>
            </thead>
            <tbody>
              <tr v-for="r in recPage.paged.value" :key="r.id">
                <td class="tnum whitespace-nowrap">{{ fmtDate(r.date) }}</td>
                <td><RecordKindBadge :record="r" /></td>
                <td class="whitespace-nowrap font-bold">{{ r.workType }}</td>
                <td class="whitespace-nowrap">{{ db.partMap.get(r.partId)?.name }}</td>
                <td class="min-w-[220px]">{{ r.description }}</td>
                <td class="whitespace-nowrap">{{ db.vendorMap.get(r.vendorId)?.name }}</td>
                <td class="tnum whitespace-nowrap text-right">{{ r.mileage === null ? '—' : `${num(r.mileage)} km` }}</td>
                <td class="tnum text-right">{{ yen(r.totalCost) }}</td>
                <td class="tnum text-right">{{ yen(r.companyCost) }}</td>
                <td><RecordStateBadge :record="r" /></td>
                <td class="tnum whitespace-nowrap">{{ r.nextLabel ?? '—' }}</td>
              </tr>
              <tr v-if="!recPage.total.value"><td colspan="11" class="py-8 text-center text-ink-3">履歴はまだありません</td></tr>
            </tbody>
          </table>
        </div>
        <div class="flex items-center justify-between border-t border-line-soft px-4 py-2.5">
          <span class="text-[12.5px] text-ink-2">全{{ recPage.total.value }}件</span>
          <PaginationBar v-model:page="recPage.page.value" :page-count="recPage.pageCount.value" />
        </div>
      </SectionCard>
    </div>

    <!-- 添付資料 -->
    <SectionCard v-else title="添付資料" :icon="Paperclip" body-class="p-0">
      <template #actions>
        <label v-if="canEdit" class="head-chip cursor-pointer"><Upload class="size-3.5" />資料を追加<input type="file" multiple class="sr-only" @change="addAttachment" /></label>
      </template>
      <table class="tbl">
        <thead><tr><th>種類</th><th>ファイル名</th><th class="text-right">サイズ</th><th>登録日</th><th class="text-center">操作</th></tr></thead>
        <tbody>
          <tr v-for="a in v.attachments" :key="a.id">
            <td><span class="badge badge-info">{{ a.kind }}</span></td>
            <td class="font-bold"><FileText class="mr-1.5 inline size-4 text-[#c9262d]" />{{ a.name }}</td>
            <td class="tnum text-right">{{ fileSize(a.size) }}</td>
            <td class="tnum">{{ fmtDate(a.uploadedAt) }}</td>
            <td class="text-center">
              <button class="btn btn-outline btn-sm" @click="ui.toast('デモ版のため実ファイルは保存されていません', 'info')"><Download class="size-3.5" />ダウンロード</button>
            </td>
          </tr>
        </tbody>
      </table>
    </SectionCard>

    <AppModal :open="zoomOpen" :title="`${v.id}　${vehicleName(v)}／${shot.label}`" width="1100px" @close="zoomOpen = false">
      <div class="relative overflow-hidden rounded-xl bg-gradient-to-b from-[#cfe2f8] to-[#e2e9f2]" style="aspect-ratio: 16 / 8">
        <VehicleIllustration v-if="(shot.kind === 'illus' || shot.kind === 'mirror') && type" :kind="type.bodyKind" :size="type.sizeClass" :seed="v.id" :mirrored="shot.kind === 'mirror'" class="absolute inset-x-[8%] bottom-[6%] w-[84%]" />
        <img v-else-if="shot.kind === 'photo'" :src="shot.src" :alt="shot.label" class="absolute inset-0 size-full object-contain" />
        <div v-else class="absolute inset-0 flex items-center justify-center text-ink-2">{{ shot.label }}の写真は未登録です</div>
      </div>
    </AppModal>
  </div>
</template>

<style scoped>
@layer components {
.gal-btn {
  position: absolute;
  top: 50%;
  display: flex;
  width: 2.25rem;
  height: 2.25rem;
  transform: translateY(-50%);
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: rgb(7 26 62 / 0.55);
  color: #fff;
}
.gal-btn:hover {
  background: rgb(7 26 62 / 0.75);
}
.cost-card {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.75rem 0.9rem;
  border-radius: 0.75rem;
  border: 1px solid var(--color-line);
  background: #fff;
  box-shadow: var(--shadow-card);
}
}
</style>
