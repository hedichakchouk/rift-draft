export type Tier = 'S' | 'A' | 'B' | 'C' | 'D'
export type Lane = 'top' | 'jungle' | 'mid' | 'bot' | 'support'
export const LANES: Lane[] = ['top', 'jungle', 'mid', 'bot', 'support']
export const LANE_LABEL: Record<Lane, string> = {
  top: 'Top', jungle: 'Jungle', mid: 'Mid', bot: 'Bot (ADC)', support: 'Support',
}
export const TIERS: Tier[] = ['S', 'A', 'B', 'C', 'D']
export const TIER_SCORE: Record<Tier, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 }

export interface ChampEntry { id: string; tier: Tier }
export interface Player {
  name: string
  tier: Tier
  lanes: Partial<Record<Lane, Tier>>
  champions: ChampEntry[]
  notes?: string
}
export interface Champion {
  id: string      // Data Dragon id, e.g. "MissFortune"
  key: string     // numeric key, e.g. "21"
  name: string    // display name
  tags: string[]
}
export interface Spell { name: string; image: string }
