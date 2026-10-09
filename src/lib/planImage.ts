import { iconUrl, itemUrl, loadItemsById, loadRunes, loadSummoners } from './ddragon'
import type { Build } from './meta'

export interface PlanData {
  name: string; id: string; lane: string; foe?: string; player?: string
  build: Build | null; enemyLines: string[]; bans: string[]; recs: string[]
}

const img = (src: string) => new Promise<HTMLImageElement | null>((res) => {
  const i = new Image(); i.crossOrigin = 'anonymous'
  i.onload = () => res(i); i.onerror = () => res(null); i.src = src
})
function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, w: number, lh: number, max = 3) {
  const words = text.split(' '); let line = '', n = 0
  for (const wd of words) {
    const t = line ? `${line} ${wd}` : wd
    if (ctx.measureText(t).width > w && line) { ctx.fillText(line, x, y); y += lh; line = wd; if (++n >= max) return y }
    else line = t
  }
  if (line) { ctx.fillText(line, x, y); y += lh }
  return y
}

/** Draws the game plan to a 1200x675 PNG. */
export async function renderPlan(d: PlanData): Promise<Blob | null> {
  const [items, runes, sums] = await Promise.all([loadItemsById().catch(() => new Map()), loadRunes().catch(() => new Map()), loadSummoners().catch(() => new Map())])
  const b = d.build
  const coreIds = b?.core?.set ?? []
  const [champ, ...itemImgs] = await Promise.all([img(iconUrl(d.id)), ...coreIds.map((i) => img(itemUrl(String(i))))])
  const c = document.createElement('canvas'); c.width = 1200; c.height = 675
  const x = c.getContext('2d')!
  const g = x.createLinearGradient(0, 0, 1200, 675); g.addColorStop(0, '#0b1220'); g.addColorStop(1, '#10232b')
  x.fillStyle = g; x.fillRect(0, 0, 1200, 675)
  x.strokeStyle = '#c8aa6e'; x.lineWidth = 3; x.strokeRect(14, 14, 1172, 647)
  x.fillStyle = '#c8aa6e'; x.font = '800 22px system-ui, sans-serif'; x.fillText('HACH DRAFT  ·  GAME PLAN', 50, 62)
  x.fillStyle = '#8e9ab0'; x.font = '16px system-ui, sans-serif'; x.fillText('hedichakchouk.github.io/rift-draft', 50, 640)

  if (champ) { x.save(); x.beginPath(); x.roundRect(50, 90, 150, 150, 20); x.clip(); x.drawImage(champ, 50, 90, 150, 150); x.restore(); x.strokeStyle = '#c8aa6e'; x.lineWidth = 4; x.beginPath(); x.roundRect(50, 90, 150, 150, 20); x.stroke() }
  x.fillStyle = '#f0e6d2'; x.font = '800 54px system-ui, sans-serif'; x.fillText(d.name, 225, 150)
  x.fillStyle = '#c8aa6e'; x.font = '600 24px system-ui, sans-serif'
  x.fillText(`${d.lane.toUpperCase()}${d.player ? ' · ' + d.player : ''}${d.foe ? '  vs  ' + d.foe : ''}`, 225, 192)
  const keystone = b?.runes ? runes.get(b.runes.pri[0])?.name : null
  const spells = (b?.spells ?? []).map((k) => sums.get(k)?.name).filter(Boolean).join(' + ')
  x.fillStyle = '#8e9ab0'; x.font = '20px system-ui, sans-serif'
  x.fillText([keystone, spells].filter(Boolean).join('   ·   '), 225, 226)

  x.fillStyle = '#6fe3a8'; x.font = '700 18px system-ui, sans-serif'; x.fillText('CORE BUILD', 50, 292)
  itemImgs.forEach((im, i) => { if (im) x.drawImage(im, 50 + i * 84, 306, 72, 72) })
  if (b?.core) { x.fillStyle = '#eae6da'; x.font = '18px system-ui, sans-serif'; x.fillText(coreIds.map((i) => items.get(String(i))?.name).filter(Boolean).join(' → '), 50, 410) }
  if (b?.skillPriority) { x.fillStyle = '#6fe3a8'; x.font = '700 18px system-ui, sans-serif'; x.fillText('SKILL PRIORITY', 50, 460); x.fillStyle = '#f0e6d2'; x.font = '800 34px system-ui, sans-serif'; x.fillText(b.skillPriority.split('').join('  ›  '), 50, 505) }
  if (d.recs.length) { x.fillStyle = '#8e9ab0'; x.font = '16px system-ui, sans-serif'; x.fillText(`Other good picks: ${d.recs.join(', ')}`, 50, 560) }

  x.fillStyle = 'rgba(255,255,255,.05)'; x.beginPath(); x.roundRect(660, 90, 490, 520, 18); x.fill()
  let y = 130
  x.fillStyle = '#ff8a8a'; x.font = '700 18px system-ui, sans-serif'; x.fillText('READING THEIR DRAFT', 690, y); y += 34
  x.fillStyle = '#eae6da'; x.font = '19px system-ui, sans-serif'
  for (const l of d.enemyLines.slice(0, 4)) { y = wrap(x, '• ' + l, 690, y, 430, 26, 3) + 10 }
  if (!d.enemyLines.length) { x.fillText('Add enemy picks to see their plan.', 690, y); y += 36 }
  if (d.bans.length) { y += 14; x.fillStyle = '#b78bff'; x.font = '700 18px system-ui, sans-serif'; x.fillText('BAN FIRST', 690, y); y += 34; x.fillStyle = '#eae6da'; x.font = '19px system-ui, sans-serif'; wrap(x, d.bans.join(', '), 690, y, 430, 26, 2) }

  return new Promise((res) => { try { c.toBlob((bl) => res(bl), 'image/png') } catch { res(null) } })
}
