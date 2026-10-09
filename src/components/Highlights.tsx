import { ClipBox } from './TierList'
import { useClips } from '../lib/clips'

export default function Highlights() {
  const clips = useClips()
  const n = clips.get('highlights').length
  return (
    <div className="tier-page">
      <section className="card fg-hl">
        <div className="card-head"><div><h2>Highlights</h2><p className="sub">{n ? `${n} clip${n === 1 ? '' : 's'} from our games` : 'Clips from our games'}. More on the Hach Kick and YouTube channels.</p></div>
          <div className="hl-links">
            <a className="btn" href="https://kick.com/hachfit" target="_blank" rel="noreferrer">More clips on Kick</a>
            <a className="btn" href="https://www.youtube.com/@hedichakchoukk" target="_blank" rel="noreferrer">YouTube channel</a>
          </div></div>
        <ClipBox id="highlights" clips={clips} />
      </section>
    </div>
  )
}
