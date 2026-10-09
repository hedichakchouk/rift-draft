import { useEffect, useMemo, useRef, useState, type PointerEvent as RPE, type ReactNode } from 'react'
import { apiUrl, streamChat, type ChatMsg } from '../lib/api'
import { freeAnswer } from '../lib/brain'
import { loadingUrl, splashUrl } from '../lib/ddragon'
import { getCoachContext, useVisitor } from '../lib/profile'
import { Icon, threshVoice } from './ui/kit'

const STORE = 'hach.coach.chat'
const GREETING = "The lantern is lit. I've walked the Rift for twenty years: pro stages, coaching rooms, the top of solo queue. Ask me about your matchup, your build, your macro, or how to use this site."

// ---------- tiny markdown: **bold**, `code`, lists, paragraphs ----------
function inline(t: string, k: string): ReactNode[] {
  return t.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) =>
    part.startsWith('**') ? <b key={k + i}>{part.slice(2, -2)}</b> : part.startsWith('`') ? <code key={k + i}>{part.slice(1, -1)}</code> : part)
}
function Md({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  let list: { ordered: boolean; items: string[] } | null = null
  const flush = () => { if (list) { const L = list.ordered ? 'ol' : 'ul'; blocks.push(<L key={blocks.length}>{list.items.map((it, i) => <li key={i}>{inline(it, `l${i}`)}</li>)}</L>); list = null } }
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd()
    const ul = line.match(/^\s*[-*•]\s+(.*)/), ol = line.match(/^\s*\d+[.)]\s+(.*)/)
    if (ul || ol) {
      const ordered = !!ol
      if (!list || list.ordered !== ordered) { flush(); list = { ordered, items: [] } }
      list.items.push((ul ?? ol)![1])
    } else if (/^#{1,4}\s/.test(line)) { flush(); blocks.push(<h5 key={blocks.length}>{inline(line.replace(/^#+\s/, ''), 'h')}</h5>) }
    else if (line.trim() === '') flush()
    else { flush(); blocks.push(<p key={blocks.length}>{inline(line, `p${blocks.length}`)}</p>) }
  }
  flush()
  return <>{blocks}</>
}

// ---------- spectral particles ----------
function Wisps({ count = 34 }: { count?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if (!c) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = c.getContext('2d')!; let raf = 0
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const resize = () => { c.width = c.offsetWidth * dpr; c.height = c.offsetHeight * dpr }
    resize()
    const ps = Array.from({ length: count }, () => ({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 2.2, v: 0.0006 + Math.random() * 0.0016, d: Math.random() * Math.PI * 2 }))
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height)
      for (const p of ps) {
        p.y -= p.v; p.d += 0.02; if (p.y < -0.05) { p.y = 1.05; p.x = Math.random() }
        const x = (p.x + Math.sin(p.d) * 0.01) * c.width, y = p.y * c.height
        const g = ctx.createRadialGradient(x, y, 0, x, y, p.r * 4 * dpr)
        g.addColorStop(0, 'rgba(150,255,210,.9)'); g.addColorStop(1, 'rgba(40,220,160,0)')
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, p.r * 4 * dpr, 0, Math.PI * 2); ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [count])
  return <canvas ref={ref} className="wisps" aria-hidden />
}

