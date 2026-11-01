import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { parseLine, type ParsedLine, type Span } from '../lib/parse'
import { normalizeTag, type Folder } from '../lib/tags'
import { formatWhen } from '../lib/views'
import { TagPicker } from './TagPicker'

const MARK_CLASS: Record<Span['kind'], string> = {
  date: 'bg-accent',
  tag: 'bg-line',
}

function highlight(text: string, spans: Span[]) {
  const parts: React.ReactNode[] = []
  let cursor = 0
  for (const span of spans) {
    parts.push(text.slice(cursor, span.start))
    parts.push(
      <mark key={span.start} className={`${MARK_CLASS[span.kind]} rounded-sm text-fg`}>
        {text.slice(span.start, span.end)}
      </mark>,
    )
    cursor = span.end
  }
  parts.push(text.slice(cursor))
  return parts
}

export function QuickAdd({
  now,
  folders,
  folder,
  onAdd,
}: {
  now: Date
  folders: Folder[]
  folder: string | null
  onAdd: (parsed: ParsedLine) => void
}) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const mirrorRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const parsed = useMemo(() => parseLine(text, now), [text, now])
  const tags = folder && !parsed.tags.includes(folder) ? [...parsed.tags, folder] : parsed.tags

  // Підказки для слова з #, яке зараз пишеться в кінці рядка.
  const typedTag = text.match(/#([^\s#]*)$/)?.[1]
  const suggestions =
    typedTag === undefined
      ? []
      : folders.filter((f) => f.name.startsWith(normalizeTag(typedTag)) && f.name !== normalizeTag(typedTag))

  function focusInputEnd() {
    requestAnimationFrame(() => {
      const input = inputRef.current
      if (!input) return
      input.focus()
      input.setSelectionRange(input.value.length, input.value.length)
      input.scrollLeft = input.scrollWidth
      syncScroll()
    })
  }

  function addTag(name: string) {
    const base = text.replace(/#[^\s#]*$/, '').trimEnd()
    setText(`${base ? `${base} ` : ''}#${name} `)
    setPickerOpen(false)
    focusInputEnd()
  }

  function closePicker() {
    setPickerOpen(false)
    focusInputEnd()
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Tab' && !event.shiftKey) {
      event.preventDefault()
      setPickerOpen(true)
    }
  }

  useEffect(() => {
    if (!pickerOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!formRef.current?.contains(event.target as Node)) setPickerOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [pickerOpen])

  const syncScroll = () => {
    if (mirrorRef.current && inputRef.current) mirrorRef.current.scrollLeft = inputRef.current.scrollLeft
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!parsed.title) return
    onAdd({ ...parsed, tags })
    setText('')
  }

  const hasText = text.trim().length > 0

  return (
    <form ref={formRef} onSubmit={submit} className="relative px-3 pt-2">
      {pickerOpen && (
        <TagPicker
          folders={folders}
          used={tags}
          initialQuery={typedTag ?? ''}
          onPick={addTag}
          onClose={closePicker}
        />
      )}
      {suggestions.length > 0 ? (
        <div className="flex h-8 gap-1 overflow-x-auto pb-2" aria-label="Підказки тегів">
          {suggestions.map((f) => (
            <button
              key={f.name}
              type="button"
              onClick={() => addTag(f.name)}
              className="flex h-6 shrink-0 items-center gap-1 rounded-full bg-surface px-2 text-sm"
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: f.color }} />
              {f.name}
            </button>
          ))}
        </div>
      ) : (
        <p className="h-6 truncate text-sm text-muted" aria-live="polite">
          {!hasText && <span className="max-md:hidden">Tab відкриває теги</span>}
          {hasText && (
            <>
              Буде {parsed.dueAt ? 'на ' : ''}
              <span className="font-medium text-fg">{formatWhen(parsed.dueAt, parsed.hasTime, now)}</span>
              {tags.length > 0 && ` ${tags.map((t) => `#${t}`).join(' ')}`}
            </>
          )}
        </p>
      )}
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1 rounded-lg border-2 border-line bg-surface focus-within:border-accent">
          <div
            ref={mirrorRef}
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden pr-11 pl-3 leading-11 whitespace-pre"
          >
            {highlight(text, parsed.spans)}
          </div>
          <input
            ref={inputRef}
            aria-label="Нова задача"
            className="relative block h-11 w-full bg-transparent pr-11 pl-3 text-base text-transparent caret-fg outline-none placeholder:text-muted"
            placeholder="кава завтра 9:00 #дім"
            autoComplete="off"
            enterKeyHint="done"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onInputKeyDown}
            onScroll={syncScroll}
            onKeyUp={syncScroll}
            onSelect={syncScroll}
          />
          <button
            type="button"
            aria-label="Вибрати тег"
            aria-expanded={pickerOpen}
            title="Теги (Tab)"
            onClick={() => (pickerOpen ? closePicker() : setPickerOpen(true))}
            className={`absolute top-0 right-0 grid size-11 place-items-center text-xl font-semibold ${pickerOpen ? 'text-accent-bright' : 'text-muted'}`}
          >
            #
          </button>
        </div>
        <button
          disabled={!parsed.title}
          className="h-12 shrink-0 rounded-lg bg-accent px-4 font-semibold text-white disabled:opacity-40"
        >
          Додати
        </button>
      </div>
    </form>
  )
}
