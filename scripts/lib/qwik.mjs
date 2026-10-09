// Tiny helpers to read the server-rendered data that lolalytics embeds in each page (Qwik "qwik/json" state).
export const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function getHtml(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' }, signal: AbortSignal.timeout(20000) })
      if (r.status === 429 || r.status >= 500) { await sleep(3000 * (i + 1)); continue }
      if (!r.ok) throw new Error(`${r.status} ${url}`)
      return await r.text()
    } catch (e) { if (i === tries - 1) throw e; await sleep(2000 * (i + 1)) }
  }
  throw new Error('failed ' + url)
}

/** Returns a decoder over the page's Qwik object table. Object fields and array items are base-36 refs. */
export function qwik(html) {
  const m = html.match(/<script type="qwik\/json">([\s\S]*?)<\/script>/)
  if (!m) throw new Error('no qwik state')
  const objs = JSON.parse(m[1]).objs
  const at = (ref) => objs[parseInt(ref, 36)]
  const dec = (ref, depth = 0) => {
    const v = at(ref)
    if (depth > 12) return null
    if (Array.isArray(v)) return v.map((x) => dec(x, depth + 1))
    if (v && typeof v === 'object') {
      const out = {}
      for (const [k, x] of Object.entries(v)) if (typeof x === 'string') out[k] = dec(x, depth + 1)
      return out
    }
    if (typeof v === 'string' && v.length && v.charCodeAt(0) < 32) return null // qwik special markers
    return v
  }
  /** decode a raw object found in the table */
  const decObj = (o) => { const out = {}; for (const [k, x] of Object.entries(o)) if (typeof x === 'string') out[k] = dec(x); return out }
  return { objs, at, dec, decObj }
}
