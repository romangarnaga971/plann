import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface Task {
  id: string
  title: string
  due_at: string | null
  has_time: boolean
  tags: string[]
  done: boolean
  done_at: string | null
  archived_at: string | null
  created_at: string
}

export interface Tag {
  name: string
  color: string
}

export interface TaskStore {
  list(): Promise<Task[]>
  save(task: Task): Promise<void>
  remove(id: string): Promise<void>
  clearArchive(): Promise<void>
  listTags(): Promise<Tag[]>
  saveTag(tag: Tag): Promise<void>
  removeTag(name: string): Promise<void>
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null

const COLUMNS = 'id,title,due_at,has_time,tags,done,done_at,archived_at,created_at'

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
  async clearArchive() {
    const { error } = await client.from('tasks').delete().not('archived_at', 'is', null)
    if (error) throw error
  },
  async listTags() {
    const { data, error } = await client.from('tags').select('name,color')
    if (error) throw error
    return data as Tag[]
  },
  async saveTag(tag) {
    const { error } = await client.from('tags').upsert(tag, { onConflict: 'user_id,name' })
    if (error) throw error
  },
  async removeTag(name) {
    const { error } = await client.from('tags').delete().eq('name', name)
    if (error) throw error
  },
})

const LOCAL_KEY = 'planner.tasks'
const LOCAL_TAGS_KEY = 'planner.tags'

function readLocal<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as T[]
  } catch {
    return []
  }
}

// Без ключів Supabase застосунок працює на цьому пристрої, без входу й синхронізації.
// Читання й запис ідуть без пауз, щоб кілька збережень підряд не перезаписали одне одного.
export const localStore: TaskStore = {
  async list() {
    return readLocal<Task>(LOCAL_KEY)
  },
  async save(task) {
    const tasks = readLocal<Task>(LOCAL_KEY).filter((t) => t.id !== task.id)
    localStorage.setItem(LOCAL_KEY, JSON.stringify([...tasks, task]))
  },
  async remove(id) {
    const tasks = readLocal<Task>(LOCAL_KEY).filter((t) => t.id !== id)
    localStorage.setItem(LOCAL_KEY, JSON.stringify(tasks))
  },
  async clearArchive() {
    const tasks = readLocal<Task>(LOCAL_KEY).filter((t) => !t.archived_at)
    localStorage.setItem(LOCAL_KEY, JSON.stringify(tasks))
  },
  async listTags() {
    return readLocal<Tag>(LOCAL_TAGS_KEY)
  },
  async saveTag(tag) {
    const tags = readLocal<Tag>(LOCAL_TAGS_KEY).filter((t) => t.name !== tag.name)
    localStorage.setItem(LOCAL_TAGS_KEY, JSON.stringify([...tags, tag]))
  },
  async removeTag(name) {
    const tags = readLocal<Tag>(LOCAL_TAGS_KEY).filter((t) => t.name !== name)
    localStorage.setItem(LOCAL_TAGS_KEY, JSON.stringify(tags))
  },
}
