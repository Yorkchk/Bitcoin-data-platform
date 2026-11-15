const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const usdWhole = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})
const usdCompact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 2,
})
const dateTime = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})
const dateOnly = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})
const timeOnly = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const DASH = '–'

/** $71,371.98 */
export function fmtUsd(n: number): string {
  return Number.isFinite(n) ? usd.format(n) : DASH
}

/** $71,372 */
export function fmtUsdWhole(n: number): string {
  return Number.isFinite(n) ? usdWhole.format(n) : DASH
}

/** $1.44T, $27.61B */
export function fmtUsdCompact(n: number): string {
  return Number.isFinite(n) ? usdCompact.format(n) : DASH
}

/** +1.23% or −0.45% (with a real minus sign) */
export function fmtPct(n: number): string {
  if (!Number.isFinite(n)) return DASH
  const sign = n > 0 ? '+' : n < 0 ? '−' : ''
  return `${sign}${Math.abs(n).toFixed(2)}%`
}

/** Nov 13, 2026, 04:00 (UTC) */
export function fmtDateTime(ms: number): string {
  return Number.isFinite(ms) ? dateTime.format(ms) : DASH
}

export function fmtDate(ms: number): string {
  return Number.isFinite(ms) ? dateOnly.format(ms) : DASH
}

export function fmtTime(ms: number): string {
  return Number.isFinite(ms) ? timeOnly.format(ms) : DASH
}

/** YYYY-MM-DD in UTC: the format the history endpoints and date inputs use. */
export function toIsoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/** "YYYY-MM-DD HH:MM" in UTC, for tables and CSV. */
export function toIsoMinute(ms: number): string {
  return new Date(ms).toISOString().slice(0, 16).replace('T', ' ')
}
