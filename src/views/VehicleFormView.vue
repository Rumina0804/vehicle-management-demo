<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Truck, Save, Undo2, FileText, Coins, CalendarDays, Activity, CircleAlert } from '@lucide/vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import MoneyInput from '@/components/ui/MoneyInput.vue'
import VehicleIllustration from '@/components/vehicle/VehicleIllustration.vue'
import { useDbStore, type VehicleInput } from '@/stores/db'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { addYears, todayISO } from '@/utils/date'
import { yen } from '@/utils/format'
import { ACQUISITION_LABELS, STATUS_LABELS } from '@/mock/catalog'
import type { AcquisitionType, CategoryId, VehicleStatus } from '@/types'

const props = defineProps<{ id?: string }>()
const db = useDbStore()
const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()
const today = todayISO()

const editing = computed(() => (props.id ? db.vehicleMap.get(props.id) : undefined))
const isEdit = computed(() => !!props.id)

const MAKERS = ['いすゞ自動車', '日野自動車', '三菱ふそう', 'UDトラックス', 'トヨタ自動車', '日産自動車', 'スズキ', 'ダイハツ工業', 'ホンダ', 'その他']

interface Form {
  plateNumber: string
  divisionId: string
  categoryId: CategoryId
  typeId: string
  maker: string
  model: string
  modelCode: string
  chassisNumber: string
  firstRegistration: string
  introducedOn: string
  inspectionExpiry: string
  inspectionCycleYears: 1 | 2
  mileage: number | null
  hourMeter: number | null
  status: VehicleStatus
  acquisitionType: AcquisitionType
  leaseCompany: string
  leaseEnd: string
  bodyPrice: number | null
  equipmentPrice: number | null
  acquisitionMisc: number | null
  capacity: string
  note: string
}

function initial(): Form {
  const v = editing.value
  if (v) {
    return {
      plateNumber: v.plateNumber,
      divisionId: v.divisionId,
      categoryId: v.categoryId,
      typeId: v.typeId,
      maker: v.maker,
      model: v.model,
      modelCode: v.modelCode,
      chassisNumber: v.chassisNumber,
      firstRegistration: v.firstRegistration,
      introducedOn: v.introducedOn,
      inspectionExpiry: v.inspectionExpiry,
      inspectionCycleYears: v.inspectionCycleYears,
      mileage: v.mileage,
      hourMeter: v.hourMeter,
      status: v.status,
      acquisitionType: v.acquisitionType,
      leaseCompany: v.leaseCompany,
      leaseEnd: v.leaseEnd ?? '',
      bodyPrice: v.bodyPrice,
      equipmentPrice: v.equipmentPrice,
      acquisitionMisc: v.acquisitionMisc,
      capacity: v.capacity,
      note: v.note,
    }
  }
  return {
    plateNumber: '',
    divisionId: auth.scopeDivisionId ?? '',
    categoryId: 'truck',
    typeId: 'medium',
    maker: '日野自動車',
    model: '',
    modelCode: '',
    chassisNumber: '',
    firstRegistration: today.slice(0, 7),
    introducedOn: today,
    inspectionExpiry: addYears(today, 2),
    inspectionCycleYears: 1,
    mileage: 0,
    hourMeter: null,
    status: 'active',
    acquisitionType: 'new',
    leaseCompany: '',
    leaseEnd: '',
    bodyPrice: null,
    equipmentPrice: null,
    acquisitionMisc: null,
    capacity: '',
    note: '',
  }
}

const form = reactive<Form>(initial())
const errors = ref<Record<string, string>>({})
const submitted = ref(false)

const typeOptions = computed(() => db.vehicleTypes.filter((t) => t.categoryId === form.categoryId))
watch(
  () => form.categoryId,
  () => {
    if (!typeOptions.value.some((t) => t.id === form.typeId)) form.typeId = typeOptions.value[0]?.id ?? ''
  },
)
const type = computed(() => db.typeMap.get(form.typeId))
const total = computed(() => (form.bodyPrice ?? 0) + (form.equipmentPrice ?? 0) + (form.acquisitionMisc ?? 0))
const divisionLocked = computed(() => !!auth.scopeDivisionId)

