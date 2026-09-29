-- The UI uses audited RPC functions for role changes and scrim state transitions.
-- Restrict direct table mutations so authenticated users cannot bypass those checks.

revoke update on public.profiles from authenticated;
drop policy if exists "users update profile" on public.profiles;

drop policy if exists "managers update teams" on public.teams;
create policy "admins update teams"
on public.teams for update to authenticated
using (public.is_admin())
with check (public.is_admin());

revoke update, delete on public.team_members from authenticated;
drop policy if exists "managers manage members" on public.team_members;
create policy "creators add their initial captain membership"
on public.team_members for insert to authenticated
with check (
  user_id = auth.uid()
  and role = 'captain'
  and exists (
    select 1
    from public.teams
    where id = team_id
      and captain_id = auth.uid()
  )
);

drop policy if exists "managers update scrims" on public.scrims;
create policy "admins update scrims"
on public.scrims for update to authenticated
using (public.is_admin())
with check (public.is_admin());
