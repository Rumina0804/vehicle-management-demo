/**
 * デモデータ生成。
 * すべての日付は「今日」を基準に相対的に作るため、いつ開いても最新の状態に見えます。
 * シード固定の乱数を使うので、同じ日に生成すれば内容は毎回同じになります。
 */
import type {
  AcquisitionType,
  AppUser,
  AuditLog,
  BudgetTable,
  DbState,
  ISODate,
  ISODateTime,
  MaintenanceRecord,
  Role,
  Vehicle,
  VehicleEvent,
  VehicleStatus,
  VehicleType,
} from '@/types'
import {
  addDays,
  addMonths,
  addYears,
  diffDays,
  fiscalMonths,
  fiscalYearOf,
  fiscalYearRange,
  fmtSlashYearMonth,
  maxDate,
  minDate,
  todayISO,
} from '@/utils/date'
import { Rng, roundTo } from '@/utils/random'
import { CATEGORIES, DIVISIONS, PARTS, VEHICLE_TYPES, VENDORS } from './catalog'

export const DB_VERSION = 5

// ---------------------------------------------------------------------
// 車両タイプごとの生成パラメータ
// ---------------------------------------------------------------------

interface ModelSpec {
  maker: string
  model: string
  code: string
  chassis: string
}

interface TypeGen {
  count: number
  plateClass: string[]
  cycle: 1 | 2
  body: [number, number]
  equip: [number, number]
  misc: [number, number]
  km: [number, number]
  hour: boolean
  capacity: string
  repairRate: number
  leaseRate: number
  models: ModelSpec[]
}

const m = (maker: string, model: string, code: string, chassis: string): ModelSpec => ({ maker, model, code, chassis })

const TYPE_GEN: Record<string, TypeGen> = {
  lightvan: {
    count: 9, plateClass: ['400', '400', '430'], cycle: 1, body: [2_600_000, 3_400_000], equip: [100_000, 400_000], misc: [150_000, 250_000],
    km: [15_000, 30_000], hour: false, capacity: '最大積載量 1,000kg', repairRate: 0.55, leaseRate: 0.45,
    models: [m('トヨタ自動車', 'ハイエースバン', '3DF-GDH201V', 'GDH201'), m('日産自動車', 'キャラバン', '3BF-VR2E26', 'VR2E26'), m('トヨタ自動車', 'プロボックス', '5BE-NCP160V', 'NCP160')],
  },
  keivan: {
    count: 6, plateClass: ['480'], cycle: 2, body: [1_200_000, 1_600_000], equip: [50_000, 150_000], misc: [80_000, 120_000],
    km: [10_000, 20_000], hour: false, capacity: '最大積載量 350kg', repairRate: 0.4, leaseRate: 0.5,
    models: [m('スズキ', 'エブリイ', '3BD-DA17V', 'DA17V'), m('ダイハツ工業', 'ハイゼットカーゴ', '3BD-S700V', 'S700V')],
  },
  selfloader: {
    count: 4, plateClass: ['100', '130'], cycle: 1, body: [7_500_000, 9_000_000], equip: [3_000_000, 4_500_000], misc: [350_000, 500_000],
    km: [25_000, 45_000], hour: false, capacity: '最大積載量 3,500kg', repairRate: 1.1, leaseRate: 0.1,
    models: [m('日野自動車', 'レンジャー（セルフローダー）', '2KG-FC2ABA', 'FC2AB'), m('いすゞ自動車', 'フォワード（セルフローダー）', '2RG-FRR90T2', 'FRR90')],
  },
  flatbed: {
    count: 5, plateClass: ['100', '400'], cycle: 1, body: [4_200_000, 5_400_000], equip: [200_000, 600_000], misc: [250_000, 350_000],
    km: [20_000, 35_000], hour: false, capacity: '最大積載量 2,000kg', repairRate: 0.85, leaseRate: 0.15,
    models: [m('いすゞ自動車', 'エルフ', '2RG-NJR88A', 'NJR88'), m('トヨタ自動車', 'ダイナ', '2RG-XZU712', 'XZU712'), m('三菱ふそう', 'キャンター', '2RG-FBA20', 'FBA20')],
  },
  large: {
    count: 8, plateClass: ['100', '100', '130'], cycle: 1, body: [15_500_000, 19_500_000], equip: [3_800_000, 6_500_000], misc: [550_000, 750_000],
    km: [60_000, 110_000], hour: false, capacity: '最大積載量 13,500kg', repairRate: 1.35, leaseRate: 0.05,
    models: [m('いすゞ自動車', 'ギガ', '2PG-CYJ77C', 'CYJ77C'), m('日野自動車', 'プロフィア', '2DG-FR1AHG', 'FR1AHG'), m('三菱ふそう', 'スーパーグレート', '2PG-FS70HZ', 'FS70HZ'), m('UDトラックス', 'クオン', '2PG-CD5BA', 'CD5BA')],
  },
  medium: {
    count: 10, plateClass: ['100', '100', '130'], cycle: 1, body: [8_000_000, 10_500_000], equip: [1_500_000, 3_000_000], misc: [400_000, 550_000],
    km: [35_000, 60_000], hour: false, capacity: '最大積載量 3,700kg', repairRate: 1.15, leaseRate: 0.08,
    models: [m('日野自動車', 'レンジャー', '2PG-FD2ABG', 'FD2ABG'), m('いすゞ自動車', 'フォワード', '2KG-FRR90S2', 'FRR90'), m('三菱ふそう', 'ファイター', '2KG-FK62FZ', 'FK62FZ')],
  },
  small: {
    count: 6, plateClass: ['100', '400'], cycle: 1, body: [4_600_000, 6_000_000], equip: [800_000, 1_500_000], misc: [280_000, 380_000],
    km: [25_000, 40_000], hour: false, capacity: '最大積載量 2,000kg', repairRate: 0.9, leaseRate: 0.12,
    models: [m('いすゞ自動車', 'エルフ', '2RG-NMR88AN', 'NMR88'), m('三菱ふそう', 'キャンター', '2RG-FBA20', 'FBA20'), m('日野自動車', 'デュトロ', '2RG-XZU712M', 'XZU712')],
  },
  dump: {
    count: 4, plateClass: ['100', '130'], cycle: 1, body: [15_000_000, 18_000_000], equip: [2_000_000, 3_600_000], misc: [500_000, 700_000],
    km: [40_000, 70_000], hour: false, capacity: '最大積載量 9,800kg', repairRate: 1.45, leaseRate: 0,
    models: [m('いすゞ自動車', 'ギガ ダンプ', '2PG-CXZ77CT', 'CXZ77C'), m('日野自動車', 'プロフィア ダンプ', '2PG-FS1AKA', 'FS1AK'), m('三菱ふそう', 'スーパーグレート ダンプ', '2PG-FV70VX', 'FV70V')],
  },
  unic: {
    count: 3, plateClass: ['100'], cycle: 1, body: [8_500_000, 10_000_000], equip: [3_200_000, 4_400_000], misc: [400_000, 550_000],
    km: [25_000, 45_000], hour: true, capacity: '最大積載量 2,950kg／吊上げ 2.9t', repairRate: 1.25, leaseRate: 0,
    models: [m('いすゞ自動車', 'フォワード（4段クレーン）', '2KG-FRR90S2', 'FRR90'), m('日野自動車', 'レンジャー（4段クレーン）', '2KG-FD2ABA', 'FD2AB')],
  },
  vacuum: {
    count: 12, plateClass: ['800', '800', '830'], cycle: 1, body: [17_000_000, 20_000_000], equip: [24_000_000, 34_000_000], misc: [600_000, 800_000],
    km: [25_000, 45_000], hour: true, capacity: 'タンク容量 10.0m³', repairRate: 1.75, leaseRate: 0,
    models: [m('日野自動車', 'プロフィア 強力吸引車', '2PG-FW1AHG', 'FW1AH'), m('いすゞ自動車', 'ギガ 強力吸引車', '2PG-CYJ77C', 'CYJ77C'), m('三菱ふそう', 'スーパーグレート 強力吸引車', '2PG-FV70HZ', 'FV70H')],
  },
  washer: {
    count: 8, plateClass: ['800', '830'], cycle: 1, body: [9_000_000, 11_000_000], equip: [9_000_000, 14_000_000], misc: [450_000, 600_000],
    km: [20_000, 40_000], hour: true, capacity: 'タンク容量 4.0m³', repairRate: 1.55, leaseRate: 0,
    models: [m('いすゞ自動車', 'フォワード 高圧洗浄車', '2RG-FRR90T2', 'FRR90'), m('日野自動車', 'レンジャー 高圧洗浄車', '2PG-FD2ABG', 'FD2ABG')],
  },
  combo: {
    count: 6, plateClass: ['800', '100'], cycle: 1, body: [9_500_000, 11_000_000], equip: [5_000_000, 8_000_000], misc: [450_000, 650_000],
    km: [20_000, 40_000], hour: true, capacity: 'タンク容量 3.5m³', repairRate: 1.6, leaseRate: 0,
    models: [m('日野自動車', 'レンジャー', '2PG-FD2ABG', 'FD2ABG'), m('いすゞ自動車', 'フォワード', '2RG-FRR90S2', 'FRR90')],
  },
  crane: {
    count: 3, plateClass: ['800'], cycle: 1, body: [18_000_000, 22_000_000], equip: [14_000_000, 22_000_000], misc: [600_000, 800_000],
    km: [10_000, 25_000], hour: true, capacity: '吊上げ能力 25t', repairRate: 1.4, leaseRate: 0,
    models: [m('いすゞ自動車', 'ギガ クレーン', '2PG-CYZ77C', 'CYZ77C'), m('日野自動車', 'プロフィア クレーン', '2DG-FS1AHG', 'FS1AH')],
  },
  aerial: {
    count: 4, plateClass: ['800', '830'], cycle: 1, body: [5_000_000, 6_000_000], equip: [5_000_000, 7_000_000], misc: [300_000, 400_000],
    km: [10_000, 20_000], hour: true, capacity: '作業床高さ 15m', repairRate: 1.0, leaseRate: 0.1,
    models: [m('いすゞ自動車', 'エルフ 高所作業車', '2RG-NKR88AN', 'NKR88'), m('日野自動車', 'デュトロ 高所作業車', '2RG-XZU600X', 'XZU600')],
  },
  mixer: {
    count: 2, plateClass: ['100'], cycle: 1, body: [15_000_000, 17_000_000], equip: [4_000_000, 5_500_000], misc: [500_000, 700_000],
    km: [25_000, 45_000], hour: true, capacity: 'ドラム容量 4.4m³', repairRate: 1.3, leaseRate: 0,
    models: [m('日野自動車', 'プロフィア ミキサー', '2DG-FS1AGB', 'FS1AG'), m('いすゞ自動車', 'ギガ ミキサー', '2PG-CXZ77CT', 'CXZ77C')],
  },
  sprinkler: {
    count: 3, plateClass: ['800'], cycle: 1, body: [8_000_000, 9_500_000], equip: [3_000_000, 4_500_000], misc: [400_000, 550_000],
    km: [15_000, 25_000], hour: true, capacity: 'タンク容量 6.5m³', repairRate: 1.05, leaseRate: 0,
    models: [m('いすゞ自動車', 'フォワード 散水車', '2RG-FRR90T2', 'FRR90'), m('日野自動車', 'レンジャー 散水車', '2KG-FC2ABA', 'FC2AB')],
  },
  sedan: {
    count: 4, plateClass: ['300', '330', '301'], cycle: 2, body: [2_700_000, 3_600_000], equip: [100_000, 200_000], misc: [200_000, 300_000],
    km: [12_000, 25_000], hour: false, capacity: '乗車定員 5名', repairRate: 0.3, leaseRate: 0.5,
    models: [m('トヨタ自動車', 'プリウス', '6AA-MXWH60', 'MXWH60'), m('トヨタ自動車', 'カローラ', '6AA-ZWE214', 'ZWE214')],
  },
  minivan: {
    count: 2, plateClass: ['300', '330'], cycle: 2, body: [3_000_000, 3_600_000], equip: [100_000, 250_000], misc: [200_000, 300_000],
    km: [12_000, 25_000], hour: false, capacity: '乗車定員 8名', repairRate: 0.35, leaseRate: 0.5,
    models: [m('トヨタ自動車', 'ノア', '6AA-ZWR90W', 'ZWR90'), m('日産自動車', 'セレナ', '6AA-GC28', 'GC28')],
  },
  keicar: {
    count: 1, plateClass: ['580'], cycle: 2, body: [1_600_000, 1_900_000], equip: [50_000, 120_000], misc: [100_000, 140_000],
    km: [8_000, 15_000], hour: false, capacity: '乗車定員 4名', repairRate: 0.3, leaseRate: 0.5,
    models: [m('ホンダ', 'N-BOX', '6BA-JF5', 'JF5')],
  },
}

