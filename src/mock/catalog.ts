import type { Division, RepairPart, Vehicle, VehicleCategory, VehicleType, Vendor } from '@/types'

/** 8事業部 */
export const DIVISIONS: Division[] = [
  { id: 'project', code: 'D01', name: 'プロジェクト事業部', shortName: 'プロジェクト', location: '岡山県倉敷市', plateRegion: '倉敷', manager: '藤原 和也', phone: '086-400-1101', sortOrder: 1, active: true },
  { id: 'kurashiki1', code: 'D02', name: '倉敷第一事業部', shortName: '倉敷第一', location: '岡山県倉敷市水島', plateRegion: '倉敷', manager: '三宅 浩二', phone: '086-400-1201', sortOrder: 2, active: true },
  { id: 'kurashiki2', code: 'D03', name: '倉敷第二事業部', shortName: '倉敷第二', location: '岡山県倉敷市玉島', plateRegion: '倉敷', manager: '難波 誠', phone: '086-400-1301', sortOrder: 3, active: true },
  { id: 'fukuyama', code: 'D04', name: '福山事業部', shortName: '福山', location: '広島県福山市', plateRegion: '福山', manager: '岡田 哲也', phone: '084-900-1401', sortOrder: 4, active: true },
  { id: 'himeji', code: 'D05', name: '姫路事業部', shortName: '姫路', location: '兵庫県姫路市', plateRegion: '姫路', manager: '松本 修', phone: '079-200-1501', sortOrder: 5, active: true },
  { id: 'tahara', code: 'D06', name: '田原事業部', shortName: '田原', location: '愛知県田原市', plateRegion: '豊橋', manager: '近藤 学', phone: '0531-20-1601', sortOrder: 6, active: true },
  { id: 'unyu', code: 'D07', name: '運輸事業部', shortName: '運輸', location: '岡山県岡山市', plateRegion: '岡山', manager: '守屋 剛', phone: '086-200-1701', sortOrder: 7, active: true },
  { id: 'sekiyu', code: 'D08', name: '石油化学事業部', shortName: '石油化学', location: '岡山県倉敷市水島', plateRegion: '倉敷', manager: '小野 聡', phone: '086-400-1801', sortOrder: 8, active: true },
]

/** 車両区分（色は CVD 検証済みの並び順。凡例・グラフで固定して使う） */
export const CATEGORIES: VehicleCategory[] = [
  { id: 'cargo', name: '貨物車・積載車', shortName: '貨物・積載', color: '#2a78d6', description: 'バン・平ボディ・積載車など', sortOrder: 1 },
  { id: 'truck', name: 'トラック', shortName: 'トラック', color: '#1baf7a', description: '大型・中型・小型・ダンプ・ユニック', sortOrder: 2 },
  { id: 'probester', name: 'パワープロベスター', shortName: 'プロベスター', color: '#6250d6', description: '強力吸引車・高圧洗浄車など', sortOrder: 3 },
  { id: 'special', name: 'その他特殊車両', shortName: '特殊車両', color: '#eda100', description: 'クレーン・高所作業車・ミキサーなど', sortOrder: 4 },
  { id: 'passenger', name: '乗用・その他', shortName: '乗用・他', color: '#e87ba4', description: '営業車・社用車', sortOrder: 5 },
]

