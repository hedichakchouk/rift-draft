import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { iconUrl } from './ddragon'

/**
 * Pointer-based drag & drop (mouse + pen). More reliable than native HTML5 drag:
 * custom ghost, hover highlight, no browser image-drag quirks.
 * Touch devices use tap-to-place (tap a champion, then tap a lane), handled by the callers' onClick.
 *
 * Drop targets are any element with a `data-drop="<id>"` attribute.
 */
interface Ghost { id: string; x: number; y: number }
interface Ctx {
  start: (e: React.PointerEvent, champId: string, from?: string | null) => void
  over: string | null
  dragging: string | null // champion id currently dragged
}
const DndCtx = createContext<Ctx>({ start: () => {}, over: null, dragging: null })
export const useDnd = () => useContext(DndCtx)

export function DndProvider({
  onDrop,
  children,
}: {
  /** target = drop zone id (or null when released on nothing) */
  onDrop: (target: string | null, champId: string, from: string | null) => void
  children: ReactNode
}) {
  const [ghost, setGhost] = useState<Ghost | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const onDropRef = useRef(onDrop)
  onDropRef.current = onDrop

  const targetAt = (x: number, y: number) =>
    (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('[data-drop]')?.dataset.drop ?? null

  const start = useCallback((e: React.PointerEvent, champId: string, from: string | null = null) => {
    if (e.button !== 0 || e.pointerType === 'touch') return
    const sx = e.clientX, sy = e.clientY
    let active = false

    const move = (ev: PointerEvent) => {
      if (!active && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return
      active = true
      document.body.classList.add('is-dragging')
      setGhost({ id: champId, x: ev.clientX, y: ev.clientY })
      setOver(targetAt(ev.clientX, ev.clientY))
    }
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      if (!active) return // plain click: let the element's onClick run
      document.body.classList.remove('is-dragging')
      const target = targetAt(ev.clientX, ev.clientY)
      setGhost(null); setOver(null)
      // swallow the click that follows a real drag
      const stop = (c: Event) => { c.stopPropagation(); c.preventDefault() }
      window.addEventListener('click', stop, { capture: true, once: true })
      setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 0)
      onDropRef.current(target, champId, from)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }, [])

  return (
    <DndCtx.Provider value={{ start, over, dragging: ghost?.id ?? null }}>
      {children}
      {ghost && (
        <div className="ghost" style={{ left: ghost.x, top: ghost.y }}>
          <img src={iconUrl(ghost.id)} alt="" draggable={false} />
        </div>
      )}
    </DndCtx.Provider>
  )
}
