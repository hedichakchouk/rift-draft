import type { ChampDetail } from './ddragon'
import type { Lane } from './types'

export type Archetype = 'marksman' | 'mage' | 'assassin' | 'bruiser' | 'tank' | 'enchanter'
export const ARCH_LABEL: Record<Archetype, string> = {
  marksman: 'Marksman', mage: 'Mage', assassin: 'Assassin', bruiser: 'Bruiser', tank: 'Tank', enchanter: 'Enchanter',
}

export function archetype(d: ChampDetail, lane: Lane): Archetype {
  const t = d.tags
  if (lane === 'support' && t.includes('Support') && !t.includes('Tank')) return 'enchanter'
  if (t[0] === 'Marksman') return 'marksman'
  if (t[0] === 'Mage') return 'mage'
  if (t[0] === 'Assassin') return 'assassin'
  if (t[0] === 'Tank') return 'tank'
  if (t[0] === 'Fighter') return 'bruiser'
  if (t[0] === 'Support') return t.includes('Tank') ? 'tank' : lane === 'support' ? 'enchanter' : 'mage'
  return 'bruiser'
}

// ---------- stats ----------
const grow = (base: number, per: number, lvl: number) => base + per * (lvl - 1) * (0.7025 + 0.0175 * (lvl - 1))
export function statsAt(d: ChampDetail, lvl: number) {
  const s = d.stats
  return {
    hp: grow(s.hp, s.hpperlevel, lvl),
    mp: grow(s.mp, s.mpperlevel, lvl),
    armor: grow(s.armor, s.armorperlevel, lvl),
    mr: grow(s.spellblock, s.spellblockperlevel, lvl),
    ad: grow(s.attackdamage, s.attackdamageperlevel, lvl),
    as: s.attackspeed * (1 + ((s.attackspeedperlevel / 100) * (lvl - 1) * (0.7025 + 0.0175 * (lvl - 1)))),
    range: s.attackrange,
    ms: s.movespeed,
  }
}
export type StatRow = { key: string; label: string; me: number; foe: number; fmt: (n: number) => string; higherBetter: boolean }
const f0 = (n: number) => String(Math.round(n))
const f2 = (n: number) => n.toFixed(2)
export function compareAt(me: ChampDetail, foe: ChampDetail, lvl: number): StatRow[] {
  const a = statsAt(me, lvl), b = statsAt(foe, lvl)
  const row = (key: string, label: string, fmt = f0, higherBetter = true): StatRow => ({ key, label, me: (a as any)[key], foe: (b as any)[key], fmt, higherBetter })
  return [row('hp', 'Health'), row('armor', 'Armor'), row('mr', 'Magic resist'), row('ad', 'Attack damage'), row('as', 'Attack speed', f2), row('range', 'Range'), row('ms', 'Move speed')]
}

/** Rough "who is stronger in a stand-up fight with no items" ratio (>1 = you). Autos matter less for mages. */
export function fightEdge(me: ChampDetail, foe: ChampDetail, lvl: number): number {
  const a = statsAt(me, lvl), b = statsAt(foe, lvl)
  const dpsW = (c: ChampDetail) => (c.tags[0] === 'Mage' || c.tags[0] === 'Support' ? 0.55 : 1)
  const meVsFoe = a.ad * a.as * dpsW(me) * (100 / (100 + b.armor))
  const foeVsMe = b.ad * b.as * dpsW(foe) * (100 / (100 + a.armor))
  const myTtk = b.hp / Math.max(meVsFoe, 0.1), foeTtk = a.hp / Math.max(foeVsMe, 0.1)
  return foeTtk / myTtk
}
export const edgeLabel = (r: number) =>
  r >= 1.25 ? { tone: 'good' as const, text: 'Clear edge for you' } : r >= 1.08 ? { tone: 'good' as const, text: 'Slight edge for you' }
  : r <= 0.8 ? { tone: 'bad' as const, text: 'Clear edge for them' } : r <= 0.93 ? { tone: 'bad' as const, text: 'Slight edge for them' }
  : { tone: 'warn' as const, text: 'Even' }

