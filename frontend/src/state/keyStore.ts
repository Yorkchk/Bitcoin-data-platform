import { useSyncExternalStore } from 'react'
import type { Credentials } from '../api/types'

/** Server-side limit per key (the API's rate_limit_per_day default). */
export const DAILY_LIMIT = 100

const KEY_STORAGE = 'btc.credentials'
const USAGE_STORAGE = 'btc.usage'

interface Usage {
  keyName: string
  day: string
  count: number
}

export interface KeySnapshot {
  credentials: Credentials | null
  /** Requests this browser has made today with the current key. */
  used: number
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function read<T>(name: string): T | null {
  try {
    const raw = localStorage.getItem(name)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(name: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(name)
    else localStorage.setItem(name, JSON.stringify(value))
  } catch {
    /* storage unavailable: state still lives in memory for this session */
  }
}

function loadSnapshot(): KeySnapshot {
  const stored = read<Credentials>(KEY_STORAGE)
  const credentials = stored && stored.keyName && stored.apiKey ? stored : null
  const usage = read<Usage>(USAGE_STORAGE)
  const used =
    credentials && usage && usage.keyName === credentials.keyName && usage.day === today()
      ? usage.count
      : 0
  return { credentials, used }
}

let snapshot: KeySnapshot = loadSnapshot()
const listeners = new Set<() => void>()

function emit(next: KeySnapshot) {
  snapshot = next
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function setUsage(credentials: Credentials, count: number) {
  const usage: Usage = { keyName: credentials.keyName, day: today(), count }
  write(USAGE_STORAGE, usage)
  emit({ credentials, used: count })
}

export function getCredentials(): Credentials | null {
  return snapshot.credentials
}

export function saveCredentials(credentials: Credentials) {
  write(KEY_STORAGE, credentials)
  setUsage(credentials, 0)
}

export function clearCredentials() {
  write(KEY_STORAGE, null)
  write(USAGE_STORAGE, null)
  emit({ credentials: null, used: 0 })
}

/** Call after each data request the server accepted; it counts against the quota. */
export function recordRequest() {
  const { credentials } = snapshot
  if (!credentials) return
  // Re-read storage so a second tab's requests are included, and the day rollover applies.
  setUsage(credentials, loadSnapshot().used + 1)
}

/** The server said the key is out of quota; reflect that locally. */
export function markExhausted() {
  const { credentials } = snapshot
  if (!credentials) return
  setUsage(credentials, DAILY_LIMIT)
}

export function useKeyStore(): KeySnapshot {
  return useSyncExternalStore(subscribe, () => snapshot)
}
