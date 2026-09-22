grant select, insert, update on public.reports to authenticated;

create policy "admins update reports"
on public.reports for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.submit_scrim_report(target_scrim uuid, report_reason text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.scrims;
  reporter_team uuid;
  target_team uuid;
  report_id uuid;
begin
  if char_length(trim(report_reason)) < 5 or char_length(trim(report_reason)) > 1000 then
    raise exception 'Describe the issue in 5 to 1000 characters.';
  end if;

  select * into target from public.scrims where id = target_scrim;
  if target.id is null or target.opponent_team_id is null then
    raise exception 'Only teams in a confirmed scrim can submit a match report.';
  end if;

  select team_id into reporter_team
  from public.team_members
  where user_id = auth.uid()
    and team_id in (target.posting_team_id, target.opponent_team_id)
  limit 1;
  if reporter_team is null then
    raise exception 'You are not a participant in this scrim.';
  end if;

  target_team := case
    when reporter_team = target.posting_team_id then target.opponent_team_id
    else target.posting_team_id
  end;

  insert into public.reports (reporter_id, reported_team_id, reason)
  values (auth.uid(), target_team, trim(report_reason))
  returning id into report_id;

  return report_id;
end;
$$;

grant execute on function public.submit_scrim_report(uuid,text) to authenticated;
