import { useCallback, useEffect, useRef, useState } from 'react'
import type { ParsedLine } from '../lib/parse'
import type { Task, TaskStore } from '../lib/store'
import { countFor, formatWhen, groupsFor, viewSubtitle, VIEWS, type View } from '../lib/views'
import { QuickAdd } from './QuickAdd'
import { TaskRow } from './TaskRow'

interface Toast {
  text: string
  undo?: () => void
}

const EMPTY: Record<View, string> = {
  today: 'На сьогодні задач немає. Додайте першу в рядку внизу.',
  tomorrow: 'На завтра задач немає. Напишіть у рядку внизу, наприклад, «кава завтра 9:00».',
  week: '',
  nodate: 'Задачі без дати з’являться тут. Просто напишіть задачу в рядку внизу.',
}

export function Planner({ store, onSignOut }: { store: TaskStore; onSignOut?: () => void }) {
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [view, setView] = useState<View>('today')
  const [now, setNow] = useState(() => new Date())
  const [toast, setToast] = useState<Toast | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const showToast = useCallback((next: Toast) => {
    window.clearTimeout(toastTimer.current)
    setToast(next)
    toastTimer.current = window.setTimeout(() => setToast(null), next.undo ? 6000 : 3000)
  }, [])

  const load = useCallback(async () => {
    try {
      setTasks(await store.list())
    } catch {
      setTasks((current) => current ?? [])
      showToast({ text: 'Не вдалося завантажити задачі. Перевірте інтернет і відкрийте застосунок знову.' })
    }
  }, [store, showToast])

  useEffect(() => {
    void load()
    // Після повернення в застосунок підтягуємо зміни з іншого пристрою й оновлюємо "сьогодні".
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      setNow(new Date())
      void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  const persist = useCallback(
    (action: Promise<void>) => {
      action.catch(() => {
        showToast({ text: 'Зміну не збережено. Перевірте інтернет і спробуйте ще раз.' })
        void load()
      })
    },
    [load, showToast],
  )

  const saveTask = useCallback(
    (task: Task) => {
      setTasks((current) => [...(current ?? []).filter((t) => t.id !== task.id), task])
      persist(store.save(task))
    },
    [persist, store],
  )

  function addTask(parsed: ParsedLine) {
    saveTask({
      id: crypto.randomUUID(),
      title: parsed.title,
      due_at: parsed.dueAt?.toISOString() ?? null,
      has_time: parsed.hasTime,
      tags: parsed.tags,
      done: false,
      done_at: null,
      created_at: new Date().toISOString(),
    })
    showToast({ text: `Додано: ${formatWhen(parsed.dueAt, parsed.hasTime, new Date())}` })
  }

  function toggleTask(task: Task) {
    const done = !task.done
    saveTask({ ...task, done, done_at: done ? new Date().toISOString() : null })
  }

  function deleteTask(task: Task) {
    setTasks((current) => (current ?? []).filter((t) => t.id !== task.id))
    persist(store.remove(task.id))
    showToast({
      text: 'Задачу видалено',
      undo: () => {
        setToast(null)
        saveTask(task)
      },
    })
  }

  const list = tasks ?? []
  const groups = groupsFor(view, list, now)
  const current = VIEWS.find((v) => v.id === view)!
  const subtitle = viewSubtitle(view, now)
  const isEmpty = tasks !== null && view !== 'week' && groups.length === 0

  return (
    <div className="mx-auto max-w-2xl">
      <main className="pb-52">
        <header className="flex items-start justify-between px-4 pt-6">
          <div className="min-w-0">
            <h1 className="text-3xl leading-10 font-semibold">{current.label}</h1>
            <p className="h-6 text-muted first-letter:uppercase">{subtitle}</p>
          </div>
          {onSignOut && (
            <button onClick={onSignOut} className="h-11 shrink-0 px-2 text-sm font-medium text-muted">
              Вийти
            </button>
          )}
        </header>

        <div className="mt-6">
          {tasks === null && <p className="px-4 text-muted">Завантажую задачі…</p>}
          {isEmpty && <p className="px-4 text-muted">{EMPTY[view]}</p>}
          {tasks !== null &&
            groups.map((group) => (
              <section key={group.key} className="mb-6">
                {group.label && (
                  <h2
                    className={`px-4 pb-1 text-sm font-semibold first-letter:uppercase ${group.overdue ? 'text-danger' : 'text-muted'}`}
                  >
                    {group.label}
                  </h2>
                )}
                <ul>
                  {group.tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      overdue={group.overdue}
                      onToggle={() => toggleTask(task)}
                      onSave={saveTask}
                      onDelete={() => deleteTask(task)}
                    />
                  ))}
                </ul>
              </section>
            ))}
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-10">
        <div className="mx-auto max-w-2xl">
          <div role="status" aria-live="polite" className="px-3 pb-2">
            {toast && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2 text-fg">
                <span>{toast.text}</span>
                {toast.undo && (
                  <button onClick={toast.undo} className="h-8 shrink-0 font-semibold text-accent-bright">
                    Повернути
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="border-t border-line bg-bg pb-[env(safe-area-inset-bottom)]">
            <QuickAdd now={now} onAdd={addTask} />
            <nav aria-label="Вигляди" className="mt-1 grid grid-cols-4">
              {VIEWS.map((v) => {
                const count = countFor(v.id, list, now)
                const active = v.id === view
                return (
                  <button
                    key={v.id}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setView(v.id)}
                    className={`h-12 border-b-2 text-sm ${active ? 'border-accent font-semibold text-accent-bright' : 'border-transparent text-muted'}`}
                  >
                    {v.label}
                    {count > 0 && <span className="ml-1 tabular-nums">{count}</span>}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>
      </div>
    </div>
  )
}
