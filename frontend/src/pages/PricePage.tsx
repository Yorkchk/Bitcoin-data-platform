import { useMemo, useState } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import type { PricePoint } from '../api/types'
import { SeriesChart } from '../charts/SeriesChart'
import { DataTable, type Column } from '../components/DataTable'
import { QueryView } from '../components/DataGate'
import { Card, Segmented, StatTile } from '../components/ui'
import { downloadCsv, toCsv } from '../lib/csv'
import { fmtPct, fmtUsd, fmtUsdCompact, fmtUsdWhole, toIsoMinute } from '../lib/format'

export type Metric = 'price' | 'marketCap' | 'volume'

const METRICS: { value: Metric; label: string }[] = [
  { value: 'price', label: 'Price' },
  { value: 'marketCap', label: 'Market cap' },
  { value: 'volume', label: 'Volume' },
]

const METRIC_INFO: Record<
  Metric,
  { name: string; format: (n: number) => string; axis: (n: number) => string; variant: 'area' | 'bars' }
> = {
  price: { name: 'Price', format: fmtUsd, axis: fmtUsdWhole, variant: 'area' },
  marketCap: { name: 'Market cap', format: fmtUsdCompact, axis: fmtUsdCompact, variant: 'area' },
  volume: { name: '24h volume', format: fmtUsdCompact, axis: fmtUsdCompact, variant: 'bars' },
}

const COLUMNS: Column<PricePoint>[] = [
  { key: 'time', header: 'Time (UTC)', render: (p) => toIsoMinute(p.time), sortValue: (p) => p.time },
  { key: 'price', header: 'Price', align: 'right', render: (p) => fmtUsd(p.price), sortValue: (p) => p.price },
  {
    key: 'marketCap',
    header: 'Market cap',
    align: 'right',
    render: (p) => fmtUsdCompact(p.marketCap),
    sortValue: (p) => p.marketCap,
  },
  {
    key: 'volume',
    header: '24h volume',
    align: 'right',
    render: (p) => fmtUsdCompact(p.volume),
    sortValue: (p) => p.volume,
  },
]

interface Props {
  query: UseQueryResult<PricePoint[]>
  /** Narrows the loaded rows; the page owns the filter controls. */
  filter: (points: PricePoint[]) => PricePoint[]
  /** Filter controls, rendered in one row above the chart. */
  controls: React.ReactNode
  chartTitle: string
  emptyText: string
  csvName: string
}

/**
 * Shared body of the two price pages (hourly history and previous day):
 * metric switch, filter row, summary tiles, chart and table.
 */
export function PriceView({ query, filter, controls, chartTitle, emptyText, csvName }: Props) {
  const [metric, setMetric] = useState<Metric>('price')
  const info = METRIC_INFO[metric]

  const rows = useMemo(() => filter(query.data ?? []), [query.data, filter])
  const points = useMemo(() => rows.map((p) => ({ time: p.time, value: p[metric] })), [rows, metric])

  const stats = useMemo(() => {
    if (points.length === 0) return null
    const first = points[0].value
    const last = points[points.length - 1].value
    const values = points.map((p) => p.value)
    return {
      first,
      last,
      high: Math.max(...values),
      low: Math.min(...values),
      changePct: first !== 0 ? ((last - first) / first) * 100 : null,
    }
  }, [points])

  function exportCsv() {
    downloadCsv(
      csvName,
      toCsv(rows, [
        { header: 'time_utc', value: (p) => toIsoMinute(p.time) },
        { header: 'price_usd', value: (p) => p.price },
        { header: 'market_cap_usd', value: (p) => p.marketCap },
        { header: 'total_volume_usd', value: (p) => p.volume },
      ]),
    )
  }

  return (
    <QueryView query={query} emptyText={emptyText}>
      {() => (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
            <Segmented label="Measure" options={METRICS} value={metric} onChange={setMetric} />
            {controls}
          </div>

          {stats && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile label={`${info.name} at end of range`} value={info.format(stats.last)} />
              <StatTile
                label="Change over range"
                value={stats.changePct == null ? '–' : fmtPct(stats.changePct)}
                tone={stats.changePct == null ? undefined : stats.changePct >= 0 ? 'up' : 'down'}
                detail={
                  stats.changePct == null ? undefined : stats.changePct >= 0 ? '▲ Rose' : '▼ Fell'
                }
              />
              <StatTile label="Highest" value={info.format(stats.high)} />
              <StatTile label="Lowest" value={info.format(stats.low)} />
            </div>
          )}

          <Card title={chartTitle} subtitle={`${rows.length.toLocaleString('en-US')} points in range`}>
            <SeriesChart
              points={points}
              name={info.name}
              variant={info.variant}
              formatValue={info.format}
              formatAxis={info.axis}
              height={360}
            />
          </Card>

          <Card
            title="Data"
            subtitle="The same rows as the chart"
            actions={
              <button type="button" className="btn" onClick={exportCsv} disabled={rows.length === 0}>
                Download CSV
              </button>
            }
          >
            <DataTable
              rows={rows}
              columns={COLUMNS}
              rowKey={(p) => p.time}
              caption={`${chartTitle}: price, market cap and volume by time`}
            />
          </Card>
        </div>
      )}
    </QueryView>
  )
}
