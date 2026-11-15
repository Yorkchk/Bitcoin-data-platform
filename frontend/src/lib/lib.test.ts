import { describe, expect, it } from 'vitest'
import type { Candle, PricePoint } from '../api/types'
import { toCsv } from './csv'
import { fmtPct, fmtUsd, fmtUsdCompact, toIsoDate, toIsoMinute } from './format'
import { DAY, HOUR, filterByTime, lastDays, summarizeCandles, summarizePrices } from './stats'

const T0 = Date.UTC(2026, 10, 13, 0, 0, 0)

function point(hours: number, price: number): PricePoint {
  return { time: T0 + hours * HOUR, price, marketCap: price * 20e6, volume: 1e9 }
}

describe('format', () => {
  it('formats US dollars', () => {
    expect(fmtUsd(71371.98179)).toBe('$71,371.98')
    expect(fmtUsdCompact(1_435_378_412_886)).toBe('$1.44T')
    expect(fmtUsd(Number.NaN)).toBe('–')
  })

  it('formats percentages with an explicit sign', () => {
    expect(fmtPct(1.234)).toBe('+1.23%')
    expect(fmtPct(-0.456)).toBe('−0.46%')
    expect(fmtPct(0)).toBe('0.00%')
  })

  it('formats UTC dates regardless of the local timezone', () => {
    expect(toIsoDate(T0)).toBe('2026-11-13')
    expect(toIsoMinute(T0 + 4.5 * HOUR)).toBe('2026-11-13 04:30')
  })
})

describe('summarizePrices', () => {
  it('returns null for no data', () => {
    expect(summarizePrices([])).toBeNull()
  })

  it('computes 24h change, high and low from hourly points', () => {
    const points = Array.from({ length: 49 }, (_, h) => point(h, 100 + h))
    const s = summarizePrices(points)
    expect(s?.latest.price).toBe(148)
    expect(s?.change24hAbs).toBe(24)
    expect(s?.change24hPct).toBeCloseTo((24 / 124) * 100, 6)
    expect(s?.high24h).toBe(148)
    expect(s?.low24h).toBe(124)
  })

  it('reports no 24h change when nothing is close to 24h earlier', () => {
    const s = summarizePrices([point(0, 100), point(100, 120)])
    expect(s?.change24hPct).toBeNull()
    expect(s?.change24hAbs).toBeNull()
  })
})

describe('time filters', () => {
  const points = [point(0, 1), point(24, 2), point(48, 3), point(72, 4)]

  it('filters inclusively and treats missing bounds as open', () => {
    expect(filterByTime(points, T0 + DAY, T0 + 2 * DAY).map((p) => p.price)).toEqual([2, 3])
    expect(filterByTime(points, null, T0 + DAY).map((p) => p.price)).toEqual([1, 2])
    expect(filterByTime(points)).toHaveLength(4)
  })

  it('measures lastDays back from the newest point', () => {
    expect(lastDays(points, 1).map((p) => p.price)).toEqual([3, 4])
    expect(lastDays([], 7)).toEqual([])
  })
})

describe('summarizeCandles', () => {
  it('uses the first open, last close and the extremes', () => {
    const candles: Candle[] = [
      { time: T0, open: 100, high: 110, low: 95, close: 105 },
      { time: T0 + HOUR, open: 105, high: 120, low: 90, close: 90 },
    ]
    expect(summarizeCandles(candles)).toEqual({
      open: 100,
      close: 90,
      high: 120,
      low: 90,
      changePct: -10,
    })
    expect(summarizeCandles([])).toBeNull()
  })
})

describe('toCsv', () => {
  it('writes a header row and escapes commas, quotes and newlines', () => {
    const csv = toCsv(
      [
        { a: 'plain', b: 1 },
        { a: 'has, comma', b: 2 },
        { a: 'has "quote"', b: 3 },
      ],
      [
        { header: 'a', value: (r) => r.a },
        { header: 'b', value: (r) => r.b },
      ],
    )
    expect(csv).toBe('a,b\r\nplain,1\r\n"has, comma",2\r\n"has ""quote""",3')
  })
})
