import { useState } from 'react'
import cfg from '../data/support.json'

interface Link { label: string; url: string; primary?: boolean }
const ok = (u: string) => /^https:\/\//i.test(u)
const links = (cfg.links as Link[]).filter((l) => ok(l.url))
interface Cup { cups: number; price: string; url: string }
const cups = (cfg.coffee.options as Cup[]).filter((o) => ok(o.url))
const customUrl = ok(cfg.coffee.customUrl) ? cfg.coffee.customUrl : ''
const hasCoffee = cups.length > 0 || !!customUrl
const heart = <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.6 5 6 5c2 0 3.4 1.1 4 2.3h4C14.6 6.1 16 5 18 5c3.4 0 5.1 3.4 3.6 6.8C19.5 16.4 12 21 12 21z" /></svg>

/** Floating support button. Add or change the links in src/data/support.json; hidden when there are none. */
export default function Support() {
  const [open, setOpen] = useState(false)
  if (!links.length && !hasCoffee) return null
  return (
    <div className={`support ${open ? 'open' : ''}`}>
      {open && (
        <div className="support-pop" role="dialog" aria-label={cfg.title}>
          <button className="support-x" onClick={() => setOpen(false)} aria-label="Close">×</button>
          <h3>{cfg.title}</h3>
          <p>{cfg.message}</p>
          {hasCoffee && (
            <div className="coffee">
              <h4>☕ {cfg.coffee.label}</h4>
              <div className="coffee-opts">
                {cups.map((o) => <a key={o.url} className="coffee-opt" href={o.url} target="_blank" rel="noreferrer noopener"><b>{o.cups === 1 ? '☕' : `☕ ×${o.cups}`}</b><span>{o.price}</span></a>)}
              </div>
              {customUrl && <a className="btn gold support-go" href={customUrl} target="_blank" rel="noreferrer noopener">Choose your own amount</a>}
            </div>
          )}
          {links.map((l) => <a key={l.url} className={`btn support-go ${l.primary ? 'gold' : ''}`} href={l.url} target="_blank" rel="noreferrer noopener">{l.label}</a>)}
          <small>Optional. Opens in a new tab. Thank you!</small>
        </div>
      )}
      <button className="support-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>{heart}<span>{cfg.title}</span></button>
    </div>
  )
}
