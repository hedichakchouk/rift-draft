import { useMemo, useState } from 'react'
import { iconUrl } from '../lib/ddragon'
import type { Champion } from '../lib/types'
import Guess from './Guess'

interface Props { champs: Champion[]; selected: string | null; onSelect: (id: string | null) => void }
const ROLES = ['All', 'Assassin', 'Fighter', 'Mage', 'Marksman', 'Support', 'Tank']

export default function Sidebar({ champs, selected, onSelect }: Props) {
  const [tab, setTab] = useState<'champs' | 'guess'>('champs')
  const [q, setQ] = useState('')
  const [role, setRole] = useState('All')
  const list = useMemo(
    () => champs.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) && (role === 'All' || c.tags.includes(role))),
    [champs, q, role],
  )

  return (
    <aside>
      <div className="tabs">
        <button className={tab === 'champs' ? 'on' : ''} onClick={() => setTab('champs')}>Champions ({champs.length})</button>
        <button className={tab === 'guess' ? 'on' : ''} onClick={() => setTab('guess')}>🎮 Guess</button>
      </div>
      {tab === 'champs' ? (
        <>
          <input placeholder="Search champion…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="roles">
            {ROLES.map((r) => <button key={r} className={role === r ? 'on' : ''} onClick={() => setRole(r)}>{r}</button>)}
          </div>
          <div className="grid">
            {list.map((c) => (
              <img
                key={c.id}
                src={iconUrl(c.id)}
                alt={c.name}
                title={c.name}
                loading="lazy"
                draggable
                className={selected === c.id ? 'sel' : ''}
                onDragStart={(e) => { e.dataTransfer.setData('text/champ', c.id); e.dataTransfer.effectAllowed = 'copy' }}
                onClick={() => onSelect(selected === c.id ? null : c.id)}
              />
            ))}
          </div>
        </>
      ) : (
        <Guess champs={champs} />
      )}
    </aside>
  )
}
