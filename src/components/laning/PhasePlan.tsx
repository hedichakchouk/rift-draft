import { useMemo, useState } from 'react'
import type { ChampDetail, ItemInfo } from '../../lib/ddragon'
import { itemPhases, phaseNotes } from '../../lib/laning'
import { skillOrderLetters, type Build } from '../../lib/meta'
import type { Lane } from '../../lib/types'
import { ItemIcon, useBuildData } from './BuildPanel'

const TIME: Record<string, string> = { start: '0:00', early: '1:30', spike: '~6:30', back: '~5-8:00', first: '~12:00', mid: '14:00+' }

const nameList = (ids: (number | string)[], items: Map<string, ItemInfo>) => {
  const counts = new Map<string, number>()
  ids.forEach((i) => counts.set(String(i), (counts.get(String(i)) ?? 0) + 1))
  return [...counts].map(([i, n]) => `${n > 1 ? `${n}× ` : ''}${items.get(i)?.name ?? i}`).join(' + ')
}

export default function PhasePlan({ me, foe, lane, build, ally, foeAlly }: {
  me: ChampDetail; foe: ChampDetail; lane: Lane; build: Build | null; ally?: ChampDetail | null; foeAlly?: ChampDetail | null
}) {
  const { items } = useBuildData()
  const phases = useMemo(() => itemPhases(me, foe, lane), [me, foe, lane])
  const notes = useMemo(() => phaseNotes(me, foe, lane), [me, foe, lane])
  const [cur, setCur] = useState('start')
  const idx = phases.findIndex((p) => p.id === cur)
  const p = phases[idx] ?? phases[0]

  // data-driven extras from the real build
  const order = skillOrderLetters(build?.skillOrder ?? null)
  const firstCore = build?.core?.set.find((id) => !['3006', '3020', '3047', '3111', '3158', '3009', '3008', '3172', '3175', '1001'].includes(String(id)))
  const comps = firstCore ? (items.get(String(firstCore))?.from ?? []) : []
  const extra: Record<string, string[]> = {
    start: build?.start ? [`Most players start ${nameList(build.start.set, items)} (${build.start.wr}% win rate over ${build.start.n.toLocaleString()} games).`] : [],
    early: order.length ? [`Skill order for levels 1-3: ${order.slice(0, 3).join(' → ')}. Then max ${build?.skillPriority?.split('').join(' > ') ?? ''}.`] : [],
    spike: order.length ? [`Level 6: put your first point in R. Next points follow ${build?.skillPriority?.split('').join(' > ') ?? 'your max order'}.`] : [],
    back: firstCore ? [`You are rushing ${items.get(String(firstCore))?.name ?? 'your first item'}: on the first back buy ${comps.length ? nameList([...new Set(comps)], items) : 'its biggest component you can afford'}.`] : [],
    first: build?.core ? [`Core path: ${nameList(build.core.set, items)} (${build.core.wr}% win rate when completed).`] : [],
    mid: build?.item4.length ? [`Fourth item: ${build.item4.slice(0, 3).map(([id, wr]) => `${items.get(String(id))?.name ?? id} (${wr}%)`).join(', ')}.`] : [],
  }
  if (lane === 'bot' || lane === 'support') {
    const pair = ally && foeAlly ? `${ally.name} vs ${foeAlly.name}` : ''
    if (pair) extra.early.unshift(`It is a 2v2: watch where ${foeAlly!.name} stands. Their engage or poke decides when you can trade (${pair}).`)
  }
  // items to show per phase: real data first, generic ideas after
  const dataItems: Record<string, (number | string)[]> = {
    start: build?.start ? [...new Set(build.start.set)] : [],
    back: comps.length ? [...new Set(comps)] : [],
    first: build?.core?.set ?? [],
    mid: build?.item4.slice(0, 3).map((x) => x[0]) ?? [],
  }
  const byName = (n: string) => [...items.values()].find((i) => i.name.toLowerCase() === n.toLowerCase())
  const bullets = [...(extra[p.id] ?? []), ...(notes.find((n) => n.id === p.id)?.bullets ?? [])]

  return (
    <section className="card phase-plan">
      <div className="card-head"><div><h2>Lane plan · phase by phase</h2><p className="sub">{me.name} vs {foe.name}: what to do and what to buy at every stage.</p></div></div>
      <div className="timeline" role="tablist">
        <div className="timeline-track"><div className="timeline-fill" style={{ width: `${(idx / (phases.length - 1)) * 100}%` }} /></div>
        {phases.map((ph, i) => (
          <button key={ph.id} role="tab" aria-selected={ph.id === cur} className={`tl-step ${ph.id === cur ? 'on' : ''} ${i < idx ? 'done' : ''}`} onClick={() => setCur(ph.id)}>
            <span className="tl-dot">{i + 1}</span>
            <span className="tl-label">{ph.tab}</span>
            <span className="tl-time">{TIME[ph.id]}</span>
          </button>
        ))}
      </div>
      <div className="phase-body" key={p.id}>
        <div className="phase-notes">
          <p className="phase-hint">{p.hint}</p>
          <ul>{bullets.map((b, i) => <li key={i} style={{ animationDelay: `${i * 50}ms` }}>{b}</li>)}</ul>
        </div>
        <div className="phase-items">
          {dataItems[p.id]?.length ? (
            <div className="pi-group data">
              <span className="stat-label">What high-elo players buy</span>
              <div className="flow-items">{dataItems[p.id].map((id) => <ItemIcon key={id} id={id} items={items} size={44} />)}</div>
            </div>
          ) : null}
          {p.groups.filter((g) => !dataItems[p.id]?.length || /^(Because|Mixed|Vision|Sustain|Boots)/.test(g.label)).map((g) => {
            const found = g.items.map(byName).filter(Boolean) as ItemInfo[]
            if (items.size && !found.length) return null
            return (
              <div className="pi-group" key={g.label}>
                <span className="stat-label">{g.label}</span>
                <div className="flow-items">{found.map((it) => <ItemIcon key={it.id} id={it.id} items={items} size={38} />)}</div>
                {g.note && <small className="hint">{g.note}</small>}
              </div>
            )
          })}
          {p.id === 'spike' && <p className="sub">No shopping here: this is about using your ultimate well.</p>}
        </div>
      </div>
    </section>
  )
}
