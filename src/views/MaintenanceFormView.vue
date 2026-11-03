<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  Wrench,
  FilePen,
  CarFront,
  Search,
  Settings,
  FileText,
  CircleHelp,
  Camera,
  X,
  ImagePlus,
  Coins,
  Building2,
  ShieldCheck,
  Ellipsis,
  CircleCheck,
  CircleAlert,
  ClipboardList,
  ChevronRight,
  Lightbulb,
  Check,
  Save,
  ChevronsRight,
  Sparkles,
  ClipboardCheck,
  Undo2,
  Plus,
} from '@lucide/vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import AppModal from '@/components/ui/AppModal.vue'
import MoneyInput from '@/components/ui/MoneyInput.vue'
import VehiclePickerModal from '@/components/vehicle/VehiclePickerModal.vue'
import { useDbStore } from '@/stores/db'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { addYears, fmtDate, fmtJpDate, todayISO } from '@/utils/date'
import { num, yen } from '@/utils/format'
import { downscaleImage } from '@/utils/image'
import { COST_CATEGORY_LABELS, INSURANCE_LABELS, vehicleName } from '@/mock/catalog'
import type { CostCategory, InsuranceStatus, MaintenanceRecord, RecordStatus } from '@/types'

const db = useDbStore()
const auth = useAuthStore()
const ui = useUiStore()
const route = useRoute()
const today = todayISO()
const DRAFT_KEY = 'douko-vehicle-demo:maintenance-draft'

interface Form {
  vehicleId: string
  date: string
  accountingDate: string
  category: CostCategory
  partId: string
  workType: string
  status: RecordStatus
  description: string
  vendorId: string
  mileage: number | null
  hourMeter: number | null
  totalCost: number | null
  companyCost: number | null
  insuranceCost: number | null
  otherCost: number | null
  insuranceStatus: InsuranceStatus
  note: string
  inRepair: boolean
  newExpiry: string
  photos: string[]
}

const blank = (): Form => ({
  vehicleId: typeof route.query.vehicle === 'string' ? route.query.vehicle : '',
  date: today,
  accountingDate: today,
  category: 'repair',
  partId: '',
  workType: '',
  status: 'confirmed',
  description: '',
  vendorId: '',
  mileage: null,
  hourMeter: null,
  totalCost: null,
  companyCost: null,
  insuranceCost: 0,
  otherCost: 0,
  insuranceStatus: 'none',
  note: '',
  inRepair: false,
  newExpiry: '',
  photos: [],
})

const form = reactive<Form>(blank())
const step = ref<1 | 2 | 3>(1)
const errors = ref<Record<string, string>>({})
const touched = ref(false)
const saved = ref<MaintenanceRecord | null>(null)

const vehicles = computed(() => db.vehicles.filter((v) => !auth.scopeDivisionId || v.divisionId === auth.scopeDivisionId))
const vehicle = computed(() => db.vehicleMap.get(form.vehicleId))
const vendors = computed(() => db.vendors.filter((w) => w.active))
const parts = computed(() =>
  db.parts.filter((p) => (form.category === 'inspection' || form.category === 'maintenance' ? true : p.id !== 'P00')),
)

// 車両を選んだら走行距離などを初期表示
watch(
  () => form.vehicleId,
  (id) => {
    const v = db.vehicleMap.get(id)
    if (!v) return
    if (form.mileage === null) form.mileage = v.mileage
    if (form.hourMeter === null && v.hourMeter !== null) form.hourMeter = v.hourMeter
    form.newExpiry = addYears(v.inspectionExpiry, v.inspectionCycleYears)
  },
  { immediate: true },
)
watch(
  () => form.category,
  (c) => {
    if (c === 'inspection') {
      form.partId = 'P00'
      if (!form.workType) form.workType = '車検（継続検査）'
    } else if (form.partId === 'P00' && c !== 'maintenance') form.partId = ''
    if (c !== 'repair') form.inRepair = false
  },
)

// ---- 費用の集計 ----
const burdenSum = computed(() => (form.companyCost ?? 0) + (form.insuranceCost ?? 0) + (form.otherCost ?? 0))
const costReady = computed(() => form.totalCost !== null && form.companyCost !== null)
const costMatch = computed(() => costReady.value && burdenSum.value === form.totalCost)
const remainder = computed(() => (form.totalCost ?? 0) - (form.insuranceCost ?? 0) - (form.otherCost ?? 0))

function fillCompany() {
  form.companyCost = Math.max(0, remainder.value)
}

