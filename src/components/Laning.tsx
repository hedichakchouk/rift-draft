import { useEffect, useMemo, useState } from 'react'
import Avatar from './Avatar'
import { iconUrl, itemUrl, loadDetail, loadItems, passiveUrl, spellUrl, type ChampDetail, type ItemInfo } from '../lib/ddragon'
import { ARCH_LABEL, archetype, compareAt, edgeLabel, fightEdge, itemPhases, links, phaseNotes } from '../lib/laning'
import { LANES, LANE_LABEL, TIER_HINT, type Champion, type Lane, type Player } from '../lib/types'

interface Props { players: Player[]; champs: Champion[]; byId: Map<string, Champion> }
const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '')

function readHash() {
  const q = new URLSearchParams(location.hash.split('?')[1] ?? '')
  const l = q.get('l') as Lane | null
  return { lane: l && (LANES as string[]).includes(l) ? l : ('mid' as Lane), me: q.get('m'), foe: q.get('e') }
}

function Picker({ label, champs, byId, value, onChange, quick, tone }: {
  label: string; champs: Champion[]; byId: Map<string, Champion>; value: string | null; onChange: (id: string | null) => void
  quick?: { who: string; list: { id: string; tier: string }[] }[]; tone: 'me' | 'foe'
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const res = useMemo(() => (q ? champs.filter((c) => norm(c.name).includes(norm(q)) || norm(c.id).includes(norm(q))).slice(0, 9) : []), [q, champs])
  const cur = value ? byId.get(value) : null
  return (
    <div className={`lp-pick ${tone}`}>
      <span className="stat-label">{label}</span>
      {cur ? (
        <div className="lp-cur">
          <img src={iconUrl(cur.id)} alt="" />
          <strong>{cur.name}</strong>
          <button className="btn" onClick={() => { onChange(null); setQ('') }}>Change</button>
        </div>
      ) : (
        <div className="lp-search">
          <input className="search" type="search" placeholder="Search champion…" value={q} onChange={(e) => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} autoComplete="off" spellCheck={false} />
          {open && res.length > 0 && (
            <div className="lp-results">
              {res.map((c) => <button key={c.id} onClick={() => { onChange(c.id); setQ(''); setOpen(false) }}><img src={iconUrl(c.id)} alt="" />{c.name}</button>)}
            </div>
          )}
        </div>
      )}
      {!cur && quick && quick.map((g) => (
        <div className="lp-quick" key={g.who}>
          <span><Avatar name={g.who} size={20} /> {g.who}</span>
          <div>{g.list.map((c) => <button key={c.id} title={`${byId.get(c.id)?.name ?? c.id} (${c.tier})`} onClick={() => onChange(c.id)}><img src={iconUrl(c.id)} alt="" /><i className={`badge t-${c.tier}`}>{c.tier}</i></button>)}</div>
        </div>
      ))}
    </div>
  )
}

function Item({ name, items }: { name: string; items: Map<string, ItemInfo> }) {
  const it = items.get(name.toLowerCase())
  if (!it) return null
  return (
    <div className="lp-item" title={`${it.name} (${it.gold}g) - ${it.plain || it.desc.slice(0, 160)}`}>
      <img src={itemUrl(it.id)} alt={it.name} loading="lazy" />
      <span>{it.name}</span><small>{it.gold}g</small>
    </div>
  )
}

export default function Laning({ players, champs, byId }: Props) {
  const init = useMemo(readHash, [])
  const [lane, setLane] = useState<Lane>(init.lane)
  const [meId, setMeId] = useState<string | null>(init.me)
  const [foeId, setFoeId] = useState<string | null>(init.foe)
  const [me, setMe] = useState<ChampDetail | null>(null)
  const [foe, setFoe] = useState<ChampDetail | null>(null)
  const [items, setItems] = useState<Map<string, ItemInfo>>(new Map())
  const [phase, setPhase] = useState('start')
  const [lvl, setLvl] = useState(1)
  const [err, setErr] = useState('')

  useEffect(() => { loadItems().then(setItems).catch((e) => setErr(String(e))) }, [])
  useEffect(() => { if (!meId) setMe(null); else loadDetail(meId).then(setMe).catch((e) => setErr(String(e))) }, [meId])
  useEffect(() => { if (!foeId) setFoe(null); else loadDetail(foeId).then(setFoe).catch((e) => setErr(String(e))) }, [foeId])
  useEffect(() => {
    const q = new URLSearchParams({ l: lane }); if (meId) q.set('m', meId); if (foeId) q.set('e', foeId)
    history.replaceState(null, '', `#laning?${q}`)
  }, [lane, meId, foeId])

  const squad = useMemo(() => players
    .filter((p) => p.lane === lane || p.flexLanes?.[lane])
    .map((p) => ({ who: p.name, list: p.champions.filter((c) => c.tier === 'Z' || c.tier === 'S').slice(0, 10) }))
    .filter((g) => g.list.length), [players, lane])

  const ready = me && foe
  const edge1 = ready ? fightEdge(me!, foe!, 1) : 1
  const verdict = edgeLabel(edge1)
  const phases = useMemo(() => (ready ? itemPhases(me!, foe!, lane) : []), [ready, me, foe, lane])
  const notes = useMemo(() => (ready ? phaseNotes(me!, foe!, lane) : []), [ready, me, foe, lane])
  const cur = phases.find((p) => p.id === phase) ?? phases[0]
  const curNotes = notes.find((n) => n.id === cur?.id)?.bullets ?? []
  const rows = ready ? compareAt(me!, foe!, lvl) : []
  const squadTier = (id: string | null) => {
    if (!id) return null
    for (const p of players.filter((x) => x.lane === lane || x.flexLanes?.[lane])) { const t = p.champions.find((c) => c.id === id)?.tier; if (t) return `${p.name}: ${t} - ${TIER_HINT[t]}` }
    return null
  }

  return (
    <div className="laning">
      <section className="card">
        <div className="card-head">
          <div>
            <h2>Laning phase</h2>
            <p className="sub">Pick your lane, your champion and who you face. Get the matchup, what to do each phase of the lane, and the items to buy.</p>
          </div>
        </div>
        <div className="seg lane-seg">
          {LANES.map((l) => <button key={l} className={lane === l ? 'on' : ''} onClick={() => setLane(l)}>{LANE_LABEL[l]}</button>)}
        </div>
        <div className="lp-pickers">
          <Picker label="You play" champs={champs} byId={byId} value={meId} onChange={setMeId} quick={squad} tone="me" />
          <div className="lp-vs">VS</div>
          <Picker label="Against" champs={champs} byId={byId} value={foeId} onChange={setFoeId} tone="foe" />
        </div>
        {err && <p className="err">Could not load data from Riot: {err}</p>}
        {meId && squadTier(meId) && <p className="hint">Squad pool - {squadTier(meId)}</p>}
        {!ready && <p className="empty">{!meId ? 'Pick the champion you play.' : !foeId ? 'Now pick the champion you are laning against.' : 'Loading…'}</p>}
      </section>

      {ready && me && foe && (
        <>
          <section className="card">
            <div className="lp-head">
              <div className="lp-duel">
                <img src={iconUrl(me.id)} alt={me.name} /><b>{me.name}</b>
                <span className="lp-vs sm">vs</span>
                <b>{foe.name}</b><img src={iconUrl(foe.id)} alt={foe.name} />
              </div>
              <div className={`lp-verdict ${verdict.tone}`}>
                <strong>{verdict.text}</strong>
                <small>{ARCH_LABEL[archetype(me, lane)]} vs {ARCH_LABEL[archetype(foe, lane)]} · {LANE_LABEL[lane]} · stat-based estimate (no items, no skill), not a winrate</small>
              </div>
            </div>

            <div className="seg">
              {[1, 6, 11, 16].map((n) => <button key={n} className={lvl === n ? 'on' : ''} onClick={() => setLvl(n)}>Level {n}</button>)}
            </div>
            <table className="lp-table">
              <thead><tr><th>{me.name}</th><th>Stat at level {lvl}</th><th>{foe.name}</th></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const w = r.me === r.foe ? 0 : (r.me > r.foe) === r.higherBetter ? 1 : -1
                  return <tr key={r.key}><td className={w === 1 ? 'win' : ''}>{r.fmt(r.me)}</td><th>{r.label}</th><td className={w === -1 ? 'win' : ''}>{r.fmt(r.foe)}</td></tr>
                })}
              </tbody>
            </table>

            <div className="lp-spells">
              {[me, foe].map((c) => (
                <div key={c.id}>
                  <span className="stat-label">{c.name} abilities (cooldown at rank 1)</span>
                  <div className="lp-icons">
                    <figure title={`${c.passive.name} (passive) - ${c.passive.description}`}><img src={passiveUrl(c.passive.image)} alt="" /><figcaption>P</figcaption></figure>
                    {c.spells.map((s, i) => <figure key={s.id} title={`${s.name} - ${s.description}`}><img src={spellUrl(s.image)} alt="" /><figcaption>{'QWER'[i]} · {s.cooldownBurn.split('/')[0]}s</figcaption></figure>)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="card-head"><div><h2>Phase by phase</h2><p className="sub">What to do and what to buy at each stage of the lane.</p></div></div>
            <div className="seg phase-seg">
              {phases.map((p) => <button key={p.id} className={cur?.id === p.id ? 'on' : ''} onClick={() => setPhase(p.id)}>{p.tab}</button>)}
            </div>
            {cur && (
              <div className="lp-phase">
                <p className="sub">{cur.hint}</p>
                <ul className="lp-notes">{curNotes.map((b, i) => <li key={i}>{b}</li>)}</ul>
                {cur.groups.map((g) => {
                  const shown = g.items.filter((n) => items.has(n.toLowerCase()))
                  if (items.size && !shown.length) return null
                  return (
                    <div className="lp-group" key={g.label}>
                      <span className="stat-label">{g.label}</span>
                      <div className="lp-items">{items.size ? shown.map((n) => <Item key={n} name={n} items={items} />) : g.items.map((n) => <span key={n} className="tag">{n}</span>)}</div>
                      {g.note && <small className="hint">{g.note}</small>}
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <section className="card lp-tips">
            <div>
              <h3>Playing {me.name}</h3>
              {me.allytips.length ? <ul>{me.allytips.slice(0, 4).map((t, i) => <li key={i}>{t}</li>)}</ul> : <p className="sub">No tips from Riot.</p>}
            </div>
            <div>
              <h3>Playing against {foe.name}</h3>
              {foe.enemytips.length ? <ul>{foe.enemytips.slice(0, 4).map((t, i) => <li key={i}>{t}</li>)}</ul> : <p className="sub">No tips from Riot.</p>}
            </div>
          </section>

          <section className="card">
            <h3>Live winrates and builds</h3>
            <p className="sub">Real matchup winrates, runes and pro builds for {me.name} {LANE_LABEL[lane]}:</p>
            <div className="lp-links">{links(me.id, foe.id, lane).map((l) => <a className="btn" key={l.label} href={l.url} target="_blank" rel="noreferrer">{l.label} ↗</a>)}</div>
          </section>
        </>
      )}
    </div>
  )
}
