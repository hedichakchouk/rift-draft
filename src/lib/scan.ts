import { iconUrl } from './ddragon'
import type { Champion } from './types'

export interface Found { id: string; conf: number; slot: string }
export interface ScanResult { ally: Found[]; enemy: Found[]; bans: Found[] }

/**
 * Reads a League champ select screenshot by matching portraits against Data Dragon icons.
 * Layout is expressed as fractions of the client window (16:9), so any resolution works.
 */
const W = 1600, H = 897 // reference screenshot the fractions were measured on
const PICK_Y = [167, 267, 367, 467, 567]
const SPOTS: { slot: string; kind: 'pick' | 'ban'; side: 'ally' | 'enemy'; x: number; y: number; r: number }[] = [
  ...PICK_Y.map((y, i) => ({ slot: `L${i + 1}`, kind: 'pick' as const, side: 'ally' as const, x: 68, y, r: 33 })),
  ...PICK_Y.map((y, i) => ({ slot: `R${i + 1}`, kind: 'pick' as const, side: 'enemy' as const, x: 1529, y, r: 33 })),
  ...[36, 86, 136, 186, 236].map((x, i) => ({ slot: `BL${i + 1}`, kind: 'ban' as const, side: 'ally' as const, x, y: 55, r: 15 })),
  ...[1361, 1411, 1461, 1511, 1561].map((x, i) => ({ slot: `BR${i + 1}`, kind: 'ban' as const, side: 'enemy' as const, x, y: 55, r: 15 })),
]

const N = 20 // descriptor grid

const load = (src: string) => new Promise<HTMLImageElement | null>((res) => {
  const i = new Image(); i.crossOrigin = 'anonymous'
  i.onload = () => res(i); i.onerror = () => res(null); i.src = src
})

function descriptor(draw: (ctx: CanvasRenderingContext2D) => void, round: boolean): Float32Array | null {
  const c = document.createElement('canvas'); c.width = N; c.height = N
  const x = c.getContext('2d', { willReadFrequently: true })!
  x.imageSmoothingQuality = 'high'
  draw(x)
  const d = x.getImageData(0, 0, N, N).data
  const v: number[] = []
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const dx = i + 0.5 - N / 2, dy = j + 0.5 - N / 2
    if (round ? dx * dx + dy * dy > (N * 0.4) ** 2 : Math.abs(dx) > N * 0.42 || Math.abs(dy) > N * 0.42) continue
    const k = (j * N + i) * 4
    v.push(d[k], d[k + 1], d[k + 2])
  }
  const mean = v.reduce((s, a) => s + a, 0) / v.length
  const sd = Math.sqrt(v.reduce((s, a) => s + (a - mean) ** 2, 0) / v.length)
  if (sd < 14) return null // flat or empty
  return Float32Array.from(v, (a) => (a - mean) / sd / Math.sqrt(v.length))
}
const dot = (a: Float32Array, b: Float32Array) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s }

const cache = new Map<string, { round: Float32Array | null; square: Float32Array | null }>()
async function iconDescriptors(champs: Champion[], onProgress: (n: number) => void) {
  let done = 0
  await Promise.all(champs.map(async (c) => {
    if (!cache.has(c.id)) {
      const im = await load(iconUrl(c.id))
      // the game crops the icon's artwork edge off; match on the inner 92%
      const draw = (x: CanvasRenderingContext2D) => { if (im) x.drawImage(im, im.width * 0.04, im.height * 0.04, im.width * 0.92, im.height * 0.92, 0, 0, N, N) }
      cache.set(c.id, { round: im ? descriptor(draw, true) : null, square: im ? descriptor(draw, false) : null })
    }
    onProgress(++done / champs.length)
  }))
}

export async function scanScreenshot(blob: Blob, champs: Champion[], onProgress: (msg: string, pct: number) => void): Promise<ScanResult> {
  onProgress('Loading champion icons', 0.05)
  await iconDescriptors(champs, (p) => onProgress('Loading champion icons', 0.05 + 0.5 * p))
  const bmp = await createImageBitmap(blob)
  const src = document.createElement('canvas'); src.width = bmp.width; src.height = bmp.height
  src.getContext('2d')!.drawImage(bmp, 0, 0)
  const sx = bmp.width / W, sy = bmp.height / H
  const res: ScanResult = { ally: [], enemy: [], bans: [] }
  const taken = new Set<string>()
  const scored: { spot: (typeof SPOTS)[number]; id: string; conf: number }[] = []

  onProgress('Matching portraits', 0.6)
  for (const s of SPOTS) {
    const round = s.kind === 'pick'
    const cands: { id: string; conf: number; dx: number; dy: number; k: number }[] = []
    // small search around the expected position and size, to absorb borders and crops
    for (const k of [0.9, 1, 1.1]) for (const dy of [-4, 0, 4]) for (const dx of [-4, 0, 4]) {
      const r = s.r * k * Math.min(sx, sy)
      const cx = (s.x + dx) * sx, cy = (s.y + dy) * sy
      const d = descriptor((x) => x.drawImage(src, cx - r, cy - r, r * 2, r * 2, 0, 0, N, N), round)
      if (!d) continue
      let best = { id: '', conf: -1 }
      for (const c of champs) { const e = cache.get(c.id); const ed = round ? e?.round : e?.square; if (!ed) continue; const v = dot(d, ed); if (v > best.conf) best = { id: c.id, conf: v } }
      cands.push({ ...best, dx, dy, k })
    }
    const top = cands.sort((a, b) => b.conf - a.conf)[0]
    if (top && top.conf >= 0.62) scored.push({ spot: s, id: top.id, conf: top.conf })
  }
  // a champion appears once per screenshot as a pick; keep the best spot for duplicates
  scored.sort((a, b) => b.conf - a.conf)
  for (const m of scored) {
    if (m.spot.kind === 'pick' && taken.has(m.id)) continue
    if (m.spot.kind === 'pick') taken.add(m.id)
    const f: Found = { id: m.id, conf: Math.round(m.conf * 100) / 100, slot: m.spot.slot }
    if (m.spot.kind === 'ban') res.bans.push(f); else res[m.spot.side].push(f)
  }
  for (const k of ['ally', 'enemy', 'bans'] as const) res[k].sort((a, b) => a.slot.localeCompare(b.slot))
  ;(window as unknown as { __scan?: unknown }).__scan = scored.map((m) => `${m.spot.slot}:${m.id}:${m.conf.toFixed(2)}`)
  onProgress('Done', 1)
  return res
}
