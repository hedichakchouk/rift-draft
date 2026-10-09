import { useEffect, useMemo, useState } from 'react'
import Avatar from '../Avatar'
import { loadDetail, type ChampDetail } from '../../lib/ddragon'
import { fightEdge } from '../../lib/laning'
import { loadChampMeta, loadMetaIndex, tierRow, vsWinRate, type ChampMeta, type MetaIndex } from '../../lib/meta'
import { setCoachContext, useVisitor } from '../../lib/profile'
import type { Stats } from '../../lib/stats'
import { winrate } from '../../lib/stats'
import { LANE_LABEL, TIERS, type Champion, type Lane, type Player, type Tier } from '../../lib/types'
import { LaneIcon, Seg } from '../ui/kit'
import BuildPanel from './BuildPanel'
import DeepDive from './DeepDive'
import { DuoHero, MatchupHero } from './Hero'
import MetaCheck from './MetaCheck'
import PhasePlan from './PhasePlan'
import { ChampSlot, type QuickGroup } from './Pickers'
import Videos from './Videos'

interface Props { players: Player[]; champs: Champion[]; byId: Map<string, Champion>; stats: Stats | null }
type Mode = 'chabeb' | 'open'
type View = 'top' | 'jungle' | 'mid' | 'bot'
const VIEWS: View[] = ['top', 'jungle', 'mid', 'bot']
const ROLE_TO_VIEW: Record<string, View> = { TOP: 'top', JUNGLE: 'jungle', MIDDLE: 'mid', BOTTOM: 'bot', UTILITY: 'bot' }

function useMeta(id: string | null) {
  const [m, setM] = useState<ChampMeta | null>(null)
  useEffect(() => { let live = true; setM(null); if (id) loadChampMeta(id).then((x) => live && setM(x)); return () => { live = false } }, [id])
  return m
}
function useDetail(id: string | null) {
  const [d, setD] = useState<ChampDetail | null>(null)
  useEffect(() => { let live = true; if (!id) { setD(null); return } loadDetail(id).then((x) => live && setD(x)).catch(() => {}); return () => { live = false } }, [id])
  return d && d.id === id ? d : null
}

function readHash() {
  const q = new URLSearchParams(location.hash.split('?')[1] ?? '')
  const v = q.get('l') as View | null
  return {
    mode: (q.get('mode') as Mode) || null, view: v && VIEWS.includes(v) ? v : null, player: q.get('p'),
    me: q.get('m'), foe: q.get('e'), ally: q.get('a'), foeSup: q.get('s'),
  }
}

