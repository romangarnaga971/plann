import { useState, type ReactNode } from 'react'
import type { Task } from '../lib/store'
import type { Folder } from '../lib/tags'
import { formatLongDate, formatMonth, isSameDay, monthGrid, startOfDay, tasksOnDay } from '../lib/views'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']
const fmtCellLabel = new Intl.DateTimeFormat('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' })

export function CalendarView({
  month,
  selected,
  now,
  tasks,
  folders,
  onMonth,
  onSelect,
  onDropTask,
  renderTask,
}: {
  month: Date
  selected: Date
  now: Date
  tasks: Task[]
  folders: Folder[]
  onMonth: (delta: number) => void
  onSelect: (day: Date) => void
  onDropTask: (id: string, day: Date) => void
  renderTask: (task: Task) => ReactNode
}) {
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const today = startOfDay(now)
  const dayTasks = tasksOnDay(tasks, selected)
  const colorOf = (task: Task) => folders.find((f) => f.name === task.tags[0])?.color

  return (
    <>
      <div className="px-4">
        <div className="flex items-center gap-1">
          <h2 className="mr-auto text-lg font-semibold first-letter:uppercase">{formatMonth(month)}</h2>
          <button
            onClick={() => onSelect(today)}
            className="h-11 rounded-lg px-3 text-sm font-medium text-accent-bright"
          >
            Сьогодні
          </button>
          <button onClick={() => onMonth(-1)} aria-label="Попередній місяць" className="grid size-11 place-items-center rounded-lg">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button onClick={() => onMonth(1)} aria-label="Наступний місяць" className="grid size-11 place-items-center rounded-lg">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="mt-2 grid grid-cols-7 text-center text-xs font-medium text-muted" aria-hidden>
          {WEEKDAYS.map((d) => (
            <span key={d} className="py-1">
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {monthGrid(month).map((day) => {
            const key = day.toDateString()
            const open = tasksOnDay(tasks, day).filter((t) => !t.done)
            const inMonth = day.getMonth() === month.getMonth()
            const isSelected = isSameDay(day, selected)
            const isToday = isSameDay(day, today)
            const isPast = day < today
            return (
              <button
                key={key}
                onClick={() => onSelect(day)}
                aria-label={`${fmtCellLabel.format(day)}${open.length ? `, задач: ${open.length}` : ''}`}
                aria-pressed={isSelected}
                onDragOver={(event) => {
                  if (!event.dataTransfer.types.includes('text/x-task')) return
                  event.preventDefault()
                  setDropTarget(key)
                }}
                onDragLeave={() => setDropTarget((current) => (current === key ? null : current))}
                onDrop={(event) => {
                  event.preventDefault()
                  setDropTarget(null)
                  const id = event.dataTransfer.getData('text/x-task')
                  if (id) onDropTask(id, day)
                }}
                className={`flex h-12 flex-col items-center justify-start gap-1 rounded-lg pt-1 text-sm tabular-nums ${
                  isSelected ? 'bg-accent font-semibold text-white' : dropTarget === key ? 'bg-line' : ''
                } ${!isSelected && isToday ? 'ring-2 ring-accent ring-inset' : ''} ${!isSelected && !inMonth ? 'text-muted opacity-60' : ''}`}
              >
                {day.getDate()}
                <span className="flex h-1.5 gap-0.5">
                  {open.slice(0, 3).map((task) => (
                    <span
                      key={task.id}
                      className={`size-1.5 rounded-full ${isSelected ? 'bg-white' : isPast ? 'bg-danger' : 'bg-accent-bright'}`}
                      style={!isSelected && !isPast && colorOf(task) ? { backgroundColor: colorOf(task) } : undefined}
                    />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <section className="mt-6">
        <h2 className="px-4 pb-1 text-sm font-semibold text-muted first-letter:uppercase">
          {formatLongDate(selected)}
        </h2>
        {dayTasks.length === 0 ? (
          <p className="px-4 text-muted">На цей день задач немає. Напишіть задачу внизу, і вона буде на цей день.</p>
        ) : (
          <>
            <ul>{dayTasks.map(renderTask)}</ul>
            <p className="px-4 pt-3 text-sm text-muted max-md:hidden">
              Щоб перенести задачу, перетягніть її на інший день.
            </p>
            <p className="px-4 pt-3 text-sm text-muted md:hidden">
              Щоб перенести задачу, відкрийте її й змініть дату.
            </p>
          </>
        )}
      </section>
    </>
  )
}
