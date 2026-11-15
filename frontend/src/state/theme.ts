import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'
type Choice = Theme | 'system'

const STORAGE = 'btc.theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')

function readChoice(): Choice {
  try {
    const v = localStorage.getItem(STORAGE)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

let choice: Choice = readChoice()
const listeners = new Set<() => void>()

function resolved(): Theme {
  return choice === 'system' ? (media.matches ? 'dark' : 'light') : choice
}

function notify() {
  listeners.forEach((l) => l())
}

media.addEventListener('change', notify)

export function setTheme(next: Theme) {
  choice = next
  try {
    localStorage.setItem(STORAGE, next)
  } catch {
    /* ignore: the choice still applies for this session */
  }
  document.documentElement.dataset.theme = next
  notify()
}

export function toggleTheme() {
  setTheme(resolved() === 'dark' ? 'light' : 'dark')
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** The theme currently on screen. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, resolved)
}