// ---- 入力チェック ----
function validate(): boolean {
  const e: Record<string, string> = {}
  if (!form.vehicleId || !vehicle.value) e.vehicleId = '対象車両を選択してください'
  else if (!auth.canEditDivision(vehicle.value.divisionId)) e.vehicleId = '所属事業部が異なる車両は登録できません'
  if (!form.date) e.date = '実施日を入力してください'
  else if (form.date > today) e.date = '実施日に未来の日付は指定できません'
  if (!form.accountingDate) e.accountingDate = '費用計上日を入力してください'
  if (!form.partId) e.partId = '修理箇所を選択してください'
  if (!form.description.trim()) e.description = '内容を入力してください'
  if (!form.vendorId) e.vendorId = '修理業者を選択してください'
  if (form.totalCost === null || form.totalCost <= 0) e.totalCost = '修理・整備総額を入力してください'
  if (form.companyCost === null) e.companyCost = '会社負担額を入力してください'
  if (form.insuranceCost === null) e.insuranceCost = '保険負担額を入力してください（なければ0）'
  if (costReady.value && !costMatch.value) e.cost = '修理・整備総額と負担額の合計が一致していません'
  if ((form.insuranceCost ?? 0) > 0 && form.insuranceStatus === 'none') e.insuranceStatus = '保険負担がある場合は保険処理状況を選択してください'
  errors.value = e
  return Object.keys(e).length === 0
}
watch(form, () => touched.value && validate(), { deep: true })

const filledRequired = computed(() => {
  const req = [form.vehicleId, form.date, form.accountingDate, form.partId, form.description.trim(), form.vendorId, form.totalCost, form.companyCost]
  return req.filter((x) => x !== '' && x !== null).length
})

function toConfirm() {
  touched.value = true
  if (!validate()) {
    ui.toast('入力内容を確認してください（赤枠の項目）', 'error')
    return
  }
  step.value = 2
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function save() {
  touched.value = true
  if (!validate()) {
    step.value = 1
    ui.toast('入力内容を確認してください（赤枠の項目）', 'error')
    return
  }
  const part = db.partMap.get(form.partId)
  const rec = db.addRecord({
    vehicleId: form.vehicleId,
    date: form.date,
    accountingDate: form.accountingDate,
    category: form.category,
    workType: form.workType.trim() || (form.category === 'repair' ? `${part?.name}修理` : COST_CATEGORY_LABELS[form.category]),
    partId: form.partId,
    description: form.description.trim(),
    vendorId: form.vendorId,
    mileage: form.mileage,
    hourMeter: form.hourMeter,
    totalCost: form.totalCost ?? 0,
    companyCost: form.companyCost ?? 0,
    insuranceCost: form.insuranceCost ?? 0,
    otherCost: form.otherCost ?? 0,
    insuranceStatus: form.insuranceStatus,
    status: form.status,
    returnDate: form.inRepair ? null : form.date,
    nextLabel: form.category === 'inspection' && form.newExpiry ? `${fmtDate(form.newExpiry).slice(0, 7)}（車検）` : null,
    note: form.note.trim(),
    photos: [...form.photos],
    createdBy: auth.user?.name ?? '',
  })
  if (form.category === 'inspection' && form.newExpiry && vehicle.value) {
    db.updateVehicle(vehicle.value.id, { inspectionExpiry: form.newExpiry })
  }
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* noop */
  }
  saved.value = rec
  step.value = 3
  ui.toast(`修理・整備履歴を登録しました（${rec.id}）`)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function again() {
  Object.assign(form, blank(), { vehicleId: '' })
  errors.value = {}
  touched.value = false
  saved.value = null
  step.value = 1
}

// ---- 下書き ----
function saveDraft() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...form, savedAt: new Date().toISOString() }))
    ui.toast('下書きを保存しました。あとで続きから入力できます。')
  } catch {
    ui.toast('下書きを保存できませんでした（写真の容量が大きい可能性があります）', 'error')
  }
}
const draftAvailable = ref(false)
onMounted(() => {
  try {
    draftAvailable.value = !!localStorage.getItem(DRAFT_KEY) && !route.query.vehicle
  } catch {
    draftAvailable.value = false
  }
})
function restoreDraft() {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}') as Partial<Form>
    Object.assign(form, blank(), d)
    ui.toast('下書きを読み込みました', 'info')
  } catch {
    /* noop */
  }
  draftAvailable.value = false
}

