/**
 * The developer API: the five endpoints a key gives access to. Used by the
 * Docs page and the API explorer, so both always describe the same contract.
 */

export type FieldType = 'text' | 'email' | 'date' | 'time' | 'number' | 'secret'

export interface Field {
  name: string
  type: FieldType
  required?: boolean
  /** One line for the Docs parameter table and the Explorer hint. */
  description: string
}

export interface Endpoint {
  id: string
  method: 'GET' | 'PUT'
  path: string
  title: string
  summary: string
  /** GET: query parameters. PUT: JSON body fields. */
  fields: Field[]
  /** Values used in the Docs examples (credentials are filled in separately). */
  example: Record<string, string>
  /** Illustrative response, shortened. */
  sampleResponse: unknown
  /** Extra notes shown in the Docs reference. */
  notes?: string[]
}

const AUTH_FIELDS: Field[] = [
  { name: 'key_name', type: 'text', required: true, description: 'The name you gave the key.' },
  { name: 'api_key', type: 'secret', required: true, description: 'The key value returned when the key was created.' },
]

const DATE_FIELDS: Field[] = [
  { name: 'start_date', type: 'date', description: 'Earliest date to include, YYYY-MM-DD (UTC).' },
  { name: 'end_date', type: 'date', description: 'Latest date to include, YYYY-MM-DD (UTC).' },
]

const TIME_FIELDS: Field[] = [
  { name: 'start_time', type: 'time', description: 'Earliest time of day to include, HH:MM:SS (UTC).' },
  { name: 'end_time', type: 'time', description: 'Latest time of day to include, HH:MM:SS (UTC).' },
]

const LIMIT_FIELD: Field = {
  name: 'limit',
  type: 'number',
  description: 'Maximum number of rows. Rows are returned oldest first.',
}

const CHART_SAMPLE = [
  {
    bitcoin_date: '2026-11-13T00:00:00',
    coin_name: 'bitcoin',
    currency_name: 'USD',
    price: 71371.98,
    market_cap: 1435378412886.94,
    total_volume: 27614591717.07,
  },
]

const OHLC_SAMPLE = [
  {
    timestamp: '2026-11-13 00:00:00',
    coin_name: 'bitcoin',
    currency_name: 'USD',
    open: 71626.0,
    high: 71626.0,
    low: 71143.0,
    close: 71383.0,
  },
]

export const ENDPOINTS: Endpoint[] = [
  {
    id: 'generate',
    method: 'PUT',
    path: '/generareApi/',
    title: 'Create an API key',
    summary: 'Creates a key. The key value is returned by this call only.',
    fields: [
      { name: 'key_name', type: 'text', required: true, description: 'A unique name for the key, up to 50 characters.' },
      { name: 'owner_email', type: 'email', description: 'Contact email for the key owner.' },
    ],
    example: { key_name: 'my-app' },
    sampleResponse: { key_name: 'my-app', api_key: '3f9c2a7e5b1d4c8e9a0b6f2d7c4e1a58' },
    notes: [
      'The server stores only a salted hash, so save the key straight away.',
      'Returns 401 if the name is already taken or blank.',
    ],
  },
  {
    id: 'historyChart',
    method: 'GET',
    path: '/get_historyChart',
    title: 'Hourly price history',
    summary: 'Hourly price, market cap and 24-hour volume for the last 90 days.',
    fields: [...AUTH_FIELDS, ...DATE_FIELDS, LIMIT_FIELD],
    example: { start_date: '2026-11-01', limit: '3' },
    sampleResponse: CHART_SAMPLE,
  },
  {
    id: 'liveChart',
    method: 'GET',
    path: '/get_liveChart',
    title: 'Previous-day prices',
    summary: 'Intraday price, market cap and volume for the previous day.',
    fields: [...AUTH_FIELDS, ...TIME_FIELDS, LIMIT_FIELD],
    example: { start_time: '12:00:00', limit: '3' },
    sampleResponse: CHART_SAMPLE,
    notes: ['Refreshed once a day, shortly after 00:10 UTC.'],
  },
  {
    id: 'historyOhlc',
    method: 'GET',
    path: '/get_historyOhlc',
    title: '4-hour candles',
    summary: 'Open, high, low and close every 4 hours for the last 30 days.',
    fields: [...AUTH_FIELDS, ...DATE_FIELDS, LIMIT_FIELD],
    example: { start_date: '2026-11-01', limit: '3' },
    sampleResponse: OHLC_SAMPLE,
  },
  {
    id: 'liveOhlc',
    method: 'GET',
    path: '/get_liveOhlc',
    title: 'Previous-day candles',
    summary: 'Open, high, low and close every 30 minutes for the previous day.',
    fields: [...AUTH_FIELDS, ...TIME_FIELDS, LIMIT_FIELD],
    example: { limit: '3' },
    sampleResponse: OHLC_SAMPLE,
    notes: ['Refreshed once a day, shortly after 00:10 UTC.'],
  },
]

export function endpointById(id: string): Endpoint {
  return ENDPOINTS.find((e) => e.id === id) ?? ENDPOINTS[0]
}
