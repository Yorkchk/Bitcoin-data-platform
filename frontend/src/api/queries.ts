import { useQuery } from '@tanstack/react-query'
import {
  ApiError,
  getPublicHistoryChart,
  getPublicHistoryOhlc,
  getPublicLiveChart,
  getPublicLiveOhlc,
  toCandles,
  toPricePoints,
} from './client'

/**
 * The dashboards read the public endpoints, which need no API key. The data
 * changes once a day (after the nightly pipeline run), so each dataset is
 * fetched once and kept for 30 minutes; range filters run in the browser.
 */
const STALE_MS = 30 * 60 * 1000

function useDataset<Row, Out>(
  name: string,
  fetcher: (signal?: AbortSignal) => Promise<Row[]>,
  transform: (rows: Row[]) => Out,
) {
  return useQuery({
    queryKey: ['public', name],
    staleTime: STALE_MS,
    gcTime: STALE_MS * 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // The database pauses when idle; give it time to wake up.
    retry: (failures, error) =>
      error instanceof ApiError &&
      (error.kind === 'server' || error.kind === 'network') &&
      failures < 2,
    retryDelay: 5000,
    queryFn: async ({ signal }) => transform(await fetcher(signal)),
  })
}

/** Hourly price, market cap and volume for the last 90 days. */
export function useHistoryChart() {
  return useDataset('historyChart', getPublicHistoryChart, toPricePoints)
}

/** Fine-grained price, market cap and volume for the previous day. */
export function useLiveChart() {
  return useDataset('liveChart', getPublicLiveChart, toPricePoints)
}

/** 4-hour candles for the last 30 days. */
export function useHistoryOhlc() {
  return useDataset('historyOhlc', getPublicHistoryOhlc, toCandles)
}

/** 30-minute candles for the previous day. */
export function useLiveOhlc() {
  return useDataset('liveOhlc', getPublicLiveOhlc, toCandles)
}