// ---- デモ用サンプル ----
function fillSample() {
  const v = vehicles.value.find((x) => x.categoryId === 'truck' && x.status === 'active') ?? vehicles.value[0]
  if (!v) return
  Object.assign(form, {
    vehicleId: v.id,
    date: today,
    accountingDate: today,
    category: 'repair',
    partId: 'P17',
    workType: 'バンパー板金・塗装',
    status: 'confirmed',
    description: 'バック時に構内ポールと接触。リアバンパーおよび左リアパネルの板金・塗装を実施。',
    vendorId: 'W12',
    mileage: v.mileage + 120,
    totalCost: 396_000,
    companyCost: 276_000,
    insuranceCost: 120_000,
    otherCost: 0,
    insuranceStatus: 'applying',
    note: '保険会社へ申請中（受付番号：A-76321）。進捗は事務にて管理。',
  })
}

// ---- 写真 ----
async function addPhotos(e: Event) {
  const input = e.target as HTMLInputElement
  const files = [...(input.files ?? [])]
  input.value = ''
  for (const f of files) {
    if (form.photos.length >= 10) {
      ui.toast('写真は最大10枚までです', 'error')
      break
    }
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
      ui.toast(`${f.name}：jpg / png / webp のみ登録できます`, 'error')
      continue
    }
    if (f.size > 10 * 1024 * 1024) {
      ui.toast(`${f.name}：1枚あたり10MBまでです`, 'error')
      continue
    }
    form.photos.push(await downscaleImage(f, 800, 0.72))
  }
}
const photoPreview = ref<string | null>(null)

// ---- 業者・車両の選択 ----
const vehiclePicker = ref(false)
const vendorPicker = ref(false)

const recent = computed(() => [...db.records].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3))

const STEPS = ['入力', '確認', '登録完了']
const CATEGORY_ICON = { repair: Wrench, maintenance: Settings, inspection: FileText, other: Ellipsis } as const
</script>

