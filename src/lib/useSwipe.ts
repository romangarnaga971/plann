import { useEffect, useRef, type RefObject } from 'react'

// Жести не повинні заважати полям вводу й формі редагування.
const isExcluded = (target: EventTarget | null) =>
  target instanceof Element && !!target.closest('input, textarea, select, form')

// onSwipe отримує 1 для наступного вигляду, -1 для попереднього й повертає,
// чи вигляд змінився. Працює дотиком на телефоні й двома пальцями на трекпаді.
export function useSwipe(ref: RefObject<HTMLElement | null>, onSwipe: (direction: 1 | -1) => boolean) {
  const handler = useRef(onSwipe)
  useEffect(() => {
    handler.current = onSwipe
  })

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const el = element

    function fire(direction: 1 | -1) {
      if (!handler.current(direction)) return
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
      el.animate(
        [
          { transform: `translateX(${direction * 48}px)`, opacity: 0.4 },
          { transform: 'translateX(0)', opacity: 1 },
        ],
        { duration: 180, easing: 'ease-out' },
      )
    }

    let start: { x: number; y: number } | null = null
    let horizontal: boolean | null = null
    let dx = 0

    function onTouchStart(event: TouchEvent) {
      start = event.touches.length === 1 && !isExcluded(event.target)
        ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
        : null
      horizontal = null
      dx = 0
    }

    function onTouchMove(event: TouchEvent) {
      if (!start) return
      dx = event.touches[0].clientX - start.x
      const dy = event.touches[0].clientY - start.y
      if (horizontal === null && Math.hypot(dx, dy) > 10) horizontal = Math.abs(dx) > Math.abs(dy)
      if (horizontal) el.style.transform = `translateX(${dx * 0.4}px)`
    }

    function onTouchEnd() {
      el.style.transform = ''
      if (start && horizontal && Math.abs(dx) > 60) fire(dx < 0 ? 1 : -1)
      start = null
    }

    function onTouchCancel() {
      el.style.transform = ''
      start = null
    }

    let wheelTotal = 0
    let wheelLocked = false
    let wheelTimer: number | undefined

    // Трекпад шле багато подій за один жест, тому один жест перемикає лише раз.
    function onWheel(event: WheelEvent) {
      if (isExcluded(event.target) || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return
      window.clearTimeout(wheelTimer)
      wheelTimer = window.setTimeout(() => {
        wheelTotal = 0
        wheelLocked = false
      }, 200)
      if (wheelLocked) return
      wheelTotal += event.deltaX
      if (Math.abs(wheelTotal) > 80) {
        wheelLocked = true
        fire(wheelTotal > 0 ? 1 : -1)
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchCancel)
    el.addEventListener('wheel', onWheel, { passive: true })
    return () => {
      window.clearTimeout(wheelTimer)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchCancel)
      el.removeEventListener('wheel', onWheel)
    }
  }, [ref])
}