// ---------- items ----------
export interface ItemGroup { label: string; note?: string; items: string[] }
export interface PhaseItems { id: string; tab: string; hint: string; groups: ItemGroup[] }

const G = (label: string, items: string[], note?: string): ItemGroup => ({ label, items, note })

const START: Record<Archetype, ItemGroup[]> = {
  marksman: [G('Standard', ["Doran's Blade", 'Health Potion']), G('Vs heavy poke / melee lane', ["Doran's Shield", 'Health Potion']), G('Sustain start', ['Cull'])],
  mage: [G('Standard', ["Doran's Ring", 'Health Potion']), G('Mana-hungry / stacker', ['Tear of the Goddess', 'Health Potion']), G('Vs AP poke', ['Refillable Potion'])],
  assassin: [G('AD assassin', ["Doran's Blade", 'Health Potion']), G('AP assassin', ['Dark Seal', 'Health Potion']), G('Vs poke', ['Refillable Potion'])],
  bruiser: [G('Standard', ["Doran's Blade", 'Health Potion']), G('Vs a tanky / long-range lane', ["Doran's Shield", 'Health Potion']), G('Vs AP poke', ['Refillable Potion'])],
  tank: [G('Standard', ["Doran's Shield", 'Health Potion']), G('Vs AD melee', ['Cloth Armor', 'Health Potion']), G('Vs AP', ['Null-Magic Mantle', 'Health Potion'])],
  enchanter: [G('Support quest item', ['World Atlas', 'Health Potion']), G('Vision', ['Stealth Ward', 'Control Ward'])],
}
const JUNGLE_START = G('Jungle pet (pick by your first clear)', ['Gustwalker Hatchling', 'Mosstomper Seedling', 'Scorchclaw Pup', 'Health Potion'], 'Smite is always one of your two summoner spells.')

const EARLY: PhaseItems['groups'] = [
  G('Sustain', ['Health Potion', 'Refillable Potion'], 'Do not run out of potions before level 3.'),
  G('Vision', ['Stealth Ward', 'Control Ward'], 'Ward your river / tri-bush before level 3 and keep one Control Ward on you.'),
]

const BACK: Record<Archetype, ItemGroup[]> = {
  marksman: [G('Rush a component (1,000-1,300g)', ['Noonquiver', "Caulfield's Warhammer", 'Long Sword', 'Dagger']), G('Boots first?', ['Boots'], 'Only when you are ahead and want to snowball movement.')],
  mage: [G('Rush a component', ['Lost Chapter', 'Blasting Wand', 'Amplifying Tome', 'Sapphire Crystal']), G('Boots first?', ['Boots'])],
  assassin: [G('AD assassin', ['Serrated Dirk', "Caulfield's Warhammer", 'Long Sword']), G('AP assassin', ['Lost Chapter', 'Blasting Wand', 'Amplifying Tome']), G('Boots', ['Boots'])],
  bruiser: [G('Damage + health', ['Phage', "Caulfield's Warhammer", 'Ruby Crystal', 'Long Sword']), G('Tempo', ['Boots'])],
  tank: [G('Rush a component', ["Bami's Cinder", 'Chain Vest', 'Cloth Armor', 'Null-Magic Mantle', 'Ruby Crystal']), G('Boots', ['Boots'])],
  enchanter: [G('Rush a component', ['Kindlegem', 'Aether Wisp', 'Forbidden Idol', 'Faerie Charm']), G('Boots', ['Boots'])],
}

const FIRST: Record<Archetype, ItemGroup[]> = {
  marksman: [G('First completed item', ['Kraken Slayer', 'Immortal Shieldbow', 'Infinity Edge', "Runaan's Hurricane"]), G('Boots', ["Berserker's Greaves"])],
  mage: [G('First completed item', ["Luden's Companion", "Liandry's Torment", "Archangel's Staff", 'Hextech Rocketbelt', 'Shadowflame']), G('Boots', ["Sorcerer's Shoes"])],
  assassin: [G('First completed item', ["Youmuu's Ghostblade", 'Eclipse', 'Hextech Rocketbelt', 'Duskblade of Draktharr']), G('Boots', ['Ionian Boots of Lucidity'])],
  bruiser: [G('First completed item', ['Trinity Force', 'Black Cleaver', 'Sundered Sky', 'Stridebreaker']), G('Boots', ['Plated Steelcaps', "Mercury's Treads"])],
  tank: [G('First completed item', ['Sunfire Aegis', 'Heartsteel', 'Thornmail', "Randuin's Omen", 'Frozen Heart']), G('Boots', ['Plated Steelcaps', "Mercury's Treads"])],
  enchanter: [G('Support item upgrade', ['Celestial Opposition', 'Dream Maker', "Zaz'Zak's Realmspike"]), G('First completed item', ['Moonstone Renewer', 'Staff of Flowing Water', 'Ardent Censer', 'Redemption', 'Imperial Mandate']), G('Boots', ['Ionian Boots of Lucidity'])],
}

