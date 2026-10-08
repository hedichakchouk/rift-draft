import { useState } from 'react'
import Avatar from './Avatar'
import { iconUrl } from '../lib/ddragon'
import { bestRank, kda, rankLabel, winrate, type Stats } from '../lib/stats'
import { LANE_LABEL, LANES, TIERS, TIER_HINT, type Champion, type Player } from '../lib/types'

interface Props { players: Player[]; byId: Map<string, Champion>; stats?: Stats | null }

export default function TierList({ players, byId, stats }: Props) {
  const [name, setName] = useState(players[0]?.name)
  const sorted = [...players].sort((a, b) => LANES.indexOf(a.lane) - LANES.indexOf(b.lane))
  const p = players.find((x) => x.name === name) ?? sorted[0]
  const ps = p ? stats?.players[p.name] : undefined
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
              <p className="sub">{LANE_LABEL[p.lane]} main · {p.champions.length} champions{ps ? <> · <span className="rank-pill">{rankLabel(bestRank(ps))}</span> · {ps.games} ranked games, {Math.round((ps.wins / Math.max(ps.games, 1)) * 100)}% WR</> : null}</p>
            </div>
          </div>
        </div>
        {ps && (() => {
          const rk = bestRank(ps)
          const top = Object.entries(ps.champions).sort((x, y) => y[1].games - x[1].games).slice(0, 8)
          const wr = Math.round((ps.wins / Math.max(ps.games, 1)) * 100)
          const [gn, tag] = ps.riotId.split('#')
          const url = `https://op.gg/lol/summoners/euw/${encodeURIComponent(gn)}-${encodeURIComponent(tag)}`
          return (
            <div className="opgg">
              <div className="opgg-head">
                <div>
                  <b>OP.GG</b> · {ps.riotId} · EUW
                  <div className="sub">Updated {stats?.updated ? new Date(stats.updated).toLocaleDateString() : '—'} · ranked season stats</div>
                </div>
                <a className="btn" href={url} target="_blank" rel="noreferrer">Open on op.gg ↗</a>
              </div>
              <div className="opgg-kpis">
                <div className="stat"><span className="stat-label">Rank</span><strong>{rankLabel(rk)}{rk && rk.tier !== 'MASTER' && rk.tier !== 'GRANDMASTER' && rk.tier !== 'CHALLENGER' ? ` · ${rk.lp} LP` : ''}</strong></div>
                <div className="stat"><span className="stat-label">Win rate</span><strong>{wr}%</strong></div>
                <div className="stat"><span className="stat-label">Games</span><strong>{ps.wins}W {ps.games - ps.wins}L</strong></div>
              </div>
              <div className="opgg-top">
                <span className="stat-label">Most played</span>
                <div className="opgg-champs">
                  {top.map(([id, c]) => {
                    const w = winrate(c)!
                    return (
                      <div className="opgg-champ" key={id} title={`${byId.get(id)?.name ?? id}: ${c.wins}W ${c.games - c.wins}L · KDA ${kda(c)}`}>
                        <img src={iconUrl(id)} alt="" loading="lazy" />
                        <span>{byId.get(id)?.name ?? id}</span>
                        <small className={w >= 55 ? 'hi' : w < 45 ? 'lo' : ''}>{w}% · {c.games}g · {kda(c)} KDA</small>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })()}
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
                      {(() => { const cs = ps?.champions[c.id]; const w = winrate(cs); return cs && w !== null ? <span className={`wr ${w >= 55 ? 'hi' : w < 45 ? 'lo' : ''}`} title={`KDA ${kda(cs)}`}>{w}% · {cs.games}g</span> : null })()}
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
