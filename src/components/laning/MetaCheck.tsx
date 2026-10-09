import { useEffect, useMemo, useState } from 'react'
import { iconUrl } from '../../lib/ddragon'
import { counterPicks, loadChampMeta, matchupLabel, metaVerdict, tierRow, vsWinRate, type ChampMeta, type MetaIndex } from '../../lib/meta'
import { LANE_LABEL, type Champion, type Lane, type Tier } from '../../lib/types'
import { MetaTier, Pill } from '../ui/kit'

interface Cand { id: string; wr: number; games: number; tier: string | null; pool?: Tier }

export default function MetaCheck({ lane, me, foe, meMeta, foeMeta, idx, wr, pool, poolOwner, extraIds, byId, onPick, table = 'vs', foeLane }: {
  lane: Lane; me: Champion; foe: Champion; meMeta: ChampMeta | null; foeMeta: ChampMeta | null; idx: MetaIndex | null
  wr: { wr: number; games: number } | null; pool?: { id: string; tier: Tier }[]; poolOwner?: string; extraIds?: string[]
  byId: Map<string, Champion>; onPick: (id: string) => void; table?: 'vs' | 'vsSupport' | 'vsBot'; foeLane?: Lane
}) {
  const fl = foeLane ?? lane
  const row = tierRow(idx, lane, me.id)
  const verdict = metaVerdict(row?.[1])
  const weak = verdict.key === 'weak' || verdict.key === 'none' || (wr != null && wr.wr < 48.5)
  const [cands, setCands] = useState<Cand[]>([])
  const [poolCands, setPoolCands] = useState<Cand[]>([])

  // reverse table on the foe's side: foe (in fl) vs champions playing `lane`
  const foeTable = table === 'vs' ? 'vs' : table === 'vsSupport' ? 'vsBot' : 'vsSupport'
  const rough = useMemo(() => counterPicks(foeMeta, fl, 150, foeTable).filter((c) => c.id !== me.id).slice(0, 24), [foeMeta, fl, foeTable, me.id])

  useEffect(() => {
    let live = true
    const exact = async (ids: { id: string; wr: number; games: number }[]) => {
      const metas = await Promise.all(ids.map((c) => loadChampMeta(c.id)))
      return ids.map((c, i) => {
        const v = vsWinRate(metas[i], foeMeta, lane, table, fl)
        return { id: c.id, wr: v?.wr ?? c.wr, games: v?.games ?? c.games, tier: tierRow(idx, lane, c.id)?.[1] ?? null }
      })
    }
    exact(rough).then((r) => { if (live) setCands(r.filter((c) => c.tier && !/^[CD]/.test(c.tier) && (tierRow(idx, lane, c.id)?.[6] ?? 0) >= 25).sort((a, b) => b.wr - a.wr).slice(0, 5)) })
    const own = [...new Set([...(pool ?? []).map((p) => p.id), ...(extraIds ?? [])])].filter((id) => id !== me.id)
    exact(own.map((id) => ({ id, wr: 0, games: 0 }))).then((r) => {
      if (!live) return
      const withPool = r.filter((c) => c.games >= 40).map((c) => ({ ...c, pool: pool?.find((p) => p.id === c.id)?.tier }))
      setPoolCands(withPool.sort((a, b) => b.wr - a.wr).slice(0, 5))
    })
    return () => { live = false }
  }, [rough, pool, extraIds, foeMeta, lane, table, fl, idx, me.id])

  const Card = ({ c }: { c: Cand }) => {
    const t = matchupLabel(c.wr).tone
    return (
      <button className={`pick-card tone-${t}`} onClick={() => onPick(c.id)} title={`Switch to ${byId.get(c.id)?.name ?? c.id}`}>
        <img src={iconUrl(c.id)} alt="" />
        <div className="pick-info">
          <strong>{byId.get(c.id)?.name ?? c.id}</strong>
          <span><b>{c.wr.toFixed(1)}%</b> vs {foe.name}</span>
          <span className="muted">{c.games.toLocaleString()} games</span>
        </div>
        <div className="pick-tags"><MetaTier tier={c.tier} />{c.pool && <i className={`badge static t-${c.pool}`}>{c.pool}</i>}</div>
      </button>
    )
  }

  return (
    <section className="card meta-check">
      <div className="mc-head">
        <div className={`mc-verdict tone-${weak ? 'bad' : verdict.tone}`}>
          <span className="mc-icon">{weak ? '!' : '✓'}</span>
          <div>
            <h3>{weak ? `${me.name} is not your best answer here` : `${me.name} is a good pick`}</h3>
            <p className="sub">
              {LANE_LABEL[lane]} this patch: <MetaTier tier={row?.[1]} /> {verdict.label}
              {row && <> · {row[2]}% WR · {row[3]}% pick · {row[4]}% ban</>}
              {wr && <> · {wr.wr.toFixed(1)}% vs {foe.name}</>}
            </p>
          </div>
        </div>
        <Pill tone="gold">Patch {idx?.patch ?? '—'}</Pill>
      </div>

      {poolCands.length > 0 && (
        <>
          <h4 className="mc-sub">{poolOwner ? `From ${poolOwner}'s pool vs ${foe.name}` : `From your champions vs ${foe.name}`}</h4>
          <div className="pick-row">{poolCands.map((c) => <Card key={c.id} c={c} />)}</div>
        </>
      )}
      <h4 className="mc-sub">{weak ? `Picks that win this lane vs ${foe.name}` : `Other strong answers to ${foe.name}`}</h4>
      {cands.length ? <div className="pick-row">{cands.map((c) => <Card key={c.id} c={c} />)}</div> : <p className="sub">Not enough data for {foe.name} in this lane yet.</p>}
      <p className="hint">Win rates from lolalytics, Emerald+ ranked, current patch. Tap a champion to switch to it.</p>
    </section>
  )
}
