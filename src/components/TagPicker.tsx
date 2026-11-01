import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { defaultColor, normalizeTag, sanitizeTag, type Folder } from '../lib/tags'

interface Option {
  name: string
  color: string
  isNew: boolean
}

export function TagPicker({
  folders,
  used,
  initialQuery,
  onPick,
  onClose,
}: {
  folders: Folder[]
  used: string[]
  initialQuery: string
  onPick: (name: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState(sanitizeTag(initialQuery))
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)

  const typed = normalizeTag(query)
  const options: Option[] = folders
    .filter((f) => !used.includes(f.name) && f.name.includes(typed))
    .map((f) => ({ name: f.name, color: f.color, isNew: false }))
  if (typed && !used.includes(typed) && !folders.some((f) => f.name === typed)) {
    options.push({ name: typed, color: defaultColor(typed), isNew: true })
  }

  const active = Math.min(activeIndex, Math.max(options.length - 1, 0))

  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [active])

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const step = (delta: number) => {
      event.preventDefault()
      if (options.length) setActiveIndex((active + delta + options.length) % options.length)
    }
    if (event.key === 'ArrowDown' || (event.key === 'Tab' && !event.shiftKey)) step(1)
    else if (event.key === 'ArrowUp' || event.key === 'Tab') step(-1)
    else if (event.key === 'Enter') {
      event.preventDefault()
      if (options[active]) onPick(options[active].name)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  return (
    <div className="absolute inset-x-3 bottom-full z-20 mb-2 overflow-hidden rounded-lg border border-line bg-surface shadow-lg shadow-black">
      <input
        autoFocus
        aria-label="Знайти або створити тег"
        role="combobox"
        aria-expanded
        aria-controls="tag-options"
        aria-activedescendant={options[active] ? `tag-option-${active}` : undefined}
        placeholder="Знайти або створити тег"
        autoComplete="off"
        enterKeyHint="done"
        value={query}
        onChange={(e) => {
          setQuery(sanitizeTag(e.target.value))
          setActiveIndex(0)
        }}
        onKeyDown={onKeyDown}
        className="h-12 w-full border-b border-line bg-transparent px-3 text-base text-fg outline-none placeholder:text-muted"
      />
      <ul id="tag-options" ref={listRef} role="listbox" aria-label="Теги" className="max-h-56 overflow-y-auto">
        {options.map((option, index) => (
          <li key={option.name} id={`tag-option-${index}`} role="option" aria-selected={index === active}>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => onPick(option.name)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`flex min-h-11 w-full items-center gap-2 px-3 text-left ${index === active ? 'bg-line' : ''}`}
            >
              <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: option.color }} />
              <span className="min-w-0 truncate">
                {option.isNew ? `Створити #${option.name}` : `#${option.name}`}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {options.length === 0 && (
        <p className="px-3 py-3 text-sm text-muted">
          {typed ? 'Цей тег уже додано.' : 'Напишіть назву, щоб створити перший тег.'}
        </p>
      )}
    </div>
  )
}
