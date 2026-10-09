import { useState } from 'react'
import Avatar from './Avatar'
import { LaneIcon, Seg, rankCrestUrl } from './ui/kit'
import { iconUrl } from '../lib/ddragon'
import { kda, rankLine, rankWr, winrate, type RankInfo, type Stats } from '../lib/stats'
import { LANE_LABEL, LANES, TIERS, TIER_HINT, type Champion, type Player } from '../lib/types'

interface Props { players: Player[]; byId: Map<string, Champion>; stats?: Stats | null }
type View = 'tiers' | 'ranks' | 'games'

const QUEUES: { key: 'solo' | 'flex' | 'fives'; label: string; short: string }[] = [
  { key: 'solo', label: 'Solo/Duo', short: 'Solo' },
  { key: 'flex', label: 'Flex', short: 'Flex' },
  { key: 'fives', label: '5v5 Ranked', short: '5v5' },
]

function Crest({ r, size = 30 }: { r?: RankInfo | null; size?: number }) {
  return r ? <img className="crest" src={rankCrestUrl(r.tier)} width={size} height={size} alt={r.tier} /> : <span className="crest none" style={{ width: size, height: size }} />
}

export default function TierList({ players, byId, stats }: Props) {
  const [view, setView] = useState<View>('tiers')
  const [name, setName] = useState(players[0]?.name)
  const groups = LANES.map((l) => players.filter((x) => x.lane === l)).filter((g) => g.length)
  const [chosen, setChosen] = useState<Record<string, string>>({})
  const activeOf = (g: Player[]) => g.find((x) => x.name === chosen[g[0].lane]) ?? g[0]
  const sorted = groups.map(activeOf)
  const p = players.find((x) => x.name === name) ?? sorted[0]
  const pick = (who: Player) => { setChosen((c) => ({ ...c, [who.lane]: who.name })); setName(who.name) }
  const ps = p ? stats?.players[p.name] : undefined
  if (!p) return <p className="empty">No players yet — add some in <code>src/data/players.json</code></p>

  return (
    <div className="tier-page">
      <div className="tp-bar">
        <Seg value={view} onChange={setView} options={[{ id: 'tiers', label: 'Tier lists' }, { id: 'ranks', label: 'Ranks' }, { id: 'games', label: 'Flex games' }]} />
        {stats?.updated && <span className="sub">op.gg · updated {new Date(stats.updated).toLocaleDateString()}</span>}
      </div>

      {view === 'tiers' && (
        <>
          <div className="roster">
            {groups.map((g) => {
              const x = activeOf(g)
              const on = g.some((y) => y.name === p.name)
              const sx = stats?.players[x.name]
              return (
                <div key={x.lane} className={`roster-card ${on ? 'on' : ''}`}>
                  <button className="rc-main" onClick={() => pick(x)}>
                    <Avatar key={x.name} name={x.name} size={46} />
                    <span className="rc-name">{x.name}</span>
                    <span className="rc-lane"><LaneIcon lane={x.lane} size={13} /> {LANE_LABEL[x.lane]}</span>
                    <span className="rc-crests">{QUEUES.map((q) => <Crest key={q.key} r={sx?.[q.key]} size={20} />)}</span>
                  </button>
                  {g.length > 1 && (
                    <div className="rc-switch" role="group" aria-label={`${LANE_LABEL[x.lane]} player`}>
                      {g.map((y) => <button key={y.name} className={y.name === x.name ? 'on' : ''} onClick={() => pick(y)}>{y.name}</button>)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <section className="card">
            <div className="card-head">
              <div className="who">
                <Avatar key={p.name} name={p.name} size={56} />
                <div>
                  <h2>{p.name}</h2>
                  <p className="sub">{LANE_LABEL[p.lane]} · {p.champions.length} champions</p>
                </div>
              </div>
              {ps && (
                <div className="mini-ranks">
                  {QUEUES.map((q) => { const r = ps[q.key]; return (
                    <div key={q.key} className="mini-rank" title={r ? `${q.label}: ${rankLine(r)} · ${r.wins}W ${r.losses}L` : `${q.label}: unranked`}>
                      <Crest r={r} size={34} /><div><small>{q.short}</small><b>{r ? rankLine(r).replace(' · ', ' ') : '—'}</b></div>
                    </div>
                  ) })}
                </div>
              )}
            </div>
            {p.notes && <p className="sub">{p.notes}</p>}
            {p.champions.length === 0 && <p className="empty">No champions yet. Add them to <code>src/data/players.json</code>.</p>}
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
            {ps && (() => {
              const top = Object.entries(ps.champions).sort((x, y) => y[1].games - x[1].games).slice(0, 8)
              const [gn, tag] = ps.riotId.split('#')
              const url = `https://op.gg/lol/summoners/euw/${encodeURIComponent(gn)}-${encodeURIComponent(tag)}`
              return (
                <details className="more">
                  <summary>Most played this season</summary>
                  <div className="opgg-champs">
                    {top.map(([id, c]) => { const w = winrate(c)!; return (
                      <div className="opgg-champ" key={id} title={`${c.wins}W ${c.games - c.wins}L · KDA ${kda(c)}`}>
                        <img src={iconUrl(id)} alt="" loading="lazy" />
                        <span>{byId.get(id)?.name ?? id}</span>
                        <small className={w >= 55 ? 'hi' : w < 45 ? 'lo' : ''}>{w}% · {c.games}g · {kda(c)} KDA</small>
                      </div>
                    ) })}
                  </div>
                  <a className="btn" href={url} target="_blank" rel="noreferrer">Open on op.gg ↗</a>
                </details>
              )
            })()}
          </section>
        </>
      )}

      {view === 'ranks' && (
        <section className="card">
          <div className="card-head"><div><h2>Chabeb ranks</h2><p className="sub">Current season, EUW. Solo/Duo, Flex and the new 5v5 ranked queue.</p></div></div>
          <div className="rank-board">
            <div className="rb-head"><span />{QUEUES.map((q) => <span key={q.key}>{q.label}</span>)}</div>
            {players.map((x) => {
              const sx = stats?.players[x.name]
              return (
                <div className="rb-row" key={x.name}>
                  <div className="rb-who"><Avatar name={x.name} size={36} /><div><b>{x.name}</b><small>{LANE_LABEL[x.lane]}</small></div></div>
                  {QUEUES.map((q) => { const r = sx?.[q.key]; const w = rankWr(r); return (
                    <div className="rb-cell" key={q.key}>
                      <Crest r={r} size={40} />
                      <div><b>{r ? rankLine(r) : 'Unranked'}</b>{r && <small>{r.wins}W {r.losses}L · {w}%</small>}</div>
                    </div>
                  ) })}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {view === 'games' && (
        <section className="card">
          <div className="card-head"><div><h2>Last 5 flex games together</h2><p className="sub">Games where 4 or more of the squad queued on the same team.</p></div></div>
          {!stats?.flexGames?.length && <p className="empty">No squad flex games recorded yet.</p>}
          <div className="fg-list">
            {(stats?.flexGames ?? []).slice(0, 5).map((g, i) => (
              <div key={i} className={`fg ${g.win ? 'win' : 'loss'}`}>
                <div className="fg-res"><b>{g.win ? 'Victory' : 'Defeat'}</b><small>{g.duration} · {g.age}</small></div>
                <div className="fg-team">
                  {g.members.map(([who, champ]) => (
                    <div key={who} className="fg-m" title={`${who} · ${byId.get(champ)?.name ?? champ}`}>
                      <img src={iconUrl(champ)} alt="" loading="lazy" /><span>{who}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {(() => { const gs = (stats?.flexGames ?? []).slice(0, 5); const w = gs.filter((g) => g.win).length; return gs.length ? <p className="sub">Squad record: {w}W {gs.length - w}L</p> : null })()}
        </section>
      )}
    </div>
  )
}
