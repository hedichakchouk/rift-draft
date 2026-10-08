import { LANES, LANE_LABEL, type Champion, type Lane, type Player, type Tier } from './types'
import type { Draft } from './draft'
import { teamStats } from './draft'
import type { Stats } from './stats'

export type Kind = 'good' | 'warn' | 'bad'
export interface Reason { kind: Kind; text: string }
export interface SlotRead { lane: Lane; player: string; champ: string; score: number; tier?: Tier; games: number; wr: number | null }
export interface Verdict {
  complete: boolean; score: number; grade: string; label: string; headline: string
  playerScore: number; compScore: number; slots: SlotRead[]; reasons: Reason[]
}

const POOL: Record<Tier, number> = { Z: 100, S: 88, A: 70, B: 48, C: 35, D: 25 }
const clamp = (n: number, a = 0, b = 100) => Math.max(a, Math.min(b, n))

export function analyze(draft: Draft, players: Player[], byId: Map<string, Champion>, stats: Stats | null): Verdict | null {
  const filled = LANES.filter((l) => draft[l].champ && draft[l].player)
  if (filled.length === 0) return null
  const reasons: Reason[] = []
  const slots: SlotRead[] = []

  for (const l of filled) {
    const p = players.find((x) => x.name === draft[l].player)
    const id = draft[l].champ!
    if (!p) continue
    const name = byId.get(id)?.name ?? id
    const tier = p.champions.find((c) => c.id === id)?.tier
    const st = stats?.players[p.name]
    const cs = st?.champions[id]
    const wr = cs && cs.games ? cs.wins / cs.games : null
    let score = tier ? POOL[tier] : p.champions.length ? 20 : 50

    if (cs && wr !== null && cs.games >= 2) {
      const conf = cs.games / (cs.games + 6)
      score = score * (1 - 0.4 * conf) + clamp(50 + (wr - 0.5) * 200) * 0.4 * conf
      const pct = Math.round(wr * 100)
      if (cs.games >= 5 && (tier === 'Z' || tier === 'S') && wr < 0.45)
        reasons.push({ kind: 'warn', text: `${p.name} rates ${name} ${tier}, but ranked says ${pct}% over ${cs.games} games.` })
      if (cs.games >= 5 && (!tier || tier === 'B') && wr >= 0.58)
        reasons.push({ kind: 'good', text: `Hidden gem: ${p.name} wins ${pct}% on ${name} (${cs.games} games) even though it's ${tier ? 'only B' : 'not in the pool'}.` })
      if (cs.games >= 5 && (tier === 'Z' || tier === 'S') && wr >= 0.58)
        reasons.push({ kind: 'good', text: `${p.name} on ${name}: ${tier} tier backed by ${pct}% winrate (${cs.games} games).` })
    } else if (stats?.players[p.name] && tier && (tier === 'Z' || tier === 'S') && !cs) {
      reasons.push({ kind: 'warn', text: `${p.name} has no recent ranked games on ${name} (${tier}) - untested lately.` })
    }

    // off-lane penalty
    if (p.lane !== l) {
      const ft = p.flexLanes?.[l]
      const pen = ft ? (ft === 'Z' || ft === 'S' ? 4 : ft === 'A' ? 8 : 12) : 18
      score -= pen
      reasons.push({ kind: ft ? 'warn' : 'bad', text: `${p.name} is a ${LANE_LABEL[p.lane]} main playing ${LANE_LABEL[l]}${ft ? ` (flex ${ft})` : ''}.` })
    }
    // recent overall form
    if (st && st.games >= 10) score += clamp((st.wins / st.games - 0.5) * 20, -6, 6)
    if (!tier && p.champions.length) reasons.push({ kind: 'bad', text: `${name} is not in ${p.name}'s champion pool.` })
    if (tier === 'B') reasons.push({ kind: 'warn', text: `${name} is a B-tier pick for ${p.name} (can play, rather not).` })

    slots.push({ lane: l, player: p.name, champ: id, score: Math.round(clamp(score)), tier, games: cs?.games ?? 0, wr: wr === null ? null : Math.round(wr * 100) })
  }

  const playerScore = slots.length ? slots.reduce((a, s) => a + s.score, 0) / slots.length : 0
  const weakest = [...slots].sort((a, b) => a.score - b.score)[0]
  if (slots.length >= 3 && weakest && weakest.score < 55)
    reasons.push({ kind: 'bad', text: `Weakest link: ${weakest.player} on ${byId.get(weakest.champ)?.name ?? weakest.champ} (${weakest.score}/100).` })

  // ---- team composition ----
  const picked = LANES.map((l) => ({ lane: l, c: draft[l].champ ? byId.get(draft[l].champ!) : undefined })).filter((x) => x.c) as { lane: Lane; c: Champion }[]
  const complete = picked.length === 5 && filled.length === 5
  let comp = 70
  if (picked.length >= 3) {
    const { apShare } = teamStats(draft, byId)
    if (apShare !== null) {
      const ap = apShare
      if (ap >= 30 && ap <= 70) { comp += 6; reasons.push({ kind: 'good', text: `Balanced damage (${100 - ap}% AD / ${ap}% AP) - hard to itemise against.` }) }
      else if (ap >= 20 && ap <= 80) { comp -= 6; reasons.push({ kind: 'warn', text: `Damage is lopsided (${100 - ap}% AD / ${ap}% AP); the enemy can stack ${ap < 50 ? 'armor' : 'magic resist'}.` }) }
      else { comp -= 18; reasons.push({ kind: 'bad', text: `Almost all ${ap < 50 ? 'AD' : 'AP'} damage (${ap < 50 ? 100 - ap : ap}%) - easy to itemise against.` }) }
    }
    const front = picked.filter(({ c }) => c.tags.includes('Tank') || (c.tags.includes('Fighter') && c.info.defense >= 6)).length
    if (front === 0) { comp -= 16; reasons.push({ kind: 'bad', text: 'No real frontline (no tank or bruiser) - the carries get dived.' }) }
    else if (front >= 2) { comp += 6; reasons.push({ kind: 'good', text: `Solid frontline (${front} tanks/bruisers).` }) }
    else comp += 2
    const squishy = picked.filter(({ c }) => c.info.defense <= 3 && !c.tags.includes('Tank')).length
    if (squishy >= 4) { comp -= 10; reasons.push({ kind: 'warn', text: `${squishy} squishy champions - vulnerable to engage and assassins.` }) }
    const assassins = picked.filter(({ c }) => c.tags.includes('Assassin')).length
    if (assassins >= 3) { comp -= 8; reasons.push({ kind: 'warn', text: `${assassins} assassins: strong picks, but little sustained teamfight damage.` }) }
    const dmg = picked.filter(({ c }) => c.tags.some((t) => ['Marksman', 'Mage', 'Assassin'].includes(t)) || c.info.attack + c.info.magic >= 12).length
    if (dmg < 2) { comp -= 10; reasons.push({ kind: 'warn', text: 'Low damage output - not enough carries.' }) }
    const sup = picked.find((x) => x.lane === 'support')
    if (sup && !sup.c.tags.some((t) => ['Support', 'Tank'].includes(t))) { comp -= 4; reasons.push({ kind: 'warn', text: `${sup.c.name} is an unusual support pick.` }) }
    const adc = picked.find((x) => x.lane === 'bot')
    if (adc && adc.c.tags.includes('Marksman')) comp += 3
  }
  comp = clamp(comp)

  const score = Math.round(complete ? 0.65 * playerScore + 0.35 * comp : 0.8 * playerScore + 0.2 * comp)
  const [grade, label] = score >= 85 ? ['S', 'Excellent'] : score >= 75 ? ['A', 'Strong'] : score >= 65 ? ['B', 'Solid'] : score >= 55 ? ['C', 'Risky'] : ['D', 'Poor']
  const bad = reasons.filter((r) => r.kind === 'bad').length
  const headline = !complete
    ? `Incomplete draft (${filled.length}/5) - preview only.`
    : bad === 0 && score >= 75 ? 'Good comp - play it.'
    : bad === 0 ? 'Playable, nothing broken, but not a strong pick.'
    : score >= 65 ? 'Playable, but there are real problems to fix.'
    : 'Not recommended - rework the flagged picks.'
  // keep order: bad, warn, good
  const order: Record<Kind, number> = { bad: 0, warn: 1, good: 2 }
  reasons.sort((a, b) => order[a.kind] - order[b.kind])
  return { complete, score, grade, label, headline, playerScore: Math.round(playerScore), compScore: Math.round(comp), slots, reasons }
}