const MID: Record<Archetype, ItemGroup[]> = {
  marksman: [G('Core', ['Infinity Edge', 'Phantom Dancer', "Lord Dominik's Regards", "Guardian Angel"])],
  mage: [G('Core', ["Zhonya's Hourglass", "Rabadon's Deathcap", "Void Staff", "Cryptbloom"])],
  assassin: [G('Core', ["Edge of Night", "Serylda's Grudge", "Zhonya's Hourglass", "Voltaic Cyclosword"])],
  bruiser: [G('Core', ['Sterak\'s Gage', "Death's Dance", "Maw of Malmortius", "Guardian Angel"])],
  tank: [G('Core', ['Warmog\'s Armor', "Spirit Visage", "Gargoyle Stoneplate", "Kaenic Rookern"])],
  enchanter: [G('Core', ["Mikael's Blessing", "Knight's Vow", "Redemption", "Shurelya's Battlesong"])],
}
const VS_AD: ItemGroup = G('Because they deal mostly AD', ["Plated Steelcaps", "Frozen Heart", "Randuin's Omen", "Thornmail", "Guardian Angel", "Zhonya's Hourglass"])
const VS_AP: ItemGroup = G('Because they deal mostly AP', ["Mercury's Treads", "Wit's End", "Maw of Malmortius", "Spirit Visage", "Banshee's Veil", "Force of Nature"])

export function itemPhases(me: ChampDetail, foe: ChampDetail, lane: Lane): PhaseItems[] {
  const a = archetype(me, lane)
  const start = [...START[a]]
  if (lane === 'jungle') start.unshift(JUNGLE_START)
  const mid = [...MID[a]]
  if (foe.info.magic >= 7 && foe.info.attack < 7) mid.push(VS_AP)
  else if (foe.info.attack >= 7 && foe.info.magic < 7) mid.push(VS_AD)
  else mid.push(G('Mixed damage', ['Plated Steelcaps', "Mercury's Treads", "Guardian Angel", "Maw of Malmortius"]))
  return [
    { id: 'start', tab: 'Start · Lv 1', hint: `Buy before leaving the fountain (${ARCH_LABEL[a]}${lane === 'jungle' ? ' jungler' : ''}).`, groups: start },
    { id: 'early', tab: 'Early · Lv 2-5', hint: 'Keep sustain topped up and get vision down before the first skirmishes.', groups: EARLY },
    { id: 'spike', tab: 'Spike · Lv 6', hint: 'No new items, but your ultimate changes what the lane looks like. See the notes.', groups: [] },
    { id: 'back', tab: 'First back', hint: 'Recall once you can afford a component (about 1,000-1,300 gold) and have shoved the wave.', groups: BACK[a] },
    { id: 'first', tab: 'First item', hint: 'Around 3,000 gold. Pick based on how the lane is going.', groups: FIRST[a] },
    { id: 'mid', tab: 'Mid game', hint: 'Items 2-4. Adapt to what the enemy team actually deals.', groups: mid },
  ]
}

// ---------- coaching notes ----------
export interface PhaseNotes { id: string; bullets: string[] }
const cd = (s?: { cooldownBurn: string }) => (s ? s.cooldownBurn.split('/')[0] : '?')
const shortestEarly = (d: ChampDetail) => {
  const real = d.spells.slice(0, 3).filter((x) => parseFloat(cd(x)) >= 3)
  return [...(real.length ? real : d.spells.slice(0, 1))].sort((x, y) => parseFloat(cd(x)) - parseFloat(cd(y)))[0]
}

