import { useState } from 'react'
import cfg from '../data/support.json'

const heart = <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.6 5 6 5c2 0 3.4 1.1 4 2.3h4C14.6 6.1 16 5 18 5c3.4 0 5.1 3.4 3.6 6.8C19.5 16.4 12 21 12 21z" /></svg>

/** Floating "support Hach" button. Hidden until a PayPal link is set in src/data/support.json. */
export default function Support() {
  const [open, setOpen] = useState(false)
  const base = (cfg.paypal ?? '').trim()
  if (!/^https:\/\//i.test(base)) return null
  const isMe = /paypal\.me\//i.test(base), isDonate = /paypal\.com\/donate/i.test(base)
  const link = (amt?: number) => (!amt ? base : isMe ? `${base.replace(/\/+$/, '')}/${amt}${cfg.currency}` : isDonate ? `${base}&amount=${amt}` : base)
  return (
    <div className={`support ${open ? 'open' : ''}`}>
      {open && (
        <div className="support-pop" role="dialog" aria-label="Support Hach">
          <button className="support-x" onClick={() => setOpen(false)} aria-label="Close">×</button>
          <h3>Support Hach</h3>
          <p>Enjoying the site, the draft tools or the clips? A small tip keeps it free and helps me build more.</p>
          {(isMe || isDonate) && (
            <div className="support-amts">
              {cfg.amounts.map((a) => <a key={a} className="btn" href={link(a)} target="_blank" rel="noreferrer noopener">{a} {cfg.currency === 'EUR' ? '€' : cfg.currency}</a>)}
            </div>
          )}
          <a className="btn gold support-go" href={link()} target="_blank" rel="noreferrer noopener">{isMe || isDonate ? 'Other amount on PayPal' : 'Tip on PayPal'}</a>
          <small>Optional. Opens PayPal in a new tab. Thank you!</small>
        </div>
      )}
      <button className="support-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>{heart}<span>Support Hach</span></button>
    </div>
  )
}
