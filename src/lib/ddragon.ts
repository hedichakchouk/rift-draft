import type { Champion, Spell } from './types'

const BASE = 'https://ddragon.leagueoflegends.com'
let version = ''

export async function loadChampions(): Promise<Champion[]> {
  const versions: string[] = await (await fetch(`${BASE}/api/versions.json`)).json()
  version = versions[0]
  const data = await (await fetch(`${BASE}/cdn/${version}/data/en_US/champion.json`)).json()
  return (Object.values(data.data) as any[])
    .map((c) => ({ id: c.id, key: c.key, name: c.name, tags: c.tags }) as Champion)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export const iconUrl = (id: string) => `${BASE}/cdn/${version}/img/champion/${id}.png`
export const splashUrl = (id: string, num = 0) => `${BASE}/cdn/img/champion/splash/${id}_${num}.jpg`
export const spellUrl = (file: string) => `${BASE}/cdn/${version}/img/spell/${file}`
// Champion select voice line (community dragon). Best-effort: the game falls back if it fails to load.
export const soundUrl = (key: string) =>
  `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-choose-vo/${key}.ogg`

const spellCache = new Map<string, Spell[]>()
export async function loadSpells(id: string): Promise<Spell[]> {
  if (spellCache.has(id)) return spellCache.get(id)!
  const d = await (await fetch(`${BASE}/cdn/${version}/data/en_US/champion/${id}.json`)).json()
  const c = d.data[id]
  const spells: Spell[] = c.spells.map((s: any) => ({ name: s.name, image: s.image.full }))
  spellCache.set(id, spells)
  return spells
}
