import type { Endpoint } from '../api/endpoints'

export type Language = 'curl' | 'python' | 'javascript'

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'curl', label: 'curl' },
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
]

export const KEY_NAME_PLACEHOLDER = '<YOUR_KEY_NAME>'
export const API_KEY_PLACEHOLDER = '<YOUR_API_KEY>'
const PLACEHOLDERS = new Set([KEY_NAME_PLACEHOLDER, API_KEY_PLACEHOLDER])

/** Fields with a non-empty value, in the endpoint's declared order. */
function presentFields(endpoint: Endpoint, values: Record<string, string>): [string, string][] {
  return endpoint.fields
    .map((f) => [f.name, (values[f.name] ?? '').trim()] as [string, string])
    .filter(([, v]) => v !== '')
}

/** Query string where placeholders stay readable instead of being percent-encoded. */
export function queryString(pairs: [string, string][]): string {
  return pairs
    .map(([k, v]) => `${encodeURIComponent(k)}=${PLACEHOLDERS.has(v) ? v : encodeURIComponent(v)}`)
    .join('&')
}

function isNumberField(endpoint: Endpoint, name: string): boolean {
  return endpoint.fields.find((f) => f.name === name)?.type === 'number'
}

/** A literal for Python or JavaScript: numbers stay numbers, everything else is a string. */
function literal(endpoint: Endpoint, name: string, value: string, lang: 'python' | 'javascript'): string {
  if (isNumberField(endpoint, name) && /^\d+$/.test(value)) return value
  return lang === 'python' ? JSON.stringify(value) : `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

/**
 * Code that calls `endpoint` with `values`, for the Docs page and the Explorer.
 * `baseUrl` is the site origin, e.g. "http://localhost".
 */
export function buildSnippet(
  lang: Language,
  endpoint: Endpoint,
  values: Record<string, string>,
  baseUrl: string,
): string {
  const url = `${baseUrl}${endpoint.path}`
  const pairs = presentFields(endpoint, values)

  if (endpoint.method === 'PUT') {
    const body = Object.fromEntries(pairs)
    if (lang === 'curl') {
      return `curl -X PUT "${url}" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(body)}'`
    }
    if (lang === 'python') {
      const entries = pairs.map(([k, v]) => `"${k}": ${literal(endpoint, k, v, 'python')}`).join(', ')
      return [
        'import requests',
        '',
        `response = requests.put("${url}", json={${entries}}, timeout=60)`,
        'response.raise_for_status()',
        'key = response.json()',
        'print(key["api_key"])  # shown only once: store it somewhere safe',
      ].join('\n')
    }
    const entries = pairs.map(([k, v]) => `${k}: ${literal(endpoint, k, v, 'javascript')}`).join(', ')
    return [
      `const response = await fetch('${url}', {`,
      "  method: 'PUT',",
      "  headers: { 'Content-Type': 'application/json' },",
      `  body: JSON.stringify({ ${entries} }),`,
      '})',
      'if (!response.ok) throw new Error(`HTTP ${response.status}`)',
      'const key = await response.json()',
      'console.log(key.api_key) // shown only once: store it somewhere safe',
    ].join('\n')
  }

  if (lang === 'curl') {
    const q = queryString(pairs)
    return `curl "${url}${q ? `?${q}` : ''}"`
  }
  if (lang === 'python') {
    const params = pairs
      .map(([k, v]) => `        "${k}": ${literal(endpoint, k, v, 'python')},`)
      .join('\n')
    return [
      'import requests',
      '',
      'response = requests.get(',
      `    "${url}",`,
      '    params={',
      params,
      '    },',
      '    timeout=60,',
      ')',
      'response.raise_for_status()',
      'rows = response.json()',
      'print(len(rows), rows[:1])',
    ].join('\n')
  }
  const params = pairs.map(([k, v]) => `  ${k}: ${literal(endpoint, k, v, 'javascript')},`).join('\n')
  return [
    'const params = new URLSearchParams({',
    params,
    '})',
    `const response = await fetch(\`${url}?\${params}\`)`,
    'if (!response.ok) throw new Error(`HTTP ${response.status}`)',
    'const rows = await response.json()',
    'console.log(rows.length, rows[0])',
  ].join('\n')
}
