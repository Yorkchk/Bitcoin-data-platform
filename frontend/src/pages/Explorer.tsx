import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE, friendlyMessage, kindForStatus } from '../api/client'
import { ENDPOINTS, endpointById, type Endpoint, type Field } from '../api/endpoints'
import { CodeTabs } from '../components/CodeTabs'
import { Card, CopyButton, Notice, PageHeader } from '../components/ui'
import { API_KEY_PLACEHOLDER, buildSnippet } from '../lib/snippets'
import { markExhausted, recordRequest, saveCredentials, useKeyStore } from '../state/keyStore'

interface Result {
  status: number
  ok: boolean
  ms: number
  body: unknown
  raw: string
}

const MAX_ROWS_SHOWN = 20

/** Value as the API expects it: time inputs give HH:MM, the API wants HH:MM:SS. */
function wireValue(field: Field, value: string): string {
  return field.type === 'time' && /^\d\d:\d\d$/.test(value) ? `${value}:00` : value
}

/** Trimmed values in wire format, empty ones dropped. */
function wireValues(endpoint: Endpoint, values: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const f of endpoint.fields) {
    const v = (values[f.name] ?? '').trim()
    if (v !== '') out[f.name] = wireValue(f, v)
  }
  return out
}

function buildRequest(endpoint: Endpoint, values: Record<string, string>) {
  const wire = wireValues(endpoint, values)
  if (endpoint.method === 'PUT') {
    const body: Record<string, string | null> = {}
    for (const f of endpoint.fields) body[f.name] = wire[f.name] ?? (f.required ? '' : null)
    return { query: '', body: JSON.stringify(body) }
  }
  return { query: new URLSearchParams(wire).toString(), body: null }
}

