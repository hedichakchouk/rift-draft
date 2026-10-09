import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { Lane } from '../../lib/types'

const CD = 'https://raw.communitydragon.org/latest/plugins'
const POS: Record<Lane, string> = { top: 'top', jungle: 'jungle', mid: 'middle', bot: 'bottom', support: 'utility' }
export const laneIconUrl = (l: Lane) => `${CD}/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-${POS[l]}.png`
export const rankCrestUrl = (tier: string) => `${CD}/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests/${tier.toLowerCase()}.svg`
export const threshVoice = `${CD}/rcp-be-lol-game-data/global/default/v1/champion-choose-vo/412.ogg`

export function LaneIcon({ lane, size = 18 }: { lane: Lane; size?: number }) {
  return <img className="lane-ico" src={laneIconUrl(lane)} width={size} height={size} alt="" draggable={false} />
}

const TIER_COLOR: Record<string, string> = {
  IRON: '#8c7b72', BRONZE: '#b0703f', SILVER: '#a7b6c2', GOLD: '#e3b453', PLATINUM: '#3fb6a8', EMERALD: '#2fd08a',
  DIAMOND: '#6a8cff', MASTER: '#c264ff', GRANDMASTER: '#ff5a5a', CHALLENGER: '#f4d47c',
}
export function RankBadge({ tier, division, lp, small }: { tier?: string | null; division?: string | null; lp?: number | null; small?: boolean }) {
  if (!tier) return <span className={`rank-badge ${small ? 'sm' : ''}`} style={{ ['--rc' as string]: '#6b7790' }}>Unranked</span>
  const apex = ['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(tier)
  return (
    <span className={`rank-badge ${small ? 'sm' : ''}`} style={{ ['--rc' as string]: TIER_COLOR[tier] ?? '#c8aa6e' }}>
      <img src={rankCrestUrl(tier)} alt="" />
      {tier.charAt(0) + tier.slice(1).toLowerCase()}{apex ? '' : ` ${division ?? ''}`}{lp != null ? ` · ${lp} LP` : ''}
    </span>
  )
}

/** Segmented control with a sliding highlight. */
export function Seg<T extends string | number>({ value, onChange, options, size = 'md', className = '' }: {
  value: T; onChange: (v: T) => void; options: { id: T; label: ReactNode; icon?: ReactNode; title?: string }[]; size?: 'sm' | 'md' | 'lg'; className?: string
}) {
  const wrap = useRef<HTMLDivElement>(null)
  const [ind, setInd] = useState<{ left: number; width: number } | null>(null)
  useLayoutEffect(() => {
    const el = wrap.current?.querySelector<HTMLButtonElement>(`[data-id="${String(value)}"]`)
    if (el) setInd((p) => (p && p.left === el.offsetLeft && p.width === el.offsetWidth ? p : { left: el.offsetLeft, width: el.offsetWidth }))
  })
  return (
    <div className={`segx segx-${size} ${className}`} ref={wrap} role="tablist">
      {ind && <span className="segx-ind" style={{ transform: `translateX(${ind.left}px)`, width: ind.width }} />}
      {options.map((o) => (
        <button key={String(o.id)} data-id={String(o.id)} role="tab" aria-selected={o.id === value} title={o.title}
          className={o.id === value ? 'on' : ''} onClick={() => onChange(o.id)}>
          {o.icon}{o.label != null && <span>{o.label}</span>}
        </button>
      ))}
    </div>
  )
}

export function Pill({ tone = 'neutral', children, title }: { tone?: 'good' | 'warn' | 'bad' | 'neutral' | 'gold'; children: ReactNode; title?: string }) {
  return <span className={`pill pill-${tone}`} title={title}>{children}</span>
}

/** Meta tier chip (S+ ... D-) colored by grade. */
export function MetaTier({ tier }: { tier: string | null | undefined }) {
  if (!tier) return <span className="mtier mt-none" title="Not enough games this patch">—</span>
  return <span className={`mtier mt-${tier[0]}`} title="lolalytics tier, Emerald+ this patch">{tier}</span>
}

export function Ring({ value, size = 120, stroke = 10, tone }: { value: number; size?: number; stroke?: number; tone: 'good' | 'warn' | 'bad' }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, (value - 35) / 30 * 100)) // 35%..65% mapped to the ring
  return (
    <svg className={`ring ring-${tone}`} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} className="ring-bg" strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} className="ring-fg" strokeWidth={stroke} fill="none" strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * c} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  )
}

export const Icon = {
  map: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z" /><path d="M9 3v15M15 6v15" /></svg>,
  crown: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z" /><path d="M5 21h14" /></svg>,
  swords: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 17.5L3 6V3h3l11.5 11.5" /><path d="M13 19l6-6M16 16l4 4M19 21l2-2" /><path d="M9.5 17.5L21 6V3h-3L6.5 14.5" /><path d="M11 19l-6-6M8 16l-4 4M5 21l-2-2" /></svg>,
  eye: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>,
  user: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>,
  play: <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>,
  send: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4z" /></svg>,
  close: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>,
  sound: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4z" /><path d="M15.5 8.5a5 5 0 010 7M19 5a10 10 0 010 14" /></svg>,
  mute: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4z" /><path d="M23 9l-6 6M17 9l6 6" /></svg>,
  spark: <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z" /></svg>,
}
