import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface Task {
  id: string
  title: string
  due_at: string | null
  has_time: boolean
  tags: string[]
  done: boolean
  done_at: string | null
  created_at: string
}

export interface TaskStore {
  list(): Promise<Task[]>
  save(task: Task): Promise<void>
  remove(id: string): Promise<void>
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null

const COLUMNS = 'id,title,due_at,has_time,tags,done,done_at,created_at'

export const supabaseStore = (client: SupabaseClient): TaskStore => ({
  async list() {
    const { data, error } = await client.from('tasks').select(COLUMNS)
    if (error) throw error
    return data as Task[]
  },
  async save(task) {
    const { error } = await client.from('tasks').upsert(task)
    if (error) throw error
  },
  async remove(id) {
    const { error } = await client.from('tasks').delete().eq('id', id)
    if (error) throw error
  },
})

const LOCAL_KEY = 'planner.tasks'

// Без ключів Supabase застосунок працює на цьому пристрої, без входу й синхронізації.
export const localStore: TaskStore = {
  async list() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]') as Task[]
    } catch {
      return []
    }
  },
  async save(task) {
    const tasks = (await this.list()).filter((t) => t.id !== task.id)
    localStorage.setItem(LOCAL_KEY, JSON.stringify([...tasks, task]))
  },
  async remove(id) {
    const tasks = (await this.list()).filter((t) => t.id !== id)
    localStorage.setItem(LOCAL_KEY, JSON.stringify(tasks))
  },
}
