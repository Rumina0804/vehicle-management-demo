/**
 * デモ用のデータストア（ブラウザ内の簡易データベース）。
 * 本番では各アクションを Laravel の API 呼び出しに置き換える想定です。
 */
import { defineStore } from 'pinia'
import { computed, ref, toRaw } from 'vue'
import type {
  AppUser,
  AuditLog,
  DbState,
  Division,
  MaintenanceRecord,
  RepairPart,
  Vehicle,
  VehicleEvent,
  Vendor,
} from '@/types'
import { DB_VERSION, generateDb } from '@/mock/generate'
import { nowISO, todayISO } from '@/utils/date'
import { DIVISIONS } from '@/mock/catalog'

const STORAGE_KEY = 'douko-vehicle-demo:db'

function loadState(): DbState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DbState
    return parsed?.version === DB_VERSION ? parsed : null
  } catch {
    return null
  }
}

function pad(n: number, w: number) {
  return String(n).padStart(w, '0')
}

export type RecordInput = Omit<MaintenanceRecord, 'id' | 'createdAt' | 'divisionId'>
export type VehicleInput = Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt' | 'photos' | 'attachments'> & {
  photos?: Vehicle['photos']
}

export const useDbStore = defineStore('db', () => {
  const loaded = loadState()
  const state = ref<DbState>(loaded ?? generateDb())
  const storageWarning = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  function persistNow() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toRaw(state.value)))
      storageWarning.value = false
    } catch {
      storageWarning.value = true
    }
  }

  /** 変更をブラウザに保存（連続した更新はまとめて保存） */
  function commit() {
    clearTimeout(timer)
    timer = setTimeout(persistNow, 300)
  }

  if (!loaded) persistNow()

  // ---- 参照系 ---------------------------------------------------------
  const divisions = computed(() => [...state.value.divisions].sort((a, b) => a.sortOrder - b.sortOrder))
  const activeDivisions = computed(() => divisions.value.filter((d) => d.active))
  const categories = computed(() => [...state.value.categories].sort((a, b) => a.sortOrder - b.sortOrder))
  const vehicleTypes = computed(() => [...state.value.vehicleTypes].sort((a, b) => a.sortOrder - b.sortOrder))
  const vendors = computed(() => [...state.value.vendors].sort((a, b) => a.sortOrder - b.sortOrder))
  const parts = computed(() => [...state.value.parts].sort((a, b) => a.sortOrder - b.sortOrder))
  const vehicles = computed(() => state.value.vehicles)
  const records = computed(() => state.value.records)
  const users = computed(() => state.value.users)
  const auditLogs = computed(() => [...state.value.auditLogs].sort((a, b) => b.at.localeCompare(a.at)))
  const vehicleEvents = computed(() => [...state.value.vehicleEvents].sort((a, b) => b.at.localeCompare(a.at)))
  const budgets = computed(() => state.value.budgets)
  const fiscalYear = computed(() => state.value.fiscalYear)
  const generatedOn = computed(() => state.value.generatedOn)
  const readNoticeIds = computed(() => state.value.readNoticeIds)

  const divisionMap = computed(() => new Map(state.value.divisions.map((d) => [d.id, d])))
  const categoryMap = computed(() => new Map(state.value.categories.map((c) => [c.id, c])))
  const typeMap = computed(() => new Map(state.value.vehicleTypes.map((t) => [t.id, t])))
  const vendorMap = computed(() => new Map(state.value.vendors.map((v) => [v.id, v])))
  const partMap = computed(() => new Map(state.value.parts.map((p) => [p.id, p])))
  const vehicleMap = computed(() => new Map(state.value.vehicles.map((v) => [v.id, v])))
  const userByLogin = computed(() => new Map(state.value.users.map((u) => [u.loginId, u])))

  /** 車両ごとの履歴（実施日の新しい順） */
  const recordsByVehicle = computed(() => {
    const map = new Map<string, MaintenanceRecord[]>()
    for (const r of state.value.records) {
      const list = map.get(r.vehicleId)
      if (list) list.push(r)
      else map.set(r.vehicleId, [r])
    }
    for (const list of map.values()) list.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    return map
  })

  function divisionName(id: string | null | undefined, short = false): string {
    if (!id) return '本社'
    const d = divisionMap.value.get(id)
    return d ? (short ? d.shortName : d.name) : '—'
  }

  function userAffiliation(u: AppUser): string {
    return u.divisionId ? divisionName(u.divisionId) : `本社（${u.department || '管理部'}）`
  }

  // ---- 修理・整備履歴 ---------------------------------------------------
  function nextRecordId(): string {
    const max = state.value.records.reduce((m, r) => Math.max(m, Number(r.id.slice(2)) || 0), 0)
    return `M-${pad(max + 1, 5)}`
  }

  function addRecord(input: RecordInput): MaintenanceRecord {
    const v = vehicleMap.value.get(input.vehicleId)
    const rec: MaintenanceRecord = {
      ...input,
      id: nextRecordId(),
      divisionId: v?.divisionId ?? DIVISIONS[0]!.id,
      createdAt: nowISO(),
    }
    state.value.records.push(rec)
    // 修理で未復帰なら車両を「修理中」に、走行距離が増えていれば更新
    if (v) {
      if (input.category === 'repair' && input.returnDate === null && v.status === 'active') {
        v.status = 'repair'
        v.statusSince = input.date
      }
      if (input.mileage && input.mileage > v.mileage) v.mileage = input.mileage
      if (input.hourMeter && v.hourMeter !== null && input.hourMeter > v.hourMeter) v.hourMeter = input.hourMeter
      v.updatedAt = nowISO()
    }
    commit()
    return rec
  }

  function updateRecord(id: string, patch: Partial<MaintenanceRecord>) {
    const r = state.value.records.find((x) => x.id === id)
    if (!r) return
    Object.assign(r, patch)
    if (patch.returnDate) {
      const v = vehicleMap.value.get(r.vehicleId)
      const stillOpen = state.value.records.some((x) => x.vehicleId === r.vehicleId && x.returnDate === null)
      if (v && v.status === 'repair' && !stillOpen) {
        v.status = 'active'
        v.statusSince = patch.returnDate
      }
    }
    commit()
  }

  function deleteRecord(id: string) {
    const i = state.value.records.findIndex((x) => x.id === id)
    if (i >= 0) state.value.records.splice(i, 1)
    commit()
  }

  // ---- 車両 -------------------------------------------------------------
  function nextVehicleId(): string {
    const max = state.value.vehicles.reduce((m, v) => Math.max(m, Number(v.id.slice(2)) || 0), 0)
    return `V-${pad(max + 1, 4)}`
  }

  function addVehicleEvent(e: Omit<VehicleEvent, 'id' | 'at'>) {
    state.value.vehicleEvents.push({ ...e, id: `E-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, at: nowISO() })
  }

  function addVehicle(input: VehicleInput): Vehicle {
    const now = nowISO()
    const v: Vehicle = { photos: [], attachments: [], ...input, id: nextVehicleId(), createdAt: now, updatedAt: now }
    state.value.vehicles.push(v)
    addVehicleEvent({ vehicleId: v.id, kind: 'create', title: '車両を新規登録', detail: '' })
    commit()
    return v
  }

  const FIELD_LABELS: Partial<Record<keyof Vehicle, string>> = {
    plateNumber: '車両ナンバー',
    inspectionExpiry: '車検満了日',
    mileage: '走行距離',
    note: '備考',
    maker: 'メーカー',
    model: '車種',
    modelCode: '型式',
    typeId: '車両タイプ',
    categoryId: '車両区分',
    hourMeter: 'アワーメーター',
    acquisitionType: '取得区分',
    bodyPrice: '取得費用',
    equipmentPrice: '取得費用',
    acquisitionMisc: '取得費用',
    capacity: '積載量・能力',
    chassisNumber: '車台番号',
  }

  function updateVehicle(id: string, patch: Partial<Vehicle>) {
    const v = vehicleMap.value.get(id)
    if (!v) return
    const changed: string[] = []
    if (patch.status && patch.status !== v.status) {
      const labels = { active: '使用中', repair: '修理中', suspended: '休止中', disposal: '廃車予定' } as const
      addVehicleEvent({ vehicleId: id, kind: 'status', title: '使用状況を変更', detail: `${labels[v.status]} → ${labels[patch.status]}` })
      patch.statusSince = todayISO()
    }
    if (patch.divisionId && patch.divisionId !== v.divisionId) {
      addVehicleEvent({
        vehicleId: id,
        kind: 'division',
        title: '所属事業部を変更',
        detail: `${divisionName(v.divisionId, true)} → ${divisionName(patch.divisionId, true)}`,
      })
    }
    for (const [k, val] of Object.entries(patch) as [keyof Vehicle, unknown][]) {
      const label = FIELD_LABELS[k]
      if (label && JSON.stringify(v[k]) !== JSON.stringify(val) && !changed.includes(label)) changed.push(label)
    }
    if (changed.length) {
      addVehicleEvent({ vehicleId: id, kind: 'update', title: '車両情報を更新', detail: `${changed.slice(0, 3).join('・')}を更新` })
    }
    Object.assign(v, patch, { updatedAt: nowISO() })
    commit()
  }

  function upsertVehicles(rows: (Partial<Vehicle> & { id?: string })[]): { added: number; updated: number } {
    let added = 0
    let updated = 0
    for (const row of rows) {
      const existing = row.id ? vehicleMap.value.get(row.id) : undefined
      if (existing) {
        Object.assign(existing, row, { updatedAt: nowISO() })
        updated++
      } else {
        const now = nowISO()
        state.value.vehicles.push({
          plateNumber: '',
          divisionId: DIVISIONS[0]!.id,
          categoryId: 'truck',
          typeId: 'medium',
          maker: '',
          model: '',
          modelCode: '',
          chassisNumber: '',
          firstRegistration: todayISO().slice(0, 7),
          introducedOn: todayISO(),
          inspectionExpiry: todayISO(),
          inspectionCycleYears: 1,
          mileage: 0,
          hourMeter: null,
          status: 'active',
          statusSince: todayISO(),
          acquisitionType: 'new',
          leaseCompany: '',
          leaseEnd: null,
          bodyPrice: 0,
          equipmentPrice: 0,
          acquisitionMisc: 0,
          capacity: '',
          note: '',
          photos: [],
          attachments: [],
          ...row,
          id: row.id || nextVehicleId(),
          createdAt: now,
          updatedAt: now,
        } as Vehicle)
        added++
      }
    }
    if (added + updated > 0) {
      addVehicleEvent({ vehicleId: '—', kind: 'import', title: 'CSV取込', detail: `新規${added}件・更新${updated}件` })
    }
    commit()
    return { added, updated }
  }

  // ---- ユーザー ---------------------------------------------------------
  function addAudit(log: Omit<AuditLog, 'id' | 'at'>) {
    state.value.auditLogs.push({ ...log, id: `L-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, at: nowISO() })
  }

  function addUser(input: Omit<AppUser, 'id' | 'createdAt' | 'lastLoginAt' | 'statusChangedAt'>, actorName: string): AppUser {
    const max = state.value.users.reduce((mx, u) => Math.max(mx, Number(u.id.slice(1)) || 0), 0)
    const u: AppUser = { ...input, id: `U${pad(max + 1, 4)}`, createdAt: nowISO(), lastLoginAt: null, statusChangedAt: null }
    state.value.users.push(u)
    addAudit({ actorName, targetLoginId: u.loginId, action: 'create', description: `アカウントを新規発行（ログインID：${u.loginId}）` })
    commit()
    return u
  }

  function updateUser(id: string, patch: Partial<AppUser>, actorName: string, roleLabels: Record<string, string>) {
    const u = state.value.users.find((x) => x.id === id)
    if (!u) return
    if (patch.role && patch.role !== u.role) {
      addAudit({ actorName, targetLoginId: u.loginId, action: 'role', description: `権限を「${roleLabels[u.role]}」→「${roleLabels[patch.role]}」に変更` })
    }
    if (patch.divisionId !== undefined && patch.divisionId !== u.divisionId) {
      addAudit({
        actorName,
        targetLoginId: u.loginId,
        action: 'division',
        description: `所属事業部を「${divisionName(u.divisionId, true)}」→「${divisionName(patch.divisionId, true)}」に変更`,
      })
    }
    if (patch.status && patch.status !== u.status) {
      const l = { active: '有効', suspended: '停止' } as const
      addAudit({ actorName, targetLoginId: u.loginId, action: 'status', description: `アカウントを「${l[u.status]}」→「${l[patch.status]}」に変更` })
      patch.statusChangedAt = nowISO()
    }
    if ((patch.name && patch.name !== u.name) || (patch.email && patch.email !== u.email)) {
      addAudit({ actorName, targetLoginId: u.loginId, action: 'update', description: '氏名・メールアドレスを変更' })
    }
    Object.assign(u, patch)
    commit()
  }

  function touchLogin(loginId: string) {
    const u = userByLogin.value.get(loginId)
    if (u) {
      u.lastLoginAt = nowISO()
      commit()
    }
  }

  // ---- マスタ -----------------------------------------------------------
  function upsertDivision(d: Division) {
    const i = state.value.divisions.findIndex((x) => x.id === d.id)
    if (i >= 0) state.value.divisions[i] = d
    else state.value.divisions.push(d)
    commit()
  }
  function upsertVendor(w: Vendor) {
    const i = state.value.vendors.findIndex((x) => x.id === w.id)
    if (i >= 0) state.value.vendors[i] = w
    else state.value.vendors.push(w)
    commit()
  }
  function upsertPart(p: RepairPart) {
    const i = state.value.parts.findIndex((x) => x.id === p.id)
    if (i >= 0) state.value.parts[i] = p
    else state.value.parts.push(p)
    commit()
  }

  // ---- その他 -----------------------------------------------------------
  function markNoticesRead(ids: string[]) {
    const set = new Set([...state.value.readNoticeIds, ...ids])
    state.value.readNoticeIds = [...set]
    commit()
  }

  function reset() {
    state.value = generateDb()
    persistNow()
  }

  return {
    state,
    storageWarning,
    divisions,
    activeDivisions,
    categories,
    vehicleTypes,
    vendors,
    parts,
    vehicles,
    records,
    users,
    auditLogs,
    vehicleEvents,
    budgets,
    fiscalYear,
    generatedOn,
    readNoticeIds,
    divisionMap,
    categoryMap,
    typeMap,
    vendorMap,
    partMap,
    vehicleMap,
    userByLogin,
    recordsByVehicle,
    divisionName,
    userAffiliation,
    addRecord,
    updateRecord,
    deleteRecord,
    nextVehicleId,
    addVehicle,
    updateVehicle,
    upsertVehicles,
    addUser,
    updateUser,
    touchLogin,
    upsertDivision,
    upsertVendor,
    upsertPart,
    markNoticesRead,
    reset,
    commit,
  }
})
