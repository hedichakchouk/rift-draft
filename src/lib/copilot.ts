import { LANES, type Champion, type Lane, type Player, type Tier } from './types'
import { vsWinRate, type ChampMeta, type MetaIndex } from './meta'

export interface Pick { id: string; lane: Lane }
export interface CoState { me: Lane; player: Player | null; ally: Pick[]; enemy: Pick[]; bans: string[] }
export interface Rec { id: string; score: number; reasons: { tone: 'good' | 'warn' | 'bad' | 'neutral'; text: string }[]; vs: number | null; vsGames: number; tier: string | null; wr: number | null; poolTier?: Tier }
export interface BanRec { id: string; avg: number; beats: number; of: number; names: string[] }

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n))
const POOL_BONUS: Record<Tier, number> = { Z: 7, S: 5, A: 2.5, B: 0, C: -3, D: -5 }

/** Most likely lane of a champion that is still free on its team. */
export function guessLane(idx: MetaIndex | null, id: string, taken: Lane[]): Lane {
  const free = LANES.filter((l) => !taken.includes(l))
  if (!idx) return free[0] ?? 'top'
  let best: Lane = free[0] ?? 'top', bp = -1
  for (const l of free) {
    const r = idx.tier[l]?.find((x) => x[0] === id)
    const p = r ? r[6] : 0
    if (p > bp) { bp = p; best = l }
  }
  return best
}

/** Candidate pool for a lane: the lane's popular picks plus the player's own champions. */
export function candidateIds(idx: MetaIndex | null, lane: Lane, player: Player | null): string[] {
  const out = new Set<string>()
  if (idx) {
    const rows = [...(idx.tier[lane] ?? [])].filter((r) => r[5] >= 1500).sort((a, b) => b[3] - a[3]).slice(0, 40)
    rows.forEach((r) => out.add(r[0]))
  }
  if (player) player.champions.forEach((c) => out.add(c.id))
  return [...out]
}

