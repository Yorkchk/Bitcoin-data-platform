import { NavLink, Link, Outlet } from 'react-router-dom'
import { DAILY_LIMIT, useKeyStore } from '../state/keyStore'
import { toggleTheme, useTheme } from '../state/theme'

const NAV = [
  { to: '/', label: 'Overview', end: true },
  { to: '/history', label: 'Price history' },
  { to: '/live', label: 'Previous day' },
  { to: '/candles', label: 'Candles' },
  { to: '/explorer', label: 'API explorer' },
  { to: '/keys', label: 'API keys' },
]

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-hairline bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link to="/" className="flex shrink-0 items-center gap-2 font-semibold text-ink">
            <span
              aria-hidden="true"
              className="grid h-7 w-7 place-items-center rounded-lg bg-brand text-sm font-bold text-white"
            >
              B
            </span>
            <span className="hidden sm:inline">Bitcoin Data Platform</span>
            <span className="sm:hidden">BTC Data</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <UsageBadge />
            <ThemeToggle />
          </div>
        </div>
        <nav aria-label="Main" className="mx-auto max-w-6xl overflow-x-auto px-4">
          <ul className="flex gap-1">
            {NAV.map((item) => (
              <li key={item.to} className="shrink-0">
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `block border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap ${
                      isActive
                        ? 'border-ink text-ink'
                        : 'border-transparent text-ink-2 hover:text-ink'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="border-t border-hairline">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-ink-3">
          <span>
            Market data from CoinGecko, loaded daily by the Databricks pipeline. All times are UTC.
          </span>
          <a href="/docs" className="underline hover:text-ink">
            Swagger docs
          </a>
        </div>
      </footer>
    </div>
  )
}

/** Compact "requests used today" readout in the header. */
function UsageBadge() {
  const { credentials, used } = useKeyStore()
  if (!credentials) {
    return (
      <Link to="/keys" className="btn h-8 px-3 text-xs">
        Add API key
      </Link>
    )
  }
  const exhausted = used >= DAILY_LIMIT
  return (
    <Link
      to="/keys"
      title={`Key "${credentials.keyName}": about ${used} of ${DAILY_LIMIT} requests used today from this browser`}
      className="tnum flex h-8 items-center gap-2 rounded-lg border border-hairline px-2.5 text-xs text-ink-2 hover:bg-surface-2"
    >
      <span className="hidden max-w-28 truncate sm:inline">{credentials.keyName}</span>
      <span className={exhausted ? 'font-semibold text-down-text' : 'font-semibold text-ink'}>
        {Math.min(used, DAILY_LIMIT)}/{DAILY_LIMIT}
      </span>
    </Link>
  )
}

function ThemeToggle() {
  const theme = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="btn h-8 w-8 px-0"
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      {theme === 'dark' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  )
}
