const nf = new Intl.NumberFormat('ja-JP')

export function num(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return nf.format(Math.round(n))
}

export function yen(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  const v = Math.round(n)
  return v < 0 ? `−¥${nf.format(-v)}` : `¥${nf.format(v)}`
}

/** 千円単位 */
export function kyen(n: number): string {
  return nf.format(Math.round(n / 1000))
}

/** 万円などの短縮表記（グラフ軸・ツールチップ用） */
export function compactYen(n: number): string {
  const a = Math.abs(n)
  if (a >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}億円`
  if (a >= 10_000) return `${nf.format(Math.round(n / 10_000))}万円`
  return `${nf.format(Math.round(n))}円`
}

export function pct(ratio: number | null | undefined, digits = 1): string {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) return '—'
  return `${(ratio * 100).toFixed(digits)}%`
}

/** 符号付き（+3 / −2 / ±0） */
export function signed(n: number, unit = ''): string {
  if (n > 0) return `+${nf.format(n)}${unit}`
  if (n < 0) return `−${nf.format(-n)}${unit}`
  return `±0${unit}`
}

export function signedYen(n: number): string {
  if (n > 0) return `+¥${nf.format(Math.round(n))}`
  if (n < 0) return `−¥${nf.format(Math.round(-n))}`
  return '±¥0'
}

export function signedPct(ratio: number | null, digits = 1): string {
  if (ratio === null || !Number.isFinite(ratio)) return '—'
  const v = ratio * 100
  if (Math.abs(v) < 0.05) return '±0.0%'
  return `${v > 0 ? '+' : '−'}${Math.abs(v).toFixed(digits)}%`
}

export function fileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/** 数字以外を除去して整数に */
export function parseIntLoose(s: string): number | null {
  const z = s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/[^\d-]/g, '')
  if (z === '' || z === '-') return null
  const n = Number(z)
  return Number.isFinite(n) ? n : null
}
