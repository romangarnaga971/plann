import { useState, type FormEvent } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

const fieldClass =
  'mt-1 h-12 w-full border-2 border-ink bg-paper px-3 text-base text-ink placeholder:text-pencil'

const ERROR_TEXT: Record<string, string> = {
  'Invalid login credentials': 'Неправильна пошта або пароль.',
  'Email not confirmed': 'Пошту ще не підтверджено. Відкрийте посилання з листа.',
  'User already registered': 'Такий акаунт уже є. Увійдіть у нього.',
}

const errorText = (message: string) =>
  ERROR_TEXT[message] ?? 'Не вдалося виконати дію. Перевірте інтернет і спробуйте ще раз.'

export function AuthScreen({ client }: { client: SupabaseClient }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    if (mode === 'signin') {
      const { error } = await client.auth.signInWithPassword({ email, password })
      if (error) setError(errorText(error.message))
    } else {
      const { data, error } = await client.auth.signUp({ email, password })
      if (error) setError(errorText(error.message))
      else if (!data.session) {
        setNotice(`Лист надіслано на ${email}. Відкрийте посилання з нього, а потім увійдіть.`)
        setMode('signin')
      }
    }
    setBusy(false)
  }

  return (
    <div className="sheet">
      <main className="mx-auto max-w-md py-12 pr-4 pl-[calc(var(--margin)+16px)]">
        <h1 className="font-display text-7xl leading-[72px] font-bold">Планер</h1>
        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <label className="block font-medium">
            Пошта
            <input
              className={fieldClass}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block font-medium">
            Пароль
            <input
              className={fieldClass}
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <p role="alert" className="font-medium text-rule">{error}</p>}
          {notice && <p role="status">{notice}</p>}
          <button disabled={busy} className="h-12 bg-ink font-semibold text-paper disabled:opacity-60">
            {mode === 'signin' ? 'Увійти' : 'Створити акаунт'}
          </button>
          <button
            type="button"
            className="h-12 font-medium underline underline-offset-4"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setError(null)
            }}
          >
            {mode === 'signin' ? 'Створити акаунт' : 'У мене вже є акаунт'}
          </button>
        </form>
      </main>
    </div>
  )
}