export default function Coach() {
  const visitor = useVisitor()
  const [open, setOpen] = useState(false)
  const [teaser, setTeaser] = useState(false)
  const [online, setOnline] = useState<boolean | null>(null)
  const [sound, setSoundState] = useState(() => { try { return localStorage.getItem('hd-coach-sound') !== '0' } catch { return true } })
  const setSound = (v: boolean) => { setSoundState(v); try { localStorage.setItem('hd-coach-sound', v ? '1' : '0') } catch { /* ignore */ } if (!v) window.speechSynthesis?.cancel() }
  const voiceLine = () => { const a = new Audio(threshVoice); a.volume = 0.6; a.play().catch(() => {}) }
  const speak = (t: string) => {
    const ss = window.speechSynthesis; if (!ss || !t) return
    ss.cancel(); const u = new SpeechSynthesisUtterance(t.replace(/[*_`#>\[\]]/g, '').replace(/\s+/g, ' ').slice(0, 600))
    u.rate = 0.95; u.pitch = 0.7; u.volume = 0.9
    const v = ss.getVoices().find((x) => /^en/i.test(x.lang) && /male|daniel|alex|google uk english male/i.test(x.name)) ?? ss.getVoices().find((x) => /^en/i.test(x.lang))
    if (v) u.voice = v
    ss.speak(u)
  }
  const [msgs, setMsgs] = useState<ChatMsg[]>(() => { try { return JSON.parse(sessionStorage.getItem(STORE) ?? '[]') } catch { return [] } })
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const listRef = useRef<HTMLDivElement>(null)
  const abort = useRef<AbortController | null>(null)
  const greeted = useRef(false)

  useEffect(() => { apiUrl().then((u) => setOnline(!!u)) }, [])
  useEffect(() => { const t = setTimeout(() => !open && setTeaser(true), 6000); return () => clearTimeout(t) }, [open])
  useEffect(() => { try { sessionStorage.setItem(STORE, JSON.stringify(msgs.slice(-30))) } catch { /* ignore */ } }, [msgs])
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }) }, [msgs, busy])

  const ctx = () => {
    const v = visitor?.data
    const who = visitor ? `Visitor: ${visitor.name}#${visitor.tag} (${visitor.region})${v?.solo ? `, ${v.solo.tier} ${v.solo.division} ${v.solo.lp} LP` : ''}${v?.recent.mainRole ? `, main role ${v.recent.mainRole}` : ''}.` : ''
    return [who, getCoachContext()].filter(Boolean).join(' ')
  }
  const suggestions = useMemo(() => {
    const c = getCoachContext()
    const m = c.match(/You: ([^(]+) \(/), e = c.match(/Enemy: ([^(]+) \(/)
    const list = m && e ? [`How do I win ${m[1].trim()} vs ${e[1].trim()}?`, 'When can I all-in?', 'What do I change if I fall behind?'] : []
    return [...list, 'What should I pick?', 'Which champions should I ban?', 'How does wave management work?', 'What can this site do?'].slice(0, 4)
  }, [open, msgs.length])

  const toggle = () => {
    setOpen((o) => !o); setTeaser(false)
    if (!open && sound) voiceLine()
    if (open) window.speechSynthesis?.cancel()
    if (!open && !greeted.current && msgs.length === 0) { greeted.current = true; setMsgs([{ role: 'assistant', content: GREETING }]) }
  }

  const send = async (text: string) => {
    const q = text.trim(); if (!q || busy) return
    setInput('')
    const next: ChatMsg[] = [...msgs, { role: 'user', content: q }]
    setMsgs([...next, { role: 'assistant', content: '' }])
    setBusy(true)
    const context = ctx()
    if (!online) {
      await new Promise((r) => setTimeout(r, 650))
      const ans = freeAnswer(q, context); setMsgs([...next, { role: 'assistant', content: ans }]); setBusy(false); if (sound) speak(ans); return
    }
    abort.current = new AbortController()
    try {
      await streamChat(next.filter((m) => m.content && m.content !== GREETING), context, (t) => setMsgs([...next, { role: 'assistant', content: t }]), abort.current.signal)
    } catch (e: any) {
      setMsgs([...next, { role: 'assistant', content: e?.name === 'AbortError' ? '(stopped)' : `The chains slipped: ${e?.message ?? e}. ${freeAnswer(q, context)}` }])
    }
    setBusy(false)
  }

  const onTilt = (e: RPE<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setTilt({ x: ((e.clientY - r.top) / r.height - 0.5) * -14, y: ((e.clientX - r.left) / r.width - 0.5) * 18 })
  }

  return (
    <>
      {teaser && !open && (
        <button className="coach-teaser" onClick={toggle}>
          <b>Thresh</b> Need a plan for your lane? Ask me anything about League.
          <span className="ct-x" onClick={(e) => { e.stopPropagation(); setTeaser(false) }}>×</span>
        </button>
      )}
      <button className={`coach-orb ${open ? 'open' : ''}`} onClick={toggle} aria-label={open ? 'Close the coach' : 'Ask Thresh, your coach'}
        onPointerMove={onTilt} onPointerLeave={() => setTilt({ x: 0, y: 0 })}
        style={{ ['--rx' as string]: `${tilt.x}deg`, ['--ry' as string]: `${tilt.y}deg` }}>
        <span className="orb-ring" /><span className="orb-glow" />
        <span className="orb-face" style={{ backgroundImage: `url(${loadingUrl('Thresh')})` }} />
        <span className="orb-lantern" />
      </button>

      {open && (
        <div className="coach-panel" role="dialog" aria-label="Thresh coach">
          <header className="coach-head" onPointerMove={onTilt} onPointerLeave={() => setTilt({ x: 0, y: 0 })}>
            <div className="coach-art" style={{ backgroundImage: `url(${splashUrl('Thresh')})`, transform: `perspective(700px) rotateX(${tilt.x / 2}deg) rotateY(${tilt.y / 2}deg) scale(1.08)` }} />
            <Wisps />
            <div className="coach-chain" aria-hidden />
            <div className="coach-title">
              <strong>Thresh</strong>
              <span>The Chain Warden · your coach</span>
              <em className={online ? 'live' : 'off'}>{online == null ? '…' : online ? 'Pro coach online' : 'Free coach'}</em>
            </div>
            <div className="coach-tools">
              <button onClick={() => { const v = !sound; setSound(v); if (v) voiceLine() }} title={sound ? 'Mute Thresh' : 'Unmute Thresh'}>{sound ? Icon.sound : Icon.mute}</button>
              <button onClick={() => { setMsgs([]); greeted.current = false }} title="New conversation">↺</button>
              <button onClick={toggle} title="Close">{Icon.close}</button>
            </div>
          </header>
          <div className="coach-msgs" ref={listRef}>
            {msgs.map((m, i) => (
              <div key={i} className={`cmsg ${m.role}`}>
                {m.role === 'assistant' && <span className="cmsg-av" style={{ backgroundImage: `url(${loadingUrl('Thresh')})` }} />}
                <div className="cmsg-bubble">{m.content ? <Md text={m.content} /> : <span className="lantern-dots"><i /><i /><i /></span>}</div>
              </div>
            ))}
          </div>
          {!busy && (
            <div className="coach-sugg">{suggestions.map((s) => <button key={s} onClick={() => send(s)}>{s}</button>)}</div>
          )}
          <form className="coach-input" onSubmit={(e) => { e.preventDefault(); send(input) }}>
            <textarea rows={1} value={input} placeholder="Ask about your lane, builds, macro…" onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }} />
            {busy ? <button type="button" onClick={() => abort.current?.abort()} title="Stop">■</button> : <button type="submit" disabled={!input.trim()} title="Send">{Icon.send}</button>}
          </form>
        </div>
      )}
    </>
  )
}
