import { useMemo, useState } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { useHistoryOhlc, useLiveOhlc } from '../api/queries'
import type { Candle } from '../api/types'
import { CandleChart } from '../charts/CandleChart'
import { DataTable, type Column } from '../components/DataTable'
import { QueryView } from '../components/DataGate'
import { Card, PageHeader, Segmented, StatTile } from '../components/ui'
import { downloadCsv, toCsv } from '../lib/csv'
import { fmtDate, fmtPct, fmtUsd, fmtUsdWhole, toIsoMinute } from '../lib/format'
import { lastDays, summarizeCandles } from '../lib/stats'

type Tab = 'history' | 'live'
type Range = '7' | '14' | '30'

const TABS: { value: Tab; label: string }[] = [
  { value: 'history', label: '4-hour · 30 days' },
  { value: 'live', label: '30-minute · previous day' },
]
const RANGES: { value: Range; label: string }[] = [
  { value: '7', label: '7D' },
  { value: '14', label: '14D' },
  { value: '30', label: '30D' },
]

const COLUMNS: Column<Candle>[] = [
  { key: 'time', header: 'Time (UTC)', render: (c) => toIsoMinute(c.time), sortValue: (c) => c.time },
  { key: 'open', header: 'Open', align: 'right', render: (c) => fmtUsd(c.open), sortValue: (c) => c.open },
  { key: 'high', header: 'High', align: 'right', render: (c) => fmtUsd(c.high), sortValue: (c) => c.high },
  { key: 'low', header: 'Low', align: 'right', render: (c) => fmtUsd(c.low), sortValue: (c) => c.low },
  { key: 'close', header: 'Close', align: 'right', render: (c) => fmtUsd(c.close), sortValue: (c) => c.close },
  {
    key: 'move',
    header: 'Move',
    align: 'right',
    render: (c) => {
      const pct = c.open !== 0 ? ((c.close - c.open) / c.open) * 100 : 0
      return (
        <span className={pct >= 0 ? 'text-up-text' : 'text-down-text'}>
          {pct >= 0 ? '▲' : '▼'} {fmtPct(pct)}
        </span>
      )
    },
    sortValue: (c) => (c.open !== 0 ? (c.close - c.open) / c.open : 0),
  },
]

export function Candles() {
  const [tab, setTab] = useState<Tab>('history')
  return (
    <>
      <PageHeader
        title="Candles"
        description="Open, high, low and close prices: 4-hour candles for the last 30 days, and 30-minute candles for the previous day."
      />
      <div className="mb-6">
          <Segmented label="Candle set" options={TABS} value={tab} onChange={setTab} />
        </div>
      {tab === 'history' ? <HistoryCandles /> : <LiveCandles />}
    </>
  )
}

function HistoryCandles() {
  const query = useHistoryOhlc()
  const [range, setRange] = useState<Range>('30')
  const candles = useMemo(() => lastDays(query.data ?? [], Number(range)), [query.data, range])
  return (
    <CandleView
      query={query}
      candles={candles}
      title="4-hour candles"
      controls={<Segmented label="Time range" options={RANGES} value={range} onChange={setRange} />}
      emptyText="The OHLC history table is empty. Run the pipeline with mode=initial_load."
      csvName="bitcoin_4h_candles.csv"
    />
  )
}

function LiveCandles() {
  const query = useLiveOhlc()
  const candles = query.data ?? []
  const day = candles.length > 0 ? fmtDate(candles[0].time) : null
  return (
    <CandleView
      query={query}
      candles={candles}
      title={day ? `30-minute candles · ${day}` : '30-minute candles'}
      emptyText="No intraday candles yet. They appear after the first incremental_load run."
      csvName="bitcoin_30m_candles.csv"
    />
  )
}

function CandleView({
  query,
  candles,
  title,
  controls,
  emptyText,
  csvName,
}: {
  query: UseQueryResult<Candle[]>
  candles: Candle[]
  title: string
  controls?: React.ReactNode
  emptyText: string
  csvName: string
}) {
  const summary = useMemo(() => summarizeCandles(candles), [candles])

  function exportCsv() {
    downloadCsv(
      csvName,
      toCsv(candles, [
        { header: 'time_utc', value: (c) => toIsoMinute(c.time) },
        { header: 'open', value: (c) => c.open },
        { header: 'high', value: (c) => c.high },
        { header: 'low', value: (c) => c.low },
        { header: 'close', value: (c) => c.close },
      ]),
    )
  }

  return (
    <QueryView query={query} height={360} emptyText={emptyText}>
      {() => (
        <div className="space-y-6">
          {summary && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile label="Open of range" value={fmtUsdWhole(summary.open)} />
              <StatTile
                label="Close of range"
                value={fmtUsdWhole(summary.close)}
                tone={summary.changePct == null ? undefined : summary.changePct >= 0 ? 'up' : 'down'}
                detail={
                  summary.changePct == null
                    ? undefined
                    : `${summary.changePct >= 0 ? '▲' : '▼'} ${fmtPct(summary.changePct)} vs open`
                }
              />
              <StatTile label="Highest high" value={fmtUsdWhole(summary.high)} />
              <StatTile label="Lowest low" value={fmtUsdWhole(summary.low)} />
            </div>
          )}

          <Card
            title={title}
            subtitle={`${candles.length.toLocaleString('en-US')} candles in range`}
            actions={controls}
          >
            <CandleChart candles={candles} height={380} />
          </Card>

          <Card
            title="Data"
            subtitle="The same candles as the chart"
            actions={
              <button type="button" className="btn" onClick={exportCsv} disabled={candles.length === 0}>
                Download CSV
              </button>
            }
          >
            <DataTable
              rows={candles}
              columns={COLUMNS}
              rowKey={(c) => c.time}
              caption={`${title}: open, high, low and close by time`}
            />
          </Card>
        </div>
      )}
    </QueryView>
  )
}