const DIVISION_QUOTA: Record<string, number> = {
  project: 10, kurashiki1: 18, kurashiki2: 16, fukuyama: 14, himeji: 12, tahara: 8, unyu: 12, sekiyu: 10,
}

/** 事業部と車両タイプの相性（配置の偏りを出すため） */
function affinity(typeId: string, div: string): number {
  const probester = ['vacuum', 'washer', 'combo'].includes(typeId)
  if (div === 'unyu') {
    if (typeId === 'large') return 5
    if (['medium', 'selfloader', 'small', 'flatbed'].includes(typeId)) return 2.5
    if (probester) return 0.15
    return 0.6
  }
  if (div === 'sekiyu') {
    if (probester || typeId === 'sprinkler') return 3
    return 0.8
  }
  if (div === 'kurashiki1' || div === 'kurashiki2') return probester ? 2.2 : 1
  if (div === 'project') {
    if (['crane', 'aerial', 'unic', 'mixer', 'dump'].includes(typeId)) return 4
    return 0.7
  }
  return probester ? 1.4 : 1
}

interface PinSpec {
  typeId?: string
  division?: string
  model?: ModelSpec
  plate?: string
  mileage?: number
  status?: VehicleStatus
  statusDaysAgo?: number
  expiryOffset?: number
  introducedDaysAgo?: number
  introducedOn?: ISODate
  acquisition?: AcquisitionType
  prices?: [number, number, number]
  note?: string
  chassisNumber?: string
}

/** モックアップに登場する車両は内容を寄せて固定 */
const PINS: Record<string, PinSpec> = {
  'V-0001': { typeId: 'large', division: 'kurashiki2', model: m('いすゞ自動車', 'ギガ', '2PG-CYJ77C', 'CYJ77C'), plate: '倉敷100 か 30-12', mileage: 521_430 },
  'V-0002': { typeId: 'large', division: 'fukuyama', model: m('日野自動車', 'プロフィア', '2DG-FR1AHG', 'FR1AHG'), plate: '岡山100 か 56-78', mileage: 438_210 },
  'V-0003': { typeId: 'medium', division: 'kurashiki1', model: m('三菱ふそう', 'ファイター', '2KG-FK62FZ', 'FK62FZ'), plate: '倉敷100 さ 18-94', mileage: 278_930 },
  'V-0004': { typeId: 'dump', division: 'project', model: m('いすゞ自動車', 'ギガ ダンプ', '2PG-CXZ77CT', 'CXZ77C'), plate: '倉敷100 す 78-90', mileage: 662_310, expiryOffset: 16 },
  'V-0005': { typeId: 'mixer', division: 'sekiyu', model: m('日野自動車', 'プロフィア ミキサー', '2DG-FS1AGB', 'FS1AG'), plate: '倉敷100 た 45-67', mileage: 389_770 },
  'V-0006': { typeId: 'unic', division: 'kurashiki2', model: m('いすゞ自動車', 'フォワード（4段クレーン）', '2KG-FRR90S2', 'FRR90'), plate: '倉敷100 ね 12-34', mileage: 301_560 },
  'V-0007': { typeId: 'lightvan', division: 'fukuyama', model: m('トヨタ自動車', 'ハイエースバン', '3DF-GDH201V', 'GDH201'), plate: '福山400 と 90-12', mileage: 124_680, status: 'suspended', statusDaysAgo: 2 },
  'V-0008': { typeId: 'sedan', division: 'kurashiki2', model: m('トヨタ自動車', 'プリウス', '6AA-MXWH60', 'MXWH60'), plate: '倉敷300 ひ 33-21', mileage: 86_430, acquisition: 'lease' },
  'V-0011': { expiryOffset: 21 },
  'V-0012': { typeId: 'large', division: 'himeji', plate: '姫路100 か 48-90' },
  'V-0022': { expiryOffset: 27 },
  'V-0025': {
    typeId: 'combo', division: 'fukuyama', model: m('日野自動車', 'レンジャー', '2PG-FD2ABG', 'FD2ABG'), plate: '福山100 そ 90-12',
    mileage: 198_540, expiryOffset: 148, introducedOn: '2022-06-18', acquisition: 'new', prices: [16_800_000, 5_860_000, 642_000],
    note: 'パワープロベスター用の専用架装（高圧洗浄・吸引ユニット）を搭載。主にプラント清掃業務で使用。', chassisNumber: 'FD2ABG-123456',
  },
  'V-0028': { typeId: 'crane', division: 'kurashiki1', plate: '倉敷800 さ 34-56' },
  'V-0037': { typeId: 'medium', division: 'tahara', plate: '豊橋100 そ 56-78' },
  'V-0045': { expiryOffset: 38 },
  'V-0061': { expiryOffset: 52 },
  'V-0100': {
    typeId: 'washer', division: 'kurashiki1', model: m('いすゞ自動車', 'フォワード 高圧洗浄車', '2RG-FRR90T2', 'FRR90'), plate: '倉敷800 さ 10-01',
    mileage: 380, introducedDaysAgo: 1, acquisition: 'new', note: '新規導入車両。石油化学プラントの定修工事に配備予定。',
  },
}

