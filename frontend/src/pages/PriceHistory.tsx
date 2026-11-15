import { useCallback, useMemo, useState } from 'react'
import { useHistoryChart } from '../api/queries'
import type { PricePoint } from '../api/types'
import { RequireKey } from '../components/DataGate'
import { PageHeader } from '../components/ui'
import { toIsoDate } from '../lib/format'
import { DAY, filterByTime } from '../lib/stats'
import { PriceView } from './PricePage'

const PRESETS = [
  { days: 7, label: '7D' },
  { days: 30, label: '30D' },
  { days: 90, label: '90D' },
]

export function PriceHistory() {
  return (
    <>
      <PageHeader
        title="Price history"
        description="Hourly price, market cap and 24-hour volume for the last 90 days."
        endpoint="GET /get_historyChart"
      />
      <RequireKey>
        <Body />
      </RequireKey>
    </>
  )
}

function Body() {
  const query = useHistoryChart()
  const data = query.data
  const minDate = data && data.length > 0 ? toIsoDate(data[0].time) : undefined
  const maxDate = data && data.length > 0 ? toIsoDate(data[data.length - 1].time) : undefined

  // Empty string = no bound, so the full loaded range shows by default.
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const filter = useCallback(
    (points: PricePoint[]) => {
      const start = from ? Date.parse(`${from}T00:00:00Z`) : null
      const end = to ? Date.parse(`${to}T00:00:00Z`) + DAY - 1 : null
      return filterByTime(points, start, end)
    },
    [from, to],
  )

  const activePreset = useMemo(() => {
    if (!data || data.length === 0 || to) return null
    if (!from) return 90
    const newest = data[data.length - 1].time
    return PRESETS.find((p) => toIsoDate(newest - p.days * DAY) === from)?.days ?? null
  }, [data, from, to])

  function applyPreset(days: number) {
    if (!data || data.length === 0) return
    setTo('')
    setFrom(days >= 90 ? '' : toIsoDate(data[data.length - 1].time - days * DAY))
  }

  const controls = (
    <>
      <div role="group" aria-label="Quick ranges" className="flex gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.days}
            type="button"
            className="btn h-9 px-3"
            aria-pressed={activePreset === p.days}
            style={activePreset === p.days ? { background: 'var(--surface-2)' } : undefined}
            onClick={() => applyPreset(p.days)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div>
        <label htmlFor="hist-from" className="label">
          From
        </label>
        <input
          id="hist-from"
          type="date"
          className="field w-40"
          value={from}
          min={minDate}
          max={to || maxDate}
          onChange={(e) => setFrom(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="hist-to" className="label">
          To
        </label>
        <input
          id="hist-to"
          type="date"
          className="field w-40"
          value={to}
          min={from || minDate}
          max={maxDate}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>
    </>
  )

  return (
    <PriceView
      query={query}
      filter={filter}
      controls={controls}
      chartTitle="Hourly history"
      emptyText="The history table is empty. Run the pipeline with mode=initial_load."
      csvName="bitcoin_hourly_history.csv"
    />
  )
}
