-- Live Rocket League scrim marketplace.
alter table public.scrims add column if not exists time_zone text not null default 'America/New_York';

create or replace function public.has_verified_team()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.team_members tm
    join public.teams t on t.id = tm.team_id
    where tm.user_id = auth.uid()
      and t.verification_status = 'approved'
      and t.suspended_at is null
  );
$$;

grant select, insert, update on public.scrims to authenticated;
grant execute on function public.has_verified_team() to authenticated;

drop policy if exists "scrims readable" on public.scrims;
create policy "verified teams read marketplace"
on public.scrims for select to authenticated
using (
  (status = 'posted' and public.has_verified_team())
  or public.is_team_member(posting_team_id)
  or public.is_team_member(opponent_team_id)
  or public.is_admin()
);

drop policy if exists "managers post scrims" on public.scrims;
create policy "verified managers post scrims"
on public.scrims for insert to authenticated
with check (
  public.can_manage_team(posting_team_id)
  and exists (
    select 1 from public.teams
    where id = posting_team_id
      and verification_status = 'approved'
      and suspended_at is null
  )
);