export default function Laning({ players, champs, byId, stats }: Props) {
  const init = useMemo(readHash, [])
  const visitor = useVisitor()
  const squadMatch = visitor && players.find((p) => p.riotId?.toLowerCase() === `${visitor.name}#${visitor.tag}`.toLowerCase())
  const [mode, setMode] = useState<Mode>(init.mode ?? (visitor && !squadMatch ? 'open' : 'chabeb'))
  const [view, setView] = useState<View>(init.view ?? (squadMatch ? (squadMatch.lane === 'support' ? 'bot' : squadMatch.lane as View) : (visitor?.data?.recent.mainRole && ROLE_TO_VIEW[visitor.data.recent.mainRole]) || 'mid'))
  const [player, setPlayer] = useState<string | null>(init.player ?? squadMatch?.name ?? null)
  const [me, setMe] = useState<string | null>(init.me)
  const [foe, setFoe] = useState<string | null>(init.foe)
  const [ally, setAlly] = useState<string | null>(init.ally)
  const [foeSup, setFoeSup] = useState<string | null>(init.foeSup)
  const [idx, setIdx] = useState<MetaIndex | null>(null)
  const [persp, setPersp] = useState<'adc' | 'sup'>('adc')
  useEffect(() => { loadMetaIndex().then(setIdx) }, [])

  const duo = view === 'bot'
  const lane: Lane = view === 'bot' ? 'bot' : view

  // ---- squad (Chabeb) ----
  const groups = useMemo(() => (['top', 'jungle', 'mid', 'bot', 'support'] as Lane[]).map((l) => players.filter((p) => p.lane === l)).filter((g) => g.length), [players])
  const [botPick, setBotPick] = useState<string>(players.find((p) => p.lane === 'bot')?.name ?? '')
  const playerFor = (l: Lane) => (l === 'bot' ? players.find((p) => p.name === botPick) : players.find((p) => p.lane === l)) ?? null
  const squadMe = mode === 'chabeb' ? playerFor(lane) : null
  const squadSup = mode === 'chabeb' && duo ? playerFor('support') : null
  useEffect(() => {
    if (mode !== 'chabeb' || !player) return
    const p = players.find((x) => x.name === player)
    if (!p) return
    if (p.lane === 'bot') setBotPick(p.name)
    const v: View = p.lane === 'support' ? 'bot' : (p.lane as View)
    setView(v)
    if (p.lane === 'support') setPersp('sup'); else if (p.lane === 'bot') setPersp('adc')
  }, [player, mode, players])

  useEffect(() => {
    const q = new URLSearchParams({ mode, l: view })
    if (player && mode === 'chabeb') q.set('p', player)
    if (me) q.set('m', me); if (foe) q.set('e', foe); if (duo && ally) q.set('a', ally); if (duo && foeSup) q.set('s', foeSup)
    history.replaceState(null, '', `#laning?${q}`)
  }, [mode, view, player, me, foe, ally, foeSup, duo])

  const switchView = (v: View) => { setView(v); setMe(null); setFoe(null); setAlly(null); setFoeSup(null) }

  // ---- data ----
  const meMeta = useMeta(me), foeMeta = useMeta(foe), allyMeta = useMeta(duo ? ally : null), foeSupMeta = useMeta(duo ? foeSup : null)
  const meD = useDetail(me), foeD = useDetail(foe), allyD = useDetail(duo ? ally : null), foeSupD = useDetail(duo ? foeSup : null)
  const tierOf = (l: Lane) => (id: string) => tierRow(idx, l, id)?.[1] ?? null

  // ---- quick pick lists ----
  const visitorIds = useMemo(() => {
    const d = visitor?.data
    if (!d) return [] as string[]
    const keyTo = new Map(champs.map((c) => [Number(c.key), c.id]))
    const ids = [...d.recent.champions.map((c) => keyTo.get(c.key)), ...d.mastery.map((m) => keyTo.get(m.key))].filter(Boolean) as string[]
    return [...new Set(ids)]
  }, [visitor, champs])
  const poolQuick = (p: Player | null, l: Lane): QuickGroup[] => {
    if (!p) return []
    const ps = stats?.players[p.name]
    const items = TIERS.flatMap((t) => p.champions.filter((c) => c.tier === t)).map((c) => {
      const w = winrate(ps?.champions[c.id])
      return { id: c.id, badge: <i className={`badge t-${c.tier}`}>{c.tier}</i>, sub: `${p.name}: ${c.tier}${w != null ? ` · ${w}% (${ps!.champions[c.id].games}g)` : ''} · meta ${tierRow(idx, l, c.id)?.[1] ?? '—'}` }
    })
    return [{ title: <><Avatar name={p.name} size={18} /> {p.name}'s pool</>, items }]
  }
  const metaQuick = (l: Lane, n = 12): QuickGroup => ({
    title: <>Meta picks · {LANE_LABEL[l]}</>,
    items: (idx?.tier[l] ?? []).filter((r) => r[6] >= 30).slice(0, n).map((r) => ({ id: r[0], badge: <i className={`mbadge mt-${r[1][0]}`}>{r[1]}</i>, sub: `${r[1]} · ${r[2]}% WR` })),
  })
  const popularQuick = (l: Lane, n = 14): QuickGroup => ({
    title: <>Most picked · {LANE_LABEL[l]}</>,
    items: [...(idx?.tier[l] ?? [])].filter((r) => r[6] >= 30).sort((a, b) => b[3] - a[3]).slice(0, n).map((r) => ({ id: r[0], sub: `${r[3]}% pick` })),
  })
  const visitorQuick = (l: Lane): QuickGroup[] => {
    const ids = visitorIds.filter((id) => (tierRow(idx, l, id)?.[6] ?? 0) >= 5).slice(0, 10)
    return ids.length ? [{ title: <>Your champions</>, items: ids.map((id) => ({ id, badge: <i className="mbadge mt-you">you</i> })) }] : []
  }
  const myQuick = (l: Lane, p: Player | null) => (mode === 'chabeb' ? [...poolQuick(p, l), metaQuick(l, 8)] : [...visitorQuick(l), metaQuick(l)])

  // ---- results ----
  const solo = !duo && meD && foeD && byId.get(me!) && byId.get(foe!)
  const duoReady = duo && !!meD && !!foeD && !!byId.get(me!) && !!byId.get(foe!) && (!ally || !!byId.get(ally)) && (!foeSup || !!byId.get(foeSup))
  const pairs = duoReady && me && foe ? [
    { a: byId.get(me)!, b: byId.get(foe)!, label: 'ADC vs ADC', wr: vsWinRate(meMeta, foeMeta, 'bot') },
    ...(ally && foeSup ? [{ a: byId.get(ally)!, b: byId.get(foeSup)!, label: 'Support vs Support', wr: vsWinRate(allyMeta, foeSupMeta, 'support') }] : []),
    ...(foeSup ? [{ a: byId.get(me)!, b: byId.get(foeSup)!, label: 'Your ADC vs their Support', wr: vsWinRate(meMeta, foeSupMeta, 'bot', 'vsSupport', 'support') }] : []),
    ...(ally ? [{ a: byId.get(ally)!, b: byId.get(foe)!, label: 'Your Support vs their ADC', wr: vsWinRate(allyMeta, foeMeta, 'support', 'vsBot', 'bot') }] : []),
  ].filter((p) => p.a && p.b) : []

  const soloWr = solo ? vsWinRate(meMeta, foeMeta, lane) : null
  // perspective for the plan/build/videos in a 2v2
  const pMe = duo && persp === 'sup' && allyD ? allyD : meD
  const pFoe = duo && persp === 'sup' && foeSupD ? foeSupD : foeD
  const pLane: Lane = duo && persp === 'sup' && allyD ? 'support' : lane
  const pMeta = duo && persp === 'sup' && allyD ? allyMeta : meMeta
  const ready = solo || duoReady
  const poolOf = (p: Player | null | undefined) => p?.champions.map((c) => ({ id: c.id, tier: c.tier as Tier }))
  const soloPool = useMemo(() => poolOf(squadMe), [squadMe])
  const adcPool = useMemo(() => (mode === 'chabeb' ? poolOf(playerFor('bot')) : undefined), [mode, botPick, players]) // eslint-disable-line
  const supPool = useMemo(() => (mode === 'chabeb' ? poolOf(playerFor('support')) : undefined), [mode, players]) // eslint-disable-line

  // ---- tell the coach what is on screen ----
  useEffect(() => {
    const n = (id: string | null) => (id ? byId.get(id)?.name ?? id : '?')
    const parts = [`Page: Laning (${mode === 'chabeb' ? `Chabeb squad mode${squadMe ? `, player ${squadMe.name}` : ''}` : 'open mode'}), lane ${LANE_LABEL[lane]}${duo ? ' 2v2' : ''}, patch ${idx?.patch ?? '?'}.`]
    if (me) parts.push(`You: ${n(me)} (lolalytics tier ${tierRow(idx, lane, me)?.[1] ?? '?'}, ${tierRow(idx, lane, me)?.[2] ?? '?'}% WR).`)
    if (duo && ally) parts.push(`Your support: ${n(ally)} (tier ${tierRow(idx, 'support', ally)?.[1] ?? '?'}).`)
    if (foe) parts.push(`Enemy: ${n(foe)} (tier ${tierRow(idx, lane, foe)?.[1] ?? '?'}).`)
    if (duo && foeSup) parts.push(`Enemy support: ${n(foeSup)}.`)
    if (soloWr) parts.push(`Matchup win rate for you: ${soloWr.wr}% over ${soloWr.games} games (Emerald+).`)
    pairs.forEach((p) => p.wr && parts.push(`${p.label} (${p.a.name} vs ${p.b.name}): ${p.wr.wr}% over ${p.wr.games} games.`))
    const b = pMeta?.lanes[pLane]?.build
    if (b) parts.push(`Most-picked build for ${pMe?.name}: runes ${b.runes?.pri.join('/')}, skill priority ${b.skillPriority}, start items ${b.start?.set.join(',')}, core ${b.core?.set.join(',')} (Riot item ids).`)
    setCoachContext(parts.join(' '))
  }, [mode, lane, duo, me, foe, ally, foeSup, idx, soloWr, pairs.length, pMeta, pLane, pMe, byId, squadMe])

  return (
    <div className="laning2">
      <section className="card lane-top">
        <div className="lt-head">
          <div>
            <h2>Laning phase</h2>
            <p className="sub">Real matchup win rates, the meta check, the build and a phase-by-phase plan for your lane.</p>
          </div>
          <Seg size="lg" value={mode} onChange={(m) => setMode(m)} options={[
            { id: 'chabeb', label: 'Chabeb', title: 'The squad: Bullet, Aster, Hama, Omar / Rapo, Hach' },
            { id: 'open', label: 'Any player', title: 'For anyone: pick your lane and champion' },
          ]} />
        </div>

        {mode === 'chabeb' ? (
          <div className="squad-row">
            {groups.map((g) => {
              const active = g.find((p) => p.name === (g[0].lane === 'bot' ? botPick : g[0].name)) ?? g[0]
              const on = squadMe?.name === active.name || (duo && squadSup?.name === active.name)
              return (
                <div key={active.lane} className={`squad-card ${on ? 'on' : ''}`}>
                  <button className="sq-main" onClick={() => { setPlayer(active.name); setMe(null); setFoe(null) }}>
                    <Avatar name={active.name} size={44} />
                    <span className="sq-name">{active.name}</span>
                    <span className="sq-lane"><LaneIcon lane={active.lane} size={13} /> {LANE_LABEL[active.lane]}</span>
                  </button>
                  {g.length > 1 && (
                    <div className="rc-switch">{g.map((p) => <button key={p.name} className={p.name === active.name ? 'on' : ''} onClick={() => { setBotPick(p.name); setPlayer(p.name) }}>{p.name}</button>)}</div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <Seg size="md" className="lane-tabs" value={view} onChange={switchView} options={VIEWS.map((v) => ({
            id: v, label: v === 'bot' ? 'Bot lane 2v2' : LANE_LABEL[v], icon: v === 'bot' ? <span className="dual-ico"><LaneIcon lane="bot" /><LaneIcon lane="support" /></span> : <LaneIcon lane={v} />,
          }))} />
        )}

        {!duo ? (
          <div className="slots-solo">
            <ChampSlot label={squadMe ? `${squadMe.name} plays` : 'You play'} lane={lane} tone="ally" value={me} onChange={setMe} champs={champs} byId={byId} quick={myQuick(lane, squadMe)} metaTier={tierOf(lane)} />
            <div className="vs-badge"><span>VS</span></div>
            <ChampSlot label="Against" lane={lane} tone="enemy" value={foe} onChange={setFoe} champs={champs} byId={byId} quick={[popularQuick(lane)]} metaTier={tierOf(lane)} />
          </div>
        ) : (
          <div className="slots-duo">
            <div className="duo-side ally">
              <ChampSlot compact label={squadMe ? `${squadMe.name} · ADC` : 'Your ADC'} lane="bot" tone="ally" value={me} onChange={setMe} champs={champs} byId={byId} quick={myQuick('bot', squadMe)} metaTier={tierOf('bot')} />
              <ChampSlot compact label={squadSup ? `${squadSup.name} · Support` : 'Your support'} lane="support" tone="ally" value={ally} onChange={setAlly} champs={champs} byId={byId} quick={myQuick('support', squadSup)} metaTier={tierOf('support')} />
            </div>
            <div className="vs-badge"><span>2v2</span></div>
            <div className="duo-side enemy">
              <ChampSlot compact label="Enemy ADC" lane="bot" tone="enemy" value={foe} onChange={setFoe} champs={champs} byId={byId} quick={[popularQuick('bot', 10)]} metaTier={tierOf('bot')} />
              <ChampSlot compact label="Enemy support" lane="support" tone="enemy" value={foeSup} onChange={setFoeSup} champs={champs} byId={byId} quick={[popularQuick('support', 10)]} metaTier={tierOf('support')} />
            </div>
          </div>
        )}
        {!ready && <p className="pick-hint">{duo ? (!me ? 'Pick your ADC (and support) to start.' : !foe ? 'Now the enemy ADC. Add both supports for the full 2v2 read.' : 'Loading…') : !me ? 'Pick your champion to start.' : !foe ? 'Now pick who you are laning against.' : 'Loading…'}</p>}
      </section>

      {solo && meD && foeD && (
        <>
          <MatchupHero lane={lane} me={byId.get(me!)!} foe={byId.get(foe!)!} wr={soloWr} meRow={tierRow(idx, lane, me!)} foeRow={tierRow(idx, lane, foe!)} statEdge={fightEdge(meD, foeD, 1)} patch={idx?.patch} />
          <MetaCheck lane={lane} me={byId.get(me!)!} foe={byId.get(foe!)!} meMeta={meMeta} foeMeta={foeMeta} idx={idx} wr={soloWr}
            pool={soloPool} poolOwner={squadMe?.name} extraIds={mode === 'open' ? visitorIds : undefined} byId={byId} onPick={setMe} />
          <BuildPanel build={meMeta?.lanes[lane]?.build ?? null} detail={meD} name={meD.name} />
          <PhasePlan me={meD} foe={foeD} lane={lane} build={meMeta?.lanes[lane]?.build ?? null} />
          <Videos me={meD} foe={foeD} meKey={byId.get(me!)!.key} foeKey={byId.get(foe!)!.key} videos={meMeta?.videos ?? []} />
          <DeepDive me={meD} foe={foeD} lane={lane} />
        </>
      )}

      {duoReady && meD && foeD && (
        <>
          <DuoHero adc={byId.get(me!)!} sup={ally ? byId.get(ally)! : null} eAdc={byId.get(foe!)!} eSup={foeSup ? byId.get(foeSup)! : null} pairs={pairs} patch={idx?.patch} />
          <MetaCheck lane="bot" me={byId.get(me!)!} foe={byId.get(foe!)!} meMeta={meMeta} foeMeta={foeMeta} idx={idx} wr={pairs[0]?.wr ?? null}
            pool={adcPool} poolOwner={mode === 'chabeb' ? playerFor('bot')?.name : undefined} extraIds={mode === 'open' ? visitorIds : undefined} byId={byId} onPick={setMe} />
          {ally && foeSup && allyMeta && (
            <MetaCheck lane="support" me={byId.get(ally)!} foe={byId.get(foeSup)!} meMeta={allyMeta} foeMeta={foeSupMeta} idx={idx} wr={vsWinRate(allyMeta, foeSupMeta, 'support')}
              pool={supPool} poolOwner={mode === 'chabeb' ? playerFor('support')?.name : undefined} extraIds={mode === 'open' ? visitorIds : undefined} byId={byId} onPick={setAlly} />
          )}
          {allyD && (
            <div className="persp">
              <span className="sub">Show the build and lane plan for</span>
              <Seg size="sm" value={persp} onChange={setPersp} options={[{ id: 'adc', label: `${meD.name} (ADC)` }, { id: 'sup', label: `${allyD.name} (Support)` }]} />
            </div>
          )}
          {pMe && pFoe && (
            <>
              <BuildPanel build={pMeta?.lanes[pLane]?.build ?? null} detail={pMe} name={pMe.name} />
              <PhasePlan me={pMe} foe={pFoe} lane={pLane} build={pMeta?.lanes[pLane]?.build ?? null} ally={persp === 'sup' ? meD : allyD} foeAlly={persp === 'sup' ? foeD : foeSupD} />
              <Videos me={pMe} foe={pFoe} meKey={byId.get(pMe.id)!.key} foeKey={byId.get(pFoe.id)!.key} videos={pMeta?.videos ?? []} />
              <DeepDive me={pMe} foe={pFoe} lane={pLane} />
            </>
          )}
        </>
      )}
    </div>
  )
}
