/**
 * ドメインモデルの型定義。
 * 本番（Laravel + MySQL）ではテーブル定義・APIレスポンスの型としてそのまま流用できる粒度にしています。
 */

/** 'YYYY-MM-DD' */
export type ISODate = string
/** 'YYYY-MM-DDTHH:mm' */
export type ISODateTime = string

// ---- マスタ ---------------------------------------------------------

export interface Division {
  id: string
  code: string
  /** 正式名称（例：倉敷第一事業部） */
  name: string
  /** 略称（例：倉敷第一） */
  shortName: string
  location: string
  /** ナンバープレートの地名（デモデータ生成用） */
  plateRegion: string
  manager: string
  phone: string
  sortOrder: number
  active: boolean
}

export type CategoryId = 'cargo' | 'truck' | 'probester' | 'special' | 'passenger'

export interface VehicleCategory {
  id: CategoryId
  name: string
  shortName: string
  /** グラフ・凡例の識別色（検証済みパレット） */
  color: string
  description: string
  sortOrder: number
}

/** イラスト描画用の車体形状 */
export type BodyKind =
  | 'van'
  | 'kei'
  | 'carrier'
  | 'flat'
  | 'wing'
  | 'box'
  | 'smallbox'
  | 'dump'
  | 'crane'
  | 'vacuum'
  | 'washer'
  | 'aerial'
  | 'mixer'
  | 'tank'
  | 'sedan'
  | 'minivan'

/** L=大型 / M=中型 / S=小型 / light=乗用・軽 */
export type SizeClass = 'L' | 'M' | 'S' | 'light'

export interface VehicleType {
  id: string
  categoryId: CategoryId
  name: string
  bodyKind: BodyKind
  sizeClass: SizeClass
  sortOrder: number
}

export type VendorKind = '自社工場' | 'ディーラー' | '整備工場' | 'タイヤ専門' | '架装メーカー' | '板金塗装'

export interface Vendor {
  id: string
  name: string
  kind: VendorKind
  location: string
  phone: string
  /** 主に対応する事業部（空なら全社） */
  divisionIds: string[]
  /** ディーラーの場合の取扱メーカー */
  makers: string[]
  active: boolean
  sortOrder: number
}

export interface RepairPart {
  id: string
  name: string
  group: '点検・車検' | '車体・機関' | '足回り' | '電装・空調' | '架装' | '外装' | 'その他'
  sortOrder: number
}

// ---- 車両 -----------------------------------------------------------

export type VehicleStatus = 'active' | 'repair' | 'suspended' | 'disposal'
export type AcquisitionType = 'new' | 'used' | 'lease'

export interface VehicleAttachment {
  id: string
  name: string
  kind: '車検証' | '自賠責保険' | '任意保険' | 'リース契約書' | '点検整備記録簿' | 'その他'
  size: number
  uploadedAt: ISODate
}

export interface VehiclePhoto {
  id: string
  label: string
  /** data URL（デモではブラウザ内に保存） */
  src: string
}

export interface Vehicle {
  /** 車両管理番号（例：V-0025） */
  id: string
  plateNumber: string
  divisionId: string
  categoryId: CategoryId
  typeId: string
  maker: string
  model: string
  modelCode: string
  chassisNumber: string
  /** 初度登録年月 'YYYY-MM' */
  firstRegistration: string
  introducedOn: ISODate
  inspectionExpiry: ISODate
  inspectionCycleYears: 1 | 2
  mileage: number
  hourMeter: number | null
  status: VehicleStatus
  statusSince: ISODate
  acquisitionType: AcquisitionType
  leaseCompany: string
  leaseEnd: ISODate | null
  bodyPrice: number
  equipmentPrice: number
  acquisitionMisc: number
  capacity: string
  note: string
  photos: VehiclePhoto[]
  attachments: VehicleAttachment[]
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

// ---- 修理・整備履歴 --------------------------------------------------

/** 費用区分：修理 / 整備（点検・保守） / 車検 / その他 */
export type CostCategory = 'repair' | 'maintenance' | 'inspection' | 'other'
/** 見込 / 確定 */
export type RecordStatus = 'estimate' | 'confirmed'
export type InsuranceStatus = 'none' | 'applying' | 'approved' | 'rejected'

export interface MaintenanceRecord {
  id: string
  vehicleId: string
  /** 計上時点の所属事業部（車両の異動後も費用は当時の事業部に残す） */
  divisionId: string
  /** 実施日 */
  date: ISODate
  /** 費用計上日 */
  accountingDate: ISODate
  category: CostCategory
  /** 種別（例：クラッチ交換・調整、6か月点検（法定）） */
  workType: string
  partId: string
  description: string
  vendorId: string
  mileage: number | null
  hourMeter: number | null
  /** 修理・整備総額（税込） */
  totalCost: number
  companyCost: number
  insuranceCost: number
  otherCost: number
  insuranceStatus: InsuranceStatus
  status: RecordStatus
  /** 車両復帰日（null = 修理中・入庫中） */
  returnDate: ISODate | null
  /** 次回予定（表示用） */
  nextLabel: string | null
  note: string
  photos: string[]
  createdAt: ISODateTime
  createdBy: string
}

// ---- ユーザー・権限 --------------------------------------------------

export type Role = 'system_admin' | 'company_admin' | 'office_user' | 'viewer'
export type UserStatus = 'active' | 'suspended'

export interface AppUser {
  id: string
  name: string
  loginId: string
  email: string
  /** null = 本社 */
  divisionId: string | null
  /** 本社所属の場合の部署 */
  department: string
  role: Role
  status: UserStatus
  lastLoginAt: ISODateTime | null
  createdAt: ISODateTime
  statusChangedAt: ISODateTime | null
}

export type Permission = 'users.manage' | 'masters.manage' | 'data.edit' | 'analytics.view' | 'data.view'

export interface AuditLog {
  id: string
  at: ISODateTime
  actorName: string
  targetLoginId: string | null
  action: 'create' | 'role' | 'status' | 'division' | 'update' | 'import'
  description: string
}

export interface VehicleEvent {
  id: string
  at: ISODateTime
  vehicleId: string
  kind: 'create' | 'update' | 'status' | 'division' | 'import'
  title: string
  detail: string
}

/** 事業部別の月次予算（当期・4月〜3月の12要素） */
export type BudgetTable = Record<string, number[]>

export interface DbState {
  version: number
  generatedOn: ISODate
  fiscalYear: number
  divisions: Division[]
  categories: VehicleCategory[]
  vehicleTypes: VehicleType[]
  vendors: Vendor[]
  parts: RepairPart[]
  vehicles: Vehicle[]
  records: MaintenanceRecord[]
  users: AppUser[]
  auditLogs: AuditLog[]
  vehicleEvents: VehicleEvent[]
  budgets: BudgetTable
  readNoticeIds: string[]
}
