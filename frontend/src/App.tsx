import { Link, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { EmptyState } from './components/ui'
import { Candles } from './pages/Candles'
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
        <Route path="explorer" element={<Explorer />} />
        <Route path="keys" element={<Keys />} />
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
