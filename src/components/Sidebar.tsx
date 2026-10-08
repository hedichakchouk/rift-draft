import { useMemo, useState } from 'react'
import { iconUrl } from '../lib/ddragon'
import type { Champion, Player } from '../lib/types'
import Guess from './Guess'

interface Props { players: Player[]; champs: Champion[]; selected: string | null; onSelect: (id: string | null) => void }
const ROLES = ['All', 'Assassin', 'Fighter', 'Mage', 'Marksman', 'Support', 'Tank']

export default function Sidebar({ players, champs, selected, onSelect }: Props) {
  const [tab, setTab] = useState<'champs' | 'guess'>('champs')
  const [q, setQ] = useState('')
  const [role, setRole] = useState('All')
  const [poolOf, setPoolOf] = useState('')
  const pool = players.find((p) => p.name === poolOf)?.champions
  const list = useMemo(
    () => champs.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) && (role === 'All' || c.tags.includes(role)) && (!pool || pool.some((e) => e.id === c.id))),
    [champs, q, role, pool],
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
          <select value={poolOf} onChange={(e) => setPoolOf(e.target.value)} style={{ width: '100%', marginTop: 6 }}>
            <option value="">All champions</option>
            {players.map((p) => <option key={p.name} value={p.name}>Only {p.name}'s pool</option>)}
          </select>
          <div className="roles">
            {ROLES.map((r) => <button key={r} className={role === r ? 'on' : ''} onClick={() => setRole(r)}>{r}</button>)}
          </div>
          <div className="grid">
            {list.map((c) => (
              <span key={c.id} className="cell">
              <img
                src={iconUrl(c.id)}
                alt={c.name}
                title={c.name}
                loading="lazy"
                draggable
                className={selected === c.id ? 'sel' : ''}
                onDragStart={(e) => { e.dataTransfer.setData('text/champ', c.id); e.dataTransfer.effectAllowed = 'copy' }}
                onClick={() => onSelect(selected === c.id ? null : c.id)}
              />
              {pool && <i className={`t-${pool.find((e) => e.id === c.id)?.tier}`}>{pool.find((e) => e.id === c.id)?.tier}</i>}
              </span>
            ))}
          </div>
        </>
      ) : (
        <Guess champs={champs} />
      )}
    </aside>
  )
}
