import { useState } from 'react'

export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme !== 'light')

  function toggle() {
    const next = !dark
    setDark(next)
    if (next) delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = 'light'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next ? '#000000' : '#ffffff')
    try {
      localStorage.setItem('planner.theme', next ? 'dark' : 'light')
    } catch {
      // Без сховища тема діє до закриття застосунку.
    }
  }

  return (
    <button
      role="switch"
      aria-checked={dark}
      onClick={toggle}
      className="flex h-11 w-full shrink-0 items-center justify-between rounded-lg px-3 font-medium text-muted"
    >
      <span>Темна тема</span>
      <span className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${dark ? 'justify-end bg-accent' : 'justify-start bg-line'}`}>
        <span className="size-5 rounded-full bg-white shadow" />
      </span>
    </button>
  )
}
