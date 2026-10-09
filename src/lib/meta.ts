import type { Lane } from './types'

/** [championId, tier, winRate, pickRate, banRate, games, % of the champion's games in this lane] */
export type TierRow = [string, string, number, number, number, number, number]
export interface MetaIndex { patch: string; updated: string; source: string; tier: Record<Lane, TierRow[]> }
/** [opponentId, our win rate vs them, games] */
export type VsRow = [string, number, number]
export interface Build {
  spells: number[]; spellsWr: number | null
  runes: { pri: number[]; sec: number[]; mod: number[]; wr: number; n: number } | null
  skillPriority: string | null; skillOrder: string | null
  start: { set: number[]; wr: number; n: number } | null
  core: { set: number[]; wr: number; n: number } | null
  item4: [number, number, number][]; item5: [number, number, number][]; item6: [number, number, number][]
}
export interface LaneMeta {
  tier: string | null; wr: number | null; pr: number | null; br: number | null; games: number; pct: number
  build: Build | null; vs: VsRow[]; vsSupport?: VsRow[]; vsBot?: VsRow[]
}
export interface Video { id: string; title: string; channel: string; length: string; age: string; views: string }
export interface ChampMeta { id: string; name: string; key: number; lanes: Partial<Record<Lane, LaneMeta>>; videos?: Video[] }

let indexP: Promise<MetaIndex | null> | null = null
export const loadMetaIndex = () => (indexP ??= fetch('./meta/index.json').then((r) => (r.ok ? r.json() : null)).catch(() => null))

const champP = new Map<string, Promise<ChampMeta | null>>()
export const loadChampMeta = (id: string) => {
  if (!champP.has(id)) champP.set(id, fetch(`./meta/champ/${id}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null))
  return champP.get(id)!
}

export const tierRow = (idx: MetaIndex | null, lane: Lane, id: string) => idx?.tier[lane]?.find((r) => r[0] === id) ?? null

/** Group lolalytics' 15 grades into 4 verdicts. */
export function metaVerdict(tier: string | null | undefined) {
  if (!tier) return { key: 'none', label: 'Rarely played here', tone: 'warn' as const }
  if (tier.startsWith('S')) return { key: 'meta', label: 'Meta pick', tone: 'good' as const }
  if (tier.startsWith('A')) return { key: 'solid', label: 'Solid pick', tone: 'good' as const }
  if (tier.startsWith('B')) return { key: 'ok', label: 'Playable, off-meta', tone: 'warn' as const }
  return { key: 'weak', label: 'Weak this patch', tone: 'bad' as const }
}

export function matchupLabel(wr: number) {
  if (wr >= 54) return { label: 'Favored', tone: 'good' as const }
  if (wr >= 51.5) return { label: 'Slightly favored', tone: 'good' as const }
  if (wr > 48.5) return { label: 'Skill matchup', tone: 'warn' as const }
  if (wr > 46) return { label: 'Tough lane', tone: 'bad' as const }
  return { label: 'Hard counter', tone: 'bad' as const }
}

/** Our win rate vs an opponent, preferring our own matchup table; falls back to the opponent's table. */
export function vsWinRate(me: ChampMeta | null, foe: ChampMeta | null, lane: Lane, table: 'vs' | 'vsSupport' | 'vsBot' = 'vs', foeLane: Lane = lane) {
  const mine = me?.lanes[lane]?.[table]?.find((r) => r[0] === foe?.id)
  if (mine && mine[2] >= 30) return { wr: mine[1], games: mine[2], from: 'us' as const }
  const reverseTable = table === 'vs' ? 'vs' : table === 'vsSupport' ? 'vsBot' : 'vsSupport'
  const theirs = foe?.lanes[foeLane]?.[reverseTable]?.find((r) => r[0] === me?.id)
  if (theirs && theirs[2] >= 30) return { wr: Math.round((100 - theirs[1]) * 100) / 100, games: theirs[2], from: 'them' as const }
  return null
}

/** Champions that do best against `foe` in this lane: lowest win rate for the foe in its matchup table. */
export function counterPicks(foe: ChampMeta | null, lane: Lane, minGames = 120, table: 'vs' | 'vsSupport' | 'vsBot' = 'vs') {
  const rows = foe?.lanes[lane]?.[table] ?? []
  return rows.filter((r) => r[2] >= minGames).map(([id, foeWr, n]) => ({ id, wr: Math.round((100 - foeWr) * 100) / 100, games: n }))
    .sort((a, b) => b.wr - a.wr)
}

export const SKILL = ['', 'Q', 'W', 'E', 'R']
export const skillOrderLetters = (s: string | null) => (s ? s.split('').map((d) => SKILL[Number(d)] ?? '?') : [])
