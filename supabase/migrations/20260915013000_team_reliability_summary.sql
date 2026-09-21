create or replace function public.get_team_reliability(target_team uuid)
returns table (
  completed_scrims bigint,
  late_cancellations bigint,
  no_shows bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_team_member(target_team) and not public.is_admin() then
    raise exception 'You are not allowed to view this team reliability summary.';
  end if;

  return query
  select
    (
      select count(*)
      from public.scrim_outcomes o
      where o.outcome = 'completed'
        and exists (
          select 1
          from public.scrims s
          where s.id = o.scrim_id
            and target_team in (s.posting_team_id, s.opponent_team_id)
        )
    ),
    (
      select count(*)
      from public.scrim_cancellations c
      where c.canceled_by_team_id = target_team
        and c.late_cancel = true
    ),
    (
      select count(*)
      from public.scrim_outcomes o
      where o.outcome = 'no_show'
        and o.no_show_team_id = target_team
    );
end;
$$;

grant execute on function public.get_team_reliability(uuid) to authenticated;
