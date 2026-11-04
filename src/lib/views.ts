import type { Task } from './store'
import { NO_TAG } from './tags'

export type View = 'today' | 'tomorrow' | 'week' | 'nodate'

export const VIEWS: { id: View; label: string }[] = [
  { id: 'today', label: 'Сьогодні' },
  { id: 'tomorrow', label: 'Завтра' },
  { id: 'week', label: 'Тиждень' },
  { id: 'nodate', label: 'Без дати' },
]

export interface Group {
  key: string
  label: string | null
  overdue: boolean
  tasks: Task[]
  // На скільки днів від сьогодні група переноситься кнопкою.
  moveTo?: number
}

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

const dayDiff = (a: Date, b: Date) =>
  Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86_400_000)

const fmtDay = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long' })
const fmtWeekday = new Intl.DateTimeFormat('uk-UA', { weekday: 'long' })
const fmtShort = new Intl.DateTimeFormat('uk-UA', { day: '2-digit', month: '2-digit' })

// Нова дата за зміщенням від сьогодні, час задачі лишається той самий.
export function moveToDay(dueAt: string, offset: number, now: Date): string {
  const due = new Date(dueAt)
  const day = addDays(now, offset)
  day.setHours(due.getHours(), due.getMinutes(), 0, 0)
  return day.toISOString()
}

export const formatTime = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

export const formatShortDate = (d: Date) => fmtShort.format(d)

export const formatLongDate = (d: Date) => `${fmtWeekday.format(d)}, ${fmtDay.format(d)}`

export function formatWhen(due: Date | null, hasTime: boolean, now: Date): string {
  if (!due) return 'без дати'
  const diff = dayDiff(due, now)
  const day = diff === 0 ? 'сьогодні' : diff === 1 ? 'завтра' : diff > 1 && diff < 7 ? fmtWeekday.format(due) : fmtDay.format(due)
  return hasTime ? `${day}, ${formatTime(due)}` : day
}

export function viewSubtitle(view: View, now: Date): string | null {
  if (view === 'today') return formatLongDate(now)
  if (view === 'tomorrow') return formatLongDate(addDays(now, 1))
  if (view === 'week') return `${fmtDay.format(now)} – ${fmtDay.format(addDays(now, 6))}`
  return null
}

function byOrder(a: Task, b: Task) {
  if (a.done !== b.done) return a.done ? 1 : -1
  // Задачі на цілий день ідуть перед задачами з часом.
  if (a.has_time !== b.has_time) return a.has_time ? 1 : -1
  if (a.has_time && a.due_at && b.due_at && a.due_at !== b.due_at) return a.due_at < b.due_at ? -1 : 1
  return a.created_at < b.created_at ? -1 : 1
}

const isPast = (t: Task, now: Date) => !!t.due_at && dayDiff(new Date(t.due_at), now) < 0
const onDay = (t: Task, day: Date) => !!t.due_at && dayDiff(new Date(t.due_at), day) === 0

// Зроблені задачі лишаються в групі внизу, поки їх не перенесуть в архів.
const overdueGroup = (tasks: Task[], now: Date): Group[] => {
  const overdue = tasks
    .filter((t) => isPast(t, now))
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1
      return a.due_at! < b.due_at! ? -1 : 1
    })
  return overdue.length ? [{ key: 'overdue', label: 'Прострочені', overdue: true, tasks: overdue, moveTo: 0 }] : []
}

export function groupsFor(view: View, tasks: Task[], now: Date): Group[] {
  if (view === 'nodate') {
    const list = tasks.filter((t) => !t.due_at).sort(byOrder)
    return list.length ? [{ key: 'nodate', label: null, overdue: false, tasks: list }] : []
  }
  if (view === 'tomorrow') {
    const list = tasks.filter((t) => onDay(t, addDays(now, 1))).sort(byOrder)
    return list.length ? [{ key: 'tomorrow', label: null, overdue: false, tasks: list }] : []
  }
  if (view === 'today') {
    const overdue = overdueGroup(tasks, now)
    const list = tasks.filter((t) => onDay(t, now)).sort(byOrder)
    if (!list.length) return overdue
    return [...overdue, { key: 'today', label: overdue.length ? 'Сьогодні' : null, overdue: false, tasks: list, moveTo: 1 }]
  }
  const days = Array.from({ length: 7 }, (_, i) => addDays(now, i))
  return [
    ...overdueGroup(tasks, now),
    ...days.map((day, i) => ({
      key: day.toISOString(),
      label: i === 0 ? 'Сьогодні' : i === 1 ? 'Завтра' : formatLongDate(day),
      overdue: false,
      tasks: tasks.filter((t) => onDay(t, day)).sort(byOrder),
      moveTo: i === 0 ? 1 : undefined,
    })),
  ]
}

// Усі задачі папки: спершу незроблені за датою, задачі без дати в кінці.
export function folderGroups(tag: string, tasks: Task[]): Group[] {
  const list = tasks.filter((t) => (tag === NO_TAG ? t.tags.length === 0 : t.tags.includes(tag)))
  const active = list
    .filter((t) => !t.done)
    .sort((a, b) => {
      if (!a.due_at || !b.due_at) return a.due_at ? -1 : b.due_at ? 1 : a.created_at < b.created_at ? -1 : 1
      return a.due_at < b.due_at ? -1 : 1
    })
  const done = list.filter((t) => t.done).sort((a, b) => ((a.done_at ?? '') < (b.done_at ?? '') ? 1 : -1))
  return [
    ...(active.length ? [{ key: 'active', label: null, overdue: false, tasks: active }] : []),
    ...(done.length ? [{ key: 'done', label: 'Зроблені', overdue: false, tasks: done }] : []),
  ]
}

export function countFor(view: View, tasks: Task[], now: Date): number {
  return groupsFor(view, tasks, now).reduce((sum, g) => sum + g.tasks.filter((t) => !t.done).length, 0)
}
