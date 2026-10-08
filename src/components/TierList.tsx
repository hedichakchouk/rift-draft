import { useState } from 'react'
import { iconUrl } from '../lib/ddragon'
import { LANES, LANE_LABEL, TIERS, type Champion, type Lane, type Player, type Tier } from '../lib/types'

interface Props { players: Player[]; byId: Map<string, Champion> }

export default function TierList({ players, byId }: Props) {
  const [view, setView] = useState<'overall' | Lane>('overall')
  const tierOf = (p: Player): Tier | undefined => (view === 'overall' ? p.tier : p.lanes[view])

  return (
    <section>
      <div className="toolbar">
        <h2>Squad Tier List</h2>
        <select value={view} onChange={(e) => setView(e.target.value as any)}>
          <option value="overall">Overall</option>
          {LANES.map((l) => <option key={l} value={l}>{LANE_LABEL[l]}</option>)}
        </select>
      </div>
      {TIERS.map((t) => {
        const row = players.filter((p) => tierOf(p) === t)
        return (
          <div className="tier-row" key={t}>
            <div className={`tier-label t-${t}`}>{t}</div>
            <div className="tier-players">
              {row.length === 0 && <span className="muted">—</span>}
              {row.map((p) => (
                <div className="player-card" key={p.name}>
                  <strong>{p.name}</strong>
                  <div className="lane-chips">
                    {LANES.map((l) => (
                      <span key={l} className={`chip t-${p.lanes[l] ?? 'none'}`} title={LANE_LABEL[l]}>
                        {LANE_LABEL[l].slice(0, 3)} {p.lanes[l] ?? '–'}
                      </span>
                    ))}
                  </div>
                  <div className="pool">
                    {p.champions.map((c) => (
                      <span className="pool-champ" key={c.id} title={`${byId.get(c.id)?.name ?? c.id} (${c.tier})`}>
                        <img src={iconUrl(c.id)} alt={c.id} loading="lazy" />
                        <i className={`t-${c.tier}`}>{c.tier}</i>
                      </span>
                    ))}
                  </div>
                  {p.notes && <small className="muted">{p.notes}</small>}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </section>
  )
}
