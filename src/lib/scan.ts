import type { Champion } from './types'

export interface Found { id: string; x: number; y: number; conf: number }
export interface ScanResult { ally: Found[]; enemy: Found[]; words: number }

const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '')

function lev(a: string, b: string) {
  const m = a.length, n = b.length
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 1; j <= n; j++) d[0][j] = j
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[m][n]
}

/** Draw the screenshot to a canvas at OCR-friendly size, optionally inverted (light text on dark UI). */
async function prepare(blob: Blob, invert: boolean): Promise<{ canvas: HTMLCanvasElement; w: number }> {
  const bmp = await createImageBitmap(blob)
  const scale = bmp.width < 1800 ? 1800 / bmp.width : bmp.width > 3000 ? 3000 / bmp.width : 1
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale)
  const x = c.getContext('2d', { willReadFrequently: true })!
  x.drawImage(bmp, 0, 0, c.width, c.height)
  const im = x.getImageData(0, 0, c.width, c.height), p = im.data
  for (let i = 0; i < p.length; i += 4) {
    let g = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]
    if (invert) g = 255 - g
    g = g > 150 ? 255 : g < 90 ? 0 : g // push contrast
    p[i] = p[i + 1] = p[i + 2] = g
  }
  x.putImageData(im, 0, 0)
  return { canvas: c, w: c.width }
}

function match(lines: { words: { text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number } }[] }[], champs: Champion[], width: number): Found[] {
  const exact = new Map<string, Champion>()
  for (const c of champs) { exact.set(norm(c.name), c); exact.set(norm(c.id), c) }
  const found = new Map<string, Found>()
  const put = (c: Champion, bb: { x0: number; y0: number; x1: number; y1: number }, conf: number) => {
    const f: Found = { id: c.id, x: (bb.x0 + bb.x1) / 2 / width, y: (bb.y0 + bb.y1) / 2, conf }
    const old = found.get(c.id)
    if (!old || f.conf > old.conf) found.set(c.id, f)
  }
  for (const line of lines) {
    const ws = line.words.filter((w) => norm(w.text))
    for (let i = 0; i < ws.length; i++) {
      for (let n = 1; n <= 3 && i + n <= ws.length; n++) {
        const seq = ws.slice(i, i + n)
        const key = norm(seq.map((w) => w.text).join(''))
        if (key.length < 2 || (key.length === 2 && (n > 1 || seq[0].confidence < 60))) continue
        const bb = { x0: Math.min(...seq.map((w) => w.bbox.x0)), y0: Math.min(...seq.map((w) => w.bbox.y0)), x1: Math.max(...seq.map((w) => w.bbox.x1)), y1: Math.max(...seq.map((w) => w.bbox.y1)) }
        const conf = Math.min(...seq.map((w) => w.confidence))
        const hit = exact.get(key)
        if (hit) { put(hit, bb, conf + 20); continue }
        if (key.length >= 6 && conf >= 40) {
          let best: Champion | null = null, bd = 2
          for (const c of champs) {
            const nm = norm(c.name)
            if (Math.abs(nm.length - key.length) > 1 || nm.length < 6) continue
            const d = lev(nm, key)
            if (d < bd) { bd = d; best = c }
          }
          if (best) put(best, bb, conf)
        }
      }
    }
  }
  return [...found.values()]
}

export async function scanScreenshot(blob: Blob, champs: Champion[], onProgress: (msg: string, pct: number) => void): Promise<ScanResult> {
  onProgress('Loading the reader…', 0.05)
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng', 1, { logger: (m: { status: string; progress: number }) => onProgress(m.status.replace(/_/g, ' '), 0.1 + 0.8 * (m.progress ?? 0)) })
  try {
    let all: Found[] = [], words = 0
    for (const invert of [true, false]) {
      const { canvas, w } = await prepare(blob, invert)
      const { data } = await worker.recognize(canvas, {}, { blocks: true })
      const lines = (data.blocks ?? []).flatMap((b) => b.paragraphs.flatMap((p) => p.lines)) as never[]
      words += data.words?.length ?? 0
      const hits = match(lines, champs, w)
      const merged = new Map(all.map((f) => [f.id, f]))
      hits.forEach((f) => { const o = merged.get(f.id); if (!o || f.conf > o.conf) merged.set(f.id, f) })
      all = [...merged.values()]
      if (all.length >= 8) break
    }
    all.sort((a, b) => a.y - b.y)
    return { ally: all.filter((f) => f.x < 0.5), enemy: all.filter((f) => f.x >= 0.5), words }
  } finally { await worker.terminate() }
}
