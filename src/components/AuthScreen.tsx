import { useState, type FormEvent } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

const fieldClass =
  'mt-1 h-12 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg placeholder:text-muted'

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
    <div>
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-3xl leading-10 font-semibold">Планер</h1>
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
          {error && <p role="alert" className="font-medium text-danger">{error}</p>}
          {notice && <p role="status">{notice}</p>}
          <button disabled={busy} className="h-12 rounded-lg bg-accent font-semibold text-white disabled:opacity-60">
            {mode === 'signin' ? 'Увійти' : 'Створити акаунт'}
          </button>
          <button
            type="button"
            className="h-12 font-medium text-accent-bright"
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
