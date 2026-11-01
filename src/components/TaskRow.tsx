import { useState, type FormEvent } from 'react'
import type { Task } from '../lib/store'
import { formatShortDate, formatTime } from '../lib/views'

const pad = (n: number) => String(n).padStart(2, '0')
const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const fieldClass = 'mt-1 h-11 w-full min-w-0 rounded-lg border border-line bg-surface px-2 text-base font-normal text-fg'

function EditForm({
  task,
  onSave,
  onDelete,
  onCancel,
}: {
  task: Task
  onSave: (task: Task) => void
  onDelete: () => void
  onCancel: () => void
}) {
  const due = task.due_at ? new Date(task.due_at) : null
  const [title, setTitle] = useState(task.title)
  const [date, setDate] = useState(due ? toDateInput(due) : '')
  const [time, setTime] = useState(due && task.has_time ? formatTime(due) : '')
  const [tags, setTags] = useState(task.tags.map((t) => `#${t}`).join(' '))

  function submit(event: FormEvent) {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    // Час без дати означає сьогодні.
    const day = date || (time ? toDateInput(new Date()) : '')
    onSave({
      ...task,
      title: trimmed,
      due_at: day ? new Date(`${day}T${time || '12:00'}`).toISOString() : null,
      has_time: !!(day && time),
      tags: tags.split(/[\s,]+/).map((t) => t.replace(/^#/, '')).filter(Boolean),
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 border-b border-line bg-surface p-4">
      <label className="block text-sm font-medium">
        Задача
        <input autoFocus className={fieldClass} value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">
          Дата
          <input type="date" className={fieldClass} value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Час
          <input type="time" className={fieldClass} value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>
      <label className="block text-sm font-medium">
        Теги
        <input className={fieldClass} value={tags} onChange={(e) => setTags(e.target.value)} />
      </label>
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
        <button className="h-11 rounded-lg bg-accent px-4 font-semibold text-white">Зберегти</button>
        <button type="button" className="h-11 px-3 font-medium text-muted" onClick={onCancel}>
          Скасувати
        </button>
        <button type="button" className="ml-auto h-11 px-1 font-medium text-danger" onClick={onDelete}>
          Видалити
        </button>
      </div>
    </form>
  )
}

export function TaskRow({
  task,
  overdue,
  onToggle,
  onSave,
  onDelete,
}: {
  task: Task
  overdue: boolean
  onToggle: () => void
  onSave: (task: Task) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <li>
        <EditForm
          task={task}
          onCancel={() => setEditing(false)}
          onDelete={onDelete}
          onSave={(next) => {
            setEditing(false)
            onSave(next)
          }}
        />
      </li>
    )
  }

  const due = task.due_at ? new Date(task.due_at) : null
  const whenText = !due ? '' : overdue ? formatShortDate(due) : task.has_time ? formatTime(due) : ''

  return (
    <li className="flex items-start border-b border-line">
      <button
        type="button"
        role="checkbox"
        aria-checked={task.done}
        aria-label={task.done ? `Повернути: ${task.title}` : `Зроблено: ${task.title}`}
        onClick={onToggle}
        className="grid size-12 shrink-0 place-items-center"
      >
        <span className={`grid size-5 place-items-center rounded-full border-2 ${task.done ? 'border-accent bg-accent text-white' : 'border-muted'}`}>
          {task.done && (
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <path d="M2.5 8.5l3.5 3.5 7.5-8.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      </button>
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={`Редагувати: ${task.title}`}
        className="min-h-12 min-w-0 flex-1 py-3 pr-3 text-left"
      >
        <span className={`strike [overflow-wrap:anywhere] ${task.done ? 'text-muted' : ''}`} data-done={task.done}>
          {task.title}
        </span>
        {task.tags.length > 0 && (
          <span className="ml-2 text-sm text-accent-bright">{task.tags.map((t) => `#${t}`).join(' ')}</span>
        )}
      </button>
      {whenText && (
        <span
          className={`shrink-0 pt-3 pr-4 text-sm tabular-nums ${overdue ? 'font-medium text-danger' : 'text-muted'}`}
        >
          {whenText}
        </span>
      )}
    </li>
  )
}
