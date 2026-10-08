import { useMemo } from 'react'
import Avatar from './Avatar'
import { analyze } from '../lib/analyze'
import { iconUrl } from '../lib/ddragon'
import type { Draft } from '../lib/draft'
import { bestRank, rankLabel, type Stats } from '../lib/stats'
import { LANE_SHORT, type Champion, type Player } from '../lib/types'

const ICON = { good: '✓', warn: '!', bad: '✕' }

export default function Verdict({ draft, players, byId, stats }: { draft: Draft; players: Player[]; byId: Map<string, Champion>; stats: Stats | null }) {
  const v = useMemo(() => analyze(draft, players, byId, stats), [draft, players, byId, stats])
  if (!v) return <section className="verdict card"><h3>Comp verdict</h3><p className="sub">Place a champion on a lane to get an analysis.</p></section>
  return (
    <section className="verdict card">
      <div className="v-head">
        <div className={`v-score g-${v.grade}`}><b>{v.score}</b><span>{v.grade}</span></div>
        <div>
          <h3>{v.label} · {v.headline}</h3>
          <p className="sub">Player fit {v.playerScore}/100 · Team comp {v.compScore}/100{stats ? '' : ' · no ranked stats loaded (tier lists only)'}</p>
        </div>
      </div>
      <div className="v-slots">
        {v.slots.map((s) => {
          const p = stats?.players[s.player]
          return (
            <div className="v-slot" key={s.lane}>
              <img src={iconUrl(s.champ)} alt="" />
              <div>
                <div className="v-name"><Avatar key={s.player} name={s.player} size={18} /> {s.player} <small>{LANE_SHORT[s.lane]}</small></div>
                <div className="v-sub">
                  {s.tier ? `${s.tier} tier` : 'off pool'}
                  {s.wr !== null ? ` · ${s.wr}% WR (${s.games}g)` : stats ? ' · no recent games' : ''}
                  {p ? ` · ${rankLabel(bestRank(p))}` : ''}
                </div>
              </div>
              <div className="v-bar" title={`${s.score}/100`}><i style={{ width: `${s.score}%` }} /></div>
            </div>
          )
        })}
      </div>
      <ul className="v-reasons">
        {v.reasons.map((r, i) => <li key={i} className={r.kind}><i>{ICON[r.kind]}</i>{r.text}</li>)}
      </ul>
      <p className="hint">Based on your tier lists{stats ? ` + EUW ranked games (updated ${new Date(stats.updated!).toLocaleDateString()})` : ''} and the team's damage/frontline balance.</p>
    </section>
  )
}
