import { useCallback, useEffect, useRef, useState } from 'react'
import { iconUrl, loadSpells, soundUrl, spellUrl, splashUrl } from '../lib/ddragon'
import type { Champion, Spell } from '../lib/types'

type Mode = 'splash' | 'spell' | 'sound'
const MODES: { id: Mode; label: string; icon: string; desc: string }[] = [
  { id: 'splash', label: 'Splash art', icon: '🖼️', desc: 'A zoomed-in piece of a splash art' },
  { id: 'spell', label: 'Spell icon', icon: '✨', desc: 'Guess from one ability icon' },
  { id: 'sound', label: 'Sound', icon: '🔊', desc: 'Listen to the champion voice line' },
]
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
const ZOOMS = [650, 380, 220]

interface Round { answer: Champion; options: Champion[]; spell?: Spell; at: { x: number; y: number } }

function loadBest() { try { return Number(localStorage.getItem('hd-best') ?? 0) } catch { return 0 } }
function saveBest(n: number) { try { localStorage.setItem('hd-best', String(n)) } catch { /* ignore */ } }

export default function Guess({ champs }: { champs: Champion[] }) {
  const [mode, setMode] = useState<Mode>('splash')
  const [round, setRound] = useState<Round | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [zoom, setZoom] = useState(0)
  const [stat, setStat] = useState({ ok: 0, total: 0, streak: 0, best: loadBest() })
  const [audioErr, setAudioErr] = useState(false)
  const audio = useRef<HTMLAudioElement>(null)
  const done = picked !== null

  const next = useCallback(async () => {
    if (champs.length < 4) return
    setPicked(null); setZoom(0); setAudioErr(false)
    const answer = pick(champs)
    const options = [answer]
    while (options.length < 4) { const c = pick(champs); if (!options.includes(c)) options.push(c) }
    options.sort(() => Math.random() - 0.5)
    let spell: Spell | undefined
    if (mode === 'spell') { try { spell = pick(await loadSpells(answer.id)) } catch { /* ignore */ } }
    setRound({ answer, options, spell, at: { x: 15 + Math.random() * 70, y: 15 + Math.random() * 70 } })
  }, [champs, mode])
  useEffect(() => { next() }, [next])

  const guess = useCallback((c: Champion) => {
    if (!round || done) return
    const ok = c.id === round.answer.id
    setPicked(c.id)
    setStat((s) => {
      const streak = ok ? s.streak + 1 : 0
      const best = Math.max(s.best, streak)
      if (best > s.best) saveBest(best)
      return { ok: s.ok + (ok ? 1 : 0), total: s.total + 1, streak, best }
    })
  }, [round, done])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (e.key >= '1' && e.key <= '4' && round) guess(round.options[Number(e.key) - 1])
      if (e.key === 'Enter' && done) next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [round, done, guess, next])

  return (
    <div className="guess-page">
      <div className="modes">
        {MODES.map((m) => (
          <button key={m.id} className={`mode ${mode === m.id ? 'on' : ''}`} onClick={() => setMode(m.id)}>
            <span className="mode-ic">{m.icon}</span><b>{m.label}</b><small>{m.desc}</small>
          </button>
        ))}
      </div>

      <section className="card guess-card">
        <div className="pills">
          <span className="pill">Score <b>{stat.ok}/{stat.total}</b></span>
          <span className="pill">Streak <b>{stat.streak}</b></span>
          <span className="pill">Best <b>{stat.best}</b></span>
        </div>

        {!round ? <p className="empty">Loading champions…</p> : (
          <>
            <div className="stage">
              {mode === 'splash' && (
                <div
                  className="splash"
                  style={{
                    backgroundImage: `url(${splashUrl(round.answer.id)})`,
                    backgroundSize: done ? 'cover' : `${ZOOMS[zoom]}%`,
                    backgroundPosition: done ? 'center' : `${round.at.x}% ${round.at.y}%`,
                  }}
                />
              )}
              {mode === 'spell' && (round.spell
                ? <img className="spell-img" src={spellUrl(round.spell.image)} alt="ability icon" />
                : <p className="empty">Loading ability…</p>)}
              {mode === 'sound' && (
                <div className="sound">
                  <audio ref={audio} src={soundUrl(round.answer.key)} onError={() => setAudioErr(true)} />
                  <button className="play" onClick={() => audio.current?.play()} aria-label="Play sound">▶</button>
                  {audioErr && <p className="err">Sound unavailable for this champion. Skip to the next one.</p>}
                </div>
              )}
              {done && (
                <div className={`reveal ${picked === round.answer.id ? 'ok' : 'ko'}`}>
                  <img src={iconUrl(round.answer.id)} alt="" />
                  <span>{picked === round.answer.id ? 'Correct!' : 'It was'} <b>{round.answer.name}</b></span>
                </div>
              )}
            </div>

            <div className="options">
              {round.options.map((o, i) => (
                <button
                  key={o.id}
                  disabled={done}
                  className={`opt ${done && o.id === round.answer.id ? 'good' : ''} ${done && o.id === picked && o.id !== round.answer.id ? 'bad' : ''}`}
                  onClick={() => guess(o)}
                >
                  <kbd>{i + 1}</kbd>{o.name}
                </button>
              ))}
            </div>

            <div className="actions">
              {mode === 'splash' && !done && zoom < ZOOMS.length - 1 && (
                <button className="btn" onClick={() => setZoom(zoom + 1)}>Zoom out (hint)</button>
              )}
              <button className="btn gold" onClick={next}>{done ? 'Next champion →' : 'Skip'}</button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
