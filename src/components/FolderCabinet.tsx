import { useEffect, useState, type FormEvent } from 'react'
import { ThemeToggle } from './ThemeToggle'
import { isValidTag, normalizeTag, PALETTE, type Folder } from '../lib/tags'

function FolderForm({
  folder,
  taken,
  onSave,
  onDelete,
  onCancel,
}: {
  folder: Folder | null
  taken: string[]
  onSave: (name: string, color: string) => void
  onDelete?: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState(folder?.name ?? '')
  const [color, setColor] = useState(folder?.color ?? PALETTE[5])
  const [error, setError] = useState<string | null>(null)

  function submit(event: FormEvent) {
    event.preventDefault()
    const next = normalizeTag(name)
    if (!isValidTag(next)) {
      setError('Назва має бути одним словом: літери, цифри, дефіс або _.')
      return
    }
    if (next !== folder?.name && taken.includes(next)) {
      setError('Папка з такою назвою вже є.')
      return
    }
    onSave(next, color)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-3">
      <label className="block text-sm font-medium">
        Назва
        <input
          autoFocus
          className="mt-1 h-11 w-full min-w-0 rounded-lg border border-line bg-bg px-2 text-base font-normal text-fg"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError(null)
          }}
        />
      </label>
      <fieldset>
        <legend className="text-sm font-medium">Колір</legend>
        <div className="mt-1 flex flex-wrap gap-1">
          {PALETTE.map((swatch) => (
            <button
              key={swatch}
              type="button"
              aria-label={`Колір ${swatch}`}
              aria-pressed={swatch === color}
              onClick={() => setColor(swatch)}
              className="grid size-9 place-items-center rounded-full"
            >
              <span
                className={`block size-6 rounded-full ${swatch === color ? 'ring-2 ring-fg ring-offset-2 ring-offset-surface' : ''}`}
                style={{ backgroundColor: swatch }}
              />
            </button>
          ))}
        </div>
      </fieldset>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
        <button className="h-11 rounded-lg bg-accent px-4 font-semibold text-white">Зберегти</button>
        <button type="button" className="h-11 px-2 font-medium text-muted" onClick={onCancel}>
          Скасувати
        </button>
        {onDelete && (
          <button type="button" className="h-11 px-2 font-medium text-danger" onClick={onDelete}>
            Видалити
          </button>
        )}
      </div>
    </form>
  )
}

export function FolderCabinet({
  folders,
  selected,
  open,
  onClose,
  onSelect,
  onSave,
  onDelete,
  archiveCount,
  archiveOpen,
  onOpenArchive,
  calendarOpen,
  onOpenCalendar,
}: {
  folders: Folder[]
  selected: string | null
  open: boolean
  archiveCount: number
  archiveOpen: boolean
  onOpenArchive: () => void
  calendarOpen: boolean
  onOpenCalendar: () => void
  onClose: () => void
  onSelect: (name: string) => void
  onSave: (previous: string | null, name: string, color: string) => void
  onDelete: (name: string) => void
}) {
  // null: форма закрита, '': нова папка, інакше назва папки.
  const [editing, setEditing] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const taken = folders.map((f) => f.name)
  const editedFolder = folders.find((f) => f.name === editing) ?? null

  return (
    <>
      {open && <div className="fixed inset-0 z-20 bg-black/70 md:hidden" onClick={onClose} aria-hidden />}
      <aside
        aria-label="Папки"
        className={`fixed inset-y-0 left-0 z-30 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-line bg-bg px-4 pt-6 pb-6 transition-transform duration-200 md:translate-x-0 ${open ? 'translate-x-0' : 'max-md:invisible max-md:-translate-x-full'}`}
      >
        <div className="flex h-10 items-center justify-between">
          <h2 className="text-xl font-semibold">Папки</h2>
          <button
            onClick={onClose}
            aria-label="Закрити меню"
            className="grid size-11 place-items-center text-muted md:hidden"
          >
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <button
          onClick={onOpenCalendar}
          aria-current={calendarOpen ? 'page' : undefined}
          className={`mt-4 flex h-11 w-full shrink-0 items-center gap-3 rounded-lg px-3 font-medium ${calendarOpen ? 'bg-surface text-accent-bright' : 'text-fg'}`}
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <rect x="3.5" y="5" width="17" height="15" rx="2" />
            <path d="M3.5 10h17M8 3v4M16 3v4" />
          </svg>
          Календар
        </button>

        {folders.length === 1 && editing === null && (
          <p className="mt-3 text-sm text-muted">
            Створіть папку або додайте тег до задачі, наприклад, #купити.
          </p>
        )}

        <ul className="cabinet mt-6">
          {folders.map((folder) =>
            editing === folder.name ? (
              <li key={folder.name} className="relative z-10 mb-3">
                <FolderForm
                  folder={editedFolder}
                  taken={taken}
                  onCancel={() => setEditing(null)}
                  onDelete={() => {
                    setEditing(null)
                    onDelete(folder.name)
                  }}
                  onSave={(name, color) => {
                    setEditing(null)
                    onSave(folder.name, name, color)
                  }}
                />
              </li>
            ) : (
              <li
                key={folder.name}
                className="folder"
                data-selected={folder.name === selected}
                style={{ '--folder': folder.color } as React.CSSProperties}
              >
                <button
                  onClick={() => onSelect(folder.name)}
                  aria-current={folder.name === selected ? 'true' : undefined}
                  className="folder-open"
                >
                  <span className="min-w-0 truncate">{folder.name}</span>
                  {folder.count > 0 && <span className="ml-2 tabular-nums">{folder.count}</span>}
                </button>
                {!folder.system && (
                  <button
                    onClick={() => setEditing(folder.name)}
                    aria-label={`Змінити папку ${folder.name}`}
                    className="folder-edit"
                  >
                    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
                      <circle cx="5" cy="12" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="19" cy="12" r="2" />
                    </svg>
                  </button>
                )}
              </li>
            ),
          )}
        </ul>

        <div className="mt-4">
          {editing === '' ? (
            <FolderForm
              folder={null}
              taken={taken}
              onCancel={() => setEditing(null)}
              onSave={(name, color) => {
                setEditing(null)
                onSave(null, name, color)
              }}
            />
          ) : (
            <button
              onClick={() => setEditing('')}
              className="h-11 w-full rounded-lg border border-dashed border-line font-medium text-muted"
            >
              Нова папка
            </button>
          )}
        </div>

        <button
          onClick={onOpenArchive}
          aria-current={archiveOpen ? 'page' : undefined}
          className={`mt-4 flex h-11 w-full shrink-0 items-center justify-between rounded-lg px-3 font-medium ${archiveOpen ? 'bg-surface text-accent-bright' : 'text-muted'}`}
        >
          <span>Архів</span>
          {archiveCount > 0 && <span className="tabular-nums">{archiveCount}</span>}
        </button>
        <ThemeToggle />
      </aside>
    </>
  )
}
