import type { Candle, PricePoint } from '../api/types'

export const HOUR = 3_600_000
export const DAY = 24 * HOUR

export interface PriceSummary {
  latest: PricePoint
  /** Change against the point closest to 24h before the latest one; null if none is close. */
  change24hPct: number | null
  change24hAbs: number | null
  high24h: number
  low24h: number
}

/** Points must be sorted by time ascending. */
export function summarizePrices(points: PricePoint[]): PriceSummary | null {
  if (points.length === 0) return null
  const latest = points[points.length - 1]
  const cutoff = latest.time - DAY
  const window = points.filter((p) => p.time >= cutoff)

  // Reference = the point nearest to exactly 24h earlier, if one is within 2h of it.
  let reference: PricePoint | null = null
  for (const p of points) {
    if (p === latest) continue
    if (!reference || Math.abs(p.time - cutoff) < Math.abs(reference.time - cutoff)) reference = p
  }
  const usable = reference && Math.abs(reference.time - cutoff) <= 2 * HOUR ? reference : null

  return {
    latest,
    change24hAbs: usable ? latest.price - usable.price : null,
    change24hPct:
      usable && usable.price !== 0 ? ((latest.price - usable.price) / usable.price) * 100 : null,
    high24h: Math.max(...window.map((p) => p.price)),
    low24h: Math.min(...window.map((p) => p.price)),
  }
}

/** Keep items whose time falls in [from, to] (inclusive, epoch ms). */
export function filterByTime<T extends { time: number }>(
  items: T[],
  from?: number | null,
  to?: number | null,
): T[] {
  return items.filter((i) => (from == null || i.time >= from) && (to == null || i.time <= to))
}

/** The last `days` days of data, measured back from the newest item. */
export function lastDays<T extends { time: number }>(items: T[], days: number): T[] {
  if (items.length === 0) return items
  const newest = items[items.length - 1].time
  return filterByTime(items, newest - days * DAY)
}

export interface CandleSummary {
  open: number
  close: number
  high: number
  low: number
  changePct: number | null
}

export function summarizeCandles(candles: Candle[]): CandleSummary | null {
  if (candles.length === 0) return null
  const open = candles[0].open
  const close = candles[candles.length - 1].close
  return {
    open,
    close,
    high: Math.max(...candles.map((c) => c.high)),
    low: Math.min(...candles.map((c) => c.low)),
    changePct: open !== 0 ? ((close - open) / open) * 100 : null,
  }
}
