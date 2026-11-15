import { useState } from 'react'
import { LANGUAGES, type Language } from '../lib/snippets'
import { CopyButton, Segmented } from './ui'

const STORAGE = 'btc.snippetLanguage'

function readLanguage(): Language {
  try {
    const v = localStorage.getItem(STORAGE)
    return v === 'python' || v === 'javascript' ? v : 'curl'
  } catch {
    return 'curl'
  }
}

/**
 * Code sample with curl / Python / JavaScript tabs. The language choice is
 * remembered. `build(lang, false)` is shown on screen with the API key masked;
 * `build(lang, true)` is what Copy puts on the clipboard.
 */
export function CodeTabs({
  build,
  copyIncludesKey = false,
}: {
  build: (lang: Language, withSecret: boolean) => string
  copyIncludesKey?: boolean
}) {
  const [lang, setLangState] = useState<Language>(readLanguage)

  function setLang(next: Language) {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE, next)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <Segmented label="Language" options={LANGUAGES} value={lang} onChange={setLang} />
        <CopyButton text={build(lang, true)} label={copyIncludesKey ? 'Copy with my key' : 'Copy'} />
      </div>
      <pre className="overflow-x-auto rounded-lg bg-surface-2 p-3 font-mono text-xs leading-relaxed text-ink">
        {build(lang, false)}
      </pre>
    </div>
  )
}
