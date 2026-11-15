import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { EmptyState } from './components/ui'
import { Candles } from './pages/Candles'
import { Docs } from './pages/Docs'
import { Explorer } from './pages/Explorer'
import { Keys } from './pages/Keys'
import { Live } from './pages/Live'
import { Overview } from './pages/Overview'
import { PriceHistory } from './pages/PriceHistory'

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Overview />} />
        <Route path="history" element={<PriceHistory />} />
        <Route path="live" element={<Live />} />
        <Route path="candles" element={<Candles />} />
        <Route path="developers" element={<Docs />} />
        <Route path="developers/keys" element={<Keys />} />
        <Route path="developers/explorer" element={<Explorer />} />
        {/* Earlier addresses */}
        <Route path="keys" element={<Navigate to="/developers/keys" replace />} />
        <Route path="explorer" element={<Navigate to="/developers/explorer" replace />} />
        <Route
          path="*"
          element={
            <EmptyState
              title="Page not found"
              action={
                <Link to="/" className="btn btn-primary">
                  Go to the overview
                </Link>
              }
            >
              There is nothing at this address.
            </EmptyState>
          }
        />
      </Route>
    </Routes>
  )
}
