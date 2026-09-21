create type public.scrim_outcome as enum ('completed', 'no_show');

create table public.scrim_outcomes (
  id uuid primary key default gen_random_uuid(),
  scrim_id uuid not null unique references public.scrims(id) on delete cascade,
  outcome public.scrim_outcome not null,
  reported_by_team_id uuid not null references public.teams(id),
  no_show_team_id uuid references public.teams(id),
  created_at timestamptz not null default now(),
  check (
    (outcome = 'completed' and no_show_team_id is null)
    or (outcome = 'no_show' and no_show_team_id is not null)
  )
);

alter table public.scrim_outcomes enable row level security;
grant select on public.scrim_outcomes to authenticated;

create policy "participants read scrim outcomes"
on public.scrim_outcomes for select to authenticated
using (
  exists (
    select 1
    from public.scrims s
    where s.id = scrim_id
      and (
        public.is_team_member(s.posting_team_id)
        or public.is_team_member(s.opponent_team_id)
      )
  )
  or public.is_admin()
);

create or replace function public.complete_scrim(target_scrim uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  target public.scrims;
  caller_team uuid;
begin
  select * into target from public.scrims where id = target_scrim for update;
  if target.id is null or target.status <> 'confirmed' then
    raise exception 'Only confirmed scrims can be completed.';
  end if;
  if now() < target.scheduled_at + make_interval(mins => target.duration_minutes) then
    raise exception 'A scrim can be marked complete after its scheduled duration ends.';
  end if;
  select team_id into caller_team
  from public.team_members
  where user_id = auth.uid()
    and team_id in (target.posting_team_id, target.opponent_team_id)
    and role in ('captain', 'manager')
  limit 1;
  if caller_team is null then
    raise exception 'Only a captain or manager can mark a scrim complete.';
  end if;
  if not exists (
    select 1 from public.scrim_checkins
    where scrim_id = target.id and team_id = target.posting_team_id
  ) or not exists (
    select 1 from public.scrim_checkins
    where scrim_id = target.id and team_id = target.opponent_team_id
  ) then
    raise exception 'Both teams must check in before the scrim can be completed.';
  end if;
  update public.scrims set status = 'completed' where id = target.id;
  insert into public.scrim_outcomes (scrim_id, outcome, reported_by_team_id)
  values (target.id, 'completed', caller_team);
  return target.id;
end;
$$;

create or replace function public.report_scrim_no_show(target_scrim uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  target public.scrims;
  caller_team uuid;
  absent_team uuid;
begin
  select * into target from public.scrims where id = target_scrim for update;
  if target.id is null or target.status <> 'confirmed' then
    raise exception 'Only confirmed scrims can be reported.';
  end if;
  if now() < target.scheduled_at + interval '30 minutes' then
    raise exception 'A no-show can be reported 30 minutes after the scheduled start.';
  end if;
  select team_id into caller_team
  from public.team_members
  where user_id = auth.uid()
    and team_id in (target.posting_team_id, target.opponent_team_id)
    and role in ('captain', 'manager')
  limit 1;
  if caller_team is null then
    raise exception 'Only a captain or manager can report a no-show.';
  end if;
  if not exists (
    select 1 from public.scrim_checkins
    where scrim_id = target.id and team_id = caller_team
  ) then
    raise exception 'Your team must be checked in before reporting a no-show.';
  end if;
  absent_team := case
    when caller_team = target.posting_team_id then target.opponent_team_id
    else target.posting_team_id
  end;
  if exists (
    select 1 from public.scrim_checkins
    where scrim_id = target.id and team_id = absent_team
  ) then
    raise exception 'The other team checked in, so a no-show cannot be reported.';
  end if;
  update public.scrims set status = 'completed' where id = target.id;
  insert into public.scrim_outcomes (
    scrim_id,
    outcome,
    reported_by_team_id,
    no_show_team_id
  ) values (target.id, 'no_show', caller_team, absent_team);
  return target.id;
end;
$$;

grant execute on function public.complete_scrim(uuid) to authenticated;
grant execute on function public.report_scrim_no_show(uuid) to authenticated;
