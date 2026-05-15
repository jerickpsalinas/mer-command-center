create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  client_name text,
  bookkeeper text,
  cycle_month text,
  triggered_by text,
  success boolean not null default true,
  message text,
  created_at timestamptz not null default now()
);

alter table public.activity_log enable row level security;

create policy "anyone can read activity"
  on public.activity_log for select
  to public using (true);

create policy "anyone can insert activity"
  on public.activity_log for insert
  to public with check (true);

alter publication supabase_realtime add table public.activity_log;

create index if not exists activity_log_created_at_idx
  on public.activity_log (created_at desc);