export function Explorer() {
  const { credentials } = useKeyStore()
  const [selectedId, setSelectedId] = useState('historyChart')
  const [valuesById, setValuesById] = useState<Record<string, Record<string, string>>>({})
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [networkError, setNetworkError] = useState(false)
  const [savedCreated, setSavedCreated] = useState(false)

  const endpoint = endpointById(selectedId)

  // Saved credentials and a small limit are the defaults; anything typed overrides them.
  const values = useMemo(() => {
    const defaults: Record<string, string> =
      endpoint.method === 'GET'
        ? { key_name: credentials?.keyName ?? '', api_key: credentials?.apiKey ?? '', limit: '5' }
        : {}
    return { ...defaults, ...valuesById[endpoint.id] }
  }, [endpoint, credentials, valuesById])

  function setValue(name: string, value: string) {
    setValuesById((all) => ({ ...all, [endpoint.id]: { ...all[endpoint.id], [name]: value } }))
  }

  function select(id: string) {
    setSelectedId(id)
    setResult(null)
    setNetworkError(false)
    setSavedCreated(false)
  }

  async function send(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setResult(null)
    setNetworkError(false)
    setSavedCreated(false)
    const { query, body } = buildRequest(endpoint, values)
    const started = performance.now()
    try {
      const res = await fetch(`${API_BASE}${endpoint.path}${query ? `?${query}` : ''}`, {
        method: endpoint.method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ?? undefined,
      })
      const raw = await res.text()
      let parsed: unknown = raw
      try {
        parsed = JSON.parse(raw)
      } catch {
        /* keep the raw text */
      }
      setResult({
        status: res.status,
        ok: res.ok,
        ms: Math.round(performance.now() - started),
        body: parsed,
        raw,
      })
      // Keep the header counter honest when the saved key was used.
      const usedSavedKey =
        endpoint.method === 'GET' &&
        credentials !== null &&
        values.key_name === credentials.keyName &&
        values.api_key === credentials.apiKey
      if (usedSavedKey && res.ok) recordRequest()
      if (usedSavedKey && res.status === 429) markExhausted()
    } catch {
      setNetworkError(true)
    } finally {
      setBusy(false)
    }
  }

  const createdKey =
    endpoint.id === 'generate' &&
    result?.ok &&
    result.body &&
    typeof result.body === 'object' &&
    'api_key' in result.body &&
    'key_name' in result.body
      ? (result.body as { key_name: string; api_key: string })
      : null

  const snippetValues = (withSecret: boolean) => {
    const wire = wireValues(endpoint, values)
    return !withSecret && wire.api_key ? { ...wire, api_key: API_KEY_PLACEHOLDER } : wire
  }

  return (
    <>
      <PageHeader
        title="API explorer"
        description="Send real requests to the five developer endpoints and see the raw response."
      />
      {!credentials && (
        <div className="mb-6">
          <Notice tone="info">
            The data endpoints need a key.{' '}
            <Link to="/developers/keys" className="font-medium text-ink underline">
              Create one
            </Link>{' '}
            and it is filled in here automatically, or use <strong>Create an API key</strong> below.
          </Notice>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[17rem_1fr]">
        <nav aria-label="Endpoints" className="min-w-0">
          <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {ENDPOINTS.map((e) => {
              const active = e.id === endpoint.id
              return (
                <li key={e.id} className="shrink-0">
                  <button
                    type="button"
                    aria-current={active ? 'true' : undefined}
                    onClick={() => select(e.id)}
                    className={`w-full cursor-pointer rounded-lg border px-3 py-2 text-left ${
                      active ? 'border-ink bg-surface' : 'border-hairline bg-surface hover:bg-surface-2'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <MethodTag method={e.method} />
                      <span className="text-sm font-medium text-ink">{e.title}</span>
                    </span>
                    <span className="mt-0.5 block font-mono text-xs text-ink-3">{e.path}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="min-w-0 space-y-6">
          <Card title={endpoint.title} subtitle={endpoint.summary}>
            <p className="mb-4 flex flex-wrap items-center gap-2 font-mono text-sm text-ink">
              <MethodTag method={endpoint.method} />
              {endpoint.path}
            </p>
            <form onSubmit={send} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {endpoint.fields.map((f) => {
                  const id = `ex-${endpoint.id}-${f.name}`
                  return (
                    <div key={f.name}>
                      <label htmlFor={id} className="label font-mono">
                        {f.name}
                        {f.required && <span className="font-sans text-ink-3"> (required)</span>}
                      </label>
                      <input
                        id={id}
                        className={`field ${f.type === 'secret' ? 'font-mono' : ''}`}
                        type={f.type === 'secret' ? 'password' : f.type === 'number' ? 'number' : f.type}
                        min={f.type === 'number' ? 1 : undefined}
                        step={f.type === 'time' ? 1 : undefined}
                        autoComplete="off"
                        value={values[f.name] ?? ''}
                        onChange={(e) => setValue(f.name, e.target.value)}
                      />
                      <p className="mt-1 text-xs text-ink-3">
                        {f.required ? '' : 'Optional. '}
                        {f.description}
                      </p>
                    </div>
                  )
                })}
              </div>
              {endpoint.method === 'GET' && (
                <p className="text-xs text-ink-3">Each successful call uses one of the key's 100 daily requests.</p>
              )}
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Sending…' : 'Send request'}
              </button>
            </form>
          </Card>

          <Card title="Code" subtitle="The same request from your own code">
            <CodeTabs
              build={(lang, secret) =>
                buildSnippet(lang, endpoint, snippetValues(secret), window.location.origin)
              }
              copyIncludesKey={endpoint.method === 'GET' && Boolean(values.api_key)}
            />
          </Card>

          {networkError && <Notice tone="error">{friendlyMessage('network')}</Notice>}

          {result && (
            <Card title="Response" actions={<CopyButton text={result.raw} label="Copy JSON" />}>
              <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className={`tnum font-semibold ${result.ok ? 'text-up-text' : 'text-down-text'}`}>
                  {result.ok ? '✓' : '✕'} HTTP {result.status}
                </span>
                <span className="tnum text-ink-3">{result.ms} ms</span>
                {Array.isArray(result.body) && (
                  <span className="tnum text-ink-3">{result.body.length.toLocaleString('en-US')} rows</span>
                )}
              </div>
              {!result.ok && (
                <div className="mb-3">
                  <Notice tone="error">{friendlyMessage(kindForStatus(result.status))}</Notice>
                </div>
              )}
              {createdKey && (
                <div className="mb-3 space-y-2">
                  <Notice tone="warning">This is the only time the key is shown. Copy it now.</Notice>
                  {savedCreated ? (
                    <Notice tone="success">Saved in this browser. The explorer and docs now use this key.</Notice>
                  ) : (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        saveCredentials({ keyName: createdKey.key_name, apiKey: createdKey.api_key })
                        setSavedCreated(true)
                      }}
                    >
                      Save this key in the browser
                    </button>
                  )}
                </div>
              )}
              <JsonView body={result.body} />
            </Card>
          )}
        </div>
      </div>
    </>
  )
}

function MethodTag({ method }: { method: 'GET' | 'PUT' }) {
  return (
    <span className="rounded border border-hairline bg-surface-2 px-1.5 py-0.5 font-mono text-[0.6875rem] font-semibold text-ink-2">
      {method}
    </span>
  )
}

function JsonView({ body }: { body: unknown }) {
  const truncated = Array.isArray(body) && body.length > MAX_ROWS_SHOWN
  const shown = truncated ? (body as unknown[]).slice(0, MAX_ROWS_SHOWN) : body
  const text = typeof shown === 'string' ? shown : JSON.stringify(shown, null, 2)
  return (
    <>
      <pre className="max-h-[28rem] overflow-auto rounded-lg bg-surface-2 p-3 font-mono text-xs text-ink">
        {text || '(empty response)'}
      </pre>
      {truncated && (
        <p className="mt-2 text-xs text-ink-3">
          Showing the first {MAX_ROWS_SHOWN} of {(body as unknown[]).length.toLocaleString('en-US')} rows. Copy
          JSON gives the full response.
        </p>
      )}
    </>
  )
}
