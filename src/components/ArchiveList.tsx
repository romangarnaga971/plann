import { useState } from 'react'
import type { Task } from '../lib/store'
import { defaultColor, tagTextColor, type Folder } from '../lib/tags'
import { formatShortDate } from '../lib/views'

export function ArchiveList({
  tasks,
  folders,
  onRestore,
  onClear,
}: {
  tasks: Task[]
  folders: Folder[]
  onRestore: (task: Task) => void
  onClear: () => void
}) {
  const [confirming, setConfirming] = useState(false)

  if (tasks.length === 0) {
    return <p className="px-4 text-muted">Архів порожній. Сюди потрапляють зроблені задачі, які ви перенесли кнопкою «В архів».</p>
  }

  const sorted = [...tasks].sort((a, b) => (a.archived_at! < b.archived_at! ? 1 : -1))

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
        {confirming ? (
          <>
            <p className="w-full">Видалити задачі з архіву назавжди: {tasks.length}?</p>
            <button
              onClick={() => {
                setConfirming(false)
                onClear()
              }}
              className="h-11 rounded-lg bg-danger px-4 font-semibold text-bg"
            >
              Видалити назавжди
            </button>
            <button onClick={() => setConfirming(false)} className="h-11 px-3 font-medium text-muted">
              Скасувати
            </button>
          </>
        ) : (
          <button onClick={() => setConfirming(true)} className="h-11 rounded-lg border border-line px-4 font-medium text-danger">
            Очистити архів
          </button>
        )}
      </div>
      <ul className="border-t border-line">
        {sorted.map((task) => (
          <li key={task.id} className="flex items-start border-b border-line">
            <div className="min-h-12 min-w-0 flex-1 py-3 pr-3 pl-4">
              <span className="text-muted line-through [overflow-wrap:anywhere]">{task.title}</span>
              {task.tags.map((t) => (
                <span
                  key={t}
                  className="ml-2 text-sm"
                  style={{ color: tagTextColor(folders.find((f) => f.name === t)?.color ?? defaultColor(t)) }}
                >
                  #{t}
                </span>
              ))}
            </div>
            <span className="shrink-0 pt-3 pr-2 text-sm text-muted tabular-nums">
              {formatShortDate(new Date(task.archived_at!))}
            </span>
            <button
              onClick={() => onRestore(task)}
              aria-label={`Повернути: ${task.title}`}
              className="h-12 shrink-0 pr-4 text-sm font-medium text-accent-bright"
            >
              Повернути
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