const LANE_GENERIC: Record<Lane, { early: string; spike: string; back: string; mid: string }> = {
  top: {
    early: 'Top is an island: wave control decides the lane. Hold the wave near your tower when behind, push only when you can punish or recall safely. Keep Teleport for a fight, not for a base.',
    spike: 'Watch the enemy jungler: at 6 your lane is the most gankable. Ward the river side before shoving.',
    back: 'Shove the wave first so the recall costs you no CS, then Teleport back if the wave is slow.',
    mid: 'Group for Herald and the first tower, then split with Teleport as a flank. Never push alone without vision.',
  },
  jungle: {
    early: 'Full clear into a gank on the lane that is pushed. Track the enemy jungler and invade only when your laners have priority.',
    spike: 'Level 6 is your first real kill threat on every lane. Pick the lane with CC and a pushed wave.',
    back: 'Reset after a full clear or objective trade, not after an early gank that gave you nothing.',
    mid: 'Own the objective timers: Dragon, Grubs, Herald. Place Control Wards before each objective spawns.',
  },
  mid: {
    early: 'Mid is the shortest lane: farm, then use your wave state for a roam. Shove first, roam second. Keep the side brush warded.',
    spike: 'Level 6 usually decides who has roam priority. Shove, then show up in a side lane with your ultimate.',
    back: 'Recall on a crashed wave. Buy and get back before the next jungler timer.',
    mid: 'Fight around the river after you shove. Your wave priority is what lets the team contest objectives.',
  },
  bot: {
    early: 'You and your support are one unit. Stay behind your minions, trade when their support spends an ability, and keep the wave near your tower until you are level 2 first.',
    spike: 'At 6 the lane becomes a kill lane. Do not step up without your support next to you.',
    back: 'Back with your support to stay together, or one at a time if the wave is crashing.',
    mid: 'Stay with your team for Dragon and give your jungler a reason to be bot. Play for your first two items.',
  },
  support: {
    early: 'Ward the brushes and the river before level 3. Your job is vision, peel and engage windows. Position to hit the enemy support when your ADC is not on cooldown.',
    spike: 'Your level 6 is a team-fight tool: save it for a fight that decides Dragon, not a random skirmish.',
    back: 'Back after the first Dragon timer or when your support item is done. Buy a Control Ward every back.',
    mid: 'Move with your jungler and keep vision for objectives. Roam when your ADC is safe.',
  },
}

