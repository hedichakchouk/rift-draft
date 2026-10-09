import { useState } from 'react'
import cfg from '../data/support.json'

interface Link { label: string; url: string; primary?: boolean }
const links = (cfg.links as Link[]).filter((l) => /^https:\/\//i.test(l.url))
const heart = <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.6 5 6 5c2 0 3.4 1.1 4 2.3h4C14.6 6.1 16 5 18 5c3.4 0 5.1 3.4 3.6 6.8C19.5 16.4 12 21 12 21z" /></svg>

/** Floating support button. Add or change the links in src/data/support.json; hidden when there are none. */
export default function Support() {
  const [open, setOpen] = useState(false)
  if (!links.length) return null
  return (
    <div className={`support ${open ? 'open' : ''}`}>
      {open && (
        <div className="support-pop" role="dialog" aria-label={cfg.title}>
          <button className="support-x" onClick={() => setOpen(false)} aria-label="Close">×</button>
          <h3>{cfg.title}</h3>
          <p>{cfg.message}</p>
          {links.map((l) => <a key={l.url} className={`btn support-go ${l.primary ? 'gold' : ''}`} href={l.url} target="_blank" rel="noreferrer noopener">{l.label}</a>)}
          <small>Optional. Opens in a new tab. Thank you!</small>
        </div>
      )}
      <button className="support-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>{heart}<span>{cfg.title}</span></button>
    </div>
  )
}