export const VEHICLE_TYPES: VehicleType[] = [
  { id: 'lightvan', categoryId: 'cargo', name: 'ライトバン', bodyKind: 'van', sizeClass: 'light', sortOrder: 1 },
  { id: 'keivan', categoryId: 'cargo', name: '軽バン', bodyKind: 'kei', sizeClass: 'light', sortOrder: 2 },
  { id: 'selfloader', categoryId: 'cargo', name: 'セルフローダー（積載車）', bodyKind: 'carrier', sizeClass: 'M', sortOrder: 3 },
  { id: 'flatbed', categoryId: 'cargo', name: '平ボディ', bodyKind: 'flat', sizeClass: 'S', sortOrder: 4 },
  { id: 'large', categoryId: 'truck', name: '大型（10tクラス）', bodyKind: 'wing', sizeClass: 'L', sortOrder: 5 },
  { id: 'medium', categoryId: 'truck', name: '中型（4tクラス）', bodyKind: 'box', sizeClass: 'M', sortOrder: 6 },
  { id: 'small', categoryId: 'truck', name: '小型（2tクラス）', bodyKind: 'smallbox', sizeClass: 'S', sortOrder: 7 },
  { id: 'dump', categoryId: 'truck', name: 'ダンプ', bodyKind: 'dump', sizeClass: 'L', sortOrder: 8 },
  { id: 'unic', categoryId: 'truck', name: 'ユニック（クレーン付）', bodyKind: 'crane', sizeClass: 'M', sortOrder: 9 },
  { id: 'vacuum', categoryId: 'probester', name: '強力吸引車', bodyKind: 'vacuum', sizeClass: 'L', sortOrder: 10 },
  { id: 'washer', categoryId: 'probester', name: '高圧洗浄車', bodyKind: 'washer', sizeClass: 'M', sortOrder: 11 },
  { id: 'combo', categoryId: 'probester', name: '吸引・洗浄兼用車（4tクラス）', bodyKind: 'vacuum', sizeClass: 'M', sortOrder: 12 },
  { id: 'crane', categoryId: 'special', name: 'トラッククレーン', bodyKind: 'crane', sizeClass: 'L', sortOrder: 13 },
  { id: 'aerial', categoryId: 'special', name: '高所作業車', bodyKind: 'aerial', sizeClass: 'S', sortOrder: 14 },
  { id: 'mixer', categoryId: 'special', name: 'ミキサー車', bodyKind: 'mixer', sizeClass: 'L', sortOrder: 15 },
  { id: 'sprinkler', categoryId: 'special', name: '散水車', bodyKind: 'tank', sizeClass: 'M', sortOrder: 16 },
  { id: 'sedan', categoryId: 'passenger', name: '普通乗用車', bodyKind: 'sedan', sizeClass: 'light', sortOrder: 17 },
  { id: 'minivan', categoryId: 'passenger', name: 'ミニバン', bodyKind: 'minivan', sizeClass: 'light', sortOrder: 18 },
  { id: 'keicar', categoryId: 'passenger', name: '軽乗用車', bodyKind: 'kei', sizeClass: 'light', sortOrder: 19 },
]

/** 修理業者（デモ用の架空の会社名） */
export const VENDORS: Vendor[] = [
  { id: 'W01', name: '道廣機工 整備工場', kind: '自社工場', location: '岡山県倉敷市', phone: '086-400-1900', divisionIds: [], makers: [], active: true, sortOrder: 1 },
  { id: 'W02', name: '瀬戸内日野サービス株式会社', kind: 'ディーラー', location: '岡山県倉敷市', phone: '086-430-2210', divisionIds: ['project', 'kurashiki1', 'kurashiki2', 'unyu', 'sekiyu', 'fukuyama'], makers: ['日野自動車'], active: true, sortOrder: 2 },
  { id: 'W03', name: '西日本いすゞ整備株式会社', kind: 'ディーラー', location: '岡山県岡山市', phone: '086-240-3310', divisionIds: [], makers: ['いすゞ自動車'], active: true, sortOrder: 3 },
  { id: 'W04', name: 'ふそう中国サービス株式会社', kind: 'ディーラー', location: '広島県福山市', phone: '084-920-4410', divisionIds: [], makers: ['三菱ふそう', 'UDトラックス'], active: true, sortOrder: 4 },
  { id: 'W05', name: 'みらい自動車サービス株式会社', kind: 'ディーラー', location: '岡山県倉敷市', phone: '086-420-5510', divisionIds: [], makers: ['トヨタ自動車', '日産自動車', 'スズキ', 'ダイハツ工業', 'ホンダ'], active: true, sortOrder: 5 },
  { id: 'W06', name: 'プレミア整備工業株式会社', kind: '整備工場', location: '岡山県倉敷市', phone: '086-445-6610', divisionIds: ['project', 'kurashiki1', 'kurashiki2', 'sekiyu', 'unyu'], makers: [], active: true, sortOrder: 6 },
  { id: 'W07', name: '西日本メンテナンス株式会社', kind: '整備工場', location: '広島県福山市', phone: '084-951-7710', divisionIds: ['fukuyama'], makers: [], active: true, sortOrder: 7 },
  { id: 'W08', name: 'ひょうご車両サービス株式会社', kind: '整備工場', location: '兵庫県姫路市', phone: '079-234-8810', divisionIds: ['himeji'], makers: [], active: true, sortOrder: 8 },
  { id: 'W09', name: '東海整備工業株式会社', kind: '整備工場', location: '愛知県田原市', phone: '0531-22-9910', divisionIds: ['tahara'], makers: [], active: true, sortOrder: 9 },
  { id: 'W10', name: '水島タイヤセンター株式会社', kind: 'タイヤ専門', location: '岡山県倉敷市水島', phone: '086-444-1020', divisionIds: [], makers: [], active: true, sortOrder: 10 },
  { id: 'W11', name: 'プラントビークル工業株式会社', kind: '架装メーカー', location: '大阪府堺市', phone: '072-240-1130', divisionIds: [], makers: [], active: true, sortOrder: 11 },
  { id: 'W12', name: '倉敷ボデー株式会社', kind: '板金塗装', location: '岡山県倉敷市', phone: '086-465-1240', divisionIds: [], makers: [], active: true, sortOrder: 12 },
]