function validate() {
  const e: Record<string, string> = {}
  if (!form.plateNumber.trim()) e.plateNumber = '車両ナンバーを入力してください'
  else if (db.vehicles.some((v) => v.plateNumber.replace(/\s/g, '') === form.plateNumber.replace(/\s/g, '') && v.id !== props.id))
    e.plateNumber = 'このナンバーは既に登録されています'
  if (!form.divisionId) e.divisionId = '所属事業部を選択してください'
  if (!form.model.trim()) e.model = '車種を入力してください'
  if (!form.introducedOn) e.introducedOn = '導入年月日を入力してください'
  if (!form.inspectionExpiry) e.inspectionExpiry = '車検満了日を入力してください'
  if (form.mileage === null) e.mileage = '走行距離を入力してください'
  if (form.acquisitionType === 'lease' && !form.leaseCompany.trim()) e.leaseCompany = 'リース会社を入力してください'
  errors.value = e
  return Object.keys(e).length === 0
}
watch(form, () => submitted.value && validate(), { deep: true })

function save() {
  submitted.value = true
  if (!validate()) {
    ui.toast('入力内容を確認してください（赤枠の項目）', 'error')
    return
  }
  const data: VehicleInput = {
    plateNumber: form.plateNumber.trim(),
    divisionId: form.divisionId,
    categoryId: form.categoryId,
    typeId: form.typeId,
    maker: form.maker,
    model: form.model.trim(),
    modelCode: form.modelCode.trim(),
    chassisNumber: form.chassisNumber.trim(),
    firstRegistration: form.firstRegistration,
    introducedOn: form.introducedOn,
    inspectionExpiry: form.inspectionExpiry,
    inspectionCycleYears: form.inspectionCycleYears,
    mileage: form.mileage ?? 0,
    hourMeter: form.hourMeter,
    status: form.status,
    statusSince: editing.value?.statusSince ?? today,
    acquisitionType: form.acquisitionType,
    leaseCompany: form.acquisitionType === 'lease' ? form.leaseCompany : '',
    leaseEnd: form.acquisitionType === 'lease' && form.leaseEnd ? form.leaseEnd : null,
    bodyPrice: form.bodyPrice ?? 0,
    equipmentPrice: form.equipmentPrice ?? 0,
    acquisitionMisc: form.acquisitionMisc ?? 0,
    capacity: form.capacity,
    note: form.note,
  }
  if (editing.value) {
    db.updateVehicle(editing.value.id, data)
    ui.toast(`${editing.value.id} の台帳を更新しました`)
    router.push({ name: 'vehicle-detail', params: { id: editing.value.id } })
  } else {
    const v = db.addVehicle(data)
    ui.toast(`${v.id} を新規登録しました`)
    router.push({ name: 'vehicle-detail', params: { id: v.id } })
  }
}

const notAllowed = computed(() => editing.value && !auth.canEditDivision(editing.value.divisionId))
</script>

