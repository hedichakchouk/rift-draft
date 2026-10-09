// Fills in YouTube guide picks for champions in public/meta/champ that have none (or all, with ALL=1).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { UA } from './lib/qwik.mjs'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const LANEWORD = { top: 'top', jungle: 'jungle', mid: 'mid', bot: 'adc', support: 'support' }
const mins = (l) => { const p = l.split(':').map(Number); return p.length === 3 ? p[0] * 60 + p[1] : p[0] }

async function search(q) {
  const r = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=EgIQAQ%253D%253D&hl=en`, { headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' }, signal: AbortSignal.timeout(15000) })
  const m = (await r.text()).match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/)
  if (!m) return null // throttled
  const found = []
  JSON.stringify(JSON.parse(m[1]), (k, v) => {
    if (k === 'videoRenderer' && v?.videoId) found.push({ id: v.videoId, title: v.title?.runs?.[0]?.text ?? '', channel: v.ownerText?.runs?.[0]?.text ?? '', length: v.lengthText?.simpleText ?? '', age: v.publishedTimeText?.simpleText ?? '', views: v.viewCountText?.simpleText ?? '' })
    return v
  })
  return found
}

let done = 0, throttled = 0
for (const f of readdirSync('public/meta/champ')) {
  const path = `public/meta/champ/${f}`
  const c = JSON.parse(readFileSync(path, 'utf8'))
  if (c.videos?.length && !process.env.ALL) continue
  const main = Object.entries(c.lanes).sort((a, b) => (b[1].games ?? 0) - (a[1].games ?? 0))[0]?.[0] ?? 'mid'
  const first = c.name.split(/[ '.&]/)[0]
  let picks = []
  for (const q of [`${c.name} ${LANEWORD[main]} guide season 2026`, `how to play ${c.name} ${LANEWORD[main]}`]) {
    let res = null
    for (let t = 0; t < 3 && !res; t++) { res = await search(q).catch(() => null); if (!res) { throttled++; await sleep(8000 * (t + 1)) } }
    picks = (res ?? []).filter((v) => v.length && mins(v.length) >= 2 && mins(v.length) <= 60 && !/[2-9] years? ago/.test(v.age) && new RegExp(first, 'i').test(v.title)).slice(0, 4)
    if (picks.length) break
    await sleep(1500)
  }
  c.videos = picks
  writeFileSync(path, JSON.stringify(c) + '\n')
  if (++done % 10 === 0) console.log(`  ${done} champions, ${throttled} throttled retries`)
  await sleep(1500)
}
console.log(`done: ${done} updated, ${throttled} throttled retries`)