export const PARTS: RepairPart[] = [
  { id: 'P00', name: '全般（点検・車検）', group: '点検・車検', sortOrder: 0 },
  { id: 'P01', name: 'エンジン', group: '車体・機関', sortOrder: 1 },
  { id: 'P02', name: 'クラッチ', group: '車体・機関', sortOrder: 2 },
  { id: 'P03', name: 'ミッション', group: '車体・機関', sortOrder: 3 },
  { id: 'P04', name: 'ブレーキ', group: '足回り', sortOrder: 4 },
  { id: 'P05', name: '足回り・サスペンション', group: '足回り', sortOrder: 5 },
  { id: 'P06', name: 'タイヤ', group: '足回り', sortOrder: 6 },
  { id: 'P07', name: '電装（ライト）', group: '電装・空調', sortOrder: 7 },
  { id: 'P08', name: '電装（バッテリー・充電系）', group: '電装・空調', sortOrder: 8 },
  { id: 'P09', name: 'エアコン', group: '電装・空調', sortOrder: 9 },
  { id: 'P10', name: '冷却系（ラジエーター）', group: '車体・機関', sortOrder: 10 },
  { id: 'P11', name: '排気系（DPF・マフラー）', group: '車体・機関', sortOrder: 11 },
  { id: 'P12', name: '油圧・PTO', group: '架装', sortOrder: 12 },
  { id: 'P13', name: '架装（吸引装置）', group: '架装', sortOrder: 13 },
  { id: 'P14', name: '架装（高圧ポンプ）', group: '架装', sortOrder: 14 },
  { id: 'P15', name: '架装（クレーン・ブーム）', group: '架装', sortOrder: 15 },
  { id: 'P16', name: '荷台・ボディ', group: '外装', sortOrder: 16 },
  { id: 'P17', name: '外装（板金・塗装）', group: '外装', sortOrder: 17 },
  { id: 'P18', name: 'ガラス・ミラー', group: '外装', sortOrder: 18 },
  { id: 'P19', name: 'その他', group: 'その他', sortOrder: 19 },
]

export const MAKER_SHORT: Record<string, string> = {
  いすゞ自動車: 'いすゞ',
  日野自動車: '日野',
  三菱ふそう: '三菱ふそう',
  UDトラックス: 'UD',
  トヨタ自動車: 'トヨタ',
  日産自動車: '日産',
  スズキ: 'スズキ',
  ダイハツ工業: 'ダイハツ',
  ホンダ: 'ホンダ',
}

export function vehicleName(v: Pick<Vehicle, 'maker' | 'model'>): string {
  return `${MAKER_SHORT[v.maker] ?? v.maker} ${v.model}`
}

export const ROLE_LABELS = {
  system_admin: 'システム管理者',
  company_admin: '全社管理者',
  office_user: '事業所利用者',
  viewer: '閲覧専用',
} as const

export const ROLE_TARGETS = {
  system_admin: 'システム全体の管理者（情報システム・管理部門）',
  company_admin: '全社の運用管理者（車両管理部門・統括者）',
  office_user: '各事業部の運用担当者（事業所の責任者・担当者）',
  viewer: '参照のみ行うユーザー（管理者・協力会社 等）',
} as const

export const STATUS_LABELS = {
  active: '使用中',
  repair: '修理中',
  suspended: '休止中',
  disposal: '廃車予定',
} as const

export const ACQUISITION_LABELS = {
  new: '新車取得',
  used: '中古取得',
  lease: 'リース',
} as const

export const COST_CATEGORY_LABELS = {
  repair: '修理',
  maintenance: '整備（点検・保守）',
  inspection: '車検',
  other: 'その他',
} as const

export const INSURANCE_LABELS = {
  none: '保険適用なし',
  applying: '保険適用（申請中）',
  approved: '保険適用（確定）',
  rejected: '保険不適用（否認）',
} as const

export const HQ_DEPARTMENTS = ['管理部', '車両管理課', '情報システム課'] as const
