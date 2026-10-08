import { useEffect, useMemo, useState } from 'react'
import Avatar from './Avatar'
import RiftMap from './RiftMap'
import Verdict from './Verdict'
import { winrate, type Stats } from '../lib/stats'
import { DndProvider, useDnd } from '../lib/dnd'
import { iconUrl } from '../lib/ddragon'
import { decodeDraft, defaultDraft, encodeDraft, laneTier, poolTier, teamStats, type Draft } from '../lib/draft'
import { LANES, LANE_LABEL, LANE_SHORT, TIER_HINT, type Champion, type Lane, type Player } from '../lib/types'

interface Props { players: Player[]; champs: Champion[]; byId: Map<string, Champion>; stats: Stats | null }

// Position of each lane slot on the map (% of the map box).
const POS: Record<Lane, { left: number; top: number }> = {
  top: { left: 12, top: 24 },
  jungle: { left: 30, top: 62 },
  mid: { left: 50, top: 46 },
  bot: { left: 60, top: 82 },
  support: { left: 85, top: 66 },
}

function initial(players: Player[]): Draft {
  const m = location.hash.match(/[?&]d=([^&]+)/)
  return (m && decodeDraft(m[1])) || defaultDraft(players)
}

export default function DraftPage(props: Props) {
  const { players } = props
  const [draft, setDraft] = useState<Draft>(() => initial(players))
  const [selected, setSelected] = useState<string | null>(null) // tap-to-place
  const [focus, setFocus] = useState<string>('') // player whose pool the picker shows

  useEffect(() => { history.replaceState(null, '', `#draft?d=${encodeDraft(draft)}`) }, [draft])

  const place = (lane: Lane, id: string) =>
    setDraft((d) => {
      const n = { ...d }
      // a champion can only be on one lane: clear it elsewhere first
      for (const l of LANES) if (n[l].champ === id) n[l] = { ...n[l], champ: null }
      n[lane] = { ...n[lane], champ: id }
      return n
    })

  const onDrop = (target: string | null, id: string, from: string | null) => {
    const lane = target && (LANES as string[]).includes(target) ? (target as Lane) : null
    setDraft((d) => {
      const n = { ...d }
      if (lane && from && from !== lane) {
        // dragged from lane to lane → swap champions
        n[from as Lane] = { ...n[from as Lane], champ: n[lane].champ }
        n[lane] = { ...n[lane], champ: id }
        return n
      }
      if (lane) {
        for (const l of LANES) if (n[l].champ === id) n[l] = { ...n[l], champ: null }
        n[lane] = { ...n[lane], champ: id }
        return n
      }
      if (from) n[from as Lane] = { ...n[from as Lane], champ: null } // dropped outside → remove
      return n
    })
    setSelected(null)
  }

  const tapLane = (l: Lane) => {
    if (selected) { place(l, selected); setSelected(null) }
    else if (draft[l].player) setFocus(draft[l].player!)
  }

  return (
    <DndProvider onDrop={onDrop}>
      <div className="draft-layout">
        <Board {...props} draft={draft} setDraft={setDraft} tapLane={tapLane} selected={selected} setFocus={setFocus} />
        <Picker {...props} draft={draft} selected={selected} setSelected={setSelected} focus={focus} setFocus={setFocus} />
      </div>
    </DndProvider>
  )
}

