create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  due_at timestamptz,
  has_time boolean not null default false,
  tags text[] not null default '{}',
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists tasks_user_due_idx on public.tasks (user_id, due_at);

alter table public.tasks enable row level security;

drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own" on public.tasks
  for select using (user_id = auth.uid());

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own" on public.tasks
  for insert with check (user_id = auth.uid());

drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own" on public.tasks
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own" on public.tasks
  for delete using (user_id = auth.uid());
