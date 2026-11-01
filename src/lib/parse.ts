import * as chrono from 'chrono-node'

export interface Span {
  start: number
  end: number
  kind: 'date' | 'tag'
}

export interface ParsedLine {
  title: string
  dueAt: Date | null
  hasTime: boolean
  tags: string[]
  spans: Span[]
}

const TAG_RE = /#[\p{L}\p{N}_'-]+/gu

const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()

// "5 числа", "5-го числа": найближче таке число, сьогоднішнє теж рахується.
const dayOfMonthParser: chrono.Parser = {
  pattern: () => /(?<![\p{L}\d])(\d{1,2})(?:-?го)?\s+числа(?!\p{L})/iu,
  extract: (context, match) => {
    const day = Number(match[1])
    if (day < 1 || day > 31) return null
    const ref = context.reference.instant
    let year = ref.getFullYear()
    let month = ref.getMonth()
    if (day < ref.getDate()) month += 1
    for (;;) {
      if (month > 11) {
        month = 0
        year += 1
      }
      if (day <= daysInMonth(year, month)) break
      month += 1
    }
    return context.createParsingComponents({ day, month: month + 1, year })
  },
}

const parser = chrono.uk.casual.clone()
parser.parsers.push(dayOfMonthParser)

// Клавіатури телефонів ставлять ’ замість '. Заміна один до одного, тож позиції не зсуваються.
const normalize = (text: string) => text.replace(/[’ʼ`]/g, "'")

export function parseLine(raw: string, ref: Date = new Date()): ParsedLine {
  const text = normalize(raw)
  const spans: Span[] = []
  const tags: string[] = []

  for (const match of text.matchAll(TAG_RE)) {
    spans.push({ start: match.index, end: match.index + match[0].length, kind: 'tag' })
    const tag = match[0].slice(1).toLowerCase()
    if (!tags.includes(tag)) tags.push(tag)
  }

  const withoutTags = text.replace(TAG_RE, (tag) => ' '.repeat(tag.length))
  const result = parser.parse(withoutTags, ref, { forwardDate: true })[0]

  const collapse = (value: string) => value.replace(/\s+/g, ' ').trim()
  let title = collapse(withoutTags)
  let dueAt: Date | null = null
  let hasTime = false

  if (result) {
    const start = result.index
    const end = start + result.text.length
    const withoutDate = collapse(withoutTags.slice(0, start) + ' ' + withoutTags.slice(end))
    // Рядок лише з дати ("завтра") лишаємо заголовком, інакше задача була б порожня.
    if (withoutDate) {
      title = withoutDate
      spans.push({ start, end, kind: 'date' })
      hasTime = result.start.isCertain('hour')
      dueAt = result.start.date()
      // Задача на цілий день зберігається опівдні, щоб зсув часового поясу не змінював дату.
      if (!hasTime) dueAt.setHours(12, 0, 0, 0)
    }
  }

  spans.sort((a, b) => a.start - b.start)
  return { title, dueAt, hasTime, tags, spans }
}