const KANA = ['さ', 'す', 'せ', 'そ', 'た', 'ち', 'つ', 'て', 'と', 'な', 'に', 'ぬ', 'ね', 'の', 'は', 'ひ', 'ふ', 'ほ', 'ま', 'み', 'む', 'め', 'も', 'や', 'ゆ', 'よ', 'ら', 'り', 'る', 'ろ']
const NEARBY_REGION: Record<string, string> = { 倉敷: '岡山', 福山: '広島', 姫路: '神戸', 豊橋: '三河', 岡山: '倉敷' }

const vid = (n: number) => `V-${String(n).padStart(4, '0')}`

interface VehicleCtx {
  annualKm: Map<string, number>
  recentRenew: Map<string, ISODate>
}

function genVehicles(rng: Rng, today: ISODate): { vehicles: Vehicle[]; ctx: VehicleCtx } {
  const typeMap = new Map(VEHICLE_TYPES.map((t) => [t.id, t]))

  // 1) 車両タイプの枠をシャッフルし、固定車両のタイプを所定の番号へ入れ替え
  const slots: string[] = []
  for (const [typeId, g] of Object.entries(TYPE_GEN)) for (let i = 0; i < g.count; i++) slots.push(typeId)
  rng.shuffle(slots)
  const pinnedIdx = new Set(Object.keys(PINS).map((k) => Number(k.slice(2)) - 1))
  for (const [id, pin] of Object.entries(PINS)) {
    if (!pin.typeId) continue
    const idx = Number(id.slice(2)) - 1
    if (slots[idx] === pin.typeId) continue
    const j = slots.findIndex((t, k) => t === pin.typeId && !pinnedIdx.has(k))
    if (j < 0) continue
    ;[slots[idx], slots[j]] = [slots[j]!, slots[idx]!]
  }

  // 2) 事業部の割り当て（台数の枠を守りつつ、車両タイプとの相性で重み付け）
  const quota = { ...DIVISION_QUOTA }
  const divOf: string[] = new Array(100)
  for (const [id, pin] of Object.entries(PINS)) {
    if (!pin.division) continue
    const idx = Number(id.slice(2)) - 1
    divOf[idx] = pin.division
    quota[pin.division] = (quota[pin.division] ?? 0) - 1
  }
  const order = rng.shuffle(Array.from({ length: 100 }, (_, i) => i).filter((i) => !divOf[i]))
  for (const i of order) {
    const typeId = slots[i]!
    const cands = Object.entries(quota)
      .filter(([, q]) => q > 0)
      .map(([d, q]) => [d, q * affinity(typeId, d)] as const)
    const d = rng.weighted(cands)
    divOf[i] = d
    quota[d] = (quota[d] ?? 0) - 1
  }

  // 3) 状態（修理中3・休止中7・廃車予定2）と車検期限の割り当て
  const free = rng.shuffle(Array.from({ length: 100 }, (_, i) => i).filter((i) => !pinnedIdx.has(i)))
  const take = (n: number, pred: (i: number) => boolean) => {
    const out: number[] = []
    for (let k = 0; k < free.length && out.length < n; k++) {
      const i = free[k]!
      if (pred(i)) {
        out.push(i)
        free.splice(k, 1)
        k--
      }
    }
    return out
  }
  const heavy = (i: number) => typeMap.get(slots[i]!)!.sizeClass !== 'light'
  const repairIdx = take(3, heavy)
  const suspendedIdx = take(6, () => true)
  const disposalIdx = take(2, () => true)
  const nearIdx = take(7, () => true)
  const renewIdx = take(5, () => true)
  const NEAR_OFFSETS = [6, 33, 44, 47, 55, 57, 59]
  const SUSPEND_DAYS = [20, 45, 70, 120, 205, 340]

  const vehicles: Vehicle[] = []
  const ctx: VehicleCtx = { annualKm: new Map(), recentRenew: new Map() }

  for (let i = 0; i < 100; i++) {
    const id = vid(i + 1)
    const pin = PINS[id] ?? {}
    const typeId = slots[i]!
    const type = typeMap.get(typeId)!
    const g = TYPE_GEN[typeId]!
    const div = DIVISIONS.find((d) => d.id === divOf[i])!
    const model = pin.model ?? rng.pick(g.models)

    let ageYears: number
    if (disposalIdx.includes(i)) ageYears = rng.range(11.5, 14)
    else ageYears = rng.range(1.4, 12.5)
    let introducedOn = addDays(today, -Math.round(ageYears * 365))
    if (pin.introducedOn) introducedOn = pin.introducedOn
    if (pin.introducedDaysAgo !== undefined) introducedOn = addDays(today, -pin.introducedDaysAgo)
    ageYears = Math.max(diffDays(today, introducedOn) / 365, 0.003)

    const acquisition: AcquisitionType =
      pin.acquisition ?? (rng.chance(g.leaseRate) ? 'lease' : rng.chance(0.16) ? 'used' : 'new')
    const firstRegistration =
      acquisition === 'used' ? addMonths(introducedOn, -rng.int(14, 60)).slice(0, 7) : introducedOn.slice(0, 7)

    const region = rng.chance(0.18) ? (NEARBY_REGION[div.plateRegion] ?? div.plateRegion) : div.plateRegion
    const plate =
      pin.plate ??
      `${region}${rng.pick(g.plateClass)} ${rng.pick(KANA)} ${rng.int(10, 99)}-${String(rng.int(0, 99)).padStart(2, '0')}`

    const usedKm = acquisition === 'used' ? rng.int(30_000, 160_000) : 0
    const yearlyKm = rng.range(g.km[0], g.km[1])
    const mileage = pin.mileage ?? roundTo(usedKm + ageYears * yearlyKm, 10)
    ctx.annualKm.set(id, Math.max(0, (mileage - usedKm) / Math.max(ageYears, 0.1)))

    // 状態
    let status: VehicleStatus = pin.status ?? 'active'
    let statusSince = introducedOn
    if (repairIdx.includes(i)) {
      status = 'repair'
      statusSince = addDays(today, -(repairIdx.indexOf(i) * 3 + 2))
    } else if (suspendedIdx.includes(i)) {
      status = 'suspended'
      statusSince = addDays(today, -SUSPEND_DAYS[suspendedIdx.indexOf(i)]!)
    } else if (disposalIdx.includes(i)) {
      status = 'disposal'
      statusSince = addDays(today, -rng.int(10, 40))
    }
    if (pin.statusDaysAgo !== undefined) statusSince = addDays(today, -pin.statusDaysAgo)

    // 車検満了日
    const cycle = g.cycle
    let expiry: ISODate
    if (pin.introducedDaysAgo !== undefined && pin.introducedDaysAgo < 30) {
      expiry = addYears(introducedOn, 2)
    } else if (pin.expiryOffset !== undefined) {
      expiry = addDays(today, pin.expiryOffset)
    } else if (nearIdx.includes(i)) {
      expiry = addDays(today, NEAR_OFFSETS[nearIdx.indexOf(i)]!)
    } else if (renewIdx.includes(i)) {
      // 直近1か月以内に車検を受けた車両
      const done = addDays(today, -rng.int(2, 25))
      const oldExpiry = addDays(done, rng.int(1, 28))
      ctx.recentRenew.set(id, done)
      expiry = addYears(oldExpiry, cycle)
    } else {
      expiry = addDays(today, rng.int(61, cycle * 365 - 36))
    }

    const hourMeter = g.hour ? roundTo(ageYears * rng.range(380, 1100), 10) : null
    const [body, equip, misc] = pin.prices ?? [
      roundTo(rng.range(g.body[0], g.body[1]), 10_000),
      roundTo(rng.range(g.equip[0], g.equip[1]), 10_000),
      roundTo(rng.range(g.misc[0], g.misc[1]), 1_000),
    ]

    const attachments: Vehicle['attachments'] = [
      { id: `${id}-A1`, name: `車検証_${id}.pdf`, kind: '車検証', size: rng.int(180, 420) * 1024, uploadedAt: addYears(expiry, -cycle) < introducedOn ? introducedOn : addYears(expiry, -cycle) },
      { id: `${id}-A2`, name: `自賠責保険証明書_${id}.pdf`, kind: '自賠責保険', size: rng.int(120, 300) * 1024, uploadedAt: introducedOn },
      { id: `${id}-A3`, name: `任意保険証券_${id}.pdf`, kind: '任意保険', size: rng.int(200, 600) * 1024, uploadedAt: introducedOn },
    ]
    if (acquisition === 'lease') {
      attachments.push({ id: `${id}-A4`, name: `リース契約書_${id}.pdf`, kind: 'リース契約書', size: rng.int(400, 900) * 1024, uploadedAt: introducedOn })
    }

    vehicles.push({
      id,
      plateNumber: plate,
      divisionId: div.id,
      categoryId: type.categoryId,
      typeId,
      maker: model.maker,
      model: model.model,
      modelCode: model.code,
      chassisNumber: pin.chassisNumber ?? `${model.chassis}-${rng.int(100_000, 999_999)}`,
      firstRegistration,
      introducedOn,
      inspectionExpiry: expiry,
      inspectionCycleYears: cycle,
      mileage,
      hourMeter,
      status,
      statusSince,
      acquisitionType: acquisition,
      leaseCompany: acquisition === 'lease' ? rng.pick(['せとうちオートリース株式会社', 'みずしまリース株式会社']) : '',
      leaseEnd: acquisition === 'lease' ? addYears(introducedOn, rng.pick([5, 6, 7])) : null,
      bodyPrice: body,
      equipmentPrice: equip,
      acquisitionMisc: misc,
      capacity: g.capacity,
      note: pin.note ?? defaultNote(rng, type, status),
      photos: [],
      attachments,
      createdAt: `${introducedOn}T10:00`,
      updatedAt: `${maxDate(introducedOn, addDays(today, -rng.int(3, 120)))}T${String(rng.int(10, 18)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}`,
    })
  }
  return { vehicles, ctx }
}

