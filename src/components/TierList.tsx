import { useState } from 'react'
import { iconUrl } from '../lib/ddragon'
import { LANE_LABEL, LANES, TIERS, TIER_HINT, type Champion, type Player } from '../lib/types'

interface Props { players: Player[]; byId: Map<string, Champion> }

export default function TierList({ players, byId }: Props) {
  const [name, setName] = useState(players[0]?.name)
  const p = players.find((x) => x.name === name) ?? players[0]
  const sorted = [...players].sort((a, b) => LANES.indexOf(a.lane) - LANES.indexOf(b.lane))
  if (!p) return <p className="muted">No players yet — add some in src/data/players.json</p>

  return (
    <section>
      <div className="toolbar"><h2>Squad Tier Lists</h2></div>
      <div className="roles players-tabs">
        {sorted.map((x) => (
          <button key={x.name} className={x.name === p.name ? 'on' : ''} onClick={() => setName(x.name)}>
            {x.name} · {LANE_LABEL[x.lane]}
          </button>
        ))}
      </div>
      <h3>{p.name} <span className="muted">— {LANE_LABEL[p.lane]} · {p.champions.length} champions</span></h3>
      {p.notes && <p className="muted">{p.notes}</p>}
      {p.champions.length === 0 && <p className="muted">No champions added yet.</p>}
      {TIERS.map((t) => {
        const row = p.champions.filter((c) => c.tier === t)
        if (row.length === 0 && (t === 'C' || t === 'D')) return null
        return (
          <div className="tier-row" key={t}>
            <div className={`tier-label t-${t}`}>{t}<small>{TIER_HINT[t]}</small></div>
            <div className="tier-players">
              {row.map((c) => (
                <img key={c.id} className="tier-champ" src={iconUrl(c.id)} alt={c.id} title={byId.get(c.id)?.name ?? c.id} loading="lazy" />
              ))}
            </div>
          </div>
        )
      })}
    </section>
  )
}
