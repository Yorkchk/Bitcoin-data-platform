import type {
  Candle,
  ChartRow,
  CreatedKey,
  CreateKeyRequest,
  Credentials,
  OhlcRow,
  PricePoint,
  RangeParams,
} from './types'

/** nginx (and the Vite dev proxy) forward /api/* to the FastAPI service. */
export const API_BASE = '/api'

export type ApiErrorKind =
  | 'invalid-key' // 404: key name or api key not found
  | 'rate-limited' // 429: daily limit reached
  | 'name-taken' // 401: key name already exists (or blank)
  | 'bad-request' // 422: parameter validation failed
  | 'server' // 5xx: usually the SQL database waking up
  | 'network' // no response at all
  | 'unknown'

export class ApiError extends Error {
  readonly status: number
  readonly kind: ApiErrorKind

  constructor(status: number, kind: ApiErrorKind, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.kind = kind
  }
}

export function kindForStatus(status: number): ApiErrorKind {
  if (status === 404) return 'invalid-key'
  if (status === 429) return 'rate-limited'
  if (status === 401) return 'name-taken'
  if (status === 422) return 'bad-request'
  if (status >= 500) return 'server'
  return 'unknown'
}

const FRIENDLY: Record<ApiErrorKind, string> = {
  'invalid-key': 'That key name and API key do not match a key on the server.',
  'rate-limited': 'This key has used its 100 requests for today. The limit resets within 24 hours.',
  'name-taken': 'That key name is already taken (or was left blank). Pick a different name.',
  'bad-request': 'The server rejected one of the parameters.',
  server:
    'The server could not answer. The database pauses when idle and can take up to a minute to wake up, so try again shortly.',
  network: 'Could not reach the API. Check that the containers are running.',
  unknown: 'The request failed.',
}

export function friendlyMessage(kind: ApiErrorKind): string {
  return FRIENDLY[kind]
}

/** Pull FastAPI's `detail` out of an error body, whatever shape it has. */
export function extractDetail(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const detail = (body as { detail?: unknown }).detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const parts = detail
      .map((d) => {
        if (d && typeof d === 'object') {
          const rawLoc = (d as { loc?: unknown }).loc
          const loc = Array.isArray(rawLoc) ? rawLoc.slice(1).join('.') : ''
          const msg = String((d as { msg?: unknown }).msg ?? '')
          return loc ? `${loc}: ${msg}` : msg
        }
        return String(d)
      })
      .filter(Boolean)
    return parts.length ? parts.join('; ') : null
  }
  return null
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, init)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError(0, 'network', FRIENDLY.network)
  }
  if (!res.ok) {
    const kind = kindForStatus(res.status)
    let detail: string | null = null
    try {
      detail = extractDetail(await res.json())
    } catch {
      /* non-JSON error body */
    }
    const message =
      kind === 'bad-request' && detail ? `${FRIENDLY[kind]} (${detail})` : FRIENDLY[kind]
    throw new ApiError(res.status, kind, message)
  }
  return (await res.json()) as T
}

export function buildQuery(
  creds: Credentials,
  params: RangeParams,
  mode: 'date' | 'time',
): string {
  const q = new URLSearchParams()
  q.set('key_name', creds.keyName)
  q.set('api_key', creds.apiKey)
  if (params.start) q.set(mode === 'date' ? 'start_date' : 'start_time', params.start)
  if (params.end) q.set(mode === 'date' ? 'end_date' : 'end_time', params.end)
  if (params.limit != null) q.set('limit', String(params.limit))
  return q.toString()
}

export function createKey(body: CreateKeyRequest, signal?: AbortSignal): Promise<CreatedKey> {
  return request<CreatedKey>('/generareApi/', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key_name: body.key_name, owner_email: body.owner_email || null }),
    signal,
  })
}

export function getHistoryChart(
  creds: Credentials,
  params: RangeParams = {},
  signal?: AbortSignal,
) {
  return request<ChartRow[]>(`/get_historyChart?${buildQuery(creds, params, 'date')}`, { signal })
}

export function getLiveChart(creds: Credentials, params: RangeParams = {}, signal?: AbortSignal) {
  return request<ChartRow[]>(`/get_liveChart?${buildQuery(creds, params, 'time')}`, { signal })
}

export function getHistoryOhlc(
  creds: Credentials,
  params: RangeParams = {},
  signal?: AbortSignal,
) {
  return request<OhlcRow[]>(`/get_historyOhlc?${buildQuery(creds, params, 'date')}`, { signal })
}

export function getLiveOhlc(creds: Credentials, params: RangeParams = {}, signal?: AbortSignal) {
  return request<OhlcRow[]>(`/get_liveOhlc?${buildQuery(creds, params, 'time')}`, { signal })
}

/** The API returns UTC datetimes with no zone marker; parse them as UTC. */
export function parseUtc(value: string): number {
  const iso = value.includes('T') ? value : value.replace(' ', 'T')
  return Date.parse(/([zZ]|[+-]\d\d:?\d\d)$/.test(iso) ? iso : `${iso}Z`)
}

export function toPricePoints(rows: ChartRow[]): PricePoint[] {
  return rows
    .map((r) => ({
      time: parseUtc(r.bitcoin_date),
      price: r.price,
      marketCap: r.market_cap,
      volume: r.total_volume,
    }))
    .filter((p) => Number.isFinite(p.time))
    .sort((a, b) => a.time - b.time)
}

export function toCandles(rows: OhlcRow[]): Candle[] {
  return rows
    .map((r) => ({
      time: parseUtc(r.timestamp),
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
    }))
    .filter((c) => Number.isFinite(c.time))
    .sort((a, b) => a.time - b.time)
}