function defaultNote(rng: Rng, type: VehicleType, status: VehicleStatus): string {
  if (status === 'disposal') return '老朽化のため今期末で廃車予定。後継車両を手配中。'
  if (status === 'suspended') return rng.pick(['繁忙期のみ稼働。現在は車庫にて保管中。', '担当工事の終了に伴い一時休止。', '配置替えの検討中のため休止。'])
  const notes: Record<string, string[]> = {
    vacuum: ['プラント定修工事での汚泥・残渣の吸引作業に使用。', '石油化学プラントのタンク清掃に使用。'],
    washer: ['熱交換器・配管の高圧洗浄作業に使用。', '定修工事の洗浄作業で主に使用。'],
    combo: ['吸引・洗浄の兼用車。小規模現場での清掃作業に使用。'],
    crane: ['機材の搬入・据付作業に使用。年次の特定自主検査を実施。'],
    aerial: ['高所の点検・補修作業に使用。', '年次の特定自主検査を実施済み。'],
    large: ['長距離の機材輸送に使用。', '資材の定期便に使用。'],
    selfloader: ['重機・作業車両の運搬に使用。'],
  }
  return rng.pick(notes[type.id] ?? ['', '', '現場間の資材・人員輸送に使用。'])
}

// ---------------------------------------------------------------------
// 修理・整備履歴
// ---------------------------------------------------------------------

const SEASON = [0.62, 0.7, 0.85, 0.95, 0.75, 0.88, 0.95, 1.05, 1.1, 1.2, 1.38, 1.5] // 4月〜3月
const season = (d: ISODate) => SEASON[(Number(d.slice(5, 7)) + 8) % 12]!
const SIZE_FACTOR = { L: 1.45, M: 1, S: 0.72, light: 0.5 } as const
/** 修理費の水準（年度総額がモックアップの規模感に近づくよう調整） */
const REPAIR_COST_SCALE = 0.8

interface PartSpec {
  lo: number
  hi: number
  works: [string, string][]
}

const PART_SPEC: Record<string, PartSpec> = {
  P01: { lo: 70_000, hi: 520_000, works: [['エンジンオイル漏れ修理', 'オイルパン・ガスケットを交換し漏れを修理。'], ['ターボチャージャー交換', '出力低下・白煙のためターボチャージャーを交換。'], ['インジェクター交換', 'エンジン不調のためインジェクターを交換。'], ['ウォーターポンプ交換', '冷却水漏れのためウォーターポンプを交換。']] },
  P02: { lo: 150_000, hi: 300_000, works: [['クラッチ交換・調整', 'クラッチ一式（ディスク・カバー・ベアリング）を交換、調整、試運転。'], ['クラッチマスターシリンダー交換', 'クラッチの切れ不良のためマスターシリンダーを交換。']] },
  P03: { lo: 150_000, hi: 420_000, works: [['ミッションオーバーホール', 'ギア抜け症状のためミッションを脱着しオーバーホール。'], ['シフトケーブル交換', 'シフト操作不良のためケーブルを交換。']] },
  P04: { lo: 25_000, hi: 110_000, works: [['ブレーキパッド交換', 'ブレーキパッド摩耗のため前輪パッドを交換。'], ['ブレーキライニング交換', '後輪ライニングを交換、ドラム研磨。'], ['ブレーキチャンバー交換', 'エア漏れのためブレーキチャンバーを交換。']] },
  P05: { lo: 35_000, hi: 170_000, works: [['ショックアブソーバー交換', '前輪ショックアブソーバーを左右交換。'], ['リーフスプリング交換', '折損のためリーフスプリングを交換。'], ['ハブベアリング交換', '異音のためハブベアリングを交換。']] },
  P06: { lo: 30_000, hi: 170_000, works: [['タイヤ交換（前輪2本）', '前輪タイヤ2本を新品に交換。'], ['タイヤ交換（後輪4本）', '後輪タイヤ4本を新品に交換。'], ['スタッドレスタイヤ交換', '冬季用タイヤへの履き替え。'], ['パンク修理', '現場で釘を踏みパンク。修理・バランス調整。']] },
  P07: { lo: 8_000, hi: 40_000, works: [['ヘッドライト交換', 'ヘッドライトユニットを交換。'], ['テールランプ交換', '破損したテールランプを交換。'], ['電装（ライト）修理', '配線不良を修理。']] },
  P08: { lo: 18_000, hi: 95_000, works: [['バッテリー交換', 'バッテリー2個を交換。'], ['オルタネーター交換', '充電不良のためオルタネーターを交換。'], ['セルモーター交換', '始動不良のためセルモーターを交換。']] },
  P09: { lo: 30_000, hi: 150_000, works: [['エアコンコンプレッサー交換', '冷えない症状のためコンプレッサーを交換。'], ['エアコンガス補充・漏れ修理', 'ガス漏れ箇所を修理し補充。']] },
  P10: { lo: 35_000, hi: 170_000, works: [['ラジエーター交換', 'ラジエーターのコア詰まりのため交換。'], ['冷却水漏れ修理', 'ホース・クランプを交換し漏れを修理。']] },
  P11: { lo: 45_000, hi: 320_000, works: [['DPF洗浄・再生', 'DPF詰まり警告のため取外し洗浄。'], ['マフラー交換', '腐食穴あきのためマフラーを交換。'], ['NOxセンサー交換', '警告灯点灯のためNOxセンサーを交換。']] },
  P12: { lo: 50_000, hi: 250_000, works: [['PTO修理', 'PTOの作動不良を修理。'], ['油圧ホース交換', '油圧ホースの破損により交換。'], ['油圧ポンプ交換', '油圧低下のためポンプを交換。']] },
  P13: { lo: 90_000, hi: 820_000, works: [['真空ポンプオーバーホール', '吸引力低下のため真空ポンプを分解整備。ベーン・シール類を交換。'], ['吸引ホース交換', '摩耗した吸引ホースを交換。'], ['タンクシール交換', 'リアハッチのシール劣化のため交換。']] },
  P14: { lo: 80_000, hi: 540_000, works: [['高圧ポンプ修理', '圧力低下のためプランジャー・パッキンを交換。'], ['高圧ホース交換', '高圧ホースを交換、耐圧試験。']] },
  P15: { lo: 60_000, hi: 400_000, works: [['クレーンワイヤー交換', 'ワイヤーの素線切れのため交換。'], ['ブーム油圧シリンダー修理', 'シリンダーからの油漏れを修理。'], ['アウトリガー修理', 'アウトリガーの張り出し不良を修理。']] },
  P16: { lo: 30_000, hi: 260_000, works: [['荷台床板張替え', '荷台床板の破損部を張替え。'], ['ウイング開閉装置修理', 'ウイングの開閉不良を修理。'], ['あおり修理', 'あおりの変形を修理。']] },
  P17: { lo: 30_000, hi: 340_000, works: [['バンパー板金・塗装', 'バック時に構内ポールと接触。バンパーの板金・塗装。'], ['ドア板金・塗装', 'ドアのへこみを板金・塗装。'], ['接触事故による外装修理', '接触事故によりキャビン外装を修理。']] },
  P18: { lo: 15_000, hi: 110_000, works: [['フロントガラス交換', '飛び石によるひび割れのため交換。'], ['ミラー交換', '接触によりサイドミラーを交換。']] },
  P19: { lo: 5_000, hi: 60_000, works: [['ワイパーモーター交換', 'ワイパー作動不良のためモーターを交換。'], ['シート修理', '運転席シートの破れを修理。'], ['ドアロック修理', 'ドアロックの作動不良を修理。']] },
}

function partWeights(t: VehicleType): [string, number][] {
  const light = t.sizeClass === 'light'
  const w: [string, number][] = [
    ['P01', light ? 3 : 6], ['P02', light ? 1 : 4], ['P03', light ? 1 : 2], ['P04', 10], ['P05', 7], ['P06', 12],
    ['P07', 7], ['P08', 8], ['P09', 5], ['P10', light ? 2 : 4], ['P11', light ? 0.5 : 6], ['P17', 7], ['P18', 3], ['P19', 4],
  ]
  if (!light) w.push(['P16', 3])
  if (t.bodyKind === 'vacuum') w.push(['P13', 14], ['P12', 6])
  if (t.bodyKind === 'washer') w.push(['P14', 13], ['P12', 4])
  if (t.bodyKind === 'crane' || t.bodyKind === 'aerial') w.push(['P15', 10], ['P12', 6])
  if (t.bodyKind === 'mixer' || t.bodyKind === 'tank' || t.bodyKind === 'dump') w.push(['P12', 7])
  return w
}