<template>
  <div>
    <PageHeader
      :title="isEdit ? '台帳を編集' : '新規車両登録'"
      :icon="Truck"
      :description="isEdit ? `${id} の車両情報を変更します。変更内容は「最近の更新」に記録されます。` : '新しく導入した車両を車両台帳に登録します。＊印は必須項目です。'"
    />

    <div v-if="isEdit && !editing" class="card p-8 text-center">車両「{{ id }}」が見つかりません</div>
    <div v-else-if="notAllowed" class="card p-8 text-center text-ink-2">この車両は所属事業部が異なるため編集できません。</div>

    <form v-else class="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]" novalidate @submit.prevent="save">
      <div class="space-y-4">
        <SectionCard title="基本情報" :icon="FileText" body-class="grid grid-cols-1 gap-x-5 gap-y-4 p-5 md:grid-cols-2">
          <label>
            <span class="field-label req mb-1">車両ナンバー</span>
            <input v-model="form.plateNumber" class="input" :class="errors.plateNumber ? 'is-invalid' : ''" placeholder="例：倉敷100 さ 12-34" />
            <p v-if="errors.plateNumber" class="field-error">{{ errors.plateNumber }}</p>
          </label>
          <label>
            <span class="field-label req mb-1">所属事業部</span>
            <select v-model="form.divisionId" class="input" :class="errors.divisionId ? 'is-invalid' : ''" :disabled="divisionLocked">
              <option value="" disabled>選択してください</option>
              <option v-for="d in db.activeDivisions" :key="d.id" :value="d.id">{{ d.name }}</option>
            </select>
            <p v-if="errors.divisionId" class="field-error">{{ errors.divisionId }}</p>
          </label>
          <label>
            <span class="field-label req mb-1">車両区分</span>
            <select v-model="form.categoryId" class="input">
              <option v-for="c in db.categories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </label>
          <label>
            <span class="field-label req mb-1">車両タイプ</span>
            <select v-model="form.typeId" class="input">
              <option v-for="t in typeOptions" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </label>
          <label>
            <span class="field-label req mb-1">メーカー</span>
            <select v-model="form.maker" class="input">
              <option v-for="mk in MAKERS" :key="mk" :value="mk">{{ mk }}</option>
            </select>
          </label>
          <label>
            <span class="field-label req mb-1">車種</span>
            <input v-model="form.model" class="input" :class="errors.model ? 'is-invalid' : ''" placeholder="例：レンジャー" />
            <p v-if="errors.model" class="field-error">{{ errors.model }}</p>
          </label>
          <label>
            <span class="field-label mb-1">型式</span>
            <input v-model="form.modelCode" class="input" placeholder="例：2PG-FD2ABG" />
          </label>
          <label>
            <span class="field-label mb-1">車台番号</span>
            <input v-model="form.chassisNumber" class="input" placeholder="例：FD2ABG-123456" />
          </label>
          <label>
            <span class="field-label mb-1">積載量・能力</span>
            <input v-model="form.capacity" class="input" placeholder="例：最大積載量 3,700kg" />
          </label>
          <label>
            <span class="field-label req mb-1">使用状況</span>
            <select v-model="form.status" class="input">
              <option v-for="(l, k) in STATUS_LABELS" :key="k" :value="k">{{ l }}</option>
            </select>
          </label>
        </SectionCard>

        <SectionCard title="登録・車検" :icon="CalendarDays" body-class="grid grid-cols-1 gap-x-5 gap-y-4 p-5 md:grid-cols-3">
          <label>
            <span class="field-label mb-1">初度登録年月</span>
            <input v-model="form.firstRegistration" type="month" class="input" />
          </label>
          <label>
            <span class="field-label req mb-1">導入年月日</span>
            <input v-model="form.introducedOn" type="date" class="input" :class="errors.introducedOn ? 'is-invalid' : ''" />
          </label>
          <label>
            <span class="field-label req mb-1">車検満了日</span>
            <input v-model="form.inspectionExpiry" type="date" class="input" :class="errors.inspectionExpiry ? 'is-invalid' : ''" />
            <p v-if="errors.inspectionExpiry" class="field-error">{{ errors.inspectionExpiry }}</p>
          </label>
          <label>
            <span class="field-label mb-1">車検の周期</span>
            <select v-model.number="form.inspectionCycleYears" class="input">
              <option :value="1">1年（貨物・特種用途など）</option>
              <option :value="2">2年（乗用・軽自動車など）</option>
            </select>
          </label>
          <label>
            <span class="field-label req mb-1">走行距離</span>
            <MoneyInput v-model="form.mileage" unit="km" :invalid="!!errors.mileage" />
          </label>
          <label>
            <span class="field-label mb-1">アワーメーター</span>
            <MoneyInput v-model="form.hourMeter" unit="h" placeholder="架装車両のみ" />
          </label>
        </SectionCard>

        <SectionCard title="取得費用" :icon="Coins" body-class="grid grid-cols-1 gap-x-5 gap-y-4 p-5 md:grid-cols-3">
          <label class="md:col-span-1">
            <span class="field-label req mb-1">取得区分</span>
            <select v-model="form.acquisitionType" class="input">
              <option v-for="(l, k) in ACQUISITION_LABELS" :key="k" :value="k">{{ l }}</option>
            </select>
          </label>
          <template v-if="form.acquisitionType === 'lease'">
            <label>
              <span class="field-label req mb-1">リース会社</span>
              <input v-model="form.leaseCompany" class="input" :class="errors.leaseCompany ? 'is-invalid' : ''" />
              <p v-if="errors.leaseCompany" class="field-error">{{ errors.leaseCompany }}</p>
            </label>
            <label>
              <span class="field-label mb-1">リース満了日</span>
              <input v-model="form.leaseEnd" type="date" class="input" />
            </label>
          </template>
          <div v-else class="hidden md:col-span-2 md:block" />
          <label>
            <span class="field-label mb-1">車両本体価格</span>
            <MoneyInput v-model="form.bodyPrice" />
          </label>
          <label>
            <span class="field-label mb-1">架装・付属設備費</span>
            <MoneyInput v-model="form.equipmentPrice" />
          </label>
          <label>
            <span class="field-label mb-1">取得諸費用</span>
            <MoneyInput v-model="form.acquisitionMisc" />
          </label>
          <label class="md:col-span-3">
            <span class="field-label mb-1">備考</span>
            <textarea v-model="form.note" rows="3" maxlength="500" class="input" placeholder="架装の内容や主な用途など" />
            <span class="mt-1 block text-right text-[11px] text-ink-3">{{ form.note.length }} / 500 文字</span>
          </label>
        </SectionCard>
      </div>

      <aside class="space-y-4">
        <SectionCard title="登録内容の確認" :icon="Activity" body-class="p-4">
          <div class="rounded-xl bg-gradient-to-b from-[#e3eefc] to-[#f6f9fd] p-3">
            <VehicleIllustration v-if="type" :kind="type.bodyKind" :size="type.sizeClass" :seed="id ?? 'new'" />
          </div>
          <dl class="mt-3 space-y-1.5 text-[13px]">
            <div class="flex justify-between"><dt class="text-ink-2">車両管理番号</dt><dd class="font-bold">{{ id ?? `${db.nextVehicleId()}（自動採番）` }}</dd></div>
            <div class="flex justify-between"><dt class="text-ink-2">車両タイプ</dt><dd class="font-bold">{{ type?.name }}</dd></div>
            <div class="flex justify-between"><dt class="text-ink-2">所属事業部</dt><dd class="font-bold">{{ form.divisionId ? db.divisionName(form.divisionId) : '—' }}</dd></div>
            <div class="flex justify-between border-t border-line-soft pt-1.5"><dt class="text-ink-2">総取得額</dt><dd class="tnum text-[16px] font-black">{{ yen(total) }}</dd></div>
          </dl>
          <p v-if="submitted && Object.keys(errors).length" class="mt-3 flex items-start gap-1.5 rounded-lg bg-[#fde8e8] px-3 py-2 text-[12px] font-bold text-[#b4232a]">
            <CircleAlert class="mt-0.5 size-4 shrink-0" />未入力・不正な項目が{{ Object.keys(errors).length }}件あります
          </p>
        </SectionCard>
        <button type="submit" class="btn btn-primary btn-lg w-full"><Save class="size-5" />{{ isEdit ? '変更を保存' : 'この内容で登録' }}</button>
        <button type="button" class="btn btn-soft w-full" @click="router.back()"><Undo2 class="size-4" />戻る</button>
      </aside>
    </form>
  </div>
</template>
