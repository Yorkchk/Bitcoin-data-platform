import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { UseQueryResult } from '@tanstack/react-query'
import { useKeyStore } from '../state/keyStore'
import { EmptyState, ErrorState, Skeleton } from './ui'

/** Data pages need a key; without one, point the visitor at the Keys page. */
export function RequireKey({ children }: { children: ReactNode }) {
  const { credentials } = useKeyStore()
  if (!credentials) {
    return (
      <EmptyState
        title="Add an API key to load data"
        action={
          <Link to="/keys" className="btn btn-primary">
            Get an API key
          </Link>
        }
      >
        Every data endpoint needs a key name and an API key. Create one in a few seconds; it is
        saved in this browser and allows 100 requests a day.
      </EmptyState>
    )
  }
  return <>{children}</>
}

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
