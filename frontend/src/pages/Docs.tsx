import { Link } from 'react-router-dom'
import { ENDPOINTS, endpointById, type Endpoint } from '../api/endpoints'
import { CodeTabs } from '../components/CodeTabs'
import { Card, Notice, PageHeader } from '../components/ui'
import { API_KEY_PLACEHOLDER, KEY_NAME_PLACEHOLDER, buildSnippet } from '../lib/snippets'
import { DAILY_LIMIT, useKeyStore } from '../state/keyStore'

const ERRORS: { status: string; meaning: string; fix: string }[] = [
  { status: '401', meaning: 'Key name already taken, or blank', fix: 'Choose another name when creating a key.' },
  { status: '404', meaning: 'Key name and API key do not match', fix: 'Check both values. A key cannot be recovered, so create a new one if it is lost.' },
  { status: '422', meaning: 'A parameter is malformed', fix: 'Dates are YYYY-MM-DD, times are HH:MM:SS, limit is a whole number.' },
  { status: '429', meaning: `Daily limit of ${DAILY_LIMIT} requests reached`, fix: 'Wait for the daily reset, or cache responses on your side.' },
  { status: '5xx', meaning: 'The database is waking up or unavailable', fix: 'It pauses when idle. Retry after 30–60 seconds.' },
]

