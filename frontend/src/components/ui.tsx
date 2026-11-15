import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../api/client'

/** Page title block. */
export function PageHeader({
  title,
  description,
  endpoint,
  actions,
}: {
  title: string
  description: ReactNode
  /** Backend endpoint(s) this page reads, shown as a small tag. */
  endpoint?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-2">{description}</p>
        {endpoint && (
          <p className="mt-2 font-mono text-xs text-ink-3">
            <span className="rounded bg-surface-2 px-1.5 py-0.5">{endpoint}</span>
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Card({
  title,
  subtitle,
  actions,
  children,
  className = '',
}: {
  title?: string
  subtitle?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`card p-4 sm:p-5 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-ink-3">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

/** A headline number with a label; the number is the chart. */
export function StatTile({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: ReactNode
  detail?: ReactNode
  tone?: 'up' | 'down'
}) {
  const detailColor =
    tone === 'up' ? 'text-up-text' : tone === 'down' ? 'text-down-text' : 'text-ink-3'
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-ink-3">{label}</div>
      <div className="mt-1 text-xl font-semibold tracking-tight text-ink sm:text-2xl">{value}</div>
      {detail && <div className={`mt-1 text-sm ${detailColor}`}>{detail}</div>}
    </div>
  )
}

/** Mutually exclusive choices in one row (range presets, metric switch, tabs). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex max-w-full overflow-x-auto rounded-lg border border-hairline bg-surface-2 p-0.5"
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={`h-8 shrink-0 cursor-pointer rounded-md px-3 text-sm font-medium whitespace-nowrap ${
              active ? 'bg-surface text-ink shadow-sm' : 'text-ink-2 hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Skeleton({ height = 320 }: { height?: number }) {
  return <div className="skeleton w-full" style={{ height }} role="status" aria-label="Loading" />
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-ink-2">{children}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/** Explains a failed request and offers the fitting next step. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const api = error instanceof ApiError ? error : null
  const title =
    api?.kind === 'invalid-key'
      ? 'Your saved key was not accepted'
      : api?.kind === 'rate-limited'
        ? 'Too many requests'
        : api?.kind === 'network'
          ? 'The API is not reachable'
          : 'The data could not be loaded'
  const message = api?.message ?? 'Something unexpected went wrong while loading this data.'
  const canRetry = onRetry && api?.kind !== 'invalid-key'
  return (
    <div className="card px-6 py-10 text-center" role="alert">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-2">{message}</p>
      {api && api.status > 0 && (
        <p className="mt-2 font-mono text-xs text-ink-3">HTTP {api.status}</p>
      )}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {canRetry && (
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            Try again
          </button>
        )}
        {api?.kind === 'invalid-key' && (
          <Link to="/developers/keys" className="btn btn-primary">
            Manage API key
          </Link>
        )}
      </div>
    </div>
  )
}

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setState('copied')
    } catch {
      setState('failed')
    }
    window.setTimeout(() => setState('idle'), 1800)
  }
  return (
    <button type="button" className="btn" onClick={copy}>
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : label}
    </button>
  )
}

/** Inline message under a form. */
export function Notice({
  tone,
  children,
}: {
  tone: 'error' | 'success' | 'info' | 'warning'
  children: ReactNode
}) {
  const styles = {
    error: 'border-down/40 text-down-text',
    success: 'border-up/40 text-up-text',
    warning: 'border-warn/60 text-ink',
    info: 'border-hairline text-ink-2',
  }[tone]
  const prefix = { error: 'Error: ', success: '', warning: 'Note: ', info: '' }[tone]
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-lg border bg-surface-2 px-3 py-2 text-sm ${styles}`}
    >
      {prefix && <span className="font-semibold">{prefix}</span>}
      {children}
    </div>
  )
}
