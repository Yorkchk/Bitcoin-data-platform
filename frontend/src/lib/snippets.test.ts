import { describe, expect, it } from 'vitest'
import { endpointById } from '../api/endpoints'
import { API_KEY_PLACEHOLDER, KEY_NAME_PLACEHOLDER, buildSnippet, queryString } from './snippets'

const BASE = 'https://btc.example'
const history = endpointById('historyChart')
const generate = endpointById('generate')
const creds = { key_name: KEY_NAME_PLACEHOLDER, api_key: API_KEY_PLACEHOLDER }

describe('queryString', () => {
  it('encodes real values but keeps placeholders readable', () => {
    expect(queryString([['key_name', 'a b'], ['api_key', API_KEY_PLACEHOLDER]])).toBe(
      'key_name=a%20b&api_key=<YOUR_API_KEY>',
    )
  })
})

describe('buildSnippet: GET', () => {
  const values = { ...creds, start_date: '2026-11-01', limit: '3', end_date: '' }

  it('curl puts parameters in the declared order and skips empty ones', () => {
    expect(buildSnippet('curl', history, values, BASE)).toBe(
      'curl "https://btc.example/get_historyChart?key_name=<YOUR_KEY_NAME>&api_key=<YOUR_API_KEY>&start_date=2026-11-01&limit=3"',
    )
  })

  it('python passes params as a dict, with limit as a number', () => {
    const code = buildSnippet('python', history, values, BASE)
    expect(code).toContain('requests.get(')
    expect(code).toContain('"https://btc.example/get_historyChart",')
    expect(code).toContain('"api_key": "<YOUR_API_KEY>",')
    expect(code).toContain('"limit": 3,')
    expect(code).not.toContain('end_date')
  })

  it('javascript builds URLSearchParams and checks the status', () => {
    const code = buildSnippet('javascript', history, values, BASE)
    expect(code).toContain("key_name: '<YOUR_KEY_NAME>',")
    expect(code).toContain('limit: 3,')
    expect(code).toContain('fetch(`https://btc.example/get_historyChart?${params}`)')
    expect(code).toContain('if (!response.ok)')
  })

  it('escapes quotes in JavaScript string literals', () => {
    const code = buildSnippet('javascript', history, { ...creds, key_name: "it's" }, BASE)
    expect(code).toContain("key_name: 'it\\'s',")
  })
})

describe('buildSnippet: PUT /generareApi/', () => {
  it('curl sends a JSON body', () => {
    expect(buildSnippet('curl', generate, { key_name: 'my-app' }, BASE)).toBe(
      'curl -X PUT "https://btc.example/generareApi/" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"key_name":"my-app"}\'',
    )
  })

  it('python and javascript send JSON and print the key', () => {
    expect(buildSnippet('python', generate, { key_name: 'my-app' }, BASE)).toContain(
      'requests.put("https://btc.example/generareApi/", json={"key_name": "my-app"}, timeout=60)',
    )
    const js = buildSnippet('javascript', generate, { key_name: 'my-app', owner_email: 'a@b.c' }, BASE)
    expect(js).toContain("body: JSON.stringify({ key_name: 'my-app', owner_email: 'a@b.c' }),")
  })
})
