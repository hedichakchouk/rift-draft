import { useMemo, useState, type ReactNode } from 'react'
import { iconUrl, loadingUrl } from '../../lib/ddragon'
import type { Champion, Lane } from '../../lib/types'
import { LaneIcon, MetaTier } from '../ui/kit'

const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '')

export interface QuickGroup { title: ReactNode; items: { id: string; badge?: ReactNode; sub?: string }[] }

export function ChampSlot({ label, lane, tone, value, onChange, champs, byId, quick, metaTier, compact }: {
  label: string; lane: Lane; tone: 'ally' | 'enemy'; value: string | null; onChange: (id: string | null) => void
  champs: Champion[]; byId: Map<string, Champion>; quick: QuickGroup[]; metaTier?: (id: string) => string | null; compact?: boolean
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const res = useMemo(() => (q ? champs.filter((c) => norm(c.name).includes(norm(q)) || norm(c.id).includes(norm(q))).slice(0, 8) : []), [q, champs])
  const cur = value ? byId.get(value) : null
  const pick = (id: string) => { onChange(id); setQ(''); setOpen(false) }

  if (cur) return (
    <div className={`slot2 ${tone} chosen ${compact ? 'compact' : ''}`}>
      <div className="slot2-art" style={{ backgroundImage: `url(${loadingUrl(cur.id)})` }} />
      <div className="slot2-body">
        <span className="slot2-label"><LaneIcon lane={lane} size={14} /> {label}</span>
        <strong className="slot2-name">{cur.name}</strong>
        <div className="slot2-meta">{metaTier && <MetaTier tier={metaTier(cur.id)} />}<span className="muted">{cur.tags.join(' · ')}</span></div>
      </div>
      <button className="slot2-change" onClick={() => onChange(null)} title="Change champion">↺</button>
    </div>
  )

  return (
    <div className={`slot2 ${tone} ${compact ? 'compact' : ''}`}>
      <span className="slot2-label"><LaneIcon lane={lane} size={14} /> {label}</span>
      <div className="slot2-search">
        <input className="search" type="search" placeholder="Search a champion…" value={q} autoComplete="off" spellCheck={false}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' && res[0]) pick(res[0].id) }} />
        {open && res.length > 0 && (
          <div className="slot2-results">
            {res.map((c) => (
              <button key={c.id} onClick={() => pick(c.id)}>
                <img src={iconUrl(c.id)} alt="" />{c.name}
                {metaTier && <MetaTier tier={metaTier(c.id)} />}
              </button>
            ))}
          </div>
        )}
      </div>
      {quick.filter((g) => g.items.length).map((g, i) => (
        <div className="slot2-quick" key={i}>
          <span className="slot2-qt">{g.title}</span>
          <div className="slot2-grid">
            {g.items.map((it) => (
              <button key={it.id} onClick={() => pick(it.id)} title={`${byId.get(it.id)?.name ?? it.id}${it.sub ? ' · ' + it.sub : ''}`}>
                <img src={iconUrl(it.id)} alt="" loading="lazy" />
                {it.badge}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
