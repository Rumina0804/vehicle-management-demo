import type { ISODate, ISODateTime } from '@/types'

/** 期の起点（決算年度 2025年度 = 第43期） */
const FIRST_PERIOD_FISCAL_YEAR = 1983

const pad = (n: number) => String(n).padStart(2, '0')

function fromParts(y: number, m: number, d: number): ISODate {
  return `${y}-${pad(m)}-${pad(d)}`
}

/** ブラウザのローカル日付で今日 */
export function todayISO(): ISODate {
  const d = new Date()
  return fromParts(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

export function nowISO(): ISODateTime {
  const d = new Date()
  return `${fromParts(d.getFullYear(), d.getMonth() + 1, d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** UTC 0時として解釈（タイムゾーンのずれを避ける） */
export function toUTC(s: ISODate): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(y, m - 1, d))
}

export function fromUTC(d: Date): ISODate {
  return fromParts(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = toUTC(s)
  d.setUTCDate(d.getUTCDate() + n)
  return fromUTC(d)
}

export function addMonths(s: ISODate, n: number): ISODate {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number) as [number, number, number]
  const total = y * 12 + (m - 1) + n
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate()
  return fromParts(ny, nm, Math.min(d, last))
}

export function addYears(s: ISODate, n: number): ISODate {
  return addMonths(s, n * 12)
}

/** a - b（日数） */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(a).getTime() - toUTC(b).getTime()) / 86_400_000)
}

export function maxDate(a: ISODate, b: ISODate): ISODate {
  return a > b ? a : b
}

export function minDate(a: ISODate, b: ISODate): ISODate {
  return a < b ? a : b
}

/** 4月始まりの決算年度 */
export function fiscalYearOf(s: ISODate): number {
  const y = Number(s.slice(0, 4))
  const m = Number(s.slice(5, 7))
  return m >= 4 ? y : y - 1
}

export function fiscalYearRange(fy: number): { from: ISODate; to: ISODate } {
  return { from: `${fy}-04-01`, to: `${fy + 1}-03-31` }
}

export function periodNo(fy: number): number {
  return fy - FIRST_PERIOD_FISCAL_YEAR + 1
}

export function fiscalYearLabel(fy: number): string {
  return `${fy}年度（第${periodNo(fy)}期）`
}

/** 決算年度の月キー（'YYYY-MM' × 12） */
export function fiscalMonths(fy: number): string[] {
  return Array.from({ length: 12 }, (_, i) => addMonths(`${fy}-04-01`, i).slice(0, 7))
}

export function calendarMonths(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${pad(i + 1)}`)
}

export function monthsBetween(from: ISODate, to: ISODate): string[] {
  const out: string[] = []
  let cur = `${from.slice(0, 7)}-01`
  const end = to.slice(0, 7)
  while (cur.slice(0, 7) <= end && out.length < 60) {
    out.push(cur.slice(0, 7))
    cur = addMonths(cur, 1)
  }
  return out
}

export function monthLabel(key: string): string {
  return `${Number(key.slice(5, 7))}月`
}

export function lastDayOfMonth(key: string): ISODate {
  const [y, m] = key.split('-').map(Number) as [number, number]
  return fromParts(y, m, new Date(Date.UTC(y, m, 0)).getUTCDate())
}

// ---- 表示用フォーマット ------------------------------------------------

export function fmtDate(s: ISODate | null | undefined): string {
  if (!s) return '—'
  return s.slice(0, 10).replaceAll('-', '/')
}

export function fmtDateTime(s: ISODateTime | null | undefined): string {
  if (!s) return '—'
  return `${fmtDate(s.slice(0, 10))} ${s.slice(11, 16)}`
}

export function fmtJpDate(s: ISODate | null | undefined): string {
  if (!s) return '—'
  return `${s.slice(0, 4)}年${s.slice(5, 7)}月${s.slice(8, 10)}日`
}

export function fmtYearMonth(s: string | null | undefined): string {
  if (!s) return '—'
  return `${s.slice(0, 4)}年${s.slice(5, 7)}月`
}

export function fmtSlashYearMonth(s: ISODate): string {
  return `${s.slice(0, 4)}/${s.slice(5, 7)}`
}

/** 残り日数をおおよその表現に（例：残り約5か月） */
export function fmtRemaining(days: number): string {
  if (days < 0) return `${-days}日超過`
  if (days <= 60) return `残り${days}日`
  return `残り約${Math.round(days / 30.4)}か月`
}
