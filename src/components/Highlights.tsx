import { ClipBox } from './TierList'
import { useClips } from '../lib/clips'

const KickIcon = () => <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden><path fill="#53fc18" d="M3 2h6v5h3V4h3V2h6v7h-3v3h-3v3h3v3h3v7h-6v-2h-3v-3H9v5H3z" transform="scale(.86) translate(1.7 0)" /></svg>
const OutplayedIcon = () => <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden><circle cx="12" cy="12" r="11" fill="#7b4dff" /><path fill="#fff" d="M10 8v8l6.5-4z" /></svg>
const YouTubeIcon = () => <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden><rect x="1" y="4.5" width="22" height="15" rx="4.5" fill="#ff0033" /><path fill="#fff" d="M10 8.6v6.8l6-3.4z" /></svg>

export default function Highlights() {
  const clips = useClips()
  const n = clips.get('highlights').length
  return (
    <div className="tier-page">
      <section className="card fg-hl">
        <div className="card-head"><div><h2>Highlights</h2><p className="sub">{n ? `${n} clip${n === 1 ? '' : 's'} from our games` : 'Clips from our games'}. More on the Hach Kick, YouTube and Outplayed pages.</p></div>
          <div className="hl-links">
            <a className="btn" href="https://kick.com/hachfit" target="_blank" rel="noreferrer"><KickIcon /> More clips on Kick</a>
            <a className="btn" href="https://outplayed.tv/my-parties" target="_blank" rel="noreferrer"><OutplayedIcon /> Outplayed</a>
            <a className="btn" href="https://www.youtube.com/@hedichakchoukk" target="_blank" rel="noreferrer"><YouTubeIcon /> YouTube channel</a>
          </div></div>
        <ClipBox id="highlights" clips={clips} />
      </section>
    </div>
  )
}
