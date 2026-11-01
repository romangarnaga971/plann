import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AuthScreen } from './components/AuthScreen'
import { Planner } from './components/Planner'
import { localStore, supabase, supabaseStore } from './lib/store'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!supabase) return <Planner store={localStore} />
  if (session === undefined) return null
  if (!session) return <AuthScreen client={supabase} />

  const client = supabase
  return (
    <Planner
      key={session.user.id}
      store={supabaseStore(client)}
      onSignOut={() => void client.auth.signOut()}
    />
  )
}
