import { ColorType, CrosshairMode, type DeepPartial, type ChartOptions } from 'lightweight-charts'
import type { Theme } from '../state/theme'

/** Mirrors the CSS tokens in index.css; the canvas cannot read CSS variables. */
export interface ChartColors {
  text: string
  grid: string
  axis: string
  series: string
  seriesTop: string
  seriesBottom: string
  up: string
  down: string
  crosshair: string
}

const COLORS: Record<Theme, ChartColors> = {
  light: {
    text: '#6b6a65',
    grid: '#e1e0d9',
    axis: '#c3c2b7',
    series: '#2a78d6',
    seriesTop: 'rgba(42, 120, 214, 0.22)',
    seriesBottom: 'rgba(42, 120, 214, 0)',
    up: '#0ca30c',
    down: '#d03b3b',
    crosshair: '#898781',
  },
  dark: {
    text: '#9a988f',
    grid: '#2c2c2a',
    axis: '#383835',
    series: '#3987e5',
    seriesTop: 'rgba(57, 135, 229, 0.26)',
    seriesBottom: 'rgba(57, 135, 229, 0)',
    up: '#0ca30c',
    down: '#d03b3b',
    crosshair: '#898781',
  },
}

export function chartColors(theme: Theme): ChartColors {
  return COLORS[theme]
}

export function baseOptions(
  theme: Theme,
  formatValue: (n: number) => string,
): DeepPartial<ChartOptions> {
  const c = COLORS[theme]
  return {
    autoSize: true,
    layout: {
      background: { type: ColorType.Solid, color: 'transparent' },
      textColor: c.text,
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      fontSize: 12,
    },
    grid: {
      vertLines: { visible: false },
      horzLines: { color: c.grid },
    },
    rightPriceScale: { borderVisible: false },
    timeScale: {
      borderColor: c.axis,
      timeVisible: true,
      secondsVisible: false,
      fixLeftEdge: true,
      fixRightEdge: true,
    },
    crosshair: {
      mode: CrosshairMode.Magnet,
      vertLine: { color: c.crosshair, width: 1, style: 0, labelVisible: false },
      horzLine: { color: c.crosshair, width: 1, style: 0 },
    },
    localization: { priceFormatter: formatValue },
    // Keep the page scrollable: no wheel zoom, no vertical touch capture.
    handleScale: { mouseWheel: false, pinch: true, axisPressedMouseMove: false },
    handleScroll: { mouseWheel: false, vertTouchDrag: false, pressedMouseMove: true, horzTouchDrag: true },
  }
}

/** lightweight-charts needs strictly ascending, unique timestamps in seconds. */
export function uniqueBySecond<T extends { time: number }>(items: T[]): T[] {
  const bySecond = new Map<number, T>()
  for (const item of items) bySecond.set(Math.floor(item.time / 1000), item)
  return [...bySecond.entries()].sort((a, b) => a[0] - b[0]).map(([, item]) => item)
}
