import { useEffect, useMemo, useState } from 'react'
import { LANES, LANE_LABEL, type Champion, type Lane } from '../lib/types'
import { iconUrl } from '../lib/ddragon'
import { loadMetaIndex, type MetaIndex, type TierRow } from '../lib/meta'
import type { Stats } from '../lib/stats'
import { LaneIcon, Seg, rankCrestUrl } from './ui/kit'

interface Region { id: string; label: string; opgg: string; ugg: string; log: string }
const REGIONS: Region[] = [
  { id: 'euw', label: 'EUW', opgg: 'euw', ugg: 'euw1', log: 'euw' },
  { id: 'eune', label: 'EUNE', opgg: 'eune', ugg: 'eun1', log: 'eune' },
  { id: 'na', label: 'NA', opgg: 'na', ugg: 'na1', log: 'na' },
  { id: 'kr', label: 'KR', opgg: 'kr', ugg: 'kr', log: 'kr' },
  { id: 'br', label: 'BR', opgg: 'br', ugg: 'br1', log: 'br' },
  { id: 'lan', label: 'LAN', opgg: 'lan', ugg: 'la1', log: 'lan' },
  { id: 'las', label: 'LAS', opgg: 'las', ugg: 'la2', log: 'las' },
  { id: 'oce', label: 'OCE', opgg: 'oce', ugg: 'oc1', log: 'oce' },
  { id: 'tr', label: 'TR', opgg: 'tr', ugg: 'tr1', log: 'tr' },
  { id: 'jp', label: 'JP', opgg: 'jp', ugg: 'jp1', log: 'jp' },
  { id: 'ru', label: 'RU', opgg: 'ru', ugg: 'ru', log: 'ru' },
]
const STORE = 'hd-account-v1'
const LANE_URL: Record<Lane, string> = { top: 'top', jungle: 'jungle', mid: 'middle', bot: 'bottom', support: 'support' }
const TIERS: { id: string; name: string; text: string }[] = [
  { id: 'iron', name: 'Iron', text: 'Just starting. Learn last hitting and basic map awareness.' },
  { id: 'bronze', name: 'Bronze', text: 'Fundamentals: farm, stay alive, respect the minimap.' },
  { id: 'silver', name: 'Silver', text: 'Most players sit around here. Fewer deaths wins games.' },
  { id: 'gold', name: 'Gold', text: 'Solid basics. Objectives and wave control start to matter.' },
  { id: 'platinum', name: 'Platinum', text: 'Good mechanics. Macro and vision decide games.' },
  { id: 'emerald', name: 'Emerald', text: 'Strong players. Mistakes get punished fast.' },
  { id: 'diamond', name: 'Diamond', text: 'Top few percent. Consistent play and team coordination.' },
  { id: 'master', name: 'Master', text: 'No divisions any more, only LP.' },
  { id: 'grandmaster', name: 'Grandmaster', text: 'The top of each region by LP.' },
  { id: 'challenger', name: 'Challenger', text: 'The very best players in the region.' },
]
const STAT_HELP: { name: string; text: string }[] = [
  { name: 'Win rate', text: '50% is average. Staying around 52-55% over many games means you are climbing.' },
  { name: 'KDA', text: '(Kills + Assists) / Deaths. Above 3 is good. Dying less matters more than killing more.' },
  { name: 'CS per minute', text: 'Minions killed per minute. About 6 is decent for laners, 8 or more is strong.' },
  { name: 'Vision score', text: 'How much of the map you light up with wards. Around 1 per minute is a good target, supports aim higher.' },
  { name: 'Kill participation', text: 'Share of your team kills you took part in. 50-70% shows you join the fights that matter.' },
  { name: 'LP', text: 'League Points. You need 100 LP to move up a division. Wins give roughly 15-25 LP, losses take about the same.' },
]