export function recommend(
  st: CoState, idx: MetaIndex | null, metas: Map<string, ChampMeta>, byId: Map<string, Champion>,
): Rec[] {
  const lane = st.me
  const unavailable = new Set([...st.bans, ...st.enemy.map((p) => p.id), ...st.ally.map((p) => p.id)])
  const foe = st.enemy.find((p) => p.lane === lane)
  const foeMeta = foe ? metas.get(foe.id) ?? null : null
  const foeSup = lane === 'bot' ? st.enemy.find((p) => p.lane === 'support') : undefined
  const foeBot = lane === 'support' ? st.enemy.find((p) => p.lane === 'bot') : undefined
  const mates = st.ally.filter((p) => p.lane !== lane)
  const mateChamps = mates.map((p) => byId.get(p.id)).filter(Boolean) as Champion[]
  const mateAd = mateChamps.reduce((s, c) => s + c.info.attack, 0)
  const mateAp = mateChamps.reduce((s, c) => s + c.info.magic, 0)
  const apShare = mateAd + mateAp ? mateAp / (mateAd + mateAp) : null
  const frontline = mateChamps.filter((c) => c.tags.includes('Tank') || c.info.defense >= 7).length
  const out: Rec[] = []

  for (const id of candidateIds(idx, lane, st.player)) {
    if (unavailable.has(id)) continue
    const m = metas.get(id)
    const lm = m?.lanes[lane]
    const poolTier = st.player?.champions.find((c) => c.id === id)?.tier
    if (!lm && !poolTier) continue
    const champ = byId.get(id)
    const reasons: Rec['reasons'] = []
    let s = 50

    const wr = lm?.wr ?? null
    if (wr != null) {
      s += clamp((wr - 50) * 2.2, -14, 14)
      if (lm?.tier) reasons.push({ tone: lm.tier[0] === 'S' || lm.tier[0] === 'A' ? 'good' : lm.tier[0] === 'B' ? 'neutral' : 'warn', text: `${lm.tier} tier · ${wr.toFixed(1)}% WR` })
    } else s -= 6

    let vs: number | null = null, vsGames = 0
    const terms: { wr: number; n: number; label: string }[] = []
    if (m && foeMeta && foe) {
      const r = vsWinRate(m, foeMeta, lane)
      if (r) terms.push({ ...r, n: r.games, label: foeMeta.name })
    }
    if (m && foeSup) { const r = vsWinRate(m, metas.get(foeSup.id) ?? null, 'bot', 'vsSupport', 'support'); if (r) terms.push({ ...r, n: r.games, label: `${metas.get(foeSup.id)?.name} (sup)` }) }
    if (m && foeBot) { const r = vsWinRate(m, metas.get(foeBot.id) ?? null, 'support', 'vsBot', 'bot'); if (r) terms.push({ ...r, n: r.games, label: `${metas.get(foeBot.id)?.name} (adc)` }) }
    for (const t of terms) {
      const conf = clamp(t.n / 400, 0.35, 1)
      s += clamp((t.wr - 50) * 3.2, -18, 18) * conf / Math.max(1, terms.length * 0.7)
      reasons.push({ tone: t.wr >= 51.5 ? 'good' : t.wr <= 48.5 ? 'bad' : 'neutral', text: `${t.wr.toFixed(1)}% vs ${t.label}` })
    }
    if (terms[0]) { vs = terms[0].wr; vsGames = terms[0].n }

    if (champ && mateChamps.length >= 2) {
      if (apShare != null && apShare < 0.28 && champ.info.magic >= 6) { s += 4; reasons.push({ tone: 'good', text: 'Adds magic damage your team lacks' }) }
      if (apShare != null && apShare > 0.72 && champ.info.attack >= 6) { s += 4; reasons.push({ tone: 'good', text: 'Adds physical damage your team lacks' }) }
      if (frontline === 0 && (champ.tags.includes('Tank') || champ.info.defense >= 7)) { s += 4; reasons.push({ tone: 'good', text: 'Gives your team a frontline' }) }
      if (frontline >= 2 && (champ.tags.includes('Tank') && !champ.tags.includes('Support'))) { s -= 2; reasons.push({ tone: 'neutral', text: 'Team already has frontline' }) }
    }

    if (st.player) {
      if (poolTier) { s += POOL_BONUS[poolTier]; reasons.push({ tone: poolTier === 'Z' || poolTier === 'S' || poolTier === 'A' ? 'good' : 'neutral', text: `${poolTier} in ${st.player.name}'s pool` }) }
      else { s -= 5; reasons.push({ tone: 'warn', text: `Outside ${st.player.name}'s pool` }) }
    }

    out.push({ id, score: Math.round(clamp(s, 5, 99)), reasons, vs, vsGames, tier: lm?.tier ?? null, wr, poolTier })
  }
  return out.sort((a, b) => b.score - a.score)
}

