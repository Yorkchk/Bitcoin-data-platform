import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  buildQuery,
  createKey,
  extractDetail,
  getHistoryChart,
  getPublicHistoryChart,
  kindForStatus,
  parseUtc,
  toCandles,
  toPricePoints,
} from './client'

const creds = { keyName: 'demo', apiKey: 'abc123' }

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('kindForStatus', () => {
  it('maps the statuses the API uses', () => {
    expect(kindForStatus(404)).toBe('invalid-key')
    expect(kindForStatus(429)).toBe('rate-limited')
    expect(kindForStatus(401)).toBe('name-taken')
    expect(kindForStatus(422)).toBe('bad-request')
    expect(kindForStatus(500)).toBe('server')
    expect(kindForStatus(418)).toBe('unknown')
  })
})

describe('buildQuery', () => {
  it('uses date parameter names for history endpoints', () => {
    const q = buildQuery(creds, { start: '2026-11-01', end: '2026-11-10', limit: 5 }, 'date')
    expect(q).toBe('key_name=demo&api_key=abc123&start_date=2026-11-01&end_date=2026-11-10&limit=5')
  })

  it('uses time parameter names for live endpoints and omits empty values', () => {
    expect(buildQuery(creds, { start: '05:00:00' }, 'time')).toBe(
      'key_name=demo&api_key=abc123&start_time=05%3A00%3A00',
    )
    expect(buildQuery(creds, {}, 'time')).toBe('key_name=demo&api_key=abc123')
  })
})

describe('extractDetail', () => {
  it('reads string and validation-list details', () => {
    expect(extractDetail({ detail: 'Too many requests' })).toBe('Too many requests')
    expect(
      extractDetail({ detail: [{ loc: ['query', 'limit'], msg: 'Input should be a valid integer' }] }),
    ).toBe('limit: Input should be a valid integer')
    expect(extractDetail('nope')).toBeNull()
  })
})

describe('requests', () => {
  it('returns rows on success and calls the /api prefix', async () => {
    const fetchMock = mockFetch(200, [])
    await expect(getHistoryChart(creds, { limit: 2 })).resolves.toEqual([])
    expect(fetchMock.mock.calls[0][0]).toBe('/api/get_historyChart?key_name=demo&api_key=abc123&limit=2')
  })

  it('throws a typed error for a bad key', async () => {
    mockFetch(404, { detail: 'key name or api key not found' })
    const error = await getHistoryChart(creds).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).kind).toBe('invalid-key')
    expect((error as ApiError).status).toBe(404)
  })

  it('throws a rate-limit error on 429', async () => {
    mockFetch(429, { detail: 'Too many requests' })
    await expect(getHistoryChart(creds)).rejects.toMatchObject({ kind: 'rate-limited' })
  })

  it('calls the public endpoints without credentials', async () => {
    const fetchMock = mockFetch(200, [])
    await getPublicHistoryChart()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/public/history-chart')
  })

  it('explains a public 429 as a per-visitor limit, not a key quota', async () => {
    mockFetch(429, { detail: 'Too many requests from this address, try again later' })
    const error = (await getPublicHistoryChart().catch((e: unknown) => e)) as ApiError
    expect(error.kind).toBe('rate-limited')
    expect(error.message).toContain('your network')
    mockFetch(429, { detail: 'Too many requests' })
    const keyed = (await getHistoryChart(creds).catch((e: unknown) => e)) as ApiError
    expect(keyed.message).toContain('100 requests')
  })

  it('reports a network error when fetch itself fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    await expect(getHistoryChart(creds)).rejects.toMatchObject({ kind: 'network', status: 0 })
  })

  it('sends a null email when none is given', async () => {
    const fetchMock = mockFetch(200, { key_name: 'demo', api_key: 'k' })
    await createKey({ key_name: 'demo', owner_email: '' })
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body as string)).toEqual({ key_name: 'demo', owner_email: null })
  })
})

describe('parsing', () => {
  it('treats zone-less timestamps as UTC in both API formats', () => {
    const expected = Date.UTC(2026, 10, 13, 4, 0, 0)
    expect(parseUtc('2026-11-13T04:00:00')).toBe(expected)
    expect(parseUtc('2026-11-13 04:00:00')).toBe(expected)
    expect(parseUtc('2026-11-13T04:00:00Z')).toBe(expected)
  })

  it('sorts price rows by time and renames the fields', () => {
    const rows = [
      { bitcoin_date: '2026-11-13T01:00:00', coin_name: 'bitcoin', currency_name: 'USD', price: 2, market_cap: 20, total_volume: 200 },
      { bitcoin_date: '2026-11-13T00:00:00', coin_name: 'bitcoin', currency_name: 'USD', price: 1, market_cap: 10, total_volume: 100 },
    ]
    expect(toPricePoints(rows)).toEqual([
      { time: Date.UTC(2026, 10, 13, 0), price: 1, marketCap: 10, volume: 100 },
      { time: Date.UTC(2026, 10, 13, 1), price: 2, marketCap: 20, volume: 200 },
    ])
  })

  it('drops candle rows with an unreadable timestamp', () => {
    const rows = [
      { timestamp: 'not a date', coin_name: 'bitcoin', currency_name: 'USD', open: 1, high: 1, low: 1, close: 1 },
      { timestamp: '2026-11-13 04:00:00', coin_name: 'bitcoin', currency_name: 'USD', open: 1, high: 2, low: 0, close: 1 },
    ]
    expect(toCandles(rows)).toHaveLength(1)
  })
})
