-- Level-2 multiplayer session state (Banking & Insurance sector)
-- Mirrors the structure of level1_sessions

create table if not exists public.level2_sessions (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null unique references public.game_sessions(id) on delete cascade,
  status         text not null default 'selecting',   -- selecting | answering | completed
  -- Fiduciary picks a card; Principal answers the opponent's card (and vice versa)
  fiduciary_card_id   text,
  principal_card_id   text,
  fiduciary_choice    text,
  principal_choice    text,
  fiduciary_is_correct boolean,
  principal_is_correct boolean,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Enable row-level security
alter table public.level2_sessions enable row level security;

-- Allow authenticated users to read/write their own sessions
create policy "Players can read level2_sessions they participate in"
  on public.level2_sessions for select
  using (
    exists (
      select 1 from public.session_players sp
      where sp.session_id = level2_sessions.session_id
        and sp.player_id = auth.uid()
    )
  );

create policy "Players can insert level2_sessions"
  on public.level2_sessions for insert
  with check (
    exists (
      select 1 from public.session_players sp
      where sp.session_id = level2_sessions.session_id
        and sp.player_id = auth.uid()
    )
  );

create policy "Players can update level2_sessions they participate in"
  on public.level2_sessions for update
  using (
    exists (
      select 1 from public.session_players sp
      where sp.session_id = level2_sessions.session_id
        and sp.player_id = auth.uid()
    )
  );

-- Realtime: enable broadcast for live updates
alter publication supabase_realtime add table public.level2_sessions;

-- Auto-update updated_at
create or replace function public.handle_level2_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger level2_sessions_updated_at
  before update on public.level2_sessions
  for each row execute procedure public.handle_level2_updated_at();
