import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { iconUrl, loadingUrl, profileIconUrl } from '../lib/ddragon'
import { onboardingSkipped, opggUrl, REGIONS, refresh, signIn, signOut, skipOnboarding, useVisitor } from '../lib/profile'
import { LANE_LABEL, type Champion, type Lane, type Player } from '../lib/types'
import Avatar from './Avatar'
import { Icon, LaneIcon, RankBadge } from './ui/kit'

const ROLE: Record<string, Lane> = { TOP: 'top', JUNGLE: 'jungle', MIDDLE: 'mid', BOTTOM: 'bot', UTILITY: 'support' }

export function ProfileChip({ onOpen, players }: { onOpen: () => void; players: Player[] }) {
  const v = useVisitor()
  const squad = v && players.find((p) => p.riotId?.toLowerCase() === `${v.name}#${v.tag}`.toLowerCase())
  if (!v) return <button className="profile-chip empty" onClick={onOpen}>{Icon.user}<span>Your Riot ID</span></button>
  return (
    <button className="profile-chip" onClick={onOpen} title="Your profile">
      {squad ? <Avatar name={squad.name} size={26} /> : v.data?.icon != null ? <img src={profileIconUrl(v.data.icon)} alt="" /> : <span className="pc-ini">{v.name[0]}</span>}
      <span className="pc-name">{squad ? squad.name : v.name}</span>
      {v.status === 'loading' ? <span className="pc-spin" /> : v.data?.solo ? <RankBadge small tier={v.data.solo.tier} division={v.data.solo.division} /> : null}
    </button>
  )
}

export default function ProfileModal({ open, onClose, players, champs }: { open: boolean; onClose: () => void; players: Player[]; champs: Champion[] }) {
  const v = useVisitor()
  const [riotId, setRiotId] = useState(v ? `${v.name}#${v.tag}` : '')
  const [region, setRegion] = useState(v?.region ?? 'euw1')
  const [err, setErr] = useState('')
  useEffect(() => { if (open) { setRiotId(v ? `${v.name}#${v.tag}` : ''); setRegion(v?.region ?? 'euw1'); setErr('') } }, [open]) // eslint-disable-line
  const keyTo = useMemo(() => new Map(champs.map((c) => [Number(c.key), c.id])), [champs])
  if (!open) return null
  const squad = v && players.find((p) => p.riotId?.toLowerCase() === `${v.name}#${v.tag}`.toLowerCase())

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const m = riotId.trim().match(/^(.{3,16})#([A-Za-z0-9]{2,5})$/)
    if (!m) { setErr('Use the format Name#TAG, for example Faker#KR1'); return }
    setErr(''); signIn(m[1].trim(), m[2], region)
  }
  const d = v?.data
  const role = d?.recent.mainRole ? ROLE[d.recent.mainRole] : null

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal profile-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Your profile">
        <div className="pm-art" style={{ backgroundImage: `url(${loadingUrl(d?.recent.champions[0] ? keyTo.get(d.recent.champions[0].key) ?? 'Thresh' : 'Thresh')})` }} />
        <button className="modal-x" onClick={onClose}>{Icon.close}</button>
        {!v || v.status === 'idle' ? (
          <form className="pm-form" onSubmit={submit}>
            <h2>Who are you, summoner?</h2>
            <p className="sub">Enter your Riot ID. We read your rank, best champions and main role from Riot so the Laning tab and the coach are tuned to you. Nothing else is stored, and only on this device.</p>
            <label className="pm-field"><span>Riot ID</span><input className="search" placeholder="Name#TAG" value={riotId} onChange={(e) => setRiotId(e.target.value)} autoFocus /></label>
            <div className="pm-regions">{REGIONS.map((r) => <button type="button" key={r.id} className={region === r.id ? 'on' : ''} onClick={() => setRegion(r.id)}>{r.label}</button>)}</div>
            {err && <p className="err">{err}</p>}
            <div className="pm-actions">
              <button type="submit" className="btn gold big">Connect</button>
              <button type="button" className="btn" onClick={() => { skipOnboarding(); onClose() }}>Skip for now</button>
            </div>
          </form>
        ) : (
          <div className="pm-card">
            <div className="pm-id">
              {squad ? <Avatar name={squad.name} size={64} /> : d?.icon != null ? <img className="pm-icon" src={profileIconUrl(d.icon)} alt="" /> : <span className="pm-icon ini">{v.name[0]}</span>}
              <div>
                <h2>{squad ? `Welcome back, ${squad.name}` : `${v.name}`}<small>#{v.tag}</small></h2>
                <div className="pm-row">
                  {d?.solo ? <RankBadge tier={d.solo.tier} division={d.solo.division} lp={d.solo.lp} /> : d ? <RankBadge /> : null}
                  {d?.level && <span className="muted">Level {d.level}</span>}
                  {role && <span className="pm-role"><LaneIcon lane={role} size={14} /> {LANE_LABEL[role]} main</span>}
                </div>
              </div>
            </div>
            {v.status === 'loading' && <p className="sub">Reading your games…</p>}
            {v.status === 'offline' && <p className="sub">Saved. Live stats will show up as soon as the site's API is switched on. Meanwhile your op.gg is one click away.</p>}
            {v.status === 'error' && <p className="err">{v.error === 'Riot ID not found in that region' ? 'Riot ID not found in that region. Check the tag and region.' : `Could not load your stats (${v.error}).`}</p>}
            {d && (
              <>
                <div className="pm-stats">
                  {d.solo && <div><b>{Math.round((d.solo.wins / Math.max(1, d.solo.wins + d.solo.losses)) * 100)}%</b><span>Season WR · {d.solo.wins + d.solo.losses} games</span></div>}
                  <div><b>{d.recent.games ? `${d.recent.wins}-${d.recent.games - d.recent.wins}` : '—'}</b><span>Last {d.recent.games} ranked</span></div>
                  <div><b>{d.mastery[0] ? (d.mastery[0].points / 1000).toFixed(0) + 'k' : '—'}</b><span>Top mastery</span></div>
                </div>
                <span className="stat-label">Your champions</span>
                <div className="pm-champs">
                  {d.recent.champions.slice(0, 6).map((c) => {
                    const id = keyTo.get(c.key); if (!id) return null
                    return <div key={c.key} className="pm-champ" title={`${id}: ${c.wins}W ${c.games - c.wins}L · KDA ${((c.k + c.a) / Math.max(1, c.d)).toFixed(1)}`}><img src={iconUrl(id)} alt="" /><span>{Math.round((c.wins / c.games) * 100)}%</span><small>{c.games}g</small></div>
                  })}
                  {d.recent.champions.length === 0 && d.mastery.slice(0, 6).map((m) => { const id = keyTo.get(m.key); return id ? <div key={m.key} className="pm-champ"><img src={iconUrl(id)} alt="" /><small>M{m.level}</small></div> : null })}
                </div>
              </>
            )}
            <div className="pm-actions">
              <a className="btn" href={opggUrl(v)} target="_blank" rel="noreferrer">Open op.gg ↗</a>
              <button className="btn" onClick={() => refresh()}>Refresh</button>
              <button className="btn" onClick={() => { signOut(); setRiotId('') }}>Change account</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export const shouldOnboard = () => !onboardingSkipped()
