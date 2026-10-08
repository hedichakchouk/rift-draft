import { LANES, TIER_SCORE, type Lane, type Player } from './types'

export interface Slot { player: string | null; champ: string | null }
export type Draft = Record<Lane, Slot>
export const emptyDraft = (): Draft =>
  Object.fromEntries(LANES.map((l) => [l, { player: null, champ: null }])) as Draft

const laneScore = (p: Player, l: Lane) => (p.lanes[l] ? TIER_SCORE[p.lanes[l]!] : 0)

/** Best assignment of players to the 5 lanes (brute force; fine for a friend-group sized roster). */
export function autoAssign(players: Player[]): Record<Lane, string | null> {
  const best = { score: -1, pick: [] as (string | null)[] }
  const used = new Set<number>()
  const cur: (number | null)[] = []
  const rec = (i: number, score: number) => {
    if (i === LANES.length) {
      if (score > best.score) {
        best.score = score
        best.pick = cur.map((x) => (x === null ? null : players[x].name))
      }
      return
    }
    let any = false
    for (let p = 0; p < players.length; p++) {
      if (used.has(p)) continue
      any = true
      used.add(p); cur[i] = p
      rec(i + 1, score + laneScore(players[p], LANES[i]))
      used.delete(p)
    }
    if (!any || players.length < LANES.length) { cur[i] = null; rec(i + 1, score) }
  }
  rec(0, 0)
  return Object.fromEntries(LANES.map((l, i) => [l, best.pick[i] ?? null])) as Record<Lane, string | null>
}

export const encodeDraft = (d: Draft) => btoa(encodeURIComponent(JSON.stringify(d)))
export function decodeDraft(s: string): Draft | null {
  try { return JSON.parse(decodeURIComponent(atob(s))) } catch { return null }
}