const parseId = (raw: string) => {
  const t = raw.trim()
  const i = t.lastIndexOf('#')
  if (i < 1) return null
  const name = t.slice(0, i).trim(), tag = t.slice(i + 1).trim().replace(/^#/, '')
  return name && /^[A-Za-z0-9]{2,5}$/.test(tag) ? { name, tag } : null
}
const readStore = (): { riot: string; region: string } => { try { return JSON.parse(localStorage.getItem(STORE) ?? '') } catch { return { riot: '', region: 'euw' } } }

interface Props { champs: Champion[]; byId: Map<string, Champion>; stats: Stats | null }

export default function Account({ byId, stats }: Props) {
  const init = useMemo(readStore, [])
  const [riot, setRiot] = useState(init.riot ?? '')
  const [region, setRegion] = useState(init.region ?? 'euw')
  const [shown, setShown] = useState<{ name: string; tag: string; region: Region } | null>(null)
  const [err, setErr] = useState('')
  const [lane, setLane] = useState<Lane>('mid')
  const [idx, setIdx] = useState<MetaIndex | null>(null)
  useEffect(() => { loadMetaIndex().then(setIdx) }, [])

  const reg = REGIONS.find((r) => r.id === region) ?? REGIONS[0]
  const go = (raw = riot, rg = reg) => {
    const p = parseId(raw)
    if (!p) { setErr('Enter your Riot ID like Name#TAG, for example hach#1710.'); return }
    setErr(''); setShown({ ...p, region: rg })
    try { localStorage.setItem(STORE, JSON.stringify({ riot: raw.trim(), region: rg.id })) } catch { /* ignore */ }
  }
  const squad = stats ? Object.entries(stats.players).map(([n, p]) => ({ name: n, riotId: p.riotId })) : []

  const picks = useMemo(() => {
    const rows = (idx?.tier[lane] ?? []).filter((r) => r[5] >= 1500 && r[6] >= 25)
    const good = (r: TierRow) => r[1].startsWith('S') || r[1].startsWith('A')
    return {
      climb: [...rows].filter(good).sort((a, b) => b[2] - a[2]).slice(0, 6),
      easy: [...rows].filter((r) => good(r) && (byId.get(r[0])?.info.difficulty ?? 10) <= 4).sort((a, b) => b[2] - a[2]).slice(0, 6),
      popular: [...rows].sort((a, b) => b[3] - a[3]).slice(0, 6),
    }
  }, [idx, lane, byId])

  const enc = (s: string) => encodeURIComponent(s)
  const links = shown ? [
    { label: 'op.gg', sub: 'Rank, match history, champion stats', url: `https://op.gg/lol/summoners/${shown.region.opgg}/${enc(shown.name)}-${enc(shown.tag)}` },
    { label: 'u.gg', sub: 'Rank, builds and performance', url: `https://u.gg/lol/profile/${shown.region.ugg}/${enc(shown.name)}-${enc(shown.tag)}/overview` },
    { label: 'League of Graphs', sub: 'Rank history and win rate trends', url: `https://www.leagueofgraphs.com/summoner/${shown.region.log}/${enc(shown.name)}-${enc(shown.tag)}` },
    { label: 'Porofessor', sub: 'Live game: enemies and their ranks', url: `https://porofessor.gg/live/${shown.region.log}/${enc(shown.name)}-${enc(shown.tag)}` },
  ] : []

  const PickCard = ({ r }: { r: TierRow }) => (
    <a className="acc-pick" href={`https://lolalytics.com/lol/${r[0].toLowerCase()}/build/?lane=${LANE_URL[lane]}`} target="_blank" rel="noreferrer" title="Open the full build on lolalytics">
      <img src={iconUrl(r[0])} alt="" loading="lazy" />
      <span className="acc-pn"><b>{byId.get(r[0])?.name ?? r[0]}</b><small>{r[1]} tier</small></span>
      <span className="acc-pw"><b>{r[2].toFixed(1)}%</b><small>win · {r[3].toFixed(1)}% pick</small></span>
    </a>
  )

  return (
    <div className="tier-page acc">
      <section className="card">
        <div className="card-head"><div><h2>Your League account</h2><p className="sub">Type your Riot ID to open your rank, stats and match history, and get picks that suit your role.</p></div></div>
        <div className="acc-form">
          <input className="search" placeholder="Riot ID, like Name#TAG" value={riot} onChange={(e) => setRiot(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} autoComplete="off" spellCheck={false} aria-label="Riot ID" />
          <select className="acc-region" value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Region">{REGIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select>
          <button className="btn gold" onClick={() => go()}>Look me up</button>
        </div>
        {err && <p className="err">{err}</p>}
        {squad.length > 0 && (
          <div className="acc-squad"><span className="sub">Or try one of the squad:</span>
            {squad.map((s) => <button key={s.name} className="btn" onClick={() => { setRiot(s.riotId); setRegion('euw'); go(s.riotId, REGIONS[0]) }}>{s.name}</button>)}
          </div>
        )}
        {shown && (
          <div className="acc-profile">
            <div className="acc-who"><span className="acc-av">{shown.name[0]?.toUpperCase()}</span><div><h3>{shown.name}<span className="acc-tag">#{shown.tag}</span></h3><small>{shown.region.label} server</small></div></div>
            <div className="acc-links">
              {links.map((l) => <a key={l.label} className="acc-link" href={l.url} target="_blank" rel="noreferrer"><b>{l.label} ↗</b><small>{l.sub}</small></a>)}
            </div>
            <p className="sub">Your rank and match data live on these sites. Hach Draft does not store your account. Last played game not showing? Press "Update" on the site you open.</p>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-head"><div><h2>Best picks for your role</h2><p className="sub">{idx ? `Patch ${idx.patch} data from lolalytics (Emerald+). Tap a champion to open its build.` : 'Loading the latest patch data...'}</p></div>
          <Seg value={lane} onChange={setLane} size="sm" options={LANES.map((l) => ({ id: l, label: LANE_LABEL[l], icon: <LaneIcon lane={l} size={16} /> }))} /></div>
        {[['Best to climb', 'Highest win rates in S and A tier', picks.climb], ['Easy to learn', 'Simple champions that are still strong', picks.easy], ['Most popular', 'What everyone is playing right now', picks.popular]].map(([t, d, rows]) => (
          <div key={t as string} className="acc-group">
            <h4>{t as string}<small> {d as string}</small></h4>
            {(rows as TierRow[]).length ? <div className="acc-picks">{(rows as TierRow[]).map((r) => <PickCard key={r[0]} r={r} />)}</div> : <p className="sub">Not enough data yet.</p>}
          </div>
        ))}
      </section>

      <section className="card">
        <div className="card-head"><div><h2>Ranks explained</h2><p className="sub">Iron to Diamond have four divisions each (IV is lowest, I is highest). From Master up there are no divisions, only LP.</p></div></div>
        <div className="acc-tiers">
          {TIERS.map((t) => <div key={t.id} className="acc-tier"><img src={rankCrestUrl(t.id)} alt="" width={44} height={44} loading="lazy" /><div><b>{t.name}</b><small>{t.text}</small></div></div>)}
        </div>
      </section>

      <section className="card">
        <div className="card-head"><div><h2>What the stats mean</h2><p className="sub">So you know what to look at on your profile.</p></div></div>
        <div className="acc-stats">
          {STAT_HELP.map((s) => <div key={s.name} className="acc-stat"><b>{s.name}</b><p>{s.text}</p></div>)}
        </div>
      </section>
    </div>
  )
}
