import { describe, expect, it } from 'vitest'
import { parseLine } from './parse'

// Неділя, 1 листопада 2026, 12:00
const ref = new Date(2026, 10, 1, 12, 0)
const local = (d: Date | null) =>
  d && `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`

describe('parseLine', () => {
  it('розбирає приклад з README: дата, час і тег', () => {
    const p = parseLine("зателефонувати лікарю завтра 10:00 #здоров'я", ref)
    expect(p.title).toBe('зателефонувати лікарю')
    expect(local(p.dueAt)).toBe('2026-11-2 10:00')
    expect(p.hasTime).toBe(true)
    expect(p.tags).toEqual(["здоров'я"])
  })

  it('сьогодні з часом', () => {
    const p = parseLine('купити молоко сьогодні 18:00', ref)
    expect(p.title).toBe('купити молоко')
    expect(local(p.dueAt)).toBe('2026-11-1 18:00')
  })

  it('"5 числа" без часу: задача на цілий день', () => {
    const p = parseLine('рахунки за світло 5 числа', ref)
    expect(p.title).toBe('рахунки за світло')
    expect(local(p.dueAt)).toBe('2026-11-5 12:00')
    expect(p.hasTime).toBe(false)
  })

  it('"5 числа" з часом', () => {
    const p = parseLine('рахунки 5 числа о 10:30', ref)
    expect(p.title).toBe('рахунки')
    expect(local(p.dueAt)).toBe('2026-11-5 10:30')
    expect(p.hasTime).toBe(true)
  })

  it('число, що вже минуло, переходить на наступний місяць', () => {
    const p = parseLine('оренда 5-го числа', new Date(2026, 10, 20, 12))
    expect(local(p.dueAt)).toBe('2026-12-5 12:00')
  })

  it('пропускає місяць без такого числа', () => {
    const p = parseLine('звіт 31 числа', new Date(2026, 10, 1, 12))
    expect(local(p.dueAt)).toBe('2026-12-31 12:00')
  })

  it("день тижня з обома видами апострофа", () => {
    for (const line of ["зустріч з Олегом в п'ятницю о 15", 'зустріч з Олегом в п’ятницю о 15']) {
      const p = parseLine(line, ref)
      expect(p.title).toBe('зустріч з Олегом')
      expect(local(p.dueAt)).toBe('2026-11-6 15:00')
    }
  })

  it('без дати: лише заголовок і тег', () => {
    const p = parseLine("подзвонити мамі #сім'я", ref)
    expect(p.title).toBe('подзвонити мамі')
    expect(p.dueAt).toBeNull()
    expect(p.tags).toEqual(["сім'я"])
  })

  it('числа без дати лишаються в заголовку', () => {
    const p = parseLine('купити 2 кг яблук', ref)
    expect(p.title).toBe('купити 2 кг яблук')
    expect(p.dueAt).toBeNull()
  })

  it('рядок лише з дати не дає порожньої задачі', () => {
    const p = parseLine('завтра', ref)
    expect(p.title).toBe('завтра')
    expect(p.dueAt).toBeNull()
  })

  it('однаково читає тег у різному регістрі', () => {
    const p = parseLine('хліб #Купити #купити', ref)
    expect(p.tags).toEqual(['купити'])
  })

  it('позначає діапазони для підсвітки', () => {
    const line = 'кава завтра #дім'
    const p = parseLine(line, ref)
    expect(p.spans.map((s) => [line.slice(s.start, s.end), s.kind])).toEqual([
      ['завтра', 'date'],
      ['#дім', 'tag'],
    ])
  })
})