function Board({ players, byId, stats, draft, setDraft, tapLane, selected, setFocus }: Props & {
  draft: Draft; setDraft: (d: Draft | ((d: Draft) => Draft)) => void; tapLane: (l: Lane) => void; selected: string | null; setFocus: (s: string) => void
}) {
  const { start, over } = useDnd()
  const [copied, setCopied] = useState(false)
  const used = new Set(LANES.map((l) => draft[l].player).filter(Boolean))
  const team = useMemo(() => teamStats(draft, byId), [draft, byId])
  const placed = LANES.filter((l) => draft[l].champ).length

  const share = async () => {
    try { await navigator.clipboard.writeText(location.href); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch { /* ignore */ }
  }

  return (
    <section className="board card">
      <div className="card-head">
        <div>
          <h2>Draft Board</h2>
          <p className="sub">Drag champions onto the map. Drag between lanes to swap, drag off the map to remove.</p>
        </div>
        <div className="btns">
          <button className="btn" onClick={() => setDraft(defaultDraft(players))}>Reset</button>
          <button className="btn gold" onClick={share}>{copied ? '✓ Link copied' : 'Share draft'}</button>
        </div>
      </div>

      <div className="map" data-selecting={selected ? '' : undefined}>
        <RiftMap />
        {LANES.map((l) => {
          const s = draft[l]
          const p = players.find((x) => x.name === s.player)
          const champ = s.champ ? byId.get(s.champ) : undefined
          const tier = poolTier(p, s.champ)
          const lt = p ? laneTier(p, l) : undefined
          return (
            <div
              key={l}
              data-drop={l}
              className={`slot ${over === l ? 'over' : ''} ${s.champ ? 'filled' : ''}`}
              style={{ left: `${POS[l].left}%`, top: `${POS[l].top}%` }}
            >
              <div
                className="portrait"
                onPointerDown={(e) => s.champ && start(e, s.champ, l)}
                onClick={() => tapLane(l)}
                title={champ ? `${champ.name} — drag to move` : `Drop a champion on ${LANE_LABEL[l]}`}
              >
                {s.champ ? <img src={iconUrl(s.champ)} alt={champ?.name ?? s.champ} draggable={false} /> : <span className="lane-ghost">{LANE_SHORT[l]}</span>}
                {tier && <i className={`badge t-${tier}`} title={TIER_HINT[tier]}>{tier}</i>}
                {s.champ && p && !tier && p.champions.length > 0 && <i className="badge off" title="Not in this player's pool">?</i>}
              </div>
              <div className="plate">
                <span className="lane-tag">{LANE_SHORT[l]}</span>
                {p && <Avatar key={p.name} name={p.name} size={26} />}
                <select
                  value={s.player ?? ''}
                  onChange={(e) => { setDraft((d) => ({ ...d, [l]: { ...d[l], player: e.target.value || null } })); if (e.target.value) setFocus(e.target.value) }}
                  aria-label={`Player for ${LANE_LABEL[l]}`}
                >
                  <option value="">Player…</option>
                  {players.map((pl) => (
                    <option key={pl.name} value={pl.name} disabled={used.has(pl.name) && pl.name !== s.player}>{pl.name}</option>
                  ))}
                </select>
                {p && lt && lt !== 'main' && <small className="flex-note">flex {lt}</small>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="team">
        <div className="stat">
          <span className="stat-label">Champions</span>
          <strong>{placed}/5</strong>
        </div>
        <div className="stat grow">
          <span className="stat-label">Damage mix</span>
          {team.apShare === null ? <strong>—</strong> : (
            <div className="dmg" title={`${100 - team.apShare}% AD · ${team.apShare}% AP`}>
              <div className="ad" style={{ width: `${100 - team.apShare}%` }}>{100 - team.apShare >= 18 && `AD ${100 - team.apShare}%`}</div>
              <div className="ap" style={{ width: `${team.apShare}%` }}>{team.apShare >= 18 && `AP ${team.apShare}%`}</div>
            </div>
          )}
        </div>
        <div className="stat grow">
          <span className="stat-label">Comp</span>
          <div className="tags">
            {Object.keys(team.tags).length === 0 ? <strong>—</strong> :
              Object.entries(team.tags).map(([t, n]) => <span key={t} className="tag">{t} ×{n}</span>)}
          </div>
        </div>
      </div>
      <Verdict draft={draft} players={players} byId={byId} stats={stats} />
    </section>
  )
}

const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '')
const ROLES = ['All', 'Assassin', 'Fighter', 'Mage', 'Marksman', 'Support', 'Tank']

function Picker({ players, champs, stats, draft, selected, setSelected, focus, setFocus }: Props & {
  draft: Draft; selected: string | null; setSelected: (s: string | null) => void; focus: string; setFocus: (s: string) => void
}) {
  const { start, dragging } = useDnd()
  const [q, setQ] = useState('')
  const [role, setRole] = useState('All')
  const pool = players.find((p) => p.name === focus)?.champions
  const placed = new Set(LANES.map((l) => draft[l].champ).filter(Boolean))
  const list = useMemo(
    () => champs.filter((c) =>
      (norm(c.name).includes(norm(q)) || norm(c.id).includes(norm(q))) &&
      (role === 'All' || c.tags.includes(role)) &&
      (!pool || pool.some((e) => e.id === c.id))),
    [champs, q, role, pool],
  )

  return (
    <aside className="picker card">
      <div className="card-head"><h2>Champions</h2><span className="count">{list.length}</span></div>
      <div className="seg">
        <button className={focus === '' ? 'on' : ''} onClick={() => setFocus('')}>All</button>
        {players.map((p) => (
          <button key={p.name} className={focus === p.name ? 'on' : ''} onClick={() => setFocus(p.name)} title={`${p.name}'s pool`}>{p.name}</button>
        ))}
      </div>
      <input className="search" type="search" placeholder="Search champion…" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" spellCheck={false} />
      <div className="chips">
        {ROLES.map((r) => <button key={r} className={role === r ? 'on' : ''} onClick={() => setRole(r)}>{r}</button>)}
      </div>
      {pool && pool.length === 0 && <p className="empty">{focus} has no champions yet. Add them in <code>src/data/players.json</code>.</p>}
      {list.length === 0 && !(pool && pool.length === 0) && <p className="empty">No champion matches “{q}”.</p>}
      <div className="grid">
        {list.map((c) => {
          const t = pool?.find((e) => e.id === c.id)?.tier
          return (
            <button
              key={c.id}
              className={`tile ${selected === c.id ? 'sel' : ''} ${placed.has(c.id) ? 'placed' : ''} ${dragging === c.id ? 'lifted' : ''}`}
              title={c.name}
              onPointerDown={(e) => start(e, c.id)}
              onClick={() => setSelected(selected === c.id ? null : c.id)}
            >
              <img src={iconUrl(c.id)} alt={c.name} loading="lazy" draggable={false} />
              {t && <i className={`badge t-${t}`}>{t}</i>}
              {(() => { const cs = stats?.players[focus]?.champions[c.id]; const w = winrate(cs); return cs && w !== null && cs.games >= 3 ? <span className={`wrtag ${w < 45 ? 'lo' : ''}`} title={`${w}% over ${cs.games} ranked games`}>{w}%</span> : null })()}
            </button>
          )
        })}
      </div>
      <p className="hint">{selected ? 'Now click a lane on the map to place it.' : 'Tip: on touch screens tap a champion, then tap a lane.'}</p>
    </aside>
  )
}
