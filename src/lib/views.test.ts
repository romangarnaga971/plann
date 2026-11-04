import { describe, expect, it } from 'vitest'
import type { Task } from './store'
import { buildFolders, NO_TAG } from './tags'
import { folderGroups, groupsFor, moveToDay } from './views'

const now = new Date(2026, 10, 5, 12, 0)
const task = (over: Partial<Task>): Task => ({
  id: crypto.randomUUID(),
  title: 'задача',
  due_at: null,
  has_time: false,
  tags: [],
  done: false,
  done_at: null,
  archived_at: null,
  pinned: false,
  created_at: now.toISOString(),
  ...over,
})

describe('папка без тегу', () => {
  it('завжди перша й рахує незроблені задачі без тегів', () => {
    const folders = buildFolders([], [
      task({}),
      task({ done: true }),
      task({ tags: ['купити'] }),
    ])
    expect(folders.map((f) => [f.name, f.count])).toEqual([
      [NO_TAG, 1],
      ['купити', 1],
    ])
  })

  it('показує лише задачі без тегів', () => {
    const groups = folderGroups(NO_TAG, [task({ title: 'так' }), task({ title: 'ні', tags: ['дім'] })])
    expect(groups.flatMap((g) => g.tasks.map((t) => t.title))).toEqual(['так'])
  })
})

describe('прострочені', () => {
  it('зроблена задача лишається в групі внизу, поки не в архіві', () => {
    const past = new Date(2026, 10, 3, 12).toISOString()
    const groups = groupsFor('today', [
      task({ title: 'зроблена', due_at: past, done: true }),
      task({ title: 'незроблена', due_at: past }),
    ], now)
    expect(groups[0].tasks.map((t) => t.title)).toEqual(['незроблена', 'зроблена'])
  })
})

describe('закріплені', () => {
  it('стоять над іншими задачами дня, але над зробленими не переважають', () => {
    const due = (h: number) => new Date(2026, 10, 5, h).toISOString()
    const groups = groupsFor('today', [
      task({ title: 'рання', due_at: due(9), has_time: true }),
      task({ title: 'закріплена', due_at: due(20), has_time: true, pinned: true }),
      task({ title: 'зроблена', due_at: due(8), has_time: true, pinned: true, done: true }),
    ], now)
    expect(groups[0].tasks.map((t) => t.title)).toEqual(['закріплена', 'рання', 'зроблена'])
  })
})

describe('перенесення', () => {
  it('зберігає час і міняє лише дату', () => {
    const moved = new Date(moveToDay(new Date(2026, 10, 3, 18, 30).toISOString(), 1, now))
    expect([moved.getDate(), moved.getMonth(), moved.getHours(), moved.getMinutes()]).toEqual([6, 10, 18, 30])
  })

  it('прострочені йдуть на сьогодні, сьогоднішні на завтра', () => {
    const groups = groupsFor('today', [
      task({ due_at: new Date(2026, 10, 3, 12).toISOString() }),
      task({ due_at: new Date(2026, 10, 5, 12).toISOString() }),
    ], now)
    expect(groups.map((g) => g.moveTo)).toEqual([0, 1])
  })
})