function pickVendor(rng: Rng, v: Vehicle, kind: 'inspection' | 'check' | 'service' | 'repair', partId = ''): string {
  const dealer = VENDORS.find((w) => w.kind === 'ディーラー' && w.makers.includes(v.maker))?.id ?? 'W06'
  const locals = VENDORS.filter((w) => w.kind === '整備工場' && w.divisionIds.includes(v.divisionId))
  const local = locals.length ? rng.pick(locals).id : 'W06'
  const remote = ['tahara', 'himeji', 'fukuyama'].includes(v.divisionId)
  switch (kind) {
    case 'inspection':
      return rng.weighted([[dealer, 5], ['W01', remote ? 1 : 3], [local, remote ? 4 : 2]])
    case 'check':
      return rng.weighted([['W01', remote ? 2 : 7], [local, remote ? 6 : 3]])
    case 'service':
      return rng.weighted([['W01', remote ? 2 : 6], [local, remote ? 6 : 4]])
    case 'repair':
      if (partId === 'P06') return rng.weighted([[remote ? local : 'W10', 7], ['W01', 2], [local, 1]])
      if (['P12', 'P13', 'P14', 'P15'].includes(partId)) return rng.weighted([['W11', 6], ['W01', 3], [local, 1]])
      if (partId === 'P17' || partId === 'P18') return rng.weighted([[remote ? local : 'W12', 7], [local, 2], ['W01', 1]])
      if (['P01', 'P02', 'P03', 'P11'].includes(partId)) return rng.weighted([[dealer, 5], [local, 3], ['W01', 2]])
      return rng.weighted([['W01', remote ? 1 : 4], [local, 4], [dealer, 2]])
  }
}

interface RecordDraft extends Omit<MaintenanceRecord, 'id'> {
  pinned?: boolean
}

function genRecords(rng: Rng, today: ISODate, vehicles: Vehicle[], ctx: VehicleCtx, users: AppUser[]): RecordDraft[] {
  const fy0 = fiscalYearOf(today)
  const histStart = `${fy0 - 2}-04-01`
  const typeMap = new Map(VEHICLE_TYPES.map((t) => [t.id, t]))
  const out: RecordDraft[] = []
  const ym = (d: ISODate, label: string) => `${fmtSlashYearMonth(d)}（${label}）`
  const usersByDiv = new Map<string, string[]>()
  for (const u of users) {
    if (u.role === 'viewer' || !u.divisionId) continue
    usersByDiv.set(u.divisionId, [...(usersByDiv.get(u.divisionId) ?? []), u.name])
  }

  for (const v of vehicles) {
    const type = typeMap.get(v.typeId)!
    const light = type.sizeClass === 'light'
    const sf = SIZE_FACTOR[type.sizeClass] * (v.categoryId === 'probester' || v.categoryId === 'special' ? 1.15 : 1)
    const start = maxDate(histStart, v.introducedOn)
    const annualKm = ctx.annualKm.get(v.id) ?? 0
    const kmAt = (d: ISODate) => Math.max(0, roundTo(v.mileage - (diffDays(today, d) / 365) * annualKm, 10))
    const hourAt = (d: ISODate) =>
      v.hourMeter === null ? null : Math.max(0, roundTo(v.hourMeter - (diffDays(today, d) / 365) * 700, 10))
    const ageAt = (d: ISODate) => diffDays(d, v.introducedOn) / 365
    const staff = usersByDiv.get(v.divisionId) ?? ['佐藤 大輔']

    const push = (r: Partial<RecordDraft> & Pick<RecordDraft, 'date' | 'category' | 'workType' | 'partId' | 'description' | 'vendorId' | 'totalCost'>) => {
      const insurance = r.insuranceCost ?? 0
      const other = r.otherCost ?? 0
      const returnDate = r.returnDate === undefined ? r.date : r.returnDate
      out.push({
        vehicleId: v.id,
        divisionId: v.divisionId,
        accountingDate: r.accountingDate ?? r.date,
        mileage: kmAt(r.date),
        hourMeter: hourAt(r.date),
        companyCost: r.totalCost - insurance - other,
        insuranceCost: insurance,
        otherCost: other,
        insuranceStatus: r.insuranceStatus ?? 'none',
        status: r.status ?? 'confirmed',
        returnDate,
        nextLabel: r.nextLabel ?? null,
        note: r.note ?? '',
        photos: [],
        createdAt: `${r.date}T${String(rng.int(9, 18)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}`,
        createdBy: rng.pick(staff),
        ...r,
      } as RecordDraft)
    }

    // --- 車検（継続検査） ---
    const cycle = v.inspectionCycleYears
    const inspections: ISODate[] = []
    for (let k = 1; k <= 16; k++) {
      const oldExpiry = addYears(v.inspectionExpiry, -k * cycle)
      if (oldExpiry <= addDays(v.introducedOn, 30)) break
      if (oldExpiry > addDays(today, 60)) continue
      let d = k === 1 && ctx.recentRenew.has(v.id) ? ctx.recentRenew.get(v.id)! : addDays(oldExpiry, -rng.int(1, 30))
      if (d >= today) d = addDays(today, -1)
      inspections.push(d)
      if (d < addYears(start, -1)) break
    }
    for (const [k, d] of inspections.entries()) {
      if (d < start || d >= today) continue
      const cost = roundTo(100_000 * sf * (type.bodyKind === 'kei' ? 0.75 : 1) * rng.range(0.85, 1.2), 100)
      const next = k === 0 ? v.inspectionExpiry : inspections[k - 1]!
      push({
        date: d,
        category: 'inspection',
        workType: '車検（継続検査）',
        partId: 'P00',
        description: '継続検査（車検）、各部点検・整備、ブレーキ分解清掃、排ガス測定',
        vendorId: pickVendor(rng, v, 'inspection'),
        totalCost: cost,
        nextLabel: light ? (cycle === 2 ? ym(addMonths(d, 12), '12か月点検') : ym(next, '車検')) : ym(addMonths(d, 3), '3か月点検'),
      })
    }

    // --- 法定点検 ---
    const anchors = [...inspections]
    if (anchors.length === 0 || anchors[anchors.length - 1]! > addDays(v.introducedOn, 30)) anchors.push(v.introducedOn)
    for (const [k, a] of anchors.entries()) {
      const nextInspection = k === 0 ? v.inspectionExpiry : anchors[k - 1]!
      const plan: [number, string, number][] = light
        ? cycle === 2
          ? [[12, '12か月点検（法定）', 21_000]]
          : []
        : [
            [3, '3か月点検', 12_000],
            [6, '6か月点検（法定）', 32_000],
            [9, '3か月点検', 12_000],
          ]
      for (const [months, label, base] of plan) {
        const d = addDays(addMonths(a, months), rng.int(-8, 8))
        if (d < start || d >= today || d >= addDays(nextInspection, -20)) continue
        const isSix = months === 6
        push({
          date: d,
          category: 'maintenance',
          workType: label,
          partId: 'P00',
          description: isSix
            ? '法定6か月点検、消耗品点検、オイル・フィルター交換'
            : months === 12
              ? '法定12か月点検、ブレーキ・足回り点検、消耗品交換'
              : '日常点検強化項目の点検、タイヤ残溝・空気圧調整、灯火類点検',
          vendorId: pickVendor(rng, v, 'check'),
          totalCost: roundTo(base * (light ? 1 : sf) * rng.range(0.85, 1.2), 100),
          nextLabel:
            months === 3
              ? ym(addMonths(a, 6), '6か月点検')
              : months === 6
                ? ym(addMonths(a, 9), '3か月点検')
                : ym(nextInspection, '車検'),
        })
      }
    }

    // --- 定期整備 / オイル交換 ---
    let t = addDays(start, rng.int(10, 170))
    while (t < today) {
      if (light) {
        push({
          date: t,
          category: 'maintenance',
          workType: 'オイル・エレメント交換',
          partId: 'P00',
          description: 'エンジンオイル・オイルエレメント交換、各部点検',
          vendorId: pickVendor(rng, v, 'service'),
          totalCost: roundTo(7_800 * rng.range(0.85, 1.25) * (type.bodyKind === 'kei' ? 0.8 : 1), 100),
          nextLabel: ym(addMonths(t, 6), 'オイル交換'),
        })
      } else {
        push({
          date: t,
          category: 'maintenance',
          workType: '定期整備',
          partId: 'P00',
          description: 'エンジンオイル・オイルフィルター交換、下回り給脂、各部増し締め',
          vendorId: pickVendor(rng, v, 'service'),
          totalCost: roundTo(23_000 * sf * rng.range(0.7, 1.35), 100),
          nextLabel: ym(addMonths(t, 6), '定期整備'),
        })
      }
      t = addDays(t, rng.int(150, 215))
    }

    // --- 修理（季節性・車齢を考慮したポアソン過程） ---
    const MAX = 1.5 * 1.45
    const rate = TYPE_GEN[v.typeId]!.repairRate * MAX
    t = start
    for (;;) {
      t = addDays(t, Math.max(1, Math.round(rng.exp(365 / rate))))
      if (t >= today) break
      const ageFactor = 0.8 + Math.min(ageAt(t), 14) * 0.046
      if (!rng.chance((season(t) * ageFactor) / MAX)) continue
      addRepair(rng, v, type, t, today, sf, push)
    }
  }
  return out

  /** 修理レコードを1件追加 */
  function addRepair(
    rng: Rng,
    v: Vehicle,
    type: VehicleType,
    d: ISODate,
    today: ISODate,
    sf: number,
    push: (r: Partial<RecordDraft> & Pick<RecordDraft, 'date' | 'category' | 'workType' | 'partId' | 'description' | 'vendorId' | 'totalCost'>) => void,
  ): void {
    const partId = rng.weighted(partWeights(type))
    const spec = PART_SPEC[partId]!
    const [workType, desc] = rng.pick(spec.works)
    const total = roundTo(
      (spec.lo + (spec.hi - spec.lo) * Math.pow(rng.float(), 2)) * sf * REPAIR_COST_SCALE * rng.range(0.9, 1.1),
      100,
    )
    let insurance = 0
    let other = 0
    let insuranceStatus: MaintenanceRecord['insuranceStatus'] = 'none'
    if ((partId === 'P17' || partId === 'P18') && rng.chance(0.45)) {
      insurance = Math.min(total, roundTo(total * rng.range(0.5, 0.85), 1000))
      insuranceStatus = diffDays(today, d) < 30 ? 'applying' : 'approved'
    } else if ((partId === 'P01' || partId === 'P03') && rng.chance(0.1)) {
      other = roundTo(total * rng.range(0.2, 0.5), 1000)
    }
    const days = rng.weighted([[0, 3], [1, 4], [2, 3], [3, 2], [5, 1], [8, 1]] as const)
    let returnDate = minDate(addDays(d, days), addDays(today, -1))
    if (returnDate < d) returnDate = d
    const recent = diffDays(today, d) <= 10
    push({
      date: d,
      accountingDate: rng.chance(0.2) ? minDate(addDays(d, rng.int(1, 15)), today) : d,
      category: 'repair',
      workType,
      partId,
      description: desc,
      vendorId: pickVendor(rng, v, 'repair', partId),
      totalCost: total,
      insuranceCost: insurance,
      otherCost: other,
      insuranceStatus,
      status: recent && rng.chance(0.35) ? 'estimate' : 'confirmed',
      returnDate,
      note: other > 0 ? 'メーカー保証により一部負担あり。' : insurance > 0 ? '車両保険を適用。' : '',
    })
  }
}

