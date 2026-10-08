// Fetches EUW stats for every player in src/data/players.json from the official Riot API
// (the same data op.gg shows) and writes public/stats.json.
// Usage: RIOT_API_KEY=RGAPI-... node scripts/fetch-stats.mjs   (optional: MATCH_COUNT=40 FLEX_COUNT=15)
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const KEY = process.env.RIOT_API_KEY
if (!KEY) { console.error('RIOT_API_KEY is not set - skipping stats refresh.'); process.exit(0) }
const SOLO = Number(process.env.MATCH_COUNT ?? 40)
const FLEX = Number(process.env.FLEX_COUNT ?? 15)
const OUT = 'public/stats.json'
const players = JSON.parse(readFileSync('src/data/players.json', 'utf8')).players
const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { players: {} }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let last = 0
async function api(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const wait = 1300 - (Date.now() - last) // stay under the dev-key limit (100 req / 2 min)
    if (wait > 0) await sleep(wait)
    last = Date.now()
    const res = await fetch(url, { headers: { 'X-Riot-Token': KEY } })
    if (res.status === 429) { await sleep((Number(res.headers.get('retry-after')) || 10) * 1000 + 500); continue }
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url.replace(/\?.*/, '')}`)
    return res.json()
  }
  throw new Error('rate limited too many times: ' + url)
}

// numeric champion id -> Data Dragon id
const versions = await (await fetch('https://ddragon.leagueoflegends.com/api/versions.json')).json()
const dd = await (await fetch(`https://ddragon.leagueoflegends.com/cdn/${versions[0]}/data/en_US/champion.json`)).json()
const byKey = new Map(Object.values(dd.data).map((c) => [Number(c.key), c.id]))

const out = { updated: new Date().toISOString(), patch: versions[0], players: {} }
for (const p of players) {
  if (!p.riotId) continue
  const [name, tag] = p.riotId.split('#')
  const platform = p.region ?? 'euw1'
  try {
    console.log(`> ${p.name} (${p.riotId})`)
    const acc = await api(`https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`)
    if (!acc) throw new Error('account not found - check the Riot ID')
    const puuid = acc.puuid
    const summ = await api(`https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`)
    const entries = (await api(`https://${platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`)) ?? []
    const q = (t) => entries.find((e) => e.queueType === t)
    const toRank = (e) => e && { tier: e.tier, division: e.rank, lp: e.leaguePoints, wins: e.wins, losses: e.losses }
    const mastery = ((await api(`https://${platform}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=20`)) ?? [])
      .map((m) => ({ id: byKey.get(m.championId), level: m.championLevel, points: m.championPoints }))
      .filter((m) => m.id)

    const ids = new Set()
    for (const [queue, count] of [[420, SOLO], [440, FLEX]]) {
      if (!count) continue
      const list = (await api(`https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=${queue}&start=0&count=${count}`)) ?? []
      list.forEach((m) => ids.add(m))
    }
    const champions = {}, lanes = {}
    let games = 0, wins = 0
    for (const id of ids) {
      const m = await api(`https://europe.api.riotgames.com/lol/match/v5/matches/${id}`)
      const me = m?.info?.participants?.find((x) => x.puuid === puuid)
      if (!me || me.gameEndedInEarlySurrender || m.info.gameDuration < 300) continue
      const cid = byKey.get(me.championId) ?? me.championName
      const c = (champions[cid] ??= { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, cs: 0, minutes: 0 })
      c.games++; c.wins += me.win ? 1 : 0; c.kills += me.kills; c.deaths += me.deaths; c.assists += me.assists
      c.cs += me.totalMinionsKilled + me.neutralMinionsKilled; c.minutes += m.info.gameDuration / 60
      if (me.teamPosition) lanes[me.teamPosition] = (lanes[me.teamPosition] ?? 0) + 1
      games++; wins += me.win ? 1 : 0
    }
    for (const c of Object.values(champions)) c.minutes = Math.round(c.minutes)
    out.players[p.name] = {
      riotId: p.riotId, level: summ?.summonerLevel ?? null, icon: summ?.profileIconId ?? null,
      solo: toRank(q('RANKED_SOLO_5x5')) ?? null, flex: toRank(q('RANKED_FLEX_SR')) ?? null,
      games, wins, lanes, champions, mastery,
    }
    console.log(`  ${games} ranked games, ${Object.keys(champions).length} champions`)
  } catch (e) {
    console.error(`  failed for ${p.name}: ${e.message}`)
    if (prev.players?.[p.name]) out.players[p.name] = prev.players[p.name] // keep last good data
  }
}
writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n')
console.log('wrote', OUT)