/** Which champions hurt our picks the most in this lane → ban candidates. */
export function banSuggestions(
  st: CoState, idx: MetaIndex | null, metas: Map<string, ChampMeta>, byId: Map<string, Champion>,
): BanRec[] {
  if (!idx) return []
  const lane = st.me
  let poolIds: string[]
  if (st.player) {
    poolIds = st.player.champions.filter((c) => c.tier === 'Z' || c.tier === 'S' || c.tier === 'A').map((c) => c.id)
    if (poolIds.length < 3) poolIds = st.player.champions.map((c) => c.id)
  } else {
    poolIds = [...(idx.tier[lane] ?? [])].sort((a, b) => b[3] - a[3]).slice(0, 8).map((r) => r[0])
  }
  poolIds = poolIds.filter((id) => metas.get(id)?.lanes[lane]).slice(0, 10)
  if (poolIds.length < 2) return []
  const skip = new Set([...st.bans, ...st.enemy.map((p) => p.id), ...st.ally.map((p) => p.id)])
  const foes = [...(idx.tier[lane] ?? [])].filter((r) => r[5] >= 1500 && !skip.has(r[0])).sort((a, b) => b[3] - a[3]).slice(0, 35)
  const res: BanRec[] = []
  for (const f of foes) {
    const wrs: { id: string; wr: number }[] = []
    for (const id of poolIds) {
      const row = metas.get(id)?.lanes[lane]?.vs.find((v) => v[0] === f[0])
      if (row && row[2] >= 80) wrs.push({ id, wr: row[1] })
    }
    if (wrs.length < 2) continue
    const avg = wrs.reduce((s, w) => s + w.wr, 0) / wrs.length
    const bad = wrs.filter((w) => w.wr < 48.5)
    res.push({ id: f[0], avg: Math.round(avg * 10) / 10, beats: bad.length, of: wrs.length, names: bad.map((b) => byId.get(b.id)?.name ?? b.id) })
  }
  // lower average vs our pool = better ban; high pick rate makes it likelier to appear, so weigh it in
  return res.sort((a, b) => (a.avg - 0.4 * Math.min(a.beats, 5)) - (b.avg - 0.4 * Math.min(b.beats, 5))).slice(0, 6)
}

export interface TeamRead { ad: number; ap: number; frontline: number; tags: Record<string, number>; n: number; lines: { tone: 'good' | 'warn' | 'bad' | 'neutral'; text: string }[] }

/** Plain-language read of a team's picks. `enemy` flips the advice into what WE should do about it. */
export function readTeam(picks: Pick[], byId: Map<string, Champion>, enemy: boolean): TeamRead {
  const champs = picks.map((p) => byId.get(p.id)).filter(Boolean) as Champion[]
  const tags: Record<string, number> = {}
  let ad = 0, ap = 0
  champs.forEach((c) => { ad += c.info.attack; ap += c.info.magic; c.tags.forEach((t) => (tags[t] = (tags[t] ?? 0) + 1)) })
  const total = ad + ap
  const apS = total ? Math.round((ap / total) * 100) : 50
  const frontline = champs.filter((c) => c.tags.includes('Tank') || c.info.defense >= 7).length
  const lines: TeamRead['lines'] = []
  if (champs.length >= 2) {
    if (enemy) {
      if (apS <= 25) lines.push({ tone: 'good', text: `Mostly physical damage (${100 - apS}% AD): armor is worth more than MR.` })
      else if (apS >= 75) lines.push({ tone: 'good', text: `Mostly magic damage (${apS}% AP): early MR pays off.` })
      else lines.push({ tone: 'neutral', text: `Mixed damage (${100 - apS}% AD / ${apS}% AP): balance resists.` })
      if (frontline === 0 && champs.length >= 3) lines.push({ tone: 'good', text: 'No real frontline: pick range or burst and punish when they walk up.' })
      if (frontline >= 3) lines.push({ tone: 'warn', text: `${frontline} tanky champions: favor % health, armor pen, and sustained DPS.` })
      if ((tags.Assassin ?? 0) >= 2) lines.push({ tone: 'warn', text: `${tags.Assassin} assassins: keep peel and a defensive item for your carries.` })
      if ((tags.Mage ?? 0) + (tags.Marksman ?? 0) >= 4) lines.push({ tone: 'good', text: 'Squishy, ranged-heavy team: engage and dive win here.' })
    } else {
      if (apS <= 22) lines.push({ tone: 'bad', text: `Your team is ${100 - apS}% AD: pick magic damage or they stack armor.` })
      else if (apS >= 78) lines.push({ tone: 'bad', text: `Your team is ${apS}% AP: pick physical damage or they stack MR.` })
      if (frontline === 0 && champs.length >= 3) lines.push({ tone: 'bad', text: 'No frontline yet: your last picks should be tanky or peel-heavy.' })
      if (frontline >= 3) lines.push({ tone: 'warn', text: 'Lots of tanks: make sure someone brings damage.' })
    }
  }
  return { ad, ap, frontline, tags, n: champs.length, lines }
}
