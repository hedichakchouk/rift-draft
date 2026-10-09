import { useMemo, useState } from 'react'
import { iconUrl } from '../lib/ddragon'
import { setMyPool, useMyPool, type MyPool } from '../lib/profile'
import { LANES, LANE_SHORT, type Champion, type Lane, type Player, type Tier } from '../lib/types'
import { Icon, LaneIcon } from './ui/kit'

const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '')
const CYCLE: Tier[] = ['S', 'A', 'B']

export function ProfileChip({ onOpen }: { onOpen: () => void; players?: Player[] }) {
  const pool = useMyPool()
  return (
    <button className={`profile-chip ${pool ? '' : 'empty'}`} onClick={onOpen} title="Your champion pool">
      {Icon.user}<span className="pc-name">{pool ? `${pool.name || 'My pool'} · ${pool.champions.length}` : 'My pool'}</span>
    </button>
  )
}

/** The visitor's own champion pool: the Co-pilot ranks picks by it. Saved on this device, free, no account. */
export default function ProfileModal({ open, onClose, champs }: { open: boolean; onClose: () => void; players?: Player[]; champs: Champion[] }) {
  const saved = useMyPool()
  const [draft, setDraft] = useState<MyPool | null>(null)
  const [q, setQ] = useState('')
  const cur: MyPool = draft ?? saved ?? { name: '', lane: 'mid', champions: [] }
  const chosen = new Map(cur.champions.map((c) => [c.id, c.tier]))
  const list = useMemo(() => champs.filter((c) => !q || norm(c.name).includes(norm(q)) || norm(c.id).includes(norm(q))), [champs, q])
  if (!open) return null

  const blank: MyPool = { name: '', lane: 'mid', champions: [] }
  const upd = (f: (p: MyPool) => MyPool) => setDraft((d) => f(d ?? saved ?? blank))
  const edit = (p: Partial<MyPool>) => upd((x) => ({ ...x, ...p }))
  const toggle = (id: string) => upd((x) => ({ ...x, champions: x.champions.some((c) => c.id === id) ? x.champions.filter((c) => c.id !== id) : [...x.champions, { id, tier: 'A' }] }))
  const cycle = (id: string) => upd((x) => ({ ...x, champions: x.champions.map((c) => (c.id === id ? { ...c, tier: CYCLE[(CYCLE.indexOf(c.tier) + 1) % CYCLE.length] } : c)) }))
  const close = () => { setDraft(null); setQ(''); onClose() }
  const save = () => { setMyPool(cur.champions.length ? cur : null); close() }

  return (
    <div className="modal-back" onClick={close}>
      <div className="modal profile-modal mypool" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="My champion pool">
        <button className="modal-x" onClick={close}>{Icon.close}</button>
        <div className="pm-form">
          <h2>My champion pool</h2>
          <p className="sub">Pick the champions you play. The Draft Co-pilot then ranks picks from your pool first. Saved on this device only, no account needed.</p>
          <label className="pm-field"><span>Name (optional)</span><input className="search" placeholder="Your name" value={cur.name} maxLength={16} onChange={(e) => edit({ name: e.target.value })} /></label>
          <div className="cp-lanes">
            {LANES.map((l: Lane) => <button key={l} className={cur.lane === l ? 'on' : ''} onClick={() => edit({ lane: l })}><LaneIcon lane={l} size={18} /><span>{LANE_SHORT[l]}</span></button>)}
          </div>
          {cur.champions.length > 0 && (
            <div className="mp-chosen">
              {cur.champions.map((c) => (
                <div key={c.id} className="mp-pick" title="Tap the tier to change it, tap the icon to remove">
                  <button className="pic" onClick={() => toggle(c.id)}><img src={iconUrl(c.id)} alt="" /></button>
                  <button className={`badge-t t-${c.tier}`} onClick={() => cycle(c.id)}>{c.tier}</button>
                </div>
              ))}
            </div>
          )}
          <input className="search" type="search" placeholder="Search champion…" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
          <div className="mp-grid">
            {list.map((c) => <button key={c.id} className={`mp-tile ${chosen.has(c.id) ? 'on' : ''}`} onClick={() => toggle(c.id)} title={c.name}><img src={iconUrl(c.id)} alt={c.name} loading="lazy" /></button>)}
          </div>
          <div className="pm-actions">
            <button className="btn gold big" onClick={save}>Save pool ({cur.champions.length})</button>
            {saved && <button className="btn" onClick={() => { setMyPool(null); close() }}>Clear</button>}
          </div>
        </div>
      </div>
    </div>
  )
}

export const shouldOnboard = () => false
