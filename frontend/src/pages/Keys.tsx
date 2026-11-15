import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, createKey, getLiveOhlc } from '../api/client'
import type { CreatedKey } from '../api/types'
import { Card, CopyButton, Notice, PageHeader } from '../components/ui'
import {
  DAILY_LIMIT,
  clearCredentials,
  recordRequest,
  saveCredentials,
  useKeyStore,
} from '../state/keyStore'

function messageFor(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something unexpected went wrong.'
}

export function Keys() {
  const { credentials } = useKeyStore()
  const [created, setCreated] = useState<CreatedKey | null>(null)

  return (
    <>
      <PageHeader
        title="API keys"
        description="Every data endpoint needs a key name and an API key. Each key allows 100 requests a day. The key is stored only in this browser."
        endpoint="PUT /generareApi/"
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {created && <CreatedPanel created={created} onDismiss={() => setCreated(null)} />}
          {credentials ? <CurrentKey /> : null}
          <CreateForm onCreated={setCreated} hasKey={credentials !== null} />
        </div>
        <div className="space-y-6">
          <ExistingKeyForm hasKey={credentials !== null} />
          <Card title="How keys work">
            <ul className="list-disc space-y-2 pl-5 text-sm text-ink-2">
              <li>
                The server stores only a salted hash of the key, so it can be shown once, right after
                it is created. Copy it somewhere safe.
              </li>
              <li>
                Each key gets {DAILY_LIMIT} requests a day. Every call to a data endpoint counts,
                including calls answered from the server's cache.
              </li>
              <li>
                The server has no endpoint that reports usage, so the counter here is this browser's
                own tally. Calls made elsewhere with the same key are not included.
              </li>
              <li>
                The dashboards load each dataset once and reuse it for 30 minutes, so normal browsing
                uses about four requests.
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  )
}

function CreatedPanel({ created, onDismiss }: { created: CreatedKey; onDismiss: () => void }) {
  return (
    <Card title="Your new API key">
      <Notice tone="warning">
        This is the only time the key is shown. The server cannot display it again.
      </Notice>
      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-xs text-ink-3">Key name</dt>
          <dd className="font-mono text-ink">{created.key_name}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-3">API key</dt>
          <dd className="font-mono break-all text-ink">{created.api_key}</dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <CopyButton text={created.api_key} label="Copy key" />
        <Link to="/" className="btn btn-primary">
          Go to the overview
        </Link>
        <button type="button" className="btn" onClick={onDismiss}>
          I have saved it
        </button>
      </div>
    </Card>
  )
}

function CurrentKey() {
  const { credentials, used } = useKeyStore()
  const [reveal, setReveal] = useState(false)
  const [confirming, setConfirming] = useState(false)
  if (!credentials) return null

  const shownUsed = Math.min(used, DAILY_LIMIT)
  const masked = `${credentials.apiKey.slice(0, 4)}${'•'.repeat(12)}${credentials.apiKey.slice(-4)}`

  return (
    <Card title="Key in use" subtitle="Saved in this browser and sent with every data request">
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-xs text-ink-3">Key name</dt>
          <dd className="font-mono text-ink">{credentials.keyName}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-3">API key</dt>
          <dd className="font-mono break-all text-ink">{reveal ? credentials.apiKey : masked}</dd>
        </div>
      </dl>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-sm">
          <span className="text-ink-2">Requests today (this browser)</span>
          <span className="tnum font-medium text-ink">
            {shownUsed} of {DAILY_LIMIT}
          </span>
        </div>
        <meter
          className="h-2 w-full"
          min={0}
          max={DAILY_LIMIT}
          high={DAILY_LIMIT * 0.8}
          optimum={0}
          value={shownUsed}
          aria-label="Requests used today"
        />
        {used >= DAILY_LIMIT && (
          <p className="mt-2 text-sm text-down-text">
            Limit reached. Data requests will fail until the daily reset.
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn" onClick={() => setReveal((r) => !r)}>
          {reveal ? 'Hide key' : 'Show key'}
        </button>
        <CopyButton text={credentials.apiKey} label="Copy key" />
        {confirming ? (
          <>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                clearCredentials()
                setConfirming(false)
              }}
            >
              Yes, remove it
            </button>
            <button type="button" className="btn" onClick={() => setConfirming(false)}>
              Keep it
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-danger" onClick={() => setConfirming(true)}>
            Remove from this browser
          </button>
        )}
      </div>
      {confirming && (
        <p className="mt-2 text-sm text-ink-2">
          The key stays valid on the server, but it cannot be shown again. Make sure you have a copy.
        </p>
      )}
    </Card>
  )
}

function CreateForm({
  onCreated,
  hasKey,
}: {
  onCreated: (key: CreatedKey) => void
  hasKey: boolean
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const keyName = name.trim()
    if (!keyName) {
      setError('Enter a key name.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const key = await createKey({ key_name: keyName, owner_email: email.trim() || null })
      saveCredentials({ keyName: key.key_name, apiKey: key.api_key })
      onCreated(key)
      setName('')
      setEmail('')
    } catch (err) {
      setError(messageFor(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card
      title="Create a key"
      subtitle={
        hasKey ? 'A new key replaces the one saved in this browser' : 'Takes a few seconds'
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="key-name" className="label">
            Key name
          </label>
          <input
            id="key-name"
            className="field"
            value={name}
            maxLength={50}
            autoComplete="off"
            placeholder="my-dashboard"
            onChange={(e) => setName(e.target.value)}
          />
          <p className="mt-1 text-xs text-ink-3">Must be unique. Up to 50 characters.</p>
        </div>
        <div>
          <label htmlFor="key-email" className="label">
            Email (optional)
          </label>
          <input
            id="key-email"
            type="email"
            className="field"
            value={email}
            autoComplete="email"
            placeholder="you@example.com"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Creating…' : 'Create key'}
        </button>
      </form>
    </Card>
  )
}

function ExistingKeyForm({ hasKey }: { hasKey: boolean }) {
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const credentials = { keyName: name.trim(), apiKey: key.trim() }
    if (!credentials.keyName || !credentials.apiKey) {
      setError('Enter both the key name and the API key.')
      return
    }
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      // One small request proves the pair is valid before it is saved.
      await getLiveOhlc(credentials, { limit: 1 })
      saveCredentials(credentials)
      recordRequest()
      setSaved(true)
      setName('')
      setKey('')
    } catch (err) {
      setError(messageFor(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card
      title="Use a key you already have"
      subtitle={hasKey ? 'Replaces the key saved in this browser' : 'Checks the key, then saves it'}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="existing-name" className="label">
            Key name
          </label>
          <input
            id="existing-name"
            className="field"
            value={name}
            autoComplete="off"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="existing-key" className="label">
            API key
          </label>
          <input
            id="existing-key"
            type="password"
            className="field font-mono"
            value={key}
            autoComplete="off"
            onChange={(e) => setKey(e.target.value)}
          />
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        {saved && <Notice tone="success">Key verified and saved.</Notice>}
        <button type="submit" className="btn" disabled={busy}>
          {busy ? 'Checking…' : 'Verify and save'}
        </button>
        <p className="text-xs text-ink-3">Verifying uses one of the key's daily requests.</p>
      </form>
    </Card>
  )
}