<template>
  <div>
    <PageHeader
      title="修理・整備履歴登録"
      :icon="Wrench"
      description="車両の修理・整備の履歴を、かんたん・すばやく登録できます。&#10;短時間で入力でき、ITが苦手な方でも迷わず登録できます。"
    />

    <div v-if="draftAvailable && step === 1" class="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-[#f3d29a] bg-[#fff8e8] px-4 py-2.5 text-[13px]">
      <FilePen class="size-5 text-[#a35d00]" />
      <span class="flex-1 font-bold text-[#7a4600]">保存された下書きがあります。続きから入力しますか？</span>
      <button class="btn btn-sm btn-outline" @click="restoreDraft">下書きを読み込む</button>
      <button class="btn btn-sm btn-soft" @click="draftAvailable = false">新しく入力する</button>
    </div>

    <div class="grid grid-cols-1 gap-4 xl:grid-cols-[1.45fr_1fr]">
      <!-- 左：入力フォーム -->
      <section class="card overflow-hidden">
        <div class="flex flex-wrap items-center gap-3 bg-gradient-to-r from-[#1553bd] via-[#2470dc] to-[#5b9cf0] px-5 py-3 text-white">
          <FilePen class="size-6" />
          <h2 class="text-[17px] font-black tracking-wide">修理・整備履歴の新規登録</h2>
          <ol class="ml-auto flex items-center gap-1.5" aria-label="入力の手順">
            <template v-for="(s, i) in STEPS" :key="s">
              <li
                class="flex h-7 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-bold"
                :class="step === i + 1 ? 'bg-white text-brand-700' : step > i + 1 ? 'bg-white/30 text-white' : 'bg-white/15 text-white/80'"
                :aria-current="step === i + 1 ? 'step' : undefined"
              >
                <Check v-if="step > i + 1" class="size-3.5" :stroke-width="3" /><span v-else>{{ i + 1 }}</span>{{ s }}
              </li>
              <ChevronRight v-if="i < 2" class="size-4 opacity-70" />
            </template>
          </ol>
        </div>

        <!-- STEP1：入力 -->
        <div v-if="step === 1" class="space-y-5 p-5">
          <div class="flex items-center justify-between">
            <h3 class="sec-title"><CarFront class="size-5" />基本情報（車両・日付・区分）</h3>
            <button type="button" class="flex items-center gap-1 text-[12px] font-bold text-brand-600 hover:underline" @click="fillSample"><Sparkles class="size-3.5" />デモ用のサンプルを入力</button>
          </div>
          <div class="grid grid-cols-[120px_1fr] items-center gap-x-4 gap-y-3.5">
            <span class="field-label req">対象車両</span>
            <div>
              <div class="flex gap-2">
                <select v-model="form.vehicleId" class="input" :class="errors.vehicleId ? 'is-invalid' : ''" aria-label="対象車両">
                  <option value="" disabled>車両を選択してください</option>
                  <option v-for="v in vehicles" :key="v.id" :value="v.id">{{ v.id }}　{{ vehicleName(v) }}（{{ db.categoryMap.get(v.categoryId)?.shortName }}）</option>
                </select>
                <button type="button" class="btn btn-primary shrink-0" @click="vehiclePicker = true"><Search class="size-4" />車両を選択</button>
              </div>
              <p v-if="vehicle" class="mt-1 text-[12px] text-ink-2">{{ vehicle.plateNumber }}／{{ db.divisionName(vehicle.divisionId) }}／車検満了 {{ fmtDate(vehicle.inspectionExpiry) }}</p>
              <p v-if="errors.vehicleId" class="field-error">{{ errors.vehicleId }}</p>
            </div>

            <span class="field-label req">実施日</span>
            <div class="grid grid-cols-1 items-center gap-x-4 gap-y-2 sm:grid-cols-[1fr_auto_1fr]">
              <div>
                <input v-model="form.date" type="date" :max="today" class="input" :class="errors.date ? 'is-invalid' : ''" aria-label="実施日" />
                <p v-if="errors.date" class="field-error">{{ errors.date }}</p>
              </div>
              <span class="field-label req">費用計上日</span>
              <input v-model="form.accountingDate" type="date" class="input" :class="errors.accountingDate ? 'is-invalid' : ''" aria-label="費用計上日" />
            </div>

            <span class="field-label req">費用区分</span>
            <div class="flex flex-wrap gap-x-6 gap-y-2" role="radiogroup" aria-label="費用区分">
              <label v-for="(l, k) in COST_CATEGORY_LABELS" :key="k" class="radio">
                <input v-model="form.category" type="radio" :value="k" class="sr-only" />
                <span class="radio-dot" />
                <component :is="CATEGORY_ICON[k]" class="size-4 text-brand-600" />{{ l }}
              </label>
            </div>
          </div>

          <h3 class="sec-title"><Settings class="size-5" />修理・整備の内容</h3>
          <div class="grid grid-cols-[120px_1fr] items-center gap-x-4 gap-y-3.5">
            <span class="field-label req">修理箇所</span>
            <div class="grid grid-cols-1 items-center gap-x-4 gap-y-2 sm:grid-cols-[1fr_auto_auto]">
              <div>
                <select v-model="form.partId" class="input" :class="errors.partId ? 'is-invalid' : ''" aria-label="修理箇所">
                  <option value="" disabled>選択してください</option>
                  <option v-for="p in parts" :key="p.id" :value="p.id">{{ p.name }}</option>
                </select>
                <p v-if="errors.partId" class="field-error">{{ errors.partId }}</p>
              </div>
              <span class="field-label req flex items-center gap-1">見込/確定<CircleHelp class="size-4 text-ink-3" title="金額が未確定の場合は「見込」で登録し、請求書の受領後に「確定」に変更します" /></span>
              <div class="flex gap-4" role="radiogroup" aria-label="見込/確定">
                <label class="radio"><input v-model="form.status" type="radio" value="estimate" class="sr-only" /><span class="radio-dot" />見込</label>
                <label class="radio"><input v-model="form.status" type="radio" value="confirmed" class="sr-only" /><span class="radio-dot" />確定</label>
              </div>
            </div>

            <span class="field-label">種別</span>
            <input v-model="form.workType" class="input" placeholder="例：クラッチ交換・調整（未入力の場合は修理箇所から自動設定）" />

            <span class="field-label req self-start pt-2">内容</span>
            <div>
              <textarea v-model="form.description" rows="2" maxlength="500" class="input" :class="errors.description ? 'is-invalid' : ''" placeholder="実施した内容を入力（例：クラッチディスクおよびカバーを交換。試運転にて正常動作を確認。）" />
              <div class="flex justify-between">
                <p class="field-error">{{ errors.description }}</p>
                <span class="text-[11px] text-ink-3">{{ form.description.length }} / 500 文字</span>
              </div>
            </div>

            <template v-if="form.category === 'repair'">
              <span class="field-label">車両の状態</span>
              <label class="flex items-center gap-2 text-[13px]"><input v-model="form.inRepair" type="checkbox" class="check" />まだ修理中（車両は復帰していない）</label>
            </template>
            <template v-if="form.category === 'inspection'">
              <span class="field-label">新しい車検満了日</span>
              <div class="flex flex-wrap items-center gap-3">
                <input v-model="form.newExpiry" type="date" class="input w-48" />
                <span class="text-[12px] text-ink-2">登録すると車両台帳の車検満了日も更新されます</span>
              </div>
            </template>
          </div>

          <h3 class="sec-title"><Wrench class="size-5" />業者・費用情報</h3>
          <div class="grid grid-cols-1 gap-x-6 gap-y-3.5 lg:grid-cols-2">
            <div class="grid grid-cols-[120px_1fr] items-center gap-x-4 gap-y-3.5">
              <span class="field-label req">修理業者</span>
              <div>
                <div class="flex gap-2">
                  <select v-model="form.vendorId" class="input" :class="errors.vendorId ? 'is-invalid' : ''" aria-label="修理業者">
                    <option value="" disabled>選択してください</option>
                    <option v-for="w in vendors" :key="w.id" :value="w.id">{{ w.name }}</option>
                  </select>
                  <button type="button" class="btn btn-primary btn-sm h-[38px] shrink-0" @click="vendorPicker = true"><Search class="size-3.5" />業者</button>
                </div>
                <p v-if="errors.vendorId" class="field-error">{{ errors.vendorId }}</p>
              </div>
              <span class="field-label req">修理・整備総額</span>
              <div>
                <MoneyInput v-model="form.totalCost" :invalid="!!errors.totalCost" aria-label="修理・整備総額" />
                <p v-if="errors.totalCost" class="field-error">{{ errors.totalCost }}</p>
              </div>
              <span class="field-label req">会社負担額</span>
              <div>
                <MoneyInput v-model="form.companyCost" :invalid="!!errors.companyCost || !!errors.cost" />
                <button v-if="form.totalCost && remainder >= 0 && form.companyCost !== remainder" type="button" class="mt-1 text-[11.5px] font-bold text-brand-600 hover:underline" @click="fillCompany">
                  残額 {{ yen(remainder) }} を会社負担に反映
                </button>
              </div>
              <span class="field-label req">保険負担額</span>
              <MoneyInput v-model="form.insuranceCost" :invalid="!!errors.insuranceCost" />
              <span class="field-label">その他負担額</span>
              <MoneyInput v-model="form.otherCost" />
            </div>
            <div class="grid grid-cols-[110px_1fr] items-center gap-x-4 gap-y-3.5 self-start">
              <span class="field-label">走行距離</span>
              <MoneyInput v-model="form.mileage" unit="km" />
              <span class="field-label">アワーメーター</span>
              <MoneyInput v-model="form.hourMeter" unit="h" placeholder="架装車両のみ" />
              <span class="field-label req">保険処理状況</span>
              <div>
                <select v-model="form.insuranceStatus" class="input" :class="errors.insuranceStatus ? 'is-invalid' : ''">
                  <option v-for="(l, k) in INSURANCE_LABELS" :key="k" :value="k">{{ l }}</option>
                </select>
                <p v-if="errors.insuranceStatus" class="field-error">{{ errors.insuranceStatus }}</p>
              </div>
              <span class="field-label self-start pt-2">備考</span>
              <div>
                <textarea v-model="form.note" rows="3" maxlength="500" class="input" placeholder="保険の受付番号、社内の申し送り事項など" />
                <span class="block text-right text-[11px] text-ink-3">{{ form.note.length }} / 500 文字</span>
              </div>
            </div>
          </div>
        </div>

        <!-- STEP2：確認 -->
        <div v-else-if="step === 2" class="p-5">
          <p class="mb-4 flex items-center gap-2 rounded-lg bg-brand-50 px-4 py-2.5 text-[13.5px] font-bold text-brand-700">
            <ClipboardCheck class="size-5" />以下の内容で登録します。よろしければ「この内容で登録」を押してください。
          </p>
          <table class="tbl">
            <tbody>
              <tr><th class="w-40">対象車両</th><td class="font-bold">{{ vehicle?.id }}　{{ vehicle?.plateNumber }}（{{ vehicle && vehicleName(vehicle) }}）</td></tr>
              <tr><th>実施日／費用計上日</th><td>{{ fmtJpDate(form.date) }}／{{ fmtJpDate(form.accountingDate) }}</td></tr>
              <tr><th>費用区分</th><td>{{ COST_CATEGORY_LABELS[form.category] }}（{{ form.status === 'estimate' ? '見込' : '確定' }}）</td></tr>
              <tr><th>修理箇所・種別</th><td>{{ db.partMap.get(form.partId)?.name }}<template v-if="form.workType">／{{ form.workType }}</template></td></tr>
              <tr><th>内容</th><td class="whitespace-pre-line">{{ form.description }}</td></tr>
              <tr><th>修理業者</th><td>{{ db.vendorMap.get(form.vendorId)?.name }}</td></tr>
              <tr><th>修理・整備総額</th><td class="tnum font-black">{{ yen(form.totalCost) }}</td></tr>
              <tr><th>負担の内訳</th><td class="tnum">会社 {{ yen(form.companyCost) }}／保険 {{ yen(form.insuranceCost) }}（{{ INSURANCE_LABELS[form.insuranceStatus] }}）／その他 {{ yen(form.otherCost) }}</td></tr>
              <tr><th>走行距離・アワー</th><td class="tnum">{{ form.mileage === null ? '—' : `${num(form.mileage)} km` }}／{{ form.hourMeter === null ? '—' : `${num(form.hourMeter)} h` }}</td></tr>
              <tr v-if="form.category === 'repair'"><th>車両の状態</th><td>{{ form.inRepair ? '修理中（未復帰）' : '車両復帰済み' }}</td></tr>
              <tr v-if="form.category === 'inspection'"><th>新しい車検満了日</th><td>{{ fmtJpDate(form.newExpiry) }}</td></tr>
              <tr><th>写真</th><td>{{ form.photos.length }}枚</td></tr>
              <tr><th>備考</th><td class="whitespace-pre-line">{{ form.note || '—' }}</td></tr>
            </tbody>
          </table>
        </div>

        <!-- STEP3：完了 -->
        <div v-else class="flex flex-col items-center px-5 py-12 text-center">
          <span class="flex size-16 items-center justify-center rounded-full bg-[#e2f5e9] text-[#13803f]"><CircleCheck class="size-9" /></span>
          <h3 class="mt-4 text-[20px] font-black text-navy-900">登録が完了しました</h3>
          <p class="mt-1 text-[14px] text-ink-2">登録番号：<b class="text-ink">{{ saved?.id }}</b>／{{ saved?.vehicleId }}　{{ saved && yen(saved.totalCost) }}</p>
          <div class="mt-6 flex flex-wrap justify-center gap-2">
            <button class="btn btn-primary" @click="again"><Plus class="size-4" />続けて登録する</button>
            <RouterLink v-if="saved" :to="{ name: 'vehicle-detail', params: { id: saved.vehicleId }, query: { tab: 'records' } }" class="btn btn-outline">車両詳細を見る</RouterLink>
            <RouterLink to="/maintenance" class="btn btn-outline">履歴一覧へ</RouterLink>
          </div>
        </div>
      </section>

      <!-- 右カラム -->
      <div class="space-y-4">
        <SectionCard title="故障箇所・破損箇所の写真" :icon="Camera" body-class="p-4">
          <div class="grid grid-cols-4 gap-2.5">
            <div v-for="(p, i) in form.photos" :key="i" class="group relative aspect-square overflow-hidden rounded-lg border border-line">
              <button class="size-full" :aria-label="`写真${i + 1}を拡大`" @click="photoPreview = p"><img :src="p" alt="" class="size-full object-cover" /></button>
              <button v-if="step === 1" class="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-navy-950/70 text-white hover:bg-[#cc2a31]" :aria-label="`写真${i + 1}を削除`" @click="form.photos.splice(i, 1)">
                <X class="size-3.5" :stroke-width="3" />
              </button>
            </div>
            <label v-if="step === 1 && form.photos.length < 10" class="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-brand-300 text-[12px] font-bold text-brand-600 hover:bg-brand-50">
              <ImagePlus class="size-7" />写真追加
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple class="sr-only" @change="addPhotos" />
            </label>
          </div>
          <p class="mt-2 flex flex-wrap justify-between gap-2 text-[11.5px] text-ink-2">
            <span>登録写真：{{ form.photos.length }}枚（最大10枚まで）</span>
            <span>対応形式：jpg / png / webp（1枚あたり10MBまで）</span>
          </p>
        </SectionCard>

        <SectionCard title="費用の集計" sub="（自動計算）" :icon="Coins" body-class="p-4">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1.2fr]">
            <div class="rounded-xl bg-gradient-to-b from-[#fff7ec] to-[#ffeacc] px-4 py-3">
              <p class="flex items-center gap-2 text-[13px] font-bold"><Wrench class="size-5 text-[#e77a00]" />修理総額</p>
              <p class="tnum mt-1 text-[32px] font-black leading-tight">{{ num(form.totalCost ?? 0) }}<span class="ml-0.5 text-[16px]">円</span></p>
            </div>
            <ul class="space-y-1.5 text-[13px]">
              <li class="flex items-center gap-2 rounded-lg bg-[#f2f6fd] px-3 py-1.5"><Building2 class="size-4 text-brand-600" /><span class="font-bold">会社負担</span><span class="tnum ml-auto font-black">{{ num(form.companyCost ?? 0) }} 円</span></li>
              <li class="flex items-center gap-2 rounded-lg bg-[#fff6ea] px-3 py-1.5"><ShieldCheck class="size-4 text-[#e77a00]" /><span class="font-bold">保険負担</span><span class="tnum ml-auto font-black">{{ num(form.insuranceCost ?? 0) }} 円</span></li>
              <li class="flex items-center gap-2 rounded-lg bg-[#f5f6f9] px-3 py-1.5"><Ellipsis class="size-4 text-ink-2" /><span class="font-bold">その他負担</span><span class="tnum ml-auto font-black">{{ num(form.otherCost ?? 0) }} 円</span></li>
            </ul>
          </div>
          <div
            class="mt-3 flex items-start gap-2.5 rounded-lg px-3 py-2.5"
            :class="!costReady ? 'bg-[#f3f6fa] text-ink-2' : costMatch ? 'bg-[#e2f5e9] text-[#0f6b35]' : 'bg-[#fde8e8] text-[#b4232a]'"
            role="status"
          >
            <CircleCheck v-if="costReady && costMatch" class="mt-0.5 size-5 shrink-0" />
            <CircleAlert v-else class="mt-0.5 size-5 shrink-0" />
            <div class="text-[12.5px]">
              <p class="text-[14px] font-black">{{ !costReady ? '金額を入力すると自動でチェックします' : costMatch ? '合計が一致しています' : '合計が一致していません' }}</p>
              <p class="tnum">修理総額 {{ num(form.totalCost ?? 0) }}円 {{ costMatch || !costReady ? '＝' : '≠' }} 会社負担 {{ num(form.companyCost ?? 0) }}円 ＋ 保険負担 {{ num(form.insuranceCost ?? 0) }}円 ＋ その他 {{ num(form.otherCost ?? 0) }}円</p>
              <p v-if="costReady && !costMatch" class="font-bold">差額：{{ yen((form.totalCost ?? 0) - burdenSum) }}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="最近登録した履歴" :icon="ClipboardList" body-class="p-0">
          <template #actions>
            <RouterLink to="/maintenance" class="head-chip">履歴一覧を見る<ChevronRight class="size-3.5" /></RouterLink>
          </template>
          <table class="tbl tbl-compact">
            <thead><tr><th>実施日</th><th>対象車両</th><th>修理箇所</th><th class="text-right">総額</th><th>状況</th></tr></thead>
            <tbody>
              <tr v-for="r in recent" :key="r.id">
                <td class="tnum whitespace-nowrap"><Wrench class="mr-1 inline size-3.5 text-brand-600" />{{ fmtDate(r.date) }}</td>
                <td class="font-bold">{{ r.vehicleId }}</td>
                <td class="whitespace-nowrap">{{ db.partMap.get(r.partId)?.name }}</td>
                <td class="tnum text-right">{{ yen(r.totalCost) }}</td>
                <td><span class="badge" :class="r.status === 'confirmed' ? 'badge-good' : 'badge-warn'">{{ r.status === 'confirmed' ? '確定' : '見込' }}</span></td>
              </tr>
            </tbody>
          </table>
        </SectionCard>

        <section class="relative overflow-hidden rounded-[14px] border border-[#f3d29a] bg-gradient-to-br from-[#fffaf0] to-[#fff1d6] p-4 shadow-card">
          <h2 class="flex items-center gap-2 text-[15px] font-black text-navy-900">
            <Lightbulb class="size-5 text-[#e8a317]" />入力のポイント<span class="text-[12px] font-bold text-[#a35d00]">（はじめての方でもカンタン！）</span>
          </h2>
          <ul class="mt-2 space-y-1.5 pr-16 text-[12.5px] leading-relaxed text-ink">
            <li class="flex gap-2"><CircleCheck class="mt-0.5 size-4 shrink-0 text-brand-600" />必須項目（<span class="text-[#e0383e]">＊</span>）を入力するだけで登録できます。（入力済み {{ filledRequired }} / 8）</li>
            <li class="flex gap-2"><CircleCheck class="mt-0.5 size-4 shrink-0 text-brand-600" />費用は「修理総額」と「会社・保険・その他の負担額」を入力します（合計が一致すると自動でチェックが入ります）。</li>
            <li class="flex gap-2"><CircleCheck class="mt-0.5 size-4 shrink-0 text-brand-600" />故障箇所の写真を登録すると、後からの確認や分析がスムーズになります。</li>
          </ul>
          <ClipboardCheck class="absolute bottom-3 right-3 size-14 text-brand-400/70" :stroke-width="1.5" />
        </section>
      </div>
    </div>

    <!-- 操作ボタン -->
    <div v-if="step !== 3" class="sticky bottom-3 z-20 mt-4 flex flex-wrap justify-center gap-3 rounded-2xl border border-white/70 bg-white/85 p-3 shadow-pop backdrop-blur">
      <template v-if="step === 1">
        <button class="action-btn" @click="saveDraft">
          <FileText class="size-7 text-ink-2" /><span><span class="block text-[16px] font-black">下書き保存</span><span class="block text-[11px] text-ink-2">あとで続きから入力できます</span></span>
        </button>
        <button class="action-btn" @click="toConfirm">
          <ClipboardCheck class="size-7 text-brand-600" /><span><span class="block text-[16px] font-black">入力内容を確認</span><span class="block text-[11px] text-ink-2">登録前に内容をチェックします</span></span>
        </button>
        <button class="action-btn action-primary" @click="save">
          <Save class="size-7" /><span><span class="block text-[17px] font-black">保存</span><span class="block text-[11px] text-white/85">この内容で登録します</span></span><ChevronsRight class="size-6" />
        </button>
      </template>
      <template v-else>
        <button class="action-btn" @click="step = 1">
          <Undo2 class="size-7 text-ink-2" /><span><span class="block text-[16px] font-black">入力に戻る</span><span class="block text-[11px] text-ink-2">内容を修正します</span></span>
        </button>
        <button class="action-btn action-primary" @click="save">
          <Save class="size-7" /><span><span class="block text-[17px] font-black">この内容で登録</span><span class="block text-[11px] text-white/85">修理・整備履歴に保存します</span></span><ChevronsRight class="size-6" />
        </button>
      </template>
    </div>

    <VehiclePickerModal :open="vehiclePicker" :division-id="auth.scopeDivisionId" @close="vehiclePicker = false" @select="(ids) => (form.vehicleId = ids[0] ?? '')" />

    <AppModal :open="vendorPicker" title="修理業者を選択" width="720px" @close="vendorPicker = false">
      <ul class="divide-y divide-line-soft rounded-lg border border-line">
        <li v-for="w in vendors" :key="w.id">
          <button class="flex w-full items-center gap-3 px-3 py-2.5 text-left text-[13px] hover:bg-brand-50" @click="(form.vendorId = w.id), (vendorPicker = false)">
            <span class="badge badge-info w-24 justify-center">{{ w.kind }}</span>
            <span class="flex-1 font-bold">{{ w.name }}</span>
            <span class="text-ink-2">{{ w.location }}</span>
            <span class="tnum w-28 text-right text-ink-3">{{ w.phone }}</span>
          </button>
        </li>
      </ul>
    </AppModal>

    <AppModal :open="!!photoPreview" title="写真の確認" width="900px" @close="photoPreview = null">
      <img v-if="photoPreview" :src="photoPreview" alt="登録写真" class="mx-auto max-h-[70vh] rounded-lg" />
    </AppModal>
  </div>
