import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { abilityClip, iconUrl, loadDetail, loadSkins, loadSpells, soundUrl, spellUrl, splashUrl, type Skin } from '../lib/ddragon'
import { loadChampData, type ChampFacts } from '../lib/champdata'
import { LANE_SHORT, type Champion, type Lane, type Spell } from '../lib/types'
import { LaneIcon, Pill } from './ui/kit'

type Mode = 'splash' | 'skin' | 'spell' | 'sound' | 'sfx' | 'clues'
const MODES: { id: Mode; label: string; icon: string; desc: string }[] = [
  { id: 'clues', label: 'Clues', icon: '🧩', desc: 'Region, gender, release date and lane' },
  { id: 'skin', label: 'Skin', icon: '🎭', desc: 'Name the champion from a skin' },
  { id: 'splash', label: 'Splash art', icon: '🖼️', desc: 'A zoomed-in piece of the splash' },
  { id: 'spell', label: 'Spell icon', icon: '✨', desc: 'One ability icon' },
  { id: 'sound', label: 'Voice line', icon: '🔊', desc: 'A champion voice line' },
  { id: 'sfx', label: 'Spell sound', icon: '💥', desc: 'Hear a random ability' },
]
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
const ZOOMS = [650, 380, 220]
const BLURS = [12, 6, 2]
const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '')

const bestKey = (m: Mode) => `hd-best-${m}`
const loadBest = (m: Mode) => { try { return Number(localStorage.getItem(bestKey(m)) ?? localStorage.getItem('hd-best') ?? 0) } catch { return 0 } }
const saveBest = (m: Mode, n: number) => { try { localStorage.setItem(bestKey(m), String(n)) } catch { /* ignore */ } }

interface Round { answer: Champion; options: Champion[]; spell?: Spell; skin?: Skin; slot?: 'Q' | 'W' | 'E' | 'R'; slotName?: string; at: { x: number; y: number } }

const canLoad = (src: string) => new Promise<boolean>((res) => { const i = new Image(); const t = setTimeout(() => res(false), 6000); i.onload = () => { clearTimeout(t); res(true) }; i.onerror = () => { clearTimeout(t); res(false) }; i.src = src })
// chroma entries look like "Skin Name (Ruby)" and have no splash art
const isChroma = (n: string) => /\([^)]+\)\s*$/.test(n)

export default function Guess({ champs }: { champs: Champion[] }) {
  const [mode, setMode] = useState<Mode>('clues')
  const [typed, setTyped] = useState(() => { try { return localStorage.getItem('hd-typed') === '1' } catch { return false } })
  const setT = (v: boolean) => { setTyped(v); try { localStorage.setItem('hd-typed', v ? '1' : '0') } catch { /* ignore */ } }
  return (
    <div className="guess-page">
      <div className="modes gx">
        {MODES.map((m) => (
          <button key={m.id} className={`mode ${mode === m.id ? 'on' : ''}`} onClick={() => setMode(m.id)}>
            <span className="mode-ic">{m.icon}</span><b>{m.label}</b><small>{m.desc}</small>
          </button>
        ))}
      </div>
      {mode !== 'clues' && (
        <div className="gx-opts" role="group" aria-label="Answer style">
          <span className="sub">Answers</span>
          <div className="cl-toggle">
            <button className={!typed ? 'on' : ''} onClick={() => setT(false)} title="Pick from 4 suggested champions">Suggestions</button>
            <button className={typed ? 'on' : ''} onClick={() => setT(true)} title="Type the champion name, no hints">Type it</button>
          </div>
        </div>
      )}
      {mode === 'clues' ? <Clues champs={champs} /> : <Choice key={mode} mode={mode} champs={champs} typed={typed} />}
    </div>
  )
}

