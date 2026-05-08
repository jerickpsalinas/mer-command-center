create table public.client_status_history (
  id uuid primary key default gen_random_uuid(),
  ghl_contact_id text not null,
  client_name text not null,
  status text not null,
  source text not null default 'change' check (source in ('daily','change')),
  recorded_at timestamptz not null default now()
);

create index client_status_history_contact_idx on public.client_status_history (ghl_contact_id, recorded_at desc);

alter table public.client_status_history enable row level security;

create policy "anyone can read status history"
  on public.client_status_history for select
  using (true);

create policy "anyone can insert status history"
  on public.client_status_history for insert
  with check (true);