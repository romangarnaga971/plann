import { useCallback, useEffect, useRef, useState } from 'react'
import type { ParsedLine } from '../lib/parse'
import type { Tag, Task, TaskStore } from '../lib/store'
import { buildFolders } from '../lib/tags'
import { useSwipe } from '../lib/useSwipe'
import { countFor, folderGroups, formatWhen, groupsFor, moveToDay, viewSubtitle, VIEWS, type View } from '../lib/views'
import { ArchiveList } from './ArchiveList'
import { FolderCabinet } from './FolderCabinet'
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
  const [tags, setTags] = useState<Tag[]>([])
  const [view, setView] = useState<View>('today')
  const [folder, setFolder] = useState<string | null>(null)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [toast, setToast] = useState<Toast | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const mainRef = useRef<HTMLElement>(null)

  useSwipe(mainRef, (direction) => {
    const index = VIEWS.findIndex((v) => v.id === view)
    const next = VIEWS[index + direction]
    if (!folder && !archiveOpen && next) {
      setView(next.id)
      return true
    }
    // Свайп вправо з першого вигляду, папки чи архіву відкриває шафку на телефоні.
    if (direction === -1 && (folder || archiveOpen || index === 0) && matchMedia('(max-width: 767px)').matches) {
      setMenuOpen(true)
    }
    return false
  })

  const showToast = useCallback((next: Toast) => {
    window.clearTimeout(toastTimer.current)
    setToast(next)
    toastTimer.current = window.setTimeout(() => setToast(null), next.undo ? 6000 : 3000)
  }, [])

  const load = useCallback(async () => {
    // Папки не повинні заважати задачам, якщо таблицю тегів ще не створено.
    store.listTags().then(setTags, () => {})
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
      archived_at: null,
      pinned: false,
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

  function moveTasks(moving: Task[], offset: number) {
    for (const task of moving) saveTask({ ...task, due_at: moveToDay(task.due_at!, offset, new Date()) })
    showToast({
      text: `Перенесено на ${offset === 0 ? 'сьогодні' : 'завтра'}: ${moving.length}`,
      undo: () => {
        setToast(null)
        for (const task of moving) saveTask(task)
      },
    })
  }

  function archiveTask(task: Task) {
    saveTask({ ...task, archived_at: new Date().toISOString() })
    showToast({
      text: 'Задачу перенесено в архів',
      undo: () => {
        setToast(null)
        saveTask({ ...task, archived_at: null })
      },
    })
  }

  function clearArchive() {
    setTasks((current) => (current ?? []).filter((t) => !t.archived_at))
    persist(store.clearArchive())
    showToast({ text: 'Архів очищено' })
  }

  function saveFolder(previous: string | null, name: string, color: string) {
    setTags((current) => [...current.filter((t) => t.name !== name && t.name !== previous), { name, color }])
    persist(store.saveTag({ name, color }))
    if (previous && previous !== name) {
      persist(store.removeTag(previous))
      for (const task of list.filter((t) => t.tags.includes(previous))) {
        saveTask({ ...task, tags: [...new Set(task.tags.map((t) => (t === previous ? name : t)))] })
      }
      if (folder === previous) setFolder(name)
    }
  }

  function deleteFolder(name: string) {
    const affected = list.filter((t) => t.tags.includes(name))
    const tag = folders.find((f) => f.name === name)!
    setTags((current) => current.filter((t) => t.name !== name))
    persist(store.removeTag(name))
    for (const task of affected) saveTask({ ...task, tags: task.tags.filter((t) => t !== name) })
    if (folder === name) setFolder(null)
    showToast({
      text: 'Папку видалено, задачі залишилися',
      undo: () => {
        setToast(null)
        setTags((current) => [...current, { name, color: tag.color }])
        persist(store.saveTag({ name, color: tag.color }))
        for (const task of affected) saveTask(task)
      },
    })
  }

  const list = tasks ?? []
  const active = list.filter((t) => !t.archived_at)
  const archived = list.filter((t) => t.archived_at)
  const folders = buildFolders(tags, list)
  const tagFolders = folders.filter((f) => !f.system)
  const openFolder = folder && !archiveOpen ? folders.find((f) => f.name === folder) ?? null : null
  const groups = archiveOpen
    ? []
    : openFolder
      ? folderGroups(openFolder.name, active)
      : groupsFor(view, active, now)
  const current = VIEWS.find((v) => v.id === view)!
  const subtitle = archiveOpen
    ? `Задач: ${archived.length}`
    : openFolder
    ? openFolder.count > 0
      ? `Незроблених: ${openFolder.count}`
      : 'Усе зроблено'
    : viewSubtitle(view, now)
  const isEmpty = tasks !== null && !archiveOpen && (openFolder !== null || view !== 'week') && groups.length === 0

  return (
    <div className="md:pl-72">
      <FolderCabinet
        folders={folders}
        selected={openFolder?.name ?? null}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        archiveCount={archived.length}
        archiveOpen={archiveOpen}
        onOpenArchive={() => {
          setArchiveOpen(true)
          setFolder(null)
          setMenuOpen(false)
        }}
        onSelect={(name) => {
          setFolder(name)
          setArchiveOpen(false)
          setMenuOpen(false)
        }}
        onSave={saveFolder}
        onDelete={deleteFolder}
      />
      <main ref={mainRef} className="mx-auto min-h-dvh max-w-2xl touch-pan-y pb-52">
        <header className="flex items-start gap-1 px-4 pt-6">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Відкрити папки"
            aria-expanded={menuOpen}
            className="-ml-2 grid size-11 shrink-0 place-items-center md:hidden"
          >
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 text-3xl leading-10 font-semibold">
              {openFolder && (
                <span className="size-4 shrink-0 rounded-full" style={{ backgroundColor: openFolder.color }} />
              )}
              <span className="truncate">{archiveOpen ? 'Архів' : openFolder ? openFolder.name : current.label}</span>
            </h1>
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
          {isEmpty && <p className="px-4 text-muted">{openFolder?.system
                ? 'Задачі без тегів з’являться тут.'
                : openFolder
                  ? 'У цій папці порожньо. Напишіть задачу внизу, і вона потрапить сюди.'
                  : EMPTY[view]}</p>}
          {tasks !== null && archiveOpen && (
            <ArchiveList
              tasks={archived}
              folders={folders}
              onRestore={(task) => saveTask({ ...task, archived_at: null })}
              onClear={clearArchive}
            />
          )}
          {tasks !== null &&
            groups.map((group) => {
              const movable = group.moveTo === undefined ? [] : group.tasks.filter((t) => !t.done)
              return (
              <section key={group.key} className="mb-6">
                {(group.label || movable.length > 0) && (
                  <div className="flex min-h-9 items-center justify-between gap-2 px-4 pb-1">
                    {group.label && (
                      <h2
                        className={`text-sm font-semibold first-letter:uppercase ${group.overdue ? 'text-danger' : 'text-muted'}`}
                      >
                        {group.label}
                      </h2>
                    )}
                    {movable.length > 0 && (
                      <button
                        onClick={() => moveTasks(movable, group.moveTo!)}
                        className="ml-auto h-9 shrink-0 text-sm font-medium text-accent-bright"
                      >
                        {group.moveTo === 0 ? 'Усі на сьогодні' : 'Усі на завтра'}
                      </button>
                    )}
                  </div>
                )}
                <ul>
                  {group.tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      overdue={group.overdue}
                      showDate={openFolder !== null}
                      folders={tagFolders}
                      onToggle={() => toggleTask(task)}
                      onArchive={() => archiveTask(task)}
                      onPin={() => saveTask({ ...task, pinned: !task.pinned })}
                      onSave={saveTask}
                      onDelete={() => deleteTask(task)}
                    />
                  ))}
                </ul>
              </section>
              )
            })}
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-10 md:left-72">
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
            <QuickAdd
              now={now}
              folders={tagFolders}
              folder={openFolder && !openFolder.system ? openFolder.name : null}
              onAdd={addTask}
            />
            <nav aria-label="Вигляди" className="mt-1 grid grid-cols-4">
              {VIEWS.map((v) => {
                const count = countFor(v.id, active, now)
                const isCurrent = !openFolder && !archiveOpen && v.id === view
                return (
                  <button
                    key={v.id}
                    aria-current={isCurrent ? 'page' : undefined}
                    onClick={() => {
                      setView(v.id)
                      setFolder(null)
                      setArchiveOpen(false)
                    }}
                    className={`h-12 border-b-2 text-sm ${isCurrent ? 'border-accent font-semibold text-accent-bright' : 'border-transparent text-muted'}`}
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
