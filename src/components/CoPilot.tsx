import { useEffect, useMemo, useRef, useState } from 'react'
import Avatar from './Avatar'
import BuildPanel from './laning/BuildPanel'
import { LaneIcon, MetaTier } from './ui/kit'
import { iconUrl, loadDetail, type ChampDetail } from '../lib/ddragon'
import { loadChampMeta, loadMetaIndex, type ChampMeta, type MetaIndex } from '../lib/meta'
import { renderPlan } from '../lib/planImage'
import { scanScreenshot, type ScanResult } from '../lib/scan'
import { assignLanes, banSuggestions, candidateIds, readTeam, recommend, type CoState, type Pick } from '../lib/copilot'
import { setCoachContext, setCoachData } from '../lib/profile'
import { LANES, LANE_SHORT, type Champion, type Lane, type Player } from '../lib/types'

interface Props { players: Player[]; champs: Champion[]; byId: Map<string, Champion> }
type Target = 'enemy' | 'ally' | 'ban'
const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '')
const store = {
  get: (k: string) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* ignore */ } },
}

export default function CoPilot({ players, champs, byId }: Props) {
  const [idx, setIdx] = useState<MetaIndex | null>(null)
  const [metas, setMetas] = useState<Map<string, ChampMeta>>(new Map())
  const [me, setMe] = useState<Lane>(() => (LANES as string[]).includes(store.get('cp.lane') ?? '') ? (store.get('cp.lane') as Lane) : 'mid')
  const [playerName, setPlayerName] = useState<string>(() => store.get('cp.player') ?? '')
  const [ally, setAlly] = useState<Pick[]>([])
  const [enemy, setEnemy] = useState<Pick[]>([])
  const [bans, setBans] = useState<string[]>([])
  const [target, setTarget] = useState<Target>('enemy')
  const [q, setQ] = useState('')
  const [locked, setLocked] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [scan, setScan] = useState<{ busy: boolean; msg: string; pct: number; res: ScanResult | null; err: string; thumb: string } | null>(null)
  const player = players.find((p) => p.name === playerName) ?? null

  useEffect(() => { loadMetaIndex().then(setIdx) }, [])
  useEffect(() => { store.set('cp.lane', me); store.set('cp.player', playerName) }, [me, playerName])

  const state: CoState = { me, player, ally, enemy, bans }

  // load meta for every candidate, enemy and ally we care about (small cached JSON files)
  const wanted = useMemo(() => {
    const s = new Set<string>([...candidateIds(idx, me, player), ...enemy.map((p) => p.id), ...ally.map((p) => p.id)])
    return [...s]
  }, [idx, me, player, enemy, ally])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    const need = wanted.filter((id) => !metas.has(id))
    if (!need.length) return
    let live = true
    setLoading(true)
    Promise.all(need.map((id) => loadChampMeta(id).then((m) => [id, m] as const))).then((rs) => {
      if (!live) return
      setMetas((prev) => { const n = new Map(prev); rs.forEach(([id, m]) => m && n.set(id, m)); return n })
      setLoading(false)
    })
    return () => { live = false }
  }, [wanted]) // eslint-disable-line react-hooks/exhaustive-deps

  const myPick = locked ?? ally.find((p) => p.lane === me)?.id ?? null
  const foe = enemy.find((p) => p.lane === me)
  const recs = useMemo(() => recommend(state, idx, metas, byId), [me, player, ally, enemy, bans, idx, metas, byId]) // eslint-disable-line react-hooks/exhaustive-deps
  const banRecs = useMemo(() => banSuggestions(state, idx, metas, byId), [me, player, ally, enemy, bans, idx, metas, byId]) // eslint-disable-line react-hooks/exhaustive-deps
  const enemyRead = useMemo(() => readTeam(enemy, byId, true), [enemy, byId])
  const allyRead = useMemo(() => readTeam(ally, byId, false), [ally, byId])

  useEffect(() => {
    const top = recs.slice(0, 3).map((r) => byId.get(r.id)?.name).filter(Boolean).join(', ')
    setCoachContext(`Page: Draft co-pilot. User plays ${me}${player ? ` as ${player.name}` : ''}. Enemy picks: ${enemy.map((p) => `${byId.get(p.id)?.name} (${p.lane})`).join(', ') || 'none'}. Allies: ${ally.map((p) => `${byId.get(p.id)?.name} (${p.lane})`).join(', ') || 'none'}. Bans: ${bans.map((b) => byId.get(b)?.name).join(', ') || 'none'}. Top suggestions: ${top || 'none'}.`)
    setCoachData({
      lane: me, player: player?.name, foe: foe ? byId.get(foe.id)?.name : undefined, mine: myPick ? byId.get(myPick)?.name : undefined,
      recs: recs.slice(0, 5).map((r) => ({ name: byId.get(r.id)?.name ?? r.id, score: r.score, why: r.reasons.slice(0, 4).map((x) => x.text) })),
      bans: banRecs.slice(0, 4).map((b) => ({ name: byId.get(b.id)?.name ?? b.id, why: b.beats > 0 ? `beats ${b.beats}/${b.of} of the pool (${b.names.slice(0, 3).join(', ')})` : `${b.avg}% average against the pool` })),
      enemyLines: enemyRead.lines.map((l) => l.text), allyLines: allyRead.lines.map((l) => l.text),
    })
    return () => setCoachData({})
  }, [recs, banRecs, enemyRead, allyRead, enemy, ally, bans, me, player, byId]) // eslint-disable-line react-hooks/exhaustive-deps

  const taken = new Set([...ally.map((p) => p.id), ...enemy.map((p) => p.id), ...bans])
  const matches = useMemo(() => {
    const n = norm(q)
    if (!n) return []
    const hits = champs.filter((c) => norm(c.name).startsWith(n) || norm(c.id).startsWith(n))
    const more = champs.filter((c) => !hits.includes(c) && (norm(c.name).includes(n) || norm(c.id).includes(n)))
    return [...hits, ...more].filter((c) => !taken.has(c.id)).slice(0, 8)
  }, [q, champs, ally, enemy, bans]) // eslint-disable-line react-hooks/exhaustive-deps

  const add = (id: string, to: Target = target) => {
    if (to === 'ban') { if (bans.length < 10) setBans((b) => [...b, id]) }
    else if (to === 'enemy') { if (enemy.length < 5) setEnemy((e) => assignLanes(idx, [...e, { id, lane: 'top' }])) }
    else if (ally.length < 5) setAlly((a) => assignLanes(idx, [...a.map((x) => (x.lane === me ? { ...x, manual: true } : x)), { id, lane: 'top' }]))
    setQ(''); input.current?.focus()
  }
  // Locking my pick puts it into my lane on the ally team.
  const lockMine = (id: string) => {
    setLocked(id)
    setAlly((a) => [...a.filter((x) => x.lane !== me && x.id !== id), { id, lane: me, manual: true }])
  }
  const cycleLane = (team: Target, i: number) => {
    const set = team === 'enemy' ? setEnemy : setAlly
    set((arr) => {
      arr = arr.map((x, j) => (j === i ? { ...x, manual: true } : x))
      const used = arr.map((x, j) => (j === i ? null : x.lane))
      const cur = LANES.indexOf(arr[i].lane)
      let nxt = cur
      for (let k = 1; k <= LANES.length; k++) { const c = LANES[(cur + k) % LANES.length]; if (!used.includes(c)) { nxt = LANES.indexOf(c); break } }
      return arr.map((x, j) => (j === i ? { ...x, lane: LANES[nxt] } : x))
    })
  }
  const reset = () => { setAlly([]); setEnemy([]); setBans([]); setLocked(null); setQ('') }
  const pickPlayer = (name: string) => {
    setPlayerName(name)
    const p = players.find((x) => x.name === name)
    if (p) setMe(p.lane)
  }

  const runScan = async (file: Blob) => {
    const thumb = URL.createObjectURL(file)
    setScan({ busy: true, msg: 'Reading the screenshot…', pct: 0.02, res: null, err: '', thumb })
    try {
      const res = await scanScreenshot(file, champs, (msg, pct) => setScan((x) => (x ? { ...x, msg, pct } : x)))
      setScan((x) => (x ? { ...x, busy: false, res, pct: 1 } : x))
    } catch (e) {
      setScan((x) => (x ? { ...x, busy: false, err: e instanceof Error ? e.message : 'Could not read this image' } : x))
    }
  }
  const takeImage = (files?: FileList | DataTransferItemList | null) => {
    const f = files ? Array.from(files as ArrayLike<File | DataTransferItem>).map((i) => ('getAsFile' in i ? i.getAsFile() : i)).find((x): x is File => !!x && x.type.startsWith('image/')) : null
    if (f) runScan(f)
  }
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => { if (e.clipboardData?.files.length) takeImage(e.clipboardData.files) }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [champs]) // eslint-disable-line react-hooks/exhaustive-deps
  const applyScan = () => {
    if (!scan?.res) return
    setEnemy(assignLanes(idx, scan.res.enemy.slice(0, 5).map((f) => ({ id: f.id, lane: 'top' as Lane }))))
    setAlly(assignLanes(idx, scan.res.ally.slice(0, 5).map((f) => ({ id: f.id, lane: 'top' as Lane }))))
    setLocked(null); setScan(null)
  }
  const dropScan = (side: 'ally' | 'enemy', i: number) => setScan((x) => (x && x.res ? { ...x, res: { ...x.res, [side]: x.res[side].filter((_, j) => j !== i) } } : x))

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && matches[0]) add(matches[0].id)
    if (e.key === 'Tab' && !e.shiftKey && !q) { /* default */ }
    if (e.key === 'Escape') setQ('')
  }

  const top = recs.slice(0, 6)

  return (
    <div className="copilot">
      <section className="card cp-top">
        <div className="cp-who">
          <span className="stat-label">I play</span>
          <div className="cp-lanes">
            {LANES.map((l) => (
              <button key={l} className={me === l ? 'on' : ''} onClick={() => { setMe(l); setLocked(null) }} title={l}><LaneIcon lane={l} size={20} /><span>{LANE_SHORT[l]}</span></button>
            ))}
          </div>
          <div className="cp-players" title="Optional: pick yourself to rank by your own pool">
            <button className={!playerName ? 'on' : ''} onClick={() => pickPlayer('')}>Anyone</button>
            {players.map((p) => (
              <button key={p.name} className={playerName === p.name ? 'on' : ''} onClick={() => pickPlayer(p.name)}><Avatar key={p.name} name={p.name} size={18} />{p.name}</button>
            ))}
          </div>
        </div>
        <div className="cp-add">
          <div className="cp-targets" role="tablist">
            <button className={target === 'enemy' ? 'on e' : ''} onClick={() => { setTarget('enemy'); input.current?.focus() }}>Enemy <b>{enemy.length}/5</b></button>
            <button className={target === 'ally' ? 'on a' : ''} onClick={() => { setTarget('ally'); input.current?.focus() }}>Allies <b>{ally.length}/5</b></button>
            <button className={target === 'ban' ? 'on b' : ''} onClick={() => { setTarget('ban'); input.current?.focus() }}>Bans <b>{bans.length}</b></button>
            <button className="reset" onClick={reset}>Reset</button>
          </div>
          <input
            ref={input} className="search cp-search" type="search" placeholder={`Type a champion, Enter adds to ${target === 'ban' ? 'bans' : target === 'ally' ? 'your team' : 'the enemy'}`}
            value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} autoFocus autoComplete="off" spellCheck={false} enterKeyHint="done"
          />
          <div className="cp-scan-row">
            <button className="btn" onClick={() => fileRef.current?.click()}>Scan a champ select screenshot</button>
            <span className="sub">or paste / drop an image here</span>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { takeImage(e.target.files); e.target.value = '' }} />
          </div>
          {matches.length > 0 && (
            <div className="cp-results">
              {matches.map((c) => (
                <button key={c.id} onClick={() => add(c.id)} title={c.name}><img src={iconUrl(c.id)} alt="" /><span>{c.name}</span></button>
              ))}
            </div>
          )}
        </div>
      </section>

      {scan && (
        <section className="card cp-scan">
          <div className="card-head">
            <div><h2>Screenshot reader</h2><p className="sub">{scan.busy ? `${scan.msg} ${Math.round(scan.pct * 100)}%` : scan.err ? scan.err : scan.res && scan.res.ally.length + scan.res.enemy.length === 0 ? 'No champion names found. Try a sharper, full-screen screenshot.' : 'Check the champions, remove any wrong ones, then apply. Bans are not read yet.'}</p></div>
            <div className="btns">
              {scan.res && scan.res.ally.length + scan.res.enemy.length > 0 && <button className="btn gold" onClick={applyScan}>Apply to draft</button>}
              <button className="btn" onClick={() => setScan(null)}>Close</button>
            </div>
          </div>
          <div className="cp-scan-body">
            <img src={scan.thumb} alt="" />
            {scan.busy && <div className="bar"><i style={{ width: `${scan.pct * 100}%` }} /></div>}
            {scan.res && (['ally', 'enemy'] as const).map((side) => (
              <div key={side} className={`cp-team ${side === 'ally' ? 'a' : 'e'}`}>
                <span className="stat-label">{side === 'ally' ? 'Left team' : 'Right team'}</span>
                <div className="cp-slots">{scan.res![side].length === 0 && <em className="sub">none found</em>}{scan.res![side].map((f, i) => (
                  <div key={f.id} className="cp-pick"><button className="pic" onClick={() => dropScan(side, i)} title={`${byId.get(f.id)?.name} - click to remove`}><img src={iconUrl(f.id)} alt="" /><i>×</i></button><span className="lane">{byId.get(f.id)?.name}</span></div>
                ))}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="cp-teams">
        <TeamRow title="Enemy" cls="e" picks={enemy} byId={byId} onRemove={(i) => setEnemy((a) => a.filter((_, j) => j !== i))} onLane={(i) => cycleLane('enemy', i)} me={me} />
        <TeamRow title="Your team" cls="a" picks={ally} byId={byId} onRemove={(i) => { if (ally[i].id === locked) setLocked(null); setAlly((a) => a.filter((_, j) => j !== i)) }} onLane={(i) => cycleLane('ally', i)} me={me} />
        <div className="cp-bans">
          <span className="stat-label">Bans</span>
          <div>{bans.length === 0 ? <em className="sub">none yet</em> : bans.map((b, i) => (
            <button key={b} className="ban" onClick={() => setBans((x) => x.filter((_, j) => j !== i))} title={`${byId.get(b)?.name} - click to remove`}><img src={iconUrl(b)} alt="" /></button>
          ))}</div>
        </div>
      </section>

      <div className="cp-main">
        <section className="card cp-recs">
          <div className="card-head">
            <div>
              <h2>Best picks for {LANE_SHORT[me]}{player ? ` · ${player.name}` : ''}</h2>
              <p className="sub">{foe ? <>vs <b>{byId.get(foe.id)?.name}</b> and the rest of the draft</> : 'No lane opponent yet: ranked by meta strength and what your team needs.'}{loading && ' · loading data…'}</p>
            </div>
          </div>
          {top.length === 0 && !loading && <p className="empty">No data for this lane yet.</p>}
          <ol className="cp-list">
            {top.map((r, i) => {
              const c = byId.get(r.id)
              return (
                <li key={r.id} className={`${myPick === r.id ? 'locked' : ''} ${i === 0 ? 'first' : ''}`}>
                  <button className="cp-rec" onClick={() => lockMine(r.id)} title="Tap to lock as my pick">
                    <img className="ic" src={iconUrl(r.id)} alt="" />
                    <div className="body">
                      <div className="line1"><b>{c?.name ?? r.id}</b><MetaTier tier={r.tier} />{r.poolTier && <span className={`badge-t t-${r.poolTier}`}>{r.poolTier}</span>}</div>
                      <div className="why">{r.reasons.slice(0, 4).map((x, k) => <span key={k} className={`why-${x.tone}`}>{x.text}</span>)}</div>
                    </div>
                    <div className="score" title="Pick score"><strong>{r.score}</strong><small>{myPick === r.id ? 'locked' : 'score'}</small></div>
                  </button>
                </li>
              )
            })}
          </ol>
        </section>

        <aside className="cp-side">
          <section className="card cp-bansug">
            <div className="card-head"><div><h2>Ban these</h2><p className="sub">Hardest on {player ? `${player.name}'s pool` : 'the top picks'} in {LANE_SHORT[me]}</p></div></div>
            {banRecs.length === 0 ? <p className="sub">{loading ? 'Loading…' : 'Not enough matchup data.'}</p> : (
              <ul className="cp-banlist">
                {banRecs.map((b) => (
                  <li key={b.id}>
                    <button onClick={() => add(b.id, 'ban')} title="Add to bans">
                      <img src={iconUrl(b.id)} alt="" />
                      <div><b>{byId.get(b.id)?.name ?? b.id}</b><small>{b.beats > 0 ? `beats ${b.beats}/${b.of}: ${b.names.slice(0, 3).join(', ')}` : `avg ${b.avg}% vs your picks`}</small></div>
                      <span className="avg">{b.avg}%</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <ReadCard title="Enemy comp" read={enemyRead} empty="Add enemy picks to see their damage, frontline and threats." />
          <ReadCard title="Your comp needs" read={allyRead} empty="Add your teammates to see what your team is missing." />
        </aside>
      </div>

      {myPick && <Plan id={myPick} lane={me} meta={metas.get(myPick) ?? null} byId={byId} foe={foe ? byId.get(foe.id)?.name : undefined} enemyLines={enemyRead.lines.map((l) => l.text)} bans={banRecs.slice(0, 3).map((b) => byId.get(b.id)?.name ?? b.id)} recs={recs.filter((r) => r.id !== myPick).slice(0, 3).map((r) => byId.get(r.id)?.name ?? r.id)} player={player?.name} enemyAp={enemyRead.n >= 2 ? Math.round((enemyRead.ap / Math.max(1, enemyRead.ap + enemyRead.ad)) * 100) : null} />}
    </div>
  )
}

function TeamRow({ title, cls, picks, byId, onRemove, onLane, me }: {
  title: string; cls: string; picks: Pick[]; byId: Map<string, Champion>; onRemove: (i: number) => void; onLane: (i: number) => void; me: Lane
}) {
  const empty = Array.from({ length: Math.max(0, 5 - picks.length) })
  return (
    <div className={`cp-team ${cls}`}>
      <span className="stat-label">{title}</span>
      <div className="cp-slots">
        {picks.map((p, i) => (
          <div key={p.id} className={`cp-pick ${p.lane === me ? 'mine' : ''}`}>
            <button className="pic" onClick={() => onRemove(i)} title={`${byId.get(p.id)?.name} - click to remove`}><img src={iconUrl(p.id)} alt="" /><i>×</i></button>
            <button className="lane" onClick={() => onLane(i)} title="Tap to change lane"><LaneIcon lane={p.lane} size={14} />{LANE_SHORT[p.lane]}</button>
          </div>
        ))}
        {empty.map((_, i) => <div key={`e${i}`} className="cp-pick blank"><span className="pic" /></div>)}
      </div>
    </div>
  )
}

function ReadCard({ title, read, empty }: { title: string; read: ReturnType<typeof readTeam>; empty: string }) {
  const apS = read.ad + read.ap ? Math.round((read.ap / (read.ad + read.ap)) * 100) : null
  return (
    <section className="card cp-read">
      <div className="card-head"><h2>{title}</h2></div>
      {read.n === 0 ? <p className="sub">{empty}</p> : (
        <>
          {apS !== null && (
            <div className="dmg" title={`${100 - apS}% AD · ${apS}% AP`}>
              <div className="ad" style={{ width: `${100 - apS}%` }}>{100 - apS >= 20 && `AD ${100 - apS}%`}</div>
              <div className="ap" style={{ width: `${apS}%` }}>{apS >= 20 && `AP ${apS}%`}</div>
            </div>
          )}
          <div className="tags">{Object.entries(read.tags).map(([t, n]) => <span key={t} className="tag">{t} ×{n}</span>)}</div>
          <ul className="cp-lines">{read.lines.map((l, i) => <li key={i} className={`why-${l.tone}`}>{l.text}</li>)}{read.lines.length === 0 && <li className="why-neutral">Add a few more picks for advice.</li>}</ul>
        </>
      )}
    </section>
  )
}

/** After lock-in: the whole game plan on one card (runes, spells, skills, build) plus what to do about their comp. */
function Plan({ id, lane, meta, byId, foe, enemyAp, enemyLines, bans, recs, player }: { id: string; lane: Lane; meta: ChampMeta | null; byId: Map<string, Champion>; foe?: string; enemyAp: number | null; enemyLines: string[]; bans: string[]; recs: string[]; player?: string }) {
  const [busy, setBusy] = useState(false)
  const [detail, setDetail] = useState<ChampDetail | null>(null)
  useEffect(() => { setDetail(null); loadDetail(id).then(setDetail).catch(() => {}) }, [id])
  const name = byId.get(id)?.name ?? id
  const lm = meta?.lanes[lane] ?? null
  const tip = enemyAp === null ? null : enemyAp <= 25 ? 'Enemy is mostly AD: swap a defensive slot to armor (Plated Steelcaps / Randuin / Thornmail style).' : enemyAp >= 75 ? 'Enemy is mostly AP: take a magic resist item early (Mercury\'s Treads / Wit\'s End / Force of Nature style).' : null
  return (
    <section className="cp-plan">
      <div className="card-head"><h2>Game plan: {name} {foe ? `vs ${foe}` : ''}</h2>
        <button className="btn gold" disabled={busy} onClick={async () => {
          setBusy(true)
          const blob = await renderPlan({ name, id, lane, foe, player, build: lm?.build ?? null, enemyLines, bans, recs })
          setBusy(false)
          if (!blob) return
          const file = new File([blob], `game-plan-${name}.png`, { type: 'image/png' })
          try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: `Game plan: ${name}` }); return } } catch { /* fall through to download */ }
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000)
        }}>{busy ? 'Drawing…' : 'Share as image'}</button>
      </div>
      {tip && <p className="cp-tip">{tip}</p>}
      <BuildPanel build={lm?.build ?? null} detail={detail} name={name} />
    </section>
  )
}