/* ---------- 4-choice modes: splash, skin, spell, sound ---------- */
function Choice({ mode, champs, typed }: { mode: Exclude<Mode, 'clues'>; champs: Champion[]; typed: boolean }) {
  const [round, setRound] = useState<Round | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [hint, setHint] = useState(0)
  const [stat, setStat] = useState({ ok: 0, total: 0, streak: 0, best: loadBest(mode) })
  const [audioErr, setAudioErr] = useState(false)
  const audio = useRef<HTMLAudioElement>(null)
  const clip = useRef<HTMLVideoElement>(null)
  const [q, setQ] = useState('')
  const done = picked !== null

  const next = useCallback(async () => {
    if (champs.length < 4) return
    setPicked(null); setHint(0); setAudioErr(false); setQ(''); setRound(null)
    const answer = pick(champs)
    const options = [answer]
    while (options.length < 4) { const c = pick(champs); if (!options.includes(c)) options.push(c) }
    options.sort(() => Math.random() - 0.5)
    let spell: Spell | undefined, skin: Skin | undefined
    if (mode === 'spell') { try { spell = pick(await loadSpells(answer.id)) } catch { /* ignore */ } }
    let slot: Round['slot'], slotName: string | undefined
    if (mode === 'skin') {
      skin = { num: 0, name: answer.name }
      try {
        const all = (await loadSkins(answer.id)).filter((s) => s.num !== 0 && !isChroma(s.name)).sort(() => Math.random() - 0.5)
        for (const c of all.slice(0, 5)) { if (await canLoad(splashUrl(answer.id, c.num))) { skin = c; break } }
      } catch { /* default skin */ }
    }
    if (mode === 'sfx') {
      slot = pick(['Q', 'W', 'E', 'R'] as const)
      try { slotName = (await loadSpells(answer.id))['QWER'.indexOf(slot)]?.name } catch { /* ignore */ }
    }
    setRound({ answer, options, spell, skin, slot, slotName, at: { x: 15 + Math.random() * 70, y: 15 + Math.random() * 70 } })
  }, [champs, mode])
  useEffect(() => { next() }, [next])

  const guess = useCallback((c: Champion) => {
    if (!round || done) return
    const ok = c.id === round.answer.id
    setPicked(c.id)
    setStat((s) => {
      const streak = ok ? s.streak + 1 : 0
      const best = Math.max(s.best, streak)
      if (best > s.best) saveBest(mode, best)
      return { ok: s.ok + (ok ? 1 : 0), total: s.total + 1, streak, best }
    })
  }, [round, done, mode])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (!typed && e.key >= '1' && e.key <= '4' && round) guess(round.options[Number(e.key) - 1])
      if (e.key === 'Enter' && done) next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [round, done, guess, next, typed])

  const matches = useMemo(() => {
    const n = norm(q)
    return n ? champs.filter((c) => norm(c.name).startsWith(n) || norm(c.id).startsWith(n)).slice(0, 6) : []
  }, [q, champs])
  const ok = round && picked === round.answer.id
  return (
    <section className="card guess-card">
      <Scoreboard ok={stat.ok} total={stat.total} streak={stat.streak} best={stat.best} />
      {!round ? <p className="empty">Loading champions…</p> : (
        <>
          <div className="stage">
            {mode === 'splash' && (
              <div className="splash" style={{ backgroundImage: `url(${splashUrl(round.answer.id)})`, backgroundSize: done ? 'cover' : `${ZOOMS[hint]}%`, backgroundPosition: done ? 'center' : `${round.at.x}% ${round.at.y}%` }} />
            )}
            {mode === 'skin' && round.skin && (
              <div className="splash skin" style={{ backgroundImage: `url(${splashUrl(round.answer.id, round.skin.num)})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: done ? 'none' : `blur(${BLURS[hint]}px) saturate(${hint === 0 ? 0.6 : 1})` }} />
            )}
            {mode === 'spell' && (round.spell ? <img className="spell-img" src={spellUrl(round.spell.image)} alt="ability icon" /> : <p className="empty">Loading ability…</p>)}
            {mode === 'sound' && (
              <div className="sound">
                <audio ref={audio} src={soundUrl(round.answer.key)} onError={() => setAudioErr(true)} />
                <button className="play" onClick={() => audio.current?.play()} aria-label="Play sound">▶</button>
                {audioErr && <p className="err">Sound unavailable for this champion. Skip to the next one.</p>}
              </div>
            )}
            {mode === 'sfx' && (
              <div className="sound">
                <video ref={clip} className={done ? 'sfx-video' : 'sfx-hidden'} playsInline preload="auto" controls={done} onError={() => setAudioErr(true)} key={`${round.answer.id}${round.slot}`}>
                  <source src={abilityClip(round.answer.key, round.slot!, 'webm')} type="video/webm" />
                  <source src={abilityClip(round.answer.key, round.slot!, 'mp4')} type="video/mp4" />
                </video>
                {!done && <button className="play" onClick={() => { if (clip.current) { clip.current.currentTime = 0; clip.current.play().catch(() => setAudioErr(true)) } }} aria-label="Play ability sound">▶</button>}
                {!done && <p className="sub">Press play to hear one ability. Replay as often as you like.</p>}
                {audioErr && <p className="err">No clip for this ability. Skip to the next one.</p>}
              </div>
            )}
            {done && (
              <div className={`reveal ${ok ? 'ok' : 'ko'}`}>
                <img src={iconUrl(round.answer.id)} alt="" />
                <span>{ok ? 'Correct!' : 'It was'} <b>{round.answer.name}</b>{mode === 'skin' && round.skin && round.skin.num !== 0 ? <small> · {round.skin.name}</small> : null}{mode === 'sfx' && round.slot ? <small> · {round.slot}{round.slotName ? ` · ${round.slotName}` : ''}</small> : null}</span>
              </div>
            )}
          </div>
          {typed ? (
            !done && (
              <div className="cl-input">
                <input className="search" placeholder="Type the champion…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && matches[0]) guess(matches[0]) }} autoComplete="off" spellCheck={false} autoFocus />
                {matches.length > 0 && <div className="cp-results">{matches.map((c) => <button key={c.id} onClick={() => guess(c)}><img src={iconUrl(c.id)} alt="" /><span>{c.name}</span></button>)}</div>}
              </div>
            )
          ) : (
            <div className="options">
              {round.options.map((o, i) => (
                <button key={o.id} disabled={done} className={`opt ${done && o.id === round.answer.id ? 'good' : ''} ${done && o.id === picked && o.id !== round.answer.id ? 'bad' : ''}`} onClick={() => guess(o)}>
                  <kbd>{i + 1}</kbd>{done && <img src={iconUrl(o.id)} alt="" />}<span>{o.name}</span>
                </button>
              ))}
            </div>
          )}
          <div className="actions">
            {(mode === 'splash' || mode === 'skin') && !done && hint < ZOOMS.length - 1 && (
              <button className="btn" onClick={() => setHint(hint + 1)}>{mode === 'skin' ? 'Sharpen (hint)' : 'Zoom out (hint)'}</button>
            )}
            <button className="btn gold" onClick={next}>{done ? 'Next champion →' : 'Skip'}</button>
          </div>
        </>
      )}
    </section>
  )
}

function Scoreboard({ ok, total, streak, best }: { ok: number; total: number; streak: number; best: number }) {
  return (
    <div className="pills">
      <Pill>Score <b>{ok}/{total}</b></Pill>
      <Pill tone={streak >= 3 ? 'good' : 'neutral'}>Streak <b>{streak}</b></Pill>
      <Pill tone="gold">Best <b>{best}</b></Pill>
    </div>
  )
}

/* ---------- Clues: guess from region, gender, release date and lane ---------- */
type Cell = 'ok' | 'part' | 'no'
const seedPick = <T,>(a: T[], seed: string) => { let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0; return a[h % a.length] }
const today = () => new Date().toISOString().slice(0, 10)
const fmtDate = (d: string) => new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

function compare(g: ChampFacts, a: ChampFacts) {
  const lanes: Cell = g.lanes.join() === a.lanes.join() ? 'ok' : g.lanes.some((l) => a.lanes.includes(l)) ? 'part' : 'no'
  const date = g.date === a.date ? 'ok' : 'no'
  return {
    region: (g.region === a.region ? 'ok' : 'no') as Cell, gender: (g.gender === a.gender ? 'ok' : 'no') as Cell, lanes, date: date as Cell,
    dir: g.date < a.date ? '↑' : g.date > a.date ? '↓' : '',
  }
}

function Clues({ champs }: { champs: Champion[] }) {
  const [facts, setFacts] = useState<Record<string, ChampFacts>>({})
  const [daily, setDaily] = useState(false)
  const [answer, setAnswer] = useState<Champion | null>(null)
  const [guesses, setGuesses] = useState<Champion[]>([])
  const [q, setQ] = useState('')
  const [giveUp, setGiveUp] = useState(false)
  const [title, setTitle] = useState('')
  const [stat, setStat] = useState({ ok: 0, total: 0, streak: 0, best: loadBest('clues') })
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => { loadChampData().then(setFacts) }, [])
  const pool = useMemo(() => champs.filter((c) => facts[c.id]), [champs, facts])
  const newRound = useCallback((d = daily) => {
    if (!pool.length) return
    setAnswer(d ? seedPick(pool, today()) : pick(pool)); setGuesses([]); setQ(''); setGiveUp(false); setTitle('')
    setTimeout(() => input.current?.focus(), 50)
  }, [pool, daily])
  useEffect(() => { newRound() }, [pool, daily]) // eslint-disable-line react-hooks/exhaustive-deps

  const won = !!answer && guesses.some((g) => g.id === answer.id)
  const over = won || giveUp
  const matches = useMemo(() => {
    const n = norm(q)
    if (!n) return []
    return pool.filter((c) => !guesses.includes(c) && (norm(c.name).startsWith(n) || norm(c.id).startsWith(n))).slice(0, 6)
  }, [q, pool, guesses])

  const finish = (ok: boolean) => setStat((s) => {
    const streak = ok ? s.streak + 1 : 0
    const best = Math.max(s.best, streak)
    if (best > s.best) saveBest('clues', best)
    return { ok: s.ok + (ok ? 1 : 0), total: s.total + 1, streak, best }
  })
  const add = (c: Champion) => {
    if (!answer || over) return
    setGuesses((g) => [c, ...g]); setQ('')
    if (c.id === answer.id) finish(true)
  }
  const surrender = () => { setGiveUp(true); finish(false) }
  const showTitle = async () => { if (answer) setTitle((await loadDetail(answer.id).catch(() => null))?.title ?? '') }
  const A = answer ? facts[answer.id] : null

  return (
    <section className="card guess-card">
      <div className="cl-top">
        <Scoreboard ok={stat.ok} total={stat.total} streak={stat.streak} best={stat.best} />
        <div className="cl-toggle">
          <button className={!daily ? 'on' : ''} onClick={() => setDaily(false)}>Random</button>
          <button className={daily ? 'on' : ''} onClick={() => setDaily(true)}>Daily</button>
        </div>
      </div>
      {!answer ? <p className="empty">Loading champions…</p> : (
        <>
          <p className="sub cl-help">Guess the champion. Each guess shows how its <b>region</b>, <b>gender</b>, <b>release date</b> and <b>lane</b> compare with the mystery champion. Arrows say if the answer was released later (↑) or earlier (↓).</p>
          {!over && (
            <div className="cl-input">
              <input ref={input} className="search" placeholder="Type a champion…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && matches[0]) add(matches[0]) }} autoComplete="off" spellCheck={false} />
              {matches.length > 0 && <div className="cp-results">{matches.map((c) => <button key={c.id} onClick={() => add(c)}><img src={iconUrl(c.id)} alt="" /><span>{c.name}</span></button>)}</div>}
            </div>
          )}
          {guesses.length > 0 && (
            <div className="cl-table">
              <div className="cl-row head"><span>Champion</span><span>Region</span><span>Gender</span><span>Release</span><span>Lane</span></div>
              {guesses.map((g) => {
                const f = facts[g.id]; const r = A ? compare(f, A) : null
                if (!r) return null
                return (
                  <div className="cl-row" key={g.id}>
                    <span className="cl-champ"><img src={iconUrl(g.id)} alt="" /><small>{g.name}</small></span>
                    <span className={`cl-cell ${r.region}`}>{f.region ?? '?'}</span>
                    <span className={`cl-cell ${r.gender}`}>{f.gender}</span>
                    <span className={`cl-cell ${r.date}`}>{fmtDate(f.date)} {r.dir}</span>
                    <span className={`cl-cell ${r.lanes}`}>{f.lanes.length ? f.lanes.map((l: Lane) => <i key={l} title={l}><LaneIcon lane={l} size={14} />{LANE_SHORT[l]}</i>) : '?'}</span>
                  </div>
                )
              })}
            </div>
          )}
          {over && (
            <div className={`reveal ${won ? 'ok' : 'ko'}`}>
              <img src={iconUrl(answer.id)} alt="" />
              <span>{won ? `Found in ${guesses.length} ${guesses.length === 1 ? 'guess' : 'guesses'}!` : 'It was'} <b>{answer.name}</b></span>
            </div>
          )}
          <div className="actions">
            {!over && guesses.length >= 4 && !title && <button className="btn" onClick={showTitle}>Hint: title</button>}
            {title && !over && <span className="pill">“{title}”</span>}
            {!over && <button className="btn" onClick={surrender}>Give up</button>}
            {over && !daily && <button className="btn gold" onClick={() => newRound()}>Next champion →</button>}
            {over && daily && <span className="sub">Come back tomorrow for a new daily champion.</span>}
          </div>
        </>
      )}
    </section>
  )
}
