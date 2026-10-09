// Builds the site's meta database from lolalytics (Emerald+, current patch) + YouTube guide picks.
//   public/meta/index.json        tier list per lane (tier, win/pick/ban rate, games, % of champ games in lane)
//   public/meta/champ/<Id>.json   per lane: most-picked build (spells, runes, skills, items) + matchup win rates
// Run: node scripts/fetch-meta.mjs   (about 10 minutes; be gentle with lolalytics, run once per patch)
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { getHtml, qwik, UA } from './lib/qwik.mjs'

const LOLA = { top: 'top', jungle: 'jungle', mid: 'middle', bot: 'bottom', support: 'support' }
const TIER = ['', 'S+', 'S', 'S-', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-']
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null // e.g. ONLY=Yone,Zed for a quick test
const SKIP_VIDEOS = !!process.env.SKIP_VIDEOS
const r2 = (n) => Math.round(n * 100) / 100
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const versions = await (await fetch('https://ddragon.leagueoflegends.com/api/versions.json')).json()
const dd = (await (await fetch(`https://ddragon.leagueoflegends.com/cdn/${versions[0]}/data/en_US/champion.json`)).json()).data
const byKey = new Map(Object.values(dd).map((c) => [Number(c.key), c]))

// ---------- 1. tier lists ----------
const tier = {}
const lanesOf = new Map() // champ id -> Set(lane)
let patch = ''
for (const [lane, ll] of Object.entries(LOLA)) {
  const q = qwik(await getHtml(`https://lolalytics.com/lol/tierlist/?lane=${ll}`))
  const big = q.objs.filter((v) => v && typeof v === 'object' && !Array.isArray(v) && '1' in v && '2' in v && Object.keys(v).length > 150)
  const statsMap = big.find((m) => { const x = q.at(m['1']); return x && typeof x === 'object' && 'pctLane' in x })
  if (!statsMap) throw new Error('tier list format changed for ' + lane)
  const p = q.objs.find((v) => v && typeof v === 'object' && 'currentPatch' in v)
  if (p) patch = q.dec(p.currentPatch) || patch
  const rows = []
  for (const k of Object.keys(statsMap)) {
    const c = byKey.get(Number(k)); if (!c) continue
    const s = q.dec(statsMap[k]); if (!s || !s.games) continue
    if (s.pctLane < 4 && s.defaultLane !== ll) continue
    rows.push([c.id, TIER[s.tier] ?? '?', r2(s.wr), r2(s.pr), r2(s.br), s.games, r2(s.pctLane), s.rank])
    if (s.pctLane >= 10 || s.defaultLane === ll) (lanesOf.get(c.id) ?? lanesOf.set(c.id, new Set()).get(c.id)).add(lane)
  }
  rows.sort((a, b) => a[7] - b[7])
  tier[lane] = rows.map((r) => r.slice(0, 7))
  console.log(`tier ${lane}: ${rows.length} champions`)
  await sleep(800)
}
// squad picks always get their player's lane
const players = JSON.parse(readFileSync('src/data/players.json', 'utf8')).players
for (const pl of players) for (const c of pl.champions) (lanesOf.get(c.id) ?? lanesOf.set(c.id, new Set()).get(c.id)).add(pl.lane)

mkdirSync('public/meta/champ', { recursive: true })
writeFileSync('public/meta/index.json', JSON.stringify({ patch, updated: new Date().toISOString(), source: 'lolalytics.com (Emerald+, ranked solo/duo)', tier }) + '\n')

// ---------- 2. per champion: build + matchups ----------
const counters = async (slug, lane, vsLane) => {
  const q = qwik(await getHtml(`https://lolalytics.com/lol/${slug}/counters/?lane=${LOLA[lane]}&vslane=${LOLA[vsLane]}`))
  return q.objs.filter((v) => v && typeof v === 'object' && 'vsWr' in v && 'cid' in v).map(q.decObj)
    .map((r) => [byKey.get(r.cid)?.id, r2(r.vsWr), r.n]) // our win rate vs that champion (matches lolalytics "X wins against Y")
    .filter((r) => r[0]).sort((a, b) => b[2] - a[2])
}
const build = async (slug, lane) => {
  const q = qwik(await getHtml(`https://lolalytics.com/lol/${slug}/build/?lane=${LOLA[lane]}`))
  const s = q.objs.find((v) => v && typeof v === 'object' && 'summary' in v)
  if (!s) return null
  const p = q.dec(s.summary)?.pick
  if (!p) return null
  const it = p.items ?? {}
  const opt = (a) => (Array.isArray(a) ? a.map((x) => [x.id, r2(x.wr), x.n]) : [])
  return {
    spells: p.sums?.ids ?? [], spellsWr: p.sums?.wr ?? null,
    runes: p.runes?.set ? { pri: p.runes.set.pri, sec: p.runes.set.sec, mod: p.runes.set.mod, wr: r2(p.runes.wr), n: p.runes.n } : null,
    skillPriority: p.skillpriority?.id ?? null, skillOrder: p.skillorder?.id != null ? String(p.skillorder.id) : null,
    start: it.start ? { set: it.start.set, wr: r2(it.start.wr), n: it.start.n } : null,
    core: it.core ? { set: it.core.set, wr: r2(it.core.wr), n: it.core.n } : null,
    item4: opt(it.item4), item5: opt(it.item5), item6: opt(it.item6),
  }
}

const jobs = []
for (const [id, lanes] of lanesOf) if (!ONLY || ONLY.has(id)) for (const lane of lanes) jobs.push([id, lane])
console.log(`${jobs.length} champion/lane pairs`)
const out = {}
let done = 0, failed = 0
async function worker() {
  while (jobs.length) {
    const [id, lane] = jobs.shift()
    const slug = id === 'MonkeyKing' ? 'wukong' : id.toLowerCase()
    try {
      const row = tier[lane].find((r) => r[0] === id)
      const entry = { tier: row?.[1] ?? null, wr: row?.[2] ?? null, pr: row?.[3] ?? null, br: row?.[4] ?? null, games: row?.[5] ?? 0, pct: row?.[6] ?? 0 }
      entry.build = await build(slug, lane); await sleep(300)
      entry.vs = await counters(slug, lane, lane); await sleep(300)
      if (lane === 'bot') { entry.vsSupport = await counters(slug, 'bot', 'support'); await sleep(300) }
      if (lane === 'support') { entry.vsBot = await counters(slug, 'support', 'bot'); await sleep(300) }
      ;(out[id] ??= { id, name: dd[id].name, key: Number(dd[id].key), lanes: {} }).lanes[lane] = entry
    } catch (e) { failed++; console.error(`  ! ${id} ${lane}: ${e.message}`) }
    if (++done % 25 === 0) console.log(`  ${done} done, ${failed} failed`)
  }
}
await Promise.all([worker(), worker(), worker()])

// ---------- 3. YouTube guides (top recent guide videos per champion) ----------
const LANEWORD = { top: 'top', jungle: 'jungle', mid: 'mid', bot: 'adc', support: 'support' }
async function videos(name, lane) {
  const q = `${name} ${LANEWORD[lane]} guide season 2026`
  const r = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=EgIQAQ%253D%253D&hl=en`, { headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' }, signal: AbortSignal.timeout(15000) })
  const html = await r.text()
  const m = html.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/)
  if (!m) return []
  const found = []
  JSON.stringify(JSON.parse(m[1]), (k, v) => {
    if (k === 'videoRenderer' && v?.videoId) found.push({ id: v.videoId, title: v.title?.runs?.[0]?.text ?? '', channel: v.ownerText?.runs?.[0]?.text ?? '', length: v.lengthText?.simpleText ?? '', age: v.publishedTimeText?.simpleText ?? '', views: v.viewCountText?.simpleText ?? '' })
    return v
  })
  const mins = (l) => { const p = l.split(':').map(Number); return p.length === 3 ? p[0] * 60 + p[1] : p[0] }
  return found
    .filter((v) => v.length && mins(v.length) >= 2 && mins(v.length) <= 45 && !/years? ago/.test(v.age) && new RegExp(name.split(/[ ']/)[0], 'i').test(v.title))
    .slice(0, 4)
}
if (!SKIP_VIDEOS) {
  let n = 0
  for (const c of Object.values(out)) {
    const main = Object.entries(c.lanes).sort((a, b) => (b[1].games ?? 0) - (a[1].games ?? 0))[0]?.[0] ?? 'mid'
    try { c.videos = await videos(c.name, main) } catch { c.videos = [] }
    if (++n % 25 === 0) console.log(`  videos ${n}`)
    await sleep(700)
  }
}

for (const c of Object.values(out)) {
  const f = `public/meta/champ/${c.id}.json`
  if (SKIP_VIDEOS && existsSync(f)) c.videos = JSON.parse(readFileSync(f, 'utf8')).videos ?? []
  writeFileSync(f, JSON.stringify(c) + '\n')
}
console.log(`patch ${patch}: wrote ${Object.keys(out).length} champions, ${failed} failed pairs`)
if (failed > 20) process.exitCode = 1
