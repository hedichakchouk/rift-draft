import { useEffect, useState } from 'react'
import { itemUrl, loadItemsById, loadRunes, loadSummoners, runeIconUrl, spellUrl, summonerIconUrl, type ChampDetail, type ItemInfo, type RuneInfo, type SummonerInfo } from '../../lib/ddragon'
import { skillOrderLetters, type Build } from '../../lib/meta'

export function useBuildData() {
  const [items, setItems] = useState<Map<string, ItemInfo>>(new Map())
  const [runes, setRunes] = useState<Map<number, RuneInfo>>(new Map())
  const [sums, setSums] = useState<Map<number, SummonerInfo>>(new Map())
  useEffect(() => { loadItemsById().then(setItems).catch(() => {}); loadRunes().then(setRunes).catch(() => {}); loadSummoners().then(setSums).catch(() => {}) }, [])
  return { items, runes, sums }
}

export function ItemIcon({ id, items, size = 40, count, wr }: { id: number | string; items: Map<string, ItemInfo>; size?: number; count?: number; wr?: number }) {
  const it = items.get(String(id))
  return (
    <figure className="item-ico" style={{ width: size }} title={it ? `${it.name} (${it.gold}g)\n${it.plain || it.desc.slice(0, 180)}` : String(id)}>
      <img src={itemUrl(String(id))} alt={it?.name ?? ''} width={size} height={size} loading="lazy" />
      {count && count > 1 ? <i>{count}</i> : null}
      {wr != null && <figcaption>{wr.toFixed(1)}%</figcaption>}
    </figure>
  )
}

export default function BuildPanel({ build, detail, name }: { build: Build | null; detail: ChampDetail | null; name: string }) {
  const { items, runes, sums } = useBuildData()
  if (!build) return <section className="card build"><h3>Build</h3><p className="sub">No build data for {name} in this lane yet.</p></section>
  const order = skillOrderLetters(build.skillOrder)
  const startCounts = new Map<number, number>()
  build.start?.set.forEach((i) => startCounts.set(i, (startCounts.get(i) ?? 0) + 1))
  const rune = (id: number, big = false) => {
    const r = runes.get(id)
    return r ? <img key={id} className={big ? 'rune big' : 'rune'} src={runeIconUrl(r.icon)} alt={r.name} title={`${r.name}${r.desc ? ' - ' + r.desc : ''}`} /> : null
  }
  const spellImg = (l: string) => {
    const i = 'QWER'.indexOf(l)
    const s = detail?.spells[i]
    return s ? <img src={spellUrl(s.image)} alt="" title={s.name} /> : null
  }
  return (
    <section className="card build">
      <div className="card-head"><div><h2>{name} build</h2><p className="sub">Most picked by Emerald+ players this patch (lolalytics)</p></div></div>
      <div className="build-grid">
        <div className="build-block">
          <span className="stat-label">Runes {build.runes && <em>{build.runes.wr}% · {build.runes.n.toLocaleString()} g</em>}</span>
          {build.runes ? (
            <div className="runes">
              <div className="rune-tree">{rune(build.runes.pri[0], true)}<div className="rune-row">{build.runes.pri.slice(1).map((r) => rune(r))}</div></div>
              <div className="rune-tree sec"><div className="rune-row">{build.runes.sec.map((r) => rune(r))}</div><div className="rune-row shards">{build.runes.mod.map((r) => rune(r))}</div></div>
              <div className="rune-names">{build.runes.pri[0] && <b>{runes.get(build.runes.pri[0])?.name}</b>}<span>{runes.get(build.runes.pri[0])?.tree} + {runes.get(build.runes.sec[0])?.tree}</span></div>
            </div>
          ) : <p className="sub">—</p>}
        </div>
        <div className="build-block">
          <span className="stat-label">Summoner spells {build.spellsWr && <em>{build.spellsWr}%</em>}</span>
          <div className="sums">{build.spells.map((k) => { const s = sums.get(k); return s ? <img key={k} src={summonerIconUrl(s.image)} alt={s.name} title={s.name} /> : null })}</div>
          <span className="stat-label" style={{ marginTop: 10 }}>Skill priority</span>
          <div className="skill-prio">{(build.skillPriority ?? '').split('').map((l, i) => <span key={i}>{i > 0 && <i>›</i>}<b className={`sk sk-${l}`}>{spellImg(l)}{l}</b></span>)}</div>
        </div>
      </div>
      {order.length > 0 && (
        <div className="skill-order">
          <span className="stat-label">Skill order (levels 1-{order.length})</span>
          <div className="so-grid" style={{ gridTemplateColumns: `28px repeat(${order.length}, 1fr)` }}>
            {['Q', 'W', 'E', 'R'].map((k) => (
              <div className="so-row" key={k} style={{ display: 'contents' }}>
                <b className={`so-key sk-${k}`}>{k}</b>
                {order.map((l, i) => <span key={i} className={l === k ? `so-on sk-${k}` : 'so-off'}>{l === k ? i + 1 : ''}</span>)}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="items-flow">
        {build.start && (
          <div className="flow-step">
            <span className="stat-label">Start <em>{build.start.wr}%</em></span>
            <div className="flow-items">{[...startCounts].map(([id, n]) => <ItemIcon key={id} id={id} items={items} count={n} />)}</div>
          </div>
        )}
        {build.core && (
          <div className="flow-step core">
            <span className="stat-label">Core build <em>{build.core.wr}% · {build.core.n.toLocaleString()} g</em></span>
            <div className="flow-items">{build.core.set.map((id, i) => <span key={id} className="flow-link">{i > 0 && <i>→</i>}<ItemIcon id={id} items={items} size={46} /></span>)}</div>
          </div>
        )}
        {(['item4', 'item5', 'item6'] as const).map((k, i) => build[k].length > 0 && (
          <div className="flow-step" key={k}>
            <span className="stat-label">Item {i + 4} options</span>
            <div className="flow-items">{build[k].slice(0, 3).map(([id, wr]) => <ItemIcon key={id} id={id} items={items} wr={wr} size={36} />)}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
