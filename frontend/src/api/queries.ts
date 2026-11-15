import { useQuery } from '@tanstack/react-query'
import {
  ApiError,
  getHistoryChart,
  getHistoryOhlc,
  getLiveChart,
  getLiveOhlc,
  toCandles,
  toPricePoints,
} from './client'
import type { Credentials, RangeParams } from './types'
import { markExhausted, recordRequest, useKeyStore } from '../state/keyStore'

/**
 * Every data call counts against the key's 100 requests/day, even when the
 * server answers from its Redis cache. So the dashboards fetch each dataset
 * once, without parameters, keep it for 30 minutes and filter in the browser.
 * (The pipeline only loads new data once a day.)
 */
const STALE_MS = 30 * 60 * 1000

type Fetcher<Row> = (
  creds: Credentials,
  params?: RangeParams,
  signal?: AbortSignal,
) => Promise<Row[]>

function useDataset<Row, Out>(name: string, fetcher: Fetcher<Row>, transform: (rows: Row[]) => Out) {
  const { credentials } = useKeyStore()
  return useQuery({
    queryKey: [name, credentials?.keyName ?? null, credentials?.apiKey ?? null],
    enabled: credentials !== null,
    staleTime: STALE_MS,
    gcTime: STALE_MS * 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // Failed calls are not counted by the server, so retrying a wake-up error is free.
    retry: (failures, error) =>
      error instanceof ApiError &&
      (error.kind === 'server' || error.kind === 'network') &&
      failures < 2,
    retryDelay: 5000,
    queryFn: async ({ signal }) => {
      try {
        const rows = await fetcher(credentials as Credentials, {}, signal)
        recordRequest()
        return transform(rows)
      } catch (error) {
        if (error instanceof ApiError && error.kind === 'rate-limited') markExhausted()
        throw error
      }
    },
  })
}

/** Hourly price, market cap and volume for the last 90 days. */
export function useHistoryChart() {
  return useDataset('historyChart', getHistoryChart, toPricePoints)
}

/** Fine-grained price, market cap and volume for the previous day. */
export function useLiveChart() {
  return useDataset('liveChart', getLiveChart, toPricePoints)
}

/** 4-hour candles for the last 30 days. */
export function useHistoryOhlc() {
  return useDataset('historyOhlc', getHistoryOhlc, toCandles)
}

/** 30-minute candles for the previous day. */
export function useLiveOhlc() {
  return useDataset('liveOhlc', getLiveOhlc, toCandles)
}
