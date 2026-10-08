import { useEffect, useMemo, useState } from 'react'
import playersData from './data/players.json'
import { loadChampions } from './lib/ddragon'
import type { Champion, Player } from './lib/types'
import TierList from './components/TierList'
import DraftBoard from './components/DraftBoard'
import Sidebar from './components/Sidebar'

const players = playersData.players as Player[]
type Page = 'tiers' | 'draft'

export default function App() {
  const [page, setPage] = useState<Page>(location.hash.startsWith('#draft') ? 'draft' : 'tiers')
  const [champs, setChamps] = useState<Champion[]>([])
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<string | null>(null) // tap-to-place (mobile)

  useEffect(() => {
    loadChampions().then(setChamps).catch((e) => setError(String(e)))
  }, [])
  const byId = useMemo(() => new Map(champs.map((c) => [c.id, c])), [champs])

  return (
    <div className="app">
      <header>
        <h1>⚔️ Rift Draft</h1>
        <nav>
          <button className={page === 'tiers' ? 'on' : ''} onClick={() => setPage('tiers')}>Tier List</button>
          <button className={page === 'draft' ? 'on' : ''} onClick={() => setPage('draft')}>Draft Board</button>
        </nav>
      </header>
      <div className="layout">
        <main>
          {error && <p className="err">Could not load champions from Riot Data Dragon: {error}</p>}
          {page === 'tiers' ? (
            <TierList players={players} byId={byId} />
          ) : (
            <DraftBoard players={players} byId={byId} selected={selected} clearSelected={() => setSelected(null)} />
          )}
        </main>
        <Sidebar champs={champs} selected={selected} onSelect={setSelected} />
      </div>
    </div>
  )
}
