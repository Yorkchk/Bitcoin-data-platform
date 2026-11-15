import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { EmptyState, ErrorState, Skeleton } from './ui'

/** Loading, error and empty handling for one dataset. */
export function QueryView<T>({
  query,
  height = 320,
  emptyTitle = 'No data yet',
  emptyText,
  children,
}: {
  query: UseQueryResult<T[]>
  height?: number
  emptyTitle?: string
  emptyText: string
  children: (data: T[]) => ReactNode
}) {
  if (query.isPending) return <Skeleton height={height} />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />
  if (query.data.length === 0) return <EmptyState title={emptyTitle}>{emptyText}</EmptyState>
  return <>{children(query.data)}</>
}
