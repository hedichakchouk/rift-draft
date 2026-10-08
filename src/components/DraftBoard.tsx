import { useEffect, useState } from 'react'
import { iconUrl } from '../lib/ddragon'
import { autoAssign, decodeDraft, emptyDraft, encodeDraft, type Draft } from '../lib/draft'
import { LANES, LANE_LABEL, type Champion, type Lane, type Player } from '../lib/types'

interface Props {
  players: Player[]
  byId: Map<string, Champion>
  selected: string | null
  clearSelected: () => void
}

// Position of each lane slot on the map (% of the map box).
const POS: Record<Lane, { left: number; top: number }> = {
  top: { left: 14, top: 18 },
  jungle: { left: 33, top: 50 },
  mid: { left: 50, top: 33 },
  bot: { left: 76, top: 84 },
  support: { left: 90, top: 62 },
}

function initial(): Draft {
  const m = location.hash.match(/[?&]d=([^&]+)/)
  return (m && decodeDraft(m[1])) || emptyDraft()
}

export default function DraftBoard({ players, byId, selected, clearSelected }: Props) {
  const [draft, setDraft] = useState<Draft>(initial)
  const [copied, setCopied] = useState(false)
  const [over, setOver] = useState<Lane | null>(null)

  useEffect(() => {
    history.replaceState(null, '', `#draft?d=${encodeDraft(draft)}`)
  }, [draft])

  const setSlot = (l: Lane, patch: Partial<Draft[Lane]>) => setDraft((d) => ({ ...d, [l]: { ...d[l], ...patch } }))
  const used = new Set(LANES.map((l) => draft[l].player).filter(Boolean))

  const drop = (l: Lane, e: React.DragEvent) => {
    e.preventDefault()
    setOver(null)
    const id = e.dataTransfer.getData('text/champ')
    if (id) setSlot(l, { champ: id })
  }
  const tapPlace = (l: Lane) => {
    if (selected) { setSlot(l, { champ: selected }); clearSelected() }
  }
  const autoFill = () => {
    const a = autoAssign(players)
    setDraft((d) => Object.fromEntries(LANES.map((l) => [l, { ...d[l], player: a[l] }])) as Draft)
  }
  const share = async () => {
    try { await navigator.clipboard.writeText(location.href); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* ignore */ }
  }

  return (
    <section>
      <div className="toolbar">
        <h2>Draft Board</h2>
        <div className="btns">
          <button onClick={autoFill}>✨ Auto best lineup</button>
          <button onClick={() => setDraft(emptyDraft())}>Clear</button>
          <button onClick={share}>{copied ? 'Copied!' : '🔗 Share link'}</button>
        </div>
      </div>
      <p className="muted">Drag a champion from the sidebar onto a lane (or tap a champion, then tap a lane). Pick the player for each lane.</p>
      <div className="map">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="map-bg" aria-hidden>
          <rect width="100" height="100" fill="#10261a" />
          {/* river */}
          <path d="M0 100 L100 0 L100 12 L12 100 Z" fill="#1d4b6b" opacity=".75" />
          {/* lanes */}
          <g fill="none" stroke="#7a6a45" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity=".85">
            <path d="M8 92 L8 10 L90 10" />
            <path d="M8 92 L92 8" />
            <path d="M8 92 L90 92 L92 10" />
          </g>
          {/* jungle blobs */}
          <g fill="#173d27"><circle cx="28" cy="62" r="9" /><circle cx="72" cy="38" r="9" /><circle cx="25" cy="30" r="7" /><circle cx="75" cy="70" r="7" /></g>
          {/* bases */}
          <circle cx="10" cy="90" r="8" fill="#2a6bd1" opacity=".9" />
          <circle cx="90" cy="10" r="8" fill="#c23a3a" opacity=".9" />
          <text x="10" y="91.5" fontSize="3" fill="#fff" textAnchor="middle">BLUE</text>
          <text x="90" y="11.5" fontSize="3" fill="#fff" textAnchor="middle">RED</text>
        </svg>
        {LANES.map((l) => {
          const s = draft[l]
          const p = players.find((x) => x.name === s.player)
          const champ = s.champ ? byId.get(s.champ) : undefined
          const poolTier = p && s.champ ? p.champions.find((c) => c.id === s.champ)?.tier : undefined
          return (
            <div
              key={l}
              className={`slot ${over === l ? 'over' : ''}`}
              style={{ left: `${POS[l].left}%`, top: `${POS[l].top}%` }}
              onDragOver={(e) => { e.preventDefault(); setOver(l) }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => drop(l, e)}
              onClick={() => tapPlace(l)}
            >
              <div className="slot-lane">{LANE_LABEL[l]}</div>
              <div className="slot-champ">
                {s.champ ? (
                  <>
                    <img src={iconUrl(s.champ)} alt={champ?.name ?? s.champ} />
                    <button className="x" onClick={(e) => { e.stopPropagation(); setSlot(l, { champ: null }) }}>×</button>
                  </>
                ) : <span>drop</span>}
              </div>
              <select value={s.player ?? ''} onClick={(e) => e.stopPropagation()} onChange={(e) => setSlot(l, { player: e.target.value || null })}>
                <option value="">Player…</option>
                {players.map((pl) => (
                  <option key={pl.name} value={pl.name} disabled={used.has(pl.name) && pl.name !== s.player}>{pl.name}</option>
                ))}
              </select>
              {p && (
                <div className="slot-meta">
                  <span className={`chip t-${p.lanes[l] ?? 'none'}`}>{LANE_LABEL[l].slice(0, 3)} {p.lanes[l] ?? '–'}</span>
                  {s.champ && <span className={`chip t-${poolTier ?? 'none'}`} title="Player's tier on this champion">{poolTier ? `${champ?.name} ${poolTier}` : 'off-pool'}</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
