import { LANES, TIER_SCORE, type Champion, type Lane, type Player, type Tier } from './types'

export interface Slot { player: string | null; champ: string | null }
export type Draft = Record<Lane, Slot>
export const emptyDraft = (): Draft =>
  Object.fromEntries(LANES.map((l) => [l, { player: null, champ: null }])) as Draft

export const laneTier = (p: Player, l: Lane) => (p.lane === l ? ('main' as const) : p.flexLanes?.[l])
const laneScore = (p: Player, l: Lane) =>
  p.lane === l ? 10 : p.flexLanes?.[l] ? TIER_SCORE[p.flexLanes[l]!] : 0

/** Default lineup: each player on their main lane. */
export function defaultDraft(players: Player[]): Draft {
  const d = emptyDraft()
  for (const l of LANES) d[l].player = players.find((p) => p.lane === l)?.name ?? null
  return d
}

/** Best assignment of players to the 5 lanes (brute force; fine for a friend-group sized roster). */
export function autoAssign(players: Player[]): Record<Lane, string | null> {
  const best = { score: -1, pick: [] as (string | null)[] }
  const used = new Set<number>()
  const cur: (number | null)[] = []
  const rec = (i: number, score: number) => {
    if (i === LANES.length) {
      if (score > best.score) { best.score = score; best.pick = cur.map((x) => (x === null ? null : players[x].name)) }
      return
    }
    let any = false
    for (let p = 0; p < players.length; p++) {
      if (used.has(p)) continue
      any = true; used.add(p); cur[i] = p
      rec(i + 1, score + laneScore(players[p], LANES[i]))
      used.delete(p)
    }
    if (!any || players.length < LANES.length) { cur[i] = null; rec(i + 1, score) }
  }
  rec(0, 0)
  return Object.fromEntries(LANES.map((l, i) => [l, best.pick[i] ?? null])) as Record<Lane, string | null>
}

export const poolTier = (p: Player | undefined, champId: string | null): Tier | undefined =>
  p && champId ? p.champions.find((c) => c.id === champId)?.tier : undefined

/** Damage balance (0 = all AD, 100 = all AP) and role tag counts for the placed champions. */
export function teamStats(draft: Draft, byId: Map<string, Champion>) {
  let ad = 0, ap = 0
  const tags: Record<string, number> = {}
  for (const l of LANES) {
    const c = draft[l].champ ? byId.get(draft[l].champ!) : undefined
    if (!c) continue
    ad += c.info.attack; ap += c.info.magic
    c.tags.forEach((t) => (tags[t] = (tags[t] ?? 0) + 1))
  }
  return { apShare: ad + ap === 0 ? null : Math.round((ap / (ad + ap)) * 100), tags }
}

export const encodeDraft = (d: Draft) => btoa(encodeURIComponent(JSON.stringify(d)))
export function decodeDraft(s: string): Draft | null {
  try { return JSON.parse(decodeURIComponent(atob(s))) } catch { return null }
}
