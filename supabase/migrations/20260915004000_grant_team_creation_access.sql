-- Minimum authenticated access for the team-verification workflow.
-- RLS policies below still enforce who may read or change every row.
grant select, insert, update on table public.teams to authenticated;
grant select, insert, update, delete on table public.team_members to authenticated;

-- A captain must be able to receive their newly created pending team in the insert response.
drop policy if exists "approved teams readable" on public.teams;
create policy "approved teams readable"
on public.teams for select to authenticated
using (verification_status = 'approved' or captain_id = auth.uid() or public.is_team_member(id) or public.is_admin());

-- Permit the creator to make their own first captain membership entry.
drop policy if exists "managers manage members" on public.team_members;
create policy "managers manage members"
on public.team_members for all to authenticated
using (public.can_manage_team(team_id) or public.is_admin())
with check (
  public.can_manage_team(team_id)
  or public.is_admin()
  or (user_id = auth.uid() and role = 'captain' and exists (
    select 1 from public.teams where id = team_id and captain_id = auth.uid()
  ))
);