export function phaseNotes(me: ChampDetail, foe: ChampDetail, lane: Lane): PhaseNotes[] {
  const a = statsAt(me, 1), b = statsAt(foe, 1)
  const e1 = fightEdge(me, foe, 1), e6 = fightEdge(me, foe, 6), e11 = fightEdge(me, foe, 11)
  const mine = shortestEarly(me), theirs = shortestEarly(foe)
  const g = LANE_GENERIC[lane]
  const early: string[] = []

  const dr = a.range - b.range
  if (dr >= 75) early.push(`You out-range ${foe.name} by ${Math.round(dr)} units: stand at max range, last-hit safely and poke whenever they step up to farm.`)
  else if (dr <= -75) early.push(`${foe.name} out-ranges you by ${Math.round(-dr)} units: stay behind the minion wave and only walk up when their key ability is on cooldown.`)
  else early.push(a.range <= 200 && b.range <= 200 ? `Both of you are melee: control the bush, trade when the enemy walks up to last-hit, and do not take a fight in a wave you are not winning.` : `Similar attack range: whoever controls the wave position gets the free trades.`)

  if (e1 >= 1.08) early.push(`At level 1 your stats beat ${foe.name} (${Math.round((e1 - 1) * 100)}% edge in a stat-only fight). You can threaten a level 1 or level 2 trade.`)
  else if (e1 <= 0.93) early.push(`At level 1 ${foe.name} wins a stand-up fight by about ${Math.round((1 / e1 - 1) * 100)}%. Do not force trades: farm safely and take the level 2 timing only with an ability advantage.`)
  else early.push(`Level 1 stats are about even, so abilities and wave position decide the lane.`)

  if (theirs) early.push(`Their ${theirs.name} has a ${cd(theirs)}s cooldown at rank 1: trade right after they use it, not before.`)
  if (mine) early.push(`Your ${mine.name} comes back every ${cd(mine)}s at rank 1. Plan trades around it.`)
  early.push(g.early)

  const spike: string[] = []
  const r = me.spells[3], fr = foe.spells[3]
  if (r) spike.push(`Your ultimate ${r.name}: ${cd(r)}s cooldown at rank 1${r.rangeBurn && r.rangeBurn !== '0' ? `, range ${r.rangeBurn.split('/')[0]}` : ''}.`)
  if (fr) spike.push(`${foe.name}'s ultimate ${fr.name}: ${cd(fr)}s cooldown. Respect it from level 6 on.`)
  spike.push(e6 >= 1.08 ? `At level 6 the lane tilts toward you (${Math.round((e6 - 1) * 100)}% stat edge): this is your window to push and look for kills.` : e6 <= 0.93 ? `At level 6 they are stronger in a stat fight (${Math.round((1 / e6 - 1) * 100)}%): defend the wave, ward and play for your jungler.` : 'Level 6 is even on stats: ultimates and jungle pressure decide it.')
  spike.push(g.spike)

  const back = [g.back, `Buy your component first, then a Control Ward. If you are behind, a Refillable Potion keeps you in lane.`]
  const scale = e11 / e1
  const mid: string[] = []
  mid.push(scale >= 1.1 ? `You scale better than ${foe.name}: stay alive, farm and let the game go long.` : scale <= 0.9 ? `${foe.name} scales better than you: look for an early lead and snowball it before they get items.` : `Scaling is similar. The player who gets ahead early usually stays ahead.`)
  mid.push(g.mid)

  return [{ id: 'start', bullets: early }, { id: 'early', bullets: early }, { id: 'spike', bullets: spike }, { id: 'back', bullets: back }, { id: 'first', bullets: [`Pick your first item from what the lane is doing. Ahead: damage. Behind: defense or a utility item.`, ...(foe.info.magic >= 7 ? [`${foe.name} deals mostly magic damage: consider early magic resistance if they are ahead.`] : foe.info.attack >= 7 ? [`${foe.name} deals mostly physical damage: consider early armor if they are ahead.`] : [])] }, { id: 'mid', bullets: mid }]
}

// ---------- outside links ----------
const SLUG: Record<string, string> = { MonkeyKing: 'wukong', Renata: 'renata', Nunu: 'nunu', Fiddlesticks: 'fiddlesticks' }
export const slug = (id: string) => SLUG[id] ?? id.toLowerCase()
const UGG: Record<Lane, string> = { top: 'top', jungle: 'jungle', mid: 'mid', bot: 'adc', support: 'supp' }
const LOLA: Record<Lane, string> = { top: 'top', jungle: 'jungle', mid: 'middle', bot: 'bottom', support: 'support' }
const OPGG: Record<Lane, string> = { top: 'top', jungle: 'jungle', mid: 'mid', bot: 'adc', support: 'support' }
export function links(meId: string, foeId: string | null, lane: Lane) {
  const m = slug(meId)
  const out = [
    { label: 'u.gg build', url: `https://u.gg/lol/champions/${m}/build/${UGG[lane]}` },
    { label: 'u.gg counters', url: `https://u.gg/lol/champions/${m}/counter/${UGG[lane]}` },
    { label: 'lolalytics build', url: `https://lolalytics.com/lol/${m}/build/?lane=${LOLA[lane]}` },
    { label: 'lolalytics counters', url: `https://lolalytics.com/lol/${m}/counters/?lane=${LOLA[lane]}` },
    { label: 'op.gg build', url: `https://op.gg/lol/champions/${m}/build/${OPGG[lane]}` },
    { label: 'ProBuildStats', url: `https://probuildstats.com/champion/${meId}` },
  ]
  if (foeId) out.splice(4, 0, { label: `lolalytics ${m} vs ${slug(foeId)}`, url: `https://lolalytics.com/lol/${m}/vs/${slug(foeId)}/build/?lane=${LOLA[lane]}` })
  return out
}
