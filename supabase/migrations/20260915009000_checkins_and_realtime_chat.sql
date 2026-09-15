grant select on public.scrim_checkins to authenticated;
grant select, insert on public.messages to authenticated;

create policy "participants read checkins"
on public.scrim_checkins for select to authenticated
using (
  exists (
    select 1 from public.scrims s
    where s.id = scrim_id
      and (public.is_team_member(s.posting_team_id) or public.is_team_member(s.opponent_team_id))
  ) or public.is_admin()
);

create or replace function public.check_in_team(target_scrim uuid)
returns void language plpgsql security definer set search_path = public as $$
declare target public.scrims; current_team uuid;
begin
  select * into target from public.scrims where id = target_scrim for update;
  if target.id is null or target.status <> 'confirmed' then raise exception 'This scrim is not available for check-in.'; end if;
  if now() < target.scheduled_at - interval '30 minutes' or now() > target.scheduled_at + interval '30 minutes' then raise exception 'Team check-in is available from 30 minutes before through 30 minutes after the scheduled start.'; end if;
  select team_id into current_team from public.team_members where user_id = auth.uid() and team_id in (target.posting_team_id, target.opponent_team_id) limit 1;
  if current_team is null then raise exception 'Only a participating team member can check in.'; end if;
  insert into public.scrim_checkins(scrim_id,team_id,checked_in_by)
  values(target_scrim,current_team,auth.uid())
  on conflict(scrim_id,team_id) do nothing;
end;
$$;

grant execute on function public.check_in_team(uuid) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.scrim_checkins;
exception when duplicate_object then null;
end $$;
