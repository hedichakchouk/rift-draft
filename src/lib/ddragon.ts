import type { Champion, Spell } from './types'

const BASE = 'https://ddragon.leagueoflegends.com'
let version = ''

export async function loadChampions(): Promise<Champion[]> {
  const versions: string[] = await (await fetch(`${BASE}/api/versions.json`)).json()
  version = versions[0]
  const data = await (await fetch(`${BASE}/cdn/${version}/data/en_US/champion.json`)).json()
  return (Object.values(data.data) as any[])
    .map((c) => ({ id: c.id, key: c.key, name: c.name, tags: c.tags, info: { ...c.info } }) as Champion)
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

// ---------- laning page data ----------
export const itemUrl = (id: string) => `${BASE}/cdn/${version || '16.20.1'}/img/item/${id}.png`
export const passiveUrl = (file: string) => `${BASE}/cdn/${version || '16.20.1'}/img/passive/${file}`

export interface ItemInfo { id: string; name: string; gold: number; plain: string; desc: string; from?: string[] }
let itemsCache: Map<string, ItemInfo> | null = null
/** All purchasable Summoner's Rift items, keyed by lower-case name. */
export async function loadItems(): Promise<Map<string, ItemInfo>> {
  if (itemsCache) return itemsCache
  if (!version) version = (await (await fetch(`${BASE}/api/versions.json`)).json())[0]
  const d = await (await fetch(`${BASE}/cdn/${version}/data/en_US/item.json`)).json()
  const m = new Map<string, ItemInfo>()
  for (const [id, it] of Object.entries<any>(d.data)) {
    if (!it.gold?.purchasable || it.maps?.['11'] === false) continue
    const key = String(it.name).toLowerCase()
    const prev = m.get(key)
    if (prev && prev.gold >= it.gold.total) continue // keep the most expensive variant of duplicate names
    m.set(key, { id, name: it.name, gold: it.gold.total, plain: it.plaintext ?? '', desc: String(it.description ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() })
  }
  return (itemsCache = m)
}

export interface ChampDetail {
  id: string; name: string; title: string; tags: string[]
  stats: Record<string, number>
  info: { attack: number; defense: number; magic: number; difficulty: number }
  spells: { id: string; name: string; description: string; cooldownBurn: string; rangeBurn: string; costBurn: string; image: string }[]
  passive: { name: string; description: string; image: string }
  allytips: string[]; enemytips: string[]
}
const detailCache = new Map<string, ChampDetail>()
export async function loadDetail(id: string): Promise<ChampDetail> {
  if (detailCache.has(id)) return detailCache.get(id)!
  if (!version) version = (await (await fetch(`${BASE}/api/versions.json`)).json())[0]
  const d = (await (await fetch(`${BASE}/cdn/${version}/data/en_US/champion/${id}.json`)).json()).data[id]
  const strip = (s: string) => String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const out: ChampDetail = {
    id, name: d.name, title: d.title, tags: d.tags, stats: d.stats, info: d.info,
    spells: d.spells.map((s: any) => ({ id: s.id, name: s.name, description: strip(s.description), cooldownBurn: s.cooldownBurn, rangeBurn: s.rangeBurn, costBurn: s.costBurn, image: s.image.full })),
    passive: { name: d.passive.name, description: strip(d.passive.description), image: d.passive.image.full },
    allytips: d.allytips ?? [], enemytips: d.enemytips ?? [],
  }
  detailCache.set(id, out)
  return out
}

// ---------- ids -> names/icons for builds ----------
export const ddVersion = () => version || '16.20.1'
export const loadingUrl = (id: string, num = 0) => `${BASE}/cdn/img/champion/loading/${id}_${num}.jpg`
export const profileIconUrl = (id: number) => `${BASE}/cdn/${ddVersion()}/img/profileicon/${id}.png`
export const runeIconUrl = (path: string) => `${BASE}/cdn/img/${path}`
export const summonerIconUrl = (file: string) => `${BASE}/cdn/${ddVersion()}/img/spell/${file}`
/** Riot's official ability preview clips (P, Q, W, E, R). */
export const abilityClip = (key: string | number, slot: 'P' | 'Q' | 'W' | 'E' | 'R', ext: 'webm' | 'mp4') => {
  const k = String(key).padStart(4, '0')
  return `https://d28xe8vt774jo5.cloudfront.net/champion-abilities/${k}/ability_${k}_${slot}1.${ext}`
}

let itemsById: Map<string, ItemInfo> | null = null
export async function loadItemsById(): Promise<Map<string, ItemInfo>> {
  if (itemsById) return itemsById
  if (!version) version = (await (await fetch(`${BASE}/api/versions.json`)).json())[0]
  const d = await (await fetch(`${BASE}/cdn/${version}/data/en_US/item.json`)).json()
  const m = new Map<string, ItemInfo>()
  for (const [id, it] of Object.entries<any>(d.data))
    m.set(id, { id, name: it.name, gold: it.gold?.total ?? 0, plain: it.plaintext ?? '', desc: String(it.description ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), from: it.from ?? [] })
  return (itemsById = m)
}

export interface RuneInfo { id: number; name: string; icon: string; tree: string; desc: string }
let runeCache: Map<number, RuneInfo> | null = null
const SHARDS: Record<number, [string, string]> = {
  5008: ['Adaptive Force', 'perk-images/StatMods/StatModsAdaptiveForceIcon.png'],
  5005: ['Attack Speed', 'perk-images/StatMods/StatModsAttackSpeedIcon.png'],
  5007: ['Ability Haste', 'perk-images/StatMods/StatModsCDRScalingIcon.png'],
  5010: ['Move Speed', 'perk-images/StatMods/StatModsMovementSpeedIcon.png'],
  5001: ['Health Scaling', 'perk-images/StatMods/StatModsHealthPlusIcon.png'],
  5011: ['Health', 'perk-images/StatMods/StatModsHealthScalingIcon.png'],
  5013: ['Tenacity and Slow Resist', 'perk-images/StatMods/StatModsTenacityIcon.png'],
  5002: ['Armor', 'perk-images/StatMods/StatModsArmorIcon.png'],
  5003: ['Magic Resist', 'perk-images/StatMods/StatModsMagicResIcon.MagicResist_Fix.png'],
}
export async function loadRunes(): Promise<Map<number, RuneInfo>> {
  if (runeCache) return runeCache
  if (!version) version = (await (await fetch(`${BASE}/api/versions.json`)).json())[0]
  const trees = await (await fetch(`${BASE}/cdn/${version}/data/en_US/runesReforged.json`)).json()
  const m = new Map<number, RuneInfo>()
  for (const t of trees) {
    m.set(t.id, { id: t.id, name: t.name, icon: t.icon, tree: t.name, desc: '' })
    for (const slot of t.slots) for (const r of slot.runes)
      m.set(r.id, { id: r.id, name: r.name, icon: r.icon, tree: t.name, desc: String(r.shortDesc ?? '').replace(/<[^>]+>/g, '') })
  }
  for (const [id, [name, icon]] of Object.entries(SHARDS)) m.set(Number(id), { id: Number(id), name, icon, tree: 'Shards', desc: '' })
  return (runeCache = m)
}

export interface SummonerInfo { key: number; name: string; image: string; desc: string }
let sumCache: Map<number, SummonerInfo> | null = null
export async function loadSummoners(): Promise<Map<number, SummonerInfo>> {
  if (sumCache) return sumCache
  if (!version) version = (await (await fetch(`${BASE}/api/versions.json`)).json())[0]
  const d = await (await fetch(`${BASE}/cdn/${version}/data/en_US/summoner.json`)).json()
  const m = new Map<number, SummonerInfo>()
  for (const s of Object.values<any>(d.data)) m.set(Number(s.key), { key: Number(s.key), name: s.name, image: s.image.full, desc: s.description })
  return (sumCache = m)
}

export interface Skin { num: number; name: string }
const skinCache = new Map<string, Skin[]>()
/** Skins of a champion (num 0 is the default skin, named "default"). */
export async function loadSkins(id: string): Promise<Skin[]> {
  if (skinCache.has(id)) return skinCache.get(id)!
  if (!version) version = (await (await fetch(`${BASE}/api/versions.json`)).json())[0]
  const d = (await (await fetch(`${BASE}/cdn/${version}/data/en_US/champion/${id}.json`)).json()).data[id]
  const out: Skin[] = d.skins.map((s: { num: number; name: string }) => ({ num: s.num, name: s.num === 0 ? d.name : s.name }))
  skinCache.set(id, out)
  return out
}
