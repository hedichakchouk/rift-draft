export type Tier = 'Z' | 'S' | 'A' | 'B' | 'C' | 'D'
export type Lane = 'top' | 'jungle' | 'mid' | 'bot' | 'support'
export const LANES: Lane[] = ['top', 'jungle', 'mid', 'bot', 'support']
export const LANE_LABEL: Record<Lane, string> = {
  top: 'Top', jungle: 'Jungle', mid: 'Mid', bot: 'Bot (ADC)', support: 'Support',
}
export const TIERS: Tier[] = ['Z', 'S', 'A', 'B', 'C', 'D']
export const TIER_SCORE: Record<Tier, number> = { Z: 6, S: 5, A: 4, B: 3, C: 2, D: 1 }
export const TIER_HINT: Record<Tier, string> = {
  Z: 'Blind pick / best performance', S: 'Confident', A: 'Decent', B: 'Can play but rather not', C: '', D: '',
}

export interface ChampEntry { id: string; tier: Tier }
export interface Player {
  name: string
  lane: Lane                              // main lane
  flexLanes?: Partial<Record<Lane, Tier>> // optional: other lanes they can play
  champions: ChampEntry[]
  notes?: string
}
export interface Champion {
  id: string      // Data Dragon id, e.g. "MissFortune"
  key: string     // numeric key, e.g. "21"
  name: string    // display name
  tags: string[]
  info: { attack: number; defense: number; magic: number }
}
export interface Spell { name: string; image: string }

export const LANE_SHORT: Record<Lane, string> = { top: 'TOP', jungle: 'JGL', mid: 'MID', bot: 'BOT', support: 'SUP' }
