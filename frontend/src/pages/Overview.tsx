import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useHistoryChart, useHistoryOhlc, useLiveChart, useLiveOhlc } from '../api/queries'
import { CandleChart } from '../charts/CandleChart'
import { SeriesChart } from '../charts/SeriesChart'
import { QueryView } from '../components/DataGate'
import { Card, PageHeader, Segmented, Skeleton, StatTile } from '../components/ui'
import { fmtDate, fmtPct, fmtUsd, fmtUsdCompact, fmtUsdWhole } from '../lib/format'
import { lastDays, summarizeCandles, summarizePrices } from '../lib/stats'

type Range = '7' | '30' | '90'
const RANGES: { value: Range; label: string }[] = [
  { value: '7', label: '7D' },
  { value: '30', label: '30D' },
  { value: '90', label: '90D' },
]

export function Overview() {
  return (
    <>
      <PageHeader
        title="Bitcoin overview"
        description="BTC / USD from the gold layer: hourly history, 4-hour candles and the previous day's intraday data."
      />
      <OverviewBody />
    </>
  )
}

function OverviewBody() {
  const history = useHistoryChart()
  const candles = useHistoryOhlc()
  const live = useLiveChart()
  const liveCandles = useLiveOhlc()
  const [range, setRange] = useState<Range>('30')

  const summary = useMemo(() => summarizePrices(history.data ?? []), [history.data])
  const ranged = useMemo(
    () => lastDays(history.data ?? [], Number(range)).map((p) => ({ time: p.time, value: p.price })),
    [history.data, range],
  )
  const weekCandles = useMemo(() => lastDays(candles.data ?? [], 7), [candles.data])
  const daySummary = useMemo(() => summarizeCandles(liveCandles.data ?? []), [liveCandles.data])

  return (
    <div className="space-y-6">
      {/* Headline numbers */}
      {history.isPending ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={96} />
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label={`Price · ${fmtDate(summary.latest.time)}`}
            value={fmtUsd(summary.latest.price)}
            tone={
              summary.change24hPct == null ? undefined : summary.change24hPct >= 0 ? 'up' : 'down'
            }
            detail={
              summary.change24hPct == null
                ? 'No point 24h earlier'
                : `${summary.change24hPct >= 0 ? '▲' : '▼'} ${fmtPct(summary.change24hPct)} in 24h`
            }
          />
          <StatTile
            label="24h range"
            value={`${fmtUsdWhole(summary.low24h)} – ${fmtUsdWhole(summary.high24h)}`}
            detail="Low – high"
          />
          <StatTile
            label="Market cap"
            value={fmtUsdCompact(summary.latest.marketCap)}
            detail="At the latest hour"
          />
          <StatTile
            label="24h volume"
            value={fmtUsdCompact(summary.latest.volume)}
            detail="Rolling total traded"
          />
        </div>
      ) : null}

      <Card
        title="Price"
        subtitle="Hourly, last 90 days"
        actions={<Segmented label="Time range" options={RANGES} value={range} onChange={setRange} />}
      >
        <QueryView
          query={history}
          emptyText="The history table is empty. Run the pipeline with mode=initial_load."
        >
          {() => <SeriesChart points={ranged} name="Price" formatValue={fmtUsd} formatAxis={fmtUsdWhole} />}
        </QueryView>
        <p className="mt-3 text-sm">
          <Link to="/history" className="font-medium text-ink underline">
            Open price history
          </Link>
          <span className="text-ink-3"> for market cap, volume, a date filter and the table.</span>
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="4-hour candles" subtitle="Last 7 days">
          <QueryView
            query={candles}
            height={280}
            emptyText="The OHLC history table is empty. Run the pipeline with mode=initial_load."
          >
            {() => <CandleChart candles={weekCandles} height={280} />}
          </QueryView>
          <p className="mt-3 text-sm">
            <Link to="/candles" className="font-medium text-ink underline">
              Open candles
            </Link>
          </p>
        </Card>

        <Card
          title="Previous day"
          subtitle={
            live.data && live.data.length > 0
              ? `${fmtDate(live.data[0].time)}, intraday`
              : 'Intraday'
          }
        >
          <QueryView
            query={live}
            height={280}
            emptyText="No intraday rows yet. They appear after the first incremental_load run."
          >
            {(points) => (
              <SeriesChart
                points={points.map((p) => ({ time: p.time, value: p.price }))}
                name="Price"
                height={220}
                formatValue={fmtUsd}
                formatAxis={fmtUsdWhole}
              />
            )}
          </QueryView>
          {daySummary && (
            <dl className="mt-3 grid grid-cols-4 gap-2 border-t border-line pt-3 text-sm">
              <DayStat label="Open" value={fmtUsdWhole(daySummary.open)} />
              <DayStat label="High" value={fmtUsdWhole(daySummary.high)} />
              <DayStat label="Low" value={fmtUsdWhole(daySummary.low)} />
              <DayStat label="Close" value={fmtUsdWhole(daySummary.close)} />
            </dl>
          )}
          <p className="mt-3 text-sm">
            <Link to="/live" className="font-medium text-ink underline">
              Open previous day
            </Link>
          </p>
        </Card>
      </div>

      <DeveloperBand />
    </div>
  )
}

function DeveloperBand() {
  return (
    <section className="card flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-ink">Use this data in your own code</h2>
        <p className="mt-1 max-w-xl text-sm text-ink-2">
          Every chart on this site is also available as a JSON API. Get a free key (100 requests a
          day) and start with copy-ready examples in curl, Python and JavaScript.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link to="/developers" className="btn">
          Read the docs
        </Link>
        <Link to="/developers/keys" className="btn btn-primary">
          Get a free API key
        </Link>
      </div>
    </section>
  )
}

function DayStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className="tnum font-medium text-ink">{value}</dd>
    </div>
  )
}
