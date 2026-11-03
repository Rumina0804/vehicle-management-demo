import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type ChartType,
  type Plugin,
  type TooltipModel,
} from 'chart.js'

Chart.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
)

export const FONT = '"Noto Sans JP Variable", "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", Meiryo, sans-serif'

/** グラフのインク（文字は系列色を使わず、この3段階のみ） */
export const INK = {
  primary: '#0f2547',
  secondary: '#48597a',
  muted: '#7584a0',
  grid: '#e7edf5',
  axis: '#c9d5e6',
}

/** 系列色（検証済みパレットから） */
export const SERIES = {
  blue: '#2a78d6',
  blueSoft: '#86b6ef',
  orange: '#eb6834',
  /** 比較・前期間などの控えめな系列 */
  muted: '#9aa7b8',
}

Chart.defaults.font.family = FONT
Chart.defaults.font.size = 11
Chart.defaults.color = INK.muted
Chart.defaults.borderColor = INK.grid
Chart.defaults.maintainAspectRatio = false
Chart.defaults.plugins.tooltip.enabled = false
Chart.defaults.animation = { duration: 450 } as typeof Chart.defaults.animation

export interface TipRow {
  color: string
  value: string
  label: string
}

/**
 * HTML ツールチップ。値を太字で先に、系列名を後に。
 * 系列名は textContent で挿入（innerHTML は使わない）。
 */
export function htmlTooltip(build: (index: number) => { title: string; rows: TipRow[] } | null) {
  return ({ chart, tooltip }: { chart: Chart; tooltip: TooltipModel<ChartType> }) => {
    const parent = chart.canvas.parentElement
    if (!parent) return
    let el = parent.querySelector<HTMLDivElement>(':scope > .viz-tooltip')
    if (!el) {
      el = document.createElement('div')
      el.className = 'viz-tooltip'
      el.style.opacity = '0'
      parent.appendChild(el)
    }
    const point = tooltip.dataPoints?.[0]
    if (tooltip.opacity === 0 || !point) {
      el.style.opacity = '0'
      return
    }
    const data = build(point.dataIndex)
    if (!data) {
      el.style.opacity = '0'
      return
    }
    el.replaceChildren()
    const title = document.createElement('div')
    title.className = 'tt-title'
    title.textContent = data.title
    el.append(title)
    for (const r of data.rows) {
      const row = document.createElement('div')
      row.className = 'tt-row'
      const key = document.createElement('span')
      key.className = 'tt-key'
      key.style.background = r.color
      const val = document.createElement('span')
      val.className = 'tt-val'
      val.textContent = r.value
      const lab = document.createElement('span')
      lab.className = 'tt-lab'
      lab.textContent = r.label
      row.append(key, val, lab)
      el.append(row)
    }
    el.style.opacity = '1'
    const w = el.offsetWidth
    const h = el.offsetHeight
    let left = tooltip.caretX + 14
    if (left + w > parent.clientWidth - 4) left = tooltip.caretX - w - 14
    left = Math.max(4, left)
    const top = Math.min(Math.max(4, tooltip.caretY - h / 2), Math.max(4, parent.clientHeight - h - 4))
    el.style.left = `${left}px`
    el.style.top = `${top}px`
  }
}

/** 棒グラフ：ホバー中の月を薄い帯で示す */
export function hoverBandPlugin(): Plugin {
  return {
    id: 'hoverBand',
    beforeDatasetsDraw(chart) {
      const active = chart.getActiveElements()
      const x = chart.scales.x
      const n = chart.data.labels?.length ?? 0
      if (!active.length || !x || !n) return
      const w = (x.right - x.left) / n
      const xc = x.getPixelForValue(active[0]!.index)
      const { top, bottom } = chart.chartArea
      const ctx = chart.ctx
      ctx.save()
      ctx.fillStyle = 'rgba(27, 102, 214, 0.07)'
      ctx.fillRect(xc - w / 2, top, w, bottom - top)
      ctx.restore()
    },
  }
}

/** 折れ線：ホバー位置の縦線（ポインタは日付＝X位置を狙えばよい） */
export function crosshairPlugin(): Plugin {
  return {
    id: 'crosshair',
    afterDatasetsDraw(chart) {
      const active = chart.getActiveElements()
      if (!active.length) return
      const x = Math.round(active[0]!.element.x) + 0.5
      const { top, bottom } = chart.chartArea
      const ctx = chart.ctx
      ctx.save()
      ctx.strokeStyle = 'rgba(15, 37, 71, 0.28)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, top)
      ctx.lineTo(x, bottom)
      ctx.stroke()
      ctx.restore()
    },
  }
}

export interface EndLabel {
  datasetIndex: number
  text: (value: number) => string
}

/** 折れ線の終点にだけ値を表示（選択的なダイレクトラベル） */
export function endLabelsPlugin(get: () => EndLabel[]): Plugin {
  return {
    id: 'endLabels',
    afterDatasetsDraw(chart) {
      const ctx = chart.ctx
      for (const l of get()) {
        const meta = chart.getDatasetMeta(l.datasetIndex)
        const data = chart.data.datasets[l.datasetIndex]?.data as (number | null)[] | undefined
        if (!meta || meta.hidden || !data) continue
        let last = -1
        for (let i = data.length - 1; i >= 0; i--) {
          if (data[i] !== null && data[i] !== undefined) {
            last = i
            break
          }
        }
        const el = meta.data[last]
        if (last < 0 || !el) continue
        const text = l.text(data[last] as number)
        ctx.save()
        ctx.font = `700 11px ${FONT}`
        const tw = ctx.measureText(text).width
        let x = el.x + 9
        let y = el.y
        if (x + tw > chart.width - 2) {
          x = Math.max(chart.chartArea.left, Math.min(el.x - tw / 2, chart.width - tw - 2))
          y = el.y - 14
        }
        ctx.textBaseline = 'middle'
        ctx.lineJoin = 'round'
        ctx.lineWidth = 4
        ctx.strokeStyle = 'rgba(255,255,255,0.95)'
        ctx.strokeText(text, x, y)
        ctx.fillStyle = INK.primary
        ctx.fillText(text, x, y)
        ctx.restore()
      }
    },
  }
}

export interface Callout {
  index: number
  datasetIndex: number
  text: string
}

/** 注目する1本の棒の上に吹き出しを表示 */
export function calloutPlugin(get: () => Callout | null): Plugin {
  return {
    id: 'callout',
    afterDatasetsDraw(chart) {
      const c = get()
      if (!c) return
      const el = chart.getDatasetMeta(c.datasetIndex)?.data[c.index]
      if (!el) return
      const ctx = chart.ctx
      ctx.save()
      ctx.font = `700 11px ${FONT}`
      const tw = ctx.measureText(c.text).width
      const w = tw + 14
      const h = 22
      const x = Math.min(Math.max(chart.chartArea.left, el.x - w / 2), chart.chartArea.right - w)
      const y = Math.max(2, el.y - h - 10)
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = '#eb6834'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.roundRect(x, y, w, h, 5)
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(el.x - 5, y + h)
      ctx.lineTo(el.x, y + h + 6)
      ctx.lineTo(el.x + 5, y + h)
      ctx.fillStyle = '#eb6834'
      ctx.fill()
      ctx.fillStyle = INK.primary
      ctx.textBaseline = 'middle'
      ctx.fillText(c.text, x + 7, y + h / 2 + 0.5)
      ctx.restore()
    },
  }
}

export const thousandTick = (v: number | string) => Number(v).toLocaleString('ja-JP')
