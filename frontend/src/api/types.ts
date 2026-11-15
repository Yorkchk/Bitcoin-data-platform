/** One row from /get_historyChart or /get_liveChart. */
export interface ChartRow {
  /** ISO datetime without a timezone; the pipeline stores UTC. */
  bitcoin_date: string
  coin_name: string
  currency_name: string
  price: number
  market_cap: number
  total_volume: number
}

/** One row from /get_historyOhlc or /get_liveOhlc. */
export interface OhlcRow {
  /** "YYYY-MM-DD HH:MM:SS" in UTC. */
  timestamp: string
  coin_name: string
  currency_name: string
  open: number
  high: number
  low: number
  close: number
}

export interface CreateKeyRequest {
  key_name: string
  owner_email?: string | null
}

export interface CreatedKey {
  key_name: string
  api_key: string
}

export interface Credentials {
  keyName: string
  apiKey: string
}

/** Query options shared by the four data endpoints. */
export interface RangeParams {
  /** History endpoints: YYYY-MM-DD. Live endpoints: HH:MM:SS. */
  start?: string
  end?: string
  limit?: number
}

/** Parsed price point; `time` is epoch milliseconds (UTC). */
export interface PricePoint {
  time: number
  price: number
  marketCap: number
  volume: number
}

/** Parsed candle; `time` is epoch milliseconds (UTC). */
export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
}
