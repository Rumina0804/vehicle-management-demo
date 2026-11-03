/** シード付き乱数（デモデータを毎回同じ内容で生成するため） */
export class Rng {
  private a: number

  constructor(seed: number) {
    this.a = seed >>> 0
  }

  float(): number {
    this.a = (this.a + 0x6d2b79f5) >>> 0
    let t = this.a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.float()
  }

  int(min: number, max: number): number {
    return Math.floor(this.float() * (max - min + 1)) + min
  }

  chance(p: number): boolean {
    return this.float() < p
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.float() * arr.length)] as T
  }

  weighted<T>(items: readonly (readonly [T, number])[]): T {
    const total = items.reduce((s, [, w]) => s + w, 0)
    let r = this.float() * total
    for (const [item, w] of items) {
      r -= w
      if (r <= 0) return item
    }
    return items[items.length - 1]![0]
  }

  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.float() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j] as T, arr[i] as T]
    }
    return arr
  }

  /** 範囲内で小さい値に寄った分布（修理費など） */
  skewed(min: number, max: number, power = 2.2): number {
    return min + (max - min) * Math.pow(this.float(), power)
  }

  /** 指数分布（到着間隔） */
  exp(mean: number): number {
    return -Math.log(1 - this.float()) * mean
  }
}

export function roundTo(n: number, unit: number): number {
  return Math.round(n / unit) * unit
}
