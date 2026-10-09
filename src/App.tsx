import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import playersData from './data/players.json'
import { loadChampions } from './lib/ddragon'
import { loadStats, type Stats } from './lib/stats'
import type { Champion, Player } from './lib/types'
import TierList from './components/TierList'
import DraftPage from './components/DraftPage'
import Guess from './components/Guess'
import Highlights from './components/Highlights'
import Support from './components/Support'
import Account from './components/Account'
import Laning from './components/laning/Laning'
import Coach from './components/Coach'
import ErrorBoundary from './components/ErrorBoundary'
import ProfileModal, { ProfileChip, shouldOnboard } from './components/Profile'
import { Icon } from './components/ui/kit'
import { useVisitor } from './lib/profile'

const players = playersData.players as Player[]
type Page = 'draft' | 'tiers' | 'laning' | 'account' | 'clips' | 'guess'
const PAGES: { id: Page; label: string; short: string; icon: JSX.Element }[] = [
  { id: 'draft', label: 'Draft', short: 'Draft', icon: Icon.map },
  { id: 'tiers', label: 'Tier Lists', short: 'Tiers', icon: Icon.crown },
  { id: 'laning', label: 'Laning', short: 'Laning', icon: Icon.swords },
  { id: 'account', label: 'My Account', short: 'Account', icon: Icon.user },
  { id: 'clips', label: 'Highlights', short: 'Clips', icon: Icon.play },
  { id: 'guess', label: 'Guess the Champ', short: 'Guess', icon: Icon.eye },
]
const fromHash = (): Page => {
  const h = location.hash.replace('#', '')
  return h.startsWith('tiers') ? 'tiers' : h.startsWith('laning') ? 'laning' : h.startsWith('account') ? 'account' : h.startsWith('clips') ? 'clips' : h.startsWith('guess') ? 'guess' : 'draft'
}

function Logo() {
  return (
    <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden className="logo">
      <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f6ecd2" /><stop offset="1" stopColor="#c8aa6e" /></linearGradient></defs>
      <path d="M20 2 36 11v18L20 38 4 29V11z" fill="#0a1220" stroke="url(#lg)" strokeWidth="2" />
      <path d="M13 12v16M27 12v16M13 20h14" stroke="url(#lg)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function MainNav({ page, go }: { page: Page; go: (p: Page) => void }) {
  const ref = useRef<HTMLElement>(null)
  const [ind, setInd] = useState<{ x: number; w: number } | null>(null)
  const measure = () => {
    const el = ref.current?.querySelector<HTMLButtonElement>(`[data-page="${page}"]`)
    if (el) setInd((p) => (p && p.x === el.offsetLeft && p.w === el.offsetWidth ? p : { x: el.offsetLeft, w: el.offsetWidth }))
  }
  useLayoutEffect(measure)
  useEffect(() => { window.addEventListener('resize', measure); document.fonts?.ready.then(measure); return () => window.removeEventListener('resize', measure) }, [page])
  return (
    <nav className="mainnav" ref={ref} aria-label="Main">
      {ind && <span className="nav-ind" style={{ transform: `translateX(${ind.x}px)`, width: ind.w }} />}
      {PAGES.map((p) => (
        <button key={p.id} data-page={p.id} className={page === p.id ? 'on' : ''} aria-current={page === p.id ? 'page' : undefined} onClick={() => go(p.id)}>
          {p.icon}<span className="nl-long">{p.label}</span><span className="nl-short">{p.short}</span>
        </button>
      ))}
    </nav>
  )
}

export default function App() {
  const [page, setPage] = useState<Page>(fromHash)
  const [champs, setChamps] = useState<Champion[]>([])
  const [error, setError] = useState('')
  const [stats, setStats] = useState<Stats | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const visitor = useVisitor()
  useEffect(() => { loadStats().then(setStats) }, [])
  useEffect(() => { loadChampions().then(setChamps).catch((e) => setError(String(e))) }, [])
  useEffect(() => {
    const on = () => setPage(fromHash())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  // first visit: ask who they are (once; "skip" is remembered)
  useEffect(() => { if (!visitor && shouldOnboard()) { const t = setTimeout(() => setProfileOpen(true), 2500); return () => clearTimeout(t) } }, []) // eslint-disable-line
  const byId = useMemo(() => new Map(champs.map((c) => [c.id, c])), [champs])
  const go = (p: Page) => { setPage(p); if (p !== 'draft') history.replaceState(null, '', `#${p}`); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return (
    <div className="app">
      <div className="aurora" aria-hidden><i /><i /><i /></div>
      <header className="top">
        <a className="brand" href="#draft" onClick={() => go('draft')}>
          <Logo /><span>HACH <em>DRAFT</em></span>
        </a>
        <MainNav page={page} go={go} />
        <ProfileChip onOpen={() => setProfileOpen(true)} players={players} />
      </header>
      <main className="page" key={page}><ErrorBoundary label={page}>
        {error && <p className="err banner">Couldn't load champions from Riot Data Dragon: {error}</p>}
        {page === 'draft' && <DraftPage players={players} champs={champs} byId={byId} stats={stats} />}
        {page === 'tiers' && <TierList players={players} byId={byId} stats={stats} />}
        {page === 'laning' && <Laning players={players} champs={champs} byId={byId} stats={stats} />}
        {page === 'account' && <Account champs={champs} byId={byId} stats={stats} />}
        {page === 'clips' && <Highlights />}
        {page === 'guess' && <Guess champs={champs} />}
      </ErrorBoundary></main>
      <Support />
      <footer>Hach Draft · Champion data &amp; art © Riot Games · Matchup data from lolalytics · Not affiliated with Riot Games</footer>
      <ErrorBoundary label="the coach"><Coach /></ErrorBoundary>
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} players={players} champs={champs} />
    </div>
  )
}
