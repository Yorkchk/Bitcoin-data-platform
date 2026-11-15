import { useMemo, useState, type ReactNode } from 'react'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  /** Value used for sorting; omit to make the column unsortable. */
  sortValue?: (row: T) => number | string
  align?: 'left' | 'right'
}

interface Props<T> {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string | number
  pageSize?: number
  /** Initial sort; defaults to the first sortable column, descending. */
  initialSort?: { key: string; dir: 'asc' | 'desc' }
  caption: string
}

/** Sortable, paginated table: the non-visual view of each chart's data. */
export function DataTable<T>({ rows, columns, rowKey, pageSize = 25, initialSort, caption }: Props<T>) {
  const firstSortable = columns.find((c) => c.sortValue)
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(
    initialSort ?? (firstSortable ? { key: firstSortable.key, dir: 'desc' } : null),
  )
  const [page, setPage] = useState(0)

  const sorted = useMemo(() => {
    const column = sort ? columns.find((c) => c.key === sort.key) : undefined
    if (!sort || !column?.sortValue) return rows
    const get = column.sortValue
    const factor = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const x = get(a)
      const y = get(b)
      return x < y ? -factor : x > y ? factor : 0
    })
  }, [rows, columns, sort])

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const current = Math.min(page, pageCount - 1)
  const visible = sorted.slice(current * pageSize, current * pageSize + pageSize)

  function toggleSort(key: string) {
    setPage(0)
    setSort((s) =>
      s && s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' },
    )
  }

  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-3">No rows in this range.</p>
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-3">
              {columns.map((c) => {
                const active = sort?.key === c.key
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (sort?.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={`px-3 py-2 font-medium ${c.align === 'right' ? 'text-right' : ''}`}
                  >
                    {c.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className="cursor-pointer font-medium hover:text-ink"
                      >
                        {c.header}
                        <span aria-hidden="true" className="ml-1 inline-block w-2">
                          {active ? (sort?.dir === 'asc' ? '↑' : '↓') : ''}
                        </span>
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={rowKey(row)} className="border-b border-line last:border-0">
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`tnum px-3 py-2 text-ink ${c.align === 'right' ? 'text-right' : ''}`}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-ink-3">
        <span className="tnum">
          {current * pageSize + 1}–{Math.min(sorted.length, (current + 1) * pageSize)} of{' '}
          {sorted.length.toLocaleString('en-US')} rows
        </span>
        {pageCount > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              Previous
            </button>
            <span className="tnum">
              Page {current + 1} of {pageCount}
            </span>
            <button
              type="button"
              className="btn"
              disabled={current >= pageCount - 1}
              onClick={() => setPage(current + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
