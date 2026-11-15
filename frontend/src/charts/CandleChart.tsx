import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CandlestickSeries,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'
import type { Candle } from '../api/types'
import { useTheme } from '../state/theme'
import { fmtDateTime, fmtUsdWhole } from '../lib/format'
import { baseOptions, chartColors, uniqueBySecond } from './chartTheme'

interface Props {
  candles: Candle[]
  height?: number
}

/** Candlestick chart with an O/H/L/C readout for the hovered (or latest) candle. */
export function CandleChart({ candles, height = 360 }: Props) {
  const theme = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const [hovered, setHovered] = useState<Candle | null>(null)

  const data = useMemo(() => uniqueBySecond(candles), [candles])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const chart = createChart(el, baseOptions(theme, fmtUsdWhole))
    const series = chart.addSeries(CandlestickSeries, {
      priceLineVisible: false,
      lastValueVisible: false,
    })
    chartRef.current = chart
    seriesRef.current = series

    chart.subscribeCrosshairMove((param) => {
      const bar =
        param.time != null
          ? (param.seriesData.get(series) as CandlestickData | undefined)
          : undefined
      if (bar && typeof bar.open === 'number') {
        setHovered({
          time: (param.time as number) * 1000,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
        })
      } else {
        setHovered(null)
      }
    })

    return () => {
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
    // theme is applied by the effect below, without rebuilding the chart
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const chart = chartRef.current
    const series = seriesRef.current
    if (!chart || !series) return
    const c = chartColors(theme)
    chart.applyOptions(baseOptions(theme, fmtUsdWhole))
    series.applyOptions({
      upColor: c.up,
      downColor: c.down,
      borderUpColor: c.up,
      borderDownColor: c.down,
      wickUpColor: c.up,
      wickDownColor: c.down,
    })
  }, [theme])

  useEffect(() => {
    const chart = chartRef.current
    const series = seriesRef.current
    if (!chart || !series) return
    series.setData(
      data.map((c) => ({
        time: Math.floor(c.time / 1000) as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    )
    chart.timeScale().fitContent()
  }, [data])

  const shown = hovered ?? data[data.length - 1] ?? null
  const rose = shown ? shown.close >= shown.open : true

  return (
    <div>
      <div className="mb-2 flex min-h-6 flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm">
        {shown ? (
          <>
            <span className={rose ? 'font-medium text-up-text' : 'font-medium text-down-text'}>
              {rose ? '▲ Up' : '▼ Down'}
            </span>
            <Readout label="O" value={shown.open} />
            <Readout label="H" value={shown.high} />
            <Readout label="L" value={shown.low} />
            <Readout label="C" value={shown.close} />
            <span className="tnum text-ink-3">{fmtDateTime(shown.time)} UTC</span>
          </>
        ) : (
          <span className="text-ink-3">No candles in this range</span>
        )}
      </div>
      <div
        ref={containerRef}
        style={{ height }}
        role="img"
        aria-label="Candlestick chart of open, high, low and close prices. The table below lists the same values."
      />
      <div className="mt-2 flex gap-4 text-xs text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-up" aria-hidden="true" />
          Close above open
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-down" aria-hidden="true" />
          Close below open
        </span>
      </div>
    </div>
  )
}

function Readout({ label, value }: { label: string; value: number }) {
  return (
    <span className="tnum">
      <span className="text-ink-3">{label} </span>
      <span className="font-semibold text-ink">{fmtUsdWhole(value)}</span>
    </span>
  )
}
