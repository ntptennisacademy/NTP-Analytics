-- NTP Analytics tables in the Tactical Drillboard Supabase project.
-- No existing Tactical Drillboard object is altered.

create table public.analytics_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_approved boolean not null default false,
  requested_at timestamptz not null default now()
);

create table public.analytics_players (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null check (char_length(trim(name)) between 1 and 200),
  team text not null default '',
  hitting_arm text not null check (hitting_arm in ('Left', 'Right')),
  backhand text not null check (backhand in ('One-Handed', 'Two-Handed')),
  utr_rating numeric not null default 0,
  is_saved boolean not null default true,
  primary key (owner_id, id)
);

create table public.analytics_matches (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  date timestamptz not null,
  config jsonb not null check (jsonb_typeof(config) = 'object'),
  points jsonb not null default '[]'::jsonb check (jsonb_typeof(points) = 'array'),
  is_completed boolean not null default false,
  final_score text not null default '',
  notes text not null default '',
  primary key (owner_id, id)
);

create index analytics_matches_owner_date_idx
  on public.analytics_matches (owner_id, date desc);

alter table public.analytics_memberships enable row level security;
alter table public.analytics_players enable row level security;
alter table public.analytics_matches enable row level security;

revoke all on table public.analytics_memberships, public.analytics_players,
  public.analytics_matches from anon, authenticated;
grant select, insert on table public.analytics_memberships to authenticated;
grant select, insert, update, delete on table public.analytics_players,
  public.analytics_matches to authenticated;

create policy analytics_memberships_select on public.analytics_memberships
  for select to authenticated using (user_id = (select auth.uid()));
create policy analytics_memberships_request on public.analytics_memberships
  for insert to authenticated
  with check (user_id = (select auth.uid()) and is_approved = false);

create policy analytics_players_select on public.analytics_players
  for select to authenticated
  using (owner_id = (select auth.uid()) and exists (
    select 1 from public.analytics_memberships m
    where m.user_id = (select auth.uid()) and m.is_approved
  ));
create policy analytics_players_insert on public.analytics_players
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and exists (
    select 1 from public.analytics_memberships m
    where m.user_id = (select auth.uid()) and m.is_approved
  ));
create policy analytics_players_update on public.analytics_players
  for update to authenticated
  using (owner_id = (select auth.uid()) and exists (
    select 1 from public.analytics_memberships m
    where m.user_id = (select auth.uid()) and m.is_approved
  ))
  with check (owner_id = (select auth.uid()) and exists (
    select 1 from public.analytics_memberships m
    where m.user_id = (select auth.uid()) and m.is_approved
  ));
create policy analytics_players_delete on public.analytics_players
  for delete to authenticated
  using (owner_id = (select auth.uid()) and exists (
    select 1 from public.analytics_memberships m
    where m.user_id = (select auth.uid()) and m.is_approved
  ));

create policy analytics_matches_select on public.analytics_matches
  for select to authenticated
  using (owner_id = (select auth.uid()) and exists (
    select 1 from public.analytics_memberships m
    where m.user_id = (select auth.uid()) and m.is_approved
  ));
create policy analytics_matches_insert on public.analytics_matches
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and exists (
    select 1 from public.analytics_memberships m
    where m.user_id = (select auth.uid()) and m.is_approved
  ));
create policy analytics_matches_update on public.analytics_matches
  for update to authenticated
  using (owner_id = (select auth.uid()) and exists (
    select 1 from public.analytics_memberships m
    where m.user_id = (select auth.uid()) and m.is_approved
  ))
  with check (owner_id = (select auth.uid()) and exists (
    select 1 from public.analytics_memberships m
    where m.user_id = (select auth.uid()) and m.is_approved
  ));
create policy analytics_matches_delete on public.analytics_matches
  for delete to authenticated
  using (owner_id = (select auth.uid()) and exists (
    select 1 from public.analytics_memberships m
    where m.user_id = (select auth.uid()) and m.is_approved
  ));
