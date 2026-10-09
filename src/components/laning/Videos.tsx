import { useState } from 'react'
import { abilityClip, passiveUrl, spellUrl, type ChampDetail } from '../../lib/ddragon'
import type { Video } from '../../lib/meta'
import { Icon, Seg } from '../ui/kit'

type Slot = 'P' | 'Q' | 'W' | 'E' | 'R'

function Clips({ c, champKey }: { c: ChampDetail; champKey: string }) {
  const [slot, setSlot] = useState<Slot>('Q')
  const [broken, setBroken] = useState(false)
  const info = slot === 'P' ? { name: c.passive.name, desc: c.passive.description, img: passiveUrl(c.passive.image), cd: '' } :
    (() => { const s = c.spells['QWER'.indexOf(slot)]; return { name: s.name, desc: s.description, img: spellUrl(s.image), cd: s.cooldownBurn } })()
  return (
    <div className="clips">
      <div className="clip-player">
        {broken ? <div className="clip-missing">No official clip for this ability.</div> : (
          <video key={`${c.id}-${slot}`} autoPlay muted loop playsInline controls={false} onError={() => setBroken(true)} onLoadStart={() => setBroken(false)}>
            <source src={abilityClip(champKey, slot, 'webm')} type="video/webm" />
            <source src={abilityClip(champKey, slot, 'mp4')} type="video/mp4" onError={() => setBroken(true)} />
          </video>
        )}
      </div>
      <div className="clip-side">
        <div className="clip-keys">
          {(['P', 'Q', 'W', 'E', 'R'] as Slot[]).map((s) => {
            const img = s === 'P' ? passiveUrl(c.passive.image) : spellUrl(c.spells['QWER'.indexOf(s)].image)
            return <button key={s} className={slot === s ? 'on' : ''} onClick={() => { setSlot(s); setBroken(false) }}><img src={img} alt="" /><b>{s}</b></button>
          })}
        </div>
        <div className="clip-info">
          <strong><img src={info.img} alt="" /> {info.name}</strong>
          {info.cd && <span className="muted">Cooldown {info.cd}s</span>}
          <p>{info.desc.length > 420 ? info.desc.slice(0, 420) + '…' : info.desc}</p>
        </div>
      </div>
    </div>
  )
}

function YouTube({ v }: { v: Video }) {
  const [on, setOn] = useState(false)
  return (
    <div className="yt">
      {on ? (
        <iframe src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0`} title={v.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
      ) : (
        <button className="yt-thumb" onClick={() => setOn(true)} style={{ backgroundImage: `url(https://i.ytimg.com/vi/${v.id}/hqdefault.jpg)` }} aria-label={`Play ${v.title}`}>
          <span className="yt-play">{Icon.play}</span>
          <span className="yt-len">{v.length}</span>
        </button>
      )}
      <div className="yt-meta"><strong title={v.title}>{v.title}</strong><span>{v.channel} · {v.age}</span></div>
    </div>
  )
}

export default function Videos({ me, foe, meKey, foeKey, videos }: { me: ChampDetail; foe: ChampDetail; meKey: string; foeKey: string; videos: Video[] }) {
  const [tab, setTab] = useState<'guides' | 'me' | 'foe'>(videos.length ? 'guides' : 'me')
  const q = encodeURIComponent(`${me.name} vs ${foe.name} laning`)
  return (
    <section className="card videos">
      <div className="card-head">
        <div><h2>Watch & learn</h2><p className="sub">Guides for {me.name}, plus Riot's official clips of every ability.</p></div>
        <Seg size="sm" value={tab} onChange={setTab} options={[
          { id: 'guides', label: `${me.name} guides` }, { id: 'me', label: `${me.name} abilities` }, { id: 'foe', label: `Know ${foe.name}` },
        ]} />
      </div>
      {tab === 'guides' && (
        <>
          {videos.length ? <div className="yt-grid">{videos.slice(0, 3).map((v) => <YouTube key={v.id} v={v} />)}</div> : <p className="sub">No recent guide found for {me.name}.</p>}
          <a className="btn yt-search" href={`https://www.youtube.com/results?search_query=${q}`} target="_blank" rel="noreferrer">Search “{me.name} vs {foe.name}” on YouTube ↗</a>
        </>
      )}
      {tab === 'me' && <Clips c={me} champKey={meKey} />}
      {tab === 'foe' && <Clips c={foe} champKey={foeKey} />}
    </section>
  )
}
