import { useCallback, useState } from 'react'
import { useLiveChart } from '../api/queries'
import type { PricePoint } from '../api/types'
import { PageHeader } from '../components/ui'
import { fmtDate } from '../lib/format'
import { PriceView } from './PricePage'

/** Minutes since midnight UTC for an epoch-ms time. */
function minuteOfDay(ms: number): number {
  const d = new Date(ms)
  return d.getUTCHours() * 60 + d.getUTCMinutes()
}

/** "HH:MM" from a time input → minutes since midnight, or null when empty. */
function parseMinutes(value: string): number | null {
  if (!value) return null
  const [h, m] = value.split(':').map(Number)
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null
}

export function Live() {
  return (
    <>
      <PageHeader
        title="Previous day"
        description="Intraday price, market cap and volume for the most recent full day the pipeline has loaded. It refreshes once a day, after the nightly run."
      />
      <Body />
    </>
  )
}

function Body() {
  const query = useLiveChart()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const filter = useCallback(
    (points: PricePoint[]) => {
      const start = parseMinutes(from)
      const end = parseMinutes(to)
      return points.filter((p) => {
        const minute = minuteOfDay(p.time)
        return (start == null || minute >= start) && (end == null || minute <= end)
      })
    },
    [from, to],
  )

  const day = query.data && query.data.length > 0 ? fmtDate(query.data[0].time) : null

  const controls = (
    <>
      <div>
        <label htmlFor="live-from" className="label">
          From (UTC)
        </label>
        <input
          id="live-from"
          type="time"
          className="field w-32"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="live-to" className="label">
          To (UTC)
        </label>
        <input
          id="live-to"
          type="time"
          className="field w-32"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>
      {(from || to) && (
        <button
          type="button"
          className="btn h-9"
          onClick={() => {
            setFrom('')
            setTo('')
          }}
        >
          Whole day
        </button>
      )}
    </>
  )

  return (
    <PriceView
      query={query}
      filter={filter}
      controls={controls}
      chartTitle={day ? `Intraday · ${day}` : 'Intraday'}
      emptyText="No intraday rows yet. They appear after the first incremental_load run."
      csvName="bitcoin_previous_day.csv"
    />
  )
}
