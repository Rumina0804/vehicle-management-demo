import type { ISODate, MaintenanceRecord, Vehicle } from '@/types'
import { addYears, diffDays } from './date'

/** 費用指標：修理・整備総額 / 会社実質負担額 */
export type Metric = 'total' | 'company'

export const METRIC_LABELS: Record<Metric, string> = {
  total: '修理・整備総額',
  company: '会社実質負担額',
}

export function amount(r: MaintenanceRecord, metric: Metric = 'total'): number {
  return metric === 'total' ? r.totalCost : r.companyCost
}

export function sumOf(records: readonly MaintenanceRecord[], metric: Metric = 'total'): number {
  let s = 0
  for (const r of records) s += amount(r, metric)
  return s
}

/** 費用計上日で期間を判定 */
export function inPeriod(r: MaintenanceRecord, from: ISODate, to: ISODate): boolean {
  return r.accountingDate >= from && r.accountingDate <= to
}

/** 月別合計（months は 'YYYY-MM' の配列） */
export function monthlyTotals(records: readonly MaintenanceRecord[], months: string[], metric: Metric = 'total'): number[] {
  const idx = new Map(months.map((m, i) => [m, i]))
  const out = months.map(() => 0)
  for (const r of records) {
    const i = idx.get(r.accountingDate.slice(0, 7))
    if (i !== undefined) out[i]! += amount(r, metric)
  }
  return out
}

export function groupSum<K>(
  records: readonly MaintenanceRecord[],
  key: (r: MaintenanceRecord) => K,
  metric: Metric = 'total',
): Map<K, number> {
  const map = new Map<K, number>()
  for (const r of records) {
    const k = key(r)
    map.set(k, (map.get(k) ?? 0) + amount(r, metric))
  }
  return map
}

export function cumulative(values: (number | null)[]): (number | null)[] {
  let s = 0
  return values.map((v) => (v === null ? null : (s += v)))
}

export function daysToExpiry(v: Vehicle, today: ISODate): number {
  return diffDays(v.inspectionExpiry, today)
}

/** ある日の時点で有効だった車検満了日（その日より後に車検を受けていれば一つ前の満了日） */
export function expiryAsOf(v: Vehicle, history: readonly MaintenanceRecord[] | undefined, asOf: ISODate): ISODate {
  const renewedAfter = history?.some((r) => r.category === 'inspection' && r.date > asOf)
  return renewedAfter ? addYears(v.inspectionExpiry, -v.inspectionCycleYears) : v.inspectionExpiry
}

export type Tone = 'good' | 'bad' | 'warn' | 'info' | 'muted' | 'violet'

/** 表示上の区分（修理／整備／点検／車検／その他） */
export function recordKind(r: Pick<MaintenanceRecord, 'category' | 'workType'>): { label: string; tone: Tone } {
  switch (r.category) {
    case 'repair':
      return { label: '修理', tone: 'bad' }
    case 'inspection':
      return { label: '車検', tone: 'warn' }
    case 'other':
      return { label: 'その他', tone: 'muted' }
    default:
      return r.workType.includes('点検') ? { label: '点検', tone: 'info' } : { label: '整備', tone: 'violet' }
  }
}

/** 対応状況 */
export function recordState(r: Pick<MaintenanceRecord, 'category' | 'status' | 'returnDate'>): { label: string; tone: Tone } {
  if (r.returnDate === null) return { label: r.category === 'repair' ? '修理中' : '入庫中', tone: 'warn' }
  if (r.status === 'estimate') return { label: '見込', tone: 'warn' }
  if (r.category === 'repair') return { label: '車両復帰', tone: 'good' }
  return { label: '完了', tone: 'info' }
}

export const TONE_CLASS: Record<Tone, string> = {
  good: 'badge-good',
  bad: 'badge-bad',
  warn: 'badge-warn',
  info: 'badge-info',
  muted: 'badge-muted',
  violet: 'badge-violet',
}
