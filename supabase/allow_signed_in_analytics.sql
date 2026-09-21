-- Remove the separate Analytics approval gate. All signed-in users may manage
-- their own Analytics rows; no user may read or modify another user's rows.
-- The unused membership table and any existing requests are retained.

alter policy analytics_players_select on public.analytics_players
  using (owner_id = (select auth.uid()));
alter policy analytics_players_insert on public.analytics_players
  with check (owner_id = (select auth.uid()));
alter policy analytics_players_update on public.analytics_players
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
alter policy analytics_players_delete on public.analytics_players
  using (owner_id = (select auth.uid()));

alter policy analytics_matches_select on public.analytics_matches
  using (owner_id = (select auth.uid()));
alter policy analytics_matches_insert on public.analytics_matches
  with check (owner_id = (select auth.uid()));
alter policy analytics_matches_update on public.analytics_matches
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
alter policy analytics_matches_delete on public.analytics_matches
  using (owner_id = (select auth.uid()));

revoke all on table public.analytics_memberships from authenticated;