</template>

<style scoped>
.sec-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem;
  border-radius: 0.5rem;
  background: linear-gradient(90deg, #e3eefc, rgb(227 238 252 / 0));
  color: var(--color-navy-900);
  font-size: 15px;
  font-weight: 900;
}
.sec-title :deep(svg) {
  color: var(--color-brand-600);
}
.radio {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
.radio-dot {
  width: 1.15rem;
  height: 1.15rem;
  border-radius: 9999px;
  border: 2px solid #b6c6dc;
  background: #fff;
  transition: all 0.15s;
}
.radio:has(input:checked) .radio-dot {
  border-color: var(--color-brand-600);
  box-shadow: inset 0 0 0 3px #fff;
  background: var(--color-brand-600);
}
.radio:has(input:focus-visible) .radio-dot {
  outline: 2px solid var(--color-brand-500);
  outline-offset: 2px;
}
.action-btn {
  display: flex;
  min-width: 250px;
  align-items: center;
  gap: 0.85rem;
  padding: 0.7rem 1.4rem;
  border-radius: 0.9rem;
  border: 1px solid #c3d4ec;
  background: #fff;
  color: var(--color-navy-900);
  text-align: left;
  transition:
    background-color 0.15s,
    box-shadow 0.15s;
}
.action-btn:hover {
  background: var(--color-brand-50);
}
.action-primary {
  min-width: 320px;
  border: 0;
  color: #fff;
  background: linear-gradient(180deg, #2f82ef 0%, #1a62d3 100%);
  box-shadow: 0 6px 16px rgb(27 99 214 / 0.38);
}
.action-primary:hover {
  background: linear-gradient(180deg, #3a8af2 0%, #1d69dc 100%);
}
.action-primary > span {
  flex: 1;
}
</style>
