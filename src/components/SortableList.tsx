import type { KeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import type { Task } from '../lib/store'

// Переставляти можна лише незроблені задачі, і закріплені окремо від решти.
export const segmentOf = (task: Task) => (task.done ? undefined : task.pinned ? 'pinned' : 'open')

const SCROLL_EDGE = 80
// Висота нижньої панелі з рядком вводу, яка перекриває низ списку.
const BOTTOM_BAR = 140

const move = <T,>(list: T[], from: number, to: number) => {
  const next = [...list]
  next.splice(to, 0, ...next.splice(from, 1))
  return next
}

export function SortableList({
  tasks,
  onReorder,
  renderTask,
}: {
  tasks: Task[]
  onReorder: (ordered: Task[]) => void
  renderTask: (task: Task, handle: ReactNode) => ReactNode
}) {
  const segment = (task: Task) => tasks.filter((t) => segmentOf(t) === segmentOf(task))

  function startDrag(event: ReactPointerEvent<HTMLButtonElement>, task: Task) {
    if (event.button !== 0) return
    event.preventDefault()
    const row = event.currentTarget.closest('li')!
    const rows = ([...row.parentElement!.children] as HTMLElement[]).filter(
      (el) => el.dataset.segment === segmentOf(task),
    )
    const items = segment(task)
    const from = rows.indexOf(row)
    // Позиції в координатах сторінки, щоб прокрутка під час перетягування нічого не зсувала.
    const boxes = rows.map((el) => {
      const rect = el.getBoundingClientRect()
      return { top: rect.top + scrollY, height: rect.height }
    })
    const own = boxes[from]
    const last = boxes[boxes.length - 1]
    const startY = event.clientY + scrollY
    const pointerId = event.pointerId
    let pointerY = event.clientY
    let to = from
    let frame = 0

    row.dataset.dragging = 'true'
    rows.forEach((el) => el !== row && (el.style.transition = 'transform 150ms ease-out'))

    function update() {
      const min = boxes[0].top - own.top
      const max = last.top + last.height - (own.top + own.height)
      const dy = Math.min(max, Math.max(min, pointerY + scrollY - startY))
      row.style.transform = `translateY(${dy}px)`
      // Рядок займає нове місце, щойно його край перетнув середину сусіда.
      to = boxes.filter((box, i) => {
        if (i === from) return false
        const middle = box.top + box.height / 2
        return i < from ? middle < own.top + dy : middle < own.top + own.height + dy
      }).length
      rows.forEach((el, i) => {
        if (el === row) return
        const shift = i > from && i <= to ? -own.height : i < from && i >= to ? own.height : 0
        el.style.transform = shift ? `translateY(${shift}px)` : ''
      })
    }

    function autoScroll() {
      const speed = pointerY < SCROLL_EDGE ? -8 : pointerY > innerHeight - BOTTOM_BAR - SCROLL_EDGE ? 8 : 0
      if (speed) {
        scrollBy(0, speed)
        update()
      }
      frame = requestAnimationFrame(autoScroll)
    }

    function onMove(e: PointerEvent) {
      if (e.pointerId !== pointerId) return
      pointerY = e.clientY
      update()
      // Прокрутка біля країв починається лише після руху, а не від самого дотику.
      if (!frame) frame = requestAnimationFrame(autoScroll)
    }

    function finish(save: boolean) {
      cancelAnimationFrame(frame)
      removeEventListener('pointermove', onMove)
      removeEventListener('pointerup', onUp)
      removeEventListener('pointercancel', onCancel)
      removeEventListener('keydown', onKey)
      delete row.dataset.dragging
      rows.forEach((el) => {
        el.style.transition = ''
        el.style.transform = ''
      })
      if (save && to !== from) onReorder(move(items, from, to))
    }
    const onUp = (e: PointerEvent) => e.pointerId === pointerId && finish(true)
    const onCancel = (e: PointerEvent) => e.pointerId === pointerId && finish(false)
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && finish(false)

    addEventListener('pointermove', onMove)
    addEventListener('pointerup', onUp)
    addEventListener('pointercancel', onCancel)
    addEventListener('keydown', onKey)
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, task: Task) {
    const delta = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0
    if (!delta) return
    event.preventDefault()
    const items = segment(task)
    const from = items.findIndex((t) => t.id === task.id)
    if (!items[from + delta]) return
    const button = event.currentTarget
    onReorder(move(items, from, from + delta))
    requestAnimationFrame(() => button.focus())
  }

  return (
    <ul>
      {tasks.map((task) =>
        renderTask(
          task,
          segmentOf(task) && segment(task).length > 1 ? (
            <button
              type="button"
              data-drag-handle
              aria-label={`Перемістити: ${task.title}. Стрілки вгору та вниз`}
              onPointerDown={(e) => startDrag(e, task)}
              onMouseDown={(e) => e.preventDefault()}
              onKeyDown={(e) => onKeyDown(e, task)}
              className="grid h-12 w-10 shrink-0 cursor-grab touch-none place-items-center text-muted select-none active:cursor-grabbing"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M5 9h14M5 15h14" />
              </svg>
            </button>
          ) : segmentOf(task) ? (
            // Порожнє місце замість ручки, щоб шпилька не стрибала, коли задача в групі одна.
            <span className="w-10 shrink-0" />
          ) : null,
        ),
      )}
    </ul>
  )
}
