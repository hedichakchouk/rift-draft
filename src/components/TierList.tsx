import { useState } from 'react'
import Avatar from './Avatar'
import { iconUrl } from '../lib/ddragon'
import { LANE_LABEL, LANES, TIERS, TIER_HINT, type Champion, type Player } from '../lib/types'

interface Props { players: Player[]; byId: Map<string, Champion> }

export default function TierList({ players, byId }: Props) {
  const [name, setName] = useState(players[0]?.name)
  const sorted = [...players].sort((a, b) => LANES.indexOf(a.lane) - LANES.indexOf(b.lane))
  const p = players.find((x) => x.name === name) ?? sorted[0]
  if (!p) return <p className="empty">No players yet — add some in <code>src/data/players.json</code></p>

  return (
    <div className="tier-page">
      <div className="roster">
        {sorted.map((x) => (
          <button key={x.name} className={`roster-card ${x.name === p.name ? 'on' : ''}`} onClick={() => setName(x.name)}>
            <Avatar key={x.name} name={x.name} size={46} />
            <span className="rc-name">{x.name}</span>
            <span className="rc-lane">{LANE_LABEL[x.lane]}</span>
            <span className="rc-count">{x.champions.length} champs</span>
          </button>
        ))}
      </div>

      <section className="card">
        <div className="card-head">
          <div className="who">
            <Avatar key={p.name} name={p.name} size={64} />
            <div>
              <h2>{p.name}'s tier list</h2>
              <p className="sub">{LANE_LABEL[p.lane]} main · {p.champions.length} champions</p>
            </div>
          </div>
        </div>
        {p.notes && <p className="sub">{p.notes}</p>}
        {p.champions.length === 0 && (
          <p className="empty">No champions yet. Add them to <code>src/data/players.json</code> like <code>{`{ "id": "Ahri", "tier": "Z" }`}</code>.</p>
        )}
        <div className="tiers">
          {TIERS.map((t) => {
            const row = p.champions.filter((c) => c.tier === t)
            if (row.length === 0 && (t === 'C' || t === 'D')) return null
            return (
              <div className="tier-row" key={t}>
                <div className={`tier-label t-${t}`}><b>{t}</b><small>{TIER_HINT[t]}</small></div>
                <div className="tier-champs">
                  {row.map((c) => (
                    <div className="champ" key={c.id} title={byId.get(c.id)?.name ?? c.id}>
                      <img src={iconUrl(c.id)} alt={byId.get(c.id)?.name ?? c.id} loading="lazy" />
                      <span>{byId.get(c.id)?.name ?? c.id}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