/** 修理中・前月時点の入庫・上位車両などのシナリオ用レコード */
function addScenarioRecords(rng: Rng, today: ISODate, vehicles: Vehicle[], records: RecordDraft[]): void {
  const vmap = new Map(vehicles.map((v) => [v.id, v]))
  const typeMap = new Map(VEHICLE_TYPES.map((t) => [t.id, t]))
  const fyFrom = fiscalYearRange(fiscalYearOf(today)).from
  const elapsed = diffDays(today, fyFrom)
  const inFy = (f: number) => addDays(fyFrom, Math.max(0, Math.min(elapsed - 1, Math.round(elapsed * f))))

  const base = (v: Vehicle, d: ISODate): Omit<RecordDraft, 'category' | 'workType' | 'partId' | 'description' | 'vendorId' | 'totalCost' | 'companyCost'> => ({
    vehicleId: v.id,
    divisionId: v.divisionId,
    date: d,
    accountingDate: d,
    mileage: v.mileage,
    hourMeter: v.hourMeter,
    insuranceCost: 0,
    otherCost: 0,
    insuranceStatus: 'none',
    status: 'confirmed',
    returnDate: d,
    nextLabel: null,
    note: '',
    photos: [],
    createdAt: `${d}T${String(rng.int(9, 17)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}`,
    createdBy: '佐藤 大輔',
    pinned: true,
  })

  // 1) 現在修理中の車両（見込）
  for (const v of vehicles.filter((x) => x.status === 'repair')) {
    const type = typeMap.get(v.typeId)!
    const partId = rng.weighted(partWeights(type).filter(([p]) => !['P07', 'P19', 'P18'].includes(p)))
    const spec = PART_SPEC[partId]!
    const [workType, desc] = rng.pick(spec.works)
    const total = roundTo((spec.lo + (spec.hi - spec.lo) * rng.range(0.2, 0.45)) * REPAIR_COST_SCALE, 1000)
    records.push({
      ...base(v, v.statusSince),
      category: 'repair',
      workType,
      partId,
      description: `${desc}（部品手配中）`,
      vendorId: partId === 'P13' || partId === 'P14' ? 'W11' : 'W01',
      totalCost: total,
      companyCost: total,
      status: 'estimate',
      returnDate: null,
      note: '見積金額で登録。部品入荷後に確定予定。',
    })
  }

  // 2) 1か月前の時点で入庫していた修理（前月比の算出用）
  const monthAgo = addDays(today, -30)
  const pool = rng.shuffle(vehicles.filter((v) => v.status === 'active' && typeMap.get(v.typeId)!.sizeClass !== 'light'))
  for (const v of pool.slice(0, 5)) {
    const d = addDays(monthAgo, -rng.int(1, 4))
    const partId = rng.pick(['P01', 'P03', 'P05', 'P11', 'P12'])
    const spec = PART_SPEC[partId]!
    const [workType, desc] = rng.pick(spec.works)
    const total = roundTo((spec.lo + (spec.hi - spec.lo) * rng.range(0.15, 0.4)) * REPAIR_COST_SCALE, 100)
    records.push({
      ...base(v, d),
      category: 'repair',
      workType,
      partId,
      description: desc,
      vendorId: pickVendor(rng, v, 'repair', partId),
      totalCost: total,
      companyCost: total,
      returnDate: addDays(monthAgo, rng.int(2, 7)),
    })
  }

  // 3) 今期の修理費上位車両（モックアップのランキングに合わせる）
  if (elapsed < 45) return
  const big: [string, number, string, string, string, number, number, string][] = [
    // [車両, 時期, 箇所, 種別, 内容, 金額, 保険, 業者]
    ['V-0001', 0.32, 'P01', 'エンジンオーバーホール', 'エンジン異音のため分解点検。ピストン・ライナー・メタル類を交換しオーバーホール。', 780_000, 0, 'W03'],
    ['V-0001', 0.86, 'P06', 'タイヤ交換（後輪8本）', '後輪タイヤ8本を新品に交換。', 324_000, 0, 'W10'],
    ['V-0025', 0.22, 'P13', '真空ポンプオーバーホール', '吸引力低下のため真空ポンプを分解整備。ベーン・シール類を交換。', 668_000, 0, 'W11'],
    ['V-0012', 0.28, 'P11', 'DPF交換', 'DPF詰まり警告のため点検。再生不可のためDPFを交換。', 562_000, 0, 'W08'],
    ['V-0012', 0.63, 'P01', 'ターボチャージャー交換', '出力低下・白煙のためターボチャージャーを交換。', 330_000, 0, 'W08'],
    ['V-0037', 0.44, 'P17', '接触事故による外装修理', '構内での接触事故。キャビン右側・荷台側面の板金塗装、部品交換。', 784_000, 500_000, 'W09'],
    ['V-0028', 0.36, 'P15', 'ブーム油圧シリンダー修理', 'ブーム伸縮シリンダーからの油漏れ。シール交換・耐圧試験。', 642_000, 0, 'W11'],
  ]
  for (const [id, f, partId, workType, desc, total, ins, vendor] of big) {
    const v = vmap.get(id)
    if (!v) continue
    const d = inFy(f)
    records.push({
      ...base(v, d),
      category: 'repair',
      workType,
      partId,
      description: desc,
      vendorId: vendor,
      totalCost: total,
      companyCost: total - ins,
      insuranceCost: ins,
      insuranceStatus: ins > 0 ? 'approved' : 'none',
      returnDate: addDays(d, rng.int(2, 9)) < today ? addDays(d, rng.int(2, 9)) : addDays(today, -1),
      note: ins > 0 ? '車両保険を適用（免責10万円）。' : '',
    })
  }

  // V-0025 の直近のクラッチ交換（ダッシュボード・車両詳細に表示）
  const v25 = vmap.get('V-0025')
  if (v25) {
    const d = addDays(today, -2)
    records.push({
      ...base(v25, d),
      category: 'repair',
      workType: 'クラッチ交換・調整',
      partId: 'P02',
      description: 'クラッチ一式（ディスク・カバー・ベアリング）交換、調整、試運転',
      vendorId: 'W01',
      totalCost: 398_200,
      companyCost: 398_200,
      returnDate: addDays(today, -1),
      createdBy: '高橋 健一',
    })
  }
}

