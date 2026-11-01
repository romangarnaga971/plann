import { useMemo, useRef, useState, type FormEvent } from 'react'
import { parseLine, type ParsedLine, type Span } from '../lib/parse'
import { formatWhen } from '../lib/views'

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

export function QuickAdd({ now, onAdd }: { now: Date; onAdd: (parsed: ParsedLine) => void }) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const mirrorRef = useRef<HTMLDivElement>(null)
  const parsed = useMemo(() => parseLine(text, now), [text, now])

  const syncScroll = () => {
    if (mirrorRef.current && inputRef.current) mirrorRef.current.scrollLeft = inputRef.current.scrollLeft
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!parsed.title) return
    onAdd(parsed)
    setText('')
  }

  const hasText = text.trim().length > 0

  return (
    <form onSubmit={submit} className="px-3 pt-2">
      <p className="h-6 truncate text-sm text-muted" aria-live="polite">
        {hasText && (
          <>
            Буде {parsed.dueAt ? 'на ' : ''}
            <span className="font-medium text-fg">{formatWhen(parsed.dueAt, parsed.hasTime, now)}</span>
            {parsed.tags.length > 0 && ` ${parsed.tags.map((t) => `#${t}`).join(' ')}`}
          </>
        )}
      </p>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1 rounded-lg border-2 border-line bg-surface focus-within:border-accent">
          <div
            ref={mirrorRef}
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden px-3 leading-11 whitespace-pre"
          >
            {highlight(text, parsed.spans)}
          </div>
          <input
            ref={inputRef}
            aria-label="Нова задача"
            className="relative block h-11 w-full bg-transparent px-3 text-base text-transparent caret-fg outline-none placeholder:text-muted"
            placeholder="кава завтра 9:00 #дім"
            autoComplete="off"
            enterKeyHint="done"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onScroll={syncScroll}
            onKeyUp={syncScroll}
            onSelect={syncScroll}
          />
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
