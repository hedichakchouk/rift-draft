import { useEffect, useMemo, useState } from 'react'
import playersData from './data/players.json'
import { loadChampions } from './lib/ddragon'
import { loadStats, type Stats } from './lib/stats'
import type { Champion, Player } from './lib/types'
import TierList from './components/TierList'
import DraftPage from './components/DraftPage'
import Guess from './components/Guess'

const players = playersData.players as Player[]
type Page = 'draft' | 'tiers' | 'guess'
const PAGES: { id: Page; label: string }[] = [
  { id: 'draft', label: 'Draft' },
  { id: 'tiers', label: 'Tier Lists' },
  { id: 'guess', label: 'Guess the Champ' },
]
const fromHash = (): Page => {
  const h = location.hash.replace('#', '')
  return h.startsWith('tiers') ? 'tiers' : h.startsWith('guess') ? 'guess' : 'draft'
}

function Logo() {
  return (
    <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden>
      <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f0e6d2" /><stop offset="1" stopColor="#c8aa6e" /></linearGradient></defs>
      <path d="M20 2 36 11v18L20 38 4 29V11z" fill="#0a1220" stroke="url(#lg)" strokeWidth="2" />
      <path d="M13 12v16M27 12v16M13 20h14" stroke="url(#lg)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export default function App() {
  const [page, setPage] = useState<Page>(fromHash)
  const [champs, setChamps] = useState<Champion[]>([])
  const [error, setError] = useState('')
  const [stats, setStats] = useState<Stats | null>(null)
  useEffect(() => { loadStats().then(setStats) }, [])
  useEffect(() => { loadChampions().then(setChamps).catch((e) => setError(String(e))) }, [])
  useEffect(() => {
    const on = () => setPage(fromHash())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const byId = useMemo(() => new Map(champs.map((c) => [c.id, c])), [champs])
  const go = (p: Page) => { setPage(p); if (p !== 'draft') history.replaceState(null, '', `#${p}`) }

  return (
    <div className="app">
      <header className="top">
        <a className="brand" href="#draft" onClick={() => go('draft')}>
          <Logo /><span>HACH <em>DRAFT</em></span>
        </a>
        <nav>
          {PAGES.map((p) => (
            <button key={p.id} className={page === p.id ? 'on' : ''} onClick={() => go(p.id)}>{p.label}</button>
          ))}
        </nav>
      </header>
      <main className="page">
        {error && <p className="err banner">Couldn't load champions from Riot Data Dragon: {error}</p>}
        {page === 'draft' && <DraftPage players={players} champs={champs} byId={byId} stats={stats} />}
        {page === 'tiers' && <TierList players={players} byId={byId} stats={stats} />}
        {page === 'guess' && <Guess champs={champs} />}
      </main>
      <footer>Hach Draft · Champion data &amp; art © Riot Games · Not affiliated with Riot Games</footer>
    </div>
  )
}