/** 年度ごとの総額をモックアップの規模感に合わせて調整 */
function calibrate(records: RecordDraft[], today: ISODate): void {
  const fy0 = fiscalYearOf(today)
  const targets: Record<number, number> = { [fy0 - 2]: 24_320_000, [fy0 - 1]: 28_560_000 }
  const scaleRecord = (r: RecordDraft, s: number) => {
    const total = roundTo(r.totalCost * s, 100)
    const ins = Math.min(total, roundTo(r.insuranceCost * s, 1000))
    const other = Math.min(total - ins, roundTo(r.otherCost * s, 1000))
    r.totalCost = total
    r.insuranceCost = ins
    r.otherCost = other
    r.companyCost = total - ins - other
  }
  const sum = (list: RecordDraft[]) => list.reduce((s, r) => s + r.totalCost, 0)
  const scales: Record<number, number> = {}
  for (const fy of [fy0 - 2, fy0 - 1]) {
    const list = records.filter((r) => fiscalYearOf(r.accountingDate) === fy)
    const raw = sum(list)
    scales[fy] = raw > 0 ? targets[fy]! / raw : 1
    for (const r of list) scaleRecord(r, scales[fy]!)
  }
  // 当期：前期の同期間 × 1.15 前後（シナリオ用の固定レコードは金額を変えない）
  const s1 = scales[fy0 - 1] ?? 1
  const from = fiscalYearRange(fy0).from
  const prevFrom = fiscalYearRange(fy0 - 1).from
  const prevTo = addYears(today, -1)
  const prevSame = sum(records.filter((r) => r.accountingDate >= prevFrom && r.accountingDate <= prevTo))
  const cur = records.filter((r) => r.accountingDate >= from)
  const free = cur.filter((r) => !r.pinned)
  const raw = sum(free)
  let s = raw > 0 && prevSame > 0 ? (prevSame * 1.15 - sum(cur.filter((r) => r.pinned))) / raw : s1
  s = Math.min(Math.max(s, s1 * 0.75), s1 * 1.08)
  for (const r of free) scaleRecord(r, s)
}

function genBudgets(rng: Rng, records: MaintenanceRecord[], today: ISODate): BudgetTable {
  const fy0 = fiscalYearOf(today)
  const prevMonths = fiscalMonths(fy0 - 1)
  const table: BudgetTable = {}
  for (const d of DIVISIONS) {
    const factor = rng.range(1.22, 1.32)
    table[d.id] = prevMonths.map((mk) => {
      const sum = records
        .filter((r) => r.divisionId === d.id && r.accountingDate.startsWith(mk))
        .reduce((s, r) => s + r.totalCost, 0)
      return roundTo(Math.max(sum, 60_000) * factor, 10_000)
    })
  }
  return table
}

// ---------------------------------------------------------------------
// ユーザー・操作履歴
// ---------------------------------------------------------------------

const SURNAMES: [string, string][] = [
  ['佐藤', 'sato'], ['鈴木', 'suzuki'], ['高橋', 'takahashi'], ['田中', 'tanaka'], ['伊藤', 'ito'], ['渡辺', 'watanabe'],
  ['山本', 'yamamoto'], ['中村', 'nakamura'], ['小林', 'kobayashi'], ['加藤', 'kato'], ['吉田', 'yoshida'], ['山田', 'yamada'],
  ['佐々木', 'sasaki'], ['山口', 'yamaguchi'], ['松本', 'matsumoto'], ['井上', 'inoue'], ['木村', 'kimura'], ['林', 'hayashi'],
  ['斎藤', 'saito'], ['清水', 'shimizu'], ['山崎', 'yamazaki'], ['森', 'mori'], ['池田', 'ikeda'], ['橋本', 'hashimoto'],
  ['阿部', 'abe'], ['石川', 'ishikawa'], ['山下', 'yamashita'], ['中島', 'nakajima'], ['石井', 'ishii'], ['小川', 'ogawa'],
  ['前田', 'maeda'], ['岡田', 'okada'], ['長谷川', 'hasegawa'], ['藤田', 'fujita'], ['後藤', 'goto'], ['近藤', 'kondo'],
  ['村上', 'murakami'], ['遠藤', 'endo'], ['青木', 'aoki'], ['坂本', 'sakamoto'], ['藤井', 'fujii'], ['西村', 'nishimura'],
  ['福田', 'fukuda'], ['太田', 'ota'], ['三浦', 'miura'], ['藤原', 'fujiwara'], ['岡本', 'okamoto'], ['松田', 'matsuda'],
  ['中川', 'nakagawa'], ['原田', 'harada'], ['小野', 'ono'], ['竹内', 'takeuchi'], ['金子', 'kaneko'], ['和田', 'wada'],
  ['守屋', 'moriya'], ['難波', 'namba'], ['三宅', 'miyake'], ['片山', 'katayama'], ['大森', 'omori'], ['平田', 'hirata'],
]
const GIVEN: [string, string][] = [
  ['大輔', 'daisuke'], ['直樹', 'naoki'], ['健一', 'kenichi'], ['美咲', 'misaki'], ['隆', 'takashi'], ['幸一', 'koichi'],
  ['亮太', 'ryota'], ['翔太', 'shota'], ['拓也', 'takuya'], ['健太', 'kenta'], ['誠', 'makoto'], ['浩二', 'koji'],
  ['和也', 'kazuya'], ['大樹', 'daiki'], ['雄一', 'yuichi'], ['剛', 'tsuyoshi'], ['学', 'manabu'], ['修', 'osamu'],
  ['聡', 'satoshi'], ['裕子', 'yuko'], ['恵', 'megumi'], ['由美', 'yumi'], ['陽子', 'yoko'], ['智子', 'tomoko'],
  ['彩', 'aya'], ['結衣', 'yui'], ['舞', 'mai'], ['哲也', 'tetsuya'], ['達也', 'tatsuya'], ['博', 'hiroshi'],
  ['正人', 'masato'], ['孝', 'takashi'], ['一郎', 'ichiro'], ['洋平', 'yohei'], ['康介', 'kosuke'], ['純一', 'junichi'],
  ['慎吾', 'shingo'], ['悠斗', 'yuto'], ['颯太', 'sota'], ['蓮', 'ren'], ['美穂', 'miho'], ['沙織', 'saori'],
  ['香織', 'kaori'], ['麻衣', 'mai'], ['俊介', 'shunsuke'], ['光', 'hikaru'], ['賢治', 'kenji'], ['徹', 'toru'],
]

interface UserSeed {
  name: string
  loginId: string
  divisionId: string | null
  department?: string
  role: Role
  suspendedDaysAgo?: number
  createdDaysAgo?: number
  lastLogin?: [number, string]
}

const PINNED_USERS: UserSeed[] = [
  { name: '佐藤 大輔', loginId: 'sato.d', divisionId: null, department: '管理部', role: 'system_admin', lastLogin: [0, 'now'] },
  { name: '鈴木 直樹', loginId: 'suzuki.n', divisionId: null, department: '車両管理課', role: 'company_admin', lastLogin: [1, '08:57'] },
  { name: '高橋 健一', loginId: 'takahashi.k', divisionId: 'fukuyama', role: 'office_user', lastLogin: [1, '18:32'] },
  { name: '田中 美咲', loginId: 'tanaka.m', divisionId: 'kurashiki2', role: 'office_user', lastLogin: [1, '17:46'] },
  { name: '山本 隆', loginId: 'yamamoto.t', divisionId: 'fukuyama', role: 'viewer', lastLogin: [1, '16:20'] },
  { name: '中村 幸一', loginId: 'nakamura.k', divisionId: 'fukuyama', role: 'office_user', suspendedDaysAgo: 1, lastLogin: [10, '14:08'] },
  { name: '小林 亮太', loginId: 'kobayashi.r', divisionId: 'himeji', role: 'company_admin', lastLogin: [1, '08:41'] },
  { name: '伊藤 翔太', loginId: 'ito.s', divisionId: 'kurashiki1', role: 'office_user', createdDaysAgo: 2 },
  { name: '渡辺 誠', loginId: 'watanabe.m', divisionId: null, department: '情報システム課', role: 'system_admin', lastLogin: [3, '11:15'] },
]

