import { iconUrl, splashUrl } from '../../lib/ddragon'
import { matchupLabel, type TierRow } from '../../lib/meta'
import { LANE_LABEL, type Champion, type Lane } from '../../lib/types'
import { LaneIcon, MetaTier, Pill, Ring } from '../ui/kit'

export interface WR { wr: number; games: number; from: 'us' | 'them' }

export function MatchupHero({ lane, me, foe, wr, meRow, foeRow, statEdge, patch }: {
  lane: Lane; me: Champion; foe: Champion; wr: WR | null; meRow: TierRow | null; foeRow: TierRow | null; statEdge: number; patch?: string
}) {
  const ml = wr ? matchupLabel(wr.wr) : null
  const tone = ml?.tone ?? (statEdge >= 1.08 ? 'good' : statEdge <= 0.93 ? 'bad' : 'warn')
  return (
    <section className={`hero2 tone-${tone}`}>
      <div className="hero2-bg">
        <div className="hero2-side left" style={{ backgroundImage: `url(${splashUrl(me.id)})` }} />
        <div className="hero2-side right" style={{ backgroundImage: `url(${splashUrl(foe.id)})` }} />
        <div className="hero2-shade" />
      </div>
      <div className="hero2-content">
        <div className="hero2-champ">
          <img src={iconUrl(me.id)} alt="" />
          <div><span className="hero2-role">You · <LaneIcon lane={lane} size={13} /> {LANE_LABEL[lane]}</span><strong>{me.name}</strong>
            <div className="hero2-tags"><MetaTier tier={meRow?.[1]} />{meRow && <span>{meRow[2]}% WR · {meRow[3]}% pick · {meRow[4]}% ban</span>}</div></div>
        </div>
        <div className="hero2-center">
          <div className="hero2-ring">
            <Ring value={wr?.wr ?? 50} size={132} stroke={11} tone={tone} />
            <div className="hero2-num">{wr ? <><b>{wr.wr.toFixed(1)}<small>%</small></b><span>win rate</span></> : <><b>—</b><span>no data</span></>}</div>
          </div>
          <Pill tone={tone}>{ml ? ml.label : statEdge >= 1.08 ? 'Stat edge for you' : statEdge <= 0.93 ? 'Stat edge for them' : 'Even on stats'}</Pill>
          <span className="hero2-src">{wr ? `${wr.games.toLocaleString()} games · Emerald+ · patch ${patch ?? ''}` : 'Not enough games: estimate from base stats'}</span>
        </div>
        <div className="hero2-champ right">
          <div><span className="hero2-role">Enemy</span><strong>{foe.name}</strong>
            <div className="hero2-tags"><MetaTier tier={foeRow?.[1]} />{foeRow && <span>{foeRow[2]}% WR · {foeRow[3]}% pick</span>}</div></div>
          <img src={iconUrl(foe.id)} alt="" />
        </div>
      </div>
    </section>
  )
}

export function DuoHero({ adc, sup, eAdc, eSup, pairs, patch }: {
  adc: Champion; sup: Champion | null; eAdc: Champion; eSup: Champion | null
  pairs: { a: Champion; b: Champion; label: string; wr: WR | null }[]; patch?: string
}) {
  const known = pairs.filter((p) => p.wr)
  const avg = known.length ? known.reduce((s, p) => s + p.wr!.wr, 0) / known.length : null
  const ml = avg != null ? matchupLabel(avg) : null
  const tone = ml?.tone ?? 'warn'
  return (
    <section className={`hero2 duo tone-${tone}`}>
      <div className="hero2-bg">
        <div className="hero2-side left" style={{ backgroundImage: `url(${splashUrl((sup ?? adc).id)})` }} />
        <div className="hero2-side right" style={{ backgroundImage: `url(${splashUrl((eSup ?? eAdc).id)})` }} />
        <div className="hero2-shade" />
      </div>
      <div className="hero2-content">
        <div className="duo-team">
          <span className="hero2-role">Your duo</span>
          <div className="duo-icons"><img src={iconUrl(adc.id)} alt={adc.name} />{sup && <img src={iconUrl(sup.id)} alt={sup.name} />}</div>
          <strong>{adc.name}{sup ? ` + ${sup.name}` : ''}</strong>
        </div>
        <div className="hero2-center">
          <div className="hero2-ring">
            <Ring value={avg ?? 50} size={132} stroke={11} tone={tone} />
            <div className="hero2-num">{avg != null ? <><b>{avg.toFixed(1)}<small>%</small></b><span>2v2 score</span></> : <><b>—</b><span>no data</span></>}</div>
          </div>
          <Pill tone={tone}>{ml?.label ?? 'Pick both duos'}</Pill>
          <span className="hero2-src">Average of the {known.length} head-to-head win rates · patch {patch ?? ''}</span>
        </div>
        <div className="duo-team right">
          <span className="hero2-role">Enemy duo</span>
          <div className="duo-icons"><img src={iconUrl(eAdc.id)} alt={eAdc.name} />{eSup && <img src={iconUrl(eSup.id)} alt={eSup.name} />}</div>
          <strong>{eAdc.name}{eSup ? ` + ${eSup.name}` : ''}</strong>
        </div>
      </div>
      <div className="duo-matrix">
        {pairs.map((p) => {
          const t = p.wr ? matchupLabel(p.wr.wr).tone : 'warn'
          return (
            <div key={p.label} className={`duo-pair tone-${t}`}>
              <img src={iconUrl(p.a.id)} alt="" /><span className="vs">vs</span><img src={iconUrl(p.b.id)} alt="" />
              <div><b>{p.wr ? `${p.wr.wr.toFixed(1)}%` : '—'}</b><small>{p.label}{p.wr ? ` · ${p.wr.games.toLocaleString()} g` : ''}</small></div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
