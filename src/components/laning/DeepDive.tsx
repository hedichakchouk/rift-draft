import { useState } from 'react'
import { iconUrl, passiveUrl, spellUrl, type ChampDetail } from '../../lib/ddragon'
import { compareAt, fightEdge, edgeLabel, links } from '../../lib/laning'
import type { Lane } from '../../lib/types'
import { Seg } from '../ui/kit'

export default function DeepDive({ me, foe, lane }: { me: ChampDetail; foe: ChampDetail; lane: Lane }) {
  const [lvl, setLvl] = useState(1)
  const rows = compareAt(me, foe, lvl)
  const e = edgeLabel(fightEdge(me, foe, lvl))
  return (
    <section className="card deep">
      <div className="card-head">
        <div><h2>Deep dive</h2><p className="sub">Base stats head to head (no items, no runes), abilities, and Riot's own tips.</p></div>
        <Seg size="sm" value={lvl} onChange={setLvl} options={[1, 6, 11, 16].map((n) => ({ id: n, label: `Lv ${n}` }))} />
      </div>
      <div className="deep-grid">
        <div>
          <table className="lp-table">
            <thead><tr><th><img className="th-ico" src={iconUrl(me.id)} alt="" /> {me.name}</th><th>Level {lvl}</th><th>{foe.name} <img className="th-ico" src={iconUrl(foe.id)} alt="" /></th></tr></thead>
            <tbody>{rows.map((r) => {
              const w = r.me === r.foe ? 0 : (r.me > r.foe) === r.higherBetter ? 1 : -1
              return <tr key={r.key}><td className={w === 1 ? 'win' : ''}>{r.fmt(r.me)}</td><th>{r.label}</th><td className={w === -1 ? 'win' : ''}>{r.fmt(r.foe)}</td></tr>
            })}</tbody>
          </table>
          <p className={`sub tone-text-${e.tone}`}>Stat-only duel at level {lvl}: {e.text.toLowerCase()}.</p>
        </div>
        <div className="deep-side">
          {[me, foe].map((c) => (
            <div key={c.id} className="deep-abil">
              <span className="stat-label">{c.name} · cooldowns at rank 1</span>
              <div className="lp-icons">
                <figure title={`${c.passive.name} (passive) - ${c.passive.description}`}><img src={passiveUrl(c.passive.image)} alt="" /><figcaption>P</figcaption></figure>
                {c.spells.map((s, i) => <figure key={s.id} title={`${s.name} - ${s.description}`}><img src={spellUrl(s.image)} alt="" /><figcaption>{'QWER'[i]} · {s.cooldownBurn.split('/')[0]}s</figcaption></figure>)}
              </div>
            </div>
          ))}
          <div className="tips2">
            {me.allytips.length > 0 && <div><span className="stat-label">Playing {me.name} (Riot)</span><ul>{me.allytips.slice(0, 3).map((t, i) => <li key={i}>{t}</li>)}</ul></div>}
            {foe.enemytips.length > 0 && <div><span className="stat-label">Against {foe.name} (Riot)</span><ul>{foe.enemytips.slice(0, 3).map((t, i) => <li key={i}>{t}</li>)}</ul></div>}
          </div>
        </div>
      </div>
      <div className="lp-links">{links(me.id, foe.id, lane).map((l) => <a className="btn" key={l.label} href={l.url} target="_blank" rel="noreferrer">{l.label} ↗</a>)}</div>
    </section>
  )
}
