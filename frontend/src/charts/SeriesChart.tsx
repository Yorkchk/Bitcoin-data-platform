import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AreaSeries,
  HistogramSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'
import { useTheme } from '../state/theme'
import { fmtDateTime } from '../lib/format'
import { baseOptions, chartColors, uniqueBySecond } from './chartTheme'

export interface SeriesPoint {
  /** Epoch milliseconds (UTC). */
  time: number
  value: number
}

interface Props {
  points: SeriesPoint[]
  /** Name of the measure, shown in the readout (e.g. "Price"). */
  name: string
  variant?: 'area' | 'bars'
  height?: number
  formatValue: (n: number) => string
  /** Compact formatter for the axis; defaults to formatValue. */
  formatAxis?: (n: number) => string
}

/**
 * Single-series time chart with a crosshair. The readout above the plot shows
 * the hovered point, or the latest point when nothing is hovered.
 */
export function SeriesChart({
  points,
  name,
  variant = 'area',
  height = 320,
  formatValue,
  formatAxis,
}: Props) {
  const theme = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Area'> | ISeriesApi<'Histogram'> | null>(null)
  const [hovered, setHovered] = useState<SeriesPoint | null>(null)

  const data = useMemo(() => uniqueBySecond(points), [points])
  const axisFormat = formatAxis ?? formatValue

  // Create the chart once per variant.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const chart = createChart(el, baseOptions(theme, axisFormat))
    const series =
      variant === 'bars'
        ? chart.addSeries(HistogramSeries, { priceLineVisible: false, lastValueVisible: false })
        : chart.addSeries(AreaSeries, {
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerRadius: 4,
          })
    chartRef.current = chart
    seriesRef.current = series

    chart.subscribeCrosshairMove((param) => {
      const point = param.time != null ? param.seriesData.get(series) : undefined
      if (point && 'value' in point && typeof point.value === 'number') {
        setHovered({ time: (param.time as number) * 1000, value: point.value })
      } else {
        setHovered(null)
      }
    })

    return () => {
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
    // theme and formatter are applied by the effect below, without rebuilding the chart
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant])

  // Theme and formatter.
  useEffect(() => {
    const chart = chartRef.current
    const series = seriesRef.current
    if (!chart || !series) return
    const c = chartColors(theme)
    chart.applyOptions(baseOptions(theme, axisFormat))
    if (variant === 'bars') {
      series.applyOptions({ color: c.series })
    } else {
      series.applyOptions({
        lineColor: c.series,
        topColor: c.seriesTop,
        bottomColor: c.seriesBottom,
        crosshairMarkerBackgroundColor: c.series,
      })
    }
  }, [theme, axisFormat, variant])

  // Data.
  useEffect(() => {
    const chart = chartRef.current
    const series = seriesRef.current
    if (!chart || !series) return
    series.setData(
      data.map((p) => ({ time: Math.floor(p.time / 1000) as UTCTimestamp, value: p.value })),
    )
    chart.timeScale().fitContent()
  }, [data, variant])

  const shown = hovered ?? data[data.length - 1] ?? null

  return (
    <div>
      <div className="mb-2 flex min-h-6 flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm" aria-live="off">
        {shown ? (
          <>
            <span className="inline-flex items-center gap-1.5 text-ink-2">
              <span className="inline-block h-2 w-2 rounded-full bg-series" aria-hidden="true" />
              {name}
            </span>
            <span className="tnum font-semibold text-ink">{formatValue(shown.value)}</span>
            <span className="tnum text-ink-3">{fmtDateTime(shown.time)} UTC</span>
          </>
        ) : (
          <span className="text-ink-3">No data in this range</span>
        )}
      </div>
      <div
        ref={containerRef}
        style={{ height }}
        role="img"
        aria-label={`${name} over time. The table below lists the same values.`}
      />
    </div>
  )
}