function genUsers(rng: Rng, today: ISODate): AppUser[] {
  const users: AppUser[] = []
  const used = new Set<string>()
  const names = new Set<string>()
  const time = (h1 = 7, h2 = 19) => `${String(rng.int(h1, h2)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}`
  const nowTime = () => {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  const add = (s: UserSeed) => {
    used.add(s.loginId)
    names.add(s.name)
    const createdDays = s.createdDaysAgo ?? rng.int(60, 1100)
    const createdAt: ISODateTime = `${addDays(today, -createdDays)}T${s.createdDaysAgo !== undefined ? '15:30' : time(9, 17)}`
    let lastLoginAt: ISODateTime | null = null
    if (s.lastLogin) {
      const [days, t] = s.lastLogin
      lastLoginAt = `${addDays(today, -days)}T${t === 'now' ? nowTime() : t}`
    } else if (s.createdDaysAgo === undefined || s.createdDaysAgo > 2) {
      const days = Math.min(createdDays - 1, rng.weighted([[rng.int(1, 3), 6], [rng.int(4, 14), 3], [rng.int(15, 60), 1]] as const))
      lastLoginAt = days >= 0 ? `${addDays(today, -Math.max(1, days))}T${time()}` : null
    }
    users.push({
      id: `U${String(users.length + 1).padStart(4, '0')}`,
      name: s.name,
      loginId: s.loginId,
      email: `${s.loginId}@douko-kiko.example.jp`,
      divisionId: s.divisionId,
      department: s.divisionId ? '' : (s.department ?? '管理部'),
      role: s.role,
      status: s.suspendedDaysAgo !== undefined ? 'suspended' : 'active',
      lastLoginAt,
      createdAt,
      statusChangedAt: s.suspendedDaysAgo !== undefined ? `${addDays(today, -s.suspendedDaysAgo)}T08:57` : null,
    })
  }
  PINNED_USERS.forEach(add)

  const newName = (): [string, string] => {
    for (;;) {
      const [s, sr] = rng.pick(SURNAMES)
      const [g, gr] = rng.pick(GIVEN)
      const name = `${s} ${g}`
      if (names.has(name)) continue
      let id = `${sr}.${gr[0]}`
      if (used.has(id)) id = `${sr}.${gr}`
      let n = 2
      while (used.has(id)) id = `${sr}.${gr}${n++}`
      return [name, id]
    }
  }
  const divWeights = Object.entries(DIVISION_QUOTA) as [string, number][]
  const make = (role: Role, divisionId: string | null, extra: Partial<UserSeed> = {}) => {
    const [name, loginId] = newName()
    add({ name, loginId, divisionId, role, ...extra })
  }

  // 全社管理者（残り10名：本社6・事業部長4）
  for (let i = 0; i < 4; i++) make('company_admin', null, { department: '車両管理課' })
  for (let i = 0; i < 2; i++) make('company_admin', null, { department: '管理部' })
  for (const d of ['kurashiki1', 'kurashiki2', 'unyu', 'sekiyu']) make('company_admin', d)
  // 閲覧専用（残り5名）
  make('viewer', null, { department: '管理部' })
  make('viewer', null, { department: '管理部' })
  for (let i = 0; i < 3; i++) make('viewer', rng.weighted(divWeights))
  // 事業所利用者（残り105名、うち2名は直近1か月以内に発行）
  for (let i = 0; i < 105; i++) {
    const extra: Partial<UserSeed> = i === 0 ? { createdDaysAgo: 12 } : i === 1 ? { createdDaysAgo: 24 } : {}
    make('office_user', rng.weighted(divWeights), extra)
  }
  // 停止中（残り5名）
  for (let i = 0; i < 3; i++) make('office_user', rng.weighted(divWeights), { suspendedDaysAgo: rng.int(45, 320) })
  make('viewer', rng.weighted(divWeights), { suspendedDaysAgo: rng.int(60, 300) })
  make('company_admin', null, { department: '車両管理課', suspendedDaysAgo: rng.int(90, 400) })

  // 停止中ユーザーの最終ログインは停止日より前に
  for (const u of users) {
    if (u.status === 'suspended' && u.statusChangedAt && u.lastLoginAt && u.lastLoginAt > u.statusChangedAt) {
      u.lastLoginAt = `${addDays(u.statusChangedAt.slice(0, 10), -rng.int(3, 20))}T${time()}`
    }
  }
  return users
}

function genAuditLogs(rng: Rng, today: ISODate, users: AppUser[]): AuditLog[] {
  const t = (days: number, hm: string): ISODateTime => `${addDays(today, -days)}T${hm}`
  const logs: AuditLog[] = [
    { id: 'L-head-1', at: t(1, '09:22'), actorName: '佐藤 大輔', targetLoginId: 'kobayashi.r', action: 'role', description: '権限を「事業所利用者」→「全社管理者」に変更' },
    { id: 'L-head-2', at: t(1, '08:57'), actorName: '佐藤 大輔', targetLoginId: 'nakamura.k', action: 'status', description: 'アカウントを「有効」→「停止」に変更' },
    { id: 'L-head-3', at: t(2, '17:46'), actorName: '鈴木 直樹', targetLoginId: 'tanaka.m', action: 'division', description: '所属事業部を「倉敷第一」→「倉敷第二」に変更' },
    { id: 'L-head-4', at: t(2, '15:30'), actorName: '佐藤 大輔', targetLoginId: 'ito.s', action: 'create', description: 'アカウントを新規発行（ログインID：ito.s）' },
    { id: 'L-head-5', at: t(3, '10:12'), actorName: '鈴木 直樹', targetLoginId: 'yamamoto.t', action: 'role', description: '権限を「事業所利用者」→「閲覧専用」に変更' },
  ]
  const actors = ['佐藤 大輔', '鈴木 直樹', '小林 亮太', '渡辺 誠']
  const targets = users.filter((u) => u.role === 'office_user' || u.role === 'viewer')
  const shortNames = DIVISIONS.map((d) => d.shortName)
  let day = 4
  for (let i = 0; i < 45; i++) {
    day += rng.int(0, 4)
    const u = rng.pick(targets)
    const kind = rng.weighted([['create', 3], ['role', 2], ['division', 2], ['status', 1], ['update', 2]] as const)
    const desc =
      kind === 'create'
        ? `アカウントを新規発行（ログインID：${u.loginId}）`
        : kind === 'role'
          ? '権限を「閲覧専用」→「事業所利用者」に変更'
          : kind === 'division'
            ? (() => {
                const [a, b] = rng.shuffle([...shortNames]).slice(0, 2)
                return `所属事業部を「${a}」→「${b}」に変更`
              })()
            : kind === 'status'
              ? 'アカウントを「停止」→「有効」に変更'
              : 'メールアドレスを変更'
    logs.push({
      id: `L-${String(i + 1).padStart(3, '0')}`,
      at: t(day, `${String(rng.int(8, 18)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}`),
      actorName: rng.pick(actors),
      targetLoginId: u.loginId,
      action: kind,
      description: desc,
    })
  }
  return logs
}

function genVehicleEvents(rng: Rng, today: ISODate, vehicles: Vehicle[]): VehicleEvent[] {
  const t = (days: number, hm: string): ISODateTime => `${addDays(today, -days)}T${hm}`
  const events: VehicleEvent[] = [
    { id: 'E-head-1', at: t(1, '14:32'), vehicleId: 'V-0100', kind: 'create', title: '車両を新規登録', detail: '' },
    { id: 'E-head-2', at: t(1, '11:08'), vehicleId: 'V-0004', kind: 'update', title: '車両情報を更新', detail: '走行距離・備考を更新' },
    { id: 'E-head-3', at: t(2, '16:40'), vehicleId: 'V-0007', kind: 'status', title: '使用状況を変更', detail: '使用中 → 休止中' },
    { id: 'E-head-4', at: t(2, '10:27'), vehicleId: 'V-0002', kind: 'division', title: '所属事業部を変更', detail: '倉敷第一 → 福山' },
  ]
  let day = 3
  for (let i = 0; i < 16; i++) {
    day += rng.int(1, 6)
    const v = rng.pick(vehicles)
    const kind = rng.weighted([['update', 6], ['status', 1]] as const)
    events.push({
      id: `E-${String(i + 1).padStart(3, '0')}`,
      at: t(day, `${String(rng.int(8, 18)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}`),
      vehicleId: v.id,
      kind,
      title: kind === 'status' ? '使用状況を変更' : '車両情報を更新',
      detail: kind === 'status' ? '休止中 → 使用中' : rng.pick(['走行距離を更新', '車検満了日を更新', '備考を更新', '添付資料を追加', '写真を追加']),
    })
  }
  return events
}

// ---------------------------------------------------------------------

export function generateDb(today: ISODate = todayISO()): DbState {
  const rng = new Rng(20_260_120)
  const users = genUsers(rng, today)
  const { vehicles, ctx } = genVehicles(rng, today)
  const drafts = genRecords(rng, today, vehicles, ctx, users)
  addScenarioRecords(rng, today, vehicles, drafts)
  calibrate(drafts, today)

  drafts.sort((a, b) => (a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date)))
  const records: MaintenanceRecord[] = drafts.map(({ pinned: _pinned, ...r }, i) => ({
    ...r,
    id: `M-${String(i + 1).padStart(5, '0')}`,
  }))

  return {
    version: DB_VERSION,
    generatedOn: today,
    fiscalYear: fiscalYearOf(today),
    divisions: structuredClone(DIVISIONS),
    categories: structuredClone(CATEGORIES),
    vehicleTypes: structuredClone(VEHICLE_TYPES),
    vendors: structuredClone(VENDORS),
    parts: structuredClone(PARTS),
    vehicles,
    records,
    users,
    auditLogs: genAuditLogs(rng, today, users),
    vehicleEvents: genVehicleEvents(rng, today, vehicles),
    budgets: genBudgets(rng, records, today),
    readNoticeIds: [],
  }
}
