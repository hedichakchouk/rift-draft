export interface RankInfo { tier: string; division: string; lp: number; wins: number; losses: number }
export interface ChampStat { games: number; wins: number; kills: number; deaths: number; assists: number; cs: number; minutes: number }
export interface PlayerStats {
  riotId: string
  level: number | null
  solo: RankInfo | null
  flex: RankInfo | null
  games: number
  wins: number
  lanes: Record<string, number>
  champions: Record<string, ChampStat>
  mastery: { id: string; level: number; points: number }[]
}
export interface Stats { updated: string | null; patch?: string; players: Record<string, PlayerStats> }

export async function loadStats(): Promise<Stats | null> {
  try {
    const r = await fetch(`./stats.json?t=${Math.floor(Date.now() / 600000)}`)
    if (!r.ok) return null
    const s: Stats = await r.json()
    return s.updated ? s : null
  } catch { return null }
}

const APEX = new Set(['MASTER', 'GRANDMASTER', 'CHALLENGER'])
export const rankLabel = (r: RankInfo | null | undefined) =>
  !r ? 'Unranked' : APEX.has(r.tier) ? `${cap(r.tier)} ${r.lp} LP` : `${cap(r.tier)} ${r.division}`
const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase()
export const bestRank = (p?: PlayerStats) => p?.solo ?? p?.flex ?? null
export const winrate = (c?: { games: number; wins: number }) => (c && c.games ? Math.round((c.wins / c.games) * 100) : null)
export const kda = (c: ChampStat) => (c.deaths === 0 ? c.kills + c.assists : +((c.kills + c.assists) / c.deaths).toFixed(1))
