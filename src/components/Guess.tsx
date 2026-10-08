import { useCallback, useEffect, useRef, useState } from 'react'
import { loadSpells, soundUrl, spellUrl, splashUrl } from '../lib/ddragon'
import type { Champion, Spell } from '../lib/types'

type Mode = 'splash' | 'spell' | 'sound'
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]

interface Round { answer: Champion; options: Champion[]; spell?: Spell; zoom: { x: number; y: number } }

export default function Guess({ champs }: { champs: Champion[] }) {
  const [mode, setMode] = useState<Mode>('splash')
  const [round, setRound] = useState<Round | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [score, setScore] = useState({ ok: 0, total: 0, streak: 0 })
  const [audioErr, setAudioErr] = useState(false)
  const audio = useRef<HTMLAudioElement>(null)

  const next = useCallback(async () => {
    if (champs.length < 4) return
    setResult(null); setAudioErr(false)
    const answer = pick(champs)
    const options = [answer]
    while (options.length < 4) { const c = pick(champs); if (!options.includes(c)) options.push(c) }
    options.sort(() => Math.random() - 0.5)
    let spell: Spell | undefined
    if (mode === 'spell') {
      try { spell = pick(await loadSpells(answer.id)) } catch { /* ignore */ }
    }
    setRound({ answer, options, spell, zoom: { x: Math.random() * 100, y: Math.random() * 100 } })
  }, [champs, mode])

  useEffect(() => { next() }, [next])

  const guess = (c: Champion) => {
    if (!round || result) return
    const ok = c.id === round.answer.id
    setResult(ok ? 'Correct!' : `Nope — it was ${round.answer.name}`)
    setScore((s) => ({ ok: s.ok + (ok ? 1 : 0), total: s.total + 1, streak: ok ? s.streak + 1 : 0 }))
  }

  return (
    <div className="guess">
      <div className="roles">
        {(['splash', 'spell', 'sound'] as Mode[]).map((m) => (
          <button key={m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>{m}</button>
        ))}
      </div>
      <div className="score">Score {score.ok}/{score.total} · streak {score.streak}</div>
      {round && (
        <>
          <div className="clue">
            {mode === 'splash' && (
              <div
                className="splash"
                style={{
                  backgroundImage: `url(${splashUrl(round.answer.id)})`,
                  backgroundSize: result ? 'cover' : '500%',
                  backgroundPosition: result ? 'center' : `${round.zoom.x}% ${round.zoom.y}%`,
                }}
              />
            )}
            {mode === 'spell' && (round.spell ? <img className="spell" src={spellUrl(round.spell.image)} alt="spell" /> : <p className="muted">Loading spell…</p>)}
            {mode === 'sound' && (
              <>
                <audio ref={audio} src={soundUrl(round.answer.key)} onError={() => setAudioErr(true)} />
                <button className="play" onClick={() => audio.current?.play()}>▶ Play sound</button>
                {audioErr && <p className="err">Sound unavailable for this champion — try another.</p>}
              </>
            )}
          </div>
          <div className="options">
            {round.options.map((o) => (
              <button
                key={o.id}
                onClick={() => guess(o)}
                className={result ? (o.id === round.answer.id ? 'good' : '') : ''}
              >{o.name}</button>
            ))}
          </div>
          {result && <p className="result">{result}</p>}
          <button className="next" onClick={next}>{result ? 'Next →' : 'Skip'}</button>
        </>
      )}
    </div>
  )
}