export function Docs() {
  const { credentials } = useKeyStore()
  const origin = window.location.origin

  function values(endpoint: Endpoint, withSecret: boolean): Record<string, string> {
    if (endpoint.method === 'PUT') return endpoint.example
    return {
      key_name: credentials?.keyName ?? KEY_NAME_PLACEHOLDER,
      api_key: withSecret && credentials ? credentials.apiKey : API_KEY_PLACEHOLDER,
      ...endpoint.example,
    }
  }

  const quickStart = endpointById('historyChart')

  return (
    <>
      <PageHeader
        title="Bitcoin data API"
        description="The same BTC / USD data as this site, as JSON over HTTP: hourly prices for 90 days, 4-hour candles for 30 days, and the previous day at fine resolution. Free with an API key."
      />

      <div className="space-y-6">
        {credentials ? (
          <Notice tone="info">
            Examples on this page use your key <span className="font-mono text-ink">{credentials.keyName}</span>.
            The API key itself is masked on screen; <strong>Copy with my key</strong> includes it.
          </Notice>
        ) : (
          <Notice tone="info">
            Examples use placeholders.{' '}
            <Link to="/developers/keys" className="font-medium text-ink underline">
              Create a free key
            </Link>{' '}
            and they fill in automatically.
          </Notice>
        )}

        <Card title="Quick start">
          <ol className="space-y-5 text-sm text-ink-2">
            <li>
              <p className="font-medium text-ink">1. Get an API key</p>
              <p className="mt-1">
                Create one on the{' '}
                <Link to="/developers/keys" className="font-medium text-ink underline">
                  API keys
                </Link>{' '}
                page, or with <span className="font-mono">PUT /generareApi/</span> (see below). Save
                the key when it is shown: it is only returned once.
              </p>
            </li>
            <li>
              <p className="font-medium text-ink">2. Call an endpoint</p>
              <p className="mt-1 mb-2">Pass your key name and key as query parameters:</p>
              <CodeTabs
                build={(lang, secret) => buildSnippet(lang, quickStart, values(quickStart, secret), origin)}
                copyIncludesKey={credentials !== null}
              />
            </li>
            <li>
              <p className="font-medium text-ink">3. Try things out</p>
              <p className="mt-1">
                Use the{' '}
                <Link to="/developers/explorer" className="font-medium text-ink underline">
                  API explorer
                </Link>{' '}
                to send requests from the browser, or the{' '}
                <a href="/docs" className="font-medium text-ink underline">
                  Swagger reference
                </a>
                .
              </p>
            </li>
          </ol>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Base URL">
            <p className="font-mono text-sm break-all text-ink">{origin}</p>
            <p className="mt-2 text-sm text-ink-2">All endpoints are relative to this address.</p>
          </Card>
          <Card title="Authentication">
            <p className="text-sm text-ink-2">
              Every data request needs two query parameters: <span className="font-mono text-ink">key_name</span>{' '}
              and <span className="font-mono text-ink">api_key</span>. Keys are stored as salted hashes and cannot
              be shown again after creation.
            </p>
          </Card>
          <Card title="Rate limit">
            <p className="text-sm text-ink-2">
              {DAILY_LIMIT} requests per key per day. Every data request counts, including ones answered from the
              server's cache. Over the limit, requests return <span className="font-mono">429</span>.
            </p>
          </Card>
          <Card title="Data and time">
            <p className="text-sm text-ink-2">
              Data comes from CoinGecko through a Databricks pipeline that runs daily at 00:10 UTC. All
              timestamps are UTC without a timezone suffix. Rows come back oldest first.
            </p>
          </Card>
        </div>

        <Card title="Errors" subtitle={'Error bodies look like {"detail": "..."}'}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-3">
                  <th scope="col" className="px-3 py-2 font-medium">Status</th>
                  <th scope="col" className="px-3 py-2 font-medium">Meaning</th>
                  <th scope="col" className="px-3 py-2 font-medium">What to do</th>
                </tr>
              </thead>
              <tbody>
                {ERRORS.map((e) => (
                  <tr key={e.status} className="border-b border-line last:border-0">
                    <td className="px-3 py-2 font-mono text-ink">{e.status}</td>
                    <td className="px-3 py-2 text-ink">{e.meaning}</td>
                    <td className="px-3 py-2 text-ink-2">{e.fix}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <section aria-labelledby="reference">
          <h2 id="reference" className="mb-3 text-lg font-semibold text-ink">
            Endpoints
          </h2>
          <nav aria-label="Endpoint list" className="mb-4 flex flex-wrap gap-2">
            {ENDPOINTS.map((e) => (
              <a
                key={e.id}
                href={`#${e.id}`}
                className="rounded-lg border border-hairline bg-surface px-3 py-1.5 font-mono text-xs text-ink-2 hover:text-ink"
              >
                {e.method} {e.path}
              </a>
            ))}
          </nav>
          <div className="space-y-6">
            {ENDPOINTS.map((e) => (
              <EndpointDoc
                key={e.id}
                endpoint={e}
                build={(lang, secret) => buildSnippet(lang, e, values(e, secret), origin)}
                copyIncludesKey={credentials !== null && e.method === 'GET'}
              />
            ))}
          </div>
        </section>
      </div>
    </>
  )
}

function EndpointDoc({
  endpoint,
  build,
  copyIncludesKey,
}: {
  endpoint: Endpoint
  build: Parameters<typeof CodeTabs>[0]['build']
  copyIncludesKey: boolean
}) {
  const paramsLabel = endpoint.method === 'PUT' ? 'JSON body' : 'Query parameters'
  return (
    <section id={endpoint.id} className="card scroll-mt-32 p-4 sm:p-5">
      <p className="flex flex-wrap items-center gap-2 font-mono text-sm text-ink">
        <span className="rounded border border-hairline bg-surface-2 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-ink-2">
          {endpoint.method}
        </span>
        {endpoint.path}
      </p>
      <h3 className="mt-2 text-base font-semibold text-ink">{endpoint.title}</h3>
      <p className="mt-1 text-sm text-ink-2">{endpoint.summary}</p>
      {endpoint.notes && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-2">
          {endpoint.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      <h4 className="mt-5 mb-2 text-sm font-semibold text-ink">{paramsLabel}</h4>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-3">
              <th scope="col" className="px-3 py-2 font-medium">Name</th>
              <th scope="col" className="px-3 py-2 font-medium">Required</th>
              <th scope="col" className="px-3 py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {endpoint.fields.map((f) => (
              <tr key={f.name} className="border-b border-line last:border-0">
                <td className="px-3 py-2 font-mono text-ink">{f.name}</td>
                <td className="px-3 py-2 text-ink-2">{f.required ? 'Yes' : 'No'}</td>
                <td className="px-3 py-2 text-ink-2">{f.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="min-w-0">
          <h4 className="mb-2 text-sm font-semibold text-ink">Example request</h4>
          <CodeTabs build={build} copyIncludesKey={copyIncludesKey} />
        </div>
        <div className="min-w-0">
          <h4 className="mb-2 text-sm font-semibold text-ink">Example response</h4>
          <pre className="overflow-x-auto rounded-lg bg-surface-2 p-3 font-mono text-xs leading-relaxed text-ink">
            {JSON.stringify(endpoint.sampleResponse, null, 2)}
          </pre>
          <p className="mt-2 text-xs text-ink-3">Values are illustrative.</p>
        </div>
      </div>
    </section>
  )
}
