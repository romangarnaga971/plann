import { describe, expect, it } from 'vitest'
import type { Task } from './store'
import { buildFolders, NO_TAG } from './tags'
import { folderGroups, groupsFor, monthGrid, moveToDay, onDayKeepingTime, reorder, tasksOnDay } from './views'

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
  position: null,
  folder_position: null,
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

describe('календар', () => {
  it('листопад 2026 починається в неділю, тож сітка йде з понеділка 26 жовтня на 6 тижнів', () => {
    const grid = monthGrid(new Date(2026, 10, 15))
    expect(grid.length).toBe(42)
    expect([grid[0].getDate(), grid[0].getMonth(), grid[0].getDay()]).toEqual([26, 9, 1])
    expect([grid[41].getDate(), grid[41].getMonth()]).toEqual([6, 11])
  })

  it('грудень 2026 вміщається в 5 тижнів', () => {
    const grid = monthGrid(new Date(2026, 11, 1))
    expect(grid.length).toBe(35)
    expect([grid[0].getDate(), grid[0].getMonth()]).toEqual([30, 10])
  })

  it('задача без дати переноситься на день як задача на цілий день', () => {
    const due = new Date(onDayKeepingTime(null, new Date(2026, 10, 20)))
    expect([due.getDate(), due.getHours()]).toEqual([20, 12])
  })

  it('показує задачі лише вибраного дня', () => {
    const list = tasksOnDay([
      task({ title: 'так', due_at: new Date(2026, 10, 20, 9).toISOString() }),
      task({ title: 'ні', due_at: new Date(2026, 10, 21, 9).toISOString() }),
    ], new Date(2026, 10, 20))
    expect(list.map((t) => t.title)).toEqual(['так'])
  })
})

describe('ручний порядок', () => {
  const due = (h: number) => new Date(2026, 10, 5, h).toISOString()
  const titles = (list: ReturnType<typeof task>[]) =>
    groupsFor('today', list, now)[0].tasks.map((t) => t.title)
  const a = task({ title: 'а', due_at: due(9), has_time: true })
  const b = task({ title: 'б', due_at: due(10), has_time: true })
  const c = task({ title: 'в', due_at: due(11), has_time: true })

  it('переставлений список лишається в новому порядку', () => {
    expect(titles(reorder([c, a, b], 'position', 100))).toEqual(['в', 'а', 'б'])
  })

  it('повторна перестановка міняє лише зачеплені задачі', () => {
    const [x, y, z] = reorder([a, b, c], 'position', 100)
    const changed = reorder([x, z, y], 'position', 500)
    expect(changed.map((t) => [t.title, t.position])).toEqual([['в', 101], ['б', 102]])
  })

  it('нова задача стає після переставлених', () => {
    const ordered = reorder([b, a], 'position', 100)
    const fresh = task({ title: 'нова', due_at: due(8), has_time: true })
    expect(titles([fresh, ...ordered])).toEqual(['б', 'а', 'нова'])
  })

  it('порядок у папці не залежить від порядку в днях', () => {
    const list = reorder([c, b, a], 'folder_position', 100).map((t) => ({ ...t, tags: ['дім'] }))
    expect(folderGroups('дім', list)[0].tasks.map((t) => t.title)).toEqual(['в', 'б', 'а'])
    expect(titles(list)).toEqual(['а', 'б', 'в'])
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
