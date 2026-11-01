import type { Tag, Task } from './store'

export const PALETTE = [
  '#ff6b63',
  '#ff9f0a',
  '#ffd60a',
  '#30d158',
  '#40c8e0',
  '#5b95ff',
  '#bf7bff',
  '#ff7ab6',
  '#a1a1a8',
]

export const normalizeTag = (value: string) =>
  value.trim().replace(/^#+/, '').replace(/[’ʼ`]/g, "'").toLowerCase()

// Тег без вибраного кольору завжди отримує той самий колір за назвою.
export function defaultColor(name: string): string {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)!) | 0
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

export interface Folder {
  name: string
  color: string
  count: number
}

export function buildFolders(tags: Tag[], tasks: Task[]): Folder[] {
  const colors = new Map(tags.map((tag) => [tag.name, tag.color]))
  const names = new Set([...colors.keys(), ...tasks.flatMap((task) => task.tags)])
  return [...names]
    .map((name) => ({
      name,
      color: colors.get(name) ?? defaultColor(name),
      count: tasks.filter((task) => !task.done && task.tags.includes(name)).length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'uk'))
}